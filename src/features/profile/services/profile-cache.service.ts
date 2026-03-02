/**
 * Profile Cache Service
 * 
 * Redis caching layer for profile data to improve performance.
 */

import { getRedisClient } from '../../../shared/cache/redis-client';
import type { UserProfile } from '../types/profile.types';

export class ProfileCacheService {
  private readonly PROFILE_TTL = 5 * 60; // 5 minutes
  private readonly COMPLETION_TTL = 5 * 60; // 5 minutes
  private readonly POINTS_TTL = 1 * 60; // 1 minute

  /**
   * Get cache key for profile
   */
  private getProfileKey(userId: string): string {
    return `profile:${userId}`;
  }

  /**
   * Get cache key for completion percentage
   */
  private getCompletionKey(userId: string): string {
    return `profile:completion:${userId}`;
  }

  /**
   * Get cache key for points balance
   */
  private getPointsKey(userId: string): string {
    return `profile:points:${userId}`;
  }

  /**
   * Cache profile data
   */
  async cacheProfile(userId: string, profile: UserProfile): Promise<void> {
    try {
      const redis = getRedisClient();
      const key = this.getProfileKey(userId);
      await redis.setEx(key, this.PROFILE_TTL, JSON.stringify(profile));
    } catch (error) {
      console.error('[ProfileCache] Failed to cache profile:', error);
      // Don't throw - caching is optional
    }
  }

  /**
   * Get cached profile
   */
  async getCachedProfile(userId: string): Promise<UserProfile | null> {
    try {
      const redis = getRedisClient();
      const key = this.getProfileKey(userId);
      const cached = await redis.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('[ProfileCache] Failed to get cached profile:', error);
      return null;
    }
  }

  /**
   * Invalidate profile cache
   */
  async invalidateProfile(userId: string): Promise<void> {
    try {
      const redis = getRedisClient();
      await redis.del(this.getProfileKey(userId));
      await redis.del(this.getCompletionKey(userId));
    } catch (error) {
      console.error('[ProfileCache] Failed to invalidate profile:', error);
    }
  }

  /**
   * Cache completion percentage
   */
  async cacheCompletion(userId: string, percentage: number): Promise<void> {
    try {
      const redis = getRedisClient();
      const key = this.getCompletionKey(userId);
      await redis.setEx(key, this.COMPLETION_TTL, percentage.toString());
    } catch (error) {
      console.error('[ProfileCache] Failed to cache completion:', error);
    }
  }

  /**
   * Get cached completion percentage
   */
  async getCachedCompletion(userId: string): Promise<number | null> {
    try {
      const redis = getRedisClient();
      const key = this.getCompletionKey(userId);
      const cached = await redis.get(key);
      return cached ? parseFloat(cached) : null;
    } catch (error) {
      console.error('[ProfileCache] Failed to get cached completion:', error);
      return null;
    }
  }

  /**
   * Cache points balance
   */
  async cachePoints(userId: string, points: { current: number; lifetime: number }): Promise<void> {
    try {
      const redis = getRedisClient();
      const key = this.getPointsKey(userId);
      await redis.setEx(key, this.POINTS_TTL, JSON.stringify(points));
    } catch (error) {
      console.error('[ProfileCache] Failed to cache points:', error);
    }
  }

  /**
   * Get cached points balance
   */
  async getCachedPoints(userId: string): Promise<{ current: number; lifetime: number } | null> {
    try {
      const redis = getRedisClient();
      const key = this.getPointsKey(userId);
      const cached = await redis.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('[ProfileCache] Failed to get cached points:', error);
      return null;
    }
  }

  /**
   * Invalidate points cache
   */
  async invalidatePoints(userId: string): Promise<void> {
    try {
      const redis = getRedisClient();
      await redis.del(this.getPointsKey(userId));
    } catch (error) {
      console.error('[ProfileCache] Failed to invalidate points:', error);
    }
  }
}
