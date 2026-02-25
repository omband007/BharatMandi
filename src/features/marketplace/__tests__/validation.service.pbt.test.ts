// Property-based tests for file validation service
// **Validates: Requirements 1.3**

import * as fc from 'fast-check';
import { ValidationService } from '../validation.service';
import { MAX_FILE_SIZES } from '../media.constants';
import type { MediaType } from '../media.types';

describe('ValidationService - Property-Based Tests', () => {
  const validationService = new ValidationService();

  describe('Property 1: File Size Validation', () => {
    /**
     * **Validates: Requirements 1.3**
     * Property: Files exceeding size limits are always rejected
     * Property: Files within size limits are always accepted (assuming valid type)
     */
    
    it('should reject all files exceeding size limits', () => {
      fc.assert(
        fc.property(
          fc.constantFrom<MediaType>('photo', 'video', 'document'),
          fc.integer({ min: 1, max: 100 * 1024 * 1024 }), // Up to 100MB
          (mediaType, fileSize) => {
            const maxSize = MAX_FILE_SIZES[mediaType];
            
            // Only test files that exceed the limit
            if (fileSize <= maxSize) {
              return true; // Skip this case
            }

            const file = Buffer.alloc(fileSize);
            const fileName = mediaType === 'photo' ? 'test.jpg' : 
                           mediaType === 'video' ? 'test.mp4' : 'test.pdf';
            const mimeType = mediaType === 'photo' ? 'image/jpeg' :
                           mediaType === 'video' ? 'video/mp4' : 'application/pdf';

            const result = validationService.validateMediaFile(file, fileName, mimeType, mediaType);

            // Files exceeding size limit must be rejected
            return !result.valid && result.error?.includes('exceeds maximum');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept all files within size limits with valid types', () => {
      fc.assert(
        fc.property(
          fc.constantFrom<MediaType>('photo', 'video', 'document'),
          fc.integer({ min: 1, max: 1024 }), // Small files for testing
          (mediaType, fileSizeKB) => {
            const fileSize = fileSizeKB * 1024; // Convert to bytes
            const maxSize = MAX_FILE_SIZES[mediaType];
            
            // Only test files within the limit
            if (fileSize > maxSize) {
              return true; // Skip this case
            }

            const file = Buffer.alloc(fileSize);
            const fileName = mediaType === 'photo' ? 'test.jpg' : 
                           mediaType === 'video' ? 'test.mp4' : 'test.pdf';
            const mimeType = mediaType === 'photo' ? 'image/jpeg' :
                           mediaType === 'video' ? 'video/mp4' : 'application/pdf';

            const result = validationService.validateMediaFile(file, fileName, mimeType, mediaType);

            // Files within size limit with valid types must be accepted
            return result.valid;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject photos larger than 5MB', () => {
      const photoMaxSize = MAX_FILE_SIZES.photo;
      const oversizedFile = Buffer.alloc(photoMaxSize + 1);
      
      const result = validationService.validateMediaFile(
        oversizedFile,
        'photo.jpg',
        'image/jpeg',
        'photo'
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds maximum');
      expect(result.error).toContain('5MB');
    });

    it('should reject videos larger than 50MB', () => {
      const videoMaxSize = MAX_FILE_SIZES.video;
      const oversizedFile = Buffer.alloc(videoMaxSize + 1);
      
      const result = validationService.validateMediaFile(
        oversizedFile,
        'video.mp4',
        'video/mp4',
        'video'
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds maximum');
      expect(result.error).toContain('50MB');
    });

    it('should reject PDFs larger than 10MB', () => {
      const docMaxSize = MAX_FILE_SIZES.document;
      const oversizedFile = Buffer.alloc(docMaxSize + 1);
      
      const result = validationService.validateMediaFile(
        oversizedFile,
        'document.pdf',
        'application/pdf',
        'document'
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds maximum');
      expect(result.error).toContain('10MB');
    });

    it('should accept photos at exactly 5MB', () => {
      const photoMaxSize = MAX_FILE_SIZES.photo;
      const maxSizeFile = Buffer.alloc(photoMaxSize);
      
      const result = validationService.validateMediaFile(
        maxSizeFile,
        'photo.jpg',
        'image/jpeg',
        'photo'
      );

      expect(result.valid).toBe(true);
    });

    it('should accept videos at exactly 50MB', () => {
      const videoMaxSize = MAX_FILE_SIZES.video;
      const maxSizeFile = Buffer.alloc(videoMaxSize);
      
      const result = validationService.validateMediaFile(
        maxSizeFile,
        'video.mp4',
        'video/mp4',
        'video'
      );

      expect(result.valid).toBe(true);
    });

    it('should accept PDFs at exactly 10MB', () => {
      const docMaxSize = MAX_FILE_SIZES.document;
      const maxSizeFile = Buffer.alloc(docMaxSize);
      
      const result = validationService.validateMediaFile(
        maxSizeFile,
        'document.pdf',
        'application/pdf',
        'document'
      );

      expect(result.valid).toBe(true);
    });
  });

  describe('Property 2: MIME Type Validation', () => {
    /**
     * Property: Invalid MIME types are always rejected
     * Property: Valid MIME types for the media type are always accepted
     */
    
    it('should reject invalid MIME types for photos', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('video/mp4', 'application/pdf', 'text/plain', 'application/json'),
          (invalidMimeType) => {
            const file = Buffer.alloc(1024);
            const result = validationService.validateMediaFile(
              file,
              'test.jpg',
              invalidMimeType,
              'photo'
            );

            // Should be rejected - either for invalid MIME type or extension mismatch
            return !result.valid && (
              result.error?.includes('Invalid MIME type') ||
              result.error?.includes('does not match')
            );
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should accept valid MIME types for photos', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('image/jpeg', 'image/png', 'image/webp'),
          (validMimeType) => {
            const file = Buffer.alloc(1024);
            const extension = validMimeType === 'image/jpeg' ? '.jpg' :
                            validMimeType === 'image/png' ? '.png' : '.webp';
            
            const result = validationService.validateMediaFile(
              file,
              `test${extension}`,
              validMimeType,
              'photo'
            );

            return result.valid;
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 3: Extension Validation', () => {
    /**
     * Property: File extension must match MIME type
     */
    
    it('should reject mismatched extension and MIME type', () => {
      const testCases = [
        { fileName: 'test.jpg', mimeType: 'video/mp4', mediaType: 'video' as MediaType },
        { fileName: 'test.mp4', mimeType: 'image/jpeg', mediaType: 'photo' as MediaType },
        { fileName: 'test.pdf', mimeType: 'image/png', mediaType: 'photo' as MediaType },
      ];

      testCases.forEach(({ fileName, mimeType, mediaType }) => {
        const file = Buffer.alloc(1024);
        const result = validationService.validateMediaFile(file, fileName, mimeType, mediaType);

        expect(result.valid).toBe(false);
        expect(result.error).toContain('does not match');
      });
    });
  });

  describe('Property 4: Empty File Validation', () => {
    /**
     * Property: Empty files (0 bytes) are always rejected
     */
    
    it('should reject empty files', () => {
      fc.assert(
        fc.property(
          fc.constantFrom<MediaType>('photo', 'video', 'document'),
          (mediaType) => {
            const emptyFile = Buffer.alloc(0);
            const fileName = mediaType === 'photo' ? 'test.jpg' : 
                           mediaType === 'video' ? 'test.mp4' : 'test.pdf';
            const mimeType = mediaType === 'photo' ? 'image/jpeg' :
                           mediaType === 'video' ? 'video/mp4' : 'application/pdf';

            const result = validationService.validateMediaFile(emptyFile, fileName, mimeType, mediaType);

            return !result.valid && (
              result.error?.includes('empty') || 
              result.error?.includes('0 bytes')
            );
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
