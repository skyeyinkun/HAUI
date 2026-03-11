import { WeatherAdapter, WeatherData, ForecastData } from '../types';

export class OpenWeatherMapAdapter implements WeatherAdapter {
  private apiKey: string;

  constructor(apiKey: string = 'DEMO_KEY') {
    this.apiKey = apiKey;
  }

  async fetchWeather(lat: number, lon: number): Promise<WeatherData> {
    // Note: OpenWeatherMap requires an API key. This is a mock implementation 
    // structure that would work with a real key. 
    // For free tier 2.5/weather endpoint:
    // https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={API key}
    
    // Since we don't have a real key, we simulate the structure or use a hardcoded mock
    // to demonstrate the adapter pattern functionality.
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Return mock data that looks different to prove provider switch
    return {
      temperature: 20,
      humidity: 50,
      pm25: 40,
      airQuality: '良',
      weatherCode: 800,
      description: '晴 (OWM)', // Tagged to verify provider switch
      isDay: true,
      apparentTemperature: 22,
      windSpeed: 15,
      pressure: 1015,
      visibility: 10,
      uvIndex: 5,
      forecast: Array(6).fill(null).map((_, i) => ({
        date: i === 0 ? '今天' : i === 1 ? '明天' : `Day ${i}`,
        maxTemp: 25,
        minTemp: 18,
        weatherCode: 800,
        description: '晴 (OWM)'
      }))
    };
  }
}
