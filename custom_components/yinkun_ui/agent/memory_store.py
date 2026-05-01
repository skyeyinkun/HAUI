"""Adaptive memory store for HAUI Agent."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

DOMAIN = "yinkun_ui"
STORE_VERSION = 1
STORE_KEY = "yinkun_ui_agent_memory"
MAX_MEMORY_ITEMS = 300


def _domain_data(hass: HomeAssistant) -> dict[str, Any]:
    hass.data.setdefault(DOMAIN, {})
    return hass.data[DOMAIN]


async def _store(hass: HomeAssistant) -> Store:
    data = _domain_data(hass)
    store = data.get("agent_memory_store")
    if store is None:
        store = Store(hass, STORE_VERSION, STORE_KEY)
        data["agent_memory_store"] = store
    return store


async def _load(hass: HomeAssistant) -> list[dict[str, Any]]:
    data = _domain_data(hass)
    cached = data.get("agent_memory_entries")
    if isinstance(cached, list):
        return cached
    store = await _store(hass)
    loaded = await store.async_load()
    entries = loaded if isinstance(loaded, list) else []
    data["agent_memory_entries"] = entries
    return entries


async def _save(hass: HomeAssistant, entries: list[dict[str, Any]]) -> None:
    data = _domain_data(hass)
    data["agent_memory_entries"] = entries[:MAX_MEMORY_ITEMS]
    store = await _store(hass)
    await store.async_save(entries[:MAX_MEMORY_ITEMS])


async def async_add_memory(
    hass: HomeAssistant,
    *,
    text: str,
    tags: list[str] | None = None,
    source: str = "agent",
) -> dict[str, Any]:
    """Add one memory entry."""
    if not isinstance(text, str) or not text.strip():
        raise ValueError("memory text is required")
    clean_tags = [tag.strip() for tag in tags or [] if isinstance(tag, str) and tag.strip()]
    entry = {
        "id": uuid4().hex,
        "text": text.strip(),
        "tags": clean_tags[:12],
        "source": source,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    entries = await _load(hass)
    await _save(hass, [entry, *entries])
    return entry


async def async_list_memory(hass: HomeAssistant, limit: int = 50) -> list[dict[str, Any]]:
    """List recent memory entries."""
    entries = await _load(hass)
    return entries[: max(1, min(limit, MAX_MEMORY_ITEMS))]


async def async_search_memory(hass: HomeAssistant, query: str, limit: int = 8) -> list[dict[str, Any]]:
    """Search memory entries using lightweight token overlap."""
    entries = await _load(hass)
    terms = _terms(query)
    if not terms:
        return entries[: max(1, min(limit, MAX_MEMORY_ITEMS))]

    scored: list[tuple[int, dict[str, Any]]] = []
    for entry in entries:
        haystack = " ".join([str(entry.get("text", "")), " ".join(entry.get("tags") or [])]).lower()
        score = sum(1 for term in terms if term in haystack)
        if score > 0:
            scored.append((score, entry))
    scored.sort(key=lambda item: item[0], reverse=True)
    return [entry for _, entry in scored[: max(1, min(limit, MAX_MEMORY_ITEMS))]]


def _terms(value: str) -> list[str]:
    if not isinstance(value, str):
        return []
    lowered = value.lower()
    rough = [part.strip() for part in lowered.replace(",", " ").replace("，", " ").split()]
    if rough:
        return [part for part in rough if part]
    return [char for char in lowered if not char.isspace()][:24]
