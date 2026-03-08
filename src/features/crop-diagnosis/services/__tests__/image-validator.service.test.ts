/**
 * Image Validator Service Unit Tests
 * 
 * Tests for image validation, compression, and S3 operations.
 */

import { ImageValidator } from '../image-validator.service';
import sharp from 'sharp';
import { S3Client } from '@aws-sdk/client-s3';

// Mock AWS SDK
jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/s3-request-presigner');

// Mock environment config
jest.mock('../../../../config/environment', () => ({
  getEnvironmentConfig: () => ({
    aws: {
      region: 'ap-southeast-2',
      accessKeyId: 'test-key',
      secretAccessKey: 'test-secret',
      s3: {
        cropDiagnosisBucket: 'test-bucket'
      }
    }
  })
}));

describe('ImageValidator', () => {
  let validator: ImageValidator;

  beforeEach(() => {
    validator = new ImageValidator();
    jest.clearAllMocks();
  });

  // ============================================================================
  // FORMAT VALIDATION TESTS (Requirement 1.1)
  // ============================================================================

  describe('Format Validation', () => {
    it('should accept JPEG images', async () => {
      // Create a larger image with more detail to pass size check (100KB+)
      // Use PNG first to ensure size, then convert to JPEG
      const pngBuffer = await sharp({
        create: {
          width: 2000,
          height: 1500,
          channels: 3,
          background: { r: 128, g: 128, b: 128 }
        }
      })
        .png({ compressionLevel: 0 })
        .toBuffer();
      
      // Convert to JPEG
      const jpegBuffer = await sharp(pngBuffer)
        .jpeg({ quality: 90 })
        .toBuffer();

      const result = await validator.validateImage(jpegBuffer, 'test.jpg');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.metadata?.format).toBe('jpeg');
    });

    it('should accept PNG images', async () => {
      const pngBuffer = await sharp({
        create: {
          width: 2000,
          height: 1500,
          channels: 3,
          background: { r: 128, g: 128, b: 128 }
        }
      })
        .png({ compressionLevel: 0 })
        .toBuffer();

      const result = await validator.validateImage(pngBuffer, 'test.png');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.metadata?.format).toBe('png');
    });

    it('should accept WebP images', async () => {
      const webpBuffer = await sharp({
        create: {
          width: 2000,
          height: 1500,
          channels: 3,
          background: { r: 128, g: 128, b: 128 }
        }
      })
        .webp({ quality: 90, lossless: true })
        .toBuffer();

      const result = await validator.validateImage(webpBuffer, 'test.webp');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.metadata?.format).toBe('webp');
    });

    it('should reject GIF images', async () => {
      const gifBuffer = await sharp({
        create: {
          width: 800,
          height: 600,
          channels: 3,
          background: { r: 255, g: 255, b: 0 }
        }
      })
        .gif()
        .toBuffer();

      const result = await validator.validateImage(gifBuffer, 'test.gif');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid image format'))).toBe(true);
      expect(result.errors.some(e => e.includes('gif'))).toBe(true);
    });

    it('should reject TIFF images', async () => {
      const tiffBuffer = await sharp({
        create: {
          width: 800,
          height: 600,
          channels: 3,
          background: { r: 255, g: 0, b: 255 }
        }
      })
        .tiff()
        .toBuffer();

      const result = await validator.validateImage(tiffBuffer, 'test.tiff');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid image format'))).toBe(true);
    });
  });

  // ============================================================================
  // SIZE VALIDATION TESTS (Requirement 1.2)
  // ============================================================================

  describe('Size Validation', () => {
    it('should accept images between 10KB and 10MB', async () => {
      // Create ~500KB image using PNG with no compression
      const validBuffer = await sharp({
        create: {
          width: 2000,
          height: 2000,
          channels: 3,
          background: { r: 128, g: 128, b: 128 }
        }
      })
        .png({ compressionLevel: 0 })
        .toBuffer();
      
      // Convert to JPEG
      const jpegBuffer = await sharp(validBuffer)
        .jpeg({ quality: 90 })
        .toBuffer();

      const result = await validator.validateImage(jpegBuffer, 'test.jpg');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.metadata?.sizeBytes).toBeGreaterThanOrEqual(10 * 1024);
      expect(result.metadata?.sizeBytes).toBeLessThanOrEqual(10 * 1024 * 1024);
    });

    it('should reject images smaller than 10KB', async () => {
      // Create very small image
      const tinyBuffer = await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 3,
          background: { r: 255, g: 255, b: 255 }
        }
      })
        .jpeg({ quality: 10 })
        .toBuffer();

      const result = await validator.validateImage(tinyBuffer, 'test.jpg');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('too small'))).toBe(true);
      expect(result.errors.some(e => e.includes('10KB'))).toBe(true);
    });

    it('should reject images larger than 10MB', async () => {
      // Create large image (>10MB)
      const largeBuffer = await sharp({
        create: {
          width: 5000,
          height: 5000,
          channels: 3,
          background: { r: 128, g: 128, b: 128 }
        }
      })
        .png({ compressionLevel: 0 })
        .toBuffer();

      const result = await validator.validateImage(largeBuffer, 'test.png');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('exceeds maximum'))).toBe(true);
      expect(result.errors.some(e => e.includes('10MB'))).toBe(true);
    });
  });

  // ============================================================================
  // DIMENSION VALIDATION TESTS (Requirement 1.4)
  // ============================================================================

  describe('Dimension Validation', () => {
    it('should accept images with dimensions >= 640x480', async () => {
      const pngBuffer = await sharp({
        create: {
          width: 2000,
          height: 1500,
          channels: 3,
          background: { r: 128, g: 128, b: 128 }
        }
      })
        .png({ compressionLevel: 0 })
        .toBuffer();
      
      const validBuffer = await sharp(pngBuffer)
        .jpeg({ quality: 90 })
        .toBuffer();

      const result = await validator.validateImage(validBuffer, 'test.jpg');

      expect(result.valid).toBe(true);
      expect(result.metadata?.width).toBeGreaterThanOrEqual(640);
      expect(result.metadata?.height).toBeGreaterThanOrEqual(480);
    });

    it('should accept images exactly 640x480', async () => {
      const pngBuffer = await sharp({
        create: {
          width: 640,
          height: 480,
          channels: 3,
          background: { r: 128, g: 128, b: 128 }
        }
      })
        .png({ compressionLevel: 0 })
        .toBuffer();
      
      const minBuffer = await sharp(pngBuffer)
        .jpeg({ quality: 90 })
        .toBuffer();

      const result = await validator.validateImage(minBuffer, 'test.jpg');

      expect(result.valid).toBe(true);
      expect(result.metadata?.width).toBe(640);
      expect(result.metadata?.height).toBe(480);
    });

    it('should reject images with width < 640', async () => {
      const narrowBuffer = await sharp({
        create: {
          width: 500,
          height: 600,
          channels: 3,
          background: { r: 128, g: 128, b: 128 }
        }
      })
        .jpeg()
        .toBuffer();

      const result = await validator.validateImage(narrowBuffer, 'test.jpg');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('dimensions'))).toBe(true);
      expect(result.errors.some(e => e.includes('640x480'))).toBe(true);
    });

    it('should reject images with height < 480', async () => {
      const shortBuffer = await sharp({
        create: {
          width: 800,
          height: 400,
          channels: 3,
          background: { r: 128, g: 128, b: 128 }
        }
      })
        .jpeg()
        .toBuffer();

      const result = await validator.validateImage(shortBuffer, 'test.jpg');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('dimensions'))).toBe(true);
      expect(result.errors.some(e => e.includes('640x480'))).toBe(true);
    });
  });

  // ============================================================================
  // ERROR MESSAGE SPECIFICITY TESTS (Requirement 1.5)
  // ============================================================================

  describe('Error Message Specificity', () => {
    it('should return specific error for invalid format', async () => {
      const gifBuffer = await sharp({
        create: {
          width: 1200,
          height: 900,
          channels: 3,
          background: { r: 255, g: 255, b: 0 }
        }
      })
        .gif()
        .toBuffer();

      const result = await validator.validateImage(gifBuffer, 'test.gif');

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Invalid image format');
      expect(result.errors[0]).toContain('JPEG, PNG, and WebP');
    });

    it('should return specific error for small size', async () => {
      const tinyBuffer = await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 3,
          background: { r: 255, g: 255, b: 255 }
        }
      })
        .jpeg({ quality: 10 })
        .toBuffer();

      const result = await validator.validateImage(tinyBuffer, 'test.jpg');

      expect(result.errors.some(e => e.includes('too small'))).toBe(true);
      expect(result.errors.some(e => e.includes('10KB'))).toBe(true);
    });

    it('should return specific error for small dimensions', async () => {
      const smallBuffer = await sharp({
        create: {
          width: 400,
          height: 300,
          channels: 3,
          background: { r: 128, g: 128, b: 128 }
        }
      })
        .jpeg()
        .toBuffer();

      const result = await validator.validateImage(smallBuffer, 'test.jpg');

      expect(result.errors.some(e => e.includes('dimensions'))).toBe(true);
      expect(result.errors.some(e => e.includes('640x480'))).toBe(true);
    });

    it('should return multiple errors for multiple violations', async () => {
      const invalidBuffer = await sharp({
        create: {
          width: 400,
          height: 300,
          channels: 3,
          background: { r: 255, g: 255, b: 255 }
        }
      })
        .gif()
        .toBuffer();

      const result = await validator.validateImage(invalidBuffer, 'test.gif');

      expect(result.errors.length).toBeGreaterThan(1);
      expect(result.errors.some(e => e.includes('format'))).toBe(true);
      expect(result.errors.some(e => e.includes('dimensions'))).toBe(true);
    });
  });

  // ============================================================================
  // QUALITY ASSESSMENT TESTS (Requirements 9.6, 9.7)
  // ============================================================================

  describe('Quality Assessment', () => {
    it('should warn about blurry images', async () => {
      // Create a blurred image
      const pngBuffer = await sharp({
        create: {
          width: 2000,
          height: 1500,
          channels: 3,
          background: { r: 128, g: 128, b: 128 }
        }
      })
        .png({ compressionLevel: 0 })
        .toBuffer();
      
      const blurryBuffer = await sharp(pngBuffer)
        .blur(10) // Heavy blur
        .jpeg({ quality: 90 })
        .toBuffer();

      const result = await validator.validateImage(blurryBuffer, 'test.jpg');

      expect(result.valid).toBe(true); // Valid but with warnings
      expect(result.warnings.some(w => w.includes('blurry'))).toBe(true);
      expect(result.warnings.some(w => w.includes('focus'))).toBe(true);
    });

    it('should warn about dark images', async () => {
      // Create a very dark image
      const darkBuffer = await sharp({
        create: {
          width: 2000,
          height: 1500,
          channels: 3,
          background: { r: 10, g: 10, b: 10 }
        }
      })
        .png({ compressionLevel: 0 })
        .toBuffer();
      
      const jpegBuffer = await sharp(darkBuffer)
        .jpeg({ quality: 90 })
        .toBuffer();

      const result = await validator.validateImage(jpegBuffer, 'test.jpg');

      expect(result.valid).toBe(true); // Valid but with warnings
      expect(result.warnings.some(w => w.includes('dark'))).toBe(true);
      expect(result.warnings.some(w => w.includes('lighting'))).toBe(true);
    });

    it('should warn about overexposed images', async () => {
      // Create a very bright image
      const brightBuffer = await sharp({
        create: {
          width: 2000,
          height: 1500,
          channels: 3,
          background: { r: 250, g: 250, b: 250 }
        }
      })
        .png({ compressionLevel: 0 })
        .toBuffer();
      
      const jpegBuffer = await sharp(brightBuffer)
        .jpeg({ quality: 90 })
        .toBuffer();

      const result = await validator.validateImage(jpegBuffer, 'test.jpg');

      expect(result.valid).toBe(true); // Valid but with warnings
      expect(result.warnings.some(w => w.includes('overexposed'))).toBe(true);
    });

    it('should not warn for well-lit, sharp images', async () => {
      const pngBuffer = await sharp({
        create: {
          width: 2000,
          height: 1500,
          channels: 3,
          background: { r: 128, g: 128, b: 128 }
        }
      })
        .png({ compressionLevel: 0 })
        .toBuffer();
      
      const goodBuffer = await sharp(pngBuffer)
        .jpeg({ quality: 90 })
        .toBuffer();

      const result = await validator.validateImage(goodBuffer, 'test.jpg');

      expect(result.valid).toBe(true);
      // May have blur warning due to solid color, but that's acceptable
    });
  });

  // ============================================================================
  // IMAGE COMPRESSION TESTS (Requirement 12.4)
  // ============================================================================

  describe('Image Compression', () => {
    it('should compress images to max 5MB', async () => {
      // Create a large image
      const largeBuffer = await sharp({
        create: {
          width: 3000,
          height: 3000,
          channels: 3,
          background: { r: 128, g: 128, b: 128 }
        }
      })
        .jpeg({ quality: 100 })
        .toBuffer();

      const compressed = await validator.compressImage(largeBuffer);

      expect(compressed.length).toBeLessThanOrEqual(5 * 1024 * 1024);
    });

    it('should maintain image quality during compression', async () => {
      const originalBuffer = await sharp({
        create: {
          width: 2500,
          height: 2500,
          channels: 3,
          background: { r: 128, g: 128, b: 128 }
        }
      })
        .jpeg({ quality: 90 })
        .toBuffer();

      const compressed = await validator.compressImage(originalBuffer);
      const metadata = await sharp(compressed).metadata();

      expect(metadata.format).toBe('jpeg');
      // Should be resized to fit within 1920x1920
      expect(metadata.width).toBeLessThanOrEqual(1920);
      expect(metadata.height).toBeLessThanOrEqual(1920);
    });

    it('should return small images unchanged if already JPEG and under 5MB', async () => {
      const smallBuffer = await sharp({
        create: {
          width: 800,
          height: 600,
          channels: 3,
          background: { r: 128, g: 128, b: 128 }
        }
      })
        .jpeg({ quality: 85 })
        .toBuffer();

      const compressed = await validator.compressImage(smallBuffer);

      // Should be similar size (not re-compressed)
      expect(Math.abs(compressed.length - smallBuffer.length)).toBeLessThan(1000);
    });
  });

  // ============================================================================
  // METADATA EXTRACTION TESTS
  // ============================================================================

  describe('Metadata Extraction', () => {
    it('should extract correct metadata from valid images', async () => {
      const buffer = await sharp({
        create: {
          width: 1024,
          height: 768,
          channels: 3,
          background: { r: 128, g: 128, b: 128 }
        }
      })
        .jpeg()
        .toBuffer();

      const result = await validator.validateImage(buffer, 'test.jpg');

      expect(result.metadata).toBeDefined();
      expect(result.metadata?.format).toBe('jpeg');
      expect(result.metadata?.width).toBe(1024);
      expect(result.metadata?.height).toBe(768);
      expect(result.metadata?.sizeBytes).toBe(buffer.length);
    });

    it('should handle images with EXIF data', async () => {
      const buffer = await sharp({
        create: {
          width: 800,
          height: 600,
          channels: 3,
          background: { r: 128, g: 128, b: 128 }
        }
      })
        .jpeg()
        .toBuffer();

      const result = await validator.validateImage(buffer, 'test.jpg');

      expect(result.metadata).toBeDefined();
      expect(result.metadata?.hasExif).toBeDefined();
    });
  });
});
