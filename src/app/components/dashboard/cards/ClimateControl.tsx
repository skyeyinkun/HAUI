import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Minus, Plus, Wind } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Device } from '@/types/device';
import { DeviceCardWrapper, DeviceCardHeader } from './shared';
import { SensorTimestamp } from '@/app/components/dashboard/SensorTimestamp';
// 导入统一的空调配置与图标组件
import {
    HVAC_MODE_CONFIG,
    FAN_MODE_CONFIG,
    DEFAULT_HVAC_MODES,
    DEFAULT_FAN_MODES,
    FanModeIcon,
} from './shared';

interface ClimateControlProps {
    device: Device;
    onToggle: (e: React.MouseEvent) => void;
    onClick: () => void;
    isEditing?: boolean;
    isCommon?: boolean;
    onToggleCommon?: (e: React.MouseEvent) => void;
    onUpdate?: (id: number, updates: any) => void;
    nowMs?: number; // 用于时间戳显示的时间基准
}

export function ClimateControl({
    device,
    onToggle,
    onClick,
    isEditing,
    isCommon,
    onToggleCommon,
    onUpdate,
    nowMs
}: ClimateControlProps) {
    const minTemp = device.min_temp ?? 16;
    const maxTemp = device.max_temp ?? 30;

    const [localTemperature, setLocalTemperature] = useState(device.temperature || 26);
    const [localMode, setLocalMode] = useState(device.mode || 'off');
    const [localFanMode, setLocalFanMode] = useState(device.fan_mode || 'auto');

    // 可用 HVAC 模式
    const availableModes = useMemo(() => {
        const modes = (device.hvac_modes || DEFAULT_HVAC_MODES).filter((m: string) => m !== 'off');
        return modes.map((id: string) => ({
            id,
            ...(HVAC_MODE_CONFIG[id] || { icon: Wind, label: id, color: 'text-foreground' })
        }));
    }, [device.hvac_modes]);

    // 可用风速模式
    const availableFanModes = useMemo(() => {
        const modes = device.fan_modes || DEFAULT_FAN_MODES;
        return modes.map((id: string) => ({
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

            {/* 中部区域：更新时间 + 当前温度，紧凑垂直居中，不撑开 */}
            <div className="flex flex-col items-center justify-center py-1 gap-1">
                {/* 更新时间戳 */}
                <SensorTimestamp
                    lastChanged={device.lastChanged || device.lastUpdated}
                    available={device.haAvailable !== false}
                    nowMs={nowMs ?? Date.now()}
                    variant="compact"
                    className="text-[10px]"
                />
                {/* 当前温度 - 位于时间戳正下方，增加间距提升可读性 */}
                <span className="text-[10px] font-medium text-muted-foreground/60 leading-none tracking-wide">
                    当前 {typeof device.current_temperature === 'number' ? device.current_temperature : '--'}°C
                </span>
            </div>

            {/* 底部控制区域 - 紧凑布局防止溢出，flex-1撑满剩余空间并底部对齐 */}
            <div className="flex flex-col gap-0.5 flex-1 justify-end">
                {/* 温度调节按钮行：减号 | 设定温度 | 加号 */}
                <div className="flex items-center justify-between px-0.5 h-8">
                    <button
                        onClick={(e) => { e.stopPropagation(); handleTempChange(-1); }}
                        className="w-6 h-6 rounded-full bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 flex items-center justify-center transition-colors active:scale-95 shrink-0"
                    >
                        <Minus size={12} className="text-foreground/70" />
                    </button>

                    {/* 设定温度数字 - 居中于两个按钮之间 */}
                    <div className="flex items-baseline gap-0.5 leading-none">
                        {/* 温度数字动画：使用 AnimatePresence 实现数字切换时的淡入淡出效果 */}
                        <AnimatePresence mode="popLayout">
                            <motion.span
                                key={localTemperature}
                                initial={{ opacity: 0.5, y: -4, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 4, scale: 0.95 }}
                                transition={{ duration: 0.15, ease: 'easeOut' }}
                                className="text-[22px] font-medium text-foreground tracking-tight tabular-nums"
                            >
                                {localTemperature}
                            </motion.span>
                        </AnimatePresence>
                        <span className="text-xs font-medium text-muted-foreground">°</span>
                    </div>

                    <button
                        onClick={(e) => { e.stopPropagation(); handleTempChange(1); }}
                        className="w-6 h-6 rounded-full bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 flex items-center justify-center transition-colors active:scale-95 shrink-0"
                    >
                        <Plus size={12} className="text-foreground/70" />
                    </button>
                </div>

                {/* 控制区: 上下排列 (模式 + 风速) - 更紧凑布局 */}
                <div className="flex flex-col gap-0.5">
                    {/* 1. HVAC 模式 */}
                    <div className="flex items-center bg-black/5 dark:bg-white/5 p-[2px] rounded-[6px] h-[22px] w-full gap-[2px]">
                        {availableModes.map((mode) => (
                            <button
                                key={mode.id}
                                onClick={(e) => { e.stopPropagation(); handleModeChange(mode.id); }}
                                title={mode.label}
                                className={`
                                    flex-1 h-full flex items-center justify-center rounded-[4px] transition-all duration-200
                                    ${localMode === mode.id
                                        ? 'bg-white dark:bg-white/10 shadow-sm'
                                        : 'text-muted-foreground/40 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5'
                                    }
                                `}
                            >
                                <mode.icon
                                    size={11}
                                    className={`${localMode === mode.id ? mode.color : 'currentColor'} transition-colors duration-200 stroke-[2.5px]`}
                                />
                            </button>
                        ))}
                    </div>

                    {/* 2. 风速选择：使用统一的 FanModeIcon 组件 */}
                    <div className="flex items-center bg-black/5 dark:bg-white/5 p-[2px] rounded-[6px] h-[22px] w-full gap-[2px]">
                        {availableFanModes.slice(0, 5).map((fan: { id: string; label: string; level: number }) => {
                            const isActive = localFanMode === fan.id;
                            return (
                                <button
                                    key={fan.id}
                                    onClick={(e) => { e.stopPropagation(); handleFanModeChange(fan.id); }}
                                    title={fan.label}
                                    className={`
                                        flex-1 h-full flex items-center justify-center rounded-[4px] transition-all duration-200
                                        ${isActive
                                            ? 'bg-white dark:bg-white/10 shadow-sm text-primary'
                                            : 'text-muted-foreground/40 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5'
                                        }
                                    `}
                                >
                                    {/* 使用统一的 FanModeIcon 组件渲染风速图标 */}
                                    <FanModeIcon fanId={fan.id} isActive={isActive} size={10} />
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </DeviceCardWrapper>
    );
}
