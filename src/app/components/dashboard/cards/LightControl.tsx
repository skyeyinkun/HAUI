import React, { useState, useEffect, useRef } from 'react';
import * as Slider from '@radix-ui/react-slider';
import { Sun, Palette } from 'lucide-react';
import { Device } from '@/types/device';
import { DeviceCardWrapper, DeviceCardHeader, DeviceCardCenterTimestamp } from './shared';
import { ICON_PROPS } from '@/styles/icon-constants';

/**
 * 乐观更新同步容差值（单位：亮度/色温步进值）
 * HA 设备实际响应值可能与请求值存在微小偏差（如 brightness 255→253）
 * 容差 5 步 ≈ 亮度 2%，可覆盖常见的硬件精度误差
 */
const SYNC_TOLERANCE = 5;

interface LightControlProps {
    device: Device;
    onToggle: (e: React.MouseEvent) => void;
    onClick: () => void;
    isEditing?: boolean;
    isCommon?: boolean;
    onToggleCommon?: (e: React.MouseEvent) => void;
    onUpdate?: (id: number, updates: any) => void;
    nowMs?: number; // 用于时间戳显示的时间基准
}

export function LightControl({
    device,
    onToggle,
    onClick: _onClick,
    isEditing,
    isCommon,
    onToggleCommon,
    onUpdate,
    nowMs
}: LightControlProps) {
    const [localBrightness, setLocalBrightness] = useState(device.brightness || 0);
    const [localColorTemp, setLocalColorTemp] = useState(device.color_temp || 153);
    const [isDragging, setIsDragging] = useState(false);

    // Optimistic UI state refs
    const isWaitingForUpdate = useRef(false);
    const waitingForType = useRef<'brightness' | 'color' | null>(null);
    const lastCommittedValue = useRef<number | null>(null);
    const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Sync local value with props when not dragging
    useEffect(() => {
        if (!isDragging) {
            // Smart sync for Lights (Brightness & Color Temp)
            let synced = false;
            
            if (isWaitingForUpdate.current && lastCommittedValue.current !== null) {
                if (waitingForType.current === 'brightness') {
                    // 亮度同步容差检查（覆盖硬件精度误差）
                    if (Math.abs((device.brightness || 0) - (lastCommittedValue.current as number)) <= SYNC_TOLERANCE) {
                        synced = true;
                    }
                } else if (waitingForType.current === 'color') {
                    // 色温同步容差检查
                    if (Math.abs((device.color_temp || 153) - (lastCommittedValue.current as number)) <= SYNC_TOLERANCE) {
                        synced = true;
                    }
                }
            }

            if (synced) {
                isWaitingForUpdate.current = false;
                waitingForType.current = null;
                lastCommittedValue.current = null;
                if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
                // 同步时保持平滑过渡，避免跳变
                setLocalBrightness(device.brightness || 0);
                setLocalColorTemp(device.color_temp || 153);
            } else if (!isWaitingForUpdate.current) {
                // Normal sync if not waiting - 只在非等待状态下同步
                // 避免在开关切换时造成亮度回跳
                const targetBrightness = device.brightness || 0;
                const targetColorTemp = device.color_temp || 153;
                
                // 只有当值真正变化时才更新，避免不必要的渲染
                setLocalBrightness(prev => Math.abs(prev - targetBrightness) > 1 ? targetBrightness : prev);
                setLocalColorTemp(prev => Math.abs(prev - targetColorTemp) > 1 ? targetColorTemp : prev);
            }
            // If waiting and not synced, do NOT update local state (keep optimistic)
        }
    }, [device.brightness, device.color_temp, device.isOn, isDragging]);

    const handleBrightnessChange = (val: number[]) => {
        setLocalBrightness(val[0]);
        setIsDragging(true);
    };

    const handleColorTempChange = (val: number[]) => {
        setLocalColorTemp(val[0]);
        setIsDragging(true);
    };

    const handleCommit = (type: 'brightness' | 'color', val: number[], retryCount = 0) => {
        setIsDragging(false);
        
        // Common Optimistic update setup
        isWaitingForUpdate.current = true;
        waitingForType.current = type;
        lastCommittedValue.current = val[0];
        
        if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
        updateTimeoutRef.current = setTimeout(() => {
            isWaitingForUpdate.current = false;
            waitingForType.current = null;
            lastCommittedValue.current = null;
            
            // Revert to props on timeout
            setLocalBrightness(device.isOn ? (device.brightness || 0) : 0);
            setLocalColorTemp(device.color_temp || 153);
        }, 5000);

        // Execute Command
        if (onUpdate) {
            if (type === 'brightness') {
                onUpdate(device.id, { brightness: val[0] });
            } else {
                onUpdate(device.id, { color_temp: val[0] });
            }
        }

        // Retry Logic (Max 2 retries, 300ms interval)
        if (retryCount < 2) {
            setTimeout(() => {
                // If still waiting and value matches, retry
                if (isWaitingForUpdate.current && waitingForType.current === type && lastCommittedValue.current === val[0]) {
                    handleCommit(type, val, retryCount + 1);
                }
            }, 300);
        }
    };

    const handleToggleWrapper = (e: React.MouseEvent) => {
        e.stopPropagation();
        // Optimistic Toggle for Light
        if (device.isOn) {
            // Turning OFF -> Optimistically set brightness to 0 for instant feedback
            setLocalBrightness(0);
        }
        // Turning ON: We don't know the restore brightness, so we wait for backend.
        onToggle(e);
    };

    // Helper to determine color description
    const getColorDesc = (mireds: number) => {
        // 153 (6500K) -> 500 (2000K)
        if (mireds < 250) return '冷色'; // > 4000K
        if (mireds > 370) return '暖色'; // < 2700K
        return '自然'; // 2700K - 4000K
    };

    // 检测设备是否支持亮度调节（brightness 字段存在则支持）
    const supportsDimming = typeof device.brightness === 'number';
    const supportsColorTemp = typeof device.color_temp === 'number';

    // 使用本地状态优先，避免回跳。当设备开启时显示本地亮度，关闭时显示0
    // 但在拖拽过程中始终使用本地值以保证流畅性
    const displayBrightness = isDragging ? localBrightness : (device.isOn ? localBrightness : 0);
    const currentBrightnessPct = Math.round((displayBrightness / 255) * 100);
    const colorDesc = getColorDesc(localColorTemp);

    // 普通开关灯（不支持亮度调节）：显示简洁布局而非空白双滑块
    if (!supportsDimming) {
        return (
            <DeviceCardWrapper
                device={device}
                onClick={(e) => { e.stopPropagation(); }}
                isEditing={isEditing}
                isCommon={isCommon}
                onToggleCommon={onToggleCommon}
            >
                <DeviceCardHeader device={device} onToggle={handleToggleWrapper} />

                {/* 中多空间：居中显示开关状态与更新时间 */}
                <div className="flex-1 flex flex-col items-center justify-center gap-1.5">
                    <div className={`text-[28px] font-bold tracking-tight leading-none ${
                        device.isOn ? 'text-foreground' : 'text-muted-foreground'
                    }`}>
                        {device.isOn ? '开启' : '关闭'}
                    </div>
                    <DeviceCardCenterTimestamp device={device} nowMs={nowMs ?? Date.now()} />
                </div>
            </DeviceCardWrapper>
        );
    }

    // 支持亮度调节的灯：显示完整控制面板
    return (
        <DeviceCardWrapper
            device={device}
            onClick={(e) => {
                e.stopPropagation();
            }}
            isEditing={isEditing}
            isCommon={isCommon}
            onToggleCommon={onToggleCommon}
        >
            <DeviceCardHeader device={device} onToggle={handleToggleWrapper} />
            
            {/* 中部弹性区：时间戳 + 当前亮度信息，垂直居中，呼吸感间距 */}
            <div className="flex-1 flex flex-col items-center justify-center gap-1.5 min-h-0">
                {/* 更新时间戳 */}
                <DeviceCardCenterTimestamp device={device} nowMs={nowMs ?? Date.now()} />
                {/* 当前亮度与色温描述 */}
                <div className="flex items-baseline gap-1 opacity-60">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">当前</span>
                    <span className="text-[13px] font-semibold text-foreground tabular-nums leading-none">
                        {currentBrightnessPct > 0 ? (
                            <>
                                亮度 {currentBrightnessPct}
                                <span className="text-[10px] font-medium opacity-80 ml-1.5">{colorDesc}</span>
                            </>
                        ) : (
                            '亮度 0'
                        )}
                    </span>
                </div>
            </div>
            
            {/* Controls Area - 底部滑块控制区，紧凑固定在底部 */}
            <div className="flex flex-col gap-2 pb-1 shrink-0">
                  {/* 亮度滑块 */}
                  <div className="flex items-center gap-2.5 h-6">
                      <Sun {...ICON_PROPS.deviceControl} />
                      <Slider.Root
                          className="relative flex items-center select-none touch-none w-full h-full group/slider cursor-pointer"
                          value={[localBrightness]}
                          max={255}
                          step={1}
                          onValueChange={handleBrightnessChange}
                          onValueCommit={(val) => handleCommit('brightness', val)}
                          // 阻止冒泡，防止触发卡片点击跳转
                          onPointerDown={(e) => {
                              e.stopPropagation();
                              // 新交互开始时清除乐观更新状态
                              if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
                              isWaitingForUpdate.current = false;
                              waitingForType.current = null;
                              lastCommittedValue.current = null;
                          }}
                      >
                          <Slider.Track className="relative grow h-[8px] rounded-full bg-accent overflow-hidden shadow-inner ring-1 ring-black/5 group-hover/slider:ring-black/10 transition-shadow">
                              <Slider.Range className="absolute h-full rounded-full bg-gradient-to-r from-yellow-100 to-yellow-400" />
                          </Slider.Track>
                          <Slider.Thumb className="block w-4 h-4 bg-white shadow-md rounded-full focus:outline-none ring-1 ring-black/10 hover:scale-110 hover:ring-2 hover:ring-primary/20 transition-all" />
                      </Slider.Root>
                  </div>

                  {/* 色温滑块：仅在设备支持色温调节时显示 */}
                  {supportsColorTemp && (
                  <div className="flex items-center gap-2.5 h-6 relative group/temp">
                      <Palette {...ICON_PROPS.deviceControl} />
                      <Slider.Root
                          className="relative flex items-center select-none touch-none w-full h-full group/slider cursor-pointer"
                          value={[localColorTemp]}
                          max={500}
                          min={153}
                          step={1}
                          onValueChange={handleColorTempChange}
                          onValueCommit={(val) => handleCommit('color', val)}
                          // 阻止冒泡，防止触发卡片点击跳转
                          onPointerDown={(e) => {
                              e.stopPropagation();
                              // 新交互开始时清除乐观更新状态
                              if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
                              isWaitingForUpdate.current = false;
                              waitingForType.current = null;
                              lastCommittedValue.current = null;
                          }}
                      >
                          <Slider.Track className="relative grow h-[8px] rounded-full bg-gradient-to-r from-blue-200 via-white to-orange-200 overflow-hidden shadow-inner ring-1 ring-black/5 group-hover/slider:ring-black/10 transition-shadow" />
                          <Slider.Thumb className="block w-4 h-4 bg-white shadow-md rounded-full focus:outline-none ring-1 ring-black/10 hover:scale-110 hover:ring-2 hover:ring-primary/20 transition-all" />
                      </Slider.Root>
                  </div>
                  )}
            </div>
        </DeviceCardWrapper>
    );
}
