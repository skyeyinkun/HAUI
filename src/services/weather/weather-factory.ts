import { WeatherAdapter } from './types';
import { OpenMeteoAdapter } from './adapters/open-meteo';
import { OpenWeatherMapAdapter } from './adapters/open-weather-map';

export enum WeatherProvider {
  OPEN_METEO = 'open-meteo',
  OPEN_WEATHER_MAP = 'open-weather-map'
}

export class WeatherFactory {
  static getAdapter(provider: WeatherProvider): WeatherAdapter {
    switch (provider) {
      case WeatherProvider.OPEN_WEATHER_MAP:
        return new OpenWeatherMapAdapter();
      case WeatherProvider.OPEN_METEO:
      default:
        return new OpenMeteoAdapter();
    }
  }
}
