
import { Device } from '@/types/device';
import { HassEntities } from 'home-assistant-js-websocket';
import { categorizeDevice, DiscoveredDevice } from './ha-discovery';
import { HAArea, HADevice, HAEntityRegistryEntry } from './ha-connection';
import {
    inferRoomFromName,
    inferDeviceTypeFromName,
    extractEntityParams,
} from './entity-cleaner';

export function discoverDevicesFromStates(
    entities: HassEntities,
    currentDevices: Device[],
    currentMappings: Record<number, string>,
    registryData?: {
        areas: HAArea[];
        devicesRegistry: HADevice[];
        entitiesRegistry: HAEntityRegistryEntry[];
    }
): { devices: Device[]; mappings: Record<number, string>; newCount: number } {
    const newDevices: Device[] = [...currentDevices];
    const newMappings = { ...currentMappings };
    let newCount = 0;

    // Create a set of existing entity IDs for fast lookup
    const existingEntityIds = new Set(Object.values(currentMappings));
    // Also check if entity_id is directly on device (if we migrated)
    currentDevices.forEach(d => {
        if (d.entity_id) existingEntityIds.add(d.entity_id);
    });

    // Calculate next ID
    let nextId = Math.max(0, ...currentDevices.map(d => d.id)) + 1;
    // Ensure we don't conflict with legacy hardcoded IDs (though max should handle it)
    if (nextId < 1000) nextId = 1000;

    Object.values(entities).forEach(entity => {
        const entityId = entity.entity_id;

        // Skip if already exists
        if (existingEntityIds.has(entityId)) return;

        // Skip certain domains we don't want to auto-import by default
        const domain = entityId.split('.')[0];
        const allowedDomains = ['light', 'switch', 'input_boolean', 'sensor', 'binary_sensor', 'cover', 'climate', 'humidifier', 'media_player', 'fan', 'lock', 'vacuum', 'alarm_control_panel', 'camera', 'person'];
        if (!allowedDomains.includes(domain)) return;

        const friendlyName = entity.attributes.friendly_name || entityId;
        const deviceClass = entity.attributes.device_class;

        // ================================================================
        // 阶段1: 房间推断（Registry → 中文名 → entity_id）
        // ================================================================
        let roomName = '未分配';
        if (registryData) {
            const { areas, devicesRegistry, entitiesRegistry } = registryData;

            // 1. Check Entity Registry first
            const entityEntry = entitiesRegistry.find(e => e.entity_id === entityId);
            if (entityEntry?.area_id) {
                const area = areas.find(a => a.area_id === entityEntry.area_id);
                if (area) roomName = area.name;
            }
            // 2. If no area on entity, check Device Registry
            else if (entityEntry?.device_id) {
                const deviceEntry = devicesRegistry.find(d => d.id === entityEntry.device_id);
                if (deviceEntry?.area_id) {
                    const area = areas.find(a => a.area_id === deviceEntry.area_id);
                    if (area) roomName = area.name;
                }
            }
        }

        // 3. Fallback: 从 friendly_name 智能推断房间
        if (roomName === '未分配') {
            roomName = inferRoomFromName(friendlyName, entityId);
        }

        // ================================================================
        // 阶段2: 设备类型智能推断（中文名 → domain 兜底）
        // ================================================================
        const typeInfo = inferDeviceTypeFromName(
            friendlyName,
            domain,
            deviceClass,
            entity.attributes
        );

        // 同时保留旧逻辑的兼容结果，用于 category
        const discovered: DiscoveredDevice = {
            entity_id: entityId,
            name: friendlyName,
            original_name: friendlyName,
            domain: domain,
            device_class: deviceClass,
            room_name: roomName,
            state: entity.state,
            attributes: entity.attributes
        };

        // category 使用旧的 domain-based 逻辑，如果中文推断出了更精确的 category 则用新的
        const legacyCategory = categorizeDevice(discovered);
        const category = (typeInfo.category as any) || legacyCategory;

        // ================================================================
        // 阶段3: 提取设备参数
        // ================================================================
        const entityParams = extractEntityParams(domain, entity.attributes);

        // ================================================================
        // 阶段4: MDI 图标（优先使用中文推断的图标）
        // ================================================================
        const icon = `mdi:${typeInfo.icon}`;

        // Create Device
        const newDevice: Device = {
            id: nextId,
            entity_id: entityId,
            name: friendlyName,
            icon: icon,
            count: '',
            power: '',
            isOn: entity.state === 'on' || entity.state === 'open' || entity.state === 'home',
            room: roomName,
            type: typeInfo.type,
            category: category,
            isCommon: false,
            visibility: 'visible',
            deviceClass: deviceClass,
            unit_of_measurement: entity.attributes.unit_of_measurement,
            haAvailable: entity.state !== 'unavailable' && entity.state !== 'unknown',
            haState: entity.state,
            lastChanged: entity.last_changed,
            // 空调等设备参数直接带入
            ...(entityParams.temperature !== undefined && { temperature: entityParams.temperature }),
            ...(entityParams.current_temperature !== undefined && { current_temperature: entityParams.current_temperature }),
            ...(entityParams.fan_mode && { fan_mode: entityParams.fan_mode }),
            ...(entityParams.swing_mode && { swing_mode: entityParams.swing_mode }),
            ...(entity.state !== 'off' && domain === 'climate' && { mode: entity.state }),
            ...(entityParams.brightness !== undefined && { brightness: entityParams.brightness }),
            ...(entityParams.position !== undefined && { position: entityParams.position }),
            ...(entityParams.supported_features !== undefined && { supported_features: entityParams.supported_features }),
        };

        // 传感器特殊处理：count 直接显示值+单位
        if (domain === 'sensor') {
            const unit = entity.attributes.unit_of_measurement || '';
            newDevice.count = `${entity.state}${unit}`;
        }

        newDevices.push(newDevice);
        newMappings[nextId] = entityId;
        existingEntityIds.add(entityId);
        nextId++;
        newCount++;
    });

    return { devices: newDevices, mappings: newMappings, newCount };
}
