/**
 * Cache Service for Crop Diagnosis
 * 
 * Implements Redis-based caching for diagnosis results to reduce Bedrock API calls.
 * Cache keys are based on image hash (SHA-256) to identify identical images.
 * 
 * Features:
 * - 24-hour TTL for cached diagnoses (86400 seconds)
 * - Cache hit count tracking for metrics
 * - Cost optimization through reduced API calls
 * 
 * Requirements: 12.3
 */

import { createClient, RedisClientType } from 'redis';

export interface CachedDiagnosis {
  diagnosis: any;
  remedies: any;
  cachedAt: Date;
  hitCount: number;
}

export class CacheService {
  private client: RedisClientType;
  private connected: boolean = false;
  private readonly DEFAULT_TTL = 86400; // 24 hours in seconds

  constructor() {
    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);

    this.client = createClient({
      socket: {
        host: redisHost,
        port: redisPort,
      },
    });

    // Handle connection events
    this.client.on('error', (err) => {
      console.error('[CacheService] Redis client error:', err);
      this.connected = false;
    });

    this.client.on('connect', () => {
      console.log('[CacheService] Redis client connected');
      this.connected = true;
    });

    this.client.on('ready', () => {
      console.log('[CacheService] Redis client ready');
      this.connected = true;
    });

    this.client.on('end', () => {
      console.log('[CacheService] Redis client disconnected');
      this.connected = false;
    });
  }

  /**
   * Connect to Redis server
   */
  async connect(): Promise<void> {
    if (!this.connected && !this.client.isOpen) {
      await this.client.connect();
    }
  }

  /**
   * Disconnect from Redis server
   */
  async disconnect(): Promise<void> {
    if (this.connected && this.client.isOpen) {
      await this.client.quit();
    }
  }

  /**
   * Get cached value by key
   * Increments hit count when cache hit occurs
   * 
   * @param key - Cache key (typically image hash)
   * @returns Cached value or null if not found
   */
  async get(key: string): Promise<any | null> {
    try {
      if (!this.connected) {
        await this.connect();
      }

      const cached = await this.client.get(key);
      
      if (cached) {
        const data: CachedDiagnosis = JSON.parse(cached);
        
        // Increment hit count
        data.hitCount++;
        
        // Update cache with new hit count
        await this.client.setEx(key, this.DEFAULT_TTL, JSON.stringify(data));
        
        return data;
      }
      
      return null;
    } catch (error) {
      console.error('[CacheService] Error getting cached value:', error);
      return null; // Graceful degradation - proceed without cache
    }
  }

  /**
   * Set cached value with TTL
   * 
   * @param key - Cache key (typically image hash)
   * @param value - Value to cache
   * @param ttl - Time to live in seconds (default: 24 hours)
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      if (!this.connected) {
        await this.connect();
      }

      const ttlSeconds = ttl || this.DEFAULT_TTL;
      const serialized = JSON.stringify(value);
      
      await this.client.setEx(key, ttlSeconds, serialized);
    } catch (error) {
      console.error('[CacheService] Error setting cached value:', error);
      // Graceful degradation - don't throw, just log
    }
  }

  /**
   * Delete cached value by key
   * 
   * @param key - Cache key to delete
   */
  async delete(key: string): Promise<void> {
    try {
      if (!this.connected) {
        await this.connect();
      }

      await this.client.del(key);
    } catch (error) {
      console.error('[CacheService] Error deleting cached value:', error);
      // Graceful degradation - don't throw, just log
    }
  }

  /**
   * Get cache hit count for a specific key
   * 
   * @param key - Cache key
   * @returns Hit count or 0 if not found
   */
  async getCacheHitCount(key: string): Promise<number> {
    try {
      if (!this.connected) {
        await this.connect();
      }

      const cached = await this.client.get(key);
      
      if (cached) {
        const data: CachedDiagnosis = JSON.parse(cached);
        return data.hitCount;
      }
      
      return 0;
    } catch (error) {
      console.error('[CacheService] Error getting cache hit count:', error);
      return 0;
    }
  }

  /**
   * Check if Redis is connected
   */
  isConnected(): boolean {
    return this.connected && this.client.isOpen;
  }

  /**
   * Flush all cached data (use with caution)
   */
  async flushAll(): Promise<void> {
    try {
      if (!this.connected) {
        await this.connect();
      }

      await this.client.flushAll();
    } catch (error) {
      console.error('[CacheService] Error flushing cache:', error);
    }
  }
}

// Export singleton instance
export const cacheService = new CacheService();
