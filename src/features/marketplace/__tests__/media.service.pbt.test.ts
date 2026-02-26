/**
 * Property-Based Tests for Media Service
 * 
 * Uses fast-check for property-based testing to verify correctness properties
 * across a wide range of inputs.
 */

import * as fc from 'fast-check';
import { MediaService } from '../media.service';
import { DatabaseManager } from '../../../shared/database/db-abstraction';
import { StorageService } from '../storage.service';
import { ValidationService } from '../validation.service';
import { MAX_MEDIA_PER_LISTING } from '../media.constants';
import type { MediaUploadRequest, ListingMedia } from '../media.types';

// Mock implementations for testing
class MockDatabaseManager {
  private mediaStore: Map<string, ListingMedia[]> = new Map();
  
  getPostgreSQLAdapter() {
    return {
      getMediaCount: async (listingId: string) => {
        return this.mediaStore.get(listingId)?.length || 0;
      },
      getListingMedia: async (listingId: string) => {
        return this.mediaStore.get(listingId) || [];
      },
      createListingMedia: async (media: any) => {
        const listingId = media.listingId;
        const existing = this.mediaStore.get(listingId) || [];
        const newMedia = {
          ...media,
          id: `media-${Date.now()}-${Math.random()}`,
          uploadedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        };
        this.mediaStore.set(listingId, [...existing, newMedia]);
        return newMedia;
      },
      getListing: async (listingId: string) => {
        return { id: listingId, farmerId: 'farmer-1' };
      },
      getMediaById: async (mediaId: string) => {
        for (const media of this.mediaStore.values()) {
          const found = media.find(m => m.id === mediaId);
          if (found) return found;
        }
        return null;
      },
      deleteListingMedia: async (mediaId: string) => {
        for (const [listingId, media] of this.mediaStore.entries()) {
          const filtered = media.filter(m => m.id !== mediaId);
          if (filtered.length !== media.length) {
            this.mediaStore.set(listingId, filtered);
            return true;
          }
        }
        return false;
      },
      setPrimaryMedia: async (listingId: string, mediaId: string) => {
        const media = this.mediaStore.get(listingId) || [];
        const updated = media.map(m => ({
          ...m,
          isPrimary: m.id === mediaId
        }));
        this.mediaStore.set(listingId, updated);
        return true;
      }
    };
  }
  
  getSQLiteAdapter() {
    return {
      cacheListingMedia: async () => {},
      deleteCachedMedia: async () => true,
      getCachedListingMedia: async (listingId: string) => {
        return this.mediaStore.get(listingId) || [];
      }
    };
  }
  
  isPostgreSQLConnected() {
    return true;
  }
  
  reset() {
    this.mediaStore.clear();
  }
}

class MockStorageService {
  async uploadFile() {
    return 'https://storage.example.com/file.jpg';
  }
  
  async generateThumbnail() {
    return Buffer.from('thumbnail');
  }
  
  async deleteFile() {
    return true;
  }
  
  generateStorageKey(listingId: string, mediaId: string, fileName: string) {
    return `${listingId}/${mediaId}/${fileName}`;
  }
  
  generateThumbnailKey(listingId: string, mediaId: string) {
    return `${listingId}/${mediaId}/thumb.jpg`;
  }
  
  async generateSignedUrl(url: string) {
    return `${url}?signed=true`;
  }
}

class MockValidationService {
  validateMediaFile() {
    return { valid: true };
  }
}

describe('Media Service - Property-Based Tests', () => {
  let mediaService: MediaService;
  let mockDbManager: MockDatabaseManager;
  
  beforeEach(() => {
    mockDbManager = new MockDatabaseManager();
    const mockStorageService = new MockStorageService() as any;
    const mockValidationService = new MockValidationService() as any;
    
    mediaService = new MediaService(
      mockDbManager as any,
      mockStorageService,
      mockValidationService
    );
  });
  
  afterEach(() => {
    mockDbManager.reset();
  });

  /**
   * Property 3: Media Count Limit
   * 
   * **Validates: Requirements 1.8, 2.4**
   * 
   * Property: Listings cannot exceed MAX_MEDIA_PER_LISTING (10) media items
   * 
   * For all sequences of upload attempts:
   * - The first 10 uploads should succeed
   * - The 11th upload should be rejected with a clear error message
   * - The media count should never exceed 10
   */
  describe('Property 3: Media Count Limit', () => {
    it('should enforce maximum media count per listing', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 11, max: 20 }), // Try to upload 11-20 items
          async (attemptCount) => {
            // Reset mock for each property test run
            mockDbManager.reset();
            
            const listingId = `listing-${Date.now()}-${Math.random()}`;
            const results: boolean[] = [];
            
            // Attempt to upload attemptCount media items
            for (let i = 0; i < attemptCount; i++) {
              const request: MediaUploadRequest = {
                listingId,
                file: Buffer.from(`file-${i}`),
                mediaType: 'photo',
                fileName: `photo-${i}.jpg`,
                mimeType: 'image/jpeg'
              };
              
              const response = await mediaService.uploadMedia(request);
              results.push(response.success);
            }
            
            // First 10 should succeed
            const successCount = results.filter(r => r).length;
            expect(successCount).toBe(MAX_MEDIA_PER_LISTING);
            
            // 11th and beyond should fail
            const failureCount = results.filter(r => !r).length;
            expect(failureCount).toBe(attemptCount - MAX_MEDIA_PER_LISTING);
            
            // Verify final count
            const pgAdapter = mockDbManager.getPostgreSQLAdapter();
            const finalCount = await pgAdapter.getMediaCount(listingId);
            expect(finalCount).toBe(MAX_MEDIA_PER_LISTING);
            
            return true;
          }
        ),
        { numRuns: 10 }
      );
    });
    
    it('should return clear error message when limit exceeded', async () => {
      const listingId = 'listing-limit-test';
      
      // Upload exactly MAX_MEDIA_PER_LISTING items
      for (let i = 0; i < MAX_MEDIA_PER_LISTING; i++) {
        const request: MediaUploadRequest = {
          listingId,
          file: Buffer.from(`file-${i}`),
          mediaType: 'photo',
          fileName: `photo-${i}.jpg`,
          mimeType: 'image/jpeg'
        };
        
        const response = await mediaService.uploadMedia(request);
        expect(response.success).toBe(true);
      }
      
      // 11th upload should fail with clear error
      const request: MediaUploadRequest = {
        listingId,
        file: Buffer.from('file-11'),
        mediaType: 'photo',
        fileName: 'photo-11.jpg',
        mimeType: 'image/jpeg'
      };
      
      const response = await mediaService.uploadMedia(request);
      expect(response.success).toBe(false);
      expect(response.error).toContain('Maximum');
      expect(response.error).toContain('10');
      expect(response.error).toContain('exceeded');
    });
    
    it('should maintain count limit across different media types', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.constantFrom('photo', 'video', 'document'), { 
            minLength: 11, 
            maxLength: 15 
          }),
          async (mediaTypes) => {
            // Reset mock for each property test run
            mockDbManager.reset();
            
            const listingId = `listing-${Date.now()}-${Math.random()}`;
            let successCount = 0;
            
            for (let i = 0; i < mediaTypes.length; i++) {
              const request: MediaUploadRequest = {
                listingId,
                file: Buffer.from(`file-${i}`),
                mediaType: mediaTypes[i],
                fileName: `file-${i}.jpg`,
                mimeType: 'image/jpeg'
              };
              
              const response = await mediaService.uploadMedia(request);
              if (response.success) successCount++;
            }
            
            // Should only succeed for first 10, regardless of type
            expect(successCount).toBe(MAX_MEDIA_PER_LISTING);
            
            return true;
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  /**
   * Property 4: Primary Media Reassignment on Delete
   * 
   * **Validates: Requirements 3.5, 3.6**
   * 
   * Property: When primary photo is deleted, the next photo becomes primary
   * 
   * For all listings with multiple photos:
   * - Deleting the primary photo should set the next photo as primary
   * - Deleting the last photo should set primary to null
   * - Only one photo can be primary at any time
   */
  describe('Property 4: Primary Media Reassignment on Delete', () => {
    it('should set next photo as primary when primary is deleted', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2, max: 5 }), // Number of photos
          async (photoCount) => {
            // Reset mock for each property test run
            mockDbManager.reset();
            
            const listingId = `listing-${Date.now()}-${Math.random()}`;
            const mediaIds: string[] = [];
            
            // Upload multiple photos
            for (let i = 0; i < photoCount; i++) {
              const request: MediaUploadRequest = {
                listingId,
                file: Buffer.from(`photo-${i}`),
                mediaType: 'photo',
                fileName: `photo-${i}.jpg`,
                mimeType: 'image/jpeg'
              };
              
              const response = await mediaService.uploadMedia(request);
              expect(response.success).toBe(true);
              mediaIds.push(response.mediaId);
            }
            
            // Get initial state
            const pgAdapter = mockDbManager.getPostgreSQLAdapter();
            const initialMedia = await pgAdapter.getListingMedia(listingId);
            const initialPrimary = initialMedia.find((m: ListingMedia) => m.isPrimary);
            
            expect(initialPrimary).toBeDefined();
            // First photo should be primary (check by display order, not ID)
            expect(initialPrimary?.displayOrder).toBe(0);
            
            // Delete the primary photo
            await mediaService.deleteMedia(listingId, initialPrimary!.id, 'farmer-1');
            
            // Check that next photo became primary
            const afterDeleteMedia = await pgAdapter.getListingMedia(listingId);
            const newPrimary = afterDeleteMedia.find((m: ListingMedia) => m.isPrimary);
            
            if (photoCount > 1) {
              // Should have a new primary
              expect(newPrimary).toBeDefined();
              expect(newPrimary?.id).not.toBe(initialPrimary?.id);
              
              // Only one primary
              const primaryCount = afterDeleteMedia.filter((m: ListingMedia) => m.isPrimary).length;
              expect(primaryCount).toBe(1);
            }
            
            return true;
          }
        ),
        { numRuns: 10 }
      );
    });
    
    it('should handle deleting last photo correctly', async () => {
      const listingId = 'listing-last-photo';
      
      // Upload single photo
      const request: MediaUploadRequest = {
        listingId,
        file: Buffer.from('photo'),
        mediaType: 'photo',
        fileName: 'photo.jpg',
        mimeType: 'image/jpeg'
      };
      
      const response = await mediaService.uploadMedia(request);
      expect(response.success).toBe(true);
      
      // Verify it's primary
      const pgAdapter = mockDbManager.getPostgreSQLAdapter();
      const media = await pgAdapter.getListingMedia(listingId);
      expect(media.length).toBe(1);
      expect(media[0].isPrimary).toBe(true);
      
      // Delete the photo
      await mediaService.deleteMedia(listingId, response.mediaId, 'farmer-1');
      
      // Should have no media left
      const afterDelete = await pgAdapter.getListingMedia(listingId);
      expect(afterDelete.length).toBe(0);
    });
    
    it('should maintain primary uniqueness after deletions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 3, max: 7 }), // Start with 3-7 photos
          fc.integer({ min: 1, max: 2 }), // Delete 1-2 photos (reduced from 3 to avoid deleting all)
          async (initialCount, deleteCount) => {
            // Reset mock for each property test run
            mockDbManager.reset();
            
            const listingId = `listing-${Date.now()}-${Math.random()}`;
            const mediaIds: string[] = [];
            
            // Upload photos
            for (let i = 0; i < initialCount; i++) {
              const request: MediaUploadRequest = {
                listingId,
                file: Buffer.from(`photo-${i}`),
                mediaType: 'photo',
                fileName: `photo-${i}.jpg`,
                mimeType: 'image/jpeg'
              };
              
              const response = await mediaService.uploadMedia(request);
              mediaIds.push(response.mediaId);
            }
            
            // Delete some photos (including potentially the primary)
            // Ensure we keep at least one photo
            const toDelete = Math.min(deleteCount, initialCount - 1);
            for (let i = 0; i < toDelete; i++) {
              await mediaService.deleteMedia(listingId, mediaIds[i], 'farmer-1');
            }
            
            // Verify exactly one primary remains
            const pgAdapter = mockDbManager.getPostgreSQLAdapter();
            const remainingMedia = await pgAdapter.getListingMedia(listingId);
            
            if (remainingMedia.length > 0) {
              const primaryCount = remainingMedia.filter((m: ListingMedia) => m.isPrimary).length;
              expect(primaryCount).toBe(1);
            }
            
            return true;
          }
        ),
        { numRuns: 10 }
      );
    });
    
    it('should not set videos or documents as primary', async () => {
      const listingId = 'listing-non-photo-primary';
      
      // Upload video first
      const videoRequest: MediaUploadRequest = {
        listingId,
        file: Buffer.from('video'),
        mediaType: 'video',
        fileName: 'video.mp4',
        mimeType: 'video/mp4'
      };
      
      const videoResponse = await mediaService.uploadMedia(videoRequest);
      expect(videoResponse.success).toBe(true);
      
      // Upload photo
      const photoRequest: MediaUploadRequest = {
        listingId,
        file: Buffer.from('photo'),
        mediaType: 'photo',
        fileName: 'photo.jpg',
        mimeType: 'image/jpeg'
      };
      
      const photoResponse = await mediaService.uploadMedia(photoRequest);
      expect(photoResponse.success).toBe(true);
      
      // Verify only photo is primary
      const pgAdapter = mockDbManager.getPostgreSQLAdapter();
      const media = await pgAdapter.getListingMedia(listingId);
      
      const videoMedia = media.find((m: ListingMedia) => m.id === videoResponse.mediaId);
      const photoMedia = media.find((m: ListingMedia) => m.id === photoResponse.mediaId);
      
      expect(videoMedia?.isPrimary).toBe(false);
      expect(photoMedia?.isPrimary).toBe(true);
    });
  });

  /**
   * Property 2: Preservation - Existing Test Behavior
   * 
   * **Validates: Requirements 3.1, 3.2, 3.3**
   * 
   * Property: All tests that do NOT involve authorization checks or thumbnail generation failures
   * should produce exactly the same results as before the fix, preserving all existing test coverage.
   * 
   * This property verifies that:
   * - Upload tests without thumbnail failures continue to pass
   * - GetListingMedia tests continue to pass
   * - File validation tests continue to pass
   * - Media count limit tests continue to pass
   */
  describe('Property 2: Preservation - Existing Test Behavior', () => {
    it('should preserve upload behavior for valid files', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            fileName: fc.string({ minLength: 1, maxLength: 50 }).map(s => `${s}.jpg`),
            mediaType: fc.constantFrom('photo', 'video', 'document'),
            fileSize: fc.integer({ min: 1, max: 10000 })
          }),
          async ({ fileName, mediaType, fileSize }) => {
            const listingId = `listing-${Date.now()}-${Math.random()}`;
            const request: MediaUploadRequest = {
              listingId,
              file: Buffer.alloc(fileSize),
              mediaType,
              fileName,
              mimeType: 'image/jpeg'
            };
            
            const result = await mediaService.uploadMedia(request);
            
            // Upload should succeed for valid files
            expect(result.success).toBe(true);
            expect(result.mediaId).toBeDefined();
            
            // Verify media was stored
            const pgAdapter = mockDbManager.getPostgreSQLAdapter();
            const media = await pgAdapter.getListingMedia(listingId);
            expect(media.length).toBe(1);
            expect(media[0].fileName).toBe(fileName);
            expect(media[0].mediaType).toBe(mediaType);
            
            return true;
          }
        ),
        { numRuns: 20 }
      );
    });
    
    it('should preserve getListingMedia behavior', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 5 }), // Number of media items
          async (mediaCount) => {
            const listingId = `listing-${Date.now()}-${Math.random()}`;
            const uploadedIds: string[] = [];
            
            // Upload multiple media items
            for (let i = 0; i < mediaCount; i++) {
              const request: MediaUploadRequest = {
                listingId,
                file: Buffer.from(`file-${i}`),
                mediaType: 'photo',
                fileName: `photo-${i}.jpg`,
                mimeType: 'image/jpeg'
              };
              
              const result = await mediaService.uploadMedia(request);
              expect(result.success).toBe(true);
              uploadedIds.push(result.mediaId);
            }
            
            // Retrieve media
            const media = await mediaService.getListingMedia(listingId);
            
            // Should return all uploaded media
            expect(media.length).toBe(mediaCount);
            
            // All media should have required properties
            media.forEach((m: ListingMedia) => {
              expect(m.id).toBeDefined();
              expect(m.listingId).toBe(listingId);
              expect(m.mediaType).toBeDefined();
              expect(m.fileName).toBeDefined();
              expect(m.storageUrl).toBeDefined();
            });
            
            return true;
          }
        ),
        { numRuns: 15 }
      );
    });
    
    it('should preserve first photo as primary behavior', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 5 }), // Number of photos
          async (photoCount) => {
            const listingId = `listing-${Date.now()}-${Math.random()}`;
            
            // Upload multiple photos
            for (let i = 0; i < photoCount; i++) {
              const request: MediaUploadRequest = {
                listingId,
                file: Buffer.from(`photo-${i}`),
                mediaType: 'photo',
                fileName: `photo-${i}.jpg`,
                mimeType: 'image/jpeg'
              };
              
              await mediaService.uploadMedia(request);
            }
            
            // Get media
            const pgAdapter = mockDbManager.getPostgreSQLAdapter();
            const media = await pgAdapter.getListingMedia(listingId);
            
            // First photo should be primary
            const primaryMedia = media.filter((m: ListingMedia) => m.isPrimary);
            expect(primaryMedia.length).toBe(1);
            expect(primaryMedia[0].displayOrder).toBe(0);
            
            // All other photos should not be primary
            const nonPrimaryMedia = media.filter((m: ListingMedia) => !m.isPrimary);
            expect(nonPrimaryMedia.length).toBe(photoCount - 1);
            
            return true;
          }
        ),
        { numRuns: 15 }
      );
    });
    
    it('should preserve media count enforcement behavior', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: MAX_MEDIA_PER_LISTING }),
          async (uploadCount) => {
            const listingId = `listing-${Date.now()}-${Math.random()}`;
            
            // Upload up to the limit
            for (let i = 0; i < uploadCount; i++) {
              const request: MediaUploadRequest = {
                listingId,
                file: Buffer.from(`file-${i}`),
                mediaType: 'photo',
                fileName: `photo-${i}.jpg`,
                mimeType: 'image/jpeg'
              };
              
              const result = await mediaService.uploadMedia(request);
              expect(result.success).toBe(true);
            }
            
            // Verify count
            const pgAdapter = mockDbManager.getPostgreSQLAdapter();
            const count = await pgAdapter.getMediaCount(listingId);
            expect(count).toBe(uploadCount);
            
            return true;
          }
        ),
        { numRuns: 15 }
      );
    });
    
    it('should preserve display order assignment behavior', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2, max: 5 }),
          async (mediaCount) => {
            const listingId = `listing-${Date.now()}-${Math.random()}`;
            
            // Upload multiple media items
            for (let i = 0; i < mediaCount; i++) {
              const request: MediaUploadRequest = {
                listingId,
                file: Buffer.from(`file-${i}`),
                mediaType: 'photo',
                fileName: `photo-${i}.jpg`,
                mimeType: 'image/jpeg'
              };
              
              await mediaService.uploadMedia(request);
            }
            
            // Get media
            const pgAdapter = mockDbManager.getPostgreSQLAdapter();
            const media = await pgAdapter.getListingMedia(listingId);
            
            // Display orders should be sequential starting from 0
            const sortedMedia = [...media].sort((a, b) => a.displayOrder - b.displayOrder);
            sortedMedia.forEach((m: ListingMedia, index: number) => {
              expect(m.displayOrder).toBe(index);
            });
            
            return true;
          }
        ),
        { numRuns: 15 }
      );
    });
  });
});
