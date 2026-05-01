"""Runtime signal capture and heartbeat state for HAUI Agent."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from homeassistant.core import Event, HomeAssistant, callback
from homeassistant.helpers.storage import Store

DOMAIN = "yinkun_ui"
STORE_VERSION = 1
STORE_KEY = "yinkun_ui_agent_heartbeats"
MAX_SIGNALS = 100


def _domain_data(hass: HomeAssistant) -> dict[str, Any]:
    hass.data.setdefault(DOMAIN, {})
    return hass.data[DOMAIN]


async def async_setup_runtime(hass: HomeAssistant) -> None:
    """Set up lightweight event signal capture."""
    data = _domain_data(hass)
    if data.get("agent_runtime_ready"):
        return
    data["agent_signals"] = []

    @callback
    def _capture_state_change(event: Event) -> None:
        entity_id = event.data.get("entity_id")
        if not isinstance(entity_id, str):
            return
        new_state = event.data.get("new_state")
        old_state = event.data.get("old_state")
        if new_state is None:
            return
        signal = {
            "time": datetime.now(timezone.utc).isoformat(),
            "event_type": event.event_type,
            "entity_id": entity_id,
            "old_state": getattr(old_state, "state", None),
            "new_state": getattr(new_state, "state", None),
        }
        signals = data.setdefault("agent_signals", [])
        signals.insert(0, signal)
        del signals[MAX_SIGNALS:]

    data["agent_runtime_unsub_state"] = hass.bus.async_listen("state_changed", _capture_state_change)
    data["agent_runtime_ready"] = True


def get_recent_signals(hass: HomeAssistant, limit: int = 50) -> list[dict[str, Any]]:
    """Return captured recent HA signals."""
    signals = _domain_data(hass).get("agent_signals")
    if not isinstance(signals, list):
        return []
    return signals[: max(1, min(limit, MAX_SIGNALS))]


async def _heartbeat_store(hass: HomeAssistant) -> Store:
    data = _domain_data(hass)
    store = data.get("agent_heartbeat_store")
    if store is None:
        store = Store(hass, STORE_VERSION, STORE_KEY)
        data["agent_heartbeat_store"] = store
    return store


async def async_list_heartbeats(hass: HomeAssistant) -> list[dict[str, Any]]:
    """List configured heartbeat tasks."""
    store = await _heartbeat_store(hass)
    loaded = await store.async_load()
    return loaded if isinstance(loaded, list) else []


async def async_create_heartbeat(
    hass: HomeAssistant,
    *,
    name: str,
    prompt: str,
    interval_minutes: int,
    enabled: bool = True,
) -> dict[str, Any]:
    """Persist a heartbeat task definition."""
    if not isinstance(name, str) or not name.strip():
        raise ValueError("heartbeat name is required")
    if not isinstance(prompt, str) or not prompt.strip():
        raise ValueError("heartbeat prompt is required")
    interval = max(1, min(int(interval_minutes or 60), 1440))
    task = {
        "id": uuid4().hex,
        "name": name.strip(),
        "prompt": prompt.strip(),
        "interval_minutes": interval,
        "enabled": bool(enabled),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "last_run_at": None,
    }
    tasks = await async_list_heartbeats(hass)
    store = await _heartbeat_store(hass)
    await store.async_save([task, *tasks])
    return task
