import { Device } from '@/types/device';
import { HassEntities } from 'home-assistant-js-websocket';

export const syncDevicesWithEntities = (
    currentDevices: Device[],
    entities: HassEntities,
    deviceMappings: Record<number, string>
): Device[] => {
    let hasChanges = false;
    const newDevices = currentDevices.map(device => {
        const entityId = deviceMappings[device.id];
        if (!entityId || !entities[entityId]) return device;

        const entity = entities[entityId];
        const updates: any = {};
        let changed = false;
        const haState = String(entity.state);
        const haAvailable = haState !== 'unavailable' && haState !== 'unknown';
        const deviceClass = entity.attributes?.device_class ? String(entity.attributes.device_class) : undefined;

        // Sync State (On/Off)
        if (device.type === 'light' || device.type === 'switch' || device.icon === 'lamp') {
            const isOn = entity.state === 'on';
            if (device.isOn !== isOn) {
                updates.isOn = isOn;
                changed = true;
            }

            if (device.type === 'light' || device.icon === 'lamp') {
                const rawBrightness = entity.attributes?.brightness;
                const nextBrightness = isOn && typeof rawBrightness === 'number' ? rawBrightness : 0;
                if (device.brightness !== nextBrightness) {
                    updates.brightness = nextBrightness;
                    changed = true;
                }

                const rawColorTemp = entity.attributes?.color_temp;
                if (typeof rawColorTemp === 'number' && device.color_temp !== rawColorTemp) {
                    updates.color_temp = rawColorTemp;
                    changed = true;
                }
            }
        } else if (device.type === 'curtain') {
            const isOpen = entity.state === 'open';
            // For curtain, we might want to check position
            let position = device.position;
            if (entity.attributes.current_position !== undefined) {
                position = entity.attributes.current_position;
            } else if (isOpen) {
                position = 100;
            } else {
                position = 0;
            }

            if (device.isOn !== isOpen || device.position !== position) {
                updates.isOn = isOpen;
                updates.position = position;
                changed = true;
            }
        } else if (['sensor', 'temp_sensor', 'humidity_sensor', 'light_sensor', 'pm25_sensor', 'co2_sensor', 'power_sensor', 'energy_sensor', 'battery_sensor'].includes(device.type)) {
            const unit = entity.attributes.unit_of_measurement ? String(entity.attributes.unit_of_measurement) : '';
            const valueText = `${entity.state}${unit}`;
            const isOnline = haAvailable;
            if (device.count !== valueText) {
                updates.count = valueText;
                changed = true;
            }
            if (device.isOn !== isOnline) {
                updates.isOn = isOnline;
                changed = true;
            }
        } else if (['binary_sensor', 'motion_sensor', 'door_sensor', 'window_sensor', 'smoke_sensor', 'water_leak'].includes(device.type) || device.icon === 'motion' || device.icon === 'door' || device.icon === 'water') {
            const isOn = entity.state === 'on' || entity.state === 'open' || entity.state === 'detected' || entity.state === 'unsafe';
            if (device.isOn !== isOn) {
                updates.isOn = isOn;
                changed = true;
            }
        } else if (['ac', 'climate', 'heater', 'fan'].includes(device.type)) {
            const isOn = entity.state !== 'off';
            let temp = device.temperature;
            let current_temp = device.current_temperature;
            let mode = device.mode;
            let fan_mode = device.fan_mode;
            let swing_mode = device.swing_mode;

            if (entity.attributes.temperature !== undefined) {
                temp = entity.attributes.temperature;
            }
            if (entity.attributes.current_temperature !== undefined) {
                current_temp = entity.attributes.current_temperature;
            }
            if (entity.state !== 'off') {
                mode = entity.state; // cool, heat, fan_only
            }
            if (entity.attributes.fan_mode !== undefined) {
                fan_mode = entity.attributes.fan_mode;
            }
            if (entity.attributes.swing_mode !== undefined) {
                swing_mode = entity.attributes.swing_mode;
            }

            if (device.isOn !== isOn) {
                updates.isOn = isOn;
                changed = true;
            }
            if (temp !== device.temperature) {
                updates.temperature = temp;
                changed = true;
            }
            if (current_temp !== device.current_temperature) {
                updates.current_temperature = current_temp;
                changed = true;
            }
            if (mode !== device.mode) {
                updates.mode = mode;
                changed = true;
            }
            if (fan_mode !== device.fan_mode) {
                updates.fan_mode = fan_mode;
                changed = true;
            }
            if (swing_mode !== device.swing_mode) {
                updates.swing_mode = swing_mode;
                changed = true;
            }

            // 同步空调可用模式列表（仅首次或变化时）
            const hvac_modes = entity.attributes.hvac_modes;
            if (Array.isArray(hvac_modes) && JSON.stringify(hvac_modes) !== JSON.stringify(device.hvac_modes)) {
                updates.hvac_modes = hvac_modes;
                changed = true;
            }
            const fan_modes = entity.attributes.fan_modes;
            if (Array.isArray(fan_modes) && JSON.stringify(fan_modes) !== JSON.stringify(device.fan_modes)) {
                updates.fan_modes = fan_modes;
                changed = true;
            }
            const swing_modes = entity.attributes.swing_modes;
            if (Array.isArray(swing_modes) && JSON.stringify(swing_modes) !== JSON.stringify(device.swing_modes)) {
                updates.swing_modes = swing_modes;
                changed = true;
            }
            const min_temp = entity.attributes.min_temp;
            if (typeof min_temp === 'number' && min_temp !== device.min_temp) {
                updates.min_temp = min_temp;
                changed = true;
            }
            const max_temp = entity.attributes.max_temp;
            if (typeof max_temp === 'number' && max_temp !== device.max_temp) {
                updates.max_temp = max_temp;
                changed = true;
            }
        }

        if (device.haState !== haState) {
            updates.haState = haState;
            changed = true;
        }
        if (device.haAvailable !== haAvailable) {
            updates.haAvailable = haAvailable;
            changed = true;
        }
        if (device.deviceClass !== deviceClass) {
            updates.deviceClass = deviceClass;
            changed = true;
        }
        if (entity.last_updated && device.lastUpdated !== entity.last_updated) {
            updates.lastUpdated = entity.last_updated;
            changed = true;
        }

        if (changed) {
            hasChanges = true;
            // Update lastChanged if entity has it
            if (entity.last_changed) {
                updates.lastChanged = entity.last_changed;
            }
            return { ...device, ...updates };
        }
        // Even if state didn't change in our simplified view, last_changed might have updated (e.g. attributes)
        // or we just want to ensure we have the latest timestamp from entity
        if (entity.last_changed && device.lastChanged !== entity.last_changed) {
            hasChanges = true;
            return { ...device, lastChanged: entity.last_changed };
        }
        return device;
    });

    return hasChanges ? newDevices : currentDevices;
};
