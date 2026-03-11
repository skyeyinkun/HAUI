import React from 'react';
import { CloudRain, Sun, CloudFog, Cloud, Snowflake, CloudLightning, Loader2 } from 'lucide-react';
import { WeatherData } from '@/hooks/useWeather';
import { Region } from '@/utils/regions';

interface WeatherWidgetProps {
  weather: WeatherData | null;
  weatherLoading?: boolean;
  weatherError?: string | null;
  weatherFallback?: boolean;
  selectedRegion?: { province: Region; city: Region; district: Region };
  onRegionClick?: () => void;
}

export function WeatherWidget({
  weather,
  weatherLoading,
  weatherError,
  weatherFallback,
  selectedRegion,
  onRegionClick
}: WeatherWidgetProps) {
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

      {/* Right: 3-Day Forecast */}
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
  );
}
