import { useState, useEffect, useRef } from 'react';
import { WeatherData } from '../services/weather/types';
import { WeatherFactory, WeatherProvider } from '../services/weather/weather-factory';
import { FEATURE_FLAGS } from '../config/feature-flags';
import { CacheManager } from '../utils/cache-manager';

export type { WeatherData, ForecastData } from '../services/weather/types';

export function useWeather(lat?: number, lon?: number) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Track previous coords to detect real changes
  const prevCoordsRef = useRef<string>('');

  useEffect(() => {
    let cancelled = false;

    if (lat === undefined || lon === undefined) {
      setWeather(null);
      setLoading(false);
      setError('缺少位置坐标');
      prevCoordsRef.current = '';
      return;
    }

    const coordKey = `${lat.toFixed(4)},${lon.toFixed(4)}`;
    const cacheKey = `weather:${coordKey}`;
    const coordsChanged = prevCoordsRef.current !== coordKey;
    prevCoordsRef.current = coordKey;

    const fetchWeather = async (isRetry = false) => {
      // 1. Try cache first (only for initial load, not retries)
      if (!isRetry) {
        const cached = CacheManager.get<WeatherData>(cacheKey);
        if (cached) {
          if (!cancelled) {
            setWeather(cached);
            setLoading(false);
            setError(null);
          }
          // Still fetch fresh data in background (SWR pattern)
          // but don't show loading indicator
        } else {
          // No cache: show loading
          if (!cancelled) {
            // If coords changed, clear old weather immediately
            if (coordsChanged) setWeather(null);
            setLoading(true);
            setError(null);
          }
        }
      }

      try {
        const adapter = WeatherFactory.getAdapter(FEATURE_FLAGS.WEATHER_PROVIDER);

        // Retry logic with exponential backoff
        let lastError: any;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const data = await adapter.fetchWeather(lat, lon);
            if (cancelled) return;
            setWeather(data);
            setLoading(false);
            setError(null);
            CacheManager.set(cacheKey, data);
            return; // Success
          } catch (e) {
            lastError = e;
            if (attempt < 2) {
              await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt))); // 1s, 2s
            }
          }
        }

        // Primary provider failed, try fallback
        if (FEATURE_FLAGS.WEATHER_PROVIDER === WeatherProvider.OPEN_METEO) {
          try {
            const fallback = WeatherFactory.getAdapter(WeatherProvider.OPEN_WEATHER_MAP);
            const data = await fallback.fetchWeather(lat, lon);
            if (cancelled) return;
            setWeather(data);
            setLoading(false);
            setError('主天气源不可用，已使用备用数据');
            CacheManager.set(cacheKey, data);
            return;
          } catch {
            // ignore, fall through to error handling
          }
        }

        throw lastError; // All retries failed
      } catch (err) {
        if (cancelled) return;
        console.error('[Weather] fetch failed:', {
          error: err,
          lat,
          lon,
          provider: FEATURE_FLAGS.WEATHER_PROVIDER
        });

        // Offline Fallback: Try to load stale cache
        const stale = CacheManager.getStale<WeatherData>(cacheKey);
        if (stale) {
          setWeather(stale);
          setError('网络异常，正在使用缓存数据');
        } else {
          setError(err instanceof Error ? err.message : '获取天气数据失败');
        }
        setLoading(false);
      }
    };

    fetchWeather();
    // Refresh every 30 minutes
    const interval = setInterval(() => fetchWeather(true), 30 * 60 * 1000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [lat, lon]);

  return { weather, loading, error };
}

