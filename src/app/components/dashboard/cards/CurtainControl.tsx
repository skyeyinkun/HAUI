import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Device } from '@/types/device';
import { DeviceCardWrapper, DeviceCardHeader, LargeCurtainVisual } from './shared';
import { SensorTimestamp } from '@/app/components/dashboard/SensorTimestamp';
import { ICON_PROPS } from '@/styles/icon-constants';

// 窗帘预设位置选项
const CURTAIN_PRESETS = [
  { value: 25, label: '25%' },
  { value: 50, label: '50%' },
  { value: 75, label: '75%' },
  { value: 100, label: '全开' },
] as const;

interface CurtainControlProps {
    device: Device;
    onToggle: (e: React.MouseEvent) => void;
    onClick: () => void;
    isEditing?: boolean;
    isCommon?: boolean;
    onToggleCommon?: (e: React.MouseEvent) => void;
    onPositionChange?: (id: number, val: number | number[]) => void;
    nowMs?: number; // 用于时间戳显示的时间基准
    onLongPress?: (device: Device, event: React.MouseEvent | React.TouchEvent) => void; // 长按回调
}

export function CurtainControl({
    device,
    onToggle,
    onClick: _onClick,
    isEditing,
    isCommon,
    onToggleCommon,
    onPositionChange,
    nowMs,
    onLongPress
}: CurtainControlProps) {
    const [localPosition, setLocalPosition] = useState(device.position || 0);
    const [isDragging, setIsDragging] = useState(false);
    const [dragDirection, setDragDirection] = useState<'opening' | 'closing' | null>(null);
    // 拖拽起始点信息，用于优化中心拖拽体验
    const [dragStartInfo, setDragStartInfo] = useState<{ startX: number; startPos: number } | null>(null);

    const curtainContainerRef = useRef<HTMLDivElement>(null);
    // 用于存储上一次的位置，优化拖拽方向判断
    const lastPositionRef = useRef(localPosition);

    // Optimistic UI state refs
    const isWaitingForUpdate = useRef(false);
    const waitingForType = useRef<'position' | null>(null);
    const lastCommittedValue = useRef<number | null>(null);
    const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Sync local value with props when not dragging
    useEffect(() => {
        if (!isDragging) {
            // Smart sync: Ignore updates that revert to old state while waiting for commit
            if (isWaitingForUpdate.current && waitingForType.current === 'position' && lastCommittedValue.current !== null) {
                 // Tolerance check: if value is close enough (within 1%), consider it synced
                 if (Math.abs((device.position || 0) - (lastCommittedValue.current as number)) <= 1) {
                     isWaitingForUpdate.current = false;
                     waitingForType.current = null;
                     lastCommittedValue.current = null;
                     if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
                     setLocalPosition(device.position || 0);
                 }
                 // Else: keep optimistic local state (Anti-Jumping Fix)
            } else if (!isWaitingForUpdate.current) {
                // 只在非等待状态下同步，避免回跳
                const targetPosition = device.position || 0;
                // 只有当值真正变化时才更新，避免不必要的渲染
                setLocalPosition(prev => Math.abs(prev - targetPosition) > 1 ? targetPosition : prev);
            }
        }
    }, [device.position, isDragging]);

    // 优化的拖拽处理函数 - 支持中心拖拽模式
    const handleCurtainDrag = useCallback((clientX: number) => {
        if (!curtainContainerRef.current || !dragStartInfo) return;
        const rect = curtainContainerRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        
        // 计算从拖拽起始点的位移量
        const deltaX = clientX - dragStartInfo.startX;
        // 将位移转换为百分比变化（基于容器宽度的一半）
        const deltaPercent = (deltaX / (rect.width / 2)) * 100;
        
        // 判断拖拽方向：基于鼠标相对于中心的位置
        const isOnLeftSide = dragStartInfo.startX < centerX;
        
        // 根据拖拽侧边和方向计算新位置
        // 左侧拖动：向左（负值）= 打开，向右（正值）= 关闭
        // 右侧拖动：向右（正值）= 打开，向左（负值）= 关闭
        let newPos: number;
        if (isOnLeftSide) {
            // 左侧：向左拖 = 打开（增加位置）
            newPos = dragStartInfo.startPos - deltaPercent;
        } else {
            // 右侧：向右拖 = 打开（增加位置）
            newPos = dragStartInfo.startPos + deltaPercent;
        }
        
        // 限制范围 0-100
        newPos = Math.max(0, Math.min(100, newPos));
        
        // 判断拖拽方向
        if (newPos > lastPositionRef.current + 0.5) {
            setDragDirection('opening');
        } else if (newPos < lastPositionRef.current - 0.5) {
            setDragDirection('closing');
        }
        
        // 实时更新位置
        const roundedPos = Math.round(newPos);
        lastPositionRef.current = newPos;
        setLocalPosition(roundedPos);
    }, [dragStartInfo]);

    const handleCurtainPointerDown = useCallback((e: React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        // 清除之前的等待状态
        if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
        isWaitingForUpdate.current = false;
        waitingForType.current = null;
        lastCommittedValue.current = null;
        
        // 记录拖拽起始点和当前位置
        setDragStartInfo({ startX: e.clientX, startPos: localPosition });
        setIsDragging(true);
        curtainContainerRef.current?.setPointerCapture(e.pointerId);
    }, [localPosition]);

    const handleCurtainPointerMove = useCallback((e: React.PointerEvent) => {
        if (isDragging) {
            // 直接同步调用，移除 RAF 避免坐标过期导致跟踪延迟
            handleCurtainDrag(e.clientX);
        }
    }, [isDragging, handleCurtainDrag]);

    const handleCurtainPointerUp = useCallback((e: React.PointerEvent) => {
        if (isDragging) {
            curtainContainerRef.current?.releasePointerCapture(e.pointerId);
            setDragStartInfo(null);
            handleCommit('position', [localPosition]);
        }
    }, [isDragging, localPosition]);

    const handleCommit = (type: 'position', val: number[], retryCount = 0) => {
        setIsDragging(false);
        setDragDirection(null);
        
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
            setLocalPosition(device.position || 0);
        }, 5000);

        // Execute Command
        if (onPositionChange) {
            onPositionChange(device.id, val[0]);
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
        // Optimistic update for Curtain Toggle
        // If Open (isOn) -> Close to 0. If Closed -> Open to 100.
        const targetPos = device.isOn ? 0 : 100;
        setLocalPosition(targetPos);
        // Trigger commit logic to set waiting state and retry
        handleCommit('position', [targetPos]);
        
        onToggle(e);
    };

    // 处理预设位置点击
    const handlePresetClick = useCallback((presetValue: number) => {
        setLocalPosition(presetValue);
        handleCommit('position', [presetValue]);
    }, []);

    // Calculate curtain panel width percentage for arrow positioning
    const panelWidthPercent = 50 - (localPosition / 100) * 40;

    // Determine arrow icons based on direction/state
    let showOutwards = true; // Default to Outwards (< >)

    if (isDragging) {
        if (dragDirection === 'closing') showOutwards = false; // Inwards (> <)
        else if (dragDirection === 'opening') showOutwards = true; // Outwards (< >)
    } else {
        // Idle state logic:
        if (localPosition > 50) showOutwards = false;
    }

    return (
        <DeviceCardWrapper
            device={device}
            onClick={(e) => {
                e.stopPropagation();
            }}
            isEditing={isEditing}
            isCommon={isCommon}
            onToggleCommon={onToggleCommon}
            onLongPress={onLongPress}
        >
            <DeviceCardHeader device={device} onToggle={handleToggleWrapper} value={localPosition} />

            {/* 状态信息行：时间戳（左）+ 位置百分比（右），位于帘子可视区域正上方 */}
            <div className="shrink-0 flex items-center justify-between px-0.5">
                <SensorTimestamp
                    lastChanged={device.lastChanged || device.lastUpdated}
                    available={device.haAvailable !== false}
                    nowMs={nowMs ?? Date.now()}
                    variant="compact"
                    className="text-[10px]"
                />
                {/* 开合位置百分比 */}
                <span className="text-[11px] font-semibold tabular-nums text-foreground/60 tracking-tight">
                    {localPosition}%
                </span>
            </div>

            {/* 帘子可视化交互区域（红框区域）- 占据剩余全部空间 */}
            <div className="flex-1 min-h-0">
                {/* 指针事件全区域绑定，rounded 样式与内部视觉一致 */}
                <div
                    ref={curtainContainerRef}
                    className="w-full h-full relative overflow-hidden rounded-[12px] cursor-col-resize touch-none select-none group/curtain bg-gradient-to-b from-white/95 to-slate-50/90 dark:from-slate-800/60 dark:to-slate-900/50"
                    onPointerDown={handleCurtainPointerDown}
                    onPointerMove={handleCurtainPointerMove}
                    onPointerUp={handleCurtainPointerUp}
                    onPointerCancel={handleCurtainPointerUp}
                >
                    {/* 交互箭头层 - 跟随左右帘布边缘浮动 */}
                    <div className="absolute inset-0 z-20 pointer-events-none">
                        {/* 左箭头（跟随左侧帘布边缘） */}
                        <div
                            className={`absolute top-1/2 ${isDragging ? '' : 'transition-all duration-200 ease-out'}`}
                            style={{ left: `${panelWidthPercent}%`, transform: 'translate(-50%, -50%)' }}
                        >
                            <div className={`bg-background/70 backdrop-blur-sm rounded-full p-0.5 shadow-sm border border-border/10
                                ${isDragging ? 'opacity-100' : 'opacity-0 group-hover/curtain:opacity-70'}
                                transition-opacity duration-200`}
                            >
                                {showOutwards ? (
                                    <ChevronLeft {...ICON_PROPS.remoteButton} className="w-3.5 h-3.5 text-foreground/70" />
                                ) : (
                                    <ChevronRight {...ICON_PROPS.remoteButton} className="w-3.5 h-3.5 text-foreground/70" />
                                )}
                            </div>
                        </div>

                        {/* 右箭头（跟随右侧帘布边缘） */}
                        <div
                            className={`absolute top-1/2 ${isDragging ? '' : 'transition-all duration-200 ease-out'}`}
                            style={{ right: `${panelWidthPercent}%`, transform: 'translate(50%, -50%)' }}
                        >
                            <div className={`bg-background/70 backdrop-blur-sm rounded-full p-0.5 shadow-sm border border-border/10
                                ${isDragging ? 'opacity-100' : 'opacity-0 group-hover/curtain:opacity-70'}
                                transition-opacity duration-200`}
                            >
                                {showOutwards ? (
                                    <ChevronRight {...ICON_PROPS.remoteButton} className="w-3.5 h-3.5 text-foreground/70" />
                                ) : (
                                    <ChevronLeft {...ICON_PROPS.remoteButton} className="w-3.5 h-3.5 text-foreground/70" />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 窗帘可视化主体 - 铺满整个交互区域 */}
                    <div className="absolute inset-0 pointer-events-none">
                        <LargeCurtainVisual position={localPosition} isDragging={isDragging} />
                    </div>
                </div>
            </div>

            {/* 快捷预设按钮行 - 底部固定 */}
            <div className="shrink-0 flex items-center justify-center gap-1.5 pt-1">
                {CURTAIN_PRESETS.map((preset) => {
                    const isActive = Math.abs(localPosition - preset.value) < 3; // 3% 容差
                    return (
                        <button
                            key={preset.value}
                            onClick={(e) => {
                                e.stopPropagation();
                                handlePresetClick(preset.value);
                            }}
                            className={`px-2 py-1 rounded-[6px] text-[10px] font-medium transition-all
                                ${isActive 
                                    ? 'bg-primary text-primary-foreground shadow-sm' 
                                    : 'bg-accent/50 text-muted-foreground hover:bg-accent hover:text-foreground'
                                }`}
                            title={`设置窗帘开度为 ${preset.value}%`}
                        >
                            {preset.label}
                        </button>
                    );
                })}
            </div>
        </DeviceCardWrapper>
    );
}
