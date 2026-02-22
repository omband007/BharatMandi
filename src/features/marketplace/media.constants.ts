// Media validation constants

import type { MediaType } from './media.types';

// Allowed MIME types for each media type
export const ALLOWED_MIME_TYPES: Record<MediaType, string[]> = {
  photo: ['image/jpeg', 'image/png', 'image/webp'],
  video: ['video/mp4', 'video/quicktime'],
  document: ['application/pdf']
};

// Maximum file sizes in bytes
export const MAX_FILE_SIZES: Record<MediaType, number> = {
  photo: 5 * 1024 * 1024,      // 5MB
  video: 50 * 1024 * 1024,     // 50MB
  document: 10 * 1024 * 1024   // 10MB
};

// Maximum media items per listing
export const MAX_MEDIA_PER_LISTING = 10;

// File extension to MIME type mapping
export const FILE_EXTENSION_TO_MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.pdf': 'application/pdf'
};

// MIME type to media type mapping
export const MIME_TO_MEDIA_TYPE: Record<string, MediaType> = {
  'image/jpeg': 'photo',
  'image/png': 'photo',
  'image/webp': 'photo',
  'video/mp4': 'video',
  'video/quicktime': 'video',
  'application/pdf': 'document'
};

// Thumbnail dimensions
export const THUMBNAIL_WIDTH = 200;
export const THUMBNAIL_HEIGHT = 200;

// Image compression quality (0-100)
export const IMAGE_COMPRESSION_QUALITY = 85;

// Signed URL expiration time (in seconds)
export const SIGNED_URL_EXPIRATION = 3600; // 1 hour

// Retry configuration
export const MAX_RETRY_ATTEMPTS = 3;
export const RETRY_BACKOFF_MS = [2000, 4000, 8000]; // Exponential backoff
