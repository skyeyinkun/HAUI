"""Executable tools for the HAUI Agent Kernel."""
from __future__ import annotations

import json
from typing import Any

from homeassistant.core import Context, HomeAssistant

from .audit_store import async_append_audit
from .automation_script_tools import (
    async_get_automation,
    async_get_script,
    async_list_automations,
    async_list_scripts,
    async_propose_automation_change,
    async_propose_script_change,
)
from .dashboard_tools import async_list_cards, async_propose_card_change
from .memory_store import async_add_memory, async_search_memory
from .proposal_store import async_list_proposals
from .runtime import async_create_heartbeat, async_list_heartbeats, get_recent_signals
from .workspace_store import (
    async_propose_workspace_update,
    async_read_workspace_doc,
    async_workspace_index,
)

ALLOWED_SERVICES: dict[str, set[str]] = {
    "light": {"turn_on", "turn_off", "toggle"},
    "switch": {"turn_on", "turn_off", "toggle"},
    "input_boolean": {"turn_on", "turn_off", "toggle"},
    "cover": {"open_cover", "close_cover", "stop_cover", "set_cover_position"},
    "fan": {"turn_on", "turn_off", "toggle", "set_percentage", "set_preset_mode"},
    "media_player": {"turn_on", "turn_off", "toggle", "media_play_pause", "media_play", "media_pause", "volume_set", "volume_up", "volume_down"},
    "climate": {"turn_on", "turn_off", "set_temperature", "set_hvac_mode", "set_fan_mode", "set_swing_mode"},
    "humidifier": {"turn_on", "turn_off", "toggle", "set_humidity", "set_mode"},
    "vacuum": {"start", "pause", "stop", "return_to_base"},
}

BLOCKED_DOMAINS = {"lock", "alarm_control_panel"}
INDIRECT_CONTROL_DOMAINS = {"remote", "scene", "script"}
BLOCKED_SERVICES = {"unlock", "open", "disarm", "alarm_disarm", "reload", "restart", "stop", "shutdown"}


class ToolExecutionError(Exception):
    """Raised when a tool cannot be executed."""


class ToolExecutor:
    """Execute LLM tool calls against Home Assistant and HAUI stores."""

    def __init__(
        self,
        hass: HomeAssistant,
        *,
        actor: str = "agent",
        context: Context | None = None,
    ) -> None:
        self._hass = hass
        self._actor = actor
        self._context = context

    async def execute_call(self, tool_call: dict[str, Any]) -> dict[str, Any]:
        """Execute one OpenAI-style tool call."""
        function = tool_call.get("function") if isinstance(tool_call, dict) else None
        if not isinstance(function, dict):
            raise ToolExecutionError("Invalid tool call")
        name = function.get("name")
        args = _parse_arguments(function.get("arguments"))
        if not isinstance(name, str):
            raise ToolExecutionError("Tool name is required")
        result = await self.execute(name, args)
        return {
            "tool_call_id": tool_call.get("id") or name,
            "name": name,
            "content": json.dumps(result, ensure_ascii=False),
        }

    async def execute(self, name: str, args: dict[str, Any]) -> dict[str, Any]:
        """Execute a named tool."""
        try:
            result = await self._execute(name, args)
        except Exception as err:
            await self._audit(name, args, {"ok": False, "error": str(err)})
            raise
        await self._audit(name, args, {"ok": True})
        return result

    async def _execute(self, name: str, args: dict[str, Any]) -> dict[str, Any]:
        """Execute a named tool without wrapping audit behavior."""
        if name == "get_system_index":
            from .tool_registry import ToolRegistry

            return ToolRegistry(self._hass).get_system_index()
        if name == "find_entities":
            return self._find_entities(args)
        if name == "get_entity_state":
            return self._get_entity_state(args)
        if name == "get_home_summary":
            return self._get_home_summary()
        if name == "call_ha_service":
            return await self._call_ha_service(args)
        if name == "dashboard_card_list":
            return await async_list_cards(self._hass)
        if name == "propose_dashboard_card_change":
            return await async_propose_card_change(
                self._hass,
                action=str(args.get("action") or ""),
                card_id=str(args.get("card_id") or ""),
                config=args.get("config"),
                summary=str(args.get("summary") or ""),
            )
        if name == "workspace_list":
            return {"documents": await async_workspace_index(self._hass)}
        if name == "workspace_read":
            return await async_read_workspace_doc(self._hass, str(args.get("name") or ""))
        if name == "propose_workspace_update":
            return await async_propose_workspace_update(
                self._hass,
                name=str(args.get("name") or ""),
                content=str(args.get("content") or ""),
                summary=str(args.get("summary") or ""),
            )
        if name == "memory_search":
            return {"entries": await async_search_memory(self._hass, str(args.get("query") or ""), _limit(args, 8, 30))}
        if name == "memory_add":
            tags = args.get("tags")
            return await async_add_memory(
                self._hass,
                text=str(args.get("text") or ""),
                tags=tags if isinstance(tags, list) else [],
                source="agent_tool",
            )
        if name == "automation_list":
            return await async_list_automations(self._hass)
        if name == "automation_get":
            return await async_get_automation(self._hass, str(args.get("entity_id") or ""))
        if name == "propose_automation_change":
            return await async_propose_automation_change(
                self._hass,
                action=str(args.get("action") or ""),
                title=str(args.get("title") or ""),
                config=args.get("config") if isinstance(args.get("config"), dict) else {},
                summary=str(args.get("summary") or ""),
            )
        if name == "script_list":
            return await async_list_scripts(self._hass)
        if name == "script_get":
            return await async_get_script(self._hass, str(args.get("entity_id") or ""))
        if name == "propose_script_change":
            return await async_propose_script_change(
                self._hass,
                action=str(args.get("action") or ""),
                title=str(args.get("title") or ""),
                config=args.get("config") if isinstance(args.get("config"), dict) else {},
                summary=str(args.get("summary") or ""),
            )
        if name == "proposal_list":
            return {"proposals": await async_list_proposals(self._hass, status=args.get("status") if isinstance(args.get("status"), str) else None)}
        if name == "heartbeat_list":
            return {"heartbeats": await async_list_heartbeats(self._hass)}
        if name == "heartbeat_create":
            return await async_create_heartbeat(
                self._hass,
                name=str(args.get("name") or ""),
                prompt=str(args.get("prompt") or ""),
                interval_minutes=int(args.get("interval_minutes") or 60),
                enabled=args.get("enabled") is not False,
            )
        if name == "signal_recent":
            return {"signals": get_recent_signals(self._hass, _limit(args, 50, 100))}
        if name in {"shell_execute", "python_execute", "hacs_install", "config_file_write"}:
            raise ToolExecutionError(f"{name} is registered as high-risk and disabled by default")
        raise ToolExecutionError(f"Unknown tool: {name}")

    async def _audit(self, name: str, args: dict[str, Any], result: dict[str, Any]) -> None:
        try:
            await async_append_audit(
                self._hass,
                action=f"tool.{name}",
                actor=self._actor,
                payload=args,
                result=result,
            )
        except Exception:  # noqa: BLE001 - audit failure must not break a user command
            return

    def _find_entities(self, args: dict[str, Any]) -> dict[str, Any]:
        query = str(args.get("query") or "").strip().lower()
        domain = str(args.get("domain") or "").strip()
        limit = _limit(args, 20, 50)
        items: list[dict[str, Any]] = []
        for state in self._hass.states.async_all(domain or None):
            friendly = str(state.attributes.get("friendly_name") or "")
            haystack = f"{state.entity_id} {friendly}".lower()
            if query and query not in haystack:
                continue
            items.append(_entity_digest(state))
            if len(items) >= limit:
                break
        return {"entities": items}

    def _get_entity_state(self, args: dict[str, Any]) -> dict[str, Any]:
        entity_id = str(args.get("entity_id") or "").strip()
        state = self._hass.states.get(entity_id)
        if state is None:
            raise ToolExecutionError(f"Entity not found: {entity_id}")
        return _entity_details(state)

    def _get_home_summary(self) -> dict[str, Any]:
        states = self._hass.states.async_all()
        by_domain: dict[str, int] = {}
        active: list[dict[str, Any]] = []
        unavailable: list[dict[str, Any]] = []
        low_battery: list[dict[str, Any]] = []
        for state in states:
            domain = state.entity_id.split(".", 1)[0]
            by_domain[domain] = by_domain.get(domain, 0) + 1
            if state.state in {"on", "open", "opening", "playing", "heat", "cool", "auto"} and len(active) < 30:
                active.append(_entity_digest(state))
            if state.state in {"unavailable", "unknown"} and len(unavailable) < 30:
                unavailable.append(_entity_digest(state))
            battery = state.attributes.get("battery_level")
            if isinstance(battery, (int, float)) and battery <= 20 and len(low_battery) < 30:
                low_battery.append(_entity_digest(state))
        return {
            "total": len(states),
            "by_domain": dict(sorted(by_domain.items())),
            "active_entities": active,
            "unavailable_entities": unavailable,
            "low_battery_entities": low_battery,
        }

    async def _call_ha_service(self, args: dict[str, Any]) -> dict[str, Any]:
        domain = str(args.get("domain") or "").strip()
        service = str(args.get("service") or "").strip()
        service_data = args.get("service_data")
        if not isinstance(service_data, dict):
            raise ToolExecutionError("service_data must be an object")
        _validate_service_call(self._hass, domain, service, service_data)
        await self._hass.services.async_call(domain, service, service_data, blocking=True, context=self._context)
        return {"ok": True, "action": f"{domain}.{service}", "service_data": service_data}


def _parse_arguments(raw: Any) -> dict[str, Any]:
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str) and raw.strip():
        parsed = json.loads(raw)
        if isinstance(parsed, dict):
            return parsed
    return {}


def _limit(args: dict[str, Any], default: int, maximum: int) -> int:
    value = args.get("limit")
    if isinstance(value, int):
        return max(1, min(value, maximum))
    return default


def _entity_digest(state) -> dict[str, Any]:
    return {
        "entity_id": state.entity_id,
        "name": state.attributes.get("friendly_name"),
        "state": state.state,
        "domain": state.entity_id.split(".", 1)[0],
        "unit": state.attributes.get("unit_of_measurement"),
        "device_class": state.attributes.get("device_class"),
    }


def _entity_details(state) -> dict[str, Any]:
    allowed = {
        "friendly_name",
        "device_class",
        "unit_of_measurement",
        "current_temperature",
        "temperature",
        "brightness",
        "current_position",
        "battery_level",
        "supported_features",
        "media_title",
    }
    return {
        **_entity_digest(state),
        "attributes": {key: value for key, value in state.attributes.items() if key in allowed},
        "last_changed": state.last_changed.isoformat() if state.last_changed else None,
        "last_updated": state.last_updated.isoformat() if state.last_updated else None,
    }


def _validate_service_call(hass: HomeAssistant, domain: str, service: str, service_data: dict[str, Any]) -> None:
    if not domain or not service:
        raise ToolExecutionError("domain and service are required")
    if domain in INDIRECT_CONTROL_DOMAINS:
        raise ToolExecutionError(f"{domain}.{service} requires explicit approval and is not a low-risk service")
    if domain in BLOCKED_DOMAINS or service in BLOCKED_SERVICES:
        raise ToolExecutionError(f"{domain}.{service} is blocked")
    allowed = ALLOWED_SERVICES.get(domain)
    if not allowed or service not in allowed:
        raise ToolExecutionError(f"{domain}.{service} is not allowed")
    entity_ids = _entity_ids(service_data)
    if not entity_ids:
        raise ToolExecutionError("service_data.entity_id is required")
    if len(entity_ids) > 5:
        raise ToolExecutionError("one tool call can control at most 5 entities")
    for entity_id in entity_ids:
        if entity_id == "all" or "*" in entity_id:
            raise ToolExecutionError("wildcard or all-entity control is not allowed")
        if not entity_id.startswith(f"{domain}.") and domain != "homeassistant":
            raise ToolExecutionError(f"entity_id does not match domain: {entity_id}")
        state = hass.states.get(entity_id)
        if state is None:
            raise ToolExecutionError(f"Entity not found: {entity_id}")
        if state.state in {"unavailable", "unknown"}:
            raise ToolExecutionError(f"Entity is unavailable: {entity_id}")


def _entity_ids(service_data: dict[str, Any]) -> list[str]:
    value = service_data.get("entity_id")
    if isinstance(value, str):
        return [value]
    if isinstance(value, list) and all(isinstance(item, str) for item in value):
        return value
    return []
