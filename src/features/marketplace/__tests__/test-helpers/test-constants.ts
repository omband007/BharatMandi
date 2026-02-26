/**
 * Test Constants for Marketplace Controller Tests
 * 
 * Provides constant values used across multiple test cases.
 */

/**
 * Test listing IDs
 */
export const TEST_LISTING_IDS = {
  VALID: 'test-listing-id',
  VALID_2: 'test-listing-id-2',
  NON_EXISTENT: 'non-existent-listing-id'
};

/**
 * Test farmer IDs
 */
export const TEST_FARMER_IDS = {
  VALID: 'test-farmer-id',
  VALID_2: 'test-farmer-id-2'
};

/**
 * Test produce types
 */
export const TEST_PRODUCE_TYPES = {
  TOMATOES: 'Tomatoes',
  CARROTS: 'Carrots',
  POTATOES: 'Potatoes',
  ONIONS: 'Onions',
  WHEAT: 'Wheat'
};

/**
 * Allowed MIME types for file uploads
 */
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/quicktime',
  'application/pdf'
];

/**
 * Invalid MIME types for file uploads
 */
export const INVALID_MIME_TYPES = [
  'text/plain',
  'application/x-msdownload',
  'application/javascript',
  'text/html'
];
