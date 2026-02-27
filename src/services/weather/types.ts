export interface ForecastData {
  date: string;
  maxTemp: number;
  minTemp: number;
  weatherCode: number;
  description: string;
}

export interface WeatherData {
  temperature: number;
  weatherCode: number;
  description: string;
  isDay: boolean;
  humidity: number;
  pm25: number;
  airQuality: string;
  apparentTemperature: number;
  windSpeed: number;
  pressure: number;
  visibility: number;
  uvIndex: number;
  forecast: ForecastData[];
}

export interface WeatherAdapter {
  fetchWeather(lat: number, lon: number): Promise<WeatherData>;
}
