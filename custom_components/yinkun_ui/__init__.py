"""The HAUI Dashboard integration."""
from homeassistant.components.http import HomeAssistantView
from homeassistant.core import HomeAssistant
from homeassistant.helpers.typing import ConfigType

DOMAIN = "yinkun_ui"

async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Set up the HAUI Dashboard component."""
    # Register the view to verify integration
    hass.http.register_view(HAUIDashboardView)
    from .card_config import CardConfigView
    hass.http.register_view(CardConfigView)
    
    # In a real scenario, this would register a panel
    # pointing to the Ingress URL or static files.
    # For Dev, we mostly just want to ensure the component loads.
    
    return True

class HAUIDashboardView(HomeAssistantView):
    """View to serve HAUI Dashboard status."""
    url = "/api/yinkun_ui"
    name = "api:yinkun_ui"
    requires_auth = False

    async def get(self, request):
        """Serve status."""
        return self.json({"status": "ok", "version": "1.0.0"})
