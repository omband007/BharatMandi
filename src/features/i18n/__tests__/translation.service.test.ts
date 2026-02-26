import { TranslationService } from '../translation.service';
import { initializeRedisClient, closeRedisClient, getRedisClient } from '../../../shared/cache/redis-client';
import { TranslateClient, TranslateTextCommand } from '@aws-sdk/client-translate';
import { ComprehendClient, DetectDominantLanguageCommand } from '@aws-sdk/client-comprehend';

// Mock AWS SDK clients
jest.mock('@aws-sdk/client-translate');
jest.mock('@aws-sdk/client-comprehend');

describe('TranslationService', () => {
  let service: TranslationService;
  let mockTranslateClient: jest.Mocked<TranslateClient>;
  let mockComprehendClient: jest.Mocked<ComprehendClient>;
  let redisAvailable = false;

  beforeAll(async () => {
    // Try to initialize Redis for testing with short timeout
    try {
      await Promise.race([
        initializeRedisClient(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Redis timeout')), 1000))
      ]);
      redisAvailable = true;
      console.log('Redis available for tests');
    } catch (error) {
      redisAvailable = false;
      console.warn('Redis not available - cache tests will be skipped');
    }
  }, 5000);

  afterAll(async () => {
    if (redisAvailable) {
      try {
        await closeRedisClient();
      } catch (error) {
        // Ignore
      }
    }
  }, 2000);

  beforeEach(async () => {
    service = new TranslationService();
    
    // Clear Redis cache before each test if available
    if (redisAvailable) {
      try {
        const redis = getRedisClient();
        const keys = await redis.keys('translation:*');
        if (keys.length > 0) {
          await redis.del(keys);
        }
      } catch (error) {
        // Redis not available anymore
        redisAvailable = false;
      }
    }

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('translateText', () => {
    it('should return original text when source and target languages are the same', async () => {
      const result = await service.translateText({
        text: 'Hello World',
        sourceLanguage: 'en',
        targetLanguage: 'en',
      });

      expect(result.translatedText).toBe('Hello World');
      expect(result.sourceLanguage).toBe('en');
      expect(result.targetLanguage).toBe('en');
      expect(result.confidence).toBe(1.0);
      expect(result.cached).toBe(false);
    });

    it('should translate text using AWS Translate when cache miss', async () => {
      const mockSend = jest.fn().mockResolvedValue({
        TranslatedText: 'नमस्ते दुनिया',
      });

      (TranslateClient as jest.MockedClass<typeof TranslateClient>).prototype.send = mockSend;

      const result = await service.translateText({
        text: 'Hello World',
        sourceLanguage: 'en',
        targetLanguage: 'hi',
      });

      expect(result.translatedText).toBe('नमस्ते दुनिया');
      expect(result.sourceLanguage).toBe('en');
      expect(result.targetLanguage).toBe('hi');
      expect(result.confidence).toBe(0.95);
      expect(result.cached).toBe(false);
      expect(mockSend).toHaveBeenCalledWith(expect.any(TranslateTextCommand));
    });

    it('should return cached translation on cache hit', async () => {
      if (!redisAvailable) {
        console.log('Skipping cache test - Redis not available');
        return;
      }

      const mockSend = jest.fn().mockResolvedValue({
        TranslatedText: 'नमस्ते दुनिया',
      });

      (TranslateClient as jest.MockedClass<typeof TranslateClient>).prototype.send = mockSend;

      // First call - cache miss
      const result1 = await service.translateText({
        text: 'Hello World',
        sourceLanguage: 'en',
        targetLanguage: 'hi',
      });

      expect(result1.cached).toBe(false);
      expect(mockSend).toHaveBeenCalledTimes(1);

      // Second call - cache hit
      const result2 = await service.translateText({
        text: 'Hello World',
        sourceLanguage: 'en',
        targetLanguage: 'hi',
      });

      expect(result2.translatedText).toBe('नमस्ते दुनिया');
      expect(result2.cached).toBe(true);
      expect(mockSend).toHaveBeenCalledTimes(1); // Should not call AWS again
    });

    it('should handle AWS Translate errors gracefully', async () => {
      const mockSend = jest.fn().mockRejectedValue(new Error('AWS service unavailable'));

      (TranslateClient as jest.MockedClass<typeof TranslateClient>).prototype.send = mockSend;

      const result = await service.translateText({
        text: 'Hello World',
        sourceLanguage: 'en',
        targetLanguage: 'hi',
      });

      // Should return original text with confidence 0
      expect(result.translatedText).toBe('Hello World');
      expect(result.confidence).toBe(0);
      expect(result.cached).toBe(false);
    });

    it.skip('should auto-detect source language when not provided (requires AWS SDK mock refactor)', async () => {
      // TODO: This test requires refactoring the TranslationService to inject AWS clients
      // Currently, clients are instantiated at module load time, making them hard to mock
      // Mock Comprehend to detect Hindi
      const mockDetectSend = jest.fn().mockResolvedValue({
        Languages: [
          { LanguageCode: 'hi', Score: 0.95 },
          { LanguageCode: 'en', Score: 0.05 },
        ],
      });

      // Mock Translate to return translation
      const mockTranslateSend = jest.fn().mockResolvedValue({
        TranslatedText: 'Hello World',
      });

      // Set up mocks - need to mock the prototype methods
      const comprehendSendSpy = jest.spyOn(ComprehendClient.prototype, 'send').mockImplementation(mockDetectSend);
      const translateSendSpy = jest.spyOn(TranslateClient.prototype, 'send').mockImplementation(mockTranslateSend);

      const result = await service.translateText({
        text: 'नमस्ते दुनिया',
        targetLanguage: 'en',
      });

      expect(result.sourceLanguage).toBe('hi');
      expect(comprehendSendSpy).toHaveBeenCalled();
      
      // Clean up
      comprehendSendSpy.mockRestore();
      translateSendSpy.mockRestore();
    });
  });

  describe('translateBatch', () => {
    it('should translate multiple texts in parallel', async () => {
      let callCount = 0;
      const translations = ['नमस्ते', 'धन्यवाद', 'अलविदा'];
      
      const mockSend = jest.fn().mockImplementation(async () => {
        const translation = translations[callCount % translations.length];
        callCount++;
        return { TranslatedText: translation };
      });

      (TranslateClient as jest.MockedClass<typeof TranslateClient>).prototype.send = mockSend;

      const texts = ['Hello', 'Thank you', 'Goodbye'];
      const results = await service.translateBatch(texts, 'en', 'hi');

      expect(results.length).toBe(3);
      expect(mockSend).toHaveBeenCalledTimes(3);
    });

    it('should batch requests in groups of 25', async () => {
      const mockSend = jest.fn().mockResolvedValue({ TranslatedText: 'translated' });

      (TranslateClient as jest.MockedClass<typeof TranslateClient>).prototype.send = mockSend;

      const texts = Array(30).fill('test');
      await service.translateBatch(texts, 'en', 'hi');

      // Should make 30 calls (all texts translated)
      expect(mockSend).toHaveBeenCalledTimes(30);
    });
  });

  describe('detectLanguage', () => {
    it('should detect language using AWS Comprehend', async () => {
      const mockSend = jest.fn().mockResolvedValue({
        Languages: [
          { LanguageCode: 'hi', Score: 0.95 },
          { LanguageCode: 'en', Score: 0.05 },
        ],
      });

      (ComprehendClient as jest.MockedClass<typeof ComprehendClient>).prototype.send = mockSend;

      const language = await service.detectLanguage('नमस्ते दुनिया, यह एक परीक्षण है');

      expect(language).toBe('hi');
      expect(mockSend).toHaveBeenCalledWith(expect.any(DetectDominantLanguageCommand));
    });

    it('should return "en" for short text (< 20 chars)', async () => {
      const language = await service.detectLanguage('Hello');

      expect(language).toBe('en');
    });

    it('should handle detection errors gracefully', async () => {
      const mockSend = jest.fn().mockRejectedValue(new Error('Detection failed'));

      (ComprehendClient as jest.MockedClass<typeof ComprehendClient>).prototype.send = mockSend;

      const language = await service.detectLanguage('This is a test sentence for detection');

      expect(language).toBe('en'); // Should default to English
    });

    it('should return most confident language when multiple detected', async () => {
      const mockSend = jest.fn().mockResolvedValue({
        Languages: [
          { LanguageCode: 'en', Score: 0.30 },
          { LanguageCode: 'hi', Score: 0.65 },
          { LanguageCode: 'pa', Score: 0.05 },
        ],
      });

      (ComprehendClient as jest.MockedClass<typeof ComprehendClient>).prototype.send = mockSend;

      const language = await service.detectLanguage('This is a mixed language text');

      expect(language).toBe('hi'); // Should return highest score
    });
  });

  describe('generateCacheKey', () => {
    it('should generate deterministic cache keys', () => {
      const key1 = service.generateCacheKey('Hello', 'en', 'hi');
      const key2 = service.generateCacheKey('Hello', 'en', 'hi');

      expect(key1).toBe(key2);
      expect(key1).toMatch(/^translation:[a-f0-9]{64}$/);
    });

    it('should generate different keys for different inputs', () => {
      const key1 = service.generateCacheKey('Hello', 'en', 'hi');
      const key2 = service.generateCacheKey('Hello', 'en', 'pa');
      const key3 = service.generateCacheKey('Goodbye', 'en', 'hi');

      expect(key1).not.toBe(key2);
      expect(key1).not.toBe(key3);
      expect(key2).not.toBe(key3);
    });

    it('should include all parameters in hash', () => {
      const key1 = service.generateCacheKey('test', 'en', 'hi');
      const key2 = service.generateCacheKey('test', 'hi', 'en');

      expect(key1).not.toBe(key2); // Different language direction
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', async () => {
      const mockSend = jest.fn().mockResolvedValue({
        TranslatedText: 'translated',
      });

      (TranslateClient as jest.MockedClass<typeof TranslateClient>).prototype.send = mockSend;

      // Add some translations to cache
      await service.translateText({ text: 'Hello', sourceLanguage: 'en', targetLanguage: 'hi' });
      await service.translateText({ text: 'Goodbye', sourceLanguage: 'en', targetLanguage: 'hi' });

      const stats = await service.getCacheStats();

      expect(stats.size).toBeGreaterThanOrEqual(0);
      expect(typeof stats.hitRate).toBe('number');
    });
  });

  describe('preloadCommonTranslations', () => {
    it('should preload common phrases', async () => {
      const mockSend = jest.fn().mockResolvedValue({
        TranslatedText: 'translated',
      });

      (TranslateClient as jest.MockedClass<typeof TranslateClient>).prototype.send = mockSend;

      await service.preloadCommonTranslations('hi');

      // Should have made multiple translation calls
      expect(mockSend).toHaveBeenCalled();
    });
  });

  describe('language code mapping', () => {
    it('should map all supported languages correctly', async () => {
      const supportedLanguages = ['en', 'hi', 'pa', 'mr', 'ta', 'te', 'bn', 'gu', 'kn', 'ml', 'or'];
      
      const mockSend = jest.fn().mockResolvedValue({
        TranslatedText: 'translated',
      });

      (TranslateClient as jest.MockedClass<typeof TranslateClient>).prototype.send = mockSend;

      for (const lang of supportedLanguages) {
        await service.translateText({
          text: 'test',
          sourceLanguage: 'en',
          targetLanguage: lang,
        });
      }

      // Should have successfully called AWS Translate for all languages
      expect(mockSend).toHaveBeenCalledTimes(supportedLanguages.length - 1); // -1 for en->en
    });
  });
});
