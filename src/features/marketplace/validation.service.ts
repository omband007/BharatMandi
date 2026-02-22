// File validation service for media uploads

import * as path from 'path';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZES, FILE_EXTENSION_TO_MIME, MIME_TO_MEDIA_TYPE } from './media.constants';
import type { MediaType } from './media.types';

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export class ValidationService {
  /**
   * Validate media file
   * @param file - File buffer
   * @param fileName - Original file name
   * @param mimeType - File MIME type
   * @param mediaType - Expected media type
   * @returns Validation result
   */
  validateMediaFile(
    file: Buffer,
    fileName: string,
    mimeType: string,
    mediaType: MediaType
  ): ValidationResult {
    // Validate file is not empty
    if (!file || file.length === 0) {
      return {
        valid: false,
        error: 'File is empty or invalid'
      };
    }

    // Validate file extension
    const extensionValidation = this.validateFileExtension(fileName, mimeType);
    if (!extensionValidation.valid) {
      return extensionValidation;
    }

    // Validate MIME type
    const mimeValidation = this.validateMimeType(mimeType, mediaType);
    if (!mimeValidation.valid) {
      return mimeValidation;
    }

    // Validate file size
    const sizeValidation = this.validateFileSize(file.length, mediaType);
    if (!sizeValidation.valid) {
      return sizeValidation;
    }

    return { valid: true };
  }

  /**
   * Validate file extension matches MIME type
   * @param fileName - File name
   * @param mimeType - MIME type
   * @returns Validation result
   */
  validateFileExtension(fileName: string, mimeType: string): ValidationResult {
    const extension = path.extname(fileName).toLowerCase();
    
    if (!extension) {
      return {
        valid: false,
        error: 'File must have a valid extension'
      };
    }

    const expectedMimeType = FILE_EXTENSION_TO_MIME[extension];
    
    if (!expectedMimeType) {
      return {
        valid: false,
        error: `Unsupported file extension: ${extension}. Allowed extensions: .jpg, .jpeg, .png, .webp, .mp4, .mov, .pdf`
      };
    }

    if (expectedMimeType !== mimeType) {
      return {
        valid: false,
        error: `File extension ${extension} does not match MIME type ${mimeType}`
      };
    }

    return { valid: true };
  }

  /**
   * Validate MIME type for media type
   * @param mimeType - MIME type
   * @param mediaType - Media type
   * @returns Validation result
   */
  validateMimeType(mimeType: string, mediaType: MediaType): ValidationResult {
    const allowedMimeTypes = ALLOWED_MIME_TYPES[mediaType];
    
    if (!allowedMimeTypes.includes(mimeType)) {
      return {
        valid: false,
        error: `Invalid MIME type ${mimeType} for ${mediaType}. Allowed types: ${allowedMimeTypes.join(', ')}`
      };
    }

    return { valid: true };
  }

  /**
   * Validate file size
   * @param fileSize - File size in bytes
   * @param mediaType - Media type
   * @returns Validation result
   */
  validateFileSize(fileSize: number, mediaType: MediaType): ValidationResult {
    const maxSize = MAX_FILE_SIZES[mediaType];
    
    if (fileSize > maxSize) {
      const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(0);
      const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2);
      
      return {
        valid: false,
        error: `File size ${fileSizeMB}MB exceeds maximum allowed size of ${maxSizeMB}MB for ${mediaType}. Please compress or reduce the file size.`
      };
    }

    if (fileSize === 0) {
      return {
        valid: false,
        error: 'File is empty (0 bytes)'
      };
    }

    return { valid: true };
  }

  /**
   * Detect media type from MIME type
   * @param mimeType - MIME type
   * @returns Media type or undefined
   */
  detectMediaType(mimeType: string): MediaType | undefined {
    return MIME_TO_MEDIA_TYPE[mimeType];
  }

  /**
   * Detect media type from file extension
   * @param fileName - File name
   * @returns Media type or undefined
   */
  detectMediaTypeFromExtension(fileName: string): MediaType | undefined {
    const extension = path.extname(fileName).toLowerCase();
    const mimeType = FILE_EXTENSION_TO_MIME[extension];
    
    if (!mimeType) {
      return undefined;
    }

    return MIME_TO_MEDIA_TYPE[mimeType];
  }

  /**
   * Get human-readable error message for validation
   * @param error - Error message
   * @returns User-friendly error message
   */
  getUserFriendlyError(error: string): string {
    // Map technical errors to user-friendly messages
    if (error.includes('exceeds maximum')) {
      return error; // Already user-friendly
    }
    
    if (error.includes('extension')) {
      return 'Please upload a valid file type (JPEG, PNG, WebP for photos; MP4, MOV for videos; PDF for documents)';
    }
    
    if (error.includes('MIME type')) {
      return 'The file type is not supported. Please upload a valid image, video, or PDF file.';
    }
    
    if (error.includes('empty')) {
      return 'The file appears to be empty or corrupted. Please try uploading a different file.';
    }

    return 'File validation failed. Please check the file and try again.';
  }
}

// Export singleton instance
export const validationService = new ValidationService();
