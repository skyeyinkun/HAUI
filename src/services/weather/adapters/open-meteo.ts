import { WeatherAdapter, WeatherData, ForecastData } from '../types';

export class OpenMeteoAdapter implements WeatherAdapter {
  async fetchWeather(lat: number, lon: number): Promise<WeatherData> {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day,relative_humidity_2m,apparent_temperature,wind_speed_10m,surface_pressure,visibility&daily=weather_code,temperature_2m_max,temperature_2m_min,uv_index_max&timezone=auto&forecast_days=6`;
    const canUseHttpFallback =
      typeof window !== 'undefined' && typeof window.location?.protocol === 'string' && window.location.protocol === 'http:';

    const response = await fetch(url).catch(async (e) => {
      if (canUseHttpFallback) {
        const insecureUrl = url.replace(/^https:/, 'http:');
        return fetch(insecureUrl);
      }
      throw e;
    });

    let data: any = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      const reason = typeof data?.reason === 'string' ? data.reason : undefined;
      throw new Error(reason ? `OpenMeteo 请求失败：${reason}` : `OpenMeteo 请求失败（HTTP ${response.status}）`);
    }

    if (!data || data.error) {
      const reason = typeof data?.reason === 'string' ? data.reason : undefined;
      throw new Error(reason ? `OpenMeteo 返回错误：${reason}` : 'OpenMeteo 返回数据异常');
    }

    const current = data.current;
    const daily = data.daily;
    if (!current) throw new Error('OpenMeteo 返回缺少 current 字段');

    const mockPm25 = 35;

    const forecast: ForecastData[] = [];
    for (let i = 0; i < 6; i++) {
      const code = daily?.weather_code?.[i];
      const max = daily?.temperature_2m_max?.[i];
      const min = daily?.temperature_2m_min?.[i];
      if (daily?.time?.[i] && typeof code === 'number' && typeof max === 'number' && typeof min === 'number') {
        forecast.push({
          date: this.getDayName(i),
          maxTemp: Math.round(max),
          minTemp: Math.round(min),
          weatherCode: code,
          description: this.getWeatherDescription(code)
        });
      }
    }

    return {
      temperature: Math.round(current.temperature_2m),
      humidity: Math.round(current.relative_humidity_2m),
      pm25: mockPm25,
      airQuality: '优',
      weatherCode: current.weather_code,
      description: this.getWeatherDescription(current.weather_code),
      isDay: current.is_day === 1,
      apparentTemperature: Math.round(current.apparent_temperature),
      windSpeed: Math.round(current.wind_speed_10m),
      pressure: Math.round(current.surface_pressure),
      visibility: Math.round(current.visibility / 1000),
      uvIndex: daily?.uv_index_max?.[0] ? Math.round(daily.uv_index_max[0]) : 0,
      forecast
    };
  }

  private getDayName(offset: number) {
    if (offset === 0) return '今天';
    if (offset === 1) return '明天';
    const date = new Date();
    date.setDate(date.getDate() + offset);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }

  private getWeatherDescription(code: number) {
    switch (code) {
      case 0: return '晴朗';
      case 1:
      case 2:
      case 3: return '多云';
      case 45:
      case 48: return '有雾';
      case 51:
      case 53:
      case 55: return '毛毛雨';
      case 56:
      case 57: return '冻雨';
      case 61:
      case 63:
      case 65: return '下雨';
      case 66:
      case 67: return '冻雨';
      case 71:
      case 73:
      case 75: return '下雪';
      case 77: return '雪粒';
      case 80:
      case 81:
      case 82: return '阵雨';
      case 85:
      case 86: return '阵雪';
      case 95: return '雷雨';
      case 96:
      case 99: return '雷暴伴有冰雹';
      default: return '未知';
    }
  }
}
