"""Automation and script discovery plus safe proposal helpers."""
from __future__ import annotations

from typing import Any

from homeassistant.core import HomeAssistant

from .proposal_store import async_create_proposal


def _state_to_dict(state) -> dict[str, Any]:
    return {
        "entity_id": state.entity_id,
        "state": state.state,
        "name": state.attributes.get("friendly_name"),
        "last_changed": state.last_changed.isoformat() if state.last_changed else None,
        "attributes": {
            key: value
            for key, value in state.attributes.items()
            if key in {"friendly_name", "current", "last_triggered", "mode"}
        },
    }


async def async_list_automations(hass: HomeAssistant) -> dict[str, Any]:
    """List automation entities."""
    items = [_state_to_dict(state) for state in hass.states.async_all("automation")]
    return {"automations": sorted(items, key=lambda item: str(item.get("name") or item.get("entity_id")))}


async def async_list_scripts(hass: HomeAssistant) -> dict[str, Any]:
    """List script entities."""
    items = [_state_to_dict(state) for state in hass.states.async_all("script")]
    return {"scripts": sorted(items, key=lambda item: str(item.get("name") or item.get("entity_id")))}


async def async_get_automation(hass: HomeAssistant, entity_id: str) -> dict[str, Any]:
    """Get one automation entity state."""
    state = hass.states.get(entity_id)
    if state is None or not entity_id.startswith("automation."):
        raise ValueError(f"Automation not found: {entity_id}")
    return _state_to_dict(state)


async def async_get_script(hass: HomeAssistant, entity_id: str) -> dict[str, Any]:
    """Get one script entity state."""
    state = hass.states.get(entity_id)
    if state is None or not entity_id.startswith("script."):
        raise ValueError(f"Script not found: {entity_id}")
    return _state_to_dict(state)


async def async_propose_automation_change(
    hass: HomeAssistant,
    *,
    action: str,
    title: str,
    config: dict[str, Any],
    summary: str = "",
) -> dict[str, Any]:
    """Create an automation change proposal without touching YAML."""
    if action not in {"create", "update", "delete"}:
        raise ValueError("action must be create, update, or delete")
    if not isinstance(config, dict):
        raise ValueError("config must be an object")
    return await async_create_proposal(
        hass,
        proposal_type="automation",
        title=title or f"Automation {action}",
        summary=summary,
        payload={"action": action, "config": config},
    )


async def async_propose_script_change(
    hass: HomeAssistant,
    *,
    action: str,
    title: str,
    config: dict[str, Any],
    summary: str = "",
) -> dict[str, Any]:
    """Create a script change proposal without touching YAML."""
    if action not in {"create", "update", "delete"}:
        raise ValueError("action must be create, update, or delete")
    if not isinstance(config, dict):
        raise ValueError("config must be an object")
    return await async_create_proposal(
        hass,
        proposal_type="script",
        title=title or f"Script {action}",
        summary=summary,
        payload={"action": action, "config": config},
    )
