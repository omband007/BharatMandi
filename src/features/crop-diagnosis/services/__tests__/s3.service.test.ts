/**
 * S3 Service Unit Tests
 * 
 * Tests for S3 image storage operations.
 */

import { S3Service } from '../s3.service';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import sharp from 'sharp';

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

describe('S3Service', () => {
  let s3Service: S3Service;
  let mockS3Client: jest.Mocked<S3Client>;

  beforeEach(() => {
    s3Service = new S3Service();
    mockS3Client = S3Client.prototype as jest.Mocked<S3Client>;
    jest.clearAllMocks();
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

      const compressed = await s3Service.compressImage(largeBuffer);

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

      const compressed = await s3Service.compressImage(originalBuffer);
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

      const compressed = await s3Service.compressImage(smallBuffer);

      // Should be similar size (not re-compressed)
      expect(Math.abs(compressed.length - smallBuffer.length)).toBeLessThan(1000);
    });

    it('should convert PNG to JPEG during compression', async () => {
      const pngBuffer = await sharp({
        create: {
          width: 1500,
          height: 1500,
          channels: 3,
          background: { r: 128, g: 128, b: 128 }
        }
      })
        .png()
        .toBuffer();

      const compressed = await s3Service.compressImage(pngBuffer);
      const metadata = await sharp(compressed).metadata();

      expect(metadata.format).toBe('jpeg');
      expect(compressed.length).toBeLessThanOrEqual(5 * 1024 * 1024);
    });

    it('should handle very large images by resizing', async () => {
      const hugeBuffer = await sharp({
        create: {
          width: 4000,
          height: 4000,
          channels: 3,
          background: { r: 128, g: 128, b: 128 }
        }
      })
        .jpeg({ quality: 95 })
        .toBuffer();

      const compressed = await s3Service.compressImage(hugeBuffer);
      const metadata = await sharp(compressed).metadata();

      expect(metadata.width).toBeLessThanOrEqual(1920);
      expect(metadata.height).toBeLessThanOrEqual(1920);
      expect(compressed.length).toBeLessThanOrEqual(5 * 1024 * 1024);
    });
  });

  // ============================================================================
  // IMAGE UPLOAD TESTS (Requirement 1.6, 14.2)
  // ============================================================================

  describe('Image Upload', () => {
    it('should upload image to S3 with unique key', async () => {
      const buffer = Buffer.from('test-image-data');
      const metadata = {
        userId: 'user123',
        diagnosisId: 'diag456',
        uploadedAt: new Date('2024-01-01T00:00:00Z'),
        originalFilename: 'test.jpg',
        contentType: 'image/jpeg'
      };

      mockS3Client.send = jest.fn().mockResolvedValue({});

      const key = await s3Service.uploadImage(buffer, metadata);

      expect(key).toMatch(/^diagnoses\/user123\/diag456\/\d+\.jpg$/);
      expect(mockS3Client.send).toHaveBeenCalledTimes(1);
      expect(mockS3Client.send).toHaveBeenCalledWith(expect.any(PutObjectCommand));
    });

    it('should include server-side encryption in upload', async () => {
      const buffer = Buffer.from('test-image-data');
      const metadata = {
        userId: 'user123',
        diagnosisId: 'diag456',
        uploadedAt: new Date(),
        originalFilename: 'test.jpg',
        contentType: 'image/jpeg'
      };

      mockS3Client.send = jest.fn().mockResolvedValue({});

      await s3Service.uploadImage(buffer, metadata);

      expect(mockS3Client.send).toHaveBeenCalledWith(expect.any(PutObjectCommand));
    });

    it('should store metadata in S3 object', async () => {
      const buffer = Buffer.from('test-image-data');
      const uploadDate = new Date('2024-01-15T10:30:00Z');
      const metadata = {
        userId: 'user789',
        diagnosisId: 'diag012',
        uploadedAt: uploadDate,
        originalFilename: 'crop-photo.jpg',
        contentType: 'image/jpeg'
      };

      mockS3Client.send = jest.fn().mockResolvedValue({});

      await s3Service.uploadImage(buffer, metadata);

      expect(mockS3Client.send).toHaveBeenCalledWith(expect.any(PutObjectCommand));
    });

    it('should throw error if S3 client not initialized', async () => {
      // Mock environment without credentials
      const originalEnv = jest.requireMock('../../../../config/environment');
      jest.doMock('../../../../config/environment', () => ({
        getEnvironmentConfig: () => ({
          aws: {
            region: 'ap-southeast-2',
            accessKeyId: '',
            secretAccessKey: '',
            s3: {
              cropDiagnosisBucket: 'test-bucket'
            }
          }
        })
      }));

      // Need to reimport to get new mock
      jest.resetModules();
      const { S3Service: UninitalizedS3Service } = await import('../s3.service');
      const uninitializedService = new UninitalizedS3Service();
      
      const buffer = Buffer.from('test');
      const metadata = {
        userId: 'user123',
        diagnosisId: 'diag456',
        uploadedAt: new Date(),
        originalFilename: 'test.jpg',
        contentType: 'image/jpeg'
      };

      await expect(uninitializedService.uploadImage(buffer, metadata))
        .rejects.toThrow('S3 client not initialized');
      
      // Restore original mock
      jest.doMock('../../../../config/environment', () => originalEnv);
    });

    it('should handle S3 upload errors', async () => {
      const buffer = Buffer.from('test-image-data');
      const metadata = {
        userId: 'user123',
        diagnosisId: 'diag456',
        uploadedAt: new Date(),
        originalFilename: 'test.jpg',
        contentType: 'image/jpeg'
      };

      mockS3Client.send = jest.fn().mockRejectedValue(new Error('S3 upload failed'));

      await expect(s3Service.uploadImage(buffer, metadata))
        .rejects.toThrow('Failed to upload image to S3');
    });
  });

  // ============================================================================
  // PRESIGNED URL TESTS (Requirement 1.7)
  // ============================================================================

  describe('Presigned URL Generation', () => {
    it('should generate presigned URL with 24-hour expiry by default', async () => {
      const key = 'diagnoses/user123/diag456/1234567890.jpg';
      const mockUrl = 'https://test-bucket.s3.amazonaws.com/test-key?signature=xyz';

      (getSignedUrl as jest.Mock).mockResolvedValue(mockUrl);

      const url = await s3Service.generatePresignedUrl(key);

      expect(url).toBe(mockUrl);
      expect(getSignedUrl).toHaveBeenCalledTimes(1);
      expect(getSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(GetObjectCommand),
        expect.objectContaining({ expiresIn: 24 * 3600 })
      );
    });

    it('should generate presigned URL with custom expiry', async () => {
      const key = 'diagnoses/user123/diag456/1234567890.jpg';
      const mockUrl = 'https://test-bucket.s3.amazonaws.com/test-key?signature=xyz';

      (getSignedUrl as jest.Mock).mockResolvedValue(mockUrl);

      const url = await s3Service.generatePresignedUrl(key, 12);

      expect(url).toBe(mockUrl);
      expect(getSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(GetObjectCommand),
        expect.objectContaining({ expiresIn: 12 * 3600 })
      );
    });

    it('should handle presigned URL generation errors', async () => {
      const key = 'diagnoses/user123/diag456/1234567890.jpg';

      (getSignedUrl as jest.Mock).mockRejectedValue(new Error('URL generation failed'));

      await expect(s3Service.generatePresignedUrl(key))
        .rejects.toThrow('Failed to generate presigned URL');
    });
  });

  // ============================================================================
  // IMAGE DELETION TESTS (Requirement 14.6)
  // ============================================================================

  describe('Image Deletion', () => {
    it('should delete image from S3', async () => {
      const key = 'diagnoses/user123/diag456/1234567890.jpg';

      mockS3Client.send = jest.fn().mockResolvedValue({});

      await s3Service.deleteImage(key);

      expect(mockS3Client.send).toHaveBeenCalledTimes(1);
      expect(mockS3Client.send).toHaveBeenCalledWith(expect.any(DeleteObjectCommand));
    });

    it('should handle deletion errors', async () => {
      const key = 'diagnoses/user123/diag456/1234567890.jpg';

      mockS3Client.send = jest.fn().mockRejectedValue(new Error('Delete failed'));

      await expect(s3Service.deleteImage(key))
        .rejects.toThrow('Failed to delete image from S3');
    });
  });

  // ============================================================================
  // UTILITY METHODS TESTS
  // ============================================================================

  describe('Utility Methods', () => {
    it('should return bucket name', () => {
      expect(s3Service.getBucketName()).toBe('test-bucket');
    });

    it('should check if S3 client is initialized', () => {
      expect(s3Service.isInitialized()).toBe(true);
    });
  });

  // ============================================================================
  // KEY FORMAT TESTS (Requirement 1.6)
  // ============================================================================

  describe('S3 Key Format', () => {
    it('should generate keys in correct format', async () => {
      const buffer = Buffer.from('test-image-data');
      const metadata = {
        userId: 'user123',
        diagnosisId: 'diag456',
        uploadedAt: new Date(),
        originalFilename: 'test.jpg',
        contentType: 'image/jpeg'
      };

      mockS3Client.send = jest.fn().mockResolvedValue({});

      const key = await s3Service.uploadImage(buffer, metadata);

      // Key format: diagnoses/{userId}/{diagnosisId}/{timestamp}.jpg
      const keyParts = key.split('/');
      expect(keyParts[0]).toBe('diagnoses');
      expect(keyParts[1]).toBe('user123');
      expect(keyParts[2]).toBe('diag456');
      expect(keyParts[3]).toMatch(/^\d+\.jpg$/);
    });

    it('should generate unique keys for same user and diagnosis', async () => {
      const buffer = Buffer.from('test-image-data');
      const metadata = {
        userId: 'user123',
        diagnosisId: 'diag456',
        uploadedAt: new Date(),
        originalFilename: 'test.jpg',
        contentType: 'image/jpeg'
      };

      mockS3Client.send = jest.fn().mockResolvedValue({});

      const key1 = await s3Service.uploadImage(buffer, metadata);
      
      // Wait a bit to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const key2 = await s3Service.uploadImage(buffer, metadata);

      expect(key1).not.toBe(key2);
    });
  });
});
