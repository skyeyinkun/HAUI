"""HAUI Agent Kernel package."""
from __future__ import annotations

from homeassistant.core import HomeAssistant

from .runtime import async_setup_runtime
from .views import register_agent_views


async def async_setup_agent(hass: HomeAssistant) -> None:
    """Register agent kernel HTTP views."""
    await async_setup_runtime(hass)
    register_agent_views(hass)
