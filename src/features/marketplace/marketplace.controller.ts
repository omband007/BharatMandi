import { Router, Request, Response } from 'express';
import { marketplaceService } from './marketplace.service';

const router = Router();

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
