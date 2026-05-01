"""HTTP views for the HAUI Agent Kernel."""
from __future__ import annotations

from dataclasses import asdict
from typing import Any

from homeassistant.components.http import HomeAssistantView
from homeassistant.core import Context, HomeAssistant

from .config_store import (
    async_load_config,
    async_save_config,
    config_from_payload,
    config_to_dict,
)
from .audit_store import async_append_audit, async_list_audit
from .dashboard_tools import async_apply_dashboard_card_proposal
from .memory_store import async_add_memory, async_list_memory, async_search_memory
from .proposal_store import (
    STATUS_APPROVED,
    STATUS_APPROVED_NOT_APPLIED,
    STATUS_FAILED,
    STATUS_PENDING,
    async_discard_proposal,
    async_get_proposal,
    async_list_proposals,
    async_update_proposal,
)
from .runtime import async_create_heartbeat, async_list_heartbeats, get_recent_signals
from .tool_executor import ToolExecutor
from .tool_registry import ToolRegistry
from .turn_kernel import TurnKernel
from .workspace_store import (
    async_apply_workspace_proposal,
    async_propose_workspace_update,
    async_read_workspace_doc,
    async_workspace_index,
)


def register_agent_views(hass: HomeAssistant) -> None:
    """Register all agent HTTP views."""
    hass.http.register_view(AgentStatusView)
    hass.http.register_view(AgentConfigView)
    hass.http.register_view(AgentToolsView)
    hass.http.register_view(AgentExecuteToolView)
    hass.http.register_view(AgentTurnView)
    hass.http.register_view(AgentProposalListView)
    hass.http.register_view(AgentProposalApproveView)
    hass.http.register_view(AgentProposalDiscardView)
    hass.http.register_view(AgentWorkspaceView)
    hass.http.register_view(AgentWorkspaceProposeView)
    hass.http.register_view(AgentWorkspaceDocView)
    hass.http.register_view(AgentMemoryView)
    hass.http.register_view(AgentHeartbeatView)
    hass.http.register_view(AgentSignalsView)
    hass.http.register_view(AgentAuditView)


class AgentStatusView(HomeAssistantView):
    """Return runtime status for the HAUI Agent Kernel."""

    url = "/api/yinkun_ui/agent/status"
    name = "api:yinkun_ui:agent:status"
    requires_auth = True

    async def get(self, request):
        error = _admin_error(self, request)
        if error is not None:
            return error
        hass = request.app["hass"]
        config = await async_load_config(hass)
        tools = ToolRegistry(hass)
        return self.json(
            {
                "ok": True,
                "stage": 1,
                "stages_enabled": [1, 2, 3, 4, 5, 6],
                "kernel": "HAUI Agent Kernel",
                "config": config_to_dict(config, redact=True),
                "tool_count": len(tools.tools),
                "implemented_tool_count": len([tool for tool in tools.tools if tool.implemented]),
            }
        )


class AgentConfigView(HomeAssistantView):
    """Read or update persisted Agent Kernel config."""

    url = "/api/yinkun_ui/agent/config"
    name = "api:yinkun_ui:agent:config"
    requires_auth = True

    async def get(self, request):
        error = _admin_error(self, request)
        if error is not None:
            return error
        hass = request.app["hass"]
        config = await async_load_config(hass)
        return self.json(config_to_dict(config, redact=True))

    async def post(self, request):
        error = _admin_error(self, request)
        if error is not None:
            return error
        hass = request.app["hass"]
        payload = await _json(request)
        if not isinstance(payload, dict):
            return self.json({"error": "payload must be an object"}, status_code=400)
        existing = await async_load_config(hass)
        config = config_from_payload(payload, existing)
        await async_save_config(hass, config)
        await async_append_audit(
            hass,
            action="agent.config.update",
            actor=_actor(request),
            payload={"fields": list(payload.keys())},
            result={"ok": True},
        )
        return self.json({"ok": True, "config": config_to_dict(config, redact=True)})


class AgentToolsView(HomeAssistantView):
    """Expose registered agent tools and policy metadata."""

    url = "/api/yinkun_ui/agent/tools"
    name = "api:yinkun_ui:agent:tools"
    requires_auth = True

    async def get(self, request):
        error = _admin_error(self, request)
        if error is not None:
            return error
        hass = request.app["hass"]
        tools = ToolRegistry(hass)
        return self.json({"tools": tools.api_tools()})


class AgentExecuteToolView(HomeAssistantView):
    """Execute one tool directly for testing and frontend integration."""

    url = "/api/yinkun_ui/agent/tool/execute"
    name = "api:yinkun_ui:agent:tool:execute"
    requires_auth = True

    async def post(self, request):
        error = _admin_error(self, request)
        if error is not None:
            return error
        hass = request.app["hass"]
        payload = await _json(request)
        if not isinstance(payload, dict):
            return self.json({"error": "payload must be an object"}, status_code=400)
        name = payload.get("name")
        args = payload.get("arguments") or payload.get("args") or {}
        if not isinstance(name, str) or not isinstance(args, dict):
            return self.json({"error": "name and arguments are required"}, status_code=400)
        try:
            result = await ToolExecutor(hass, actor=_actor(request), context=_context(request)).execute(name, args)
        except Exception as err:  # noqa: BLE001
            return self.json({"error": str(err)}, status_code=400)
        return self.json({"ok": True, "result": result})


class AgentTurnView(HomeAssistantView):
    """Run one non-streaming Agent Kernel turn."""

    url = "/api/yinkun_ui/agent/turn"
    name = "api:yinkun_ui:agent:turn"
    requires_auth = True

    async def post(self, request):
        error = _admin_error(self, request)
        if error is not None:
            return error
        hass = request.app["hass"]
        payload = await _json(request)
        if not isinstance(payload, dict):
            return self.json({"error": "payload must be an object"}, status_code=400)

        config = (
            config_from_payload(payload.get("config"), await async_load_config(hass))
            if payload.get("config")
            else await async_load_config(hass)
        )
        messages = payload.get("messages")
        include_tools = payload.get("include_tools") is True

        try:
            result = await TurnKernel(hass, config, actor=_actor(request), context=_context(request)).run(messages, include_tools=include_tools)
        except ValueError as err:
            return self.json({"error": str(err)}, status_code=400)
        except Exception as err:  # noqa: BLE001 - return safe runtime failure to caller
            return self.json({"error": str(err)}, status_code=502)

        return self.json({"ok": True, **asdict(result)})


class AgentProposalListView(HomeAssistantView):
    """List pending and historical proposals."""

    url = "/api/yinkun_ui/agent/proposals"
    name = "api:yinkun_ui:agent:proposals"
    requires_auth = True

    async def get(self, request):
        error = _admin_error(self, request)
        if error is not None:
            return error
        hass = request.app["hass"]
        status = request.query.get("status")
        proposal_type = request.query.get("type")
        proposals = await async_list_proposals(hass, status=status, proposal_type=proposal_type)
        return self.json({"proposals": proposals})


class AgentProposalApproveView(HomeAssistantView):
    """Approve and apply an agent proposal when supported."""

    url = "/api/yinkun_ui/agent/proposals/{proposal_id}/approve"
    name = "api:yinkun_ui:agent:proposals:approve"
    requires_auth = True

    async def post(self, request):
        error = _admin_error(self, request)
        if error is not None:
            return error
        hass = request.app["hass"]
        proposal_id = request.match_info.get("proposal_id")
        proposal = await async_get_proposal(hass, proposal_id)
        if not proposal:
            return self.json({"error": "proposal not found"}, status_code=404)
        if proposal.get("status") != STATUS_PENDING:
            return self.json({"error": "proposal is not pending", "proposal": proposal}, status_code=409)
        try:
            result = await _apply_proposal(hass, proposal)
            status = STATUS_APPROVED if result.get("applied") is not False else STATUS_APPROVED_NOT_APPLIED
            updated = await async_update_proposal(hass, proposal_id, status=status, result=result)
            await async_append_audit(hass, action="proposal.approve", actor=_actor(request), payload={"proposal_id": proposal_id}, result=result)
        except Exception as err:  # noqa: BLE001
            updated = await async_update_proposal(hass, proposal_id, status=STATUS_FAILED, result={"ok": False, "error": str(err)})
            await async_append_audit(hass, action="proposal.approve", actor=_actor(request), payload={"proposal_id": proposal_id}, result={"ok": False, "error": str(err)})
            return self.json({"error": str(err), "proposal": updated}, status_code=400)
        return self.json({"ok": True, "proposal": updated})


class AgentProposalDiscardView(HomeAssistantView):
    """Discard an agent proposal."""

    url = "/api/yinkun_ui/agent/proposals/{proposal_id}/discard"
    name = "api:yinkun_ui:agent:proposals:discard"
    requires_auth = True

    async def post(self, request):
        error = _admin_error(self, request)
        if error is not None:
            return error
        hass = request.app["hass"]
        proposal_id = request.match_info.get("proposal_id")
        proposal = await async_get_proposal(hass, proposal_id)
        if not proposal:
            return self.json({"error": "proposal not found"}, status_code=404)
        if proposal.get("status") != STATUS_PENDING:
            return self.json({"error": "proposal is not pending", "proposal": proposal}, status_code=409)
        try:
            proposal = await async_discard_proposal(hass, proposal_id)
            await async_append_audit(hass, action="proposal.discard", actor=_actor(request), payload={"proposal_id": proposal_id}, result={"ok": True})
        except Exception as err:  # noqa: BLE001
            return self.json({"error": str(err)}, status_code=404)
        return self.json({"ok": True, "proposal": proposal})


class AgentWorkspaceView(HomeAssistantView):
    """List workspace documents."""

    url = "/api/yinkun_ui/agent/workspace"
    name = "api:yinkun_ui:agent:workspace"
    requires_auth = True

    async def get(self, request):
        error = _admin_error(self, request)
        if error is not None:
            return error
        hass = request.app["hass"]
        return self.json({"documents": await async_workspace_index(hass)})


class AgentWorkspaceDocView(HomeAssistantView):
    """Read one workspace document."""

    url = "/api/yinkun_ui/agent/workspace/{name}"
    name = "api:yinkun_ui:agent:workspace:doc"
    requires_auth = True

    async def get(self, request):
        error = _admin_error(self, request)
        if error is not None:
            return error
        hass = request.app["hass"]
        doc_name = request.match_info.get("name")
        try:
            doc = await async_read_workspace_doc(hass, doc_name)
        except Exception as err:  # noqa: BLE001
            return self.json({"error": str(err)}, status_code=404)
        return self.json(doc)


class AgentWorkspaceProposeView(HomeAssistantView):
    """Create a workspace update proposal."""

    url = "/api/yinkun_ui/agent/workspace/propose"
    name = "api:yinkun_ui:agent:workspace:propose"
    requires_auth = True

    async def post(self, request):
        error = _admin_error(self, request)
        if error is not None:
            return error
        hass = request.app["hass"]
        payload = await _json(request)
        if not isinstance(payload, dict):
            return self.json({"error": "payload must be an object"}, status_code=400)
        try:
            proposal = await async_propose_workspace_update(
                hass,
                name=str(payload.get("name") or ""),
                content=str(payload.get("content") or ""),
                summary=str(payload.get("summary") or ""),
            )
            await async_append_audit(
                hass,
                action="workspace.propose",
                actor=_actor(request),
                payload={"name": proposal.get("payload", {}).get("name")},
                result={"ok": True, "proposal_id": proposal.get("id")},
            )
        except Exception as err:  # noqa: BLE001
            return self.json({"error": str(err)}, status_code=400)
        return self.json({"ok": True, "proposal": proposal})


class AgentMemoryView(HomeAssistantView):
    """List, search, or add adaptive memory entries."""

    url = "/api/yinkun_ui/agent/memory"
    name = "api:yinkun_ui:agent:memory"
    requires_auth = True

    async def get(self, request):
        error = _admin_error(self, request)
        if error is not None:
            return error
        hass = request.app["hass"]
        query = request.query.get("query")
        limit = _int_query(request, "limit", 50, 1, 100)
        entries = await async_search_memory(hass, query, limit) if query else await async_list_memory(hass, limit)
        return self.json({"entries": entries})

    async def post(self, request):
        error = _admin_error(self, request)
        if error is not None:
            return error
        hass = request.app["hass"]
        payload = await _json(request)
        if not isinstance(payload, dict):
            return self.json({"error": "payload must be an object"}, status_code=400)
        tags = payload.get("tags")
        try:
            entry = await async_add_memory(
                hass,
                text=str(payload.get("text") or ""),
                tags=tags if isinstance(tags, list) else [],
                source="api",
            )
            await async_append_audit(
                hass,
                action="memory.add",
                actor=_actor(request),
                payload={"tags": entry.get("tags"), "source": entry.get("source")},
                result={"ok": True, "entry_id": entry.get("id")},
            )
        except Exception as err:  # noqa: BLE001
            return self.json({"error": str(err)}, status_code=400)
        return self.json({"ok": True, "entry": entry})


class AgentHeartbeatView(HomeAssistantView):
    """Manage heartbeat task definitions."""

    url = "/api/yinkun_ui/agent/heartbeats"
    name = "api:yinkun_ui:agent:heartbeats"
    requires_auth = True

    async def get(self, request):
        error = _admin_error(self, request)
        if error is not None:
            return error
        hass = request.app["hass"]
        return self.json({"heartbeats": await async_list_heartbeats(hass)})

    async def post(self, request):
        error = _admin_error(self, request)
        if error is not None:
            return error
        hass = request.app["hass"]
        payload = await _json(request)
        if not isinstance(payload, dict):
            return self.json({"error": "payload must be an object"}, status_code=400)
        try:
            task = await async_create_heartbeat(
                hass,
                name=str(payload.get("name") or ""),
                prompt=str(payload.get("prompt") or ""),
                interval_minutes=int(payload.get("interval_minutes") or 60),
                enabled=payload.get("enabled") is not False,
            )
            await async_append_audit(
                hass,
                action="heartbeat.create",
                actor=_actor(request),
                payload={"name": task.get("name"), "interval_minutes": task.get("interval_minutes")},
                result={"ok": True, "heartbeat_id": task.get("id")},
            )
        except Exception as err:  # noqa: BLE001
            return self.json({"error": str(err)}, status_code=400)
        return self.json({"ok": True, "heartbeat": task})


class AgentSignalsView(HomeAssistantView):
    """Return recent captured HA signals."""

    url = "/api/yinkun_ui/agent/signals"
    name = "api:yinkun_ui:agent:signals"
    requires_auth = True

    async def get(self, request):
        error = _admin_error(self, request)
        if error is not None:
            return error
        hass = request.app["hass"]
        return self.json({"signals": get_recent_signals(hass, _int_query(request, "limit", 50, 1, 100))})


class AgentAuditView(HomeAssistantView):
    """Return append-only audit entries."""

    url = "/api/yinkun_ui/agent/audit"
    name = "api:yinkun_ui:agent:audit"
    requires_auth = True

    async def get(self, request):
        error = _admin_error(self, request)
        if error is not None:
            return error
        hass = request.app["hass"]
        return self.json({"entries": await async_list_audit(hass, _int_query(request, "limit", 100, 1, 500))})


async def _json(request) -> Any:
    try:
        return await request.json()
    except Exception:  # noqa: BLE001
        return None


async def _apply_proposal(hass: HomeAssistant, proposal: dict[str, Any]) -> dict[str, Any]:
    proposal_type = proposal.get("type")
    if proposal_type == "dashboard_card":
        return await async_apply_dashboard_card_proposal(hass, proposal)
    if proposal_type == "workspace_doc":
        return await async_apply_workspace_proposal(hass, proposal)
    if proposal_type in {"automation", "script"}:
        return {
            "ok": True,
            "applied": False,
            "message": "Automation and script proposals are approved for review but not written to YAML by HAUI Agent.",
        }
    raise ValueError(f"Unsupported proposal type: {proposal_type}")


def _int_query(request, key: str, default: int, minimum: int, maximum: int) -> int:
    value = request.query.get(key)
    try:
        parsed = int(value) if value is not None else default
    except ValueError:
        parsed = default
    return max(minimum, min(maximum, parsed))


def _admin_error(view: HomeAssistantView, request):
    user = _request_user(request)
    if user is None or not getattr(user, "is_admin", False):
        return view.json({"error": "admin privileges are required"}, status_code=403)
    return None


def _actor(request) -> str:
    user = _request_user(request)
    user_id = getattr(user, "id", None)
    return f"user:{user_id}" if user_id else "user"


def _context(request) -> Context | None:
    user = _request_user(request)
    user_id = getattr(user, "id", None)
    return Context(user_id=user_id) if user_id else None


def _request_user(request) -> Any:
    try:
        return request.get("hass_user")
    except AttributeError:
        try:
            return request["hass_user"]
        except Exception:  # noqa: BLE001
            return None
