"""Append-only audit log for HAUI Agent actions."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

DOMAIN = "yinkun_ui"
STORE_VERSION = 1
STORE_KEY = "yinkun_ui_agent_audit"
MAX_AUDIT_ITEMS = 500


def _domain_data(hass: HomeAssistant) -> dict[str, Any]:
    hass.data.setdefault(DOMAIN, {})
    return hass.data[DOMAIN]


async def _store(hass: HomeAssistant) -> Store:
    data = _domain_data(hass)
    store = data.get("agent_audit_store")
    if store is None:
        store = Store(hass, STORE_VERSION, STORE_KEY)
        data["agent_audit_store"] = store
    return store


async def async_list_audit(hass: HomeAssistant, limit: int = 100) -> list[dict[str, Any]]:
    """Return recent audit entries."""
    store = await _store(hass)
    loaded = await store.async_load()
    entries = loaded if isinstance(loaded, list) else []
    return entries[: max(1, min(limit, MAX_AUDIT_ITEMS))]


async def async_append_audit(
    hass: HomeAssistant,
    *,
    action: str,
    actor: str = "agent",
    payload: dict[str, Any] | None = None,
    result: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Append one audit entry."""
    store = await _store(hass)
    loaded = await store.async_load()
    entries = loaded if isinstance(loaded, list) else []
    entry = {
        "id": uuid4().hex,
        "time": datetime.now(timezone.utc).isoformat(),
        "actor": actor,
        "action": action,
        "payload": payload or {},
        "result": result or {},
    }
    entries = [entry, *entries][:MAX_AUDIT_ITEMS]
    await store.async_save(entries)
    return entry
