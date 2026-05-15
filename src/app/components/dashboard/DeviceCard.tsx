import React from 'react';
import { X } from 'lucide-react';
import { motion } from 'motion/react';
import { Device } from '@/types/device';
import { SensorTimestamp } from '@/app/components/dashboard/SensorTimestamp';
import RemoteCard from '../remote/RemoteCard';
import { LightControl } from './cards/LightControl';
import { CurtainControl } from './cards/CurtainControl';
import { ClimateControl } from './cards/ClimateControl';
import { DeviceIcon, StatusDot, SquareToggle } from './cards/shared';

interface DeviceCardProps {
  device: Device;
  onToggle: (e: React.MouseEvent) => void;
  onClick: () => void;
  nowMs?: number;
  isEditing?: boolean;
  isCommon?: boolean;
  onToggleCommon?: (e: React.MouseEvent) => void;
  onPositionChange?: (id: number, val: number | number[]) => void;
  onUpdate?: (id: number, updates: any) => void;
  onSendIR?: (id: number, code: string) => void;
}

// Main Component
function DeviceCardInternal({ device, onToggle, onClick, nowMs: nowMsProp, isEditing, isCommon, onToggleCommon, onPositionChange, onUpdate, onSendIR }: DeviceCardProps) {
  const nowMs = nowMsProp ?? Date.now();

  const isLight = device.type === 'light' || device.type === 'dimmer' || device.icon === 'lamp';
  const isAC = device.type === 'ac' || device.type === 'climate' || device.type === 'heater' || device.type === 'fan';
  const isCurtain = device.type === 'curtain';
  const isRemote = device.type === 'remote';

  const sensorTypes = ['sensor', 'binary_sensor', 'temp_sensor', 'humidity_sensor', 'light_sensor', 'pm25_sensor', 'co2_sensor', 'power_sensor', 'energy_sensor', 'battery_sensor', 'motion_sensor', 'door_sensor', 'window_sensor', 'smoke_sensor', 'water_leak'];
  const isSensor = sensorTypes.includes(device.type) || Boolean(device.deviceClass) || ['motion', 'water', 'door', 'smoke'].includes(device.icon);
  const isOffline = device.haAvailable === false;
  const isSensorActive = isSensor && device.isOn && !isOffline;

  const haState = device.haState ? String(device.haState) : undefined;
  const isTriggered = haState
    ? haState === 'on' || haState === 'open' || haState === 'detected' || haState === 'unsafe'
    : device.isOn;

  const getSensorStateText = () => {
    if (device.deviceClass === 'occupancy' || device.deviceClass === 'presence') return isTriggered ? '有人' : '无人';
    if (device.deviceClass === 'motion') return isTriggered ? '有人移动' : '无人移动';
    if (device.deviceClass === 'moisture') return isTriggered ? '漏水' : '正常';
    if (device.deviceClass === 'door' || device.deviceClass === 'opening' || device.deviceClass === 'window') return isTriggered ? '门开' : '门关';
    if (device.deviceClass === 'smoke' || device.deviceClass === 'gas') return isTriggered ? '报警' : '正常';
    if (device.icon === 'motion') return isTriggered ? '有人移动' : '无人移动';
    if (device.icon === 'door') return isTriggered ? '门开' : '门关';
    if (device.icon === 'water') return isTriggered ? '漏水' : '正常';
    if (device.icon === 'smoke') return isTriggered ? '报警' : '正常';
    if (device.type === 'sensor') return device.count?.trim() ? device.count : '--';
    if (device.type === 'binary_sensor') return isTriggered ? '触发' : '正常';
    return device.isOn ? '开启' : '关闭';
  };

  if (isRemote) {
    return (
      <RemoteCard
        device={device}
        onClick={onClick}
        sendIR={(code) => {
          onSendIR?.(device.id, code);
        }}
        isEditing={isEditing}
        isCommon={isCommon}
        onToggleCommon={onToggleCommon}
      />
    );
  }

  if (isLight) {
    return (
      <LightControl
        device={device}
        onToggle={onToggle}
        onClick={onClick}
        isEditing={isEditing}
        isCommon={isCommon}
        onToggleCommon={onToggleCommon}
        onUpdate={onUpdate}
        nowMs={nowMs}
      />
    );
  }

  if (isCurtain) {
    return (
      <CurtainControl
        device={device}
        onToggle={onToggle}
        onClick={onClick}
        isEditing={isEditing}
        isCommon={isCommon}
        onToggleCommon={onToggleCommon}
        onPositionChange={onPositionChange}
        nowMs={nowMs}
      />
    );
  }

  if (isAC) {
    return (
      <ClimateControl
        device={device}
        onToggle={onToggle}
        onClick={onClick}
        isEditing={isEditing}
        isCommon={isCommon}
        onToggleCommon={onToggleCommon}
        onUpdate={onUpdate}
        nowMs={nowMs}
      />
    );
  }

  if (isSensor) {
    // 键盘事件处理
    const handleSensorKeyDown = (e: React.KeyboardEvent) => {
      if (isEditing) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick?.();
      }
    };

    return (
      <div
        role="button"
        tabIndex={isEditing ? -1 : 0}
        aria-label={`${device.name}，${getSensorStateText()}`}
        className={`haui-soft-card relative aspect-square rounded-[24px] p-3 pb-10 flex flex-col gap-1.5 overflow-hidden transition-all duration-200 ${isEditing ? 'cursor-default ring-2 ring-primary/20 scale-[0.98] animate-wiggle' : 'hover:-translate-y-0.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none'
          }`}
        onClick={!isEditing ? onClick : undefined}
        onKeyDown={handleSensorKeyDown}
      >
        {isEditing && (
          <div
            className="absolute -right-2 -top-2 z-50 p-4 cursor-pointer"
            onClick={onToggleCommon}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center shadow-md transition-colors ${isCommon ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
                }`}
            >
              {isCommon ? <X className="w-4 h-4" /> : <div className="w-4 h-4 flex items-center justify-center font-bold text-lg leading-none pb-0.5">+</div>}
            </div>
          </div>
        )}

        <motion.div
          className="absolute left-[-27px] top-[-27px] w-[117px] h-[117px] pointer-events-none opacity-50"
          animate={isSensorActive ? { rotate: 360 } : {}}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        >
          <svg className="block w-full h-full" fill="none" viewBox="0 0 117 117">
            <circle
              cx="58.5"
              cy="58.5"
              r="58.25"
              stroke="url(#paint0_dark)"
              strokeOpacity={isSensorActive ? 0.3 : 0.1}
              strokeWidth="0.5"
            />
            <circle
              cx="58.875"
              cy="58.875"
              r="43.625"
              stroke="url(#paint1_dark)"
              strokeOpacity={isSensorActive ? 0.3 : 0.1}
              strokeWidth="0.5"
            />
            <defs>
              <linearGradient id="paint0_dark" x1="58.5" y1="0" x2="58.5" y2="117">
                <stop stopColor="currentColor" />
                <stop offset="1" stopColor="transparent" />
              </linearGradient>
              <linearGradient id="paint1_dark" x1="58.875" y1="15" x2="58.875" y2="102.75">
                <stop stopColor="currentColor" />
                <stop offset="1" stopColor="transparent" />
              </linearGradient>
            </defs>
          </svg>
        </motion.div>

        {/* 传感器卡片头部：图标 + 状态指示点 */}
        <div className="flex items-center justify-between relative z-10">
          <DeviceIcon icon={device.icon} isOn={device.isOn && !isOffline} type={device.type} />
          {/* 状态指示点：触发/开启状态显示绿色，否则显示灰色 */}
          <div className={`w-2.5 h-2.5 rounded-full ${isTriggered && !isOffline ? 'bg-success' : 'bg-black/10 dark:bg-white/10'}`} />
        </div>

        <div className="flex flex-col gap-1 relative z-10 mt-1">
          <h3 className="font-['SF_Pro_Display',sans-serif] text-[14px] tracking-[-0.408px] font-semibold truncate text-foreground">
            {device.name}
          </h3>
        </div>

        <div className="flex-1 flex flex-col justify-center relative z-10">
          <div
            className={`text-[28px] font-bold tracking-tight leading-none ${isTriggered && !isOffline ? 'text-foreground' : 'text-muted-foreground'
              }`}
          >
            {getSensorStateText()}
          </div>
          <SensorTimestamp lastChanged={device.lastChanged} available={device.haAvailable} nowMs={nowMs} variant="compact" className="mt-1" />
        </div>

        <SensorTimestamp
          lastChanged={device.lastChanged}
          available={device.haAvailable}
          nowMs={nowMs}
          variant="full"
          className="absolute left-3 right-3 bottom-2"
        />
      </div>
    );
  }

  // 默认卡片键盘事件处理
  const handleDefaultKeyDown = (e: React.KeyboardEvent) => {
    if (isEditing) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.();
    }
  };

  return (
    <div
      role="button"
      tabIndex={isEditing ? -1 : 0}
      aria-label={`${device.name}，${device.isOn ? '已开启' : '已关闭'}`}
      className={`haui-soft-card relative aspect-square rounded-[24px] p-3 flex flex-col gap-1.5 overflow-hidden transition-all duration-200 ${isEditing ? 'cursor-default ring-2 ring-primary/20 scale-[0.98] animate-wiggle' : 'hover:-translate-y-0.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none'
        }`}
      onClick={!isEditing ? onClick : undefined}
      onKeyDown={handleDefaultKeyDown}
    >
      {isEditing && (
        <div className="absolute -right-2 -top-2 z-50 p-4 cursor-pointer" onClick={onToggleCommon}>
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center shadow-md transition-colors ${isCommon ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
              }`}
          >
            {isCommon ? <X className="w-4 h-4" /> : <div className="w-4 h-4 flex items-center justify-center font-bold text-lg leading-none pb-0.5">+</div>}
          </div>
        </div>
      )}

      <div className="absolute left-[-27px] top-[-27px] w-[117px] h-[117px] pointer-events-none opacity-50">
        <svg className="block w-full h-full" fill="none" viewBox="0 0 117 117">
          <circle cx="58.5" cy="58.5" r="58.25" stroke="url(#paint0_dark)" strokeOpacity="0.1" strokeWidth="0.5" />
          <circle cx="58.875" cy="58.875" r="43.625" stroke="url(#paint1_dark)" strokeOpacity="0.1" strokeWidth="0.5" />
          <defs>
            <linearGradient id="paint0_dark" x1="58.5" y1="0" x2="58.5" y2="117">
              <stop stopColor="currentColor" />
              <stop offset="1" stopColor="transparent" />
            </linearGradient>
            <linearGradient id="paint1_dark" x1="58.875" y1="15" x2="58.875" y2="102.75">
              <stop stopColor="currentColor" />
              <stop offset="1" stopColor="transparent" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* 头部区域：图标、名称、状态点 */}
      <div className="flex items-center justify-between relative z-10">
        <DeviceIcon icon={device.icon} isOn={device.isOn} type={device.type} />
        <StatusDot isOn={device.isOn} />
      </div>

      {/* 设备名称 */}
      <div className="flex flex-col gap-1 relative z-10 mt-1">
        <h3 className="font-['SF_Pro_Display',sans-serif] text-[14px] tracking-[-0.408px] font-semibold truncate text-foreground">
          {device.name}
        </h3>
      </div>

      {/* 中间区域：居中显示更新时间 */}
      <div className="flex-1 flex items-center justify-center relative z-10">
        <SensorTimestamp
          lastChanged={device.lastChanged}
          available={device.haAvailable}
          nowMs={nowMs}
          variant="compact"
          className="text-[10px]"
        />
      </div>

      {/* 底部区域：开关控制 */}
      <div className="flex items-center justify-end relative z-10">
        <button onClick={onToggle} className={isEditing ? 'pointer-events-none opacity-50' : ''}>
          <SquareToggle isOn={device.isOn} />
        </button>
      </div>
    </div>
  );
}

export const DeviceCard = React.memo(DeviceCardInternal, (prevProps, nextProps) => {
  // 性能优化：使用精确的属性比较来避免不必要的重新渲染
  // 返回 false = 需要渲染，返回 true = 跳过渲染

  // 1. 关键属性变化必须重新渲染
  if (
    prevProps.device?.id !== nextProps.device?.id ||
    prevProps.device?.isOn !== nextProps.device?.isOn ||
    prevProps.device?.brightness !== nextProps.device?.brightness ||
    prevProps.device?.temperature !== nextProps.device?.temperature ||
    prevProps.device?.position !== nextProps.device?.position ||
    prevProps.device?.count !== nextProps.device?.count ||
    prevProps.device?.haAvailable !== nextProps.device?.haAvailable ||
    prevProps.device?.lastChanged !== nextProps.device?.lastChanged ||
    prevProps.isEditing !== nextProps.isEditing ||
    prevProps.isCommon !== nextProps.isCommon
  ) {
    return false; // 属性变化，需要渲染
  }

  // 2. 统一时间戳刷新策略：所有设备类型使用相同的 nowMs 比较逻辑
  // 确保相同类型的设备具有统一的刷新频率
  
  // 检查是否为需要时间显示的设备（所有设备都可能显示时间戳）
  const hasTimestamp = prevProps.nowMs !== undefined && nextProps.nowMs !== undefined;
  
  if (hasTimestamp) {
    // 统一使用 10 秒间隔进行时间戳刷新（与 useNowMs 的 10 秒间隔保持一致）
    // 将时间戳按 10 秒取整，确保相同时间窗口内的设备一起刷新
    const prevTimeWindow = Math.floor((prevProps.nowMs ?? 0) / 10000);
    const nextTimeWindow = Math.floor((nextProps.nowMs ?? 0) / 10000);
    
    if (prevTimeWindow !== nextTimeWindow) {
      // 时间窗口变化，需要重新渲染以更新时间戳
      return false;
    }
  }

  // 3. 没有变化，跳过渲染
  return true;
});
