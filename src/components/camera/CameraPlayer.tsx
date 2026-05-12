import React, { useState } from 'react';
import { Maximize2, X, AlertTriangle, ShieldCheck } from 'lucide-react';
import { EzvizStreamPlayer } from './EzvizStreamPlayer';
import { HaHlsPlayer } from './HaHlsPlayer';
import { Go2RtcPlayer } from './Go2RtcPlayer';
import { CameraConfig } from './types';
import { getApiUrl } from '@/utils/sync';

interface CameraPlayerProps {
    config: CameraConfig;
    onRemove?: (id: string) => void;
}

export const CameraPlayer: React.FC<CameraPlayerProps> = ({ config, onRemove }) => {
    // hover 时显示顶层的把手栏跟控制按钮
    const [isHovered, setIsHovered] = useState(false);
    const [privacyUnlocked, setPrivacyUnlocked] = useState(!config.privacyMode);
    const haHlsUrl = config.url || (config.entityId ? getApiUrl(`/ha-api/api/camera_proxy_stream/${config.entityId}`) : '');
    const missingRtspConfig = config.type === 'rtsp' && (!config.go2rtcUrl || !config.streamName);
    const missingEzvizConfig = config.type === 'ezviz' && (!config.url || !config.accessToken);
    const missingHaConfig = config.type === 'ha-hls' && !haHlsUrl;

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
                    {onRemove && (
                        <button
                            onClick={() => onRemove(config.id)}
                            className="p-1.5 hover:bg-red-600/80 rounded-md backdrop-blur-md transition-all cursor-pointer border border-transparent hover:border-red-400"
                            title="从监控面板移除"
                        >
                            <X size={13} />
                        </button>
                    )}
                </div>
            </div>

            {/* 实况流播放区 (强制填充满 flex-1 并置于底面) */}
            <div className="flex-1 w-full relative z-0">
                {config.privacyMode && !privacyUnlocked && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-neutral-950 text-white">
                        <ShieldCheck className="mb-3 h-8 w-8 text-white/70" />
                        <div className="text-sm font-semibold">隐私模式已开启</div>
                        <button
                            type="button"
                            onClick={() => setPrivacyUnlocked(true)}
                            className="mt-4 rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#040415] transition-opacity hover:opacity-90"
                        >
                            显示画面
                        </button>
                    </div>
                )}

                {config.type === 'ezviz' && config.accessToken && config.url && privacyUnlocked && (
                    <EzvizStreamPlayer cameraId={config.id} url={config.url} accessToken={config.accessToken} />
                )}
                
                {config.type === 'ha-hls' && haHlsUrl && privacyUnlocked && (
                    <HaHlsPlayer url={haHlsUrl} muted={config.mutedByDefault !== false} />
                )}

                {/* RTSP 流通过 go2rtc 代理播放（WebRTC 优先，HLS 回退） */}
                {config.type === 'rtsp' && config.go2rtcUrl && config.streamName && privacyUnlocked && (
                    <Go2RtcPlayer go2rtcUrl={config.go2rtcUrl} streamName={config.streamName} />
                )}
                
                {/* 各种无参数错误状态呈现 */}
                {(missingHaConfig || missingEzvizConfig || missingRtspConfig) && (
                    <div className="flex flex-col items-center justify-center w-full h-full text-red-400 text-sm bg-black absolute top-0 left-0 p-4 text-center">
                        <AlertTriangle size={32} className="opacity-70 mb-2" />
                        <span className="font-semibold">摄像头配置不完整</span>
                        <span className="mt-1 max-w-[260px] text-xs text-neutral-400">
                            {config.type === 'rtsp'
                                ? '请补充 go2rtc 地址和流名称。'
                                : config.type === 'ezviz'
                                    ? '请确认萤石云 URL 和 AccessToken。'
                                    : '请配置 HA camera 实体或 HLS 地址。'}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};
