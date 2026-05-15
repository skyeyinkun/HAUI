import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls, { type ErrorData } from 'hls.js/light';
import { RefreshCw, Wifi, WifiOff } from 'lucide-react';

interface Go2RtcPlayerProps {
    go2rtcUrl: string;
    streamName: string;
}

/** 播放器状态类型 */
type PlayerState = 'connecting' | 'playing' | 'error' | 'fallback-hls';

/** WebRTC SDP 交换超时时间（毫秒） */
const WEBRTC_TIMEOUT = 5000;

export const Go2RtcPlayer: React.FC<Go2RtcPlayerProps> = ({ go2rtcUrl, streamName }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const hlsRef = useRef<Hls | null>(null);
    const mountedRef = useRef(true);

    const [playerState, setPlayerState] = useState<PlayerState>('connecting');
    const [errorMessage, setErrorMessage] = useState('');

    // 清理 go2rtc 基础 URL（去除尾部斜杠）
    const baseUrl = go2rtcUrl.endsWith('/') ? go2rtcUrl.slice(0, -1) : go2rtcUrl;

    /** 清理所有播放资源 */
    const cleanup = useCallback(() => {
        // 关闭 WebRTC
        if (pcRef.current) {
            pcRef.current.close();
            pcRef.current = null;
        }
        // 销毁 HLS 实例
        if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
        }
        // 清理 video 元素
        const video = videoRef.current;
        if (video) {
            video.srcObject = null;
            video.removeAttribute('src');
            video.load();
        }
    }, []);

    /** 启动 HLS 回退播放 */
    const startHlsFallback = useCallback(() => {
        if (!mountedRef.current) return;
        const video = videoRef.current;
        if (!video) return;

        setPlayerState('fallback-hls');
        const hlsUrl = `${baseUrl}/api/stream.m3u8?src=${encodeURIComponent(streamName)}`;

        if (Hls.isSupported()) {
            const hls = new Hls({
                lowLatencyMode: true,
                liveSyncDurationCount: 3,
            });
            hlsRef.current = hls;
            hls.loadSource(hlsUrl);
            hls.attachMedia(video);

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                video.play().catch(e => console.error('HLS 自动播放被拦截:', e));
                if (mountedRef.current) setPlayerState('playing');
            });

            hls.on(Hls.Events.ERROR, (_event, data: ErrorData) => {
                if (data.fatal) {
                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            console.warn('go2rtc HLS 网络错误，尝试恢复...');
                            hls.startLoad();
                            break;
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            console.warn('go2rtc HLS 帧解析错误，尝试恢复...');
                            hls.recoverMediaError();
                            break;
                        default:
                            if (mountedRef.current) {
                                setPlayerState('error');
                                setErrorMessage('HLS 播放失败');
                            }
                            hls.destroy();
                            break;
                    }
                }
            });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            // iOS Safari 原生 HLS 支持
            video.src = hlsUrl;
            video.addEventListener('loadedmetadata', () => {
                video.play().catch(e => console.error('原生 HLS 播放失败:', e));
                if (mountedRef.current) setPlayerState('playing');
            }, { once: true });
        } else {
            if (mountedRef.current) {
                setPlayerState('error');
                setErrorMessage('当前浏览器不支持 HLS 播放');
            }
        }
    }, [baseUrl, streamName]);

    /** 启动 WebRTC 连接 */
    const startWebRTC = useCallback(async () => {
        if (!mountedRef.current) return;
        cleanup();
        setPlayerState('connecting');
        setErrorMessage('');

        const video = videoRef.current;
        if (!video) return;

        try {
            const pc = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
            });
            pcRef.current = pc;

            // 添加 recvonly transceiver（只接收视频和音频）
            pc.addTransceiver('video', { direction: 'recvonly' });
            pc.addTransceiver('audio', { direction: 'recvonly' });

            // 监听远端 track，绑定到 video 元素
            pc.ontrack = (event) => {
                if (video.srcObject !== event.streams[0]) {
                    video.srcObject = event.streams[0];
                    video.play().catch(e => console.error('WebRTC 自动播放被拦截:', e));
                    if (mountedRef.current) setPlayerState('playing');
                }
            };

            // ICE 连接状态监控
            pc.oniceconnectionstatechange = () => {
                if (!mountedRef.current) return;
                if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
                    console.warn(`WebRTC ICE 状态: ${pc.iceConnectionState}，降级到 HLS`);
                    pc.close();
                    pcRef.current = null;
                    startHlsFallback();
                }
            };

            // 创建 SDP offer
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            // 使用 AbortController 控制超时
            const timeoutController = new AbortController();
            const timeoutId = setTimeout(() => timeoutController.abort(), WEBRTC_TIMEOUT);

            // 与 go2rtc 交换 SDP
            const response = await fetch(
                `${baseUrl}/api/webrtc?src=${encodeURIComponent(streamName)}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/sdp' },
                    body: offer.sdp,
                    signal: timeoutController.signal,
                }
            );
            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`go2rtc SDP 交换失败: HTTP ${response.status}`);
            }

            const answerSdp = await response.text();
            await pc.setRemoteDescription(new RTCSessionDescription({
                type: 'answer',
                sdp: answerSdp,
            }));

        } catch (error: any) {
            console.warn('WebRTC 连接失败，降级到 HLS:', error.message);
            // WebRTC 失败时自动降级到 HLS
            if (pcRef.current) {
                pcRef.current.close();
                pcRef.current = null;
            }
            if (mountedRef.current) {
                startHlsFallback();
            }
        }
    }, [baseUrl, streamName, cleanup, startHlsFallback]);

    /** 手动重试 */
    const handleRetry = useCallback(() => {
        startWebRTC();
    }, [startWebRTC]);

    // 主 effect：挂载时启动 WebRTC
    useEffect(() => {
        mountedRef.current = true;
        startWebRTC();

        return () => {
            mountedRef.current = false;
            cleanup();
        };
    }, [go2rtcUrl, streamName, startWebRTC, cleanup]);

    return (
        <div className="w-full h-full relative bg-black overflow-hidden">
            {/* 视频播放元素 */}
            <video
                ref={videoRef}
                className="w-full h-full object-contain bg-black pointer-events-auto"
                controls
                muted
                autoPlay
                playsInline
            />

            {/* 左下角状态指示器 */}
            <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-sm">
                {playerState === 'playing' && (
                    <>
                        <div className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="text-[10px] text-emerald-300">
                            {pcRef.current ? 'WebRTC' : 'HLS'}
                        </span>
                    </>
                )}
                {playerState === 'connecting' && (
                    <>
                        <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                        <span className="text-[10px] text-amber-300">连接中</span>
                    </>
                )}
                {playerState === 'fallback-hls' && (
                    <>
                        <div className="w-2 h-2 rounded-full bg-amber-400" />
                        <span className="text-[10px] text-amber-300">HLS 回退</span>
                    </>
                )}
                {playerState === 'error' && (
                    <>
                        <div className="w-2 h-2 rounded-full bg-red-400" />
                        <span className="text-[10px] text-red-300">离线</span>
                    </>
                )}
            </div>

            {/* 连接中覆盖层 */}
            {playerState === 'connecting' && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/70">
                    <Wifi className="w-8 h-8 text-amber-400 animate-pulse mb-3" />
                    <span className="text-xs text-neutral-300">正在建立 WebRTC 连接...</span>
                </div>
            )}

            {/* 错误覆盖层 */}
            {playerState === 'error' && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80">
                    <WifiOff className="w-8 h-8 text-red-400 mb-3" />
                    <span className="text-sm text-red-300 mb-1">go2rtc 连接失败</span>
                    {errorMessage && (
                        <span className="text-xs text-neutral-500 mb-4">{errorMessage}</span>
                    )}
                    <button
                        onClick={handleRetry}
                        className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl text-xs transition-colors"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                        重新连接
                    </button>
                </div>
            )}
        </div>
    );
};
