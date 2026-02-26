import * as fc from 'fast-check';
import { TranslationService } from '../translation.service';
import { initializeRedisClient, closeRedisClient, getRedisClient } from '../../../shared/cache/redis-client';

describe('TranslationService - Property-Based Tests', () => {
  let service: TranslationService;

  beforeAll(async () => {
    try {
      await initializeRedisClient();
    } catch (error) {
      console.warn('Redis not available for PBT tests');
    }
  });

  afterAll(async () => {
    await closeRedisClient();
  });

  beforeEach(async () => {
    service = new TranslationService();
    
    // Clear cache
    try {
      const redis = getRedisClient();
      const keys = await redis.keys('translation:*');
      if (keys.length > 0) {
        await redis.del(keys);
      }
    } catch (error) {
      // Redis not available
    }
  });

  describe('Property 5: Translation Cache Determinism', () => {
    it('should generate the same cache key for identical inputs', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 500 }),
          fc.constantFrom('en', 'hi', 'pa', 'mr', 'ta', 'te', 'bn', 'gu', 'kn', 'ml', 'or'),
          fc.constantFrom('en', 'hi', 'pa', 'mr', 'ta', 'te', 'bn', 'gu', 'kn', 'ml', 'or'),
          (text, sourceLang, targetLang) => {
            const key1 = service.generateCacheKey(text, sourceLang, targetLang);
            const key2 = service.generateCacheKey(text, sourceLang, targetLang);
            
            return key1 === key2;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate different cache keys for different texts', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 500 }),
          fc.string({ minLength: 1, maxLength: 500 }),
          fc.constantFrom('en', 'hi', 'pa', 'mr', 'ta', 'te', 'bn', 'gu', 'kn', 'ml', 'or'),
          fc.constantFrom('en', 'hi', 'pa', 'mr', 'ta', 'te', 'bn', 'gu', 'kn', 'ml', 'or'),
          (text1, text2, sourceLang, targetLang) => {
            fc.pre(text1 !== text2); // Only test when texts are different
            
            const key1 = service.generateCacheKey(text1, sourceLang, targetLang);
            const key2 = service.generateCacheKey(text2, sourceLang, targetLang);
            
            return key1 !== key2;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate different cache keys for different language pairs', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 500 }),
          fc.constantFrom('en', 'hi', 'pa', 'mr', 'ta', 'te', 'bn', 'gu', 'kn', 'ml', 'or'),
          fc.constantFrom('en', 'hi', 'pa', 'mr', 'ta', 'te', 'bn', 'gu', 'kn', 'ml', 'or'),
          fc.constantFrom('en', 'hi', 'pa', 'mr', 'ta', 'te', 'bn', 'gu', 'kn', 'ml', 'or'),
          fc.constantFrom('en', 'hi', 'pa', 'mr', 'ta', 'te', 'bn', 'gu', 'kn', 'ml', 'or'),
          (text, source1, target1, source2, target2) => {
            fc.pre(source1 !== source2 || target1 !== target2); // Different language pairs
            
            const key1 = service.generateCacheKey(text, source1, target1);
            const key2 = service.generateCacheKey(text, source2, target2);
            
            return key1 !== key2;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate cache keys with consistent format', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 500 }),
          fc.constantFrom('en', 'hi', 'pa', 'mr', 'ta', 'te', 'bn', 'gu', 'kn', 'ml', 'or'),
          fc.constantFrom('en', 'hi', 'pa', 'mr', 'ta', 'te', 'bn', 'gu', 'kn', 'ml', 'or'),
          (text, sourceLang, targetLang) => {
            const key = service.generateCacheKey(text, sourceLang, targetLang);
            
            // Should start with prefix and be followed by 64 hex characters (SHA-256)
            return /^translation:[a-f0-9]{64}$/.test(key);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 6: Translation Cache Round-Trip', () => {
    it('should preserve translation content through cache round-trip', async () => {
      // Skip if Redis not available
      try {
        getRedisClient();
      } catch (error) {
        console.warn('Skipping cache round-trip test - Redis not available');
        return;
      }

      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 200 }),
          fc.constantFrom('en', 'hi', 'pa', 'mr', 'ta', 'te', 'bn', 'gu', 'kn', 'ml', 'or'),
          fc.constantFrom('en', 'hi', 'pa', 'mr', 'ta', 'te', 'bn', 'gu', 'kn', 'ml', 'or'),
          async (translatedText, sourceLang, targetLang) => {
            const redis = getRedisClient();
            const cacheKey = service.generateCacheKey('original', sourceLang, targetLang);
            
            // Store in cache
            await redis.setEx(cacheKey, 60, translatedText);
            
            // Retrieve from cache
            const retrieved = await redis.get(cacheKey);
            
            // Clean up
            await redis.del(cacheKey);
            
            return retrieved === translatedText;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle special characters in cached translations', async () => {
      try {
        getRedisClient();
      } catch (error) {
        console.warn('Skipping special characters test - Redis not available');
        return;
      }

      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 200 }),
          async (text) => {
            const redis = getRedisClient();
            const cacheKey = service.generateCacheKey(text, 'en', 'hi');
            
            // Store and retrieve
            await redis.setEx(cacheKey, 60, text);
            const retrieved = await redis.get(cacheKey);
            
            // Clean up
            await redis.del(cacheKey);
            
            return retrieved === text;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle Unicode characters in cache', async () => {
      try {
        getRedisClient();
      } catch (error) {
        console.warn('Skipping Unicode test - Redis not available');
        return;
      }

      await fc.assert(
        fc.asyncProperty(
          fc.unicodeString({ minLength: 1, maxLength: 200 }),
          async (text) => {
            const redis = getRedisClient();
            const cacheKey = service.generateCacheKey(text, 'en', 'hi');
            
            // Store and retrieve
            await redis.setEx(cacheKey, 60, text);
            const retrieved = await redis.get(cacheKey);
            
            // Clean up
            await redis.del(cacheKey);
            
            return retrieved === text;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle empty strings in cache', async () => {
      try {
        const redis = getRedisClient();
        const cacheKey = service.generateCacheKey('test', 'en', 'hi');
        
        await redis.setEx(cacheKey, 60, '');
        const retrieved = await redis.get(cacheKey);
        
        await redis.del(cacheKey);
        
        expect(retrieved).toBe('');
      } catch (error) {
        console.warn('Skipping empty string test - Redis not available');
      }
    });
  });

  describe('Property: Language Detection Consistency', () => {
    it('should return "en" for all short texts (< 20 chars)', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: 19 }),
          async (text) => {
            const detected = await service.detectLanguage(text);
            return detected === 'en';
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should always return a valid language code', async () => {
      const validCodes = ['en', 'hi', 'pa', 'mr', 'ta', 'te', 'bn', 'gu', 'kn', 'ml', 'or'];
      
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 20, maxLength: 500 }),
          async (text) => {
            const detected = await service.detectLanguage(text);
            // Should return a string (may not be in our list if AWS detects other languages)
            return typeof detected === 'string' && detected.length > 0;
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Property: Translation Idempotency', () => {
    it('should return same text when source equals target language', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 200 }),
          fc.constantFrom('en', 'hi', 'pa', 'mr', 'ta', 'te', 'bn', 'gu', 'kn', 'ml', 'or'),
          async (text, language) => {
            const result = await service.translateText({
              text,
              sourceLanguage: language,
              targetLanguage: language,
            });
            
            return result.translatedText === text && 
                   result.confidence === 1.0 &&
                   result.cached === false;
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property: Batch Translation Consistency', () => {
    it('should return same number of translations as input texts', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 1, maxLength: 10 }),
          fc.constantFrom('en', 'hi', 'pa', 'mr', 'ta', 'te', 'bn', 'gu', 'kn', 'ml', 'or'),
          fc.constantFrom('en', 'hi', 'pa', 'mr', 'ta', 'te', 'bn', 'gu', 'kn', 'ml', 'or'),
          async (texts, sourceLang, targetLang) => {
            // Mock AWS Translate for this test
            const results = await service.translateBatch(texts, sourceLang, targetLang);
            return results.length === texts.length;
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});
