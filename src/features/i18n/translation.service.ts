import { TranslateClient, TranslateTextCommand } from '@aws-sdk/client-translate';
import { ComprehendClient, DetectDominantLanguageCommand } from '@aws-sdk/client-comprehend';
import { createHash } from 'crypto';
import { getRedisClient, isRedisAvailable } from '../../shared/cache/redis-client';

const translateClient = new TranslateClient({ region: process.env.AWS_REGION || 'ap-southeast-2' });
const comprehendClient = new ComprehendClient({ region: process.env.AWS_REGION || 'ap-southeast-2' });

export interface TranslationRequest {
  text: string;
  sourceLanguage?: string; // Auto-detect if not provided
  targetLanguage: string;
  context?: string; // For context-specific translations
}

export interface TranslationResult {
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  confidence: number;
  cached: boolean;
}

export class TranslationService {
  private readonly CACHE_TTL = 24 * 60 * 60; // 24 hours in seconds
  private readonly CACHE_PREFIX = 'translation:';

  async translateText(request: TranslationRequest): Promise<TranslationResult> {
    // Detect source language if not provided
    const sourceLanguage = request.sourceLanguage || await this.detectLanguage(request.text);
    
    // Log warning if detected language differs significantly from specified language
    if (request.sourceLanguage && sourceLanguage !== request.sourceLanguage) {
      console.warn(
        `[TranslationService] Language mismatch detected! ` +
        `Specified: ${request.sourceLanguage}, Detected: ${sourceLanguage}. ` +
        `This may result in poor translation quality.`
      );
    }
    
    // Check if translation is needed
    if (sourceLanguage === request.targetLanguage) {
      return {
        translatedText: request.text,
        sourceLanguage,
        targetLanguage: request.targetLanguage,
        confidence: 1.0,
        cached: false,
      };
    }

    // Check cache
    const cacheKey = this.generateCacheKey(request.text, sourceLanguage, request.targetLanguage);
    const cached = await this.getFromCache(cacheKey);
    
    if (cached) {
      return {
        translatedText: cached,
        sourceLanguage,
        targetLanguage: request.targetLanguage,
        confidence: 1.0,
        cached: true,
      };
    }

    // Translate using AWS Translate
    const command = new TranslateTextCommand({
      Text: request.text,
      SourceLanguageCode: this.mapToAWSLanguageCode(sourceLanguage),
      TargetLanguageCode: this.mapToAWSLanguageCode(request.targetLanguage),
      Settings: {
        Profanity: 'MASK', // Mask profanity in translations
      },
    });

    try {
      const response = await translateClient.send(command);
      const translatedText = response.TranslatedText || request.text;

      // DEBUG: Log full AWS response for Marathi translations
      if (request.targetLanguage === 'mr') {
        console.log('[TranslationService] Marathi Translation Debug:');
        console.log('  Input text:', request.text);
        console.log('  Input length:', request.text.length);
        console.log('  Output text:', translatedText);
        console.log('  Output length:', translatedText.length);
        console.log('  Full AWS response:', JSON.stringify(response, null, 2));
      }

      // Cache the translation
      await this.saveToCache(cacheKey, translatedText);

      return {
        translatedText,
        sourceLanguage,
        targetLanguage: request.targetLanguage,
        confidence: 0.95, // AWS Translate doesn't provide confidence scores
        cached: false,
      };
    } catch (error) {
      console.error('[TranslationService] Translation failed:', error);
      
      // Graceful degradation: return original text with error indicator
      return {
        translatedText: request.text,
        sourceLanguage,
        targetLanguage: request.targetLanguage,
        confidence: 0,
        cached: false,
      };
    }
  }

  async translateBatch(texts: string[], sourceLanguage: string, targetLanguage: string): Promise<string[]> {
    // AWS Translate doesn't have native batch API, so we'll parallelize
    // Limit concurrent requests to 25 to avoid rate limits
    const batchSize = 25;
    const results: string[] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const promises = batch.map(text => 
        this.translateText({ text, sourceLanguage, targetLanguage })
      );
      
      const batchResults = await Promise.all(promises);
      results.push(...batchResults.map(r => r.translatedText));
    }
    
    return results;
  }

  async detectLanguage(text: string): Promise<string> {
    // AWS Comprehend requires at least 3 characters
    if (text.trim().length < 3) {
      return 'en';
    }

    const command = new DetectDominantLanguageCommand({ Text: text });
    
    try {
      const response = await comprehendClient.send(command);
      const languages = response.Languages || [];
      
      if (languages.length === 0) {
        return 'en';
      }

      // Return the most confident language
      const dominant = languages.reduce((prev, current) => 
        (current.Score || 0) > (prev.Score || 0) ? current : prev
      );

      return this.mapFromAWSLanguageCode(dominant.LanguageCode || 'en');
    } catch (error) {
      console.error('[TranslationService] Language detection failed:', error);
      return 'en';
    }
  }

  generateCacheKey(text: string, sourceLanguage: string, targetLanguage: string): string {
    const hash = createHash('sha256')
      .update(`${text}:${sourceLanguage}:${targetLanguage}`)
      .digest('hex');
    return `${this.CACHE_PREFIX}${hash}`;
  }

  private async getFromCache(key: string): Promise<string | null> {
    try {
      const available = await isRedisAvailable();
      if (!available) {
        return null;
      }

      const redis = getRedisClient();
      return await redis.get(key);
    } catch (error) {
      console.error('[TranslationService] Cache read failed:', error);
      return null;
    }
  }

  private async saveToCache(key: string, value: string): Promise<void> {
    try {
      const available = await isRedisAvailable();
      if (!available) {
        return;
      }

      const redis = getRedisClient();
      await redis.setEx(key, this.CACHE_TTL, value);
    } catch (error) {
      console.error('[TranslationService] Cache write failed:', error);
    }
  }

  private mapToAWSLanguageCode(code: string): string {
    // Map our language codes to AWS Translate codes
    const mapping: Record<string, string> = {
      'en': 'en',
      'hi': 'hi',
      'pa': 'pa', // Punjabi
      'mr': 'mr', // Marathi
      'ta': 'ta', // Tamil
      'te': 'te', // Telugu
      'bn': 'bn', // Bengali
      'gu': 'gu', // Gujarati
      'kn': 'kn', // Kannada
      'ml': 'ml', // Malayalam
      'or': 'or', // Odia
    };
    return mapping[code] || 'en';
  }

  private mapFromAWSLanguageCode(code: string): string {
    // AWS Comprehend uses same codes, so direct mapping
    return code;
  }

  async getCacheStats(): Promise<{ hitRate: number, size: number }> {
    try {
      const available = await isRedisAvailable();
      if (!available) {
        return { hitRate: 0, size: 0 };
      }

      const redis = getRedisClient();
      const keys = await redis.keys(`${this.CACHE_PREFIX}*`);
      return {
        hitRate: 0, // Would need to track hits/misses separately
        size: keys.length,
      };
    } catch (error) {
      return { hitRate: 0, size: 0 };
    }
  }

  async clearCache(): Promise<number> {
    try {
      const available = await isRedisAvailable();
      if (!available) {
        return 0;
      }

      const redis = getRedisClient();
      const keys = await redis.keys(`${this.CACHE_PREFIX}*`);
      
      if (keys.length === 0) {
        return 0;
      }

      await redis.del(keys);
      return keys.length;
    } catch (error) {
      console.error('[TranslationService] Cache clear failed:', error);
      return 0;
    }
  }

  async preloadCommonTranslations(language: string): Promise<void> {
    // Preload common phrases and UI elements
    const commonPhrases = [
      'Welcome to Bharat Mandi',
      'Your order has been confirmed',
      'Payment successful',
      'Listing created successfully',
      'New message received',
      'Price updated',
      'Order shipped',
      'Delivery completed',
    ];

    await this.translateBatch(commonPhrases, 'en', language);
  }
}

export const translationService = new TranslationService();
