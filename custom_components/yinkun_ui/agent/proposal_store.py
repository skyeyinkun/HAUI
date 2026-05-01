"""Proposal storage and approval helpers for HAUI Agent."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

DOMAIN = "yinkun_ui"
STORE_VERSION = 1
STORE_KEY = "yinkun_ui_agent_proposals"

STATUS_PENDING = "pending"
STATUS_APPROVED = "approved"
STATUS_APPROVED_NOT_APPLIED = "approved_not_applied"
STATUS_DISCARDED = "discarded"
STATUS_FAILED = "failed"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _domain_data(hass: HomeAssistant) -> dict[str, Any]:
    hass.data.setdefault(DOMAIN, {})
    return hass.data[DOMAIN]


async def _store(hass: HomeAssistant) -> Store:
    data = _domain_data(hass)
    store = data.get("agent_proposal_store")
    if store is None:
        store = Store(hass, STORE_VERSION, STORE_KEY)
        data["agent_proposal_store"] = store
    return store


async def _load(hass: HomeAssistant) -> dict[str, dict[str, Any]]:
    data = _domain_data(hass)
    cached = data.get("agent_proposals")
    if isinstance(cached, dict):
        return cached
    store = await _store(hass)
    loaded = await store.async_load()
    proposals = loaded if isinstance(loaded, dict) else {}
    data["agent_proposals"] = proposals
    return proposals


async def _save(hass: HomeAssistant, proposals: dict[str, dict[str, Any]]) -> None:
    data = _domain_data(hass)
    data["agent_proposals"] = proposals
    store = await _store(hass)
    await store.async_save(proposals)


async def async_create_proposal(
    hass: HomeAssistant,
    *,
    proposal_type: str,
    title: str,
    payload: dict[str, Any],
    summary: str = "",
) -> dict[str, Any]:
    """Create a pending proposal."""
    proposals = await _load(hass)
    proposal_id = uuid4().hex
    proposal = {
        "id": proposal_id,
        "type": proposal_type,
        "title": title,
        "summary": summary,
        "payload": payload,
        "status": STATUS_PENDING,
        "created_at": _now(),
        "updated_at": _now(),
        "result": None,
    }
    proposals = {**proposals, proposal_id: proposal}
    await _save(hass, proposals)
    return proposal


async def async_list_proposals(
    hass: HomeAssistant,
    *,
    status: str | None = None,
    proposal_type: str | None = None,
) -> list[dict[str, Any]]:
    """List proposals newest first."""
    proposals = await _load(hass)
    items = list(proposals.values())
    if status:
        items = [item for item in items if item.get("status") == status]
    if proposal_type:
        items = [item for item in items if item.get("type") == proposal_type]
    return sorted(items, key=lambda item: str(item.get("created_at", "")), reverse=True)


async def async_get_proposal(hass: HomeAssistant, proposal_id: str) -> dict[str, Any] | None:
    """Return a proposal by id."""
    proposals = await _load(hass)
    proposal = proposals.get(proposal_id)
    return proposal if isinstance(proposal, dict) else None


async def async_update_proposal(
    hass: HomeAssistant,
    proposal_id: str,
    *,
    status: str,
    result: Any = None,
) -> dict[str, Any]:
    """Update proposal status and result."""
    proposals = await _load(hass)
    proposal = proposals.get(proposal_id)
    if not isinstance(proposal, dict):
        raise ValueError(f"Proposal not found: {proposal_id}")
    updated = {
        **proposal,
        "status": status,
        "updated_at": _now(),
        "result": result,
    }
    proposals = {**proposals, proposal_id: updated}
    await _save(hass, proposals)
    return updated


async def async_discard_proposal(hass: HomeAssistant, proposal_id: str) -> dict[str, Any]:
    """Mark a proposal as discarded."""
    return await async_update_proposal(
        hass,
        proposal_id,
        status=STATUS_DISCARDED,
        result={"ok": True, "message": "Proposal discarded"},
    )
