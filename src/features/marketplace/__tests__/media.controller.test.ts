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

// Create test app
const app = express();
app.use(express.json());
app.use('/api/marketplace', mediaController);

describe('Media Controller - Integration Tests', () => {
  describe('POST /api/marketplace/listings/:listingId/media', () => {
    it('should upload a photo successfully', async () => {
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
        .expect(500); // Multer will reject before reaching controller

      // Multer error handling
    });
  });

  describe('GET /api/marketplace/listings/:listingId/media', () => {
    it('should get all media for a listing', async () => {
      const response = await request(app)
        .get('/api/marketplace/listings/listing-1/media')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.media)).toBe(true);
    });

    it('should return empty array for listing with no media', async () => {
      const response = await request(app)
        .get('/api/marketplace/listings/listing-empty/media')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.media).toEqual([]);
    });
  });

  describe('DELETE /api/marketplace/listings/:listingId/media/:mediaId', () => {
    it('should delete media successfully', async () => {
      // First upload a media
      const uploadResponse = await request(app)
        .post('/api/marketplace/listings/listing-1/media')
        .field('mediaType', 'photo')
        .attach('file', Buffer.from('fake-image-data'), 'test.jpg');

      const mediaId = uploadResponse.body.mediaId;

      // Then delete it
      const response = await request(app)
        .delete(`/api/marketplace/listings/listing-1/media/${mediaId}`)
        .send({ userId: 'farmer-1' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted successfully');
    });

    it('should return 404 for non-existent media', async () => {
      const response = await request(app)
        .delete('/api/marketplace/listings/listing-1/media/non-existent')
        .send({ userId: 'farmer-1' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });

    it('should return 403 for unauthorized deletion', async () => {
      // Upload media as farmer-1
      const uploadResponse = await request(app)
        .post('/api/marketplace/listings/listing-1/media')
        .field('mediaType', 'photo')
        .attach('file', Buffer.from('fake-image-data'), 'test.jpg');

      const mediaId = uploadResponse.body.mediaId;

      // Try to delete as different user
      const response = await request(app)
        .delete(`/api/marketplace/listings/listing-1/media/${mediaId}`)
        .send({ userId: 'farmer-2' })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Unauthorized');
    });
  });

  describe('PUT /api/marketplace/listings/:listingId/media/reorder', () => {
    it('should reorder media successfully', async () => {
      // Upload multiple media items
      const media1 = await request(app)
        .post('/api/marketplace/listings/listing-1/media')
        .field('mediaType', 'photo')
        .attach('file', Buffer.from('fake-image-1'), 'test1.jpg');

      const media2 = await request(app)
        .post('/api/marketplace/listings/listing-1/media')
        .field('mediaType', 'photo')
        .attach('file', Buffer.from('fake-image-2'), 'test2.jpg');

      const mediaOrder = [media2.body.mediaId, media1.body.mediaId];

      const response = await request(app)
        .put('/api/marketplace/listings/listing-1/media/reorder')
        .send({ mediaOrder, userId: 'farmer-1' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('reordered successfully');
    });

    it('should reject invalid mediaOrder format', async () => {
      const response = await request(app)
        .put('/api/marketplace/listings/listing-1/media/reorder')
        .send({ mediaOrder: 'not-an-array', userId: 'farmer-1' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('must be an array');
    });

    it('should return 403 for unauthorized reorder', async () => {
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
      // Upload a photo
      const uploadResponse = await request(app)
        .post('/api/marketplace/listings/listing-1/media')
        .field('mediaType', 'photo')
        .attach('file', Buffer.from('fake-image-data'), 'test.jpg');

      const mediaId = uploadResponse.body.mediaId;

      const response = await request(app)
        .put(`/api/marketplace/listings/listing-1/media/${mediaId}/primary`)
        .send({ userId: 'farmer-1' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Primary media set successfully');
    });

    it('should return 404 for non-existent media', async () => {
      const response = await request(app)
        .put('/api/marketplace/listings/listing-1/media/non-existent/primary')
        .send({ userId: 'farmer-1' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });

    it('should return 400 for non-photo media', async () => {
      // Upload a video
      const uploadResponse = await request(app)
        .post('/api/marketplace/listings/listing-1/media')
        .field('mediaType', 'video')
        .attach('file', Buffer.from('fake-video-data'), 'test.mp4');

      const mediaId = uploadResponse.body.mediaId;

      const response = await request(app)
        .put(`/api/marketplace/listings/listing-1/media/${mediaId}/primary`)
        .send({ userId: 'farmer-1' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Only photos');
    });

    it('should return 403 for unauthorized set primary', async () => {
      // Upload media as farmer-1
      const uploadResponse = await request(app)
        .post('/api/marketplace/listings/listing-1/media')
        .field('mediaType', 'photo')
        .attach('file', Buffer.from('fake-image-data'), 'test.jpg');

      const mediaId = uploadResponse.body.mediaId;

      // Try to set primary as different user
      const response = await request(app)
        .put(`/api/marketplace/listings/listing-1/media/${mediaId}/primary`)
        .send({ userId: 'farmer-2' })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Unauthorized');
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      // This test would require mocking the service to throw an error
      // For now, we'll test that 500 errors are handled properly
      
      // Try to upload with extremely large file (exceeds multer limit)
      const largeBuffer = Buffer.alloc(51 * 1024 * 1024); // 51MB
      
      const response = await request(app)
        .post('/api/marketplace/listings/listing-1/media')
        .field('mediaType', 'photo')
        .attach('file', largeBuffer, 'large.jpg')
        .expect(500);

      // Multer will reject this before reaching the controller
    });
  });
});
