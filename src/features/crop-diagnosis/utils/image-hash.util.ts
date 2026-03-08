/**
 * Image Hash Utility
 * 
 * Generates SHA-256 hashes from image buffers for cache key generation.
 * Uses first 16 characters of hash to create compact cache keys.
 * 
 * Cache Key Format: `diagnosis:{hash}` where hash is first 16 chars of SHA-256
 * 
 * Requirements: 12.3
 */

import crypto from 'crypto';

/**
 * Generate SHA-256 hash from image buffer
 * Returns first 16 characters for compact cache keys
 * 
 * @param imageBuffer - Binary image data
 * @returns First 16 characters of SHA-256 hash (hexadecimal)
 * 
 * @example
 * const buffer = fs.readFileSync('image.jpg');
 * const hash = generateImageHash(buffer);
 * // Returns: "a1b2c3d4e5f6g7h8"
 */
export function generateImageHash(imageBuffer: Buffer): string {
  return crypto
    .createHash('sha256')
    .update(imageBuffer)
    .digest('hex')
    .substring(0, 16);
}

/**
 * Generate full cache key for diagnosis
 * 
 * @param imageBuffer - Binary image data
 * @returns Cache key in format "diagnosis:{hash}"
 * 
 * @example
 * const buffer = fs.readFileSync('image.jpg');
 * const cacheKey = generateDiagnosisCacheKey(buffer);
 * // Returns: "diagnosis:a1b2c3d4e5f6g7h8"
 */
export function generateDiagnosisCacheKey(imageBuffer: Buffer): string {
  const hash = generateImageHash(imageBuffer);
  return `diagnosis:${hash}`;
}
