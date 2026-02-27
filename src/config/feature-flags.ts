import { WeatherProvider } from '../services/weather/weather-factory';

export const FEATURE_FLAGS = {
  // Toggle between WeatherProvider.OPEN_METEO and WeatherProvider.OPEN_WEATHER_MAP
  WEATHER_PROVIDER: WeatherProvider.OPEN_METEO,
};
