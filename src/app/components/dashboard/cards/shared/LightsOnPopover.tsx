import React from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Lightbulb, Power, X } from 'lucide-react';
import { Device } from '@/types/device';

interface LightsOnPopoverProps {
    lightsOnDevices: Device[];
    onTurnOff: (deviceId: number) => void;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: React.ReactNode;
}

/**
 * 灯光列表弹窗
 * 展示当前所有开启状态的灯光设备，支持逐个点击关闭
 */
export function LightsOnPopover({ lightsOnDevices, onTurnOff, open, onOpenChange, children }: LightsOnPopoverProps) {
    return (
        <Popover.Root open={open} onOpenChange={onOpenChange}>
            <Popover.Trigger asChild>
                {children}
            </Popover.Trigger>
            <Popover.Portal>
                <Popover.Content
                    className="z-[100] outline-none"
                    align="end"
                    side="bottom"
                    sideOffset={8}
                    collisionPadding={12}
                >
                    <div className="bg-card border border-border/30 rounded-2xl shadow-2xl overflow-hidden w-[280px] max-h-[360px] flex flex-col animate-in fade-in slide-in-from-top-2 duration-200">
                        {/* 弹窗头部 */}
                        <div className="px-4 py-3 border-b border-border/20 flex items-center justify-between bg-amber-500/5">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
                                    <Lightbulb className="w-4 h-4 text-amber-500" />
                                </div>
                                <div>
                                    <div className="text-[13px] font-semibold text-foreground">灯光控制</div>
                                    <div className="text-[10px] text-muted-foreground">{lightsOnDevices.length} 盏灯正在开启</div>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => onOpenChange(false)}
                                className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-accent text-muted-foreground transition-colors"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {/* 灯光设备列表 */}
                        <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin scrollbar-thumb-muted-foreground/10">
                            {lightsOnDevices.length === 0 ? (
                                <div className="py-8 text-center text-[12px] text-muted-foreground/50">
                                    所有灯光已关闭
                                </div>
                            ) : (
                                lightsOnDevices.map(device => (
                                    <div
                                        key={device.id}
                                        className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-accent/30 transition-colors group/light"
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                            {/* 灯光图标：开启状态为亮黄色 */}
                                            <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
                                                <Lightbulb className="w-4 h-4 text-amber-500" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="text-[13px] font-medium text-foreground truncate">
                                                    {device.customName || device.name}
                                                </div>
                                                <div className="text-[10px] text-muted-foreground truncate">
                                                    {device.room || '未分配房间'}
                                                    {device.brightness !== undefined && device.brightness > 0 && (
                                                        <span className="ml-1.5 text-amber-500/80">
                                                            亮度 {Math.round((device.brightness / 255) * 100)}%
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* 关灯按钮 */}
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onTurnOff(device.id);
                                            }}
                                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-amber-500 hover:bg-red-500/10 hover:text-red-500 transition-all opacity-60 group-hover/light:opacity-100"
                                            title={`关闭 ${device.customName || device.name}`}
                                        >
                                            <Power className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* 底部：全部关闭按钮 */}
                        {lightsOnDevices.length > 1 && (
                            <div className="px-3 py-2.5 border-t border-border/20">
                                <button
                                    type="button"
                                    onClick={() => {
                                        // 逐个关闭所有灯光
                                        lightsOnDevices.forEach(d => onTurnOff(d.id));
                                        onOpenChange(false);
                                    }}
                                    className="w-full py-2 rounded-xl text-[12px] font-medium text-red-500 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 transition-colors"
                                >
                                    全部关闭
                                </button>
                            </div>
                        )}
                    </div>
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
}
