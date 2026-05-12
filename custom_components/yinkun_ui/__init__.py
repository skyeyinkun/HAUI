"""The HAUI Dashboard integration."""
from pathlib import Path
from typing import Any

from homeassistant.components import frontend
from homeassistant.components.http import HomeAssistantView, StaticPathConfig
from homeassistant.core import HomeAssistant
from homeassistant.helpers.typing import ConfigType

DOMAIN = "yinkun_ui"
PANEL_COMPONENT = "yinkun-ui-panel"
PANEL_URL_PATH = "yinkun-ui"
STATIC_URL = "/yinkun_ui_static"

async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Set up the HAUI Dashboard component."""
    # Register the view to verify integration
    hass.http.register_view(HAUIDashboardView)
    from .card_config import CardConfigView
    hass.http.register_view(CardConfigView)
    from .agent import async_setup_agent
    await async_setup_agent(hass)

    await _async_setup_optional_panel(hass, config.get(DOMAIN, {}))

    return True


async def _async_setup_optional_panel(hass: HomeAssistant, domain_config: dict[str, Any]) -> None:
    """Register an optional HA sidebar panel that embeds a HAUI URL.

    The recommended production path is still the Home Assistant Add-on ingress
    panel. This wrapper is for users who install the custom integration and want
    HAUI to appear as a native HA panel that points to an existing HAUI URL.
    """
    panel_url = domain_config.get("panel_url")
    if not isinstance(panel_url, str) or not panel_url.strip():
        return

    frontend_dir = Path(__file__).parent / "frontend"
    await hass.http.async_register_static_paths([
        StaticPathConfig(STATIC_URL, str(frontend_dir), True),
    ])

    frontend.add_extra_js_url(hass, f"{STATIC_URL}/haui-panel.js")
    frontend.async_register_built_in_panel(
        hass,
        PANEL_COMPONENT,
        sidebar_title=domain_config.get("panel_title", "HAUI"),
        sidebar_icon=domain_config.get("panel_icon", "mdi:view-dashboard"),
        frontend_url_path=domain_config.get("panel_path", PANEL_URL_PATH),
        config={
            "url": panel_url.strip(),
            "host": "ha",
            "mode": domain_config.get("panel_mode", "dashboard"),
        },
        require_admin=bool(domain_config.get("require_admin", False)),
        update=True,
    )

class HAUIDashboardView(HomeAssistantView):
    """View to serve HAUI Dashboard status."""
    url = "/api/yinkun_ui"
    name = "api:yinkun_ui"
    requires_auth = False

    async def get(self, request):
        """Serve status."""
        return self.json({"status": "ok", "version": "5.12.0"})
