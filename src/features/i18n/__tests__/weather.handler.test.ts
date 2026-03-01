import { WeatherHandler } from '../handlers/weather.handler';
import { translationService } from '../translation.service';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock translation service
jest.mock('../translation.service', () => ({
  translationService: {
    translateText: jest.fn(),
  },
}));

describe('WeatherHandler', () => {
  let handler: WeatherHandler;
  const mockApiKey = 'test-api-key';

  beforeEach(() => {
    handler = new WeatherHandler(mockApiKey);
    jest.clearAllMocks();
  });

  describe('handle', () => {
    it('should return weather data with farming advice for a valid location', async () => {
      // Arrange
      const mockGeocodingResponse = {
        data: [
          {
            lat: 28.6139,
            lon: 77.209,
            name: 'Delhi',
            country: 'IN',
          },
        ],
      };

      const mockCurrentWeatherResponse = {
        data: {
          main: {
            temp: 32,
            humidity: 65,
          },
          weather: [
            {
              main: 'Clear',
              description: 'clear sky',
            },
          ],
          rain: {
            '1h': 0,
          },
        },
      };

      const mockForecastResponse = {
        data: {
          list: [
            {
              dt: Date.now() / 1000,
              main: {
                temp_min: 28,
                temp_max: 35,
                humidity: 60,
              },
              weather: [{ main: 'Clear', description: 'clear sky' }],
              rain: { '3h': 0 },
            },
            {
              dt: Date.now() / 1000 + 86400,
              main: {
                temp_min: 27,
                temp_max: 34,
                humidity: 65,
              },
              weather: [{ main: 'Clouds', description: 'few clouds' }],
              rain: { '3h': 2 },
            },
            {
              dt: Date.now() / 1000 + 172800,
              main: {
                temp_min: 26,
                temp_max: 33,
                humidity: 70,
              },
              weather: [{ main: 'Rain', description: 'light rain' }],
              rain: { '3h': 5 },
            },
          ],
        },
      };

      mockedAxios.get
        .mockResolvedValueOnce(mockGeocodingResponse)
        .mockResolvedValueOnce(mockCurrentWeatherResponse)
        .mockResolvedValueOnce(mockForecastResponse);

      // Act
      const result = await handler.handle('Delhi');

      // Assert
      expect(result).toEqual({
        location: 'Delhi',
        current: {
          temperature: 32,
          humidity: 65,
          rainfall: 0,
          condition: 'clear sky',
        },
        forecast: expect.arrayContaining([
          expect.objectContaining({
            date: expect.any(Date),
            temperature: expect.objectContaining({
              min: expect.any(Number),
              max: expect.any(Number),
            }),
            rainfall: expect.any(Number),
            condition: expect.any(String),
          }),
        ]),
        farmingAdvice: expect.any(String),
      });

      expect(result.forecast).toHaveLength(3);
    });

    it('should throw error when API key is not configured', async () => {
      // Arrange
      const handlerWithoutKey = new WeatherHandler('');

      // Act & Assert
      await expect(handlerWithoutKey.handle('Delhi')).rejects.toThrow(
        'OpenWeatherMap API key not configured'
      );
    });

    it('should throw error when location is not found', async () => {
      // Arrange
      mockedAxios.get.mockResolvedValueOnce({ data: [] });

      // Act & Assert
      await expect(handler.handle('InvalidLocation123')).rejects.toThrow(
        'Location not found: InvalidLocation123'
      );
    });

    it('should cache geocoding results', async () => {
      // Arrange
      const mockGeocodingResponse = {
        data: [
          {
            lat: 28.6139,
            lon: 77.209,
            name: 'Delhi',
            country: 'IN',
          },
        ],
      };

      const mockCurrentWeatherResponse = {
        data: {
          main: { temp: 30, humidity: 60 },
          weather: [{ main: 'Clear', description: 'clear sky' }],
        },
      };

      const mockForecastResponse = {
        data: {
          list: [
            {
              dt: Date.now() / 1000,
              main: { temp_min: 28, temp_max: 32, humidity: 60 },
              weather: [{ main: 'Clear', description: 'clear sky' }],
              rain: { '3h': 5 },
            },
          ],
        },
      };

      // First call - geocoding + weather + forecast
      mockedAxios.get
        .mockResolvedValueOnce(mockGeocodingResponse)
        .mockResolvedValueOnce(mockCurrentWeatherResponse)
        .mockResolvedValueOnce(mockForecastResponse);

      // Act - first call
      await handler.handle('Delhi');
      
      // Second call - only weather + forecast (geocoding cached)
      mockedAxios.get
        .mockResolvedValueOnce(mockCurrentWeatherResponse)
        .mockResolvedValueOnce(mockForecastResponse);
      
      // Act - second call
      await handler.handle('Delhi');

      // Assert - geocoding should only be called once (cached)
      const geocodingCalls = mockedAxios.get.mock.calls.filter(
        call => call[0]?.includes('geo/1.0/direct')
      );
      expect(geocodingCalls).toHaveLength(1);
    });
  });

  describe('farming advice generation', () => {
    it('should advise on heavy rain', async () => {
      // Arrange
      const mockGeocodingResponse = {
        data: [{ lat: 28.6139, lon: 77.209, name: 'Delhi', country: 'IN' }],
      };

      const mockCurrentWeatherResponse = {
        data: {
          main: { temp: 28, humidity: 85 },
          weather: [{ main: 'Rain', description: 'heavy rain' }],
          rain: { '1h': 20 },
        },
      };

      const mockForecastResponse = {
        data: {
          list: [
            {
              dt: Date.now() / 1000,
              main: { temp_min: 26, temp_max: 30, humidity: 85 },
              weather: [{ main: 'Rain', description: 'heavy rain' }],
              rain: { '3h': 30 },
            },
            {
              dt: Date.now() / 1000 + 86400,
              main: { temp_min: 25, temp_max: 29, humidity: 90 },
              weather: [{ main: 'Rain', description: 'heavy rain' }],
              rain: { '3h': 35 },
            },
          ],
        },
      };

      mockedAxios.get
        .mockResolvedValueOnce(mockGeocodingResponse)
        .mockResolvedValueOnce(mockCurrentWeatherResponse)
        .mockResolvedValueOnce(mockForecastResponse);

      // Act
      const result = await handler.handle('Delhi');

      // Assert
      expect(result.farmingAdvice).toContain('Heavy rain expected');
      expect(result.farmingAdvice).toContain('drainage');
    });

    it('should advise on high temperature', async () => {
      // Arrange
      const mockGeocodingResponse = {
        data: [{ lat: 28.6139, lon: 77.209, name: 'Delhi', country: 'IN' }],
      };

      const mockCurrentWeatherResponse = {
        data: {
          main: { temp: 38, humidity: 40 },
          weather: [{ main: 'Clear', description: 'clear sky' }],
        },
      };

      const mockForecastResponse = {
        data: {
          list: [
            {
              dt: Date.now() / 1000,
              main: { temp_min: 35, temp_max: 40, humidity: 40 },
              weather: [{ main: 'Clear', description: 'clear sky' }],
              rain: { '3h': 0 },
            },
          ],
        },
      };

      mockedAxios.get
        .mockResolvedValueOnce(mockGeocodingResponse)
        .mockResolvedValueOnce(mockCurrentWeatherResponse)
        .mockResolvedValueOnce(mockForecastResponse);

      // Act
      const result = await handler.handle('Delhi');

      // Assert
      expect(result.farmingAdvice).toContain('High temperatures expected');
      expect(result.farmingAdvice).toContain('shade');
    });

    it('should advise on low rainfall', async () => {
      // Arrange
      const mockGeocodingResponse = {
        data: [{ lat: 28.6139, lon: 77.209, name: 'Delhi', country: 'IN' }],
      };

      const mockCurrentWeatherResponse = {
        data: {
          main: { temp: 32, humidity: 35 },
          weather: [{ main: 'Clear', description: 'clear sky' }],
        },
      };

      const mockForecastResponse = {
        data: {
          list: [
            {
              dt: Date.now() / 1000,
              main: { temp_min: 28, temp_max: 35, humidity: 35 },
              weather: [{ main: 'Clear', description: 'clear sky' }],
              rain: { '3h': 0 },
            },
          ],
        },
      };

      mockedAxios.get
        .mockResolvedValueOnce(mockGeocodingResponse)
        .mockResolvedValueOnce(mockCurrentWeatherResponse)
        .mockResolvedValueOnce(mockForecastResponse);

      // Act
      const result = await handler.handle('Delhi');

      // Assert
      expect(result.farmingAdvice).toContain('Low rainfall expected');
      expect(result.farmingAdvice).toContain('irrigation');
    });

    it('should advise on high humidity', async () => {
      // Arrange
      const mockGeocodingResponse = {
        data: [{ lat: 28.6139, lon: 77.209, name: 'Delhi', country: 'IN' }],
      };

      const mockCurrentWeatherResponse = {
        data: {
          main: { temp: 30, humidity: 85 },
          weather: [{ main: 'Clouds', description: 'overcast clouds' }],
        },
      };

      const mockForecastResponse = {
        data: {
          list: [
            {
              dt: Date.now() / 1000,
              main: { temp_min: 28, temp_max: 32, humidity: 85 },
              weather: [{ main: 'Clouds', description: 'overcast clouds' }],
              rain: { '3h': 10 },
            },
          ],
        },
      };

      mockedAxios.get
        .mockResolvedValueOnce(mockGeocodingResponse)
        .mockResolvedValueOnce(mockCurrentWeatherResponse)
        .mockResolvedValueOnce(mockForecastResponse);

      // Act
      const result = await handler.handle('Delhi');

      // Assert
      expect(result.farmingAdvice).toContain('High humidity');
      expect(result.farmingAdvice).toContain('disease');
    });

    it('should provide default advice for favorable conditions', async () => {
      // Arrange
      const mockGeocodingResponse = {
        data: [{ lat: 28.6139, lon: 77.209, name: 'Delhi', country: 'IN' }],
      };

      const mockCurrentWeatherResponse = {
        data: {
          main: { temp: 28, humidity: 60 },
          weather: [{ main: 'Clear', description: 'clear sky' }],
        },
      };

      const mockForecastResponse = {
        data: {
          list: [
            {
              dt: Date.now() / 1000,
              main: { temp_min: 25, temp_max: 30, humidity: 60 },
              weather: [{ main: 'Clear', description: 'clear sky' }],
              rain: { '3h': 8 },
            },
          ],
        },
      };

      mockedAxios.get
        .mockResolvedValueOnce(mockGeocodingResponse)
        .mockResolvedValueOnce(mockCurrentWeatherResponse)
        .mockResolvedValueOnce(mockForecastResponse);

      // Act
      const result = await handler.handle('Delhi');

      // Assert
      expect(result.farmingAdvice).toContain('favorable');
    });
  });

  describe('formatResponse', () => {
    it('should format response in English', async () => {
      // Arrange
      const weatherData = {
        location: 'Delhi',
        current: {
          temperature: 32,
          humidity: 65,
          rainfall: 0,
          condition: 'clear sky',
        },
        forecast: [
          {
            date: new Date(),
            temperature: { min: 28, max: 35 },
            rainfall: 0,
            condition: 'Clear',
          },
          {
            date: new Date(),
            temperature: { min: 27, max: 34 },
            rainfall: 2,
            condition: 'Clouds',
          },
          {
            date: new Date(),
            temperature: { min: 26, max: 33 },
            rainfall: 5,
            condition: 'Rain',
          },
        ],
        farmingAdvice: 'Weather conditions are favorable for farming.',
      };

      // Act
      const result = await handler.formatResponse(weatherData, 'en');

      // Assert
      expect(result.text).toContain('Delhi');
      expect(result.text).toContain('32°C');
      expect(result.text).toContain('65%');
      expect(result.text).toContain('clear sky');
      expect(result.text).toContain('favorable');
      expect(result.data).toEqual(weatherData);
    });

    it('should translate response to Hindi', async () => {
      // Arrange
      const weatherData = {
        location: 'Delhi',
        current: {
          temperature: 32,
          humidity: 65,
          rainfall: 0,
          condition: 'clear sky',
        },
        forecast: [
          {
            date: new Date(),
            temperature: { min: 28, max: 35 },
            rainfall: 0,
            condition: 'Clear',
          },
        ],
        farmingAdvice: 'Weather is good.',
      };

      (translationService.translateText as jest.Mock).mockResolvedValue({
        translatedText: 'दिल्ली में मौसम: वर्तमान में 32°C, साफ आसमान।',
        sourceLanguage: 'en',
        targetLanguage: 'hi',
      });

      // Act
      const result = await handler.formatResponse(weatherData, 'hi');

      // Assert
      expect(translationService.translateText).toHaveBeenCalledWith({
        text: expect.stringContaining('Delhi'),
        sourceLanguage: 'en',
        targetLanguage: 'hi',
      });
      expect(result.text).toContain('दिल्ली');
    });

    it('should handle translation failure gracefully', async () => {
      // Arrange
      const weatherData = {
        location: 'Delhi',
        current: {
          temperature: 32,
          humidity: 65,
          rainfall: 0,
          condition: 'clear sky',
        },
        forecast: [],
        farmingAdvice: 'Weather is good.',
      };

      (translationService.translateText as jest.Mock).mockRejectedValue(
        new Error('Translation failed')
      );

      // Act
      const result = await handler.formatResponse(weatherData, 'hi');

      // Assert - should fall back to English
      expect(result.text).toContain('Delhi');
      expect(result.text).toContain('32°C');
    });
  });

  describe('error handling', () => {
    it('should handle geocoding API errors', async () => {
      // Arrange
      const error = new Error('Network error');
      (error as any).isAxiosError = true;
      mockedAxios.get.mockRejectedValueOnce(error);
      (mockedAxios.isAxiosError as any) = jest.fn().mockReturnValue(true);

      // Act & Assert
      await expect(handler.handle('Delhi')).rejects.toThrow('Geocoding failed');
    });

    it('should handle current weather API errors', async () => {
      // Arrange
      const mockGeocodingResponse = {
        data: [{ lat: 28.6139, lon: 77.209, name: 'Delhi', country: 'IN' }],
      };

      const error = new Error('API error');
      (error as any).isAxiosError = true;
      
      mockedAxios.get
        .mockResolvedValueOnce(mockGeocodingResponse)
        .mockRejectedValueOnce(error);
      (mockedAxios.isAxiosError as any) = jest.fn().mockReturnValue(true);

      // Act & Assert
      await expect(handler.handle('Delhi')).rejects.toThrow(
        'Failed to fetch current weather'
      );
    });

    it('should handle forecast API errors', async () => {
      // Arrange
      const mockGeocodingResponse = {
        data: [{ lat: 28.6139, lon: 77.209, name: 'Delhi', country: 'IN' }],
      };

      const mockCurrentWeatherResponse = {
        data: {
          main: { temp: 30, humidity: 60 },
          weather: [{ main: 'Clear', description: 'clear sky' }],
        },
      };

      const error = new Error('Forecast error');
      (error as any).isAxiosError = true;

      mockedAxios.get
        .mockResolvedValueOnce(mockGeocodingResponse)
        .mockResolvedValueOnce(mockCurrentWeatherResponse)
        .mockRejectedValueOnce(error);
      (mockedAxios.isAxiosError as any) = jest.fn().mockReturnValue(true);

      // Act & Assert
      await expect(handler.handle('Delhi')).rejects.toThrow(
        'Failed to fetch forecast'
      );
    });
  });

  describe('edge cases', () => {
    it('should handle location names with whitespace', async () => {
      // Arrange
      const mockGeocodingResponse = {
        data: [{ lat: 28.6139, lon: 77.209, name: 'New Delhi', country: 'IN' }],
      };

      const mockCurrentWeatherResponse = {
        data: {
          main: { temp: 30, humidity: 60 },
          weather: [{ main: 'Clear', description: 'clear sky' }],
        },
      };

      const mockForecastResponse = {
        data: {
          list: [
            {
              dt: Date.now() / 1000,
              main: { temp_min: 28, temp_max: 32, humidity: 60 },
              weather: [{ main: 'Clear', description: 'clear sky' }],
            },
          ],
        },
      };

      mockedAxios.get
        .mockResolvedValueOnce(mockGeocodingResponse)
        .mockResolvedValueOnce(mockCurrentWeatherResponse)
        .mockResolvedValueOnce(mockForecastResponse);

      // Act
      const result = await handler.handle('  New Delhi  ');

      // Assert
      expect(result.location).toBe('New Delhi');
    });

    it('should handle missing rainfall data', async () => {
      // Arrange
      const mockGeocodingResponse = {
        data: [{ lat: 28.6139, lon: 77.209, name: 'Delhi', country: 'IN' }],
      };

      const mockCurrentWeatherResponse = {
        data: {
          main: { temp: 30, humidity: 60 },
          weather: [{ main: 'Clear', description: 'clear sky' }],
          // No rain property
        },
      };

      const mockForecastResponse = {
        data: {
          list: [
            {
              dt: Date.now() / 1000,
              main: { temp_min: 28, temp_max: 32, humidity: 60 },
              weather: [{ main: 'Clear', description: 'clear sky' }],
              // No rain property
            },
          ],
        },
      };

      mockedAxios.get
        .mockResolvedValueOnce(mockGeocodingResponse)
        .mockResolvedValueOnce(mockCurrentWeatherResponse)
        .mockResolvedValueOnce(mockForecastResponse);

      // Act
      const result = await handler.handle('Delhi');

      // Assert
      expect(result.current.rainfall).toBe(0);
      expect(result.forecast[0].rainfall).toBe(0);
    });
  });
});
