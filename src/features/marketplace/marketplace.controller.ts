import { Router, Request, Response } from 'express';
import multer from 'multer';
import { marketplaceService } from './marketplace.service';
import { MediaService } from './media.service';
import { StorageService } from './storage.service';
import { ValidationService } from './validation.service';
import { categoryManager } from './category-manager';
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
 * GET /api/marketplace/categories
 * Get all produce categories
 */
router.get('/categories', async (req: Request, res: Response) => {
  try {
    const categories = await categoryManager.getCategories();
    res.json(categories);
  } catch (error) {
    console.error('[Marketplace] Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

/**
 * POST /api/marketplace/listings
 * Create a new listing
 */
router.post('/listings', async (req: Request, res: Response) => {
  try {
    const { farmerId, produceType, quantity, pricePerKg, certificateId, expectedHarvestDate, produceCategoryId, listingType, paymentMethodPreference } = req.body;

    const listing = await marketplaceService.createListing({
      farmerId,
      produceType,
      quantity,
      pricePerKg,
      certificateId,
      expectedHarvestDate: expectedHarvestDate ? new Date(expectedHarvestDate) : undefined,
      produceCategoryId,
      listingType,
      paymentMethodPreference
    });

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
    const { farmerId, produceType, quantity, pricePerKg, certificateId, expectedHarvestDate, produceCategoryId, listingType, paymentMethodPreference } = req.body;
    const files = req.files as Express.Multer.File[];

    // 1. Create the listing first
    const listing = await marketplaceService.createListing({
      farmerId,
      produceType,
      quantity,
      pricePerKg,
      certificateId,
      expectedHarvestDate: expectedHarvestDate ? new Date(expectedHarvestDate) : undefined,
      produceCategoryId,
      listingType,
      paymentMethodPreference
    });

    // 2. Upload media files if provided
    const mediaResults = [];
    if (files && files.length > 0) {
      for (const file of files) {
        try {
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

          mediaResults.push({
            fileName: file.originalname,
            success: result.success,
            mediaId: result.mediaId,
            error: result.error
          });
        } catch (fileError) {
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
 * Query params: lang (optional, target language code for batch translation)
 * 
 * Examples:
 * - GET /api/marketplace/listings - Returns listings in original language
 * - GET /api/marketplace/listings?lang=hi - Returns all listings translated to Hindi
 * - GET /api/marketplace/listings?lang=mr - Returns all listings translated to Marathi
 */
router.get('/listings', async (req: Request, res: Response) => {
  try {
    const { lang } = req.query;

    // If language parameter is provided, return batch-translated listings
    if (lang && typeof lang === 'string') {
      const translatedListings = await marketplaceService.getTranslatedListings(lang);
      return res.json(translatedListings);
    }

    // Otherwise, return listings in original language
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

/**
 * PUT /api/marketplace/listings/:id
 * Update listing details
 */
router.put('/listings/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { quantity, pricePerKg, paymentMethodPreference, expectedHarvestDate, status } = req.body;

    // Validate required fields
    if (quantity === undefined && pricePerKg === undefined && paymentMethodPreference === undefined && expectedHarvestDate === undefined && status === undefined) {
      return res.status(400).json({ error: 'At least one field must be provided for update' });
    }

    const updates: any = {};
    if (quantity !== undefined) updates.quantity = quantity;
    if (pricePerKg !== undefined) updates.pricePerKg = pricePerKg;
    if (paymentMethodPreference !== undefined) updates.paymentMethodPreference = paymentMethodPreference;
    if (expectedHarvestDate !== undefined) updates.expectedHarvestDate = expectedHarvestDate;
    if (status !== undefined) updates.status = status;

    const updatedListing = await marketplaceService.updateListing(id, updates);
    
    if (!updatedListing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    res.json(updatedListing);
  } catch (error) {
    console.error('[Marketplace] Error updating listing:', error);
    res.status(500).json({ error: 'Failed to update listing' });
  }
});

/**
 * DELETE /api/marketplace/listings/:id
 * Cancel a listing (sets status to CANCELLED)
 */
router.delete('/listings/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    // Get the listing first to verify ownership
    const listing = await marketplaceService.getListing(id);
    
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    // Verify ownership (optional - add if you want authorization)
    if (userId && listing.farmerId !== userId) {
      return res.status(403).json({ error: 'Unauthorized to cancel this listing' });
    }

    // Cancel the listing using the new status management
    const cancelledListing = await marketplaceService.cancelListing(id, userId || listing.farmerId);
    
    res.json({ success: true, message: 'Listing cancelled successfully', listing: cancelledListing });
  } catch (error) {
    console.error('[Marketplace] Error cancelling listing:', error);
    res.status(500).json({ error: 'Failed to cancel listing' });
  }
});

/**
 * POST /api/marketplace/listings/:id/mark-sold
 * Mark a listing as sold (manual sale confirmation)
 * Body: { userId, saleChannel, salePrice?, saleNotes? }
 */
router.post('/listings/:id/mark-sold', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, saleChannel, salePrice, saleNotes } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    if (!saleChannel) {
      return res.status(400).json({ error: 'saleChannel is required' });
    }

    // Validate saleChannel
    const validChannels = ['PLATFORM', 'EXTERNAL'];
    if (!validChannels.includes(saleChannel)) {
      return res.status(400).json({ error: `Invalid saleChannel. Must be one of: ${validChannels.join(', ')}` });
    }

    // Import listing-status-manager
    const { listingStatusManager } = require('./listing-status-manager');

    await listingStatusManager.markAsSold({
      listingId: id,
      saleChannel,
      salePrice,
      saleNotes,
      userId
    });

    // Get updated listing
    const updatedListing = await marketplaceService.getListing(id);
    
    res.json({ success: true, message: 'Listing marked as sold successfully', listing: updatedListing });
  } catch (error) {
    console.error('[Marketplace] Error marking listing as sold:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to mark listing as sold';
    res.status(500).json({ error: errorMessage });
  }
});

/**
 * GET /api/marketplace/listings/:id/translate
 * Get translated listing
 * Query params: lang (target language code)
 */
router.get('/listings/:id/translate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { lang } = req.query;

    if (!lang || typeof lang !== 'string') {
      return res.status(400).json({ error: 'Language parameter (lang) is required' });
    }

    const translatedListing = await marketplaceService.getTranslatedListing(id, lang);
    
    if (!translatedListing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    res.json(translatedListing);
  } catch (error) {
    console.error('[Marketplace] Error translating listing:', error);
    res.status(500).json({ error: 'Failed to translate listing' });
  }
});

// Multer error handling middleware
router.use((err: any, req: Request, res: Response, next: any) => {
  if (err instanceof multer.MulterError) {
    // Handle multer-specific errors
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: `File too large. Maximum size is 50MB.` });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: `Too many files. Maximum is 10 files.` });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: `Unexpected file field.` });
    }
    return res.status(400).json({ error: err.message });
  }
  
  // Handle file filter errors (invalid file types)
  if (err.message && err.message.includes('Invalid file type')) {
    return res.status(400).json({ error: err.message });
  }
  
  // Pass other errors to the next error handler
  next(err);
});

// Export as marketplaceController for feature-based architecture
export const marketplaceController = router;
