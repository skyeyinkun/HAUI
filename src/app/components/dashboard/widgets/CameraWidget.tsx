import React, { useMemo } from 'react';
import { CameraPlayer } from '@/components/camera/CameraPlayer';
import { CameraConfig } from '@/components/camera/types';
import { Camera, Settings2 } from 'lucide-react';
import { DashboardWidget } from '@/hooks/useDashboardLayout';

import { HAConfig } from '@/types/home-assistant';

interface CameraWidgetProps {
    widget: DashboardWidget;
    updateWidget: (id: string, updates: Partial<DashboardWidget>) => void;
    isEditing: boolean;
    haConfig?: HAConfig;
}

export function CameraWidget({ widget, updateWidget, isEditing, haConfig }: CameraWidgetProps) {
    const availableCameras: CameraConfig[] = haConfig?.cameras || [];
    const selectedCameraId = widget.config?.cameraId;
    
    const selectedCamera = useMemo(() => {
        return availableCameras.find(c => c.id === selectedCameraId);
    }, [selectedCameraId, availableCameras]);

    const handleSelectCamera = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const cameraId = e.target.value;
        if (cameraId) {
            updateWidget(widget.id, { 
                config: { ...widget.config, cameraId } 
            });
        }
    };

    // 如果未选择摄像头，展示配置界面
    if (!selectedCamera) {
        return (
            <div className="w-full h-full bg-card rounded-[16px] border shadow-sm flex flex-col items-center justify-center p-4 text-center group transition-colors">
                <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center mb-3">
                    <Camera size={24} />
                </div>
                {availableCameras.length > 0 ? (
                    <>
                        <h3 className="font-medium text-sm mb-1">未配置监控画面</h3>
                        <p className="text-xs text-muted-foreground mb-4">请选择要在该卡片中显示的摄像头</p>
                        <div className="relative w-full max-w-[200px]">
                            <select 
                                className="w-full bg-accent text-accent-foreground text-sm rounded-md px-3 py-2 outline-none appearance-none cursor-pointer border-r-8 border-transparent"
                                onChange={handleSelectCamera}
                                defaultValue=""
                            >
                                <option value="" disabled>选择监控摄像头...</option>
                                {availableCameras.map(cam => (
                                    <option key={cam.id} value={cam.id}>{cam.name}</option>
                                ))}
                            </select>
                        </div>
                    </>
                ) : (
                    <>
                        <h3 className="font-medium text-sm mb-1">暂无摄像头配置</h3>
                        <p className="text-xs text-muted-foreground">请先在系统设置中添加摄像头</p>
                    </>
                )}
            </div>
        );
    }

    // 如果已选择摄像头，渲染播放器
    return (
        <div className="w-full h-full rounded-[16px] overflow-hidden relative shadow-sm border border-border/40 group bg-black">
            <CameraPlayer config={selectedCamera} />
            {/* 在编辑模式下，或者当鼠标悬浮时提供重新配置选项，使用极简右上角按钮 */}
            <div className={`absolute top-2 right-10 z-20 transition-opacity duration-300 ${isEditing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                <div className="relative">
                     <select 
                        title="切换摄像头"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer text-xs"
                        onChange={handleSelectCamera}
                        value={selectedCameraId}
                    >
                        {availableCameras.map(cam => (
                             <option key={cam.id} value={cam.id}>{cam.name}</option>
                        ))}
                    </select>
                    <div className="bg-black/60 backdrop-blur-md p-1.5 rounded-md border border-neutral-700 pointer-events-none text-white shadow-lg">
                         <Settings2 size={13} />
                    </div>
                </div>
            </div>
        </div>
    );
}
