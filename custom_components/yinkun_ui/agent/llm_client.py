"""OpenAI-compatible LLM client used by the HAUI Agent Kernel."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .config_store import ModelProfile


@dataclass(slots=True)
class ModelReply:
    """Normalized LLM reply."""

    content: str
    raw: dict[str, Any]
    model: str
    finish_reason: str | None = None
    tool_calls: list[dict[str, Any]] | None = None


class LlmClientError(Exception):
    """Raised when an LLM request fails."""


class OpenAICompatibleClient:
    """Small async client for OpenAI-compatible chat completions."""

    def __init__(self, hass: HomeAssistant) -> None:
        self._hass = hass

    async def chat(
        self,
        profile: ModelProfile,
        messages: list[dict[str, Any]],
        *,
        tools: list[dict[str, Any]] | None = None,
    ) -> ModelReply:
        """Send one non-streaming chat completion request."""
        if not profile.is_configured:
            raise LlmClientError(f"{profile.label} is not configured")

        base_url = profile.base_url.rstrip("/")
        url = f"{base_url}/chat/completions"
        payload: dict[str, Any] = {
            "model": profile.model,
            "messages": messages,
            "stream": False,
        }
        if tools:
            payload["tools"] = tools
            payload["tool_choice"] = "auto"

        session = async_get_clientsession(self._hass)
        try:
            async with session.post(
                url,
                json=payload,
                headers={
                    "Authorization": f"Bearer {profile.api_key}",
                    "Content-Type": "application/json",
                },
                timeout=profile.timeout,
            ) as response:
                body: dict[str, Any] | None = None
                text = await response.text()
                if response.content_type == "application/json":
                    body = await response.json()

                if response.status >= 400:
                    message = _extract_error_message(body) if body else text
                    raise LlmClientError(f"{profile.label} failed: HTTP {response.status} {message}")

                if body is None:
                    raise LlmClientError(f"{profile.label} returned non-JSON response")
        except LlmClientError:
            raise
        except Exception as err:  # noqa: BLE001 - surface integration-safe error text
            raise LlmClientError(f"{profile.label} request failed: {err}") from err

        choice = (body.get("choices") or [{}])[0]
        message = choice.get("message") or {}
        content = message.get("content")
        tool_calls = message.get("tool_calls")
        return ModelReply(
            content=content if isinstance(content, str) else "",
            raw=body,
            model=str(body.get("model") or profile.model),
            finish_reason=choice.get("finish_reason"),
            tool_calls=tool_calls if isinstance(tool_calls, list) else None,
        )


def _extract_error_message(body: dict[str, Any] | None) -> str:
    if not body:
        return ""
    error = body.get("error")
    if isinstance(error, dict):
        message = error.get("message")
        if isinstance(message, str):
            return message
    message = body.get("message")
    return message if isinstance(message, str) else str(body)
