import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Wind, Snowflake, Sun, X as XIcon, Droplet, Zap, ThermometerSun, Fan, Gauge } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ClimateControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  device: {
    id: number;
    name: string;
    room: string;
    isOn: boolean;
    temperature?: number;
    current_temperature?: number;
    mode?: 'cool' | 'heat' | 'fan' | string;
    fan_mode?: string;
    swing_mode?: string;
    hvac_modes?: string[];
    fan_modes?: string[];
    swing_modes?: string[];
    min_temp?: number;
    max_temp?: number;
    timer_minutes?: number;
  };
  onUpdate: (deviceId: number, updates: any) => void;
}

// HVAC 模式完整配置：制冷、制热、自动、除湿、送风、冷暖
const HVAC_MODE_CONFIG: Record<string, { icon: any; label: string; color: string; bgColor: string }> = {
  cool: { icon: Snowflake, label: '制冷', color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  heat: { icon: Sun, label: '制热', color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
  auto: { icon: ThermometerSun, label: '自动', color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
  dry: { icon: Droplet, label: '除湿', color: 'text-cyan-500', bgColor: 'bg-cyan-500/10' },
  fan_only: { icon: Wind, label: '送风', color: 'text-green-500', bgColor: 'bg-green-500/10' },
  heat_cool: { icon: Zap, label: '冷暖', color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
};

// 风速完整配置：低、中、高、全速、自动、静音、柔风
const FAN_MODE_CONFIG: Record<string, { label: string; icon: any; level: number }> = {
  auto: { label: '自动', icon: Fan, level: 0 },
  low: { label: '低速', icon: Wind, level: 1 },
  medium: { label: '中速', icon: Wind, level: 2 },
  high: { label: '高速', icon: Wind, level: 3 },
  turbo: { label: '全速', icon: Gauge, level: 4 },
  silent: { label: '静音', icon: Wind, level: 0 },
  diffuse: { label: '柔风', icon: Wind, level: 1 },
};

// 扫风中文映射
const SWING_MODE_LABELS: Record<string, string> = {
  off: '关',
  vertical: '上下',
  horizontal: '左右',
  both: '全向',
  on: '开',
};

const DEFAULT_HVAC_MODES = ['cool', 'heat', 'auto', 'dry', 'fan_only'];
const DEFAULT_FAN_MODES = ['auto', 'low', 'medium', 'high', 'turbo'];

export default function ClimateControlModal({ isOpen, onClose, device, onUpdate }: ClimateControlModalProps) {
  const MIN_TEMP = device.min_temp ?? 16;
  const MAX_TEMP = device.max_temp ?? 30;

  const [temperature, setTemperature] = useState(device.temperature || 22);
  const [mode, setMode] = useState<string>(device.mode || 'cool');
  const [fanMode, setFanMode] = useState<string>(device.fan_mode || 'auto');
  const [swingMode, setSwingMode] = useState<string>(device.swing_mode || 'off');

  const [isDragging, setIsDragging] = useState(false);
  const [interactionAngle, setInteractionAngle] = useState<number | null>(null);
  const dialRef = useRef<HTMLDivElement>(null);

  // 动态可用模式列表
  const availableHvacModes = useMemo(() => {
    const modes = (device.hvac_modes || DEFAULT_HVAC_MODES).filter(m => m !== 'off');
    return modes.map(id => ({
      id,
      ...(HVAC_MODE_CONFIG[id] || { icon: Wind, label: id, color: 'text-foreground', bgColor: 'bg-accent' })
    }));
  }, [device.hvac_modes]);

  const availableFanModes = useMemo(() => {
    const modes = device.fan_modes || DEFAULT_FAN_MODES;
    return modes.map(id => ({
      id,
      ...(FAN_MODE_CONFIG[id] || { label: id, icon: Wind, level: 0 })
    }));
  }, [device.fan_modes]);

  const availableSwingModes = useMemo(() => {
    return device.swing_modes || null;
  }, [device.swing_modes]);

  // 面板打开时同步设备数据
  useEffect(() => {
    if (isOpen) {
      setTemperature(device.temperature || 22);
      setMode(device.mode || 'cool');
      setFanMode(device.fan_mode || 'auto');
      setSwingMode(device.swing_mode || 'off');
    }
  }, [isOpen, device]);

  // 模式切换
  const handleModeChange = (newMode: string) => {
    setMode(newMode);
    onUpdate(device.id, { mode: newMode });
  };

  // 风速切换
  const handleFanChange = (newFan: string) => {
    setFanMode(newFan);
    onUpdate(device.id, { fan_mode: newFan });
  };

  // 扫风切换
  const handleSwingChange = (newSwing?: string) => {
    if (newSwing) {
      setSwingMode(newSwing);
      onUpdate(device.id, { swing_mode: newSwing });
    } else {
      const next = swingMode === 'off'
        ? (availableSwingModes?.find(m => m !== 'off') || 'vertical')
        : 'off';
      setSwingMode(next);
      onUpdate(device.id, { swing_mode: next });
    }
  };

  // ===== 温度旋钮计算 =====
  const TOTAL_ANGLE = 260;
  const START_ANGLE = -130;

  const tempToAngle = (temp: number) => {
    const percentage = (temp - MIN_TEMP) / (MAX_TEMP - MIN_TEMP);
    return START_ANGLE + percentage * TOTAL_ANGLE;
  };

  const angleToTemp = (angle: number) => {
    let normalizedAngle = angle;
    if (normalizedAngle > 180) normalizedAngle -= 360;
    if (normalizedAngle < START_ANGLE) normalizedAngle = START_ANGLE;
    if (normalizedAngle > START_ANGLE + TOTAL_ANGLE) normalizedAngle = START_ANGLE + TOTAL_ANGLE;
    const percentage = (normalizedAngle - START_ANGLE) / TOTAL_ANGLE;
    return Math.round(MIN_TEMP + percentage * (MAX_TEMP - MIN_TEMP));
  };

  const handleDialInteraction = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if (!dialRef.current) return;
    const rect = dialRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const clientX = 'touches' in e ? (e as any).touches[0].clientX : (e as MouseEvent).clientX;
    const clientY = 'touches' in e ? (e as any).touches[0].clientY : (e as MouseEvent).clientY;

    const deltaX = clientX - centerX;
    const deltaY = clientY - centerY;

    let angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;
    if (angle > 180) angle -= 360;

    if (angle >= START_ANGLE && angle <= START_ANGLE + TOTAL_ANGLE) {
      setInteractionAngle(angle);
      const newTemp = angleToTemp(angle);
      if (newTemp !== temperature) {
        if (navigator.vibrate) navigator.vibrate(15);
        setTemperature(newTemp);
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    handleDialInteraction(e);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) handleDialInteraction(e);
    };
    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        setInteractionAngle(null);
        onUpdate(device.id, { temperature });
      }
    };
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleMouseMove as any, { passive: false });
      window.addEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove as any);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, temperature, device.id, onUpdate]);

  const currentAngle = interactionAngle !== null ? interactionAngle : tempToAngle(temperature);

  const radius = 120;
  const strokeWidth = 24;
  const center = 150;

  const describeArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    return ["M", start.x, start.y, "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y].join(" ");
  };

  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    };
  };

  const trackPath = describeArc(center, center, radius, START_ANGLE, START_ANGLE + TOTAL_ANGLE);
  const progressPath = describeArc(center, center, radius, START_ANGLE, currentAngle);
  const knobPos = polarToCartesian(center, center, radius, currentAngle);

  // 当前模式信息
  const currentModeConfig = HVAC_MODE_CONFIG[mode] || { icon: Wind, label: mode, color: 'text-foreground', bgColor: 'bg-accent' };
  const ModeIcon = currentModeConfig.icon;
  const currentFanLabel = FAN_MODE_CONFIG[fanMode]?.label || fanMode;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-background w-full max-w-[300px] rounded-[32px] overflow-hidden shadow-2xl relative flex flex-col no-scrollbar"
          onClick={e => e.stopPropagation()}
        >
          {/* 头部 */}
          <div className="flex items-center justify-between px-5 pt-4 pb-1">
            <div className="w-8" />
            <div className="flex items-center gap-1">
              <span className="text-[15px] font-semibold text-foreground">{device.room}</span>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors">
              <XIcon className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* 设备状态胶囊 */}
          <div className="flex justify-center mb-1">
            <div className="flex items-center gap-2 bg-accent/50 px-3 py-1.5 rounded-full scale-90">
              <ModeIcon className={`w-3.5 h-3.5 ${currentModeConfig.color}`} />
              <span className="text-[12px] font-medium text-foreground">{device.name}</span>
              <div className="w-[1px] h-3 bg-border mx-0.5" />
              <div className={`w-1.5 h-1.5 rounded-full ${device.isOn ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-[10px] text-muted-foreground">
                {currentModeConfig.label} · {currentFanLabel}
              </span>
            </div>
          </div>

          {/* 温度旋钮区 - 优化间距 */}
          <div className="relative flex justify-center items-center -mt-2 -mb-8 scale-[0.8] shrink-0" ref={dialRef} onMouseDown={handleMouseDown}>
            <svg width="300" height="300" className="rotate-0">
              <defs>
                <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="var(--primary)" />
                  <stop offset="100%" stopColor="var(--primary)" />
                </linearGradient>
                <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="rgba(0,0,0,0.15)" />
                </filter>
              </defs>

              {/* 温度刻度标签 */}
              {[MIN_TEMP, Math.round((MIN_TEMP + MAX_TEMP) / 2), MAX_TEMP].map((tickTemp) => {
                const angle = tempToAngle(tickTemp);
                const pos = polarToCartesian(center, center, radius + 40, angle);
                return (
                  <text key={tickTemp} x={pos.x} y={pos.y} textAnchor="middle" dominantBaseline="middle" className="text-lg font-semibold fill-muted-foreground">
                    {tickTemp}°
                  </text>
                );
              })}

              {/* 刻度线 */}
              {Array.from({ length: 41 }).map((_, i) => {
                const angle = START_ANGLE + (i * (TOTAL_ANGLE / 40));
                const inner = polarToCartesian(center, center, radius + 20, angle);
                const outer = polarToCartesian(center, center, radius + 25, angle);
                return (
                  <line key={i} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y}
                    stroke="var(--muted-foreground)" strokeWidth="1" strokeOpacity="0.5" />
                );
              })}

              {/* 轨道 */}
              <path d={trackPath} fill="none" stroke="var(--accent)" strokeWidth={strokeWidth} strokeLinecap="round" />

              {/* 进度 */}
              <path d={progressPath} fill="none" stroke="var(--primary)" strokeWidth={strokeWidth} strokeLinecap="round" />

              {/* 旋钮 */}
              <g transform={`translate(${knobPos.x}, ${knobPos.y})`} style={{ cursor: 'grab' }}>
                <circle r="16" fill="var(--background)" filter="url(#shadow)" />
                <circle r="16" fill="var(--background)" stroke="var(--border)" strokeWidth="1" />
                <foreignObject x="-8" y="-8" width="16" height="16">
                  <div className="w-full h-full flex items-center justify-center text-foreground">
                    <ModeIcon size={10} />
                  </div>
                </foreignObject>
              </g>
            </svg>

            {/* 中央温度显示 */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-muted-foreground text-xs font-medium mb-1">{currentModeConfig.label}</span>
              <span className="text-5xl font-bold text-foreground tracking-tight">{temperature}°</span>
              {device.current_temperature !== undefined && (
                <span className="text-[10px] text-muted-foreground mt-2 font-medium bg-accent/50 px-2 py-0.5 rounded-full">
                  当前 {device.current_temperature}°C
                </span>
              )}
            </div>
          </div>

          {/* ===== 控制面板 - 固定网格布局 (无滑动) ===== */}
          <div className="bg-card flex-1 px-4 pb-5 pt-2 z-10 relative flex flex-col gap-3">

            {/* 扫风控制 (顶部独立) */}
            <div className="flex justify-center -mb-1">
              <button
                onClick={() => handleSwingChange()}
                className={`
                    group relative w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 shrink-0
                    ${swingMode !== 'off'
                    ? 'bg-blue-500/10 text-blue-500 ring-1 ring-blue-500/20 scale-105 shadow-sm'
                    : 'bg-accent/40 text-muted-foreground hover:bg-accent/60 hover:text-foreground hover:scale-105'
                  }
                  `}
              >
                <Wind className={`w-5 h-5 shrink-0 ${swingMode !== 'off' ? 'animate-pulse' : ''}`} strokeWidth={2} />

                {/* Tooltip */}
                <span className="absolute -top-9 left-1/2 -translate-x-1/2 px-2.5 py-1.5 bg-popover/90 backdrop-blur-sm text-popover-foreground text-[10px] font-medium rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-20 border border-border/50">
                  {swingMode !== 'off' ? `扫风: ${SWING_MODE_LABELS[swingMode] || swingMode}` : '开启扫风'}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-popover/90" />
                </span>
              </button>
            </div>

            {/* 风速选择 (Grid 5) */}
            <div>
              <div className="text-[10px] font-medium text-muted-foreground mb-3 px-1 flex items-center justify-center gap-1.5 opacity-60">
                <Fan className="w-3 h-3" />
                <span>风速调节</span>
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                {availableFanModes.map((fan) => {
                  const isActive = fanMode === fan.id;
                  return (
                    <button
                      key={fan.id}
                      onClick={() => handleFanChange(fan.id)}
                      className={`
                        group relative w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300
                        ${isActive
                          ? 'bg-primary/10 text-primary ring-1 ring-primary/20 scale-110 z-10'
                          : 'bg-accent/40 text-muted-foreground hover:bg-accent/60 hover:text-foreground hover:scale-105'
                        }
                      `}
                    >
                      <fan.icon className="w-5 h-5 shrink-0" strokeWidth={2} />

                      {/* Tooltip */}
                      <span className="absolute -top-9 left-1/2 -translate-x-1/2 px-2.5 py-1.5 bg-popover/90 backdrop-blur-sm text-popover-foreground text-[10px] font-medium rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-20 border border-border/50">
                        {fan.label}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-popover/90" />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 模式选择 (Grid Auto) + 扫风 */}
            <div>
              <div className="text-[10px] font-medium text-muted-foreground mb-3 px-1 flex items-center justify-center gap-1.5 opacity-60">
                <ThermometerSun className="w-3 h-3" />
                <span>模式切换</span>
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                {/* 模式 (自适应网格) */}
                <div className="contents">
                  {availableHvacModes.map((m) => {
                    const isActive = mode === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => handleModeChange(m.id)}
                        className={`
                          group relative w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300
                          ${isActive
                            ? `${m.bgColor || 'bg-primary/10'} ${m.color || 'text-primary'} ring-1 ring-black/5 dark:ring-white/10 scale-110 z-10 shadow-sm`
                            : 'bg-accent/40 text-muted-foreground hover:bg-accent/60 hover:text-foreground hover:scale-105'
                          }
                        `}
                        title={m.label}
                      >
                        <m.icon className="w-5 h-5 shrink-0" strokeWidth={2} />

                        {/* Tooltip */}
                        <span className="absolute -top-9 left-1/2 -translate-x-1/2 px-2.5 py-1.5 bg-popover/90 backdrop-blur-sm text-popover-foreground text-[10px] font-medium rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-20 border border-border/50">
                          {m.label}
                          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-popover/90" />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
