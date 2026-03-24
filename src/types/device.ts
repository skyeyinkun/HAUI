/**
 * 设备类型定义
 * 优化说明：
 * - 添加了更具体的设备类型字面量联合类型
 * - 移除了部分可选字段的 undefined 类型
 * - 添加了传感器相关的类型定义
 */

/** 设备类型 */
export type DeviceType = 
  | 'light' 
  | 'dimmer' 
  | 'switch' 
  | 'outlet' 
  | 'fan' 
  | 'heater'
  | 'ac' 
  | 'climate' 
  | 'curtain' 
  | 'cover'
  | 'remote'
  | 'sensor' 
  | 'binary_sensor'
  | 'temp_sensor' 
  | 'humidity_sensor'
  | 'light_sensor' 
  | 'pm25_sensor' 
  | 'co2_sensor' 
  | 'power_sensor' 
  | 'energy_sensor' 
  | 'battery_sensor'
  | 'motion_sensor' 
  | 'door_sensor' 
  | 'window_sensor'
  | 'smoke_sensor' 
  | 'water_leak'
  | 'other';

/** 设备分类 */
export type DeviceCategory = 'lighting' | 'hvac' | 'sensor' | 'curtain' | 'security' | 'other';

/** 设备可见性 */
export type DeviceVisibility = 'hidden' | 'visible' | 'card';

/** 传感器设备类型（用于类型检查）*/
export const SENSOR_TYPES: DeviceType[] = [
  'sensor', 'binary_sensor', 'temp_sensor', 'humidity_sensor',
  'light_sensor', 'pm25_sensor', 'co2_sensor', 'power_sensor',
  'energy_sensor', 'battery_sensor', 'motion_sensor', 'door_sensor',
  'window_sensor', 'smoke_sensor', 'water_leak'
];

/** HVAC 设备类型 */
export const HVAC_TYPES: DeviceType[] = ['ac', 'climate', 'heater', 'fan'];

/** 灯光设备类型 */
export const LIGHT_TYPES: DeviceType[] = ['light', 'dimmer'];

/** 检查是否为传感器类型 */
export function isSensorType(type: string): boolean {
  return SENSOR_TYPES.includes(type as DeviceType);
}

/** 检查是否为 HVAC 类型 */
export function isHvacType(type: string): boolean {
  return HVAC_TYPES.includes(type as DeviceType);
}

/** 检查是否为灯光类型 */
export function isLightType(type: string): boolean {
  return LIGHT_TYPES.includes(type as DeviceType);
}

export interface Device {
  id: number;
  entity_id?: string;
  name: string;
  icon: string;
  count: string;
  power: string;
  isOn: boolean;
  room: string;
  type: DeviceType;
  category?: DeviceCategory;
  subType?: string;
  isCommon?: boolean;
  // Dashboard Visibility Configuration
  // 'hidden' - completely hidden from dashboard
  // 'card' - show in specific type card (e.g. Sensor Card, Climate Card)
  // undefined - default behavior (show in both or auto)
  visibility?: DeviceVisibility;

  // Custom Display Settings
  customName?: string; // Override default name for display
  customIcon?: string; // Override default icon for display

  position?: number;
  lastChanged?: string;
  temperature?: number;
  current_temperature?: number;
  mode?: string;
  fan_mode?: string;
  swing_mode?: string;
  hvac_modes?: string[];     // 空调可用模式列表 e.g. ['cool','heat','fan_only','dry','auto']
  fan_modes?: string[];      // 风速可选列表 e.g. ['auto','low','medium','high']
  swing_modes?: string[];    // 扫风可选列表 e.g. ['off','vertical','horizontal','both']
  min_temp?: number;         // 最低可设温度
  max_temp?: number;         // 最高可设温度
  brightness?: number;
  color_temp?: number; // Mireds or Kelvin, usually Mireds in HA attributes but we might convert
  supported_features?: number;
  deviceClass?: string;
  haAvailable?: boolean;
  haState?: string | number;
  lastUpdated?: string;
  unit_of_measurement?: string;
  state?: string | number;
}
