import { v4 as uuidv4 } from 'uuid';
import { DatabaseManager } from '../../shared/database/db-abstraction';
import { StorageService } from './storage.service';
import { ValidationService } from './validation.service';
import type {
  ListingMedia,
  MediaUploadRequest,
  MediaUploadResponse,
  MediaType
} from './media.types';
import { MAX_MEDIA_PER_LISTING } from './media.constants';

/**
 * Media Service
 * 
 * Handles all media operations for marketplace listings including:
 * - Upload media (photos, videos, documents)
 * - Retrieve media for listings
 * - Delete media
 * - Reorder media
 * - Set primary media
 * 
 * Integrates with:
 * - DatabaseManager for persistence
 * - StorageService for file storage (S3/local)
 * - ValidationService for file validation
 */
export class MediaService {
  private dbManager: DatabaseManager;
  private storageService: StorageService;
  private validationService: ValidationService;

  constructor(
    dbManager: DatabaseManager,
    storageService: StorageService,
    validationService: ValidationService
  ) {
    this.dbManager = dbManager;
    this.storageService = storageService;
    this.validationService = validationService;
  }

  /**
   * Upload media for a listing
   * 
   * Requirements: 1.1, 1.2, 1.3, 1.5, 1.6, 1.7, 1.8
   * 
   * @param request - Media upload request
   * @returns Upload response with media ID and URLs
   */
  async uploadMedia(request: MediaUploadRequest): Promise<MediaUploadResponse> {
    try {
      // 0. Verify listing exists in PostgreSQL
      const pgAdapter = this.dbManager.getPostgreSQLAdapter();
      const listing = await pgAdapter.getListing(request.listingId);
      
      if (!listing) {
        // Check if listing is in SQLite (indicates sync issue)
        const sqliteAdapter = this.dbManager.getSQLiteAdapter();
        const sqliteListing = await sqliteAdapter.getListing(request.listingId);
        
        if (sqliteListing) {
          return {
            mediaId: '',
            storageUrl: '',
            success: false,
            error: `Listing exists in SQLite but not PostgreSQL. This indicates PostgreSQL is not being used for listing creation. Please check server logs and ensure PostgreSQL is connected.`
          };
        }
        
        return {
          mediaId: '',
          storageUrl: '',
          success: false,
          error: `Listing ${request.listingId} not found`
        };
      }

      // 1. Validate file type and size (Requirement 1.3, 1.4)
      const validation = this.validationService.validateMediaFile(
        request.file as Buffer,
        request.fileName,
        request.mimeType,
        request.mediaType
      );

      if (!validation.valid) {
        return {
          mediaId: '',
          storageUrl: '',
          success: false,
          error: validation.error
        };
      }

      // 2. Check media count limit (Requirement 1.8, 2.4)
      const mediaCount = await pgAdapter.getMediaCount(request.listingId);

      if (mediaCount >= MAX_MEDIA_PER_LISTING) {
        return {
          mediaId: '',
          storageUrl: '',
          success: false,
          error: `Maximum ${MAX_MEDIA_PER_LISTING} media items per listing exceeded`
        };
      }

      // 3. Generate unique media ID
      const mediaId = uuidv4();

      // 4. Determine display order (next in sequence)
      const displayOrder = mediaCount;

      // 5. Check if this should be primary (first photo)
      const existingMedia = await pgAdapter.getListingMedia(request.listingId);
      const hasPhotos = existingMedia.some(m => m.mediaType === 'photo');
      const isPrimary = request.mediaType === 'photo' && !hasPhotos;

      // 6. Generate thumbnail if photo or video (Requirement 5.5)
      let thumbnailUrl: string | undefined;
      let thumbnailKey: string | undefined;
      
      if (request.mediaType === 'photo' || request.mediaType === 'video') {
        try {
          const thumbnailBuffer = await this.storageService.generateThumbnail(
            request.file as Buffer,
            request.mediaType
          );
          
          if (thumbnailBuffer.length > 0) {
            thumbnailKey = this.storageService.generateThumbnailKey(request.listingId, mediaId);
            thumbnailUrl = await this.storageService.uploadFile(
              thumbnailBuffer,
              thumbnailKey,
              'image/jpeg'
            );
          }
        } catch (error) {
          console.warn('[MediaService] Thumbnail generation failed:', error);
          // Continue without thumbnail
        }
      }

      // 7. Upload file to storage (Requirement 5.1, 5.2, 6.2)
      const storageKey = this.storageService.generateStorageKey(
        request.listingId,
        mediaId,
        request.fileName
      );
      
      const storageUrl = await this.storageService.uploadFile(
        request.file as Buffer,
        storageKey,
        request.mimeType
      );

      // 8. Create media record in database (Requirement 1.6)
      const media: Omit<ListingMedia, 'id' | 'createdAt' | 'updatedAt'> = {
        listingId: request.listingId,
        mediaType: request.mediaType,
        fileName: request.fileName,
        fileSize: request.file.length || (request.file as any).size || 0,
        mimeType: request.mimeType,
        storageUrl,
        thumbnailUrl,
        displayOrder,
        isPrimary,
        uploadedAt: new Date()
      };

      const createdMedia = await pgAdapter.createListingMedia(media);

      // 9. Cache in SQLite for offline access (best effort - don't fail if it doesn't work)
      try {
        const sqliteAdapter = this.dbManager.getSQLiteAdapter();
        await sqliteAdapter.cacheListingMedia(createdMedia);
      } catch (cacheError) {
        console.warn('[MediaService] Failed to cache media in SQLite (non-fatal):', cacheError);
        // Continue - caching failure shouldn't prevent the upload from succeeding
      }

      return {
        mediaId: createdMedia.id,
        storageUrl: createdMedia.storageUrl,
        thumbnailUrl: createdMedia.thumbnailUrl,
        success: true
      };

    } catch (error) {
      console.error('[MediaService] Upload failed:', error);
      return {
        mediaId: '',
        storageUrl: '',
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  /**
   * Get all media for a listing
   * 
   * Requirements: 4.2, 4.3
   * 
   * @param listingId - Listing ID
   * @returns Array of media items sorted by display order
   */
  async getListingMedia(listingId: string): Promise<ListingMedia[]> {
    try {
      // Try PostgreSQL first, fallback to SQLite if unavailable
      if (this.dbManager.isPostgreSQLConnected()) {
        const pgAdapter = this.dbManager.getPostgreSQLAdapter();
        const media = await pgAdapter.getListingMedia(listingId);
        
        // Generate signed URLs for storage access (Requirement 7.1)
        return await Promise.all(
          media.map(async (m) => ({
            ...m,
            storageUrl: await this.storageService.generateSignedUrl(m.storageUrl),
            thumbnailUrl: m.thumbnailUrl 
              ? await this.storageService.generateSignedUrl(m.thumbnailUrl)
              : undefined
          }))
        );
      } else {
        // Offline mode - serve from SQLite cache
        const sqliteAdapter = this.dbManager.getSQLiteAdapter();
        return await sqliteAdapter.getCachedListingMedia(listingId);
      }
    } catch (error) {
      console.error('[MediaService] Get media failed:', error);
      // Fallback to SQLite on error
      const sqliteAdapter = this.dbManager.getSQLiteAdapter();
      return await sqliteAdapter.getCachedListingMedia(listingId);
    }
  }

  /**
   * Delete media from a listing
   * 
   * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.7
   * 
   * @param listingId - Listing ID
   * @param mediaId - Media ID to delete
   * @param userId - User ID (for ownership verification)
   * @returns true if deleted successfully
   */
  async deleteMedia(listingId: string, mediaId: string, userId: string): Promise<boolean> {
    try {
      const pgAdapter = this.dbManager.getPostgreSQLAdapter();

      // 1. Get the media to delete
      const media = await pgAdapter.getMediaById(mediaId);
      if (!media || media.listingId !== listingId) {
        throw new Error('Media not found');
      }

      // 2. Verify user owns the listing (Requirement 7.2)
      const listing = await pgAdapter.getListing(listingId);
      if (!listing || listing.farmerId !== userId) {
        throw new Error('Unauthorized: User does not own this listing');
      }

      // 3. Delete file from storage (Requirement 3.2)
      await this.storageService.deleteFile(media.storageUrl);
      if (media.thumbnailUrl) {
        await this.storageService.deleteFile(media.thumbnailUrl);
      }

      // 4. Delete media record from database (Requirement 3.3)
      await pgAdapter.deleteListingMedia(mediaId);

      // 5. If primary media deleted, set next photo as primary (Requirement 3.5, 3.6)
      if (media.isPrimary) {
        const remainingMedia = await pgAdapter.getListingMedia(listingId);
        const nextPhoto = remainingMedia.find(m => m.mediaType === 'photo');
        
        if (nextPhoto) {
          await pgAdapter.setPrimaryMedia(listingId, nextPhoto.id);
        }
      }

      // 6. Delete from SQLite cache
      const sqliteAdapter = this.dbManager.getSQLiteAdapter();
      await sqliteAdapter.deleteCachedMedia(mediaId);

      return true;
    } catch (error) {
      console.error('[MediaService] Delete media failed:', error);
      throw error;
    }
  }

  /**
   * Reorder media for a listing
   * 
   * Requirements: 8.1, 8.2, 8.5, 8.6
   * 
   * @param listingId - Listing ID
   * @param mediaOrder - Array of media IDs in desired order
   * @param userId - User ID (for ownership verification)
   * @returns true if reordered successfully
   */
  async reorderMedia(listingId: string, mediaOrder: string[], userId: string): Promise<boolean> {
    try {
      const pgAdapter = this.dbManager.getPostgreSQLAdapter();

      // 1. Verify user owns the listing
      const listing = await pgAdapter.getListing(listingId);
      if (!listing || listing.farmerId !== userId) {
        throw new Error('Unauthorized: User does not own this listing');
      }

      // 2. Validate all media IDs belong to the listing (Requirement 8.1)
      const existingMedia = await pgAdapter.getListingMedia(listingId);
      const existingIds = new Set(existingMedia.map(m => m.id));
      
      for (const mediaId of mediaOrder) {
        if (!existingIds.has(mediaId)) {
          throw new Error(`Media ${mediaId} does not belong to listing ${listingId}`);
        }
      }

      // 3. Update display_order for each media item (Requirement 8.2)
      const orderUpdates = mediaOrder.map((mediaId, index) => ({
        mediaId,
        displayOrder: index
      }));

      await pgAdapter.updateMediaOrder(listingId, orderUpdates);

      // 4. Update cache in SQLite
      const sqliteAdapter = this.dbManager.getSQLiteAdapter();
      for (const media of existingMedia) {
        const newOrder = mediaOrder.indexOf(media.id);
        if (newOrder !== -1) {
          await sqliteAdapter.cacheListingMedia({
            ...media,
            displayOrder: newOrder,
            updatedAt: new Date()
          });
        }
      }

      return true;
    } catch (error) {
      console.error('[MediaService] Reorder media failed:', error);
      throw error;
    }
  }

  /**
   * Set primary media for a listing
   * 
   * Requirements: 8.3, 8.4
   * 
   * @param listingId - Listing ID
   * @param mediaId - Media ID to set as primary
   * @param userId - User ID (for ownership verification)
   * @returns true if set successfully
   */
  async setPrimaryMedia(listingId: string, mediaId: string, userId: string): Promise<boolean> {
    try {
      const pgAdapter = this.dbManager.getPostgreSQLAdapter();

      // 1. Verify user owns the listing
      const listing = await pgAdapter.getListing(listingId);
      if (!listing || listing.farmerId !== userId) {
        throw new Error('Unauthorized: User does not own this listing');
      }

      // 2. Verify media is a photo (Requirement 8.3)
      const media = await pgAdapter.getMediaById(mediaId);
      if (!media || media.listingId !== listingId) {
        throw new Error('Media not found');
      }

      if (media.mediaType !== 'photo') {
        throw new Error('Only photos can be set as primary media');
      }

      // 3. Set as primary (Requirement 8.4)
      await pgAdapter.setPrimaryMedia(listingId, mediaId);

      // 4. Update cache in SQLite
      const sqliteAdapter = this.dbManager.getSQLiteAdapter();
      const allMedia = await pgAdapter.getListingMedia(listingId);
      
      for (const m of allMedia) {
        await sqliteAdapter.cacheListingMedia({
          ...m,
          isPrimary: m.id === mediaId,
          updatedAt: new Date()
        });
      }

      return true;
    } catch (error) {
      console.error('[MediaService] Set primary media failed:', error);
      throw error;
    }
  }
}
