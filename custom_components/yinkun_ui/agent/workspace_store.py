"""Hot-reloadable workspace documents for HAUI Agent personality."""
from __future__ import annotations

import hashlib
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

from .proposal_store import async_create_proposal

DOMAIN = "yinkun_ui"
STORE_VERSION = 1
STORE_KEY = "yinkun_ui_agent_workspace"

DEFAULT_DOCS: dict[str, str] = {
    "AGENTS.md": "# AGENTS\n\nDefine role boundaries, safety rules, and operating constraints for HAUI Agent.\n",
    "BOOTSTRAP.md": "# BOOTSTRAP\n\nFirst-run setup notes for HAUI Agent.\n",
    "HEARTBEAT.md": "# HEARTBEAT\n\nRules for scheduled follow-up tasks.\n",
    "IDENTITY.md": "# IDENTITY\n\nAssistant name, role, and user-facing identity.\n",
    "MEMORY.md": "# MEMORY\n\nLong-term preferences that should be considered during conversations.\n",
    "SOUL.md": "# SOUL\n\nTone and personality baseline.\n",
    "TOOLS.md": "# TOOLS\n\nNotes about devices, rooms, entities, and available tools.\n",
    "USER.md": "# USER\n\nBasic user information and preferences.\n",
}


def _domain_data(hass: HomeAssistant) -> dict[str, Any]:
    hass.data.setdefault(DOMAIN, {})
    return hass.data[DOMAIN]


async def _store(hass: HomeAssistant) -> Store:
    data = _domain_data(hass)
    store = data.get("agent_workspace_store")
    if store is None:
        store = Store(hass, STORE_VERSION, STORE_KEY)
        data["agent_workspace_store"] = store
    return store


def _signature(content: str) -> str:
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def _normalize_docs(payload: Any) -> dict[str, str]:
    if not isinstance(payload, dict):
        return dict(DEFAULT_DOCS)
    docs = dict(DEFAULT_DOCS)
    for name in DEFAULT_DOCS:
        value = payload.get(name)
        if isinstance(value, str):
            docs[name] = value
    return docs


async def async_load_workspace(hass: HomeAssistant) -> dict[str, str]:
    """Load workspace docs with defaults."""
    data = _domain_data(hass)
    cached = data.get("agent_workspace_docs")
    if isinstance(cached, dict):
        return cached
    store = await _store(hass)
    loaded = await store.async_load()
    docs = _normalize_docs(loaded)
    data["agent_workspace_docs"] = docs
    return docs


async def async_save_workspace(hass: HomeAssistant, docs: dict[str, str]) -> None:
    """Persist workspace docs."""
    normalized = _normalize_docs(docs)
    data = _domain_data(hass)
    data["agent_workspace_docs"] = normalized
    store = await _store(hass)
    await store.async_save(normalized)


async def async_workspace_index(hass: HomeAssistant) -> list[dict[str, Any]]:
    """Return workspace document metadata."""
    docs = await async_load_workspace(hass)
    return [
        {
            "name": name,
            "length": len(content),
            "signature": _signature(content),
        }
        for name, content in docs.items()
    ]


async def async_read_workspace_doc(hass: HomeAssistant, name: str) -> dict[str, Any]:
    """Read one workspace document."""
    docs = await async_load_workspace(hass)
    if name not in docs:
        raise ValueError(f"Workspace document not found: {name}")
    content = docs[name]
    return {"name": name, "content": content, "signature": _signature(content)}


async def async_propose_workspace_update(
    hass: HomeAssistant,
    *,
    name: str,
    content: str,
    summary: str = "",
) -> dict[str, Any]:
    """Create a workspace update proposal."""
    if name not in DEFAULT_DOCS:
        raise ValueError(f"Unsupported workspace document: {name}")
    if not isinstance(content, str):
        raise ValueError("content must be a string")
    return await async_create_proposal(
        hass,
        proposal_type="workspace_doc",
        title=f"Update workspace document: {name}",
        summary=summary,
        payload={"name": name, "content": content, "signature": _signature(content)},
    )


async def async_apply_workspace_proposal(hass: HomeAssistant, proposal: dict[str, Any]) -> dict[str, Any]:
    """Apply a workspace document proposal."""
    payload = proposal.get("payload")
    if not isinstance(payload, dict):
        raise ValueError("Invalid workspace proposal payload")
    name = payload.get("name")
    content = payload.get("content")
    if not isinstance(name, str) or name not in DEFAULT_DOCS or not isinstance(content, str):
        raise ValueError("Invalid workspace proposal content")
    docs = await async_load_workspace(hass)
    docs = {**docs, name: content}
    await async_save_workspace(hass, docs)
    return {"ok": True, "name": name, "signature": _signature(content)}
