"""Single-turn lifecycle for the HAUI Agent Kernel."""
from __future__ import annotations

from dataclasses import dataclass, field
import json
from typing import Any

from homeassistant.core import Context, HomeAssistant

from .config_store import AgentConfig
from .llm_client import OpenAICompatibleClient
from .loop_controller import LoopController
from .memory_store import async_search_memory
from .model_router import DispatchResult, ModelRouter
from .tool_executor import ToolExecutor
from .tool_registry import ToolRegistry
from .workspace_store import async_load_workspace


@dataclass(slots=True)
class TurnResult:
    """Serialized result of one agent turn."""

    content: str
    source: str
    attempts: list[dict[str, Any]] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)


class TurnKernel:
    """Manage one non-streaming agent turn."""

    def __init__(
        self,
        hass: HomeAssistant,
        config: AgentConfig,
        *,
        actor: str = "agent",
        context: Context | None = None,
    ) -> None:
        self._hass = hass
        self._config = config
        self._tools = ToolRegistry(hass)
        self._executor = ToolExecutor(hass, actor=actor, context=context)
        self._router = ModelRouter(OpenAICompatibleClient(hass))
        self._loop = LoopController(max_steps=config.max_turn_steps)

    async def run(
        self,
        messages: list[dict[str, Any]],
        *,
        include_tools: bool = False,
    ) -> TurnResult:
        """Run one complete conversation turn."""
        normalized = _normalize_messages(messages)
        system_index = self._tools.get_system_index()
        workspace_docs = await async_load_workspace(self._hass)
        memories = await async_search_memory(self._hass, _conversation_query(normalized), 8)
        prepared_messages = [
            {
                "role": "system",
                "content": (
                    "你是 HAUI Agent Kernel，运行在 Home Assistant 自定义集成内部。"
                    "你可以使用工具读取环境、执行低风险设备控制，以及为配置变更创建待审批提案。"
                    "不要声称已经直接修改自动化、脚本、工作区文档或仪表盘卡片；这些写操作只会生成提案，等待用户批准。"
                    "Shell、Python、HACS、配置文件写入等高风险工具默认禁用。"
                    f"\n系统索引：{system_index}"
                    f"\n工作区人格文档：\n{_workspace_prompt(workspace_docs)}"
                    f"\n相关长期记忆：\n{_memory_prompt(memories)}"
                ),
            },
            *normalized,
        ]
        tools = self._tools.openai_tools() if include_tools else None
        current_messages = list(prepared_messages)
        dispatch: DispatchResult | None = None
        tool_trace: list[dict[str, Any]] = []

        while True:
            self._loop.next_step("model_dispatch")
            dispatch = await self._router.dispatch(self._config, current_messages, tools=tools)
            tool_calls = dispatch.metadata.get("tool_calls") if include_tools else None
            if not tool_calls:
                break

            self._loop.next_step("tool_execution")
            current_messages.append(
                {
                    "role": "assistant",
                    "content": dispatch.content,
                    "tool_calls": tool_calls,
                }
            )
            for tool_call in tool_calls:
                name = _tool_name(tool_call)
                try:
                    result = await self._executor.execute_call(tool_call)
                    tool_trace.append(
                        {
                            "name": result["name"],
                            "ok": True,
                            "tool_call_id": result["tool_call_id"],
                        }
                    )
                except Exception as err:  # noqa: BLE001 - feed tool errors back to the model
                    result = {
                        "tool_call_id": tool_call.get("id") or name,
                        "name": name,
                        "content": json.dumps({"ok": False, "error": str(err)}, ensure_ascii=False),
                    }
                    tool_trace.append(
                        {
                            "name": name,
                            "ok": False,
                            "tool_call_id": result["tool_call_id"],
                            "error": str(err),
                        }
                    )
                current_messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": result["tool_call_id"],
                        "name": result["name"],
                        "content": result["content"],
                    }
                )

        if dispatch is None:
            raise ValueError("Agent turn did not produce a dispatch result")
        return _turn_result(dispatch, tool_trace)


def _normalize_messages(messages: Any) -> list[dict[str, Any]]:
    if not isinstance(messages, list):
        raise ValueError("messages must be an array")

    normalized: list[dict[str, Any]] = []
    for item in messages[-20:]:
        if not isinstance(item, dict):
            continue
        role = item.get("role")
        content = item.get("content")
        if role not in {"system", "user", "assistant", "tool"}:
            continue
        if content is None:
            content = ""
        if not isinstance(content, str):
            content = str(content)
        normalized.append({"role": role, "content": content})
    if not normalized:
        raise ValueError("messages must contain at least one valid message")
    return normalized


def _turn_result(dispatch: DispatchResult, tool_trace: list[dict[str, Any]]) -> TurnResult:
    return TurnResult(
        content=dispatch.content,
        source=dispatch.source,
        attempts=[
            {
                "role": attempt.role,
                "label": attempt.label,
                "ok": attempt.ok,
                "error": attempt.error,
            }
            for attempt in dispatch.attempts
        ],
        metadata={**dispatch.metadata, "tool_trace": tool_trace},
    )


def _conversation_query(messages: list[dict[str, Any]]) -> str:
    return "\n".join(
        message["content"]
        for message in messages[-6:]
        if message.get("role") in {"user", "assistant"}
    )[-3000:]


def _workspace_prompt(docs: dict[str, str], max_chars: int = 6000) -> str:
    chunks: list[str] = []
    remaining = max_chars
    for name in ("IDENTITY.md", "SOUL.md", "USER.md", "MEMORY.md", "TOOLS.md", "AGENTS.md", "HEARTBEAT.md", "BOOTSTRAP.md"):
        content = docs.get(name)
        if not content or remaining <= 0:
            continue
        snippet = content[:remaining]
        chunks.append(f"## {name}\n{snippet}")
        remaining -= len(snippet)
    return "\n\n".join(chunks) if chunks else "无"


def _memory_prompt(entries: list[dict[str, Any]], max_chars: int = 2000) -> str:
    lines: list[str] = []
    remaining = max_chars
    for entry in entries:
        text = str(entry.get("text") or "").strip()
        if not text or remaining <= 0:
            continue
        line = f"- {text[:remaining]}"
        lines.append(line)
        remaining -= len(line)
    return "\n".join(lines) if lines else "无"


def _tool_name(tool_call: dict[str, Any]) -> str:
    function = tool_call.get("function") if isinstance(tool_call, dict) else None
    if isinstance(function, dict) and isinstance(function.get("name"), str):
        return function["name"]
    return "unknown_tool"
