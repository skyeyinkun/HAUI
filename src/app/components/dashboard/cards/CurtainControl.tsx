import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Device } from '@/types/device';
import { DeviceCardWrapper, DeviceCardHeader, LargeCurtainVisual } from './shared';

interface CurtainControlProps {
    device: Device;
    onToggle: (e: React.MouseEvent) => void;
    onClick: () => void;
    isEditing?: boolean;
    isCommon?: boolean;
    onToggleCommon?: (e: React.MouseEvent) => void;
    onPositionChange?: (id: number, val: number | number[]) => void;
}

export function CurtainControl({
    device,
    onToggle,
    onClick,
    isEditing,
    isCommon,
    onToggleCommon,
    onPositionChange
}: CurtainControlProps) {
    const [localPosition, setLocalPosition] = useState(device.position || 0);
    const [isDragging, setIsDragging] = useState(false);
    const [dragDirection, setDragDirection] = useState<'opening' | 'closing' | null>(null);

    const curtainContainerRef = useRef<HTMLDivElement>(null);

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
            } else {
                setLocalPosition(device.position || 0);
            }
        }
    }, [device.position, isDragging]);

    const handleCurtainDrag = (e: React.PointerEvent) => {
        if (!curtainContainerRef.current) return;
        const rect = curtainContainerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        let percentage = (x / rect.width) * 100;
        percentage = Math.max(0, Math.min(100, percentage));
        
        const newPos = Math.round(percentage);
        if (newPos > localPosition) {
            setDragDirection('opening');
        } else if (newPos < localPosition) {
            setDragDirection('closing');
        }
        
        setLocalPosition(newPos);
    };

    const handleCurtainPointerDown = (e: React.PointerEvent) => {
        e.preventDefault();
        // Clear any pending optimistic reset
        if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
        isWaitingForUpdate.current = false;
        waitingForType.current = null;
        lastCommittedValue.current = null;
        
        setIsDragging(true);
        (e.target as Element).setPointerCapture(e.pointerId);
        handleCurtainDrag(e);
    };

    const handleCurtainPointerMove = (e: React.PointerEvent) => {
        if (isDragging) {
           handleCurtainDrag(e);
        }
    };

    const handleCurtainPointerUp = (e: React.PointerEvent) => {
        if (isDragging) {
            (e.target as Element).releasePointerCapture(e.pointerId);
            handleCommit('position', [localPosition]);
            // Note: setIsDragging(false) is handled inside handleCommit
        }
    };

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
        >
            <DeviceCardHeader device={device} onToggle={handleToggleWrapper} value={localPosition} />
            
            {/* Controls Area - Flex 1 to push to bottom */}
            <div className="flex-1 flex flex-col justify-end gap-3 pb-0.5">
               <div className="flex-1 flex flex-col gap-2 mt-1 mb-0.5 h-full">
                  {/* Curtain Visual & Interaction Area */}
                  <div 
                    ref={curtainContainerRef}
                    className="flex-1 relative flex flex-col overflow-hidden rounded-[12px] bg-accent/20 cursor-ew-resize touch-none select-none group/curtain"
                    onPointerDown={handleCurtainPointerDown}
                    onPointerMove={handleCurtainPointerMove}
                    onPointerUp={handleCurtainPointerUp}
                    onPointerCancel={handleCurtainPointerUp}
                  >
                      {/* Percentage Display (Moved to top area) */}
                      <div className="absolute inset-x-0 top-0 h-[20%] flex flex-col items-center justify-center z-10 pointer-events-none">
                          <span className="text-[13px] font-semibold text-foreground/90 tracking-tight drop-shadow-sm tabular-nums">
                              {localPosition}%
                          </span>
                      </div>

                      {/* Interactive Arrows Overlay - Following Curtain Edges */}
                      <div className="absolute inset-0 z-20 pointer-events-none">
                          {/* Left Arrow (Follows Left Panel Edge) */}
                          <div 
                              className="absolute top-[60%] -translate-y-1/2 transition-all duration-300 ease-out"
                              style={{ left: `${panelWidthPercent}%`, transform: 'translate(-50%, -50%)' }}
                          >
                              <div className="bg-background/80 backdrop-blur-sm rounded-full p-1 shadow-sm border border-border/10 opacity-0 group-hover/curtain:opacity-100 transition-opacity duration-300">
                                  {showOutwards ? (
                                      <ChevronLeft className="w-3.5 h-3.5 text-foreground/80" />
                                  ) : (
                                      <ChevronRight className="w-3.5 h-3.5 text-foreground/80" />
                                  )}
                              </div>
                          </div>

                          {/* Right Arrow (Follows Right Panel Edge) */}
                          <div 
                              className="absolute top-[60%] -translate-y-1/2 transition-all duration-300 ease-out"
                              style={{ right: `${panelWidthPercent}%`, transform: 'translate(50%, -50%)' }}
                          >
                              <div className="bg-background/80 backdrop-blur-sm rounded-full p-1 shadow-sm border border-border/10 opacity-0 group-hover/curtain:opacity-100 transition-opacity duration-300">
                                  {showOutwards ? (
                                      <ChevronRight className="w-3.5 h-3.5 text-foreground/80" />
                                  ) : (
                                      <ChevronLeft className="w-3.5 h-3.5 text-foreground/80" />
                                  )}
                              </div>
                          </div>
                      </div>

                      {/* Dynamic Curtain Visual Background (Moved to bottom area) */}
                      <div className="absolute inset-x-5 bottom-0 h-[80%] pointer-events-none opacity-80">
                          <LargeCurtainVisual position={localPosition} />
                      </div>
                  </div>
               </div>
            </div>
        </DeviceCardWrapper>
    );
}
