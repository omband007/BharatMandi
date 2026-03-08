/**
 * Unit Tests for Image Hash Utility
 * 
 * Tests SHA-256 hashing functionality for cache key generation:
 * - Hash generation from image buffers
 * - Consistent hashing (same input = same hash)
 * - Different inputs produce different hashes
 * - Cache key format validation
 * - Hash length validation (16 characters)
 * 
 * Requirements: 12.3
 */

import { generateImageHash, generateDiagnosisCacheKey } from '../image-hash.util';

describe('Image Hash Utility', () => {
  describe('generateImageHash()', () => {
    it('should generate 16-character hash from image buffer', () => {
      const buffer = Buffer.from('test image data');
      const hash = generateImageHash(buffer);

      expect(hash).toHaveLength(16);
      expect(hash).toMatch(/^[a-f0-9]{16}$/); // Hexadecimal format
    });

    it('should generate consistent hash for same input', () => {
      const buffer = Buffer.from('test image data');
      
      const hash1 = generateImageHash(buffer);
      const hash2 = generateImageHash(buffer);

      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different inputs', () => {
      const buffer1 = Buffer.from('image data 1');
      const buffer2 = Buffer.from('image data 2');

      const hash1 = generateImageHash(buffer1);
      const hash2 = generateImageHash(buffer2);

      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty buffer', () => {
      const buffer = Buffer.from('');
      const hash = generateImageHash(buffer);

      expect(hash).toHaveLength(16);
      expect(hash).toMatch(/^[a-f0-9]{16}$/);
    });

    it('should handle large buffers', () => {
      // Simulate a 5MB image
      const buffer = Buffer.alloc(5 * 1024 * 1024, 'a');
      const hash = generateImageHash(buffer);

      expect(hash).toHaveLength(16);
      expect(hash).toMatch(/^[a-f0-9]{16}$/);
    });

    it('should generate different hashes for similar but not identical data', () => {
      const buffer1 = Buffer.from('test image data');
      const buffer2 = Buffer.from('test image data '); // Extra space

      const hash1 = generateImageHash(buffer1);
      const hash2 = generateImageHash(buffer2);

      expect(hash1).not.toBe(hash2);
    });

    it('should use first 16 characters of SHA-256 hash', () => {
      const buffer = Buffer.from('test');
      const hash = generateImageHash(buffer);

      // SHA-256 of "test" starts with "9f86d081884c7d65"
      expect(hash).toBe('9f86d081884c7d65');
    });
  });

  describe('generateDiagnosisCacheKey()', () => {
    it('should generate cache key with "diagnosis:" prefix', () => {
      const buffer = Buffer.from('test image data');
      const cacheKey = generateDiagnosisCacheKey(buffer);

      expect(cacheKey).toMatch(/^diagnosis:[a-f0-9]{16}$/);
    });

    it('should generate consistent cache key for same input', () => {
      const buffer = Buffer.from('test image data');

      const key1 = generateDiagnosisCacheKey(buffer);
      const key2 = generateDiagnosisCacheKey(buffer);

      expect(key1).toBe(key2);
    });

    it('should generate different cache keys for different inputs', () => {
      const buffer1 = Buffer.from('image 1');
      const buffer2 = Buffer.from('image 2');

      const key1 = generateDiagnosisCacheKey(buffer1);
      const key2 = generateDiagnosisCacheKey(buffer2);

      expect(key1).not.toBe(key2);
    });

    it('should include hash in cache key', () => {
      const buffer = Buffer.from('test');
      const hash = generateImageHash(buffer);
      const cacheKey = generateDiagnosisCacheKey(buffer);

      expect(cacheKey).toBe(`diagnosis:${hash}`);
    });

    it('should handle binary image data', () => {
      // Simulate actual image bytes (JPEG header)
      const buffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]);
      const cacheKey = generateDiagnosisCacheKey(buffer);

      expect(cacheKey).toMatch(/^diagnosis:[a-f0-9]{16}$/);
    });
  });

  describe('Hash collision resistance', () => {
    it('should generate unique hashes for multiple different inputs', () => {
      const hashes = new Set<string>();
      
      // Generate 100 different buffers
      for (let i = 0; i < 100; i++) {
        const buffer = Buffer.from(`test image ${i}`);
        const hash = generateImageHash(buffer);
        hashes.add(hash);
      }

      // All hashes should be unique
      expect(hashes.size).toBe(100);
    });

    it('should handle byte-level differences', () => {
      const buffer1 = Buffer.from([0x01, 0x02, 0x03]);
      const buffer2 = Buffer.from([0x01, 0x02, 0x04]); // Last byte different

      const hash1 = generateImageHash(buffer1);
      const hash2 = generateImageHash(buffer2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle typical JPEG image buffer', () => {
      // Simulate JPEG file header and some data
      const jpegHeader = Buffer.from([
        0xFF, 0xD8, 0xFF, 0xE0, // JPEG SOI and APP0
        0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, // JFIF
      ]);
      
      const hash = generateImageHash(jpegHeader);
      const cacheKey = generateDiagnosisCacheKey(jpegHeader);

      expect(hash).toHaveLength(16);
      expect(cacheKey).toMatch(/^diagnosis:[a-f0-9]{16}$/);
    });

    it('should handle typical PNG image buffer', () => {
      // PNG file signature
      const pngSignature = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
      ]);

      const hash = generateImageHash(pngSignature);
      const cacheKey = generateDiagnosisCacheKey(pngSignature);

      expect(hash).toHaveLength(16);
      expect(cacheKey).toMatch(/^diagnosis:[a-f0-9]{16}$/);
    });

    it('should detect identical images from different sources', () => {
      // Same image data from two different "uploads"
      const imageData = Buffer.from('identical crop image data');
      
      const upload1Hash = generateImageHash(imageData);
      const upload2Hash = generateImageHash(imageData);

      expect(upload1Hash).toBe(upload2Hash);
      
      // This enables cache hits for identical images
      const key1 = generateDiagnosisCacheKey(imageData);
      const key2 = generateDiagnosisCacheKey(imageData);
      expect(key1).toBe(key2);
    });
  });

  describe('Performance', () => {
    it('should hash large buffers efficiently', () => {
      // 10MB buffer
      const largeBuffer = Buffer.alloc(10 * 1024 * 1024, 'x');
      
      const startTime = Date.now();
      const hash = generateImageHash(largeBuffer);
      const endTime = Date.now();

      expect(hash).toHaveLength(16);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete in <1s
    });

    it('should generate cache keys quickly', () => {
      const buffer = Buffer.from('test image');
      
      const startTime = Date.now();
      for (let i = 0; i < 1000; i++) {
        generateDiagnosisCacheKey(buffer);
      }
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100); // 1000 operations in <100ms
    });
  });
});
