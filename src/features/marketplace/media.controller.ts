/**
 * Media Controller
 * 
 * Handles HTTP requests for listing media operations:
 * - Upload media (photos, videos, documents)
 * - Get listing media
 * - Delete media
 * - Reorder media
 * - Set primary media
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import { MediaService } from './media.service';
import { DatabaseManager } from '../../shared/database/db-abstraction';
import { StorageService } from './storage.service';
import { ValidationService } from './validation.service';
import type { MediaType } from './media.types';

const router = Router();

// Lazy initialization - will be set when first route is accessed
let mediaService: MediaService | null = null;
let dbManager: DatabaseManager | null = null;

// Get or create shared DatabaseManager instance
function getDbManager(): DatabaseManager {
  if (!dbManager) {
    // Import the shared instance from app
    dbManager = (global as any).sharedDbManager;
    if (!dbManager) {
      throw new Error('DatabaseManager not initialized. This should be set by app.ts');
    }
  }
  return dbManager;
}

// Get or create MediaService
function getMediaService(): MediaService {
  if (!mediaService) {
    const storageService = new StorageService();
    const validationService = new ValidationService();
    mediaService = new MediaService(getDbManager(), storageService, validationService);
  }
  return mediaService;
}

// Configure multer for media uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit (for videos)
  },
  fileFilter: (req, file, cb) => {
    // Accept images, videos, and PDFs
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'video/mp4',
      'video/quicktime',
      'application/pdf'
    ];
    
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error('Invalid file type. Only images, videos, and PDFs are allowed'));
    }
    cb(null, true);
  }
});

// Multer error handler middleware
const handleMulterError = (err: any, req: Request, res: Response, next: any) => {
  if (err instanceof multer.MulterError) {
    console.error('[MediaController] Multer error:', err);
    return res.status(400).json({
      success: false,
      error: err.message
    });
  } else if (err) {
    console.error('[MediaController] File upload error:', err);
    return res.status(400).json({
      success: false,
      error: err.message || 'File upload failed'
    });
  }
  next();
};

/**
 * POST /api/marketplace/listings/:listingId/media
 * Upload media to a listing
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */
router.post('/listings/:listingId/media', upload.single('file'), handleMulterError, async (req: Request, res: Response) => {
  try {
    console.log('[MediaController] Upload request received:', {
      listingId: req.params.listingId,
      hasFile: !!req.file,
      mediaType: req.body.mediaType,
      fileName: req.file?.originalname
    });

    const { listingId } = req.params;
    const { mediaType } = req.body;

    // Validate file upload
    if (!req.file) {
      console.error('[MediaController] No file in request');
      return res.status(400).json({ 
        success: false,
        error: 'No file uploaded' 
      });
    }

    // Validate media type
    if (!mediaType || !['photo', 'video', 'document'].includes(mediaType)) {
      console.error('[MediaController] Invalid media type:', mediaType);
      return res.status(400).json({ 
        success: false,
        error: 'Invalid media type. Must be photo, video, or document' 
      });
    }

    // TODO: Verify user owns the listing (requires auth middleware)
    // For now, we'll skip this check in the controller
    // The service layer should handle ownership verification

    console.log('[MediaController] Calling mediaService.uploadMedia...');
    
    // Upload media using lazy-loaded service
    const service = getMediaService();
    const result = await service.uploadMedia({
      listingId,
      file: req.file.buffer,
      mediaType: mediaType as MediaType,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype
    });

    console.log('[MediaController] Upload result:', { success: result.success, error: result.error });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(201).json(result);
  } catch (error) {
    console.error('[MediaController] Upload media error:', error);
    console.error('[MediaController] Error stack:', error instanceof Error ? error.stack : 'No stack');
    res.status(500).json({ 
      success: false,
      error: 'Failed to upload media',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/marketplace/listings/:listingId/media
 * Get all media for a listing
 * 
 * Requirements: 4.2
 */
router.get('/listings/:listingId/media', async (req: Request, res: Response) => {
  try {
    const { listingId } = req.params;

    const service = getMediaService();
    const media = await service.getListingMedia(listingId);

    res.json({
      success: true,
      media
    });
  } catch (error) {
    console.error('[MediaController] Get media error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch media' 
    });
  }
});

/**
 * DELETE /api/marketplace/listings/:listingId/media/:mediaId
 * Delete media from a listing
 * 
 * Requirements: 3.1, 3.2, 3.3
 */
router.delete('/listings/:listingId/media/:mediaId', async (req: Request, res: Response) => {
  try {
    const { listingId, mediaId } = req.params;

    // TODO: Get userId from auth middleware
    // For now, we'll use a placeholder
    const userId = req.body.userId || 'farmer-1';

    const service = getMediaService();
    const success = await service.deleteMedia(listingId, mediaId, userId);

    if (!success) {
      return res.status(404).json({ 
        success: false,
        error: 'Media not found or already deleted' 
      });
    }

    res.json({
      success: true,
      message: 'Media deleted successfully'
    });
  } catch (error: any) {
    console.error('[MediaController] Delete media error:', error);
    
    if (error.message?.includes('Unauthorized')) {
      return res.status(403).json({ 
        success: false,
        error: 'Unauthorized: You do not own this listing' 
      });
    }
    
    if (error.message?.includes('not found')) {
      return res.status(404).json({ 
        success: false,
        error: 'Media not found' 
      });
    }

    res.status(500).json({ 
      success: false,
      error: 'Failed to delete media' 
    });
  }
});

/**
 * PUT /api/marketplace/listings/:listingId/media/reorder
 * Reorder media items
 * 
 * Requirements: 8.1, 8.2
 */
router.put('/listings/:listingId/media/reorder', async (req: Request, res: Response) => {
  try {
    const { listingId } = req.params;
    const { mediaOrder } = req.body;

    // Validate request body
    if (!Array.isArray(mediaOrder)) {
      return res.status(400).json({ 
        success: false,
        error: 'mediaOrder must be an array of media IDs' 
      });
    }

    // TODO: Get userId from auth middleware
    const userId = req.body.userId || 'farmer-1';

    const service = getMediaService();
    const success = await service.reorderMedia(listingId, mediaOrder, userId);

    if (!success) {
      return res.status(400).json({ 
        success: false,
        error: 'Failed to reorder media' 
      });
    }

    res.json({
      success: true,
      message: 'Media reordered successfully'
    });
  } catch (error: any) {
    console.error('[MediaController] Reorder media error:', error);
    
    if (error.message?.includes('Unauthorized')) {
      return res.status(403).json({ 
        success: false,
        error: 'Unauthorized: You do not own this listing' 
      });
    }
    
    if (error.message?.includes('does not belong')) {
      return res.status(400).json({ 
        success: false,
        error: error.message 
      });
    }

    res.status(500).json({ 
      success: false,
      error: 'Failed to reorder media' 
    });
  }
});

/**
 * PUT /api/marketplace/listings/:listingId/media/:mediaId/primary
 * Set a media item as primary
 * 
 * Requirements: 8.3, 8.4
 */
router.put('/listings/:listingId/media/:mediaId/primary', async (req: Request, res: Response) => {
  try {
    const { listingId, mediaId } = req.params;

    // TODO: Get userId from auth middleware
    const userId = req.body.userId || 'farmer-1';

    const service = getMediaService();
    const success = await service.setPrimaryMedia(listingId, mediaId, userId);

    if (!success) {
      return res.status(400).json({ 
        success: false,
        error: 'Failed to set primary media' 
      });
    }

    res.json({
      success: true,
      message: 'Primary media set successfully'
    });
  } catch (error: any) {
    console.error('[MediaController] Set primary media error:', error);
    
    if (error.message?.includes('Unauthorized')) {
      return res.status(403).json({ 
        success: false,
        error: 'Unauthorized: You do not own this listing' 
      });
    }
    
    if (error.message?.includes('not found')) {
      return res.status(404).json({ 
        success: false,
        error: 'Media not found' 
      });
    }
    
    if (error.message?.includes('Only photos')) {
      return res.status(400).json({ 
        success: false,
        error: 'Only photos can be set as primary media' 
      });
    }

    res.status(500).json({ 
        success: false,
      error: 'Failed to set primary media' 
    });
  }
});

// Export as mediaController
export const mediaController = router;
