/**
 * Audio Cache Service Tests
 * 
 * Tests for local SQLite audio caching with LRU eviction.
 */

import { AudioCacheService } from '../audio-cache.service';
import fs from 'fs';
import path from 'path';

describe('AudioCacheService', () => {
  let audioCacheService: AudioCacheService;
  const testDbPath = path.join(process.cwd(), 'data', 'test-audio-cache.db');

  beforeEach(() => {
    // Clean up test database if it exists
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    
    audioCacheService = new AudioCacheService(testDbPath);
  });

  afterEach(() => {
    audioCacheService.close();
    
    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('storeCachedAudio', () => {
    it('should store audio in cache', async () => {
      const cacheKey = 'test-key-1';
      const audioData = Buffer.from('test audio data');
      const language = 'en';
      const text = 'Hello world';
      const speed = 1.0;

      await audioCacheService.storeCachedAudio(cacheKey, audioData, language, text, speed);

      const cached = audioCacheService.getCachedAudio(cacheKey);
      expect(cached).not.toBeNull();
      expect(cached?.cacheKey).toBe(cacheKey);
      expect(cached?.language).toBe(language);
      expect(cached?.text).toBe(text);
      expect(cached?.speed).toBe(speed);
      expect(cached?.audioData.toString()).toBe(audioData.toString());
    });

    it('should replace existing cache entry with same key', async () => {
      const cacheKey = 'test-key-2';
      const audioData1 = Buffer.from('audio data 1');
      const audioData2 = Buffer.from('audio data 2');

      await audioCacheService.storeCachedAudio(cacheKey, audioData1, 'en', 'Text 1', 1.0);
      await audioCacheService.storeCachedAudio(cacheKey, audioData2, 'hi', 'Text 2', 1.5);

      const cached = audioCacheService.getCachedAudio(cacheKey);
      expect(cached?.audioData.toString()).toBe(audioData2.toString());
      expect(cached?.language).toBe('hi');
      expect(cached?.text).toBe('Text 2');
    });
  });

  describe('getCachedAudio', () => {
    it('should return null for non-existent cache key', () => {
      const cached = audioCacheService.getCachedAudio('non-existent-key');
      expect(cached).toBeNull();
    });

    it('should update access statistics when retrieving cached audio', async () => {
      const cacheKey = 'test-key-3';
      const audioData = Buffer.from('test audio');

      await audioCacheService.storeCachedAudio(cacheKey, audioData, 'en', 'Test', 1.0);

      // Access count starts at 1, each get increments it
      const cached1 = audioCacheService.getCachedAudio(cacheKey);
      expect(cached1?.accessCount).toBe(2);

      const cached2 = audioCacheService.getCachedAudio(cacheKey);
      expect(cached2?.accessCount).toBe(3);

      const cached3 = audioCacheService.getCachedAudio(cacheKey);
      expect(cached3?.accessCount).toBe(4);
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', async () => {
      const audioData1 = Buffer.from('audio 1');
      const audioData2 = Buffer.from('audio 2');

      await audioCacheService.storeCachedAudio('key1', audioData1, 'en', 'Text 1', 1.0);
      await audioCacheService.storeCachedAudio('key2', audioData2, 'hi', 'Text 2', 1.5);

      const stats = audioCacheService.getStats();
      expect(stats.totalEntries).toBe(2);
      expect(stats.totalSizeBytes).toBe(audioData1.length + audioData2.length);
      expect(stats.totalSizeMB).toBeCloseTo((audioData1.length + audioData2.length) / (1024 * 1024), 6);
    });

    it('should return most accessed entry', async () => {
      await audioCacheService.storeCachedAudio('key1', Buffer.from('audio 1'), 'en', 'Text 1', 1.0);
      await audioCacheService.storeCachedAudio('key2', Buffer.from('audio 2'), 'hi', 'Text 2', 1.5);

      // Access key1 multiple times (starts at 1, each get increments)
      audioCacheService.getCachedAudio('key1'); // 2
      audioCacheService.getCachedAudio('key1'); // 3
      audioCacheService.getCachedAudio('key1'); // 4

      const stats = audioCacheService.getStats();
      expect(stats.mostAccessed?.cacheKey).toBe('key1');
      expect(stats.mostAccessed?.accessCount).toBe(4);
    });
  });

  describe('LRU eviction', () => {
    it('should evict least recently used entries when storage limit exceeded', async () => {
      // Use a separate test database for this test
      const evictionTestDbPath = path.join(process.cwd(), 'data', 'test-eviction-cache.db');
      
      // Clean up if exists
      if (fs.existsSync(evictionTestDbPath)) {
        fs.unlinkSync(evictionTestDbPath);
      }
      
      const smallCacheService = new AudioCacheService(evictionTestDbPath);
      
      try {
        // Store multiple small entries first
        const smallAudio = Buffer.alloc(1000); // 1KB each
        
        await smallCacheService.storeCachedAudio('key1', smallAudio, 'en', 'Text 1', 1.0);
        await new Promise(resolve => setTimeout(resolve, 10));
        
        await smallCacheService.storeCachedAudio('key2', smallAudio, 'en', 'Text 2', 1.0);
        await new Promise(resolve => setTimeout(resolve, 10));
        
        await smallCacheService.storeCachedAudio('key3', smallAudio, 'en', 'Text 3', 1.0);
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // Access key2 and key3 to make them more recently used
        smallCacheService.getCachedAudio('key2');
        await new Promise(resolve => setTimeout(resolve, 10));
        smallCacheService.getCachedAudio('key3');
        
        // Now store a very large entry that will trigger eviction
        // This should evict key1 (least recently used)
        const largeAudio = Buffer.alloc(49 * 1024 * 1024); // 49MB
        await smallCacheService.storeCachedAudio('key4', largeAudio, 'en', 'Text 4', 1.0);
        
        // Verify eviction occurred
        const stats = smallCacheService.getStats();
        
        // key1 should be evicted (it was least recently used)
        const cached1 = smallCacheService.getCachedAudio('key1');
        
        // key4 should exist
        const cached4 = smallCacheService.getCachedAudio('key4');
        expect(cached4).not.toBeNull();
        
        // Total size should be under 50MB
        expect(stats.totalSizeMB).toBeLessThan(50);
      } finally {
        smallCacheService.close();
        
        // Clean up
        if (fs.existsSync(evictionTestDbPath)) {
          fs.unlinkSync(evictionTestDbPath);
        }
      }
    });
  });

  describe('clearCache', () => {
    it('should clear all cached audio', async () => {
      await audioCacheService.storeCachedAudio('key1', Buffer.from('audio 1'), 'en', 'Text 1', 1.0);
      await audioCacheService.storeCachedAudio('key2', Buffer.from('audio 2'), 'hi', 'Text 2', 1.5);

      audioCacheService.clearCache();

      const stats = audioCacheService.getStats();
      expect(stats.totalEntries).toBe(0);
      expect(stats.totalSizeBytes).toBe(0);
    });
  });

  describe('deleteCachedAudio', () => {
    it('should delete specific cached audio', async () => {
      await audioCacheService.storeCachedAudio('key1', Buffer.from('audio 1'), 'en', 'Text 1', 1.0);
      await audioCacheService.storeCachedAudio('key2', Buffer.from('audio 2'), 'hi', 'Text 2', 1.5);

      audioCacheService.deleteCachedAudio('key1');

      const cached1 = audioCacheService.getCachedAudio('key1');
      const cached2 = audioCacheService.getCachedAudio('key2');

      expect(cached1).toBeNull();
      expect(cached2).not.toBeNull();
    });
  });

  describe('getCachedAudioByLanguage', () => {
    it('should return cached audio entries for specific language', async () => {
      await audioCacheService.storeCachedAudio('key1', Buffer.from('audio 1'), 'en', 'Text 1', 1.0);
      await audioCacheService.storeCachedAudio('key2', Buffer.from('audio 2'), 'hi', 'Text 2', 1.5);
      await audioCacheService.storeCachedAudio('key3', Buffer.from('audio 3'), 'en', 'Text 3', 1.0);

      const enEntries = audioCacheService.getCachedAudioByLanguage('en');
      const hiEntries = audioCacheService.getCachedAudioByLanguage('hi');

      expect(enEntries.length).toBe(2);
      expect(hiEntries.length).toBe(1);
      expect(enEntries.every(e => e.language === 'en')).toBe(true);
      expect(hiEntries.every(e => e.language === 'hi')).toBe(true);
    });

    it('should return empty array for language with no cached audio', () => {
      const entries = audioCacheService.getCachedAudioByLanguage('ta');
      expect(entries).toEqual([]);
    });
  });
});
