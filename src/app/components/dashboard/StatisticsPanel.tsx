import React, { useState } from 'react';
import { CloudRain, Sun, Zap, FileText, Trash2, CloudFog, Cloud, Snowflake, CloudLightning, Loader2, Video } from 'lucide-react';
import CameraView from './CameraView';


import { WeatherData } from '@/hooks/useWeather';
import { useHomeStatistics } from '@/hooks/useHomeStatistics';
import { Device } from '@/types/device';
import { Log } from '@/types/dashboard';
import { IndoorEnvironmentCard } from './cards/IndoorEnvironment/IndoorEnvironmentCard';
import { SensorStatusCard } from './cards/SensorStatusCard';
import type { HassEntities } from 'home-assistant-js-websocket';

import { Region } from '@/utils/regions';

interface StatisticsPanelProps {
  weather: WeatherData | null;
  weatherLoading?: boolean;
  weatherError?: string | null;
  weatherFallback?: boolean;
  lightsOn: number;
  devices: Device[];
  haEntities: HassEntities;
  logs: Log[];
  nowMs: number;
  onRefreshSensors?: () => Promise<void>;
  fetchStates: () => Promise<any[]>;
  persistence?: { baseUrl: string; token: string };
  setLogModalOpen: (open: boolean) => void;
  clearLogs: () => void;
  logContainerRef: React.RefObject<HTMLDivElement>;
  selectedRegion?: { province: Region; city: Region; district: Region };
  onRegionClick?: () => void;
  /** HA REST API 基地址 */
  haBaseUrl?: string;
  /** HA Token（用于摄像头代理） */
  haToken?: string;
  /** 灯光开关回调，用于灯光弹窗中关灯 */

  onToggleLight?: (deviceId: number) => void;
  /** 打开摄像头设置回调 */
  onOpenCameraSettings?: (tab: string) => void;
}

export function StatisticsPanel({
  weather,
  weatherLoading,
  weatherError,
  weatherFallback,
  lightsOn,
  devices,
  haEntities,
  logs,
  nowMs,
  onRefreshSensors,
  fetchStates,
  persistence,
  setLogModalOpen,
  clearLogs,
  logContainerRef,
  selectedRegion,
  onRegionClick,
  haBaseUrl,
  haToken,

  onToggleLight,
  onOpenCameraSettings
}: StatisticsPanelProps) {
  // 日志/摄像头视图切换状态
  const [cardView, setCardView] = useState<'log' | 'camera'>('log');
  // 摄像头配置弹窗状态
  const { energy } = useHomeStatistics();
  const isWeatherLoading = Boolean(weatherLoading) || (!weather && !weatherError);
  const isWeatherError = Boolean(weatherError) && !weather && !weatherLoading;

  const getWeatherIcon = (code: number) => {
    if (code === 0) return Sun;
    if (code >= 1 && code <= 3) return Cloud;
    if (code >= 45 && code <= 48) return CloudFog;
    if (code >= 51 && code <= 67) return CloudRain;
    if (code >= 71 && code <= 77) return Snowflake;
    if (code >= 80 && code <= 82) return CloudRain;
    if (code >= 85 && code <= 86) return Snowflake;
    if (code >= 95) return CloudLightning;
    return Cloud;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6 items-stretch">
      {/* Column 1: Weather & Indoor Environment */}
      <div className="flex flex-col gap-3 h-[400px]">
        {/* Weather - Upgraded to 3-Day Forecast */}
        <div
          onClick={onRegionClick}
          className="bg-card rounded-[16px] shadow-[0px_0px_20px_0px_rgba(0,0,0,0.06)] p-3 flex flex-row items-center justify-between relative group border-0 h-[100px] shrink-0 overflow-hidden cursor-pointer hover:bg-accent/5 transition-colors"
        >
          {/* Left: Current Weather */}
          <div className="flex flex-col justify-between h-full z-10 w-auto min-w-[140px] shrink-0 pr-2 md:pr-4">
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-[8px] flex items-center justify-center shadow-[0px_0px_12px_0px_rgba(0,0,0,0.08)]"
                style={{ backgroundImage: "linear-gradient(140.848deg, rgb(60, 60, 65) 1.2863%, rgb(45, 45, 48) 103.1%)" }}
              >
                {weather ? React.createElement(getWeatherIcon(weather.weatherCode), { className: "w-3 h-3 text-white" }) : <Cloud className="w-3 h-3 text-white" />}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-['SF_Pro_Display',sans-serif] text-[12px] text-foreground font-semibold truncate leading-tight">
                  {selectedRegion ? `${selectedRegion.city.name}·${selectedRegion.district.name}` : '选择地区'}
                </span>
                <span
                  className="text-[10px] text-muted-foreground truncate leading-tight"
                  title={isWeatherError ? weatherError ?? undefined : undefined}
                >
                  {weatherFallback ? '定位中，使用默认位置' : weather ? weather.description : isWeatherError ? '加载失败' : '加载中'}
                </span>
              </div>
            </div>
            <div className="flex items-end mt-0.5 whitespace-nowrap">
              <span className="font-['SF_Pro_Display',sans-serif] text-[36px] md:text-[40px] font-bold text-foreground leading-[0.8] tracking-tighter drop-shadow-sm">
                {weather ? weather.temperature : "--"}
              </span>
              <span className="text-[16px] md:text-[18px] text-muted-foreground font-medium ml-0.5 tracking-tight mb-0.5">°</span>
              {weather && (
                <div className="flex flex-col ml-3 mb-0.5 text-[10px] md:text-[11px] text-muted-foreground/80 font-medium leading-[1.2] tracking-wide">
                  <span>体感 {weather.apparentTemperature}°</span>
                  <span>湿度 {weather.humidity}%</span>
                </div>
              )}
            </div>
          </div>

          {/* Right: 3-Day Forecast (Starting from Day+2) */}
          <div className="flex flex-row gap-2 h-full z-10 flex-1 overflow-hidden items-center justify-around md:justify-between px-2 md:px-4 border-l border-border/10">
            {weather && weather.forecast && weather.forecast.length > 4 ? (
              weather.forecast.slice(2, 5).map((day, idx) => {
                const Icon = getWeatherIcon(day.weatherCode);
                return (
                  <div key={idx} className="flex flex-col items-center justify-center gap-1 flex-1 min-w-0 text-center">
                    <span className="text-[10px] md:text-[11px] text-muted-foreground/80 font-medium truncate w-full">{day.date}</span>
                    <Icon className="w-4 h-4 md:w-5 md:h-5 text-foreground/70 shrink-0" />
                    <span className="text-[11px] md:text-[12px] font-bold text-foreground leading-none truncate w-full tracking-tight">
                      {day.maxTemp}°<span className="text-muted-foreground/60 font-medium">/{day.minTemp}°</span>
                    </span>
                    <span className="text-[10px] text-muted-foreground/60 leading-tight truncate max-w-full hidden sm:block">{day.description}</span>
                  </div>
                );
              })
            ) : (
              <div
                className="flex items-center justify-center w-full h-full text-[10px] text-muted-foreground gap-2"
                title={isWeatherError ? weatherError ?? undefined : undefined}
              >
                {isWeatherLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>加载中...</span>
                  </>
                ) : isWeatherError ? (
                  <span>天气数据加载失败</span>
                ) : weather ? (
                  <span>加载预报中...</span>
                ) : (
                  <span>暂无天气数据</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Indoor Environment Card - Data Integrated */}
        <IndoorEnvironmentCard haEntities={haEntities} onRefresh={onRefreshSensors} fetchStates={fetchStates} persistence={persistence} nowMs={nowMs} devices={devices} />
      </div>

      {/* Column 2: Energy & Home Status */}
      <div className="flex flex-col gap-3 h-[400px]">
        {/* Energy Card - Data Integrated */}
        <div className="bg-card rounded-[16px] shadow-[0px_0px_20px_0px_rgba(0,0,0,0.06)] p-3 flex flex-row items-center justify-between relative group border-0 h-[100px]">
          <div className="flex flex-col justify-between h-full z-10">
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-[8px] flex items-center justify-center shadow-[0px_0px_12px_0px_rgba(0,0,0,0.08)]"
                style={{ backgroundImage: "linear-gradient(140.848deg, rgb(60, 60, 65) 1.2863%, rgb(45, 45, 48) 103.1%)" }}
              >
                <Zap className="w-3 h-3 text-white" />
              </div>
              <span className="font-['SF_Pro_Display',sans-serif] text-[12px] text-muted-foreground">能源</span>
            </div>
            <div className="flex flex-col mt-1">
              <span className="text-[10px] font-medium text-muted-foreground mb-0.5">今日用电</span>
              <div className="flex items-baseline gap-0.5">
                <span className={`font-['SF_Pro_Display',sans-serif] text-[24px] font-bold ${energy ? 'text-foreground' : 'text-muted-foreground/50'} leading-none tracking-tight drop-shadow-sm`}>
                  {energy ? energy.today : "--"}
                </span>
                <span className="text-[12px] font-medium text-muted-foreground">kWh</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-between h-full z-10 w-[45%] items-end">
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${energy ? 'bg-primary/10 border-primary/20' : 'bg-muted/10 border-border/10'} mb-1`}>
              <div className={`w-1.5 h-1.5 rounded-full ${energy ? 'bg-primary animate-pulse' : 'bg-muted-foreground/40'}`} />
              <span className={`text-[10px] font-medium ${energy ? 'text-foreground' : 'text-muted-foreground'}`}>{energy ? '正常' : '未在线'}</span>
            </div>

            <div className="flex flex-col gap-1.5 w-full">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">本月</span>
                <span className={`text-[10px] font-semibold ${energy ? 'text-foreground' : 'text-muted-foreground/50'} tabular-nums`}>
                  {energy ? energy.month : "--"}
                </span>
              </div>
              <div className="w-full h-1 bg-accent/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-foreground rounded-full transition-all duration-1000"
                  style={{ width: energy ? '65%' : '0%' }}
                />
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-[10px] text-muted-foreground">功率</span>
                <span className={`text-[10px] font-semibold ${energy ? 'text-foreground' : 'text-muted-foreground/50'} tabular-nums`}>
                  {energy ? `${energy.power}W` : "--"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Unified Home Status Card - Adjusted Height */}
        <SensorStatusCard haEntities={haEntities} lightsOn={lightsOn} nowMs={nowMs} onRefresh={onRefreshSensors} fetchStates={fetchStates} persistence={persistence} devices={devices} onToggleLight={onToggleLight} />
      </div>

      {/* 日志/摄像头多功能卡片 */}
      <div className="bg-card rounded-[16px] shadow-[0px_0px_16px_0px_rgba(0,0,0,0.06)] p-3 flex flex-col gap-2 transition-colors duration-300 relative group aspect-auto col-span-1 md:col-span-2 lg:col-span-1 h-[400px] max-h-[400px] overflow-hidden box-border">
        {/* 头部：标题 + 切换按钮 */}
        <div className="flex items-center justify-between shrink-0 border-b border-border/50 pb-2">
          <div className="flex items-center gap-2">
            {/* 日志/摄像头切换按钮组 */}
            <div className="flex items-center bg-accent/40 rounded-[10px] p-0.5">
              <button
                onClick={() => setCardView('log')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] transition-all duration-200 ${cardView === 'log'
                  ? 'shadow-sm text-white'
                  : 'text-muted-foreground hover:text-foreground'
                  }`}
                style={
                  cardView === 'log'
                    ? { backgroundImage: 'linear-gradient(140.848deg, rgb(60, 60, 65) 1.2863%, rgb(45, 45, 48) 103.1%)' }
                    : {}
                }
                title="实时日志"
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="text-[12px] font-medium">日志</span>
              </button>
              <button
                onClick={() => setCardView('camera')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] transition-all duration-200 ${cardView === 'camera'
                  ? 'shadow-sm text-white'
                  : 'text-muted-foreground hover:text-foreground'
                  }`}
                style={
                  cardView === 'camera'
                    ? { backgroundImage: 'linear-gradient(140.848deg, rgb(60, 60, 65) 1.2863%, rgb(45, 45, 48) 103.1%)' }
                    : {}
                }
                title="摄像头"
              >
                <Video className="w-3.5 h-3.5" />
                <span className="text-[12px] font-medium">监控</span>
              </button>
            </div>
          </div>

          {/* 右侧操作按钮 */}
          <div className="flex items-center gap-1">
            {cardView === 'log' ? (
              <>
                <button
                  onClick={() => setLogModalOpen(true)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-accent rounded-full text-muted-foreground hover:text-foreground"
                  title="查看全部日志"
                >
                  <FileText className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={clearLogs}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-accent rounded-full"
                  title="清空日志"
                >
                  <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                </button>
              </>
            ) : (
              <button
                onClick={() => onOpenCameraSettings?.('cameras')}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-accent rounded-full text-muted-foreground hover:text-foreground"
                title="摄像头配置"
              >
                <Video className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* 内容区域 - 日志/摄像头切换 */}
        {cardView === 'log' ? (
          <div
            ref={logContainerRef}
            className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-muted-foreground/30 scrollbar-track-transparent hover:scrollbar-thumb-muted-foreground/50"
          >
            <div className="flex flex-col gap-1.5 mt-1">
              {logs.length > 0 ? logs.map((log, i) => (
                <div key={i} className="flex items-center gap-2 shrink-0">
                  <span className="text-[12px] text-muted-foreground/60 whitespace-nowrap font-mono">{log.time}</span>
                  <span className="text-[12px] text-foreground truncate" title={log.message}>{log.message}</span>
                </div>
              )) : (
                <span className="text-[12px] text-muted-foreground/40 text-center mt-2 block">暂无日志</span>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden">
            <CameraView
              onOpenConfig={() => onOpenCameraSettings?.('cameras')}
              haBaseUrl={haBaseUrl}
              haToken={haToken}
            />
          </div>
        )}
      </div>
    </div>
  );
}
