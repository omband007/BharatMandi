import { Router, Request, Response } from 'express';
import { marketplaceService } from './marketplace.service';

const router = Router();

/**
 * POST /api/marketplace/listings
 * Create a new listing
 */
router.post('/listings', (req: Request, res: Response) => {
  const { farmerId, produceType, quantity, pricePerKg, certificateId } = req.body;

  const listing = marketplaceService.createListing(
    farmerId,
    produceType,
    quantity,
    pricePerKg,
    certificateId
  );

  res.status(201).json(listing);
});

/**
 * GET /api/marketplace/listings
 * Get all active listings
 */
router.get('/listings', (req: Request, res: Response) => {
  res.json(marketplaceService.getActiveListings());
});

/**
 * GET /api/marketplace/listings/:id
 * Get listing by ID
 */
router.get('/listings/:id', (req: Request, res: Response) => {
  const listing = marketplaceService.getListing(req.params.id);
  if (!listing) {
    return res.status(404).json({ error: 'Listing not found' });
  }
  res.json(listing);
});

// Export as marketplaceController for feature-based architecture
export const marketplaceController = router;
