import React, { useState, useEffect, useRef } from 'react';
import * as Slider from '@radix-ui/react-slider';
import { Sun, Palette } from 'lucide-react';
import { Device } from '@/types/device';
import { DeviceCardWrapper, DeviceCardHeader } from './shared';

interface LightControlProps {
    device: Device;
    onToggle: (e: React.MouseEvent) => void;
    onClick: () => void;
    isEditing?: boolean;
    isCommon?: boolean;
    onToggleCommon?: (e: React.MouseEvent) => void;
    onUpdate?: (id: number, updates: any) => void;
}

export function LightControl({
    device,
    onToggle,
    onClick,
    isEditing,
    isCommon,
    onToggleCommon,
    onUpdate
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
                    // Check brightness sync (increased tolerance to 5 steps ~2%)
                    if (Math.abs((device.brightness || 0) - (lastCommittedValue.current as number)) <= 5) {
                        synced = true;
                    }
                } else if (waitingForType.current === 'color') {
                    // Check color temp sync
                    if (Math.abs((device.color_temp || 153) - (lastCommittedValue.current as number)) <= 5) {
                        synced = true;
                    }
                }
            }

            if (synced) {
                isWaitingForUpdate.current = false;
                waitingForType.current = null;
                lastCommittedValue.current = null;
                if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
                setLocalBrightness(device.isOn ? (device.brightness || 0) : 0);
                setLocalColorTemp(device.color_temp || 153);
            } else if (!isWaitingForUpdate.current) {
                // Normal sync if not waiting
                setLocalBrightness(device.isOn ? (device.brightness || 0) : 0);
                setLocalColorTemp(device.color_temp || 153);
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

    const displayBrightness = device.isOn ? localBrightness : 0;
    const currentBrightnessPct = Math.round((displayBrightness / 255) * 100);
    const colorDesc = getColorDesc(localColorTemp);

    return (
        <DeviceCardWrapper
            device={device}
            onClick={(e) => {
                e.stopPropagation();
                // For light, click usually means toggle or details? 
                // In original code: onClick={(e) => { e.stopPropagation(); if (isAC && !isEditing) onClick(); }}
                // Wait, original code only calls onClick() if isAC. For others it just stops propagation?
                // Line 441: onClick={(e) => { e.stopPropagation(); if (isAC && !isEditing) onClick(); }}
                // So for Light, it does NOTHING on click except stop propagation?
                // Let's check line 443 carefully.
                // Yes. Light controls are sliders. Tapping the card background does nothing?
                // Actually, line 439 passes onClick to wrapper.
                // Wrapper onClick is bound to the div.
                // So if I click the card background (outside sliders), nothing happens for Light.
                // But wait, if I click the header? Header has its own toggle button.
                // If I click header text? It's inside wrapper.
                // So yes, Light card background click is no-op.
            }}
            isEditing={isEditing}
            isCommon={isCommon}
            onToggleCommon={onToggleCommon}
        >
            <DeviceCardHeader device={device} onToggle={handleToggleWrapper} />
            
            {/* Controls Area - Flex 1 to push to bottom */}
            <div className="flex-1 flex flex-col justify-end gap-3 pb-0.5">
               <div className="flex flex-col gap-2 pb-1 h-full">
                  {/* Status Display Area (Centered in top space) */}
                  <div className="flex-1 flex flex-col items-center justify-center -mt-1">
                      <div className="flex items-baseline gap-1 opacity-60">
                          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider scale-90 origin-right">当前</span>
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

                  {/* Brightness Slider with Icon */}
                  <div className="flex items-center gap-2.5 h-6">
                      <Sun size={16} className="shrink-0 stroke-[2] text-foreground/80" />
                      <Slider.Root
                          className="relative flex items-center select-none touch-none w-full h-full group/slider cursor-pointer"
                          value={[localBrightness]}
                          max={255}
                          step={1}
                          onValueChange={handleBrightnessChange}
                          onValueCommit={(val) => handleCommit('brightness', val)}
                          // Stop propagation to prevent card click navigation
                          onPointerDown={(e) => {
                              e.stopPropagation();
                              // Clear optimistic state on new interaction
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

                  {/* Color Temp Slider with Icon */}
                  <div className="flex items-center gap-2.5 h-6 relative group/temp">
                      <Palette size={16} className="shrink-0 stroke-[2] text-foreground/80" />
                      <Slider.Root
                          className="relative flex items-center select-none touch-none w-full h-full group/slider cursor-pointer"
                          value={[localColorTemp]}
                          max={500}
                          min={153}
                          step={1}
                          onValueChange={handleColorTempChange}
                          onValueCommit={(val) => handleCommit('color', val)}
                          // Stop propagation to prevent card click navigation
                          onPointerDown={(e) => {
                              e.stopPropagation();
                              // Clear optimistic state on new interaction
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
               </div>
            </div>
        </DeviceCardWrapper>
    );
}
