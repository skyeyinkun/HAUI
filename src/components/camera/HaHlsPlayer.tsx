import React, { useEffect, useRef } from 'react';
import Hls from 'hls.js';

interface HaHlsPlayerProps {
    url: string;
}

export const HaHlsPlayer: React.FC<HaHlsPlayerProps> = ({ url }) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    // =========================================================================
    // 【注释：我是如何获取 Home Assistant 中的代理 m3u8 url 的？】
    // =========================================================================
    // 1. WebSocket API: 
    //    向 HA 发送 { "type": "camera/stream", "entity_id": "camera.my_cam" }
    //    HA websocket 会响应并返回一个 token 或分配的一个 URL：如 "/api/hls/xxxxx"
    // 
    // 2. Service Call:
    //    触发服务 camera.play_stream 给指定的 entity_id，HA 会启动对应的 RTSP 转交或者 HLS 代理。
    // 
    // 3. 将返回的相对或绝对路径 (如 "/api/hls/xxxxxxxx") 透传到这里的 url 属性即可。
    // =========================================================================

    useEffect(() => {
        let hls: Hls | null = null;
        const video = videoRef.current;

        if (video) {
            // 利用 hls.js 来播放在大部分环境(特别是 PC/Android Chrome)中不支持的 HLS m3u8 流
            if (Hls.isSupported()) {
                hls = new Hls({
                    // 对于监控和直播强烈建议启用极低延迟功能
                    lowLatencyMode: true,
                    liveSyncDurationCount: 3, 
                });
                
                hls.loadSource(url);
                hls.attachMedia(video);
                
                hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    // 解析完成尝试硬性自动播放。注意 muted 属性是必需的
                    video.play().catch(e => console.error("HLS 自动播放被浏览器拦截:", e));
                });
                
                // 处理网络中断或者视频错误自动重连机制
                hls.on(Hls.Events.ERROR, function (event, data) {
                    if (data.fatal) {
                        switch (data.type) {
                            case Hls.ErrorTypes.NETWORK_ERROR:
                                console.warn("HLS 网络错误，尝试拉流恢复...");
                                hls?.startLoad();
                                break;
                            case Hls.ErrorTypes.MEDIA_ERROR:
                                console.warn("HLS 帧解析错误，尝试恢复层级...");
                                hls?.recoverMediaError();
                                break;
                            default:
                                hls?.destroy();
                                break;
                        }
                    }
                });
            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                // 原生支持 HLS (如 iOS Safari)
                video.src = url;
                video.addEventListener('loadedmetadata', () => {
                    video.play().catch(e => console.error("苹果原生 HLS 自动播放失败:", e));
                });
            }
        }

        // =========================================================
        // 【核心生命周期】当组件卸载 / 多窗口关闭 / 或者更换 URL 时清理
        // 彻底释放缓存、网络请求与解旋器。
        // 不加这句话极容易导致整个 Addon UI 卡死内存爆炸
        // =========================================================
        return () => {
            if (hls) {
                hls.destroy();
                hls = null;
            }
            if (video) {
                video.removeAttribute('src'); 
                video.load();
            }
        };
    }, [url]);

    return (
        <video 
            ref={videoRef} 
            className="w-full h-full object-contain bg-black pointer-events-auto" 
            controls 
            muted 
            autoPlay 
            playsInline
        />
    );
};
