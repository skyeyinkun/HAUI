import React, { useState, useEffect } from 'react';
import { User } from '@/types/user';
import { WeatherData } from '@/hooks/useWeather';
import { HAConfig } from '@/types/home-assistant';
import { Globe, Wifi, Link2, Unplug, RefreshCw, Activity, Maximize, Minimize } from 'lucide-react';
import { logger } from '@/utils/logger';

interface HeaderProps {
    weather: WeatherData | null;
    formattedTime: string;
    formattedDate: string;
    users: User[];
    haConfig: HAConfig;
    isConnected: boolean;
    connectionType: 'Public' | 'Local' | null;
    onRefresh?: () => void;
    latency?: number | null;
}

function HeaderInternal({ weather, formattedTime, formattedDate, users, haConfig, isConnected, connectionType, onRefresh, latency }: HeaderProps) {
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        // 监听全屏状态变更
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            // 请求全屏时作用于整个 documentElement
            document.documentElement.requestFullscreen().catch(err => {
                logger.error(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    };

    return (
        <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div className="flex flex-col gap-0.5">
                <div className="flex items-baseline gap-4">
                    <div className="haui-pill flex items-baseline gap-2 rounded-full px-3 py-1 text-[rgba(4,4,4,0.56)]">
                        <span className="font-['SF_Pro_Display',sans-serif] text-[13px] font-medium">{formattedDate}</span>
                        <span className="font-['SF_Pro_Display',sans-serif] text-[13px] font-medium">{formattedTime}</span>
                    </div>
                </div>
                <div className="flex flex-col">
                    {weather && weather.forecast && weather.forecast.length > 1 ? (
                        <>
                            <h1 className="font-['SF_Pro_Display',sans-serif] text-[26px] font-semibold leading-tight text-[#040404] md:text-[34px]">
                                明天{weather.forecast[1].description}，{weather.forecast[1].minTemp}°C - {weather.forecast[1].maxTemp}°C
                            </h1>
                            <div className="mt-1 text-[15px] font-normal text-[rgba(4,4,4,0.52)]">
                                今天{weather.description}，<span className="font-light">气温{weather.temperature}°C</span>
                            </div>
                        </>
                    ) : (
                        <h1 className="font-['SF_Pro_Display',sans-serif] text-[26px] font-semibold text-[#040404] md:text-[34px]">
                            今天天气晴朗，<span className="font-light">气温适宜</span>
                        </h1>
                    )}
                </div>
            </div>

            <div className="flex w-full md:w-auto items-center justify-between md:justify-end gap-2 md:gap-4">
                {/* User Avatars & Status */}
                <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
                    <div className="flex items-center -space-x-2">
                        {users.map((user, index) => (
                            <div key={index} className="relative group cursor-pointer flex flex-col items-center" title={haConfig.personMappings[user.name] || 'Not Configured'}>
                                {/* 在线状态呼吸动画光环 */}
                                {user.online && (
                                    <div className="absolute inset-0 rounded-full animate-sensor-pulse ring-2 ring-[#65cf58]/50" />
                                )}
                                <div className={`relative h-[48px] w-[48px] rounded-full shadow-[0_14px_30px_rgba(0,0,0,0.12)] ring-2 transition-transform duration-300 group-hover:scale-105 group-hover:z-10 ${user.online ? 'ring-[#5fbf55]' : 'ring-white/80'}`}>
                                    <div className="absolute inset-0 rounded-full bg-[#050505]" />
                                    <img alt={user.name} className="absolute inset-0 w-full h-full object-cover rounded-full" src={user.avatar} />
                                </div>
                                <span className="text-[12px] font-medium mt-1 text-foreground/80 bg-background/50 backdrop-blur-sm px-2 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity absolute -bottom-6 whitespace-nowrap z-20 pointer-events-none">{user.name}</span>
                            </div>
                        ))}
                    </div>

                    {/* Connection Status Indicators */}
                    <div className="flex flex-wrap items-center gap-2 mt-1 md:mt-0 md:mr-1">
                        <button
                            type="button"
                            onClick={toggleFullscreen}
                            className="haui-pill shrink-0 flex h-8 w-8 items-center justify-center rounded-full transition-all hover:text-foreground"
                            title={isFullscreen ? '退出全屏' : '全屏显示 (可隐藏外侧的 Home Assistant 边栏)'}
                        >
                            {isFullscreen ? (
                                <Minimize className="w-3.5 h-3.5 text-muted-foreground" />
                            ) : (
                                <Maximize className="w-3.5 h-3.5 text-muted-foreground" />
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={onRefresh}
                            disabled={!isConnected}
                            className="haui-pill shrink-0 flex h-8 w-8 items-center justify-center rounded-full transition-all hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                            title={isConnected ? '强制刷新 Home Assistant 状态' : '未连接到 Home Assistant'}
                        >
                            <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                        {/* Network Type */}
                        <div className="haui-pill shrink-0 whitespace-nowrap flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all cursor-help" title="当前网络连接类型">
                            {connectionType === 'Public' ? (
                                <Globe className="w-3 h-3 text-blue-500" />
                            ) : (
                                <Wifi className="w-3 h-3 text-green-500" />
                            )}
                            <span className="text-[10px] font-medium text-muted-foreground">
                                {connectionType === 'Public' ? '公网' : connectionType === 'Local' ? '局域网' : '检测中'}
                            </span>
                        </div>

                        {/* API Status */}
                        <div className={`haui-pill shrink-0 whitespace-nowrap flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all cursor-help ${isConnected ? 'text-green-700' : 'text-red-600'}`} title="Home Assistant API 连接状态">
                            {isConnected ? (
                                <Link2 className="w-3 h-3 text-green-600" />
                            ) : (
                                <Unplug className="w-3 h-3 text-red-500" />
                            )}
                            <span className={`text-[10px] font-medium ${isConnected ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                {isConnected ? '已连接' : '未连接'}
                            </span>
                        </div>

                        {/* Latency Indicator */}
                        {isConnected && latency !== undefined && latency !== null && (
                            <div className="haui-pill shrink-0 whitespace-nowrap flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all cursor-help" title="WebSocket API 延迟">
                                <Activity className={`w-3 h-3 ${latency < 100 ? 'text-green-600' :
                                    latency < 300 ? 'text-yellow-600' :
                                        'text-red-500'
                                    }`} />
                                <span className={`text-[10px] font-medium ${latency < 100 ? 'text-green-700 dark:text-green-400' :
                                    latency < 300 ? 'text-yellow-700 dark:text-yellow-400' :
                                        'text-red-600 dark:text-red-400'
                                    }`}>
                                    {latency}ms
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// 使用 React.memo 优化 Header 组件，避免不必要的重新渲染
export const Header = React.memo(HeaderInternal, (prevProps, nextProps) => {
    // 比较关键属性，决定是否需要重新渲染
    return (
        prevProps.formattedTime === nextProps.formattedTime &&
        prevProps.formattedDate === nextProps.formattedDate &&
        prevProps.isConnected === nextProps.isConnected &&
        prevProps.connectionType === nextProps.connectionType &&
        prevProps.latency === nextProps.latency &&
        prevProps.weather?.temperature === nextProps.weather?.temperature &&
        prevProps.weather?.description === nextProps.weather?.description &&
        prevProps.users.length === nextProps.users.length &&
        prevProps.users.every((u, i) => u.online === nextProps.users[i]?.online)
    );
});
