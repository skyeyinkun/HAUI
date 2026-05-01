"""Model routing, fallback, and optional summary dispatch."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from .config_store import AgentConfig, ModelProfile
from .llm_client import LlmClientError, ModelReply, OpenAICompatibleClient


@dataclass(slots=True)
class AgentAttempt:
    """One model attempt in the dispatch chain."""

    role: str
    label: str
    ok: bool
    error: str | None = None
    reply: ModelReply | None = None


@dataclass(slots=True)
class DispatchResult:
    """Final result of model routing."""

    content: str
    source: str
    attempts: list[AgentAttempt] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)


class ModelRouter:
    """Route a turn through primary, backup, and optional summary models."""

    def __init__(self, client: OpenAICompatibleClient) -> None:
        self._client = client

    async def dispatch(
        self,
        config: AgentConfig,
        messages: list[dict[str, Any]],
        *,
        tools: list[dict[str, Any]] | None = None,
    ) -> DispatchResult:
        """Dispatch messages according to the configured model chain."""
        if not tools and config.summary_enabled and config.summary and config.summary.is_configured:
            return await self._dispatch_with_summary(config, messages, tools=tools)
        return await self._dispatch_with_fallback(config, messages, tools=tools)

    async def _dispatch_with_fallback(
        self,
        config: AgentConfig,
        messages: list[dict[str, Any]],
        *,
        tools: list[dict[str, Any]] | None,
    ) -> DispatchResult:
        attempts: list[AgentAttempt] = []

        primary_attempt = await self._try_model("primary", config.primary, messages, tools=tools)
        attempts.append(primary_attempt)
        if primary_attempt.ok and primary_attempt.reply:
            return DispatchResult(
                content=primary_attempt.reply.content,
                source="primary",
                attempts=attempts,
                metadata=_reply_metadata(primary_attempt.reply),
            )

        if config.backup and config.backup.is_configured:
            backup_attempt = await self._try_model("backup", config.backup, messages, tools=tools)
            attempts.append(backup_attempt)
            if backup_attempt.ok and backup_attempt.reply:
                return DispatchResult(
                    content=backup_attempt.reply.content,
                    source="backup",
                    attempts=attempts,
                    metadata=_reply_metadata(backup_attempt.reply),
                )

        raise LlmClientError(_join_errors(attempts) or "No configured AI model returned a valid reply")

    async def _dispatch_with_summary(
        self,
        config: AgentConfig,
        messages: list[dict[str, Any]],
        *,
        tools: list[dict[str, Any]] | None,
    ) -> DispatchResult:
        attempts: list[AgentAttempt] = []
        successful: list[AgentAttempt] = []

        primary_attempt = await self._try_model("primary", config.primary, messages, tools=tools)
        attempts.append(primary_attempt)
        if primary_attempt.ok:
            successful.append(primary_attempt)

        if config.backup and config.backup.is_configured:
            backup_attempt = await self._try_model("backup", config.backup, messages, tools=tools)
            attempts.append(backup_attempt)
            if backup_attempt.ok:
                successful.append(backup_attempt)

        if not successful:
            raise LlmClientError(_join_errors(attempts) or "No configured AI model returned a valid reply")

        if len(successful) == 1 or not config.summary:
            reply = successful[0].reply
            return DispatchResult(
                content=reply.content if reply else "",
                source=successful[0].role,
                attempts=attempts,
                metadata=_reply_metadata(reply),
            )

        summary_messages = [
            {
                "role": "system",
                "content": "你是 HAUI 的总结模型。请把多个智能体的回答合并为一个准确、简洁、面向用户的最终回复。不要编造新事实。",
            },
            {
                "role": "user",
                "content": "\n\n".join(
                    f"[{attempt.label}]\n{attempt.reply.content if attempt.reply else ''}"
                    for attempt in successful
                ),
            },
        ]
        summary_attempt = await self._try_model("summary", config.summary, summary_messages, tools=None)
        attempts.append(summary_attempt)
        if summary_attempt.ok and summary_attempt.reply:
            return DispatchResult(
                content=summary_attempt.reply.content,
                source="summary",
                attempts=attempts,
                metadata=_reply_metadata(summary_attempt.reply),
            )

        reply = successful[0].reply
        return DispatchResult(
            content=reply.content if reply else "",
            source=successful[0].role,
            attempts=attempts,
            metadata={
                **_reply_metadata(reply),
                "summary_error": summary_attempt.error,
            },
        )

    async def _try_model(
        self,
        role: str,
        profile: ModelProfile,
        messages: list[dict[str, Any]],
        *,
        tools: list[dict[str, Any]] | None,
    ) -> AgentAttempt:
        try:
            reply = await self._client.chat(profile, messages, tools=tools)
            if not reply.content and not reply.tool_calls:
                return AgentAttempt(role=role, label=profile.label, ok=False, error="empty model response")
            return AgentAttempt(role=role, label=profile.label, ok=True, reply=reply)
        except Exception as err:  # noqa: BLE001 - capture model failure for fallback metadata
            return AgentAttempt(role=role, label=profile.label, ok=False, error=str(err))


def _reply_metadata(reply: ModelReply | None) -> dict[str, Any]:
    if reply is None:
        return {}
    return {
        "model": reply.model,
        "finish_reason": reply.finish_reason,
        "tool_calls": reply.tool_calls or [],
    }


def _join_errors(attempts: list[AgentAttempt]) -> str:
    return "; ".join(
        f"{attempt.role}: {attempt.error}"
        for attempt in attempts
        if attempt.error
    )
