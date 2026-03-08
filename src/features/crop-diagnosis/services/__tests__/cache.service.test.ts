/**
 * Unit Tests for Cache Service
 * 
 * Tests Redis-based caching functionality including:
 * - get(), set(), delete() operations
 * - 24-hour TTL implementation
 * - Cache hit count tracking
 * - Connection management
 * - Graceful degradation on errors
 * 
 * Requirements: 12.3
 */

import { CacheService, CachedDiagnosis } from '../cache.service';

// Mock redis client
jest.mock('redis', () => {
  const mockClient = {
    connect: jest.fn().mockResolvedValue(undefined),
    quit: jest.fn().mockResolvedValue(undefined),
    get: jest.fn(),
    setEx: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    flushAll: jest.fn().mockResolvedValue('OK'),
    on: jest.fn(),
    isOpen: true,
  };

  return {
    createClient: jest.fn(() => mockClient),
  };
});

describe('CacheService', () => {
  let cacheService: CacheService;
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Get the mock client
    const redis = require('redis');
    mockClient = redis.createClient();
    
    cacheService = new CacheService();
    
    // Simulate connected state
    (cacheService as any).connected = true;
  });

  afterEach(async () => {
    await cacheService.disconnect();
  });

  describe('connect()', () => {
    it('should connect to Redis server', async () => {
      (cacheService as any).connected = false;
      mockClient.isOpen = false;

      await cacheService.connect();

      expect(mockClient.connect).toHaveBeenCalled();
    });

    it('should not reconnect if already connected', async () => {
      (cacheService as any).connected = true;
      mockClient.isOpen = true;

      await cacheService.connect();

      expect(mockClient.connect).not.toHaveBeenCalled();
    });
  });

  describe('disconnect()', () => {
    it('should disconnect from Redis server', async () => {
      (cacheService as any).connected = true;
      mockClient.isOpen = true;

      await cacheService.disconnect();

      expect(mockClient.quit).toHaveBeenCalled();
    });

    it('should not disconnect if not connected', async () => {
      (cacheService as any).connected = false;
      mockClient.isOpen = false;

      await cacheService.disconnect();

      expect(mockClient.quit).not.toHaveBeenCalled();
    });
  });

  describe('get()', () => {
    it('should retrieve cached value', async () => {
      const key = 'test-key';
      const cachedData: CachedDiagnosis = {
        diagnosis: { cropType: 'tomato', diseases: [] },
        remedies: { chemical: [], organic: [] },
        cachedAt: new Date(),
        hitCount: 0,
      };

      mockClient.get.mockResolvedValue(JSON.stringify(cachedData));

      const result = await cacheService.get(key);

      expect(mockClient.get).toHaveBeenCalledWith(key);
      expect(result).toBeDefined();
      expect(result.diagnosis.cropType).toBe('tomato');
    });

    it('should increment hit count on cache hit', async () => {
      const key = 'test-key';
      const cachedData: CachedDiagnosis = {
        diagnosis: { cropType: 'tomato' },
        remedies: {},
        cachedAt: new Date(),
        hitCount: 5,
      };

      mockClient.get.mockResolvedValue(JSON.stringify(cachedData));

      const result = await cacheService.get(key);

      expect(result.hitCount).toBe(6);
      expect(mockClient.setEx).toHaveBeenCalledWith(
        key,
        86400, // 24 hours
        expect.stringContaining('"hitCount":6')
      );
    });

    it('should return null if key not found', async () => {
      const key = 'non-existent-key';
      mockClient.get.mockResolvedValue(null);

      const result = await cacheService.get(key);

      expect(result).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      const key = 'test-key';
      mockClient.get.mockRejectedValue(new Error('Redis error'));

      const result = await cacheService.get(key);

      expect(result).toBeNull();
    });

    it('should auto-connect if not connected', async () => {
      (cacheService as any).connected = false;
      mockClient.isOpen = false;
      mockClient.get.mockResolvedValue(null);

      await cacheService.get('test-key');

      expect(mockClient.connect).toHaveBeenCalled();
    });
  });

  describe('set()', () => {
    it('should cache value with default TTL', async () => {
      const key = 'test-key';
      const value = { data: 'test' };

      await cacheService.set(key, value);

      expect(mockClient.setEx).toHaveBeenCalledWith(
        key,
        86400, // 24 hours
        JSON.stringify(value)
      );
    });

    it('should cache value with custom TTL', async () => {
      const key = 'test-key';
      const value = { data: 'test' };
      const customTTL = 3600; // 1 hour

      await cacheService.set(key, value, customTTL);

      expect(mockClient.setEx).toHaveBeenCalledWith(
        key,
        customTTL,
        JSON.stringify(value)
      );
    });

    it('should handle errors gracefully', async () => {
      const key = 'test-key';
      const value = { data: 'test' };
      mockClient.setEx.mockRejectedValue(new Error('Redis error'));

      await expect(cacheService.set(key, value)).resolves.not.toThrow();
    });

    it('should auto-connect if not connected', async () => {
      (cacheService as any).connected = false;
      mockClient.isOpen = false;

      await cacheService.set('test-key', { data: 'test' });

      expect(mockClient.connect).toHaveBeenCalled();
    });
  });

  describe('delete()', () => {
    it('should delete cached value', async () => {
      const key = 'test-key';

      await cacheService.delete(key);

      expect(mockClient.del).toHaveBeenCalledWith(key);
    });

    it('should handle errors gracefully', async () => {
      const key = 'test-key';
      mockClient.del.mockRejectedValue(new Error('Redis error'));

      await expect(cacheService.delete(key)).resolves.not.toThrow();
    });

    it('should auto-connect if not connected', async () => {
      (cacheService as any).connected = false;
      mockClient.isOpen = false;

      await cacheService.delete('test-key');

      expect(mockClient.connect).toHaveBeenCalled();
    });
  });

  describe('getCacheHitCount()', () => {
    it('should return hit count for existing key', async () => {
      const key = 'test-key';
      const cachedData: CachedDiagnosis = {
        diagnosis: {},
        remedies: {},
        cachedAt: new Date(),
        hitCount: 10,
      };

      mockClient.get.mockResolvedValue(JSON.stringify(cachedData));

      const hitCount = await cacheService.getCacheHitCount(key);

      expect(hitCount).toBe(10);
    });

    it('should return 0 for non-existent key', async () => {
      const key = 'non-existent-key';
      mockClient.get.mockResolvedValue(null);

      const hitCount = await cacheService.getCacheHitCount(key);

      expect(hitCount).toBe(0);
    });

    it('should handle errors gracefully', async () => {
      const key = 'test-key';
      mockClient.get.mockRejectedValue(new Error('Redis error'));

      const hitCount = await cacheService.getCacheHitCount(key);

      expect(hitCount).toBe(0);
    });
  });

  describe('isConnected()', () => {
    it('should return true when connected', () => {
      (cacheService as any).connected = true;
      mockClient.isOpen = true;

      expect(cacheService.isConnected()).toBe(true);
    });

    it('should return false when not connected', () => {
      (cacheService as any).connected = false;
      mockClient.isOpen = false;

      expect(cacheService.isConnected()).toBe(false);
    });
  });

  describe('flushAll()', () => {
    it('should flush all cached data', async () => {
      await cacheService.flushAll();

      expect(mockClient.flushAll).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockClient.flushAll.mockRejectedValue(new Error('Redis error'));

      await expect(cacheService.flushAll()).resolves.not.toThrow();
    });
  });

  describe('24-hour TTL', () => {
    it('should use 86400 seconds (24 hours) as default TTL', async () => {
      const key = 'test-key';
      const value = { data: 'test' };

      await cacheService.set(key, value);

      expect(mockClient.setEx).toHaveBeenCalledWith(
        key,
        86400,
        expect.any(String)
      );
    });

    it('should maintain TTL when updating hit count', async () => {
      const key = 'test-key';
      const cachedData: CachedDiagnosis = {
        diagnosis: {},
        remedies: {},
        cachedAt: new Date(),
        hitCount: 0,
      };

      mockClient.get.mockResolvedValue(JSON.stringify(cachedData));

      await cacheService.get(key);

      expect(mockClient.setEx).toHaveBeenCalledWith(
        key,
        86400,
        expect.any(String)
      );
    });
  });

  describe('Environment configuration', () => {
    it('should use environment variables for Redis connection', () => {
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        REDIS_HOST: 'test-redis-host',
        REDIS_PORT: '6380',
      };

      const redis = require('redis');
      const newService = new CacheService();

      expect(redis.createClient).toHaveBeenCalledWith({
        socket: {
          host: 'test-redis-host',
          port: 6380,
        },
      });

      process.env = originalEnv;
    });

    it('should use default values if environment variables not set', () => {
      const originalEnv = process.env;
      process.env = { ...originalEnv };
      delete process.env.REDIS_HOST;
      delete process.env.REDIS_PORT;

      const redis = require('redis');
      jest.clearAllMocks();
      const newService = new CacheService();

      expect(redis.createClient).toHaveBeenCalledWith({
        socket: {
          host: 'localhost',
          port: 6379,
        },
      });

      process.env = originalEnv;
    });
  });

  describe('Cache hit count tracking', () => {
    it('should track cache hits for metrics', async () => {
      const key = 'diagnosis:abc123';
      const cachedData: CachedDiagnosis = {
        diagnosis: { cropType: 'rice', diseases: [] },
        remedies: { chemical: [], organic: [] },
        cachedAt: new Date(),
        hitCount: 0,
      };

      mockClient.get.mockResolvedValue(JSON.stringify(cachedData));

      // First hit
      await cacheService.get(key);
      expect(mockClient.setEx).toHaveBeenCalledWith(
        key,
        86400,
        expect.stringContaining('"hitCount":1')
      );

      // Second hit
      mockClient.get.mockResolvedValue(
        JSON.stringify({ ...cachedData, hitCount: 1 })
      );
      await cacheService.get(key);
      expect(mockClient.setEx).toHaveBeenCalledWith(
        key,
        86400,
        expect.stringContaining('"hitCount":2')
      );
    });

    it('should allow querying hit count without incrementing', async () => {
      const key = 'test-key';
      const cachedData: CachedDiagnosis = {
        diagnosis: {},
        remedies: {},
        cachedAt: new Date(),
        hitCount: 5,
      };

      mockClient.get.mockResolvedValue(JSON.stringify(cachedData));

      const hitCount = await cacheService.getCacheHitCount(key);

      expect(hitCount).toBe(5);
      // Should not update the cache
      expect(mockClient.setEx).not.toHaveBeenCalled();
    });
  });

  describe('Graceful degradation', () => {
    it('should not throw on get() error', async () => {
      mockClient.get.mockRejectedValue(new Error('Connection lost'));

      const result = await cacheService.get('test-key');

      expect(result).toBeNull();
    });

    it('should not throw on set() error', async () => {
      mockClient.setEx.mockRejectedValue(new Error('Connection lost'));

      await expect(
        cacheService.set('test-key', { data: 'test' })
      ).resolves.not.toThrow();
    });

    it('should not throw on delete() error', async () => {
      mockClient.del.mockRejectedValue(new Error('Connection lost'));

      await expect(cacheService.delete('test-key')).resolves.not.toThrow();
    });

    it('should return 0 on getCacheHitCount() error', async () => {
      mockClient.get.mockRejectedValue(new Error('Connection lost'));

      const hitCount = await cacheService.getCacheHitCount('test-key');

      expect(hitCount).toBe(0);
    });
  });
});
