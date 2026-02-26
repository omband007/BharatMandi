/**
 * Test Data Factories for Marketplace Controller Tests
 * 
 * Provides factory functions to create test data objects with sensible defaults
 * and support for partial overrides.
 */

import type { Listing } from '../../marketplace.types';
import type { MediaUploadResponse } from '../../media.types';

/**
 * Create a test listing with default values
 */
export function createTestListing(overrides?: Partial<Listing>): Listing {
  return {
    id: 'test-listing-id',
    farmerId: 'test-farmer-id',
    produceType: 'Tomatoes',
    quantity: 100,
    pricePerKg: 50,
    certificateId: 'test-cert-id',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    isActive: true,
    ...overrides
  };
}

/**
 * Create a test listing request with default values
 */
export function createTestListingRequest(overrides?: Partial<{
  farmerId: string;
  produceType: string;
  quantity: number;
  pricePerKg: number;
  certificateId: string;
}>) {
  return {
    farmerId: 'test-farmer-id',
    produceType: 'Tomatoes',
    quantity: 100,
    pricePerKg: 50,
    certificateId: 'test-cert-id',
    ...overrides
  };
}

/**
 * Create a test media upload result with default values
 */
export function createTestMediaResult(overrides?: Partial<{
  fileName: string;
  success: boolean;
  mediaId: string;
  error?: string;
}>) {
  return {
    fileName: 'test-image.jpg',
    success: true,
    mediaId: 'test-media-id',
    ...overrides
  };
}

/**
 * Create a test file object (Express.Multer.File)
 */
export function createTestFile(overrides?: Partial<Express.Multer.File>): Express.Multer.File {
  return {
    fieldname: 'media',
    originalname: 'test-image.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    buffer: Buffer.from('fake-image-data'),
    size: 1024,
    stream: null as any,
    destination: '',
    filename: '',
    path: '',
    ...overrides
  };
}

/**
 * Create a test MediaUploadResponse with default values
 */
export function createTestMediaUploadResponse(overrides?: Partial<MediaUploadResponse>): MediaUploadResponse {
  return {
    mediaId: 'test-media-id',
    storageUrl: 'https://storage.example.com/test-media-id.jpg',
    success: true,
    ...overrides
  };
}
