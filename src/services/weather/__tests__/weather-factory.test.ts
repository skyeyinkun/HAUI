import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WeatherFactory, WeatherProvider } from '../weather-factory';
import { OpenMeteoAdapter } from '../adapters/open-meteo';
import { OpenWeatherMapAdapter } from '../adapters/open-weather-map';

describe('WeatherFactory', () => {
  it('returns OpenMeteoAdapter for OPEN_METEO provider', () => {
    const adapter = WeatherFactory.getAdapter(WeatherProvider.OPEN_METEO);
    expect(adapter).toBeInstanceOf(OpenMeteoAdapter);
  });

  it('returns OpenWeatherMapAdapter for OPEN_WEATHER_MAP provider', () => {
    const adapter = WeatherFactory.getAdapter(WeatherProvider.OPEN_WEATHER_MAP);
    expect(adapter).toBeInstanceOf(OpenWeatherMapAdapter);
  });
});

describe('OpenMeteoAdapter', () => {
  let adapter: OpenMeteoAdapter;

  beforeEach(() => {
    adapter = new OpenMeteoAdapter();
    global.fetch = vi.fn();
  });

  it('fetches and normalizes weather data', async () => {
    const mockResponse = {
      current: {
        temperature_2m: 25.5,
        relative_humidity_2m: 60,
        weather_code: 0,
        is_day: 1,
        apparent_temperature: 27,
        wind_speed_10m: 10,
        surface_pressure: 1010,
        visibility: 10000,
      },
      daily: {
        time: ['2024-01-01', '2024-01-02'],
        temperature_2m_max: [30, 28],
        temperature_2m_min: [20, 18],
        weather_code: [0, 1],
        uv_index_max: [5, 4]
      }
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    });

    const result = await adapter.fetchWeather(29.5, 106.5);

    expect(result.temperature).toBe(26); // 25.5 rounded
    expect(result.weatherCode).toBe(0);
    expect(result.description).toBe('晴朗');
    expect(result.forecast).toHaveLength(2);
    expect(result.forecast[0].maxTemp).toBe(30);
  });

  it('handles fetch errors', async () => {
    (global.fetch as any).mockRejectedValue(new Error('Network error'));
    await expect(adapter.fetchWeather(0, 0)).rejects.toThrow('Network error');
  });

  it('handles API errors (non-200)', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 500
    });
    await expect(adapter.fetchWeather(0, 0)).rejects.toThrow('OpenMeteo 请求失败');
  });
});
