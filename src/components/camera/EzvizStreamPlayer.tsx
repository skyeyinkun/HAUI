import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react';

interface EzvizStreamPlayerProps {
    cameraId: string;
    url: string;
    accessToken: string;
}

/** 播放器状态类型 */
type PlayerState = 'loading' | 'playing' | 'error' | 'reconnecting';

/** 最大自动重连次数 */
const MAX_RECONNECT = 5;
/** 心跳检测间隔（毫秒） */
const HEARTBEAT_INTERVAL = 15000;

export const EzvizStreamPlayer: React.FC<EzvizStreamPlayerProps> = ({ cameraId, url, accessToken }) => {
    // 使用 useMemo 稳定化 containerId，避免不必要的重渲染
    const containerId = useMemo(
        () => `ezviz-${cameraId.replace(/[^a-zA-Z0-9]/g, '-')}`,
        [cameraId]
    );

    const playerInstanceRef = useRef<any>(null);
    const reconnectCountRef = useRef(0);
    const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const mountedRef = useRef(true);

    const [playerState, setPlayerState] = useState<PlayerState>('loading');
    const [reconnectAttempt, setReconnectAttempt] = useState(0);

    /** 销毁当前播放器实例 */
    const destroyPlayer = useCallback(() => {
        // 清除心跳定时器
        if (heartbeatTimerRef.current) {
            clearInterval(heartbeatTimerRef.current);
            heartbeatTimerRef.current = null;
        }
        if (playerInstanceRef.current) {
            try {
                if (typeof playerInstanceRef.current.stop === 'function') {
                    playerInstanceRef.current.stop();
                }
                if (typeof playerInstanceRef.current.destroy === 'function') {
                    playerInstanceRef.current.destroy();
                }
            } catch (e) {
                // 部分 EZUIKit 版本 destroy 实现有瑕疵，catch 住避免阻塞
                console.error('销毁 EZUIKitPlayer 过程中异常:', e);
            }
            playerInstanceRef.current = null;
        }
        // 清空容器 DOM，为下次初始化准备干净环境
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = '';
        }
    }, [containerId]);

    /** 初始化播放器 */
    const initPlayer = useCallback(async () => {
        if (!mountedRef.current) return;

        // 先销毁旧实例
        destroyPlayer();
        setPlayerState('loading');

        try {
            // 动态导入 ezuikit-js，避免构建时缺包报错
            let EZUIKit: any = null;
            try {
                const mod = 'ezuikit-js';
                EZUIKit = (await import(/* @vite-ignore */ mod)).default;
            } catch {
                // 模块未安装时，回退到全局挂载
                console.warn('ezuikit-js 模块未安装，尝试使用全局 EZUIKit');
            }

            // 兼容全局挂载和 npm 模块两种方式
            const PlayerClass = (window as any).EZUIKit?.EZUIKitPlayer || EZUIKit?.EZUIKitPlayer || EZUIKit;
            if (!PlayerClass) {
                console.error('未能找到 EZUIKit 构造函数');
                if (mountedRef.current) setPlayerState('error');
                return;
            }

            const player = new PlayerClass({
                id: containerId,
                accessToken: accessToken,
                url: url,
                template: 'standard',
                audio: 0, // 初始静音，保证自动播放成功
                width: '100%',
                height: '100%',
            });

            playerInstanceRef.current = player;

            // 标记播放成功，重置重连计数
            if (mountedRef.current) {
                setPlayerState('playing');
                reconnectCountRef.current = 0;
                setReconnectAttempt(0);
            }

            // 启动心跳检测：定期检查播放器实例是否还存活
            heartbeatTimerRef.current = setInterval(() => {
                if (!mountedRef.current) return;
                // 如果 player 实例已被意外销毁，触发重连
                if (!playerInstanceRef.current) {
                    console.warn('萤石播放器心跳检测：实例丢失，触发重连');
                    triggerReconnect();
                }
            }, HEARTBEAT_INTERVAL);

        } catch (e) {
            console.error('EZUIKit 初始化失败:', e);
            if (mountedRef.current) {
                setPlayerState('error');
            }
        }
    }, [containerId, url, accessToken, destroyPlayer]);

    /** 触发自动重连（指数退避） */
    const triggerReconnect = useCallback(() => {
        if (!mountedRef.current) return;
        if (reconnectCountRef.current >= MAX_RECONNECT) {
            setPlayerState('error');
            return;
        }

        reconnectCountRef.current += 1;
        const attempt = reconnectCountRef.current;
        setReconnectAttempt(attempt);
        setPlayerState('reconnecting');

        // 指数退避延迟：1s, 2s, 4s, 8s, 16s（上限 30s）
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 30000);
        console.log(`萤石播放器将在 ${delay}ms 后进行第 ${attempt} 次重连`);

        reconnectTimerRef.current = setTimeout(() => {
            if (mountedRef.current) {
                initPlayer();
            }
        }, delay);
    }, [initPlayer]);

    /** 手动重试：重置计数器并立即重连 */
    const handleManualRetry = useCallback(() => {
        reconnectCountRef.current = 0;
        setReconnectAttempt(0);
        // 清除任何待执行的重连定时器
        if (reconnectTimerRef.current) {
            clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = null;
        }
        initPlayer();
    }, [initPlayer]);

    // 主 effect：使用 ResizeObserver 等待容器有实际尺寸后再初始化
    useEffect(() => {
        mountedRef.current = true;
        let observer: ResizeObserver | null = null;
        let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
        let initialized = false;

        const tryInit = () => {
            if (initialized) return;
            initialized = true;
            observer?.disconnect();
            if (fallbackTimer) clearTimeout(fallbackTimer);
            initPlayer();
        };

        const container = containerRef.current;
        if (container) {
            observer = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
                        tryInit();
                        break;
                    }
                }
            });
            observer.observe(container);

            // 5 秒兜底定时器，防止 ResizeObserver 在极端情况下不触发
            fallbackTimer = setTimeout(() => {
                if (!initialized) {
                    console.warn('萤石播放器：ResizeObserver 5s 未触发，强制初始化');
                    tryInit();
                }
            }, 5000);
        }

        // 生命周期清理
        return () => {
            mountedRef.current = false;
            observer?.disconnect();
            if (fallbackTimer) clearTimeout(fallbackTimer);
            if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
            destroyPlayer();
        };
    }, [cameraId, url, accessToken, initPlayer, destroyPlayer]);

    return (
        <div className="w-full h-full relative bg-black overflow-hidden">
            {/* 萤石 SDK 绑定的 DOM 容器 */}
            <div
                ref={containerRef}
                id={containerId}
                className="w-full h-full flex items-center justify-center pointer-events-auto"
            />

            {/* 加载中状态覆盖层 */}
            {playerState === 'loading' && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80">
                    <div className="w-12 h-12 rounded-full bg-neutral-800 animate-pulse mb-3" />
                    <span className="text-xs text-neutral-400">正在连接萤石云...</span>
                </div>
            )}

            {/* 重连中状态覆盖层 */}
            {playerState === 'reconnecting' && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/70">
                    <Loader2 className="w-8 h-8 text-amber-400 animate-spin mb-3" />
                    <span className="text-xs text-amber-300">
                        正在重连 ({reconnectAttempt}/{MAX_RECONNECT})...
                    </span>
                </div>
            )}

            {/* 错误状态覆盖层 */}
            {playerState === 'error' && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80">
                    <AlertTriangle className="w-8 h-8 text-red-400 mb-3" />
                    <span className="text-sm text-red-300 mb-4">萤石云连接失败</span>
                    <button
                        onClick={handleManualRetry}
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
