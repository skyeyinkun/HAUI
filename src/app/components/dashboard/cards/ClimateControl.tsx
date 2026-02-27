import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Minus, Plus, Snowflake, Sun, Wind, Droplet, Zap, ThermometerSun } from 'lucide-react';
import { Device } from '@/types/device';
import { DeviceCardWrapper, DeviceCardHeader } from './shared';

interface ClimateControlProps {
    device: Device;
    onToggle: (e: React.MouseEvent) => void;
    onClick: () => void;
    isEditing?: boolean;
    isCommon?: boolean;
    onToggleCommon?: (e: React.MouseEvent) => void;
    onUpdate?: (id: number, updates: any) => void;
}

// HVAC 模式完整配置
const HVAC_MODE_CONFIG: Record<string, { icon: any; label: string; color: string }> = {
    cool: { icon: Snowflake, label: '制冷', color: 'text-blue-500' },
    heat: { icon: Sun, label: '制热', color: 'text-orange-500' },
    auto: { icon: ThermometerSun, label: '自动', color: 'text-purple-500' },
    dry: { icon: Droplet, label: '除湿', color: 'text-cyan-500' },
    fan_only: { icon: Wind, label: '送风', color: 'text-green-500' },
    heat_cool: { icon: Zap, label: '冷暖', color: 'text-amber-500' },
};

// 风速完整配置
const FAN_MODE_CONFIG: Record<string, { label: string; level: number }> = {
    auto: { label: '自动', level: 0 },
    low: { label: '低', level: 1 },
    medium: { label: '中', level: 2 },
    high: { label: '高', level: 3 },
    turbo: { label: '全速', level: 4 },
    silent: { label: '静音', level: 0 },
    diffuse: { label: '柔风', level: 1 },
};

const DEFAULT_MODES = ['cool', 'heat', 'auto', 'dry', 'fan_only'];
const DEFAULT_FAN_MODES = ['auto', 'low', 'medium', 'high', 'turbo'];

export function ClimateControl({
    device,
    onToggle,
    onClick,
    isEditing,
    isCommon,
    onToggleCommon,
    onUpdate
}: ClimateControlProps) {
    const minTemp = device.min_temp ?? 16;
    const maxTemp = device.max_temp ?? 30;

    const [localTemperature, setLocalTemperature] = useState(device.temperature || 26);
    const [localMode, setLocalMode] = useState(device.mode || 'off');
    const [localFanMode, setLocalFanMode] = useState(device.fan_mode || 'auto');

    // 可用 HVAC 模式
    const availableModes = useMemo(() => {
        const modes = (device.hvac_modes || DEFAULT_MODES).filter(m => m !== 'off');
        return modes.map(id => ({
            id,
            ...(HVAC_MODE_CONFIG[id] || { icon: Wind, label: id, color: 'text-foreground' })
        }));
    }, [device.hvac_modes]);

    // 可用风速模式
    const availableFanModes = useMemo(() => {
        const modes = device.fan_modes || DEFAULT_FAN_MODES;
        return modes.map(id => ({
            id,
            ...(FAN_MODE_CONFIG[id] || { label: id, level: 0 })
        }));
    }, [device.fan_modes]);

    // Optimistic UI 状态管理
    const isWaitingForUpdate = useRef(false);
    const waitingForType = useRef<'temperature' | 'mode' | 'fan_mode' | null>(null);
    const lastCommittedValue = useRef<number | string | null>(null);
    const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        let synced = false;
        if (isWaitingForUpdate.current && lastCommittedValue.current !== null) {
            if (waitingForType.current === 'temperature') {
                if (Math.abs((device.temperature || 26) - (lastCommittedValue.current as number)) <= 0.5) synced = true;
            } else if (waitingForType.current === 'mode') {
                if (device.mode === lastCommittedValue.current) synced = true;
            } else if (waitingForType.current === 'fan_mode') {
                if (device.fan_mode === lastCommittedValue.current) synced = true;
            }
        }

        if (synced) {
            isWaitingForUpdate.current = false;
            waitingForType.current = null;
            lastCommittedValue.current = null;
            if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
            setLocalTemperature(device.temperature || 26);
            setLocalMode(device.mode || 'off');
            setLocalFanMode(device.fan_mode || 'auto');
        } else if (!isWaitingForUpdate.current) {
            setLocalTemperature(device.temperature || 26);
            setLocalMode(device.mode || 'off');
            setLocalFanMode(device.fan_mode || 'auto');
        }
    }, [device.temperature, device.mode, device.fan_mode]);

    const handleCommit = (type: 'temperature' | 'mode' | 'fan_mode', val: any[], retryCount = 0) => {
        isWaitingForUpdate.current = true;
        waitingForType.current = type;
        lastCommittedValue.current = val[0];

        if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
        updateTimeoutRef.current = setTimeout(() => {
            isWaitingForUpdate.current = false;
            waitingForType.current = null;
            lastCommittedValue.current = null;
            setLocalTemperature(device.temperature || 26);
            setLocalMode(device.mode || 'off');
            setLocalFanMode(device.fan_mode || 'auto');
        }, 5000);

        if (onUpdate) {
            if (type === 'temperature') onUpdate(device.id, { temperature: val[0] });
            else if (type === 'mode') onUpdate(device.id, { mode: val[0] });
            else if (type === 'fan_mode') onUpdate(device.id, { fan_mode: val[0] });
        }

        if (retryCount < 2) {
            setTimeout(() => {
                if (isWaitingForUpdate.current && waitingForType.current === type && lastCommittedValue.current === val[0]) {
                    handleCommit(type, val, retryCount + 1);
                }
            }, 300);
        }
    };

    const handleTempChange = (delta: number) => {
        let newTemp = (localTemperature || 26) + delta;
        newTemp = Math.max(minTemp, Math.min(maxTemp, newTemp));
        if (newTemp !== localTemperature) {
            setLocalTemperature(newTemp);
            handleCommit('temperature', [newTemp]);
        }
    };

    const handleModeChange = (mode: string) => {
        if (mode === localMode) return;
        setLocalMode(mode);
        handleCommit('mode', [mode]);
    };

    const handleFanModeChange = (fan: string) => {
        if (fan === localFanMode) return;
        setLocalFanMode(fan);
        handleCommit('fan_mode', [fan]);
    };

    const handleToggleWrapper = (e: React.MouseEvent) => {
        e.stopPropagation();
        onToggle(e);
    };

    return (
        <DeviceCardWrapper
            device={device}
            onClick={(e) => {
                e.stopPropagation();
                if (!isEditing) onClick();
            }}
            isEditing={isEditing}
            isCommon={isCommon}
            onToggleCommon={onToggleCommon}
        >
            <DeviceCardHeader device={device} onToggle={handleToggleWrapper} />

            <div className="flex-1 flex flex-col justify-end gap-1 pb-0 relative">
                <div className="flex-1 flex flex-col justify-between pb-0 mt-0 relative min-h-0">
                    {/* 温度显示区 + 调节按钮 */}
                    <div className="flex items-center justify-between px-0.5 mb-1 shrink-0 flex-1">
                        <button
                            onClick={(e) => { e.stopPropagation(); handleTempChange(-1); }}
                            className="w-7 h-7 rounded-full bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 flex items-center justify-center transition-colors active:scale-95 shrink-0"
                        >
                            <Minus size={14} className="text-foreground/70" />
                        </button>

                        <div className="flex flex-col items-center justify-center leading-none">
                            <div className="flex items-baseline gap-0.5">
                                <span className="text-[26px] font-medium text-foreground tracking-tight tabular-nums">
                                    {localTemperature}
                                </span>
                                <span className="text-sm font-medium text-muted-foreground">°</span>
                            </div>
                            <span className="text-[10px] font-medium text-muted-foreground/60">
                                当前 {typeof device.current_temperature === 'number' ? device.current_temperature : '--'}°
                            </span>
                        </div>

                        <button
                            onClick={(e) => { e.stopPropagation(); handleTempChange(1); }}
                            className="w-7 h-7 rounded-full bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 flex items-center justify-center transition-colors active:scale-95 shrink-0"
                        >
                            <Plus size={14} className="text-foreground/70" />
                        </button>
                    </div>

                    {/* 控制区: 上下排列 (模式 + 风速) */}
                    <div className="flex flex-col gap-1.5 w-full shrink-0">
                        {/* 1. HVAC 模式 */}
                        <div className="flex items-center bg-black/5 dark:bg-white/5 p-0.5 rounded-[8px] h-[26px] w-full gap-0.5">
                            {availableModes.map((mode) => (
                                <button
                                    key={mode.id}
                                    onClick={(e) => { e.stopPropagation(); handleModeChange(mode.id); }}
                                    title={mode.label}
                                    className={`
                                        flex-1 h-full flex items-center justify-center rounded-[6px] transition-all duration-200
                                        ${localMode === mode.id
                                            ? 'bg-white dark:bg-white/10 shadow-sm'
                                            : 'text-muted-foreground/40 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5'
                                        }
                                    `}
                                >
                                    <mode.icon
                                        size={13}
                                        className={`${localMode === mode.id ? mode.color : 'currentColor'} transition-colors duration-200 stroke-[2.5px]`}
                                    />
                                </button>
                            ))}
                        </div>

                        {/* 2. 风速选择 */}
                        <div className="flex items-center bg-black/5 dark:bg-white/5 p-0.5 rounded-[8px] h-[26px] w-full gap-0.5">
                            {availableFanModes.slice(0, 5).map((fan) => {
                                const FanIcon = fan.id === 'auto' ? ThermometerSun : (fan.id === 'turbo' ? Zap : Wind);
                                const iconSize = 12;
                                return (
                                    <button
                                        key={fan.id}
                                        onClick={(e) => { e.stopPropagation(); handleFanModeChange(fan.id); }}
                                        title={fan.label}
                                        className={`
                                            flex-1 h-full flex items-center justify-center rounded-[6px] transition-all duration-200
                                            ${localFanMode === fan.id
                                                ? 'bg-white dark:bg-white/10 shadow-sm text-primary'
                                                : 'text-muted-foreground/40 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5'
                                            }
                                        `}
                                    >
                                        <FanIcon size={iconSize} strokeWidth={2.5} />
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </DeviceCardWrapper>
    );
}
