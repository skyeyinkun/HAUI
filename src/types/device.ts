export interface Device {
  id: number;
  entity_id?: string;
  name: string;
  icon: string;
  count: string;
  power: string;
  isOn: boolean;
  room: string;
  type: string;
  category?: 'lighting' | 'hvac' | 'sensor' | 'curtain' | 'security' | 'other';
  subType?: string;
  isCommon?: boolean;
  // Dashboard Visibility Configuration
  // 'hidden' - completely hidden from dashboard
  // 'card' - show in specific type card (e.g. Sensor Card, Climate Card)
  // undefined - default behavior (show in both or auto)
  visibility?: 'hidden' | 'visible';

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
