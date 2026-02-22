// Marketplace service for listing management
import { v4 as uuidv4 } from 'uuid';
import type { Listing } from './marketplace.types';
import type { DatabaseManager } from '../../shared/database/db-abstraction';

// Get the shared DatabaseManager instance from app.ts
function getDbManager(): DatabaseManager {
  const dbManager = (global as any).sharedDbManager;
  if (!dbManager) {
    throw new Error('DatabaseManager not initialized. This should be set by app.ts');
  }
  return dbManager;
}

export class MarketplaceService {
  async createListing(
    farmerId: string,
    produceType: string,
    quantity: number,
    pricePerKg: number,
    certificateId: string
  ): Promise<Listing> {
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

    return await getDbManager().createListing(listing);
  }

  async getActiveListings(): Promise<Listing[]> {
    return await getDbManager().getActiveListings();
  }

  async getListing(id: string): Promise<Listing | undefined> {
    return await getDbManager().getListing(id);
  }

  async deactivateListing(id: string): Promise<Listing | undefined> {
    return await getDbManager().updateListing(id, { isActive: false });
  }
}

export const marketplaceService = new MarketplaceService();
