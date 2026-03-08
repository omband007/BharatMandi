/**
 * Unit Tests for Diagnosis Cache Service
 * 
 * Tests high-level caching functionality for crop diagnosis:
 * - getCachedDiagnosis() - Retrieve cached results by image hash
 * - cacheDiagnosis() - Store diagnosis with 24-hour TTL
 * - Image hash-based cache key generation
 * - Integration with CacheService
 * - Graceful error handling
 * 
 * Requirements: 12.3
 */

import { DiagnosisCacheService, DiagnosisResult, RemedyResult } from '../diagnosis-cache.service';
import { CacheService, CachedDiagnosis } from '../cache.service';

// Mock CacheService
jest.mock('../cache.service');

describe('DiagnosisCacheService', () => {
  let diagnosisCacheService: DiagnosisCacheService;
  let mockCacheService: jest.Mocked<CacheService>;

  const sampleDiagnosis: DiagnosisResult = {
    cropType: 'tomato',
    diseases: [
      {
        name: 'Late Blight',
        scientificName: 'Phytophthora infestans',
        type: 'fungal',
        severity: 'high',
        confidence: 85,
      },
    ],
    symptoms: ['brown spots on leaves', 'wilting'],
    confidence: 85,
    imageQualityScore: 90,
    processingTimeMs: 1500,
  };

  const sampleRemedies: RemedyResult = {
    chemical: [
      {
        name: 'Mancozeb',
        dosage: '2.5g per liter',
        applicationMethod: 'foliar spray',
      },
    ],
    organic: [
      {
        name: 'Neem oil spray',
        ingredients: ['neem oil', 'water'],
        preparation: ['Mix well'],
      },
    ],
    preventive: [
      {
        category: 'spacing',
        description: 'Maintain proper plant spacing',
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock cache service
    mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      getCacheHitCount: jest.fn(),
      isConnected: jest.fn().mockReturnValue(true),
      connect: jest.fn(),
      disconnect: jest.fn(),
      flushAll: jest.fn(),
    } as any;

    diagnosisCacheService = new DiagnosisCacheService(mockCacheService);
  });

  describe('getCachedDiagnosis()', () => {
    it('should return cached diagnosis when found', async () => {
      const imageBuffer = Buffer.from('test image data');
      const cachedData: CachedDiagnosis = {
        diagnosis: sampleDiagnosis,
        remedies: sampleRemedies,
        cachedAt: new Date(),
        hitCount: 5,
      };

      mockCacheService.get.mockResolvedValue(cachedData);

      const result = await diagnosisCacheService.getCachedDiagnosis(imageBuffer);

      expect(result).not.toBeNull();
      expect(result?.diagnosis).toEqual(sampleDiagnosis);
      expect(result?.remedies).toEqual(sampleRemedies);
      expect(mockCacheService.get).toHaveBeenCalledWith(
        expect.stringMatching(/^diagnosis:[a-f0-9]{16}$/)
      );
    });

    it('should return null when not found in cache', async () => {
      const imageBuffer = Buffer.from('test image data');
      mockCacheService.get.mockResolvedValue(null);

      const result = await diagnosisCacheService.getCachedDiagnosis(imageBuffer);

      expect(result).toBeNull();
    });

    it('should use image hash as cache key', async () => {
      const imageBuffer = Buffer.from('test image');
      mockCacheService.get.mockResolvedValue(null);

      await diagnosisCacheService.getCachedDiagnosis(imageBuffer);

      // Verify cache key format: diagnosis:{16-char-hash}
      expect(mockCacheService.get).toHaveBeenCalledWith(
        expect.stringMatching(/^diagnosis:[a-f0-9]{16}$/)
      );
    });

    it('should generate same cache key for identical images', async () => {
      const imageBuffer = Buffer.from('identical image');
      mockCacheService.get.mockResolvedValue(null);

      await diagnosisCacheService.getCachedDiagnosis(imageBuffer);
      const firstCall = mockCacheService.get.mock.calls[0][0];

      await diagnosisCacheService.getCachedDiagnosis(imageBuffer);
      const secondCall = mockCacheService.get.mock.calls[1][0];

      expect(firstCall).toBe(secondCall);
    });

    it('should generate different cache keys for different images', async () => {
      const imageBuffer1 = Buffer.from('image 1');
      const imageBuffer2 = Buffer.from('image 2');
      mockCacheService.get.mockResolvedValue(null);

      await diagnosisCacheService.getCachedDiagnosis(imageBuffer1);
      const firstCall = mockCacheService.get.mock.calls[0][0];

      await diagnosisCacheService.getCachedDiagnosis(imageBuffer2);
      const secondCall = mockCacheService.get.mock.calls[1][0];

      expect(firstCall).not.toBe(secondCall);
    });

    it('should handle errors gracefully', async () => {
      const imageBuffer = Buffer.from('test image');
      mockCacheService.get.mockRejectedValue(new Error('Redis connection failed'));

      const result = await diagnosisCacheService.getCachedDiagnosis(imageBuffer);

      expect(result).toBeNull();
    });

    it('should extract only diagnosis and remedies from cached data', async () => {
      const imageBuffer = Buffer.from('test image');
      const cachedData: CachedDiagnosis = {
        diagnosis: sampleDiagnosis,
        remedies: sampleRemedies,
        cachedAt: new Date('2024-01-01'),
        hitCount: 10,
      };

      mockCacheService.get.mockResolvedValue(cachedData);

      const result = await diagnosisCacheService.getCachedDiagnosis(imageBuffer);

      expect(result).toEqual({
        diagnosis: sampleDiagnosis,
        remedies: sampleRemedies,
      });
      // Should not include cachedAt or hitCount
      expect(result).not.toHaveProperty('cachedAt');
      expect(result).not.toHaveProperty('hitCount');
    });
  });

  describe('cacheDiagnosis()', () => {
    it('should cache diagnosis with correct structure', async () => {
      const imageBuffer = Buffer.from('test image');

      await diagnosisCacheService.cacheDiagnosis(
        imageBuffer,
        sampleDiagnosis,
        sampleRemedies
      );

      expect(mockCacheService.set).toHaveBeenCalledWith(
        expect.stringMatching(/^diagnosis:[a-f0-9]{16}$/),
        expect.objectContaining({
          diagnosis: sampleDiagnosis,
          remedies: sampleRemedies,
          cachedAt: expect.any(Date),
          hitCount: 0,
        })
      );
    });

    it('should initialize hitCount to 0', async () => {
      const imageBuffer = Buffer.from('test image');

      await diagnosisCacheService.cacheDiagnosis(
        imageBuffer,
        sampleDiagnosis,
        sampleRemedies
      );

      const cachedData = mockCacheService.set.mock.calls[0][1];
      expect(cachedData.hitCount).toBe(0);
    });

    it('should set cachedAt timestamp', async () => {
      const imageBuffer = Buffer.from('test image');
      const beforeCache = new Date();

      await diagnosisCacheService.cacheDiagnosis(
        imageBuffer,
        sampleDiagnosis,
        sampleRemedies
      );

      const afterCache = new Date();
      const cachedData = mockCacheService.set.mock.calls[0][1];
      
      expect(cachedData.cachedAt).toBeInstanceOf(Date);
      expect(cachedData.cachedAt.getTime()).toBeGreaterThanOrEqual(beforeCache.getTime());
      expect(cachedData.cachedAt.getTime()).toBeLessThanOrEqual(afterCache.getTime());
    });

    it('should use image hash as cache key', async () => {
      const imageBuffer = Buffer.from('test image');

      await diagnosisCacheService.cacheDiagnosis(
        imageBuffer,
        sampleDiagnosis,
        sampleRemedies
      );

      expect(mockCacheService.set).toHaveBeenCalledWith(
        expect.stringMatching(/^diagnosis:[a-f0-9]{16}$/),
        expect.any(Object)
      );
    });

    it('should use default 24-hour TTL', async () => {
      const imageBuffer = Buffer.from('test image');

      await diagnosisCacheService.cacheDiagnosis(
        imageBuffer,
        sampleDiagnosis,
        sampleRemedies
      );

      // CacheService.set() uses default TTL (86400 seconds) when not specified
      expect(mockCacheService.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object)
      );
      // TTL is handled by CacheService, not passed explicitly
    });

    it('should handle errors gracefully', async () => {
      const imageBuffer = Buffer.from('test image');
      mockCacheService.set.mockRejectedValue(new Error('Redis write failed'));

      await expect(
        diagnosisCacheService.cacheDiagnosis(
          imageBuffer,
          sampleDiagnosis,
          sampleRemedies
        )
      ).resolves.not.toThrow();
    });

    it('should cache complete diagnosis data', async () => {
      const imageBuffer = Buffer.from('test image');
      const complexDiagnosis: DiagnosisResult = {
        cropType: 'rice',
        diseases: [
          {
            name: 'Blast',
            scientificName: 'Magnaporthe oryzae',
            type: 'fungal',
            severity: 'high',
            confidence: 90,
          },
          {
            name: 'Brown Spot',
            scientificName: 'Bipolaris oryzae',
            type: 'fungal',
            severity: 'medium',
            confidence: 75,
          },
        ],
        symptoms: ['lesions', 'discoloration', 'wilting'],
        confidence: 82,
        imageQualityScore: 85,
        processingTimeMs: 1800,
      };

      await diagnosisCacheService.cacheDiagnosis(
        imageBuffer,
        complexDiagnosis,
        sampleRemedies
      );

      const cachedData = mockCacheService.set.mock.calls[0][1];
      expect(cachedData.diagnosis).toEqual(complexDiagnosis);
      expect(cachedData.diagnosis.diseases).toHaveLength(2);
    });
  });

  describe('deleteCachedDiagnosis()', () => {
    it('should delete cached diagnosis by image hash', async () => {
      const imageBuffer = Buffer.from('test image');

      await diagnosisCacheService.deleteCachedDiagnosis(imageBuffer);

      expect(mockCacheService.delete).toHaveBeenCalledWith(
        expect.stringMatching(/^diagnosis:[a-f0-9]{16}$/)
      );
    });

    it('should use same cache key as get and set', async () => {
      const imageBuffer = Buffer.from('test image');

      await diagnosisCacheService.getCachedDiagnosis(imageBuffer);
      const getKey = mockCacheService.get.mock.calls[0][0];

      await diagnosisCacheService.cacheDiagnosis(
        imageBuffer,
        sampleDiagnosis,
        sampleRemedies
      );
      const setKey = mockCacheService.set.mock.calls[0][0];

      await diagnosisCacheService.deleteCachedDiagnosis(imageBuffer);
      const deleteKey = mockCacheService.delete.mock.calls[0][0];

      expect(getKey).toBe(setKey);
      expect(setKey).toBe(deleteKey);
    });

    it('should handle errors gracefully', async () => {
      const imageBuffer = Buffer.from('test image');
      mockCacheService.delete.mockRejectedValue(new Error('Redis delete failed'));

      await expect(
        diagnosisCacheService.deleteCachedDiagnosis(imageBuffer)
      ).resolves.not.toThrow();
    });
  });

  describe('getCacheHitCount()', () => {
    it('should return cache hit count for image', async () => {
      const imageBuffer = Buffer.from('test image');
      mockCacheService.getCacheHitCount.mockResolvedValue(15);

      const hitCount = await diagnosisCacheService.getCacheHitCount(imageBuffer);

      expect(hitCount).toBe(15);
      expect(mockCacheService.getCacheHitCount).toHaveBeenCalledWith(
        expect.stringMatching(/^diagnosis:[a-f0-9]{16}$/)
      );
    });

    it('should return 0 when not found', async () => {
      const imageBuffer = Buffer.from('test image');
      mockCacheService.getCacheHitCount.mockResolvedValue(0);

      const hitCount = await diagnosisCacheService.getCacheHitCount(imageBuffer);

      expect(hitCount).toBe(0);
    });

    it('should handle errors gracefully', async () => {
      const imageBuffer = Buffer.from('test image');
      mockCacheService.getCacheHitCount.mockRejectedValue(
        new Error('Redis read failed')
      );

      const hitCount = await diagnosisCacheService.getCacheHitCount(imageBuffer);

      expect(hitCount).toBe(0);
    });
  });

  describe('Connection management', () => {
    it('should check if cache service is connected', () => {
      mockCacheService.isConnected.mockReturnValue(true);

      const connected = diagnosisCacheService.isConnected();

      expect(connected).toBe(true);
      expect(mockCacheService.isConnected).toHaveBeenCalled();
    });

    it('should connect to cache service', async () => {
      await diagnosisCacheService.connect();

      expect(mockCacheService.connect).toHaveBeenCalled();
    });

    it('should disconnect from cache service', async () => {
      await diagnosisCacheService.disconnect();

      expect(mockCacheService.disconnect).toHaveBeenCalled();
    });
  });

  describe('Cache key consistency', () => {
    it('should use consistent cache keys across all operations', async () => {
      const imageBuffer = Buffer.from('consistent test image');

      // Perform all operations
      await diagnosisCacheService.getCachedDiagnosis(imageBuffer);
      await diagnosisCacheService.cacheDiagnosis(
        imageBuffer,
        sampleDiagnosis,
        sampleRemedies
      );
      await diagnosisCacheService.getCacheHitCount(imageBuffer);
      await diagnosisCacheService.deleteCachedDiagnosis(imageBuffer);

      // Extract all cache keys used
      const getKey = mockCacheService.get.mock.calls[0][0];
      const setKey = mockCacheService.set.mock.calls[0][0];
      const hitCountKey = mockCacheService.getCacheHitCount.mock.calls[0][0];
      const deleteKey = mockCacheService.delete.mock.calls[0][0];

      // All keys should be identical
      expect(getKey).toBe(setKey);
      expect(setKey).toBe(hitCountKey);
      expect(hitCountKey).toBe(deleteKey);
    });
  });

  describe('Integration scenarios', () => {
    it('should support cache-then-store workflow', async () => {
      const imageBuffer = Buffer.from('crop image');

      // Check cache (miss)
      mockCacheService.get.mockResolvedValue(null);
      const cached = await diagnosisCacheService.getCachedDiagnosis(imageBuffer);
      expect(cached).toBeNull();

      // Store diagnosis
      await diagnosisCacheService.cacheDiagnosis(
        imageBuffer,
        sampleDiagnosis,
        sampleRemedies
      );

      // Check cache again (hit)
      const cachedData: CachedDiagnosis = {
        diagnosis: sampleDiagnosis,
        remedies: sampleRemedies,
        cachedAt: new Date(),
        hitCount: 1,
      };
      mockCacheService.get.mockResolvedValue(cachedData);
      
      const cachedResult = await diagnosisCacheService.getCachedDiagnosis(imageBuffer);
      expect(cachedResult).not.toBeNull();
      expect(cachedResult?.diagnosis).toEqual(sampleDiagnosis);
    });

    it('should handle identical images from different uploads', async () => {
      // Two identical images uploaded separately
      const upload1 = Buffer.from('identical crop disease image');
      const upload2 = Buffer.from('identical crop disease image');

      // First upload - cache miss, then store
      mockCacheService.get.mockResolvedValue(null);
      await diagnosisCacheService.getCachedDiagnosis(upload1);
      await diagnosisCacheService.cacheDiagnosis(
        upload1,
        sampleDiagnosis,
        sampleRemedies
      );

      // Second upload - should use same cache key
      const cachedData: CachedDiagnosis = {
        diagnosis: sampleDiagnosis,
        remedies: sampleRemedies,
        cachedAt: new Date(),
        hitCount: 1,
      };
      mockCacheService.get.mockResolvedValue(cachedData);
      
      const result = await diagnosisCacheService.getCachedDiagnosis(upload2);
      
      expect(result).not.toBeNull();
      expect(result?.diagnosis).toEqual(sampleDiagnosis);
      
      // Verify same cache key was used
      const key1 = mockCacheService.set.mock.calls[0][0];
      const key2 = mockCacheService.get.mock.calls[1][0];
      expect(key1).toBe(key2);
    });
  });

  describe('Graceful degradation', () => {
    it('should not throw on cache service errors', async () => {
      const imageBuffer = Buffer.from('test image');
      
      mockCacheService.get.mockRejectedValue(new Error('Connection lost'));
      mockCacheService.set.mockRejectedValue(new Error('Connection lost'));
      mockCacheService.delete.mockRejectedValue(new Error('Connection lost'));
      mockCacheService.getCacheHitCount.mockRejectedValue(new Error('Connection lost'));

      await expect(
        diagnosisCacheService.getCachedDiagnosis(imageBuffer)
      ).resolves.not.toThrow();

      await expect(
        diagnosisCacheService.cacheDiagnosis(
          imageBuffer,
          sampleDiagnosis,
          sampleRemedies
        )
      ).resolves.not.toThrow();

      await expect(
        diagnosisCacheService.deleteCachedDiagnosis(imageBuffer)
      ).resolves.not.toThrow();

      await expect(
        diagnosisCacheService.getCacheHitCount(imageBuffer)
      ).resolves.not.toThrow();
    });
  });
});
