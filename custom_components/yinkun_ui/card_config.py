from __future__ import annotations

from typing import Any

from homeassistant.components.http import HomeAssistantView
from homeassistant.helpers.storage import Store

DOMAIN = "yinkun_ui"
STORE_VERSION = 1
STORE_KEY = "yinkun_ui_card_config"


def _get_domain_data(hass) -> dict[str, Any]:
    if DOMAIN not in hass.data:
        hass.data[DOMAIN] = {}
    return hass.data[DOMAIN]


async def _ensure_store(hass) -> Store:
    data = _get_domain_data(hass)
    store = data.get("card_config_store")
    if store is None:
        store = Store(hass, STORE_VERSION, STORE_KEY)
        data["card_config_store"] = store
    return store


async def _load_configs(hass) -> dict[str, Any]:
    data = _get_domain_data(hass)
    cached = data.get("card_configs")
    if isinstance(cached, dict):
        return cached
    store = await _ensure_store(hass)
    loaded = await store.async_load()
    configs: dict[str, Any] = loaded if isinstance(loaded, dict) else {}
    data["card_configs"] = configs
    return configs


async def _save_configs(hass, configs: dict[str, Any]) -> None:
    data = _get_domain_data(hass)
    data["card_configs"] = configs
    store = await _ensure_store(hass)
    await store.async_save(configs)


class CardConfigView(HomeAssistantView):
    url = "/api/yinkun_ui/card_config"
    name = "api:yinkun_ui:card_config"
    requires_auth = True

    async def get(self, request):
        hass = request.app["hass"]
        configs = await _load_configs(hass)
        card_id = request.query.get("cardId")
        if card_id:
            return self.json({"cardId": card_id, "config": configs.get(card_id)})
        return self.json({"configs": configs})

    async def post(self, request):
        hass = request.app["hass"]
        payload = await request.json()
        card_id = payload.get("cardId")
        config = payload.get("config")
        if not isinstance(card_id, str) or not card_id:
            return self.json({"error": "cardId required"}, status_code=400)
        if not isinstance(config, dict):
            return self.json({"error": "config must be an object"}, status_code=400)

        configs = await _load_configs(hass)
        configs = {**configs, card_id: config}
        await _save_configs(hass, configs)
        return self.json({"ok": True, "cardId": card_id})

