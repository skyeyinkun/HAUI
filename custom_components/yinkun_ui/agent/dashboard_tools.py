"""HAUI dashboard card tools and proposal appliers."""
from __future__ import annotations

import re
from typing import Any

from homeassistant.core import HomeAssistant

from ..card_config import _load_configs, _save_configs
from .proposal_store import async_create_proposal

CARD_TITLE_PATTERN = re.compile(r"^[\u4e00-\u9fa5A-Za-z0-9\s]+$")


async def async_list_cards(hass: HomeAssistant) -> dict[str, Any]:
    """Return current HAUI card configs."""
    configs = await _load_configs(hass)
    return {"cards": configs}


def validate_card_config(config: Any) -> dict[str, Any]:
    """Validate the subset of HAUI card config used by AI proposals."""
    if not isinstance(config, dict):
        raise ValueError("config must be an object")
    title = config.get("title")
    if not isinstance(title, str) or not title.strip():
        raise ValueError("config.title is required")
    title = title.strip()
    if len(title) > 20 or not CARD_TITLE_PATTERN.match(title):
        raise ValueError("config.title contains unsupported characters or is too long")
    entities = config.get("entities")
    if not isinstance(entities, list):
        raise ValueError("config.entities must be an array")
    if len(entities) > 6:
        raise ValueError("config.entities cannot exceed 6 items")
    normalized_entities: list[dict[str, Any]] = []
    for item in entities:
        if not isinstance(item, dict):
            raise ValueError("each entity config must be an object")
        entity_id = item.get("entity_id")
        if not isinstance(entity_id, str) or not entity_id.strip():
            raise ValueError("entity_id is required")
        normalized = {"entity_id": entity_id.strip()}
        for key in ("ha_name", "display_name", "icon"):
            value = item.get(key)
            if isinstance(value, str):
                normalized[key] = value
        visible = item.get("visible")
        if isinstance(visible, bool):
            normalized["visible"] = visible
        normalized_entities.append(normalized)
    normalized_config: dict[str, Any] = {
        "title": title,
        "entities": normalized_entities,
    }
    icon = config.get("icon")
    if isinstance(icon, str):
        normalized_config["icon"] = icon
    return normalized_config


async def async_propose_card_change(
    hass: HomeAssistant,
    *,
    action: str,
    card_id: str,
    config: Any | None = None,
    summary: str = "",
) -> dict[str, Any]:
    """Create a dashboard card proposal."""
    if action not in {"create", "update", "delete"}:
        raise ValueError("action must be create, update, or delete")
    if not isinstance(card_id, str) or not card_id.strip():
        raise ValueError("card_id is required")
    payload: dict[str, Any] = {
        "action": action,
        "card_id": card_id.strip(),
    }
    if action != "delete":
        payload["config"] = validate_card_config(config)
    return await async_create_proposal(
        hass,
        proposal_type="dashboard_card",
        title=f"Dashboard card {action}: {payload['card_id']}",
        summary=summary,
        payload=payload,
    )


async def async_apply_dashboard_card_proposal(hass: HomeAssistant, proposal: dict[str, Any]) -> dict[str, Any]:
    """Apply a pending dashboard card proposal."""
    payload = proposal.get("payload")
    if not isinstance(payload, dict):
        raise ValueError("Invalid dashboard proposal payload")
    action = payload.get("action")
    card_id = payload.get("card_id")
    if action not in {"create", "update", "delete"} or not isinstance(card_id, str):
        raise ValueError("Invalid dashboard proposal action")

    configs = await _load_configs(hass)
    if action == "delete":
        if card_id not in configs:
            raise ValueError(f"Card config not found: {card_id}")
        next_configs = {key: value for key, value in configs.items() if key != card_id}
    else:
        next_configs = {**configs, card_id: validate_card_config(payload.get("config"))}
    await _save_configs(hass, next_configs)
    return {"ok": True, "action": action, "card_id": card_id}
