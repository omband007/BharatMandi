/**
 * Integration Tests for Media Controller
 * 
 * Tests all API endpoints for media operations:
 * - Upload media endpoint
 * - Get media endpoint
 * - Delete media endpoint
 * - Reorder media endpoint
 * - Set primary endpoint
 */

import request from 'supertest';
import express from 'express';
import { mediaController } from '../media.controller';

// Mock the service modules
jest.mock('../media.service');
jest.mock('../storage.service');
jest.mock('../validation.service');

import { MediaService } from '../media.service';
import { StorageService } from '../storage.service';
import { ValidationService } from '../validation.service';

// Create mock service instances
const mockMediaService = {
  uploadMedia: jest.fn(),
  getListingMedia: jest.fn(),
  deleteMedia: jest.fn(),
  reorderMedia: jest.fn(),
  setPrimaryMedia: jest.fn()
};

const mockStorageService = {};
const mockValidationService = {};

// Configure service constructors to return mocks
(MediaService as jest.Mock).mockImplementation(() => mockMediaService);
(StorageService as jest.Mock).mockImplementation(() => mockStorageService);
(ValidationService as jest.Mock).mockImplementation(() => mockValidationService);

// Create mock DatabaseManager
const mockDbManager = {
  getConnection: jest.fn(),
  query: jest.fn(),
  transaction: jest.fn()
};

// Create test app
const app = express();
app.use(express.json());
app.use('/api/marketplace', mediaController);

describe('Media Controller - Integration Tests', () => {
  beforeAll(() => {
    // Set up global DatabaseManager for controller
    (global as any).sharedDbManager = mockDbManager;
  });

  beforeEach(() => {
    // Clear all mocks between tests
    jest.clearAllMocks();
  });

  afterAll(() => {
    // Clean up global DatabaseManager
    delete (global as any).sharedDbManager;
  });
  describe('POST /api/marketplace/listings/:listingId/media', () => {
    it('should upload a photo successfully', async () => {
      // Configure mock to return success response
      mockMediaService.uploadMedia.mockResolvedValue({
        success: true,
        mediaId: 'mock-media-id'
      });

      const response = await request(app)
        .post('/api/marketplace/listings/listing-1/media')
        .field('mediaType', 'photo')
        .attach('file', Buffer.from('fake-image-data'), 'test.jpg')
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.mediaId).toBeDefined();
    });

    it('should reject upload without file', async () => {
      const response = await request(app)
        .post('/api/marketplace/listings/listing-1/media')
        .field('mediaType', 'photo')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('No file uploaded');
    });

    it('should reject upload with invalid media type', async () => {
      const response = await request(app)
        .post('/api/marketplace/listings/listing-1/media')
        .field('mediaType', 'invalid')
        .attach('file', Buffer.from('fake-image-data'), 'test.jpg')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid media type');
    });

    it('should reject upload with invalid file type', async () => {
      const response = await request(app)
        .post('/api/marketplace/listings/listing-1/media')
        .field('mediaType', 'photo')
        .attach('file', Buffer.from('fake-data'), 'test.txt')
        .expect(400); // Multer rejects with 400 for invalid file type

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid file type');
    });
  });

  describe('GET /api/marketplace/listings/:listingId/media', () => {
    it('should get all media for a listing', async () => {
      // Configure mock to return array of media objects
      mockMediaService.getListingMedia.mockResolvedValue([
        {
          mediaId: 'media-1',
          listingId: 'listing-1',
          mediaType: 'photo',
          url: 'https://example.com/media-1.jpg',
          displayOrder: 1,
          isPrimary: true
        },
        {
          mediaId: 'media-2',
          listingId: 'listing-1',
          mediaType: 'photo',
          url: 'https://example.com/media-2.jpg',
          displayOrder: 2,
          isPrimary: false
        }
      ]);

      const response = await request(app)
        .get('/api/marketplace/listings/listing-1/media')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.media)).toBe(true);
      expect(response.body.media.length).toBe(2);
    });

    it('should return empty array for listing with no media', async () => {
      // Configure mock to return empty array
      mockMediaService.getListingMedia.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/marketplace/listings/listing-empty/media')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.media).toEqual([]);
    });
  });

  describe('DELETE /api/marketplace/listings/:listingId/media/:mediaId', () => {
    it('should delete media successfully', async () => {
      // Configure mock to return success
      mockMediaService.deleteMedia.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/marketplace/listings/listing-1/media/media-1')
        .send({ userId: 'farmer-1' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted successfully');
    });

    it('should return 404 for non-existent media', async () => {
      // Configure mock to throw error with "not found" message
      mockMediaService.deleteMedia.mockRejectedValue(new Error('Media not found'));

      const response = await request(app)
        .delete('/api/marketplace/listings/listing-1/media/non-existent')
        .send({ userId: 'farmer-1' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });

    it('should return 403 for unauthorized deletion', async () => {
      // Configure mock to throw error with "Unauthorized" message
      mockMediaService.deleteMedia.mockRejectedValue(new Error('Unauthorized: You do not own this listing'));

      const response = await request(app)
        .delete('/api/marketplace/listings/listing-1/media/media-1')
        .send({ userId: 'farmer-2' })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Unauthorized');
    });
  });

  describe('PUT /api/marketplace/listings/:listingId/media/reorder', () => {
    it('should reorder media successfully', async () => {
      // Configure mock to return success
      mockMediaService.reorderMedia.mockResolvedValue(true);

      const mediaOrder = ['media-2', 'media-1'];

      const response = await request(app)
        .put('/api/marketplace/listings/listing-1/media/reorder')
        .send({ mediaOrder, userId: 'farmer-1' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('reordered successfully');
    });

    it('should reject invalid mediaOrder format', async () => {
      // Controller validation catches this - no mock needed
      const response = await request(app)
        .put('/api/marketplace/listings/listing-1/media/reorder')
        .send({ mediaOrder: 'not-an-array', userId: 'farmer-1' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('must be an array');
    });

    it('should return 403 for unauthorized reorder', async () => {
      // Configure mock to throw error with "Unauthorized" message
      mockMediaService.reorderMedia.mockRejectedValue(new Error('Unauthorized: You do not own this listing'));

      const response = await request(app)
        .put('/api/marketplace/listings/listing-1/media/reorder')
        .send({ mediaOrder: ['media-1'], userId: 'farmer-2' })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Unauthorized');
    });
  });

  describe('PUT /api/marketplace/listings/:listingId/media/:mediaId/primary', () => {
    it('should set primary media successfully', async () => {
      // Configure mock to return success
      mockMediaService.setPrimaryMedia.mockResolvedValue(true);

      const response = await request(app)
        .put('/api/marketplace/listings/listing-1/media/media-1/primary')
        .send({ userId: 'farmer-1' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Primary media set successfully');
    });

    it('should return 404 for non-existent media', async () => {
      // Configure mock to throw error with "not found" message
      mockMediaService.setPrimaryMedia.mockRejectedValue(new Error('Media not found'));

      const response = await request(app)
        .put('/api/marketplace/listings/listing-1/media/non-existent/primary')
        .send({ userId: 'farmer-1' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });

    it('should return 400 for non-photo media', async () => {
      // Configure mock to throw error with "Only photos" message
      mockMediaService.setPrimaryMedia.mockRejectedValue(new Error('Only photos can be set as primary'));

      const response = await request(app)
        .put('/api/marketplace/listings/listing-1/media/media-video/primary')
        .send({ userId: 'farmer-1' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Only photos');
    });

    it('should return 403 for unauthorized set primary', async () => {
      // Configure mock to throw error with "Unauthorized" message
      mockMediaService.setPrimaryMedia.mockRejectedValue(new Error('Unauthorized: You do not own this listing'));

      const response = await request(app)
        .put('/api/marketplace/listings/listing-1/media/media-1/primary')
        .send({ userId: 'farmer-2' })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Unauthorized');
    });
  });

  describe('Error Handling', () => {
    it('should handle file size limit errors', async () => {
      // Try to upload with extremely large file (exceeds multer limit)
      const largeBuffer = Buffer.alloc(51 * 1024 * 1024); // 51MB
      
      const response = await request(app)
        .post('/api/marketplace/listings/listing-1/media')
        .field('mediaType', 'photo')
        .attach('file', largeBuffer, 'large.jpg')
        .expect(400); // Multer rejects with 400 for file size limit

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('File too large');
    });
  });
});
