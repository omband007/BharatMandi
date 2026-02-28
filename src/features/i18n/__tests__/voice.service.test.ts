/**
 * Voice Service Unit Tests
 * 
 * Tests for speech-to-text and text-to-speech functionality
 */

import { VoiceService } from '../voice.service';

// Mock AWS SDK clients
jest.mock('@aws-sdk/client-transcribe');
jest.mock('@aws-sdk/client-polly');
jest.mock('@aws-sdk/client-s3');

describe('VoiceService', () => {
  let voiceService: VoiceService;

  beforeEach(() => {
    voiceService = new VoiceService();
  });

  describe('TTS Cache Key Generation', () => {
    it('should generate consistent cache keys for same input', () => {
      const text = 'Hello World';
      const language = 'en' as const;
      const speed = 1.0;

      // Access private method through any cast for testing
      const key1 = (voiceService as any).generateTTSCacheKey(text, language, speed);
      const key2 = (voiceService as any).generateTTSCacheKey(text, language, speed);

      expect(key1).toBe(key2);
      expect(key1).toHaveLength(64); // SHA-256 produces 64 character hex string
    });

    it('should generate different cache keys for different inputs', () => {
      const key1 = (voiceService as any).generateTTSCacheKey('Hello', 'en', 1.0);
      const key2 = (voiceService as any).generateTTSCacheKey('World', 'en', 1.0);
      const key3 = (voiceService as any).generateTTSCacheKey('Hello', 'hi', 1.0);
      const key4 = (voiceService as any).generateTTSCacheKey('Hello', 'en', 1.5);

      expect(key1).not.toBe(key2);
      expect(key1).not.toBe(key3);
      expect(key1).not.toBe(key4);
    });
  });

  describe('TTS Cache Management', () => {
    it('should clear entire cache', () => {
      voiceService.clearTTSCache();
      const stats = voiceService.getTTSCacheStats();
      
      expect(stats.size).toBe(0);
      expect(stats.keys).toEqual([]);
    });

    it('should track cache statistics', () => {
      const stats = voiceService.getTTSCacheStats();
      
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('keys');
      expect(Array.isArray(stats.keys)).toBe(true);
    });
  });

  describe('Language Code Mapping', () => {
    it('should map Polly language codes correctly', () => {
      const enCode = (voiceService as any).getPollyLanguageCode('en');
      const hiCode = (voiceService as any).getPollyLanguageCode('hi');
      
      expect(enCode).toBe('en-IN');
      expect(hiCode).toBe('hi-IN');
    });
  });

  describe('Content Type Detection', () => {
    it('should return correct MIME types for audio formats', () => {
      expect((voiceService as any).getContentType('mp3')).toBe('audio/mpeg');
      expect((voiceService as any).getContentType('wav')).toBe('audio/wav');
      expect((voiceService as any).getContentType('flac')).toBe('audio/flac');
      expect((voiceService as any).getContentType('ogg')).toBe('audio/ogg');
    });

    it('should return default MIME type for unknown formats', () => {
      expect((voiceService as any).getContentType('unknown')).toBe('application/octet-stream');
    });
  });

  describe('Transcribe Language Code Mapping', () => {
    it('should map AWS Transcribe codes to our codes', () => {
      expect((voiceService as any).mapTranscribeLanguageCode('en-IN')).toBe('en');
      expect((voiceService as any).mapTranscribeLanguageCode('hi-IN')).toBe('hi');
      expect((voiceService as any).mapTranscribeLanguageCode('ta-IN')).toBe('ta');
      expect((voiceService as any).mapTranscribeLanguageCode('te-IN')).toBe('te');
    });

    it('should fallback to English for unknown codes', () => {
      expect((voiceService as any).mapTranscribeLanguageCode('unknown')).toBe('en');
    });
  });
});
