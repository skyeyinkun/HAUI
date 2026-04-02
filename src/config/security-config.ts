/**
 * 安全确认配置
 * 定义公网访问时的高危操作和需要二次确认的场景
 */

/**
 * 高危操作关键词配置
 */
export const HIGH_RISK_KEYWORDS = [
  'lock',      // 门锁
  'door',      // 门
  'security',  // 安防
  'alarm',     // 报警器
  'gate',      // 大门/门禁
] as const;

/**
 * 高危设备类型配置
 */
export const HIGH_RISK_TYPES = [
  'lock',   // 门锁
  'cover',  // 窗帘/卷帘
  'garage', // 车库门
] as const;

/**
 * 安全确认配置接口
 */
export interface SecurityConfirmConfig {
  /** 是否启用公网安全确认 */
  enabled: boolean;
  /** 高危关键词列表 */
  highRiskKeywords: readonly string[];
  /** 高危设备类型列表 */
  highRiskTypes: readonly string[];
  /** 确认对话框标题 */
  title: string;
  /** 确认对话框描述模板 */
  descriptionTemplate: string;
  /** 严重程度 */
  severity: 'high' | 'medium' | 'low';
}

/**
 * 默认安全确认配置
 */
export const DEFAULT_SECURITY_CONFIG: SecurityConfirmConfig = {
  enabled: true,
  highRiskKeywords: HIGH_RISK_KEYWORDS,
  highRiskTypes: HIGH_RISK_TYPES,
  title: '安全确认',
  descriptionTemplate: '您正在公网环境下尝试{action}「{deviceName}」，此操作涉及安全敏感功能，请输入 PIN 码确认',
  severity: 'high',
};

/**
 * 创建设备特定的安全确认配置
 */
export function createSecurityConfirmConfig(
  deviceName: string,
  action: string,
  config: Partial<SecurityConfirmConfig> = {}
): { title: string; description: string; severity: 'high' | 'medium' | 'low' } {
  const mergedConfig = { ...DEFAULT_SECURITY_CONFIG, ...config };
  const description = mergedConfig.descriptionTemplate
    .replace('{action}', action)
    .replace('{deviceName}', deviceName);
  
  return {
    title: mergedConfig.title,
    description,
    severity: mergedConfig.severity,
  };
}

/**
 * 检查设备是否需要安全确认
 */
export function requiresSecurityConfirm(
  device: { name?: string; type?: string; icon?: string },
  isPublicConnection: boolean,
  config: SecurityConfirmConfig = DEFAULT_SECURITY_CONFIG
): boolean {
  // 仅在公网访问且启用安全确认时才需要
  if (!isPublicConnection || !config.enabled) return false;
  
  const deviceName = (device.name || '').toLowerCase();
  const deviceType = (device.type || '').toLowerCase();
  const deviceIcon = (device.icon || '').toLowerCase();
  
  // 检查设备名称、类型或图标是否包含高危关键词
  const isHighRisk = config.highRiskKeywords.some(keyword => 
    deviceName.includes(keyword) || 
    deviceType.includes(keyword) || 
    deviceIcon.includes(keyword)
  );
  
  // 特定设备类型也属于高危
  const isHighRiskType = config.highRiskTypes.includes(deviceType as typeof HIGH_RISK_TYPES[number]);
  
  return isHighRisk || isHighRiskType;
}
