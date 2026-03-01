import axios from 'axios';
import { translationService } from '../translation.service';

export interface WeatherResponse {
  location: string;
  current: {
    temperature: number;
    humidity: number;
    rainfall: number;
    condition: string;
  };
  forecast: Array<{
    date: Date;
    temperature: { min: number; max: number };
    rainfall: number;
    condition: string;
  }>;
  farmingAdvice: string;
}

export interface FormattedWeatherResponse {
  text: string;
  data: WeatherResponse;
}

interface GeocodingResult {
  lat: number;
  lon: number;
  name: string;
  country: string;
}

interface OpenWeatherCurrentResponse {
  main: {
    temp: number;
    humidity: number;
  };
  weather: Array<{
    main: string;
    description: string;
  }>;
  rain?: {
    '1h'?: number;
  };
}

interface OpenWeatherForecastResponse {
  list: Array<{
    dt: number;
    main: {
      temp_min: number;
      temp_max: number;
      humidity: number;
    };
    weather: Array<{
      main: string;
      description: string;
    }>;
    rain?: {
      '3h'?: number;
    };
  }>;
}

/**
 * Handler for weather queries
 * Integrates with OpenWeatherMap API to provide weather data and farming advice
 */
export class WeatherHandler {
  private apiKey: string;
  private baseUrl = 'https://api.openweathermap.org/data/2.5';
  private geocodingCache: Map<string, GeocodingResult> = new Map();

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OPENWEATHER_API_KEY || '';
    if (!this.apiKey) {
      console.warn('[WeatherHandler] OpenWeatherMap API key not configured');
    }
  }

  /**
   * Handle weather query
   * @param location - Location name to query
   * @returns Weather data with farming advice
   */
  async handle(location: string): Promise<WeatherResponse> {
    if (!this.apiKey) {
      throw new Error('OpenWeatherMap API key not configured');
    }

    // 1. Get coordinates from location (with caching)
    const coords = await this.geocode(location);

    // 2. Fetch current weather
    const currentWeather = await this.getCurrentWeather(coords.lat, coords.lon);

    // 3. Fetch 3-day forecast
    const forecast = await this.getForecast(coords.lat, coords.lon);

    // 4. Generate farming advice based on weather
    const advice = this.generateFarmingAdvice(currentWeather, forecast);

    return {
      location: coords.name,
      current: {
        temperature: Math.round(currentWeather.main.temp),
        humidity: currentWeather.main.humidity,
        rainfall: currentWeather.rain?.['1h'] || 0,
        condition: currentWeather.weather[0]?.description || 'Unknown',
      },
      forecast: forecast.slice(0, 3),
      farmingAdvice: advice,
    };
  }

  /**
   * Format weather response in user's language
   * @param weatherData - Weather data
   * @param language - Target language code
   * @returns Formatted response with translated text
   */
  async formatResponse(
    weatherData: WeatherResponse,
    language: string
  ): Promise<FormattedWeatherResponse> {
    // Create English response template
    const forecastText = weatherData.forecast
      .map((day, index) => {
        const dayLabel = index === 0 ? 'Today' : index === 1 ? 'Tomorrow' : 'Day after tomorrow';
        return `${dayLabel}: ${day.condition}, ${day.temperature.min}°C - ${day.temperature.max}°C, Rainfall: ${day.rainfall}mm`;
      })
      .join('. ');

    const englishText = `Weather in ${weatherData.location}: ` +
      `Currently ${weatherData.current.temperature}°C, ${weatherData.current.condition}. ` +
      `Humidity: ${weatherData.current.humidity}%. ` +
      `Rainfall: ${weatherData.current.rainfall}mm. ` +
      `3-Day Forecast: ${forecastText}. ` +
      `Farming Advice: ${weatherData.farmingAdvice}`;

    // Translate to user's language if needed
    let responseText = englishText;
    if (language !== 'en') {
      try {
        const translation = await translationService.translateText({
          text: englishText,
          sourceLanguage: 'en',
          targetLanguage: language,
        });
        responseText = translation.translatedText;
      } catch (error) {
        console.error('[WeatherHandler] Translation failed:', error);
        // Fall back to English if translation fails
      }
    }

    return {
      text: responseText,
      data: weatherData,
    };
  }

  /**
   * Convert location name to coordinates using OpenWeatherMap Geocoding API
   * Results are cached to reduce API calls
   * @param location - Location name
   * @returns Coordinates and location details
   */
  private async geocode(location: string): Promise<GeocodingResult> {
    const normalizedLocation = location.toLowerCase().trim();

    // Check cache first
    if (this.geocodingCache.has(normalizedLocation)) {
      return this.geocodingCache.get(normalizedLocation)!;
    }

    try {
      const response = await axios.get<GeocodingResult[]>(
        `https://api.openweathermap.org/geo/1.0/direct`,
        {
          params: {
            q: location,
            limit: 1,
            appid: this.apiKey,
          },
        }
      );

      if (!response.data || response.data.length === 0) {
        throw new Error(`Location not found: ${location}`);
      }

      const result = response.data[0];
      
      // Cache the result
      this.geocodingCache.set(normalizedLocation, result);

      return result;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Geocoding failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Fetch current weather from OpenWeatherMap API
   * @param lat - Latitude
   * @param lon - Longitude
   * @returns Current weather data
   */
  private async getCurrentWeather(
    lat: number,
    lon: number
  ): Promise<OpenWeatherCurrentResponse> {
    try {
      const response = await axios.get<OpenWeatherCurrentResponse>(
        `${this.baseUrl}/weather`,
        {
          params: {
            lat,
            lon,
            appid: this.apiKey,
            units: 'metric',
          },
        }
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to fetch current weather: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Fetch 3-day forecast from OpenWeatherMap API
   * @param lat - Latitude
   * @param lon - Longitude
   * @returns Array of forecast data for next 3 days
   */
  private async getForecast(
    lat: number,
    lon: number
  ): Promise<Array<{
    date: Date;
    temperature: { min: number; max: number };
    rainfall: number;
    condition: string;
  }>> {
    try {
      const response = await axios.get<OpenWeatherForecastResponse>(
        `${this.baseUrl}/forecast`,
        {
          params: {
            lat,
            lon,
            appid: this.apiKey,
            units: 'metric',
          },
        }
      );

      // Group forecast by day and calculate daily min/max
      const dailyForecasts = new Map<string, any>();

      for (const item of response.data.list) {
        const date = new Date(item.dt * 1000);
        const dateKey = date.toISOString().split('T')[0];

        if (!dailyForecasts.has(dateKey)) {
          dailyForecasts.set(dateKey, {
            date,
            temps: [],
            rainfall: 0,
            conditions: [],
          });
        }

        const dayData = dailyForecasts.get(dateKey);
        dayData.temps.push(item.main.temp_min, item.main.temp_max);
        dayData.rainfall += item.rain?.['3h'] || 0;
        dayData.conditions.push(item.weather[0]?.main || 'Unknown');
      }

      // Convert to array and take first 3 days
      const forecastArray = Array.from(dailyForecasts.values())
        .slice(0, 3)
        .map(day => ({
          date: day.date,
          temperature: {
            min: Math.round(Math.min(...day.temps)),
            max: Math.round(Math.max(...day.temps)),
          },
          rainfall: Math.round(day.rainfall * 10) / 10,
          condition: this.getMostCommonCondition(day.conditions),
        }));

      return forecastArray;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to fetch forecast: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get most common weather condition from array
   * @param conditions - Array of weather conditions
   * @returns Most frequent condition
   */
  private getMostCommonCondition(conditions: string[]): string {
    const counts = new Map<string, number>();
    for (const condition of conditions) {
      counts.set(condition, (counts.get(condition) || 0) + 1);
    }

    let maxCount = 0;
    let mostCommon = 'Unknown';
    for (const [condition, count] of counts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = condition;
      }
    }

    return mostCommon;
  }

  /**
   * Generate farming advice based on weather conditions
   * Uses rule-based logic to provide actionable recommendations
   * @param current - Current weather data
   * @param forecast - 3-day forecast
   * @returns Farming advice string
   */
  private generateFarmingAdvice(
    current: OpenWeatherCurrentResponse,
    forecast: Array<{
      date: Date;
      temperature: { min: number; max: number };
      rainfall: number;
      condition: string;
    }>
  ): string {
    const advicePoints: string[] = [];

    // Check for heavy rain
    const totalRainfall = forecast.reduce((sum, day) => sum + day.rainfall, 0);
    if (totalRainfall > 50) {
      advicePoints.push('Heavy rain expected. Avoid spraying pesticides and ensure proper drainage in fields');
    } else if (totalRainfall > 20) {
      advicePoints.push('Moderate rain expected. Good time for transplanting and sowing');
    } else if (totalRainfall < 5) {
      advicePoints.push('Low rainfall expected. Increase irrigation frequency');
    }

    // Check temperature
    const maxTemp = Math.max(...forecast.map(day => day.temperature.max));
    const minTemp = Math.min(...forecast.map(day => day.temperature.min));

    if (maxTemp > 35) {
      advicePoints.push('High temperatures expected. Provide shade for sensitive crops and increase watering');
    } else if (minTemp < 10) {
      advicePoints.push('Low temperatures expected. Protect sensitive crops from cold stress');
    }

    // Check humidity
    if (current.main.humidity > 80) {
      advicePoints.push('High humidity may increase disease risk. Monitor crops for fungal infections');
    } else if (current.main.humidity < 40) {
      advicePoints.push('Low humidity. Ensure adequate soil moisture');
    }

    // Check for storms
    const hasStorms = forecast.some(day => 
      day.condition.toLowerCase().includes('storm') || 
      day.condition.toLowerCase().includes('thunder')
    );
    if (hasStorms) {
      advicePoints.push('Storms expected. Secure equipment and protect young plants');
    }

    // Default advice if no specific conditions
    if (advicePoints.length === 0) {
      advicePoints.push('Weather conditions are favorable for normal farming activities');
    }

    return advicePoints.join('. ') + '.';
  }
}
