"""Tool registry for the HAUI Agent Kernel stage-1 API."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from homeassistant.core import HomeAssistant


@dataclass(frozen=True, slots=True)
class ToolDefinition:
    """One LLM-visible tool definition with policy metadata."""

    name: str
    description: str
    parameters: dict[str, Any]
    policy_level: str
    implemented: bool

    def to_openai_tool(self) -> dict[str, Any]:
        """Return OpenAI-compatible tool schema."""
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.parameters,
            },
        }

    def to_api_dict(self) -> dict[str, Any]:
        """Return API-safe tool metadata."""
        return {
            "name": self.name,
            "description": self.description,
            "parameters": self.parameters,
            "policy_level": self.policy_level,
            "implemented": self.implemented,
        }


class ToolRegistry:
    """Registry for HAUI Agent tools and policy metadata."""

    def __init__(self, hass: HomeAssistant) -> None:
        self._hass = hass
        self._tools = _build_tools()

    @property
    def tools(self) -> list[ToolDefinition]:
        """Return registered tools."""
        return self._tools

    def openai_tools(self, *, include_unimplemented: bool = False) -> list[dict[str, Any]]:
        """Return tool schemas that can be sent to an LLM."""
        return [
            tool.to_openai_tool()
            for tool in self._tools
            if include_unimplemented or tool.implemented
        ]

    def api_tools(self) -> list[dict[str, Any]]:
        """Return all registered tool metadata."""
        return [tool.to_api_dict() for tool in self._tools]

    def get_system_index(self) -> dict[str, Any]:
        """Return a compact read-only structure index from HA state."""
        states = list(self._hass.states.async_all())
        by_domain: dict[str, int] = {}
        for state in states:
            domain = state.entity_id.split(".", 1)[0]
            by_domain[domain] = by_domain.get(domain, 0) + 1
        return {
            "entity_count": len(states),
            "domains": dict(sorted(by_domain.items())),
        }


def _string_prop(description: str = "") -> dict[str, Any]:
    result: dict[str, Any] = {"type": "string"}
    if description:
        result["description"] = description
    return result


def _object_prop(description: str = "") -> dict[str, Any]:
    result: dict[str, Any] = {"type": "object", "additionalProperties": True}
    if description:
        result["description"] = description
    return result


def _array_prop(description: str = "") -> dict[str, Any]:
    result: dict[str, Any] = {"type": "array"}
    if description:
        result["description"] = description
    return result


def _build_tools() -> list[ToolDefinition]:
    object_schema: dict[str, Any] = {"type": "object", "properties": {}}
    return [
        ToolDefinition(
            name="get_system_index",
            description="获取 Home Assistant 的紧凑结构索引，包括实体数量和域分布。",
            parameters=object_schema,
            policy_level="L1_READ_ONLY",
            implemented=True,
        ),
        ToolDefinition(
            name="find_entities",
            description="按关键词、实体域或名称查找实体。阶段 2 将接入完整注册表和区域信息。",
            parameters={
                "type": "object",
                "properties": {
                    "query": _string_prop("搜索关键词，可为区域、设备名或 entity_id 片段。"),
                    "domain": _string_prop("可选实体域，例如 light、sensor、climate。"),
                    "limit": {"type": "number"},
                },
            },
            policy_level="L1_READ_ONLY",
            implemented=True,
        ),
        ToolDefinition(
            name="get_entity_state",
            description="读取单个实体的当前状态和关键属性。",
            parameters={
                "type": "object",
                "properties": {
                    "entity_id": {"type": "string"},
                },
                "required": ["entity_id"],
            },
            policy_level="L1_READ_ONLY",
            implemented=True,
        ),
        ToolDefinition(
            name="get_home_summary",
            description="获取家庭设备统计、开启中设备、不可用设备和低电量设备。",
            parameters=object_schema,
            policy_level="L1_READ_ONLY",
            implemented=True,
        ),
        ToolDefinition(
            name="call_ha_service",
            description="调用低风险 Home Assistant 服务。必须指定明确 entity_id；门锁、安防、重启、全域控制以及 script/scene/remote 间接控制被阻止。",
            parameters={
                "type": "object",
                "properties": {
                    "domain": {"type": "string"},
                    "service": {"type": "string"},
                    "service_data": {"type": "object"},
                },
                "required": ["domain", "service", "service_data"],
            },
            policy_level="L2_LOW_RISK_CONTROL",
            implemented=True,
        ),
        ToolDefinition(
            name="dashboard_card_list",
            description="列出 HAUI Dashboard 已保存的卡片配置。",
            parameters=object_schema,
            policy_level="L1_READ_ONLY",
            implemented=True,
        ),
        ToolDefinition(
            name="propose_dashboard_card_change",
            description="提出 HAUI Dashboard 卡片新增、修改或删除提案。不会直接落地，需要用户审批。",
            parameters={
                "type": "object",
                "properties": {
                    "action": _string_prop("create、update 或 delete。"),
                    "card_id": _string_prop("卡片配置 ID。"),
                    "config": _object_prop("create/update 时的卡片配置。"),
                    "summary": _string_prop("面向用户的变更摘要。"),
                },
                "required": ["action", "card_id"],
            },
            policy_level="L3_PROPOSAL_REQUIRED",
            implemented=True,
        ),
        ToolDefinition(
            name="workspace_list",
            description="列出 HAUI Agent 的人格/记忆工作区文档。",
            parameters=object_schema,
            policy_level="L1_READ_ONLY",
            implemented=True,
        ),
        ToolDefinition(
            name="workspace_read",
            description="读取一个工作区 Markdown 文档。",
            parameters={
                "type": "object",
                "properties": {"name": _string_prop("文档名，例如 IDENTITY.md。")},
                "required": ["name"],
            },
            policy_level="L1_READ_ONLY",
            implemented=True,
        ),
        ToolDefinition(
            name="propose_workspace_update",
            description="提出工作区文档更新提案。不会直接修改人格或记忆，需要用户审批。",
            parameters={
                "type": "object",
                "properties": {
                    "name": _string_prop("文档名。"),
                    "content": _string_prop("完整 Markdown 内容。"),
                    "summary": _string_prop("变更摘要。"),
                },
                "required": ["name", "content"],
            },
            policy_level="L3_PROPOSAL_REQUIRED",
            implemented=True,
        ),
        ToolDefinition(
            name="memory_search",
            description="按当前对话查找相关长期记忆。",
            parameters={
                "type": "object",
                "properties": {
                    "query": _string_prop("搜索文本。"),
                    "limit": {"type": "number"},
                },
            },
            policy_level="L1_READ_ONLY",
            implemented=True,
        ),
        ToolDefinition(
            name="memory_add",
            description="记录一条长期记忆。只应保存用户明确表达的偏好或稳定事实。",
            parameters={
                "type": "object",
                "properties": {
                    "text": _string_prop("记忆文本。"),
                    "tags": _array_prop("标签列表。"),
                },
                "required": ["text"],
            },
            policy_level="L2_MEMORY_WRITE",
            implemented=True,
        ),
        ToolDefinition(
            name="automation_list",
            description="列出 Home Assistant 自动化实体。",
            parameters=object_schema,
            policy_level="L1_READ_ONLY",
            implemented=True,
        ),
        ToolDefinition(
            name="automation_get",
            description="读取一个自动化实体状态。",
            parameters={"type": "object", "properties": {"entity_id": _string_prop()}, "required": ["entity_id"]},
            policy_level="L1_READ_ONLY",
            implemented=True,
        ),
        ToolDefinition(
            name="propose_automation_change",
            description="提出自动化创建、修改或删除提案。不会直接写 YAML。",
            parameters={
                "type": "object",
                "properties": {
                    "action": _string_prop("create、update 或 delete。"),
                    "title": _string_prop("提案标题。"),
                    "config": _object_prop("结构化自动化配置草案。"),
                    "summary": _string_prop("变更摘要。"),
                },
                "required": ["action", "config"],
            },
            policy_level="L3_PROPOSAL_REQUIRED",
            implemented=True,
        ),
        ToolDefinition(
            name="script_list",
            description="列出 Home Assistant 脚本实体。",
            parameters=object_schema,
            policy_level="L1_READ_ONLY",
            implemented=True,
        ),
        ToolDefinition(
            name="script_get",
            description="读取一个脚本实体状态。",
            parameters={"type": "object", "properties": {"entity_id": _string_prop()}, "required": ["entity_id"]},
            policy_level="L1_READ_ONLY",
            implemented=True,
        ),
        ToolDefinition(
            name="propose_script_change",
            description="提出脚本创建、修改或删除提案。不会直接写 YAML。",
            parameters={
                "type": "object",
                "properties": {
                    "action": _string_prop("create、update 或 delete。"),
                    "title": _string_prop("提案标题。"),
                    "config": _object_prop("结构化脚本配置草案。"),
                    "summary": _string_prop("变更摘要。"),
                },
                "required": ["action", "config"],
            },
            policy_level="L3_PROPOSAL_REQUIRED",
            implemented=True,
        ),
        ToolDefinition(
            name="proposal_list",
            description="列出待审批或历史提案。",
            parameters={
                "type": "object",
                "properties": {"status": _string_prop("可选：pending、approved、approved_not_applied、discarded、failed。")},
            },
            policy_level="L1_READ_ONLY",
            implemented=True,
        ),
        ToolDefinition(
            name="heartbeat_list",
            description="列出 HAUI Agent 心跳任务定义。",
            parameters=object_schema,
            policy_level="L1_READ_ONLY",
            implemented=True,
        ),
        ToolDefinition(
            name="heartbeat_create",
            description="创建心跳任务定义。阶段 6 仅持久化任务，不主动执行高风险操作。",
            parameters={
                "type": "object",
                "properties": {
                    "name": _string_prop(),
                    "prompt": _string_prop(),
                    "interval_minutes": {"type": "number"},
                    "enabled": {"type": "boolean"},
                },
                "required": ["name", "prompt"],
            },
            policy_level="L2_RUNTIME_WRITE",
            implemented=True,
        ),
        ToolDefinition(
            name="signal_recent",
            description="读取最近捕获的 Home Assistant 状态变化信号。",
            parameters={"type": "object", "properties": {"limit": {"type": "number"}}},
            policy_level="L1_READ_ONLY",
            implemented=True,
        ),
        ToolDefinition(
            name="shell_execute",
            description="高风险 Shell 执行工具，默认禁用。",
            parameters=object_schema,
            policy_level="L4_HIGH_RISK_DISABLED",
            implemented=False,
        ),
        ToolDefinition(
            name="python_execute",
            description="高风险 Python 执行工具，默认禁用。",
            parameters=object_schema,
            policy_level="L4_HIGH_RISK_DISABLED",
            implemented=False,
        ),
        ToolDefinition(
            name="hacs_install",
            description="高风险 HACS 安装工具，默认禁用。",
            parameters=object_schema,
            policy_level="L4_HIGH_RISK_DISABLED",
            implemented=False,
        ),
        ToolDefinition(
            name="config_file_write",
            description="高风险配置文件写入工具，默认禁用。",
            parameters=object_schema,
            policy_level="L4_HIGH_RISK_DISABLED",
            implemented=False,
        ),
    ]
