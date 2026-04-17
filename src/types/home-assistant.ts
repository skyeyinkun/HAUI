import { CameraConfig } from '@/components/camera/types';

/**
 * Home Assistant 配置类型
 * 优化说明：
 * - 添加了更完整的类型定义
 * - 区分可选和必填字段
 */

/** HA 连接类型 */
export type HAConnectionType = 'Local' | 'Public' | null;

/** HA 服务调用参数 */
export interface HAServiceCallData {
  entity_id: string;
  [key: string]: unknown;
}

/** HA 服务调用函数类型 */
export type HACallServiceFn = (
  domain: string, 
  service: string, 
  data?: HAServiceCallData
) => Promise<unknown>;

export interface HAConfig {
  localUrl: string;
  publicUrl: string;
  token: string;
  deviceMappings: Record<number, string>;
  personMappings: Record<string, string>;
  sceneMappings: Record<string, string>;
  cameras?: CameraConfig[];
  /** 温度单位：'celsius' 摄氏度 或 'fahrenheit' 华氏度 */
  tempUnit?: 'celsius' | 'fahrenheit';
}

/** HA 连接状态 */
export interface HAConnectionState {
  isConnected: boolean;
  connectionType: HAConnectionType;
  latency: number | null;
  error: string | null;
}

/** HA 实体状态变化事件 */
export interface HAStateChangedEvent {
  entity_id: string;
  old_state: HAEntityState | null;
  new_state: HAEntityState | null;
}

/** HA 实体状态 */
export interface HAEntityState {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed: string;
  last_updated: string;
}
