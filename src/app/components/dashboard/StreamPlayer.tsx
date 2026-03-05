/**
 * StreamPlayer —— 摄像头流媒体播放器
 *
 * 支持的接入方式和协议：
 *   ┌─────────────┬────────────────────────────────────────────────────┐
 *   │ sourceType  │ 实现方案                                           │
 *   ├─────────────┼────────────────────────────────────────────────────┤
 *   │ hass        │ MJPEG fetch stream (HA camera_proxy API)           │
 *   │             │ 或 HLS (HA camera/stream API, 需 stream 集成)      │
 *   ├─────────────┼────────────────────────────────────────────────────┤
 *   │ ezviz       │ 直调萤石开放平台 API 获取 HLS 地址，hls.js 播放   │
 *   ├─────────────┼────────────────────────────────────────────────────┤
 *   │ rtsp        │ http://... → mpegts.js (FLV) 或 hls.js (HLS)      │
 *   │             │ rtsp://... → go2rtc 代理 → WebRTC / HLS / FLV     │
 *   ├─────────────┼────────────────────────────────────────────────────┤
 *   │ onvif       │ go2rtc ONVIF 源 → WebRTC / HLS / FLV              │
 *   ├─────────────┼────────────────────────────────────────────────────┤
 *   │ aqara       │ 云端 API / 局域网直连 → HLS or MJPEG              │
 *   └─────────────┴────────────────────────────────────────────────────┘
 *
 * 播放器引擎优先级：
 *   WebRTC (go2rtc) > hls.js (HLS/m3u8) > mpegts.js (HTTP-FLV) > <img> (MJPEG/snapshot)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import Hls from 'hls.js';
import mpegts from 'mpegts.js';
import { RefreshCw, Video, WifiOff, AlertTriangle } from 'lucide-react';
import type { CameraConfig } from '@/types/camera';
import { getEzvizStreamUrl, clearEzvizTokenCache } from '@/services/ezviz-api';

// ─── Props ──────────────────────────────────────────────────────────────────

interface StreamPlayerProps {
    cam: CameraConfig;
    /** HA Base URL，例如 /ha-api 或 http://homeassistant.local:8123 */
    haBaseUrl?: string;
    /** HA Long-Lived Token，用于请求 camera stream */
    haToken?: string;
    /** 外部刷新版本号，变化时触发重新加载 */
    refreshKey: number;
    className?: string;
}

// ─── 播放器渲染模式 ───────────────────────────────────────────────────────

type PlayerMode =
    | 'webrtc'    // go2rtc WebRTC（最低延迟）
    | 'hls'       // hls.js 播放 m3u8
    | 'flv'       // mpegts.js 播放 HTTP-FLV
    | 'mjpeg'     // <img> MJPEG 图片流
    | 'snapshot'  // <img> 静态帧快照（轮询刷新）
    | 'idle';     // 空闲，等待输入

interface StreamState {
    mode: PlayerMode;
    url: string;
}

// ─── WebRTC 辅助（go2rtc） ──────────────────────────────────────────────────

/**
 * 通过 go2rtc HTTP API 建立 WebRTC 连接
 * go2rtc WebRTC API 使用 whip/whep 简化协议，浏览器原生支持
 * 文档：https://github.com/AlexxIT/go2rtc#webrtc
 */
async function connectWebRTC(
    apiUrl: string,
    streamName: string,
    videoEl: HTMLVideoElement,
    signal: AbortSignal,
): Promise<RTCPeerConnection> {
    // 创建 PeerConnection，使用 go2rtc 提供的 STUN 服务器
    const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        bundlePolicy: 'max-bundle',
    });

    // 添加接收器，声明需要接收音视频
    pc.addTransceiver('video', { direction: 'recvonly' });
    pc.addTransceiver('audio', { direction: 'recvonly' });

    // 将媒体流绑定到 video 元素
    pc.ontrack = (evt) => {
        if (videoEl.srcObject !== evt.streams[0]) {
            videoEl.srcObject = evt.streams[0];
        }
    };

    // 生成本地 SDP Offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // 等待 ICE 候选收集完成（最多 2s，避免卡住）
    await new Promise<void>((resolve) => {
        if (pc.iceGatheringState === 'complete') return resolve();
        const timer = setTimeout(resolve, 2000);
        pc.onicegatheringstatechange = () => {
            if (pc.iceGatheringState === 'complete') {
                clearTimeout(timer);
                resolve();
            }
        };
    });

    if (signal.aborted) {
        pc.close();
        throw new DOMException('Aborted', 'AbortError');
    }

    // 向 go2rtc 发送 Offer，换取 Answer
    const base = apiUrl.replace(/\/$/, '');
    const resp = await fetch(`${base}/api/webrtc?src=${encodeURIComponent(streamName)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/sdp' },
        body: pc.localDescription!.sdp,
        signal,
    });

    if (!resp.ok) {
        pc.close();
        throw new Error(`go2rtc WebRTC 握手失败: HTTP ${resp.status}`);
    }

    const answerSdp = await resp.text();
    await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

    return pc;
}

/**
 * 根据 go2rtc 配置构造流地址（HLS / FLV fallback）
 */
function buildGo2rtcUrl(apiUrl: string, streamName: string, protocol: 'hls' | 'flv'): string {
    const base = apiUrl.replace(/\/$/, '');
    if (protocol === 'hls') {
        // go2rtc HLS 端点
        return `${base}/api/stream.m3u8?src=${encodeURIComponent(streamName)}`;
    }
    // go2rtc FLV 端点
    return `${base}/api/stream.flv?src=${encodeURIComponent(streamName)}`;
}

// ─── 主组件 ─────────────────────────────────────────────────────────────────

export default function StreamPlayer({
    cam,
    haBaseUrl,
    haToken,
    refreshKey,
    className = '',
}: StreamPlayerProps) {
    const [stream, setStream] = useState<StreamState | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    // 重试追踪（协议降级用）
    const retryCountRef = useRef(0);

    // DOM 引用
    const videoRef = useRef<HTMLVideoElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // 播放器引擎实例
    const hlsRef = useRef<Hls | null>(null);
    const flvRef = useRef<mpegts.Player | null>(null);
    const rtcRef = useRef<RTCPeerConnection | null>(null);
    // 用于取消正在进行的异步操作
    const abortRef = useRef<AbortController>(new AbortController());

    // ── 清理所有播放器引擎 ───────────────────────────────────────────────────
    const destroyPlayers = useCallback(() => {
        // 中断正在进行的 WebRTC / fetch 请求
        abortRef.current.abort();
        abortRef.current = new AbortController();

        if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
        }
        if (flvRef.current) {
            flvRef.current.destroy();
            flvRef.current = null;
        }
        if (rtcRef.current) {
            rtcRef.current.close();
            rtcRef.current = null;
        }
        // 清理 video srcObject，避免内存泄漏
        if (videoRef.current) {
            videoRef.current.srcObject = null;
            videoRef.current.src = '';
        }
    }, []);

    // ── 第一阶段：解析配置 → 获取流地址 ────────────────────────────────────
    useEffect(() => {
        let cancelled = false;
        destroyPlayers();
        setLoading(true);
        setError(null);
        setStream(null);
        retryCountRef.current = 0;

        const resolve = async () => {
            try {
                const base = haBaseUrl || '/ha-api';

                switch (cam.sourceType) {

                    // ── Home Assistant ─────────────────────────────────────────────
                    case 'hass': {
                        if (!cam.hass?.entityId) throw new Error('未配置 HA 实体 ID');
                        const entityId = cam.hass.entityId;
                        const streamMode = cam.hass?.streamMode || 'snapshot';

                        if (streamMode === 'stream') {
                            // 尝试通过 HA camera/stream 获取 HLS 播放地址
                            // HA 需要安装 stream 集成（默认内置）
                            const headers: Record<string, string> = {};
                            if (haToken) headers['Authorization'] = `Bearer ${haToken}`;

                            try {
                                const res = await fetch(
                                    `${base}/api/camera_proxy_stream/${entityId}`,
                                    { headers, signal: abortRef.current.signal },
                                );
                                // camera_proxy_stream 返回的是 MJPEG 多部分流
                                if (res.ok && res.headers.get('content-type')?.includes('multipart')) {
                                    if (!cancelled) setStream({ mode: 'mjpeg', url: `${base}/api/camera_proxy_stream/${entityId}` });
                                    return;
                                }
                            } catch { /* 降级到 snapshot */ }

                            // HLS stream 模式（部分 HA 版本支持）
                            if (!cancelled) setStream({ mode: 'hls', url: `${base}/api/camera/stream/${entityId}` });
                        } else {
                            // MJPEG 快照流（最兼容）
                            if (!cancelled) setStream({
                                mode: 'mjpeg',
                                url: `${base}/api/camera_proxy_stream/${entityId}?token=${haToken || ''}`,
                            });
                        }
                        break;
                    }

                    // ── 萤石云 ─────────────────────────────────────────────────────
                    case 'ezviz': {
                        const cfg = cam.ezviz;
                        if (!cfg?.appKey || !cfg?.appSecret || !cfg?.deviceSerial) {
                            throw new Error('请完善萤石云配置（AppKey / AppSecret / 序列号）');
                        }
                        // 萨石云协议：默认 HLS(2)，FLV(3) 作为备选
                        const protocol = cfg.protocol ?? 2;
                        const url = await getEzvizStreamUrl(
                            cfg.appKey,
                            cfg.appSecret,
                            cfg.deviceSerial,
                            cfg.channelNo ?? 1,
                            protocol,
                            cfg.validateCode,
                        );
                        if (!cancelled) {
                            // protocol=3 为 FLV，其余全部用 HLS 播放
                            setStream({ mode: protocol === 3 ? 'flv' : 'hls', url });
                        }
                        break;
                    }

                    // ── RTSP ──────────────────────────────────────────────────────
                    case 'rtsp': {
                        const cfg = cam.rtsp;
                        if (!cfg?.streamUrl) throw new Error('请填写流地址');
                        const url = cfg.streamUrl.trim();

                        if (url.startsWith('rtsp://') || url.startsWith('rtsps://')) {
                            // 原生 RTSP 无法在浏览器播放，必须通过 go2rtc 代理
                            if (!cfg.go2rtc?.apiUrl || !cfg.go2rtc?.streamName) {
                                throw new Error(
                                    'RTSP 协议需配置 go2rtc 代理\n建议：安装 go2rtc Add-on → 填入 API 地址和流名称',
                                );
                            }
                            const protocol = cfg.go2rtc.preferredProtocol || 'webrtc';
                            if (protocol === 'webrtc') {
                                // WebRTC 模式：在播放器 effect 里连接，这里只传递配置标记
                                if (!cancelled) setStream({
                                    mode: 'webrtc',
                                    url: `${cfg.go2rtc.apiUrl}|${cfg.go2rtc.streamName}`,
                                });
                            } else {
                                const proxyUrl = buildGo2rtcUrl(cfg.go2rtc.apiUrl, cfg.go2rtc.streamName, protocol);
                                if (!cancelled) setStream({ mode: protocol, url: proxyUrl });
                            }
                        } else if (url.startsWith('http')) {
                            // HTTP 流 —— 识别 FLV 或 HLS（m3u8）
                            const mode: PlayerMode = url.includes('.m3u8') ? 'hls' : url.includes('.flv') ? 'flv' : 'mjpeg';
                            if (!cancelled) setStream({ mode, url });
                        } else {
                            if (!cancelled) setStream({ mode: 'hls', url });
                        }
                        break;
                    }

                    // ── ONVIF ─────────────────────────────────────────────────────
                    case 'onvif': {
                        const cfg = cam.onvif;
                        if (!cfg?.host || !cfg?.username || !cfg?.password) {
                            throw new Error('请完善 ONVIF 配置（IP / 用户名 / 密码）');
                        }
                        if (!cfg.go2rtc?.apiUrl || !cfg.go2rtc?.streamName) {
                            throw new Error(
                                'ONVIF 需配置 go2rtc 代理\n' +
                                '步骤：1. 安装 go2rtc  2. 在 go2rtc 中添加 ONVIF 流  3. 填入代理地址和流名称',
                            );
                        }
                        const protocol = cfg.go2rtc.preferredProtocol || 'webrtc';
                        if (protocol === 'webrtc') {
                            if (!cancelled) setStream({
                                mode: 'webrtc',
                                url: `${cfg.go2rtc.apiUrl}|${cfg.go2rtc.streamName}`,
                            });
                        } else {
                            const proxyUrl = buildGo2rtcUrl(cfg.go2rtc.apiUrl, cfg.go2rtc.streamName, protocol);
                            if (!cancelled) setStream({ mode: protocol, url: proxyUrl });
                        }
                        break;
                    }

                    // ── Aqara ─────────────────────────────────────────────────────
                    case 'aqara': {
                        const cfg = cam.aqara;
                        if (!cfg) throw new Error('请完善 Aqara 配置');
                        if (cfg.mode === 'cloud') {
                            if (!cfg.accessToken || !cfg.deviceDid) {
                                throw new Error('请填写 Aqara AccessToken 和设备 DID');
                            }
                            // Aqara 云端 API 需要后端代理（存在 CORS 限制）
                            // 此处提示用户通过 HA Aqara 集成中转
                            throw new Error(
                                'Aqara 云端模式需后端签名，建议：\n通过 HA Aqara 集成添加摄像头后，改用「Home Assistant」方式接入',
                            );
                        } else {
                            // 局域网直连 —— 大多数 Aqara 摄像头支持 RTSP
                            if (!cfg.host) throw new Error('请填写 Aqara 设备 IP 地址');
                            const streamPath = cfg.streamType === 'sub' ? 'sub' : 'main';
                            const user = cfg.username || 'admin';
                            const pass = cfg.password || '';
                            const rtspUrl = `rtsp://${user}:${pass}@${cfg.host}:${cfg.port || 554}/${streamPath}`;
                            throw new Error(
                                `Aqara 局域网直连地址为:\n${rtspUrl}\n\n浏览器无法直接播放 RTSP，请在 go2rtc 中添加此流后改用 RTSP 方式接入`,
                            );
                        }
                    }

                    default:
                        throw new Error('不支持的接入类型');
                }
            } catch (e: any) {
                if (!cancelled && e?.name !== 'AbortError') {
                    setError(e.message || '未知错误');
                    setLoading(false);
                }
            }
        };

        resolve();
        return () => {
            cancelled = true;
            destroyPlayers();
        };
    }, [cam.id, cam.sourceType, refreshKey, haBaseUrl, haToken, destroyPlayers]);

    // ── 第二阶段：根据 stream.mode 初始化播放引擎 ───────────────────────────
    useEffect(() => {
        if (!stream) return;

        const { mode, url } = stream;

        // ── WebRTC ──────────────────────────────────────────────────────────
        if (mode === 'webrtc') {
            const [apiUrl, streamName] = url.split('|');
            const videoEl = videoRef.current;
            if (!videoEl) return;

            const signal = abortRef.current.signal;

            connectWebRTC(apiUrl, streamName, videoEl, signal)
                .then((pc) => {
                    rtcRef.current = pc;
                    // 监听连接断开，触发重试
                    pc.onconnectionstatechange = () => {
                        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
                            setError('WebRTC 连接断开');
                            setLoading(false);
                        }
                    };
                    videoEl.play().catch(() => {
                        // 自动播放策略阻止 → 静音后重试
                        videoEl.muted = true;
                        videoEl.play().catch(console.error);
                    });
                    setLoading(false);
                })
                .catch((err) => {
                    if (err?.name === 'AbortError') return;
                    console.error('[WebRTC] 连接失败，降级到 HLS:', err);
                    // WebRTC 失败 → 降级到 go2rtc HLS
                    const [fallApiUrl, fallStreamName] = url.split('|');
                    const fallUrl = buildGo2rtcUrl(fallApiUrl, fallStreamName, 'hls');
                    setStream({ mode: 'hls', url: fallUrl });
                });

            return;
        }

        // ── HLS (hls.js) ────────────────────────────────────────────────────
        if (mode === 'hls') {
            const videoEl = videoRef.current;
            if (!videoEl) return;

            if (!Hls.isSupported()) {
                // Safari 原生支持 HLS，直接赋值 src
                if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
                    videoEl.src = url;
                    videoEl.muted = true;
                    videoEl.play().catch(console.error);
                    setLoading(false);
                    return;
                }
                setError('当前浏览器不支持 HLS 播放');
                setLoading(false);
                return;
            }

            const hls = new Hls({
                // 实时直播优化配置
                liveSyncDurationCount: 2,       // 保持 2 个分片的延迟
                liveMaxLatencyDurationCount: 5, // 最大 5 个分片延迟
                maxBufferLength: 10,            // 最大缓冲 10s
                enableWorker: true,
                lowLatencyMode: true,
            });
            hlsRef.current = hls;

            hls.loadSource(url);
            hls.attachMedia(videoEl);

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                videoEl.muted = true;
                videoEl.play().catch(console.error);
                setLoading(false);
            });

            hls.on(Hls.Events.ERROR, (_evt, data) => {
                if (data.fatal) {
                    console.error('[HLS] 致命错误:', data.type, data.details);
                    if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                        // 网络错误，尝试恢复
                        hls.startLoad();
                    } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
                        hls.recoverMediaError();
                    } else {
                        setError('HLS 流加载失败，请检查流地址是否可访问');
                        setLoading(false);
                    }
                }
            });

            return () => {
                hls.destroy();
                hlsRef.current = null;
            };
        }

        // ── FLV / HTTP-FLV (mpegts.js) ─────────────────────────────────────
        if (mode === 'flv') {
            const videoEl = videoRef.current;
            if (!videoEl) return;

            if (!mpegts.getFeatureList().mseLivePlayback) {
                setError('当前浏览器不支持 MSE，无法播放 HTTP-FLV');
                setLoading(false);
                return;
            }

            const player = mpegts.createPlayer(
                {
                    type: 'flv',
                    url,
                    isLive: true,
                    hasAudio: true,
                    hasVideo: true,
                },
                {
                    // 实时低延迟配置
                    enableWorker: true,
                    lazyLoadMaxDuration: 3 * 60,
                    seekType: 'range',
                    stashInitialSize: 128,        // 小初始缓冲减少延迟
                    liveBufferLatencyChasing: true,
                    liveBufferLatencyMaxLatency: 3.0,
                    liveBufferLatencyMinRemain: 0.5,
                },
            );
            flvRef.current = player;
            player.attachMediaElement(videoEl);
            player.load();

            player.on(mpegts.Events.ERROR, (errType, errDetail) => {
                console.error('[FLV] 错误:', errType, errDetail);
                setError(`FLV 流出错: ${errDetail?.msg || errType}`);
                setLoading(false);
            });

            videoEl.muted = true;
            videoEl
                .play()
                .then(() => setLoading(false))
                .catch((err) => {
                    console.error('[FLV] 播放失败:', err);
                    setError('FLV 流播放失败');
                    setLoading(false);
                });

            return () => {
                player.destroy();
                flvRef.current = null;
            };
        }

        // ── MJPEG / snapshot 不需要 JS 播放引擎，由 <img> 原生处理 ─────────
        if (mode === 'mjpeg' || mode === 'snapshot') {
            setLoading(false);
        }
    }, [stream]);

    // ── 萤石云 Token 过期刷新 ────────────────────────────────────────────────
    const handleEzvizRetry = useCallback(() => {
        if (cam.sourceType === 'ezviz' && cam.ezviz?.appKey) {
            clearEzvizTokenCache(cam.ezviz.appKey);
        }
        setError(null);
        setLoading(true);
        setStream(null);
        retryCountRef.current++;
        // 通过改变 stream → null 触发第一阶段 effect 重新运行
        // 实际重新触发依赖 refreshKey，这里通过 forceReset 标记
        setForceReset((n) => n + 1);
    }, [cam]);
    const [forceReset, setForceReset] = useState(0);

    // forceReset 变化时重新获取流
    useEffect(() => {
        if (forceReset === 0) return;
        // 触发 stream 解析 effect 重新执行（通过清空 stream）
        setStream(null);
    }, [forceReset]);

    // ── 错误/空闲 UI ─────────────────────────────────────────────────────────
    if (error) {
        const isConfigError = error.includes('请') || error.includes('配置') || error.includes('go2rtc') || error.includes('RTSP');
        return (
            <div className={`absolute inset-0 flex items-center justify-center p-3 bg-black/70 backdrop-blur-sm ${className}`}>
                <div className="text-center max-w-[240px]">
                    {isConfigError ? (
                        <AlertTriangle className="w-7 h-7 mx-auto mb-2 text-amber-400 opacity-80" />
                    ) : (
                        <WifiOff className="w-7 h-7 mx-auto mb-2 text-red-400 opacity-70" />
                    )}
                    <p className="text-[12px] font-semibold text-white/90 mb-1">{cam.name}</p>
                    {/* 多行错误信息展示 */}
                    <p className={`text-[10px] leading-relaxed mt-1 ${isConfigError ? 'text-amber-300/80' : 'text-red-400/80'}`}>
                        {error.split('\n').map((line, i) => (
                            <span key={i} className="block">{line}</span>
                        ))}
                    </p>
                    {/* 可重试的错误显示重试按钮 */}
                    {!isConfigError && (
                        <button
                            onClick={handleEzvizRetry}
                            className="mt-2 px-3 py-1 rounded-md bg-white/10 hover:bg-white/20 text-white/70 text-[10px] transition-colors flex items-center gap-1 mx-auto"
                        >
                            <RefreshCw className="w-3 h-3" />
                            重试
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // ── 渲染 ─────────────────────────────────────────────────────────────────
    const isVideoMode = stream?.mode === 'webrtc' || stream?.mode === 'hls' || stream?.mode === 'flv';
    const isImgMode = stream?.mode === 'mjpeg' || stream?.mode === 'snapshot';

    return (
        <div
            ref={containerRef}
            className={`relative w-full h-full bg-black overflow-hidden flex items-center justify-center ${className}`}
        >
            {/* 加载中遮罩 */}
            {loading && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 backdrop-blur-md">
                    <div className="flex flex-col items-center gap-2">
                        <div className="relative">
                            <RefreshCw className="w-5 h-5 text-white/60 animate-spin" />
                            {/* 协议指示器 */}
                            {stream?.mode && (
                                <span className="absolute -bottom-1 -right-1 text-[7px] bg-white/20 rounded px-0.5 text-white/60 uppercase">
                                    {stream.mode}
                                </span>
                            )}
                        </div>
                        <span className="text-[10px] text-white/50">
                            {stream?.mode === 'webrtc' ? '正在建立 WebRTC 连接...' :
                                stream?.mode === 'hls' ? '正在缓冲 HLS 流...' :
                                    stream?.mode === 'flv' ? '正在连接 FLV 流...' :
                                        stream?.mode === 'mjpeg' ? '正在加载视频流...' :
                                            '正在解析流地址...'}
                        </span>
                    </div>
                </div>
            )}

            {/* ── WebRTC / HLS / FLV：使用 <video> 元素 ─────────────────────── */}
            {isVideoMode && (
                <video
                    ref={videoRef}
                    className="w-full h-full object-contain"
                    autoPlay
                    muted
                    playsInline
                    // 防止右键下载
                    onContextMenu={(e) => e.preventDefault()}
                    onCanPlay={() => setLoading(false)}
                    onError={() => {
                        setError('视频解码失败');
                        setLoading(false);
                    }}
                />
            )}

            {/* ── MJPEG / snapshot：使用 <img> ──────────────────────────────── */}
            {isImgMode && stream && (
                <img
                    ref={imgRef}
                    src={stream.mode === 'snapshot'
                        // snapshot 模式追加时间戳避免缓存
                        ? `${stream.url}${stream.url.includes('?') ? '&' : '?'}_t=${Date.now()}`
                        : stream.url
                    }
                    alt={cam.name}
                    className="w-full h-full object-contain select-none"
                    onLoad={() => setLoading(false)}
                    onError={() => {
                        setError('画面加载失败，请检查 HA 连接或摄像头是否在线');
                        setLoading(false);
                    }}
                />
            )}

            {/* ── 空闲状态（还未解析到流）──────────────────────────────────── */}
            {!stream && !loading && !error && (
                <div className="flex flex-col items-center opacity-20 gap-2">
                    <Video className="w-8 h-8 text-white" />
                    <span className="text-[11px] text-white">等待配置</span>
                </div>
            )}

            {/* ── 协议状态角标（正常播放时悬浮显示）─────────────────────────── */}
            {!loading && !error && stream && (
                <div className="absolute bottom-1 right-1 z-10 opacity-0 group-hover/cell:opacity-100 transition-opacity pointer-events-none">
                    <ProtocolBadge mode={stream.mode} />
                </div>
            )}
        </div>
    );
}

// ─── 协议角标（小标签显示当前播放协议）─────────────────────────────────────

function ProtocolBadge({ mode }: { mode: PlayerMode }) {
    const configs: Record<PlayerMode, { label: string; color: string }> = {
        webrtc: { label: 'WebRTC', color: '#22c55e' },
        hls: { label: 'HLS', color: '#3b82f6' },
        flv: { label: 'FLV', color: '#f59e0b' },
        mjpeg: { label: 'MJPEG', color: '#8b5cf6' },
        snapshot: { label: 'SNAP', color: '#6b7280' },
        idle: { label: 'IDLE', color: '#6b7280' },
    };
    const cfg = configs[mode] || configs.idle;
    return (
        <div
            className="px-1.5 py-0.5 rounded text-[8px] font-bold tracking-wide"
            style={{ backgroundColor: `${cfg.color}33`, color: cfg.color, border: `1px solid ${cfg.color}55` }}
        >
            {cfg.label}
        </div>
    );
}
