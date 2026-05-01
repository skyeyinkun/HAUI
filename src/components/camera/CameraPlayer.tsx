import React, { useState } from 'react';
import { Maximize2, X, AlertTriangle } from 'lucide-react';
import { EzvizStreamPlayer } from './EzvizStreamPlayer';
import { HaHlsPlayer } from './HaHlsPlayer';
import { Go2RtcPlayer } from './Go2RtcPlayer';
import { CameraConfig } from './types';

interface CameraPlayerProps {
    config: CameraConfig;
    onRemove: (id: string) => void;
}

export const CameraPlayer: React.FC<CameraPlayerProps> = ({ config, onRemove }) => {
    // hover 时显示顶层的把手栏跟控制按钮
    const [isHovered, setIsHovered] = useState(false);

    const handleFullscreen = () => {
        // 利用标准 DOM API 向整个父容器请求全屏
        const container = document.getElementById(`camera-card-${config.id}`);
        if (!container) return;
        
        // 使用类型断言调用各浏览器前缀的全屏方法
        const webkitContainer = container as unknown as { webkitRequestFullscreen?: () => void };
        const mozContainer = container as unknown as { mozRequestFullScreen?: () => void };
        const msContainer = container as unknown as { msRequestFullscreen?: () => void };
        
        if (container.requestFullscreen) {
            container.requestFullscreen().catch(() => {});
        } else if (webkitContainer.webkitRequestFullscreen) {
            webkitContainer.webkitRequestFullscreen();
        } else if (mozContainer.mozRequestFullScreen) {
            mozContainer.mozRequestFullScreen();
        } else if (msContainer.msRequestFullscreen) {
            msContainer.msRequestFullscreen();
        }
    };

    return (
        <div 
            id={`camera-card-${config.id}`}
            className="w-full h-full relative group bg-neutral-900 flex flex-col overflow-hidden rounded-md shadow-sm border border-neutral-800 transition-colors"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* 顶部控制蒙板层 (透明到渐变层) */}
            <div className={`absolute top-0 left-0 w-full p-2 flex justify-between items-center z-10 transition-opacity duration-300 pointer-events-none bg-gradient-to-b from-black/80 to-transparent ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
                {/* 
                  drag-handle 用来向 Dashboard 中的 react-grid-layout 表明只有拖拽这个 DOM 的时候才允许移动。这保证了视频播放器的操作条等不受干扰。 
                  pointer-events-auto 用于恢复鼠标点击/拖拽这块的权限 
                */}
                <div 
                    title="按住此处拖动窗口"
                    className="text-white text-xs font-semibold tracking-wide drag-handle cursor-move px-2 py-1 select-none flex-1 truncate pointer-events-auto"
                >
                    {config.name}
                </div>
                
                <div className="flex gap-2 text-white shrink-0 ml-2 pointer-events-auto">
                    {/* 全屏当前摄像头 */}
                    <button 
                        onClick={handleFullscreen} 
                        className="p-1.5 hover:bg-black/50 rounded-md backdrop-blur-md transition-all cursor-pointer border border-transparent hover:border-neutral-500"
                        title="全屏放大"
                    >
                        <Maximize2 size={13} />
                    </button>
                    {/* 关闭并销毁该窗口进程 (触发 Dashboard onRemove, 然后引发 unmount 释放该子视频内存) */}
                    <button 
                        onClick={() => onRemove(config.id)} 
                        className="p-1.5 hover:bg-red-600/80 rounded-md backdrop-blur-md transition-all cursor-pointer border border-transparent hover:border-red-400"
                        title="从监控面板移除"
                    >
                        <X size={13} />
                    </button>
                </div>
            </div>

            {/* 实况流播放区 (强制填充满 flex-1 并置于底面) */}
            <div className="flex-1 w-full relative z-0">
                {config.type === 'ezviz' && config.accessToken && config.url && (
                    <EzvizStreamPlayer cameraId={config.id} url={config.url} accessToken={config.accessToken} />
                )}
                
                {config.type === 'ha-hls' && config.url && (
                    <HaHlsPlayer url={config.url} />
                )}

                {/* RTSP 流通过 go2rtc 代理播放（WebRTC 优先，HLS 回退） */}
                {config.type === 'rtsp' && config.go2rtcUrl && config.streamName && (
                    <Go2RtcPlayer go2rtcUrl={config.go2rtcUrl} streamName={config.streamName} />
                )}
                
                {/* 各种无参数错误状态呈现 */}
                {(!config.url && config.type !== 'rtsp') && (
                    <div className="flex flex-col items-center justify-center w-full h-full text-red-500 text-sm bg-black absolute top-0 left-0">
                        <AlertTriangle size={32} className="opacity-70 mb-2" />
                        <span className="opacity-80">当前设备的串流基础参数或 URL 丢失/错误</span>
                    </div>
                )}
            </div>
        </div>
    );
};
