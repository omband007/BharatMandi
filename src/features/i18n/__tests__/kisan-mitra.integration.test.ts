import { KisanMitraService } from '../kisan-mitra.service';
import { LexRuntimeV2Client, RecognizeTextCommand } from '@aws-sdk/client-lex-runtime-v2';
import { translationService } from '../translation.service';
import { voiceService } from '../voice.service';

// Mock AWS SDK - must be before imports
jest.mock('@aws-sdk/client-lex-runtime-v2', () => {
  const mockSend = jest.fn();
  return {
    LexRuntimeV2Client: jest.fn().mockImplementation(() => ({
      send: mockSend,
    })),
    RecognizeTextCommand: jest.fn(),
    RecognizeUtteranceCommand: jest.fn(),
  };
});

// Mock services
jest.mock('../translation.service');
jest.mock('../voice.service');

// Mock DatabaseManager
jest.mock('../../../shared/database/db-abstraction', () => ({
  DatabaseManager: jest.fn().mockImplementation(() => ({
    getActiveListings: jest.fn().mockResolvedValue([
      {
        id: '1',
        produceType: 'tomato',
        pricePerKg: 35,
        createdAt: new Date(),
      },
      {
        id: '2',
        produceType: 'tomato',
        pricePerKg: 40,
        createdAt: new Date(),
      },
    ]),
  })),
}));

// Mock MongoDB
jest.mock('mongodb', () => ({
  MongoClient: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    db: jest.fn().mockReturnValue({
      collection: jest.fn().mockReturnValue({
        insertOne: jest.fn().mockResolvedValue({ insertedId: '123' }),
        find: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          toArray: jest.fn().mockResolvedValue([]),
        }),
        updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
        countDocuments: jest.fn().mockResolvedValue(0),
        distinct: jest.fn().mockResolvedValue([]),
        aggregate: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([]),
        }),
      }),
    }),
    close: jest.fn().mockResolvedValue(undefined),
  })),
}));

// Mock FarmingTipModel
jest.mock('../../../shared/database/mongodb-models', () => ({
  FarmingTipModel: {
    find: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue([
        {
          crop: 'tomato',
          topic: 'planting',
          advice: 'Plant tomatoes in well-drained soil with full sunlight.',
          tips: ['Water regularly', 'Provide support for vines'],
          references: ['Agricultural Guide 2024'],
          language: 'en',
        },
      ]),
    }),
    distinct: jest.fn().mockResolvedValue(['tomato', 'potato', 'wheat']),
  },
}));

describe('KisanMitraService - Integration Tests', () => {
  let service: KisanMitraService;
  let mockSend: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Set environment variable for weather API
    process.env.OPENWEATHER_API_KEY = 'test-api-key';

    // Get the mock send function from the mocked LexRuntimeV2Client
    const LexClientMock = LexRuntimeV2Client as jest.MockedClass<typeof LexRuntimeV2Client>;
    const mockInstance = new LexClientMock({} as any);
    mockSend = mockInstance.send as jest.Mock;

    // Set default mock response
    mockSend.mockResolvedValue({
      sessionState: {
        intent: {
          name: 'Unknown',
          state: 'Failed',
          slots: {},
        },
      },
      messages: [{ content: 'Default response' }],
    });

    // Mock translation service
    (translationService.translateText as jest.Mock).mockResolvedValue({
      translatedText: 'Translated text',
      detectedSourceLanguage: 'en',
    });

    // Mock voice service
    (voiceService.synthesizeSpeech as jest.Mock).mockResolvedValue({
      success: true,
      audioUrl: 'https://example.com/audio.mp3',
    });

    service = new KisanMitraService();
  });

  afterEach(async () => {
    await service.close();
  });

  describe('Crop Price Query Integration', () => {
    it('should process crop price query end-to-end', async () => {
      // Mock Lex response for crop price query
      mockSend.mockResolvedValueOnce({
        sessionState: {
          intent: {
            name: 'GetCropPrice',
            state: 'Fulfilled',
            slots: {
              crop: {
                value: {
                  interpretedValue: 'tomato',
                },
              },
            },
          },
        },
        messages: [
          {
            content: 'Let me check the price for tomato.',
          },
        ],
      });

      const response = await service.processQuery({
        userId: 'user123',
        sessionId: 'session123',
        query: 'What is the price of tomato?',
        language: 'en',
      });

      expect(response).toBeDefined();
      expect(response.intent).toBe('GetCropPrice');
      expect(response.confidence).toBe(0.95);
      expect(response.text.toLowerCase()).toContain('tomato');
      expect(response.text).toContain('₹');
      expect(mockSend).toHaveBeenCalled();
    });

    it('should handle crop price query with location', async () => {
      mockSend.mockResolvedValueOnce({
        sessionState: {
          intent: {
            name: 'GetCropPrice',
            state: 'Fulfilled',
            slots: {
              crop: {
                value: {
                  interpretedValue: 'tomato',
                },
              },
              location: {
                value: {
                  interpretedValue: 'Mumbai',
                },
              },
            },
          },
        },
        messages: [
          {
            content: 'Let me check the price for tomato in Mumbai.',
          },
        ],
      });

      const response = await service.processQuery({
        userId: 'user123',
        sessionId: 'session123',
        query: 'What is the price of tomato in Mumbai?',
        language: 'en',
      });

      expect(response).toBeDefined();
      expect(response.intent).toBe('GetCropPrice');
      expect(response.text.toLowerCase()).toContain('tomato');
    });

    it('should handle crop not found gracefully', async () => {
      // Mock empty listings
      const { DatabaseManager } = require('../../../shared/database/db-abstraction');
      DatabaseManager.mockImplementation(() => ({
        getActiveListings: jest.fn().mockResolvedValue([]),
      }));

      const serviceWithEmptyDb = new KisanMitraService();

      mockSend.mockResolvedValueOnce({
        sessionState: {
          intent: {
            name: 'GetCropPrice',
            state: 'Fulfilled',
            slots: {
              crop: {
                value: {
                  interpretedValue: 'dragonfruit',
                },
              },
            },
          },
        },
        messages: [
          {
            content: 'Let me check the price for dragonfruit.',
          },
        ],
      });

      const response = await serviceWithEmptyDb.processQuery({
        userId: 'user123',
        sessionId: 'session123',
        query: 'What is the price of dragonfruit?',
        language: 'en',
      });

      expect(response).toBeDefined();
      expect(response.text).toContain('No listings found');

      await serviceWithEmptyDb.close();
    });
  });

  describe('Weather Query Integration', () => {
    it('should process weather query end-to-end', async () => {
      // Mock axios for weather API
      const axios = require('axios');
      axios.get = jest.fn()
        .mockResolvedValueOnce({
          // Geocoding response
          data: [
            {
              lat: 19.076,
              lon: 72.8777,
              name: 'Mumbai',
              country: 'IN',
            },
          ],
        })
        .mockResolvedValueOnce({
          // Current weather response
          data: {
            main: {
              temp: 28,
              humidity: 75,
            },
            weather: [
              {
                main: 'Clear',
                description: 'clear sky',
              },
            ],
          },
        })
        .mockResolvedValueOnce({
          // Forecast response
          data: {
            list: [
              {
                dt: Date.now() / 1000,
                main: {
                  temp_min: 25,
                  temp_max: 30,
                  humidity: 70,
                },
                weather: [
                  {
                    main: 'Clear',
                    description: 'clear sky',
                  },
                ],
              },
            ],
          },
        });

      mockSend.mockResolvedValueOnce({
        sessionState: {
          intent: {
            name: 'GetWeather',
            state: 'Fulfilled',
            slots: {
              location: {
                value: {
                  interpretedValue: 'Mumbai',
                },
              },
            },
          },
        },
        messages: [
          {
            content: 'Let me check the weather for Mumbai.',
          },
        ],
      });

      const response = await service.processQuery({
        userId: 'user123',
        sessionId: 'session123',
        query: 'What is the weather in Mumbai?',
        language: 'en',
      });

      expect(response).toBeDefined();
      expect(response.intent).toBe('GetWeather');
      expect(response.confidence).toBe(0.95);
      expect(response.text).toContain('Mumbai');
      expect(response.text).toContain('°C');
    });

    it('should handle invalid location gracefully', async () => {
      const axios = require('axios');
      axios.get = jest.fn().mockResolvedValue({
        data: [], // Empty geocoding result
      });

      mockSend.mockResolvedValueOnce({
        sessionState: {
          intent: {
            name: 'GetWeather',
            state: 'Fulfilled',
            slots: {
              location: {
                value: {
                  interpretedValue: 'InvalidCity123',
                },
              },
            },
          },
        },
        messages: [
          {
            content: 'Let me check the weather.',
          },
        ],
      });

      const response = await service.processQuery({
        userId: 'user123',
        sessionId: 'session123',
        query: 'What is the weather in InvalidCity123?',
        language: 'en',
      });

      expect(response).toBeDefined();
      expect(response.text).toContain('Location not found');
    });
  });

  describe('Farming Advice Query Integration', () => {
    it('should process farming advice query end-to-end', async () => {
      mockSend.mockResolvedValueOnce({
        sessionState: {
          intent: {
            name: 'GetFarmingAdvice',
            state: 'Fulfilled',
            slots: {
              crop: {
                value: {
                  interpretedValue: 'tomato',
                },
              },
              topic: {
                value: {
                  interpretedValue: 'planting',
                },
              },
            },
          },
        },
        messages: [
          {
            content: 'Let me get farming advice for tomato.',
          },
        ],
      });

      const response = await service.processQuery({
        userId: 'user123',
        sessionId: 'session123',
        query: 'How do I plant tomatoes?',
        language: 'en',
      });

      expect(response).toBeDefined();
      expect(response.intent).toBe('GetFarmingAdvice');
      expect(response.confidence).toBe(0.95);
      expect(response.text).toContain('tomato');
      expect(response.text).toContain('Plant');
    });

    it('should handle missing crop gracefully', async () => {
      mockSend.mockResolvedValueOnce({
        sessionState: {
          intent: {
            name: 'GetFarmingAdvice',
            state: 'Fulfilled',
            slots: {
              topic: {
                value: {
                  interpretedValue: 'planting',
                },
              },
            },
          },
        },
        messages: [
          {
            content: 'Let me get farming advice.',
          },
        ],
      });

      const response = await service.processQuery({
        userId: 'user123',
        sessionId: 'session123',
        query: 'How do I plant?',
        language: 'en',
      });

      expect(response).toBeDefined();
      expect(response.text).toContain('required');
    });
  });

  describe('Multi-language Support', () => {
    it('should handle Hindi query with translation', async () => {
      (translationService.translateText as jest.Mock)
        .mockResolvedValueOnce({
          translatedText: 'What is the price of tomato?',
          detectedSourceLanguage: 'hi',
        })
        .mockResolvedValueOnce({
          translatedText: 'टमाटर की कीमत ₹35 प्रति किलो है।',
          detectedSourceLanguage: 'en',
        });

      mockSend.mockResolvedValueOnce({
        sessionState: {
          intent: {
            name: 'GetCropPrice',
            state: 'Fulfilled',
            slots: {
              crop: {
                value: {
                  interpretedValue: 'tomato',
                },
              },
            },
          },
        },
        messages: [
          {
            content: 'Let me check the price for tomato.',
          },
        ],
      });

      const response = await service.processQuery({
        userId: 'user123',
        sessionId: 'session123',
        query: 'टमाटर का भाव क्या है?',
        language: 'hi',
      });

      expect(response).toBeDefined();
      expect(translationService.translateText).toHaveBeenCalledWith({
        text: expect.any(String),
        sourceLanguage: 'hi',
        targetLanguage: 'en',
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle Lex service errors gracefully', async () => {
      mockSend.mockRejectedValueOnce(new Error('Lex service unavailable'));

      await expect(
        service.processQuery({
          userId: 'user123',
          sessionId: 'session123',
          query: 'What is the price of tomato?',
          language: 'en',
        })
      ).rejects.toThrow('Failed to process query');
    });

    it('should handle handler exceptions gracefully', async () => {
      mockSend.mockResolvedValueOnce({
        sessionState: {
          intent: {
            name: 'GetCropPrice',
            state: 'Fulfilled',
            slots: {
              crop: {
                value: {
                  interpretedValue: 'tomato',
                },
              },
            },
          },
        },
        messages: [
          {
            content: 'Let me check the price.',
          },
        ],
      });

      // Mock database error
      const { DatabaseManager } = require('../../../shared/database/db-abstraction');
      DatabaseManager.mockImplementation(() => ({
        getActiveListings: jest.fn().mockRejectedValue(new Error('Database error')),
      }));

      const serviceWithError = new KisanMitraService();

      const response = await serviceWithError.processQuery({
        userId: 'user123',
        sessionId: 'session123',
        query: 'What is the price of tomato?',
        language: 'en',
      });

      expect(response).toBeDefined();
      expect(response.text).toContain('issue');

      await serviceWithError.close();
    });
  });
});
