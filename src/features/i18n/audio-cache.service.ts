/**
 * Audio Cache Service
 * 
 * Handles local SQLite caching of TTS audio for offline playback.
 * Implements LRU eviction when cache exceeds 50MB limit.
 * 
 * Features:
 * - Local audio storage in SQLite
 * - LRU (Least Recently Used) eviction
 * - Storage monitoring and limits
 * - Cache statistics
 * 
 * Requirements: 7.12, 13.2
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

/**
 * Cached audio entry
 */
export interface CachedAudio {
  id: string;
  cacheKey: string;
  audioData: Buffer;
  language: string;
  text: string;
  speed: number;
  sizeBytes: number;
  createdAt: Date;
  lastAccessedAt: Date;
  accessCount: number;
}

/**
 * Audio cache statistics
 */
export interface AudioCacheStats {
  totalEntries: number;
  totalSizeBytes: number;
  totalSizeMB: number;
  oldestEntry?: Date;
  newestEntry?: Date;
  mostAccessed?: {
    cacheKey: string;
    text: string;
    accessCount: number;
  };
}

/**
 * Audio Cache Service Configuration
 */
interface AudioCacheConfig {
  dbPath: string;
  maxSizeBytes: number; // 50MB default
}

/**
 * Audio Cache Service
 * 
 * Provides local SQLite caching for TTS audio with LRU eviction.
 */
export class AudioCacheService {
  private db: Database.Database;
  private config: AudioCacheConfig;
  private readonly MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

  constructor(dbPath?: string) {
    const dataDir = path.join(process.cwd(), 'data');
    
    // Ensure data directory exists
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    this.config = {
      dbPath: dbPath || path.join(dataDir, 'audio-cache.db'),
      maxSizeBytes: this.MAX_SIZE_BYTES
    };

    this.db = new Database(this.config.dbPath);
    this.initializeDatabase();
  }

  /**
   * Initialize database schema
   */
  private initializeDatabase(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS audio_cache (
        id TEXT PRIMARY KEY,
        cache_key TEXT UNIQUE NOT NULL,
        audio_data BLOB NOT NULL,
        language TEXT NOT NULL,
        text TEXT NOT NULL,
        speed REAL NOT NULL,
        size_bytes INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        last_accessed_at TEXT NOT NULL,
        access_count INTEGER NOT NULL DEFAULT 1
      );

      CREATE INDEX IF NOT EXISTS idx_audio_cache_key ON audio_cache(cache_key);
      CREATE INDEX IF NOT EXISTS idx_audio_last_accessed ON audio_cache(last_accessed_at);
      CREATE INDEX IF NOT EXISTS idx_audio_language ON audio_cache(language);
    `);
  }

  /**
   * Get cached audio by cache key
   * 
   * Requirements: 7.12, 13.2
   * 
   * @param cacheKey - Cache key
   * @returns Cached audio or null if not found
   */
  getCachedAudio(cacheKey: string): CachedAudio | null {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM audio_cache WHERE cache_key = ?
      `);

      const row = stmt.get(cacheKey) as any;

      if (!row) {
        return null;
      }

      // Update access statistics
      this.updateAccessStats(cacheKey);

      // Return with updated access count
      return {
        id: row.id,
        cacheKey: row.cache_key,
        audioData: row.audio_data,
        language: row.language,
        text: row.text,
        speed: row.speed,
        sizeBytes: row.size_bytes,
        createdAt: new Date(row.created_at),
        lastAccessedAt: new Date(), // Current time since we just accessed it
        accessCount: row.access_count + 1 // Increment since we just accessed it
      };
    } catch (error) {
      console.error('[AudioCacheService] Error getting cached audio:', error);
      return null;
    }
  }

  /**
   * Store audio in cache
   * 
   * Requirements: 7.12, 13.2, 13.8
   * 
   * @param cacheKey - Cache key
   * @param audioData - Audio buffer
   * @param language - Language code
   * @param text - Original text
   * @param speed - Speech speed
   */
  async storeCachedAudio(
    cacheKey: string,
    audioData: Buffer,
    language: string,
    text: string,
    speed: number
  ): Promise<void> {
    try {
      const sizeBytes = audioData.length;
      const now = new Date().toISOString();
      const id = crypto.randomUUID();

      // Check if we need to evict entries
      await this.ensureStorageLimit(sizeBytes);

      // Insert or replace cached audio
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO audio_cache (
          id, cache_key, audio_data, language, text, speed,
          size_bytes, created_at, last_accessed_at, access_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `);

      stmt.run(id, cacheKey, audioData, language, text, speed, sizeBytes, now, now);

    } catch (error) {
      console.error('[AudioCacheService] Error storing cached audio:', error);
      throw error;
    }
  }

  /**
   * Update access statistics for cached audio
   * 
   * @param cacheKey - Cache key
   */
  private updateAccessStats(cacheKey: string): void {
    try {
      const now = new Date().toISOString();
      
      const stmt = this.db.prepare(`
        UPDATE audio_cache 
        SET last_accessed_at = ?, access_count = access_count + 1
        WHERE cache_key = ?
      `);

      stmt.run(now, cacheKey);
    } catch (error) {
      console.error('[AudioCacheService] Error updating access stats:', error);
    }
  }

  /**
   * Ensure storage limit is not exceeded using LRU eviction
   * 
   * Requirements: 13.8
   * 
   * @param newEntrySize - Size of new entry to be added
   */
  private async ensureStorageLimit(newEntrySize: number): Promise<void> {
    try {
      const stats = this.getStats();
      const availableSpace = this.config.maxSizeBytes - stats.totalSizeBytes;

      if (availableSpace >= newEntrySize) {
        return; // Enough space available
      }

      // Calculate how much space we need to free
      const spaceToFree = newEntrySize - availableSpace;

      // Get least recently used entries
      const stmt = this.db.prepare(`
        SELECT cache_key, size_bytes 
        FROM audio_cache 
        ORDER BY last_accessed_at ASC
      `);

      const entries = stmt.all() as Array<{ cache_key: string; size_bytes: number }>;

      let freedSpace = 0;
      const keysToDelete: string[] = [];

      for (const entry of entries) {
        keysToDelete.push(entry.cache_key);
        freedSpace += entry.size_bytes;

        if (freedSpace >= spaceToFree) {
          break;
        }
      }

      // Delete the entries
      if (keysToDelete.length > 0) {
        const placeholders = keysToDelete.map(() => '?').join(',');
        const deleteStmt = this.db.prepare(`
          DELETE FROM audio_cache WHERE cache_key IN (${placeholders})
        `);
        deleteStmt.run(...keysToDelete);

        console.log(`[AudioCacheService] Evicted ${keysToDelete.length} entries to free ${freedSpace} bytes`);
      }

    } catch (error) {
      console.error('[AudioCacheService] Error ensuring storage limit:', error);
      throw error;
    }
  }

  /**
   * Get cache statistics
   * 
   * Requirements: 13.8
   * 
   * @returns Cache statistics
   */
  getStats(): AudioCacheStats {
    try {
      const statsStmt = this.db.prepare(`
        SELECT 
          COUNT(*) as total_entries,
          SUM(size_bytes) as total_size_bytes,
          MIN(created_at) as oldest_entry,
          MAX(created_at) as newest_entry
        FROM audio_cache
      `);

      const stats = statsStmt.get() as any;

      const mostAccessedStmt = this.db.prepare(`
        SELECT cache_key, text, access_count
        FROM audio_cache
        ORDER BY access_count DESC
        LIMIT 1
      `);

      const mostAccessed = mostAccessedStmt.get() as any;

      return {
        totalEntries: stats.total_entries || 0,
        totalSizeBytes: stats.total_size_bytes || 0,
        totalSizeMB: (stats.total_size_bytes || 0) / (1024 * 1024),
        oldestEntry: stats.oldest_entry ? new Date(stats.oldest_entry) : undefined,
        newestEntry: stats.newest_entry ? new Date(stats.newest_entry) : undefined,
        mostAccessed: mostAccessed ? {
          cacheKey: mostAccessed.cache_key,
          text: mostAccessed.text,
          accessCount: mostAccessed.access_count
        } : undefined
      };
    } catch (error) {
      console.error('[AudioCacheService] Error getting stats:', error);
      return {
        totalEntries: 0,
        totalSizeBytes: 0,
        totalSizeMB: 0
      };
    }
  }

  /**
   * Clear all cached audio
   */
  clearCache(): void {
    try {
      this.db.prepare('DELETE FROM audio_cache').run();
      console.log('[AudioCacheService] Cache cleared');
    } catch (error) {
      console.error('[AudioCacheService] Error clearing cache:', error);
      throw error;
    }
  }

  /**
   * Delete specific cached audio by cache key
   * 
   * @param cacheKey - Cache key
   */
  deleteCachedAudio(cacheKey: string): void {
    try {
      this.db.prepare('DELETE FROM audio_cache WHERE cache_key = ?').run(cacheKey);
    } catch (error) {
      console.error('[AudioCacheService] Error deleting cached audio:', error);
      throw error;
    }
  }

  /**
   * Get cached audio entries by language
   * 
   * @param language - Language code
   * @returns Array of cached audio entries
   */
  getCachedAudioByLanguage(language: string): CachedAudio[] {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM audio_cache WHERE language = ?
        ORDER BY last_accessed_at DESC
      `);

      const rows = stmt.all(language) as any[];

      return rows.map(row => ({
        id: row.id,
        cacheKey: row.cache_key,
        audioData: row.audio_data,
        language: row.language,
        text: row.text,
        speed: row.speed,
        sizeBytes: row.size_bytes,
        createdAt: new Date(row.created_at),
        lastAccessedAt: new Date(row.last_accessed_at),
        accessCount: row.access_count
      }));
    } catch (error) {
      console.error('[AudioCacheService] Error getting cached audio by language:', error);
      return [];
    }
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }
}

// Export singleton instance
export const audioCacheService = new AudioCacheService();
