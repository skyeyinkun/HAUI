/**
 * 空调控制组件共享配置与图标
 * 统一 ClimateControl（小组件）与 ClimateControlModal（二级界面）的图标风格
 */
import React from 'react';
import { 
  Wind, Snowflake, Sun, Droplet, Zap, ThermometerSun, 
  VolumeX, Fan, Gauge
} from 'lucide-react';

// ==================== HVAC 模式配置 ====================
/** HVAC 模式完整配置：制冷、制热、自动、除湿、送风、冷暖 */
export const HVAC_MODE_CONFIG: Record<string, { 
  icon: React.ComponentType<any>; 
  label: string; 
  color: string;
  bgColor?: string;
}> = {
  cool: { icon: Snowflake, label: '制冷', color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  heat: { icon: Sun, label: '制热', color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
  auto: { icon: ThermometerSun, label: '自动', color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
  dry: { icon: Droplet, label: '除湿', color: 'text-cyan-500', bgColor: 'bg-cyan-500/10' },
  fan_only: { icon: Wind, label: '送风', color: 'text-green-500', bgColor: 'bg-green-500/10' },
  heat_cool: { icon: Zap, label: '冷暖', color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
};

// ==================== 风速模式配置 ====================
/** 风速完整配置：自动、低、中、高、全速、静音、柔风 */
export const FAN_MODE_CONFIG: Record<string, { label: string; level: number }> = {
  auto: { label: '自动', level: 0 },
  low: { label: '低', level: 1 },
  medium: { label: '中', level: 2 },
  high: { label: '高', level: 3 },
  turbo: { label: '全速', level: 4 },
  silent: { label: '静音', level: 0 },
  diffuse: { label: '柔风', level: 1 },
};

// ==================== 风速阶梯图标组件 ====================
interface FanLevelIconProps {
  /** 风速级别：0=自动(3条等高), 1=低, 2=中, 3=高, 4=全速 */
  level: number;
  /** 自定义类名 */
  className?: string;
  /** 图标尺寸 */
  size?: number;
}

/**
 * 风速阶梯图标组件
 * 使用竖线数量和高度直观表示风速级别
 * - level 0 (自动): 3条等高竖线
 * - level 1 (低): 1条低竖线
 * - level 2 (中): 2条中高竖线
 * - level 3 (高): 3条高竖线
 * - level 4 (全速): 3条高竖线 + 闪电标记
 */
export function FanLevelIcon({ level, className = '', size = 13 }: FanLevelIconProps) {
  // 根据级别计算每条竖线的高度
  const bars = [
    { h: level === 0 ? 8 : 4, active: level === 0 || level >= 1 },
    { h: level === 0 ? 8 : 7, active: level === 0 || level >= 2 },
    { h: level === 0 ? 8 : 10, active: level === 0 || level >= 3 },
  ];

  return (
    <svg width={size} height={size} viewBox="0 0 13 13" fill="none" className={className}>
      {bars.map((bar, i) => (
        <rect
          key={i}
          x={i * 4 + 0.5}
          y={13 - bar.h}
          width="2.5"
          height={bar.h}
          rx="1.25"
          fill="currentColor"
          opacity={bar.active ? 1 : 0.2}
        />
      ))}
      {/* 全速额外顶部闪电标记 */}
      {level === 4 && (
        <path 
          d="M9.5 1.5 L7.5 5.5 L9.5 5.5 L7.5 9.5" 
          stroke="currentColor" 
          strokeWidth="1" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          opacity="0.9" 
        />
      )}
    </svg>
  );
}

// ==================== 风速图标渲染函数 ====================
interface FanIconProps {
  fanId: string;
  isActive: boolean;
  size?: number;
  className?: string;
}

/**
 * 根据风速 ID 渲染对应的图标
 * - auto: 使用 ThermometerSun（自动调节图标）
 * - silent: 使用 VolumeX（静音图标）
 * - 其他: 使用 FanLevelIcon（阶梯竖线）
 */
export function FanModeIcon({ fanId, isActive, size = 13, className = '' }: FanIconProps) {
  const isAuto = fanId === 'auto';
  const isSilent = fanId === 'silent';
  const config = FAN_MODE_CONFIG[fanId];
  const level = config?.level ?? 0;

  if (isAuto) {
    return <ThermometerSun size={size} strokeWidth={2.5} className={className} />;
  }
  
  if (isSilent) {
    return <VolumeX size={size} strokeWidth={2.5} className={className} />;
  }
  
  return <FanLevelIcon level={level} size={size} className={className} />;
}

// ==================== 扫风模式配置 ====================
/** 扫风中文映射 */
export const SWING_MODE_LABELS: Record<string, string> = {
  off: '关',
  vertical: '上下',
  horizontal: '左右',
  both: '全向',
  on: '开',
};

// ==================== 默认值配置 ====================
export const DEFAULT_HVAC_MODES = ['cool', 'heat', 'auto', 'dry', 'fan_only'];
export const DEFAULT_FAN_MODES = ['auto', 'low', 'medium', 'high', 'turbo'];
