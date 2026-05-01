"""Persistent configuration for the HAUI Agent Kernel."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

DOMAIN = "yinkun_ui"
STORE_VERSION = 1
STORE_KEY = "yinkun_ui_agent_config"
REDACTED_API_KEY_SUFFIX = "...***"


@dataclass(slots=True)
class ModelProfile:
    """OpenAI-compatible model endpoint configuration."""

    label: str
    base_url: str
    api_key: str
    model: str
    enabled: bool = True
    timeout: int = 45

    @property
    def is_configured(self) -> bool:
        """Return whether the profile has enough data to make requests."""
        return self.enabled and bool(self.base_url and self.api_key and self.model)


@dataclass(slots=True)
class AgentConfig:
    """Runtime configuration for model dispatch and turn control."""

    primary: ModelProfile
    backup: ModelProfile | None = None
    summary: ModelProfile | None = None
    summary_enabled: bool = False
    max_turn_steps: int = 6


def _domain_data(hass: HomeAssistant) -> dict[str, Any]:
    hass.data.setdefault(DOMAIN, {})
    return hass.data[DOMAIN]


async def _store(hass: HomeAssistant) -> Store:
    data = _domain_data(hass)
    store = data.get("agent_config_store")
    if store is None:
        store = Store(hass, STORE_VERSION, STORE_KEY)
        data["agent_config_store"] = store
    return store


def _read_str(payload: dict[str, Any], *keys: str) -> str:
    for key in keys:
        value = payload.get(key)
        if isinstance(value, str):
            return value.strip()
    return ""


def _read_optional_str(payload: dict[str, Any], fallback: str, *keys: str) -> str:
    for key in keys:
        if key not in payload:
            continue
        value = payload.get(key)
        if isinstance(value, str):
            return value.strip()
        return ""
    return fallback


def _read_bool(payload: dict[str, Any], key: str, default: bool) -> bool:
    value = payload.get(key)
    return value if isinstance(value, bool) else default


def _read_int(payload: dict[str, Any], key: str, default: int, minimum: int, maximum: int) -> int:
    value = payload.get(key)
    if not isinstance(value, int):
        return default
    return max(minimum, min(maximum, value))


def _is_redacted_api_key(value: str) -> bool:
    return value == "***" or value.endswith(REDACTED_API_KEY_SUFFIX)


def profile_from_payload(
    payload: Any,
    default_label: str,
    existing: ModelProfile | None = None,
) -> ModelProfile | None:
    """Parse a model profile from an API payload."""
    if not isinstance(payload, dict):
        return existing

    raw_api_key = _read_optional_str(payload, existing.api_key if existing else "", "api_key", "apiKey")
    api_key = existing.api_key if existing and _is_redacted_api_key(raw_api_key) else raw_api_key
    return ModelProfile(
        label=_read_optional_str(payload, existing.label if existing else "", "label", "name") or default_label,
        base_url=_read_optional_str(payload, existing.base_url if existing else "", "base_url", "baseUrl"),
        api_key=api_key,
        model=_read_optional_str(payload, existing.model if existing else "", "model", "modelName"),
        enabled=_read_bool(payload, "enabled", existing.enabled if existing else True),
        timeout=_read_int(payload, "timeout", existing.timeout if existing else 45, 5, 120),
    )


def default_config() -> AgentConfig:
    """Return an empty but valid config."""
    return AgentConfig(
        primary=ModelProfile(label="Primary AI", base_url="", api_key="", model="", enabled=True),
        backup=None,
        summary=None,
        summary_enabled=False,
        max_turn_steps=6,
    )


def config_from_payload(payload: Any, existing: AgentConfig | None = None) -> AgentConfig:
    """Parse persisted or submitted config into an AgentConfig."""
    if not isinstance(payload, dict):
        return existing or default_config()

    base = existing or default_config()
    primary = profile_from_payload(payload.get("primary"), "Primary AI", base.primary)
    if primary is None:
        primary = base.primary

    if "backup" in payload:
        backup = None if payload["backup"] is None else profile_from_payload(payload["backup"], "Backup AI", base.backup)
    else:
        backup = base.backup
    if "summary" in payload:
        summary = None if payload["summary"] is None else profile_from_payload(payload["summary"], "Summary AI", base.summary)
    else:
        summary = base.summary
    summary_enabled = _read_bool(
        payload,
        "summary_enabled",
        _read_bool(payload, "summaryEnabled", base.summary_enabled),
    )
    max_turn_steps = _read_int(payload, "max_turn_steps", base.max_turn_steps, 1, 12)

    return AgentConfig(
        primary=primary,
        backup=backup,
        summary=summary,
        summary_enabled=summary_enabled,
        max_turn_steps=max_turn_steps,
    )


def _profile_to_dict(profile: ModelProfile | None, *, redact: bool) -> dict[str, Any] | None:
    if profile is None:
        return None
    api_key = profile.api_key
    if redact and api_key:
        api_key = f"{api_key[:6]}...***" if len(api_key) > 6 else "***"
    return {
        "label": profile.label,
        "base_url": profile.base_url,
        "api_key": api_key,
        "model": profile.model,
        "enabled": profile.enabled,
        "timeout": profile.timeout,
        "configured": profile.is_configured,
    }


def config_to_dict(config: AgentConfig, *, redact: bool = True) -> dict[str, Any]:
    """Serialize config for storage or API output."""
    return {
        "primary": _profile_to_dict(config.primary, redact=redact),
        "backup": _profile_to_dict(config.backup, redact=redact),
        "summary": _profile_to_dict(config.summary, redact=redact),
        "summary_enabled": config.summary_enabled,
        "max_turn_steps": config.max_turn_steps,
    }


async def async_load_config(hass: HomeAssistant) -> AgentConfig:
    """Load the persisted agent config."""
    data = _domain_data(hass)
    cached = data.get("agent_config")
    if isinstance(cached, AgentConfig):
        return cached
    store = await _store(hass)
    loaded = await store.async_load()
    config = config_from_payload(loaded)
    data["agent_config"] = config
    return config


async def async_save_config(hass: HomeAssistant, config: AgentConfig) -> None:
    """Persist and cache the agent config."""
    data = _domain_data(hass)
    data["agent_config"] = config
    store = await _store(hass)
    await store.async_save(config_to_dict(config, redact=False))
