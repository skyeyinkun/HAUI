import React, { useState, useEffect } from 'react';
import { User } from '@/types/user';
import { WeatherData } from '@/hooks/useWeather';
import { HAConfig } from '@/types/home-assistant';
import { Globe, Wifi, Link2, Unplug, RefreshCw, Activity, Maximize, Minimize } from 'lucide-react';

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

export function Header({ weather, formattedTime, formattedDate, users, haConfig, isConnected, connectionType, onRefresh, latency }: HeaderProps) {
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
                console.error(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    };

    return (
        <div className="flex flex-col md:flex-row md:items-start justify-between mb-4 gap-4 md:gap-0">
            <div className="flex flex-col gap-0.5">
                <div className="flex items-baseline gap-4">
                    <div className="flex items-baseline gap-2 text-[rgba(4,4,21,0.6)]">
                        <span className="font-['SF_Pro_Display',sans-serif] text-[13px] font-medium">{formattedDate}</span>
                        <span className="font-['SF_Pro_Display',sans-serif] text-[13px] font-medium">{formattedTime}</span>
                    </div>
                </div>
                <div className="flex flex-col">
                    {weather && weather.forecast && weather.forecast.length > 1 ? (
                        <>
                            <h1 className="font-['SF_Pro_Display',sans-serif] text-[22px] md:text-[28px] text-[#040415] tracking-[0.364px] leading-tight">
                                明天{weather.forecast[1].description}，{weather.forecast[1].minTemp}°C - {weather.forecast[1].maxTemp}°C
                            </h1>
                            <div className="text-[14px] text-[rgba(4,4,21,0.6)] mt-0.5 font-normal">
                                今天{weather.description}，<span className="font-light">气温{weather.temperature}°C</span>
                            </div>
                        </>
                    ) : (
                        <h1 className="font-['SF_Pro_Display',sans-serif] text-[22px] md:text-[28px] text-[#040415] tracking-[0.364px]">
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
                                <div className={`relative rounded-full shadow-[0px_0px_20px_0px_rgba(0,0,0,0.12)] w-[48px] h-[48px] ring-2 transition-transform duration-300 group-hover:scale-105 group-hover:z-10 ${user.online ? 'ring-[#65cf58]' : 'ring-white'}`}>
                                    <div className="absolute inset-0 rounded-full" style={{ backgroundImage: "linear-gradient(140.848deg, rgb(60, 60, 65) 1.2863%, rgb(45, 45, 48) 103.1%)" }} />
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
                            className="shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-accent/40 backdrop-blur-sm border border-white/5 shadow-sm transition-all hover:bg-accent/60"
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
                            className="shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-accent/40 backdrop-blur-sm border border-white/5 shadow-sm transition-all hover:bg-accent/60 disabled:opacity-40 disabled:cursor-not-allowed"
                            title={isConnected ? '强制刷新 Home Assistant 状态' : '未连接到 Home Assistant'}
                        >
                            <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                        {/* Network Type */}
                        <div className="shrink-0 whitespace-nowrap flex items-center gap-1.5 bg-accent/40 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/5 shadow-sm transition-all hover:bg-accent/60 cursor-help" title="当前网络连接类型">
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
                        <div className={`shrink-0 whitespace-nowrap flex items-center gap-1.5 px-2.5 py-1 rounded-full border shadow-sm transition-all cursor-help ${isConnected ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`} title="Home Assistant API 连接状态">
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
                            <div className={`shrink-0 whitespace-nowrap flex items-center gap-1.5 px-2.5 py-1 rounded-full border shadow-sm transition-all cursor-help ${latency < 100 ? 'bg-green-500/10 border-green-500/20' :
                                latency < 300 ? 'bg-yellow-500/10 border-yellow-500/20' :
                                    'bg-red-500/10 border-red-500/20'
                                }`} title="WebSocket API 延迟">
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
