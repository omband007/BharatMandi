/**
 * Diagnosis Cache Service
 * 
 * High-level caching service for crop diagnosis results.
 * Integrates image hashing with Redis caching to reduce Bedrock API calls.
 * 
 * Features:
 * - Image-based cache keys using SHA-256 hashing
 * - 24-hour TTL for cached diagnoses
 * - Automatic cache key generation from image buffers
 * - Type-safe diagnosis and remedy storage
 * 
 * Requirements: 12.3
 */

import { CacheService, CachedDiagnosis } from './cache.service';
import { generateDiagnosisCacheKey } from '../utils/image-hash.util';

export interface DiagnosisResult {
  cropType: string;
  diseases: any[];
  symptoms: string[];
  confidence: number;
  imageQualityScore?: number;
  processingTimeMs?: number;
}

export interface RemedyResult {
  chemical: any[];
  organic: any[];
  preventive: any[];
}

export class DiagnosisCacheService {
  private cacheService: CacheService;

  constructor(cacheService?: CacheService) {
    this.cacheService = cacheService || new CacheService();
  }

  /**
   * Get cached diagnosis by image hash
   * Returns null if not found in cache
   * 
   * @param imageBuffer - Binary image data
   * @returns Cached diagnosis and remedies, or null if not found
   * 
   * @example
   * const buffer = fs.readFileSync('crop-image.jpg');
   * const cached = await diagnosisCacheService.getCachedDiagnosis(buffer);
   * if (cached) {
   *   console.log('Cache hit!', cached.diagnosis);
   * }
   */
  async getCachedDiagnosis(
    imageBuffer: Buffer
  ): Promise<{ diagnosis: DiagnosisResult; remedies: RemedyResult } | null> {
    try {
      const cacheKey = generateDiagnosisCacheKey(imageBuffer);
      const cached = await this.cacheService.get(cacheKey);

      if (cached) {
        return {
          diagnosis: cached.diagnosis,
          remedies: cached.remedies,
        };
      }

      return null;
    } catch (error) {
      console.error('[DiagnosisCacheService] Error getting cached diagnosis:', error);
      return null; // Graceful degradation
    }
  }

  /**
   * Cache diagnosis and remedies with 24-hour TTL
   * 
   * @param imageBuffer - Binary image data
   * @param diagnosis - Diagnosis result from Nova Pro
   * @param remedies - Remedy recommendations
   * 
   * @example
   * const buffer = fs.readFileSync('crop-image.jpg');
   * await diagnosisCacheService.cacheDiagnosis(buffer, diagnosis, remedies);
   */
  async cacheDiagnosis(
    imageBuffer: Buffer,
    diagnosis: DiagnosisResult,
    remedies: RemedyResult
  ): Promise<void> {
    try {
      const cacheKey = generateDiagnosisCacheKey(imageBuffer);
      
      const cachedData: CachedDiagnosis = {
        diagnosis,
        remedies,
        cachedAt: new Date(),
        hitCount: 0,
      };

      await this.cacheService.set(cacheKey, cachedData);
    } catch (error) {
      console.error('[DiagnosisCacheService] Error caching diagnosis:', error);
      // Graceful degradation - don't throw
    }
  }

  /**
   * Delete cached diagnosis by image hash
   * 
   * @param imageBuffer - Binary image data
   */
  async deleteCachedDiagnosis(imageBuffer: Buffer): Promise<void> {
    try {
      const cacheKey = generateDiagnosisCacheKey(imageBuffer);
      await this.cacheService.delete(cacheKey);
    } catch (error) {
      console.error('[DiagnosisCacheService] Error deleting cached diagnosis:', error);
      // Graceful degradation - don't throw
    }
  }

  /**
   * Get cache hit count for a specific image
   * 
   * @param imageBuffer - Binary image data
   * @returns Number of cache hits, or 0 if not found
   */
  async getCacheHitCount(imageBuffer: Buffer): Promise<number> {
    try {
      const cacheKey = generateDiagnosisCacheKey(imageBuffer);
      return await this.cacheService.getCacheHitCount(cacheKey);
    } catch (error) {
      console.error('[DiagnosisCacheService] Error getting cache hit count:', error);
      return 0;
    }
  }

  /**
   * Check if cache service is connected
   */
  isConnected(): boolean {
    return this.cacheService.isConnected();
  }

  /**
   * Connect to cache service
   */
  async connect(): Promise<void> {
    await this.cacheService.connect();
  }

  /**
   * Disconnect from cache service
   */
  async disconnect(): Promise<void> {
    await this.cacheService.disconnect();
  }
}

// Export singleton instance
export const diagnosisCacheService = new DiagnosisCacheService();
