import { HassEntities } from 'home-assistant-js-websocket';
import { HAArea, HADevice, HAEntityRegistryEntry } from './ha-connection';

export interface DiscoveredDevice {
  entity_id: string;
  name: string;
  original_name: string;
  domain: string;
  device_class?: string;
  area_id?: string;
  room_name: string;
  state: string;
  manufacturer?: string;
  model?: string;
  attributes?: Record<string, unknown>;
}

export function processDiscoveryData(
  hassEntities: HassEntities,
  areas: HAArea[],
  haDevices: HADevice[],
  entityRegistry: HAEntityRegistryEntry[]
): DiscoveredDevice[] {
  const discovered: DiscoveredDevice[] = [];

  // Create lookup maps for performance
  const areaMap = new Map(areas.map(a => [a.area_id, a.name]));
  const deviceMap = new Map(haDevices.map(d => [d.id, d]));
  const entityRegistryMap = new Map(entityRegistry.map(e => [e.entity_id, e]));

  Object.values(hassEntities).forEach(entityState => {
    const entityId = entityState.entity_id;
    const domain = entityId.split('.')[0];
    const registryEntry = entityRegistryMap.get(entityId);

    // Skip disabled or hidden entities if registry info exists
    if (registryEntry?.disabled_by || registryEntry?.hidden_by) {
      return;
    }

    let areaId = registryEntry?.area_id ?? undefined;
    let deviceEntry: HADevice | undefined;

    // If no area on entity, check device
    if (!areaId && registryEntry?.device_id) {
      deviceEntry = deviceMap.get(registryEntry.device_id);
      if (deviceEntry) {
        areaId = deviceEntry.area_id ?? undefined;
      }
    }

    const roomName = areaId ? (areaMap.get(areaId) || '未分配') : '未分配';

    // Determine name: Registry Name > User Friendly Name > Original Name > Entity ID
    const name = registryEntry?.name || entityState.attributes.friendly_name || registryEntry?.original_name || entityId;

    discovered.push({
      entity_id: entityId,
      name: name,
      original_name: entityState.attributes.friendly_name || entityId,
      domain: domain,
      device_class: entityState.attributes.device_class,
      area_id: areaId,
      room_name: roomName,
      state: entityState.state,
      manufacturer: deviceEntry?.manufacturer,
      model: deviceEntry?.model,
      attributes: entityState.attributes
    });
  });

  return discovered;
}

import { DeviceCategory } from '@/types/device';

// 使用统一的 DeviceCategory 类型（来自 @/types/device）
export type DeviceCategoryType = DeviceCategory;

export const CATEGORIES: { id: DeviceCategoryType; name: string; description: string }[] = [
  { id: 'lighting', name: '照明', description: '灯光、灯带' },
  { id: 'hvac', name: '空调', description: '空调、地暖、新风、风扇' },
  { id: 'curtain', name: '窗帘', description: '窗帘、卷帘、车库门' },
  { id: 'sensor', name: '传感器', description: '温湿度、光照、存在感应' },
  { id: 'security', name: '安防', description: '门锁、报警器' },
  { id: 'other', name: '其他', description: '媒体、开关、人员、场景等' }
];

export function categorizeDevice(device: DiscoveredDevice): DeviceCategoryType {
  const { domain, device_class } = device;

  // Person check - 归类为 other
  if (domain === 'person') return 'other';

  // Scene check - 归类为 other
  if (domain === 'scene') return 'other';

  // Security check first (as it overlaps with binary_sensor/sensor)
  const securityClasses = ['door', 'garage_door', 'lock', 'opening', 'safety', 'smoke', 'window', 'tamper'];
  if (
    domain === 'lock' ||
    domain === 'alarm_control_panel' ||
    (domain === 'binary_sensor' && device_class && securityClasses.includes(device_class))
  ) {
    return 'security';
  }

  // Lighting
  if (domain === 'light') return 'lighting';

  // Switch - 归类为 other
  if (domain === 'switch' || domain === 'input_boolean') {
    return 'other';
  }

  // HVAC
  if (['climate', 'fan', 'humidifier', 'air_quality'].includes(domain)) return 'hvac';

  // Curtain
  if (domain === 'cover') return 'curtain';

  // Sensor
  if (domain === 'sensor' || domain === 'binary_sensor') {
    if (device_class === 'motion' || device_class === 'occupancy' || device_class === 'presence') return 'sensor';
    return 'sensor';
  }

  return 'other';
}

/**
 * Automatically infers the specific device type based on domain and attributes.
 * Used for auto-classification when adding devices.
 */
export function inferDeviceType(device: DiscoveredDevice): string {
  const { domain, attributes } = device;

  // Unified AC type
  if (domain === 'climate') return 'ac';
  if (domain === 'cover') return 'curtain';
  if (domain === 'media_player') return 'media';
  if (domain === 'remote') return 'remote';

  // Switch domain is always a switch type
  if (domain === 'switch' || domain === 'input_boolean') {
    if (device.device_class === 'outlet') return 'outlet';
    return 'switch';
  }

  // Light domain: Check for brightness support to distinguish "Dimmer" vs "Switch"
  if (domain === 'light') {
    // SUPPORT_BRIGHTNESS = 1
    const supportedFeatures = (attributes?.supported_features as number) || 0;
    // Check if bit 0 is set
    if ((supportedFeatures & 1) !== 0) {
      return 'dimmer'; // Dimmable light
    }
    return 'light'; // Standard light
  }

  if (domain === 'sensor') return 'sensor';
  if (domain === 'binary_sensor') return 'binary_sensor';

  // Default fallbacks
  return 'other';
}
