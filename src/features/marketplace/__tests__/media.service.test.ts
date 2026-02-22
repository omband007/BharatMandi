/**
 * Unit Tests for Media Service
 * 
 * Tests all media service methods with various scenarios including:
 * - Upload flow (online and offline)
 * - Delete flow (online and offline)
 * - Reorder flow
 * - Set primary flow
 * - Error handling
 */

import { MediaService } from '../media.service';
import { DatabaseManager } from '../../../shared/database/db-abstraction';
import { StorageService } from '../storage.service';
import { ValidationService } from '../validation.service';
import { MAX_MEDIA_PER_LISTING } from '../media.constants';
import type { MediaUploadRequest, ListingMedia } from '../media.types';

describe('MediaService', () => {
  let mediaService: MediaService;
  let mockDbManager: jest.Mocked<DatabaseManager>;
  let mockStorageService: jest.Mocked<StorageService>;
  let mockValidationService: jest.Mocked<ValidationService>;
  let mockPgAdapter: any;
  let mockSqliteAdapter: any;

  beforeEach(() => {
    // Setup mock adapters
    mockPgAdapter = {
      getMediaCount: jest.fn(),
      getListingMedia: jest.fn(),
      createListingMedia: jest.fn(),
      getListing: jest.fn(),
      getMediaById: jest.fn(),
      deleteListingMedia: jest.fn(),
      setPrimaryMedia: jest.fn(),
      updateMediaOrder: jest.fn()
    };

    mockSqliteAdapter = {
      cacheListingMedia: jest.fn(),
      getCachedListingMedia: jest.fn(),
      deleteCachedMedia: jest.fn()
    };

    // Setup mock database manager
    mockDbManager = {
      getPostgreSQLAdapter: jest.fn().mockReturnValue(mockPgAdapter),
      getSQLiteAdapter: jest.fn().mockReturnValue(mockSqliteAdapter),
      isPostgreSQLConnected: jest.fn().mockReturnValue(true)
    } as any;

    // Setup mock storage service
    mockStorageService = {
      uploadFile: jest.fn().mockResolvedValue('https://storage.example.com/file.jpg'),
      generateThumbnail: jest.fn().mockResolvedValue(Buffer.from('thumbnail')),
      deleteFile: jest.fn().mockResolvedValue(true),
      generateStorageKey: jest.fn((listingId, mediaId, fileName) => `${listingId}/${mediaId}/${fileName}`),
      generateThumbnailKey: jest.fn((listingId, mediaId) => `${listingId}/${mediaId}/thumb.jpg`),
      generateSignedUrl: jest.fn().mockResolvedValue('https://signed-url.example.com/file.jpg')
    } as any;

    // Setup mock validation service
    mockValidationService = {
      validateMediaFile: jest.fn().mockReturnValue({ valid: true })
    } as any;

    mediaService = new MediaService(
      mockDbManager,
      mockStorageService,
      mockValidationService
    );
  });

  describe('uploadMedia', () => {
    const validRequest: MediaUploadRequest = {
      listingId: 'listing-1',
      file: Buffer.from('test-file'),
      mediaType: 'photo',
      fileName: 'test.jpg',
      mimeType: 'image/jpeg'
    };

    it('should successfully upload a photo', async () => {
      mockPgAdapter.getMediaCount.mockResolvedValue(0);
      mockPgAdapter.getListingMedia.mockResolvedValue([]);
      mockPgAdapter.createListingMedia.mockResolvedValue({
        id: 'media-1',
        listingId: 'listing-1',
        mediaType: 'photo',
        fileName: 'test.jpg',
        fileSize: 9,
        mimeType: 'image/jpeg',
        storageUrl: 'https://storage.example.com/file.jpg',
        thumbnailUrl: 'https://storage.example.com/thumb.jpg',
        displayOrder: 0,
        isPrimary: true,
        uploadedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = await mediaService.uploadMedia(validRequest);

      expect(result.success).toBe(true);
      expect(result.mediaId).toBe('media-1');
      expect(mockValidationService.validateMediaFile).toHaveBeenCalled();
      expect(mockStorageService.uploadFile).toHaveBeenCalled();
      expect(mockPgAdapter.createListingMedia).toHaveBeenCalled();
      expect(mockSqliteAdapter.cacheListingMedia).toHaveBeenCalled();
    });

    it('should reject invalid files', async () => {
      mockValidationService.validateMediaFile.mockReturnValue({
        valid: false,
        error: 'File too large'
      });

      const result = await mediaService.uploadMedia(validRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('File too large');
      expect(mockStorageService.uploadFile).not.toHaveBeenCalled();
    });

    it('should enforce media count limit', async () => {
      mockPgAdapter.getMediaCount.mockResolvedValue(MAX_MEDIA_PER_LISTING);

      const result = await mediaService.uploadMedia(validRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Maximum');
      expect(result.error).toContain('10');
      expect(mockStorageService.uploadFile).not.toHaveBeenCalled();
    });

    it('should set first photo as primary', async () => {
      mockPgAdapter.getMediaCount.mockResolvedValue(0);
      mockPgAdapter.getListingMedia.mockResolvedValue([]);
      mockPgAdapter.createListingMedia.mockImplementation(async (media: any) => ({
        ...media,
        id: 'media-1',
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      await mediaService.uploadMedia(validRequest);

      const createCall = mockPgAdapter.createListingMedia.mock.calls[0][0];
      expect(createCall.isPrimary).toBe(true);
    });

    it('should not set second photo as primary', async () => {
      mockPgAdapter.getMediaCount.mockResolvedValue(1);
      mockPgAdapter.getListingMedia.mockResolvedValue([
        {
          id: 'media-1',
          mediaType: 'photo',
          isPrimary: true
        } as ListingMedia
      ]);
      mockPgAdapter.createListingMedia.mockImplementation(async (media: any) => ({
        ...media,
        id: 'media-2',
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      await mediaService.uploadMedia(validRequest);

      const createCall = mockPgAdapter.createListingMedia.mock.calls[0][0];
      expect(createCall.isPrimary).toBe(false);
    });

    it('should generate thumbnail for photos', async () => {
      mockPgAdapter.getMediaCount.mockResolvedValue(0);
      mockPgAdapter.getListingMedia.mockResolvedValue([]);
      mockPgAdapter.createListingMedia.mockImplementation(async (media: any) => ({
        ...media,
        id: 'media-1',
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      await mediaService.uploadMedia(validRequest);

      expect(mockStorageService.generateThumbnail).toHaveBeenCalledWith(
        validRequest.file,
        'photo'
      );
    });

    it('should handle thumbnail generation failure gracefully', async () => {
      mockPgAdapter.getMediaCount.mockResolvedValue(0);
      mockPgAdapter.getListingMedia.mockResolvedValue([]);
      mockPgAdapter.createListingMedia.mockImplementation(async (media: any) => ({
        ...media,
        id: 'media-1',
        createdAt: new Date(),
        updatedAt: new Date()
      }));
      mockStorageService.generateThumbnail.mockRejectedValue(new Error('Thumbnail failed'));

      const result = await mediaService.uploadMedia(validRequest);

      // Should still succeed even if thumbnail fails
      expect(result.success).toBe(true);
    });
  });

  describe('getListingMedia', () => {
    const mockMedia: ListingMedia[] = [
      {
        id: 'media-1',
        listingId: 'listing-1',
        mediaType: 'photo',
        fileName: 'photo1.jpg',
        fileSize: 1000,
        mimeType: 'image/jpeg',
        storageUrl: 'https://storage.example.com/photo1.jpg',
        thumbnailUrl: 'https://storage.example.com/thumb1.jpg',
        displayOrder: 0,
        isPrimary: true,
        uploadedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'media-2',
        listingId: 'listing-1',
        mediaType: 'photo',
        fileName: 'photo2.jpg',
        fileSize: 2000,
        mimeType: 'image/jpeg',
        storageUrl: 'https://storage.example.com/photo2.jpg',
        displayOrder: 1,
        isPrimary: false,
        uploadedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    it('should retrieve media from PostgreSQL when online', async () => {
      mockPgAdapter.getListingMedia.mockResolvedValue(mockMedia);

      const result = await mediaService.getListingMedia('listing-1');

      expect(result).toHaveLength(2);
      expect(mockPgAdapter.getListingMedia).toHaveBeenCalledWith('listing-1');
      expect(mockStorageService.generateSignedUrl).toHaveBeenCalled();
    });

    it('should fallback to SQLite when PostgreSQL unavailable', async () => {
      mockDbManager.isPostgreSQLConnected.mockReturnValue(false);
      mockSqliteAdapter.getCachedListingMedia.mockResolvedValue(mockMedia);

      const result = await mediaService.getListingMedia('listing-1');

      expect(result).toHaveLength(2);
      expect(mockSqliteAdapter.getCachedListingMedia).toHaveBeenCalledWith('listing-1');
    });

    it('should generate signed URLs for all media', async () => {
      mockPgAdapter.getListingMedia.mockResolvedValue(mockMedia);

      await mediaService.getListingMedia('listing-1');

      // Should generate signed URLs for storage URLs and thumbnail URLs
      expect(mockStorageService.generateSignedUrl).toHaveBeenCalledTimes(3); // 2 storage + 1 thumbnail
    });
  });

  describe('deleteMedia', () => {
    const mockMedia: ListingMedia = {
      id: 'media-1',
      listingId: 'listing-1',
      mediaType: 'photo',
      fileName: 'photo.jpg',
      fileSize: 1000,
      mimeType: 'image/jpeg',
      storageUrl: 'https://storage.example.com/photo.jpg',
      thumbnailUrl: 'https://storage.example.com/thumb.jpg',
      displayOrder: 0,
      isPrimary: true,
      uploadedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should successfully delete media', async () => {
      mockPgAdapter.getMediaById.mockResolvedValue(mockMedia);
      mockPgAdapter.getListing.mockResolvedValue({ id: 'listing-1', farmerId: 'farmer-1' });
      mockPgAdapter.deleteListingMedia.mockResolvedValue(true);
      mockPgAdapter.getListingMedia.mockResolvedValue([]);

      const result = await mediaService.deleteMedia('listing-1', 'media-1', 'farmer-1');

      expect(result).toBe(true);
      expect(mockStorageService.deleteFile).toHaveBeenCalledWith(mockMedia.storageUrl);
      expect(mockStorageService.deleteFile).toHaveBeenCalledWith(mockMedia.thumbnailUrl);
      expect(mockPgAdapter.deleteListingMedia).toHaveBeenCalledWith('media-1');
      expect(mockSqliteAdapter.deleteCachedMedia).toHaveBeenCalledWith('media-1');
    });

    it('should reject unauthorized deletion', async () => {
      mockPgAdapter.getMediaById.mockResolvedValue(mockMedia);
      mockPgAdapter.getListing.mockResolvedValue({ id: 'listing-1', farmerId: 'farmer-1' });

      await expect(
        mediaService.deleteMedia('listing-1', 'media-1', 'farmer-2')
      ).rejects.toThrow('Unauthorized');
    });

    it('should reassign primary when deleting primary photo', async () => {
      const nextPhoto: ListingMedia = {
        ...mockMedia,
        id: 'media-2',
        isPrimary: false,
        displayOrder: 1
      };

      mockPgAdapter.getMediaById.mockResolvedValue(mockMedia);
      mockPgAdapter.getListing.mockResolvedValue({ id: 'listing-1', farmerId: 'farmer-1' });
      mockPgAdapter.deleteListingMedia.mockResolvedValue(true);
      mockPgAdapter.getListingMedia.mockResolvedValue([nextPhoto]);

      await mediaService.deleteMedia('listing-1', 'media-1', 'farmer-1');

      expect(mockPgAdapter.setPrimaryMedia).toHaveBeenCalledWith('listing-1', 'media-2');
    });

    it('should handle media not found', async () => {
      mockPgAdapter.getMediaById.mockResolvedValue(null);

      await expect(
        mediaService.deleteMedia('listing-1', 'media-1', 'farmer-1')
      ).rejects.toThrow('Media not found');
    });
  });

  describe('reorderMedia', () => {
    const mockMedia: ListingMedia[] = [
      {
        id: 'media-1',
        listingId: 'listing-1',
        mediaType: 'photo',
        displayOrder: 0
      } as ListingMedia,
      {
        id: 'media-2',
        listingId: 'listing-1',
        mediaType: 'photo',
        displayOrder: 1
      } as ListingMedia,
      {
        id: 'media-3',
        listingId: 'listing-1',
        mediaType: 'photo',
        displayOrder: 2
      } as ListingMedia
    ];

    it('should successfully reorder media', async () => {
      mockPgAdapter.getListing.mockResolvedValue({ id: 'listing-1', farmerId: 'farmer-1' });
      mockPgAdapter.getListingMedia.mockResolvedValue(mockMedia);
      mockPgAdapter.updateMediaOrder.mockResolvedValue(true);

      const newOrder = ['media-3', 'media-1', 'media-2'];
      const result = await mediaService.reorderMedia('listing-1', newOrder, 'farmer-1');

      expect(result).toBe(true);
      expect(mockPgAdapter.updateMediaOrder).toHaveBeenCalledWith('listing-1', [
        { mediaId: 'media-3', displayOrder: 0 },
        { mediaId: 'media-1', displayOrder: 1 },
        { mediaId: 'media-2', displayOrder: 2 }
      ]);
    });

    it('should reject unauthorized reorder', async () => {
      mockPgAdapter.getListing.mockResolvedValue({ id: 'listing-1', farmerId: 'farmer-1' });

      await expect(
        mediaService.reorderMedia('listing-1', ['media-1'], 'farmer-2')
      ).rejects.toThrow('Unauthorized');
    });

    it('should reject invalid media IDs', async () => {
      mockPgAdapter.getListing.mockResolvedValue({ id: 'listing-1', farmerId: 'farmer-1' });
      mockPgAdapter.getListingMedia.mockResolvedValue(mockMedia);

      await expect(
        mediaService.reorderMedia('listing-1', ['media-1', 'media-999'], 'farmer-1')
      ).rejects.toThrow('does not belong to listing');
    });
  });

  describe('setPrimaryMedia', () => {
    const mockPhoto: ListingMedia = {
      id: 'media-1',
      listingId: 'listing-1',
      mediaType: 'photo',
      fileName: 'photo.jpg',
      fileSize: 1000,
      mimeType: 'image/jpeg',
      storageUrl: 'https://storage.example.com/photo.jpg',
      displayOrder: 0,
      isPrimary: false,
      uploadedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should successfully set primary media', async () => {
      mockPgAdapter.getListing.mockResolvedValue({ id: 'listing-1', farmerId: 'farmer-1' });
      mockPgAdapter.getMediaById.mockResolvedValue(mockPhoto);
      mockPgAdapter.setPrimaryMedia.mockResolvedValue(true);
      mockPgAdapter.getListingMedia.mockResolvedValue([mockPhoto]);

      const result = await mediaService.setPrimaryMedia('listing-1', 'media-1', 'farmer-1');

      expect(result).toBe(true);
      expect(mockPgAdapter.setPrimaryMedia).toHaveBeenCalledWith('listing-1', 'media-1');
    });

    it('should reject unauthorized set primary', async () => {
      mockPgAdapter.getListing.mockResolvedValue({ id: 'listing-1', farmerId: 'farmer-1' });

      await expect(
        mediaService.setPrimaryMedia('listing-1', 'media-1', 'farmer-2')
      ).rejects.toThrow('Unauthorized');
    });

    it('should reject non-photo media as primary', async () => {
      const mockVideo: ListingMedia = {
        ...mockPhoto,
        mediaType: 'video'
      };

      mockPgAdapter.getListing.mockResolvedValue({ id: 'listing-1', farmerId: 'farmer-1' });
      mockPgAdapter.getMediaById.mockResolvedValue(mockVideo);

      await expect(
        mediaService.setPrimaryMedia('listing-1', 'media-1', 'farmer-1')
      ).rejects.toThrow('Only photos can be set as primary');
    });

    it('should handle media not found', async () => {
      mockPgAdapter.getListing.mockResolvedValue({ id: 'listing-1', farmerId: 'farmer-1' });
      mockPgAdapter.getMediaById.mockResolvedValue(null);

      await expect(
        mediaService.setPrimaryMedia('listing-1', 'media-1', 'farmer-1')
      ).rejects.toThrow('Media not found');
    });
  });
});
