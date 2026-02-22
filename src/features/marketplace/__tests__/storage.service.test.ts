// Unit tests for storage service

import { StorageService } from '../storage.service';
import * as fs from 'fs';
import * as path from 'path';

describe('StorageService', () => {
  let storageService: StorageService;
  const testDataPath = path.join(__dirname, '../../../data/media/test');

  beforeEach(() => {
    storageService = new StorageService();
    // Ensure test directory exists
    if (!fs.existsSync(testDataPath)) {
      fs.mkdirSync(testDataPath, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test files
    if (fs.existsSync(testDataPath)) {
      fs.rmSync(testDataPath, { recursive: true, force: true });
    }
  });

  describe('uploadToLocal', () => {
    it('should upload file to local storage', async () => {
      const testFile = Buffer.from('test file content');
      const filePath = 'test/test-file.txt';

      const result = await storageService.uploadToLocal(testFile, filePath);

      expect(result).toContain('test-file.txt');
      expect(storageService.fileExists(result)).toBe(true);
    });

    it('should create directories if they do not exist', async () => {
      const testFile = Buffer.from('test content');
      const filePath = 'test/nested/deep/file.txt';

      const result = await storageService.uploadToLocal(testFile, filePath);

      expect(storageService.fileExists(result)).toBe(true);
    });
  });

  describe('deleteFromLocal', () => {
    it('should delete file from local storage', async () => {
      const testFile = Buffer.from('test content');
      const filePath = 'test/delete-test.txt';

      const uploadPath = await storageService.uploadToLocal(testFile, filePath);
      expect(storageService.fileExists(uploadPath)).toBe(true);

      const deleted = await storageService.deleteFromLocal(filePath);

      expect(deleted).toBe(true);
      expect(storageService.fileExists(uploadPath)).toBe(false);
    });

    it('should return false when deleting non-existent file', async () => {
      const deleted = await storageService.deleteFromLocal('test/non-existent.txt');
      expect(deleted).toBe(false);
    });
  });

  describe('generateThumbnail', () => {
    it('should generate thumbnail for photo', async () => {
      // Create a simple 100x100 red image
      const sharp = require('sharp');
      const testImage = await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 3,
          background: { r: 255, g: 0, b: 0 }
        }
      })
        .jpeg()
        .toBuffer();

      const thumbnail = await storageService.generateThumbnail(testImage, 'photo');

      expect(thumbnail).toBeInstanceOf(Buffer);
      expect(thumbnail.length).toBeGreaterThan(0);

      // Verify thumbnail dimensions
      const metadata = await sharp(thumbnail).metadata();
      expect(metadata.width).toBe(200);
      expect(metadata.height).toBe(200);
    });

    it('should return empty buffer for video (not implemented)', async () => {
      const testVideo = Buffer.from('fake video data');
      const thumbnail = await storageService.generateThumbnail(testVideo, 'video');

      expect(thumbnail).toBeInstanceOf(Buffer);
      expect(thumbnail.length).toBe(0);
    });

    it('should return empty buffer for document', async () => {
      const testDoc = Buffer.from('fake pdf data');
      const thumbnail = await storageService.generateThumbnail(testDoc, 'document');

      expect(thumbnail).toBeInstanceOf(Buffer);
      expect(thumbnail.length).toBe(0);
    });
  });

  describe('compressImage', () => {
    it('should compress image', async () => {
      const sharp = require('sharp');
      const testImage = await sharp({
        create: {
          width: 500,
          height: 500,
          channels: 3,
          background: { r: 255, g: 255, b: 255 }
        }
      })
        .jpeg({ quality: 100 })
        .toBuffer();

      const compressed = await storageService.compressImage(testImage);

      expect(compressed).toBeInstanceOf(Buffer);
      expect(compressed.length).toBeLessThan(testImage.length);
    });
  });

  describe('generateStorageKey', () => {
    it('should generate correct storage key', () => {
      const key = storageService.generateStorageKey('listing-123', 'media-456', 'photo.jpg');
      expect(key).toBe('listings/listing-123/media/media-456.jpg');
    });

    it('should preserve file extension', () => {
      const key = storageService.generateStorageKey('listing-123', 'media-456', 'document.pdf');
      expect(key).toBe('listings/listing-123/media/media-456.pdf');
    });
  });

  describe('generateThumbnailKey', () => {
    it('should generate correct thumbnail key', () => {
      const key = storageService.generateThumbnailKey('listing-123', 'media-456');
      expect(key).toBe('listings/listing-123/thumbnails/media-456_thumb.jpg');
    });
  });

  describe('fileExists', () => {
    it('should return true for existing file', async () => {
      const testFile = Buffer.from('test');
      const filePath = 'test/exists.txt';
      const uploadPath = await storageService.uploadToLocal(testFile, filePath);

      expect(storageService.fileExists(uploadPath)).toBe(true);
    });

    it('should return false for non-existent file', () => {
      expect(storageService.fileExists('/non/existent/file.txt')).toBe(false);
    });
  });

  describe('getFileSize', () => {
    it('should return correct file size', async () => {
      const testContent = 'test file content';
      const testFile = Buffer.from(testContent);
      const filePath = 'test/size-test.txt';
      const uploadPath = await storageService.uploadToLocal(testFile, filePath);

      const size = storageService.getFileSize(uploadPath);
      expect(size).toBe(testContent.length);
    });

    it('should return 0 for non-existent file', () => {
      const size = storageService.getFileSize('/non/existent/file.txt');
      expect(size).toBe(0);
    });
  });
});
