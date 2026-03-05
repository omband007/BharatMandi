/**
 * Mock Marketplace Service Configuration
 * 
 * Provides mock implementations for marketplace service and media service
 * to enable isolated controller testing.
 */

import type { Listing } from '../../marketplace.types';
import { ListingStatus, ListingType, PaymentMethodPreference } from '../../marketplace.types';
import type { MediaUploadResponse } from '../../media.types';

/**
 * Create mock marketplace service with all methods
 */
export function createMockMarketplaceService() {
  return {
    createListing: jest.fn(),
    getActiveListings: jest.fn(),
    getListing: jest.fn()
  };
}

/**
 * Create mock media service with all methods
 */
export function createMockMediaService() {
  return {
    uploadMedia: jest.fn()
  };
}

/**
 * Configure mock marketplace service with default success responses
 */
export function configureMockMarketplaceService(mockService: ReturnType<typeof createMockMarketplaceService>) {
  mockService.createListing.mockResolvedValue({
    id: 'test-listing-id',
    farmerId: 'test-farmer-id',
    produceType: 'Tomatoes',
    quantity: 100,
    pricePerKg: 50,
    certificateId: 'test-cert-id',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    status: ListingStatus.ACTIVE,
    listingType: ListingType.POST_HARVEST,
    produceCategoryId: 'cat-1',
    expiryDate: new Date('2024-01-02T00:00:00.000Z'),
    paymentMethodPreference: PaymentMethodPreference.BOTH
  } as Listing);

  mockService.getActiveListings.mockResolvedValue([
    {
      id: 'test-listing-id',
      farmerId: 'test-farmer-id',
      produceType: 'Tomatoes',
      quantity: 100,
      pricePerKg: 50,
      certificateId: 'test-cert-id',
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      status: ListingStatus.ACTIVE,
      listingType: ListingType.POST_HARVEST,
      produceCategoryId: 'cat-1',
      expiryDate: new Date('2024-01-02T00:00:00.000Z'),
      paymentMethodPreference: PaymentMethodPreference.BOTH
    }
  ] as Listing[]);

  mockService.getListing.mockResolvedValue({
    id: 'test-listing-id',
    farmerId: 'test-farmer-id',
    produceType: 'Tomatoes',
    quantity: 100,
    pricePerKg: 50,
    certificateId: 'test-cert-id',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    status: ListingStatus.ACTIVE,
    listingType: ListingType.POST_HARVEST,
    produceCategoryId: 'cat-1',
    expiryDate: new Date('2024-01-02T00:00:00.000Z'),
    paymentMethodPreference: PaymentMethodPreference.BOTH
  } as Listing);
}

/**
 * Configure mock media service with default success responses
 */
export function configureMockMediaService(mockService: ReturnType<typeof createMockMediaService>) {
  mockService.uploadMedia.mockResolvedValue({
    mediaId: 'test-media-id',
    storageUrl: 'https://storage.example.com/test-media-id.jpg',
    success: true
  } as MediaUploadResponse);
}
