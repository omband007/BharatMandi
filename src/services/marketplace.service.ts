// Marketplace service for listing management
import { v4 as uuidv4 } from 'uuid';
import { Listing } from '../types';
import { db } from '../database/memory-db';

export class MarketplaceService {
  createListing(
    farmerId: string,
    produceType: string,
    quantity: number,
    pricePerKg: number,
    certificateId: string
  ): Listing {
    const listing: Listing = {
      id: uuidv4(),
      farmerId,
      produceType,
      quantity,
      pricePerKg,
      certificateId,
      createdAt: new Date(),
      isActive: true
    };

    return db.createListing(listing);
  }

  getActiveListings(): Listing[] {
    return db.getActiveListings();
  }

  getListing(id: string): Listing | undefined {
    return db.getListing(id);
  }

  deactivateListing(id: string): Listing | undefined {
    return db.updateListing(id, { isActive: false });
  }
}

export const marketplaceService = new MarketplaceService();
