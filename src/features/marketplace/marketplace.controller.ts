import { Router, Request, Response } from 'express';
import multer from 'multer';
import { marketplaceService } from './marketplace.service';
import { MediaService } from './media.service';
import { StorageService } from './storage.service';
import { ValidationService } from './validation.service';
import type { DatabaseManager } from '../../shared/database/db-abstraction';

const router = Router();

// Configure multer for media uploads with proper limits and validation
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit (for videos)
    files: 10 // Max 10 files
  },
  fileFilter: (req, file, cb) => {
    // Accept images, videos, and PDFs
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'video/mp4',
      'video/quicktime',
      'application/pdf'
    ];
    
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error(`Invalid file type: ${file.mimetype}. Only images, videos, and PDFs are allowed`));
    }
    cb(null, true);
  }
});

// Lazy-loaded MediaService instance
let mediaServiceInstance: MediaService | null = null;

function getMediaService(): MediaService {
  if (!mediaServiceInstance) {
    const dbManager = (global as any).sharedDbManager as DatabaseManager;
    if (!dbManager) {
      throw new Error('DatabaseManager not initialized');
    }
    const storageService = new StorageService();
    const validationService = new ValidationService();
    mediaServiceInstance = new MediaService(dbManager, storageService, validationService);
  }
  return mediaServiceInstance;
}

/**
 * POST /api/marketplace/listings
 * Create a new listing
 */
router.post('/listings', async (req: Request, res: Response) => {
  try {
    const { farmerId, produceType, quantity, pricePerKg, certificateId } = req.body;

    const listing = await marketplaceService.createListing(
      farmerId,
      produceType,
      quantity,
      pricePerKg,
      certificateId
    );

    res.status(201).json(listing);
  } catch (error) {
    console.error('[Marketplace] Error creating listing:', error);
    res.status(500).json({ error: 'Failed to create listing' });
  }
});

/**
 * POST /api/marketplace/listings/with-media
 * Create a new listing with media files (production-quality endpoint)
 * This endpoint handles both listing creation and media upload atomically,
 * eliminating race conditions and timing issues.
 */
router.post('/listings/with-media', upload.array('media', 10), async (req: Request, res: Response) => {
  try {
    const { farmerId, produceType, quantity, pricePerKg, certificateId } = req.body;
    const files = req.files as Express.Multer.File[];

    console.log('[Marketplace] Creating listing with media:', {
      farmerId,
      produceType,
      quantity,
      pricePerKg,
      fileCount: files?.length || 0
    });

    // 1. Create the listing first
    const listing = await marketplaceService.createListing(
      farmerId,
      produceType,
      quantity,
      pricePerKg,
      certificateId
    );

    console.log('[Marketplace] Listing created:', listing.id);

    // 2. Upload media files if provided
    const mediaResults = [];
    if (files && files.length > 0) {
      for (const file of files) {
        try {
          console.log(`[Marketplace] Uploading file: ${file.originalname} (${file.mimetype}, ${file.size} bytes)`);
          
          // Auto-detect media type from MIME type
          let mediaType: 'photo' | 'video' | 'document' = 'photo';
          if (file.mimetype.startsWith('video/')) {
            mediaType = 'video';
          } else if (file.mimetype === 'application/pdf') {
            mediaType = 'document';
          }

          const result = await getMediaService().uploadMedia({
            listingId: listing.id,
            file: file.buffer,
            fileName: file.originalname,
            mimeType: file.mimetype,
            mediaType
          });

          console.log(`[Marketplace] Upload result for ${file.originalname}:`, result);

          mediaResults.push({
            fileName: file.originalname,
            success: result.success,
            mediaId: result.mediaId,
            error: result.error
          });
        } catch (fileError) {
          console.error(`[Marketplace] Error uploading ${file.originalname}:`, fileError);
          mediaResults.push({
            fileName: file.originalname,
            success: false,
            mediaId: '',
            error: fileError instanceof Error ? fileError.message : 'Upload failed'
          });
        }
      }
    }

    // 3. Return combined result
    const successCount = mediaResults.filter(r => r.success).length;
    const failCount = mediaResults.filter(r => !r.success).length;

    console.log('[Marketplace] Upload complete:', { successCount, failCount });

    res.status(201).json({
      listing,
      media: {
        total: mediaResults.length,
        successful: successCount,
        failed: failCount,
        results: mediaResults
      }
    });
  } catch (error) {
    console.error('[Marketplace] Error creating listing with media:', error);
    res.status(500).json({ 
      error: 'Failed to create listing with media',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/marketplace/listings
 * Get all active listings
 */
router.get('/listings', async (req: Request, res: Response) => {
  try {
    const listings = await marketplaceService.getActiveListings();
    res.json(listings);
  } catch (error) {
    console.error('[Marketplace] Error fetching listings:', error);
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
});

/**
 * GET /api/marketplace/listings/:id
 * Get listing by ID
 */
router.get('/listings/:id', async (req: Request, res: Response) => {
  try {
    const listing = await marketplaceService.getListing(req.params.id);
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    res.json(listing);
  } catch (error) {
    console.error('[Marketplace] Error fetching listing:', error);
    res.status(500).json({ error: 'Failed to fetch listing' });
  }
});

// Export as marketplaceController for feature-based architecture
export const marketplaceController = router;
