// Bugfix Preservation Property-Based Tests for Video Validation
// **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**
//
// Property 2: Preservation - Non-Video Validation Behavior
//
// These tests capture the baseline behavior of the validation service
// for all non-buggy inputs (photos, documents, oversized files, invalid MIME types,
// mismatched extensions, empty files). They ensure that fixing the video validation
// bug does not introduce regressions in other validation scenarios.

import * as fc from 'fast-check';
import { ValidationService } from '../validation.service';
import { MAX_FILE_SIZES, ALLOWED_MIME_TYPES } from '../media.constants';
import type { MediaType } from '../media.types';

describe('Bugfix Preservation - Property-Based Tests', () => {
  const validationService = new ValidationService();

  describe('Property 2: Preservation - Photo Validation', () => {
    /**
     * **Validates: Requirements 3.1**
     * 
     * Property: Photo files (JPEG, PNG, WebP) within 5MB size limit
     * should continue to be accepted with valid=true
     */
    it('should preserve photo validation for files within 5MB', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('image/jpeg', 'image/png', 'image/webp'),
          fc.integer({ min: 1, max: 5 * 1024 }), // 1KB to 5MB in KB
          (mimeType, fileSizeKB) => {
            const fileSize = fileSizeKB * 1024;
            const maxSize = MAX_FILE_SIZES.photo;
            
            // Only test files within the limit
            if (fileSize > maxSize) {
              return true;
            }

            const file = Buffer.alloc(fileSize);
            const extension = mimeType === 'image/jpeg' ? '.jpg' :
                            mimeType === 'image/png' ? '.png' : '.webp';
            const fileName = `test${extension}`;

            const result = validationService.validateMediaFile(file, fileName, mimeType, 'photo');

            // Photos within size limit should be accepted
            return result.valid === true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve photo validation at exactly 5MB boundary', () => {
      const photoMaxSize = MAX_FILE_SIZES.photo;
      const testCases = [
        { mimeType: 'image/jpeg', extension: '.jpg' },
        { mimeType: 'image/png', extension: '.png' },
        { mimeType: 'image/webp', extension: '.webp' }
      ];

      testCases.forEach(({ mimeType, extension }) => {
        const file = Buffer.alloc(photoMaxSize);
        const result = validationService.validateMediaFile(
          file,
          `test${extension}`,
          mimeType,
          'photo'
        );

        expect(result.valid).toBe(true);
      });
    });
  });

  describe('Property 2: Preservation - Document Validation', () => {
    /**
     * **Validates: Requirements 3.2**
     * 
     * Property: PDF files within 10MB size limit should continue
     * to be accepted with valid=true
     */
    it('should preserve document validation for PDFs within 10MB', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10 * 1024 }), // 1KB to 10MB in KB
          (fileSizeKB) => {
            const fileSize = fileSizeKB * 1024;
            const maxSize = MAX_FILE_SIZES.document;
            
            // Only test files within the limit
            if (fileSize > maxSize) {
              return true;
            }

            const file = Buffer.alloc(fileSize);
            const result = validationService.validateMediaFile(
              file,
              'test.pdf',
              'application/pdf',
              'document'
            );

            // Documents within size limit should be accepted
            return result.valid === true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve document validation at exactly 10MB boundary', () => {
      const docMaxSize = MAX_FILE_SIZES.document;
      const file = Buffer.alloc(docMaxSize);
      
      const result = validationService.validateMediaFile(
        file,
        'test.pdf',
        'application/pdf',
        'document'
      );

      expect(result.valid).toBe(true);
    });
  });

  describe('Property 2: Preservation - Oversized File Rejection', () => {
    /**
     * **Validates: Requirements 3.3**
     * 
     * Property: Files exceeding their respective size limits should
     * continue to be rejected with valid=false and appropriate error message
     */
    it('should preserve oversized photo rejection', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 50 }), // 1MB to 50MB over limit
          (excessMB) => {
            const photoMaxSize = MAX_FILE_SIZES.photo;
            const fileSize = photoMaxSize + (excessMB * 1024 * 1024);
            const file = Buffer.alloc(fileSize);

            const result = validationService.validateMediaFile(
              file,
              'test.jpg',
              'image/jpeg',
              'photo'
            );

            // Oversized photos should be rejected
            return result.valid === false && 
                   result.error?.includes('exceeds maximum') === true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should preserve oversized document rejection', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 50 }), // 1MB to 50MB over limit
          (excessMB) => {
            const docMaxSize = MAX_FILE_SIZES.document;
            const fileSize = docMaxSize + (excessMB * 1024 * 1024);
            const file = Buffer.alloc(fileSize);

            const result = validationService.validateMediaFile(
              file,
              'test.pdf',
              'application/pdf',
              'document'
            );

            // Oversized documents should be rejected
            return result.valid === false && 
                   result.error?.includes('exceeds maximum') === true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should preserve oversized video rejection', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 50 }), // 1MB to 50MB over limit
          (excessMB) => {
            const videoMaxSize = MAX_FILE_SIZES.video;
            const fileSize = videoMaxSize + (excessMB * 1024 * 1024);
            const file = Buffer.alloc(fileSize);

            const result = validationService.validateMediaFile(
              file,
              'test.mp4',
              'video/mp4',
              'video'
            );

            // Oversized videos should be rejected
            return result.valid === false && 
                   result.error?.includes('exceeds maximum') === true;
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 2: Preservation - Invalid MIME Type Rejection', () => {
    /**
     * **Validates: Requirements 3.4**
     * 
     * Property: Files with invalid/unsupported MIME types should
     * continue to be rejected with valid=false
     */
    it('should preserve invalid MIME type rejection for photos', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('video/mp4', 'application/pdf', 'text/plain', 'application/json', 'video/quicktime'),
          (invalidMimeType) => {
            const file = Buffer.alloc(1024);
            const result = validationService.validateMediaFile(
              file,
              'test.jpg',
              invalidMimeType,
              'photo'
            );

            // Invalid MIME types should be rejected
            return result.valid === false;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should preserve invalid MIME type rejection for videos', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('image/jpeg', 'application/pdf', 'text/plain', 'image/png'),
          (invalidMimeType) => {
            const file = Buffer.alloc(1024);
            const result = validationService.validateMediaFile(
              file,
              'test.mp4',
              invalidMimeType,
              'video'
            );

            // Invalid MIME types should be rejected
            return result.valid === false;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should preserve invalid MIME type rejection for documents', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('image/jpeg', 'video/mp4', 'text/plain', 'image/png'),
          (invalidMimeType) => {
            const file = Buffer.alloc(1024);
            const result = validationService.validateMediaFile(
              file,
              'test.pdf',
              invalidMimeType,
              'document'
            );

            // Invalid MIME types should be rejected
            return result.valid === false;
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 2: Preservation - Extension Mismatch Rejection', () => {
    /**
     * **Validates: Requirements 3.5**
     * 
     * Property: Files with mismatched extensions and MIME types should
     * continue to be rejected with valid=false and appropriate error message
     */
    it('should preserve extension mismatch rejection', () => {
      const testCases = [
        { fileName: 'test.jpg', mimeType: 'video/mp4', mediaType: 'video' as MediaType },
        { fileName: 'test.mp4', mimeType: 'image/jpeg', mediaType: 'photo' as MediaType },
        { fileName: 'test.pdf', mimeType: 'image/png', mediaType: 'photo' as MediaType },
        { fileName: 'test.png', mimeType: 'application/pdf', mediaType: 'document' as MediaType },
        { fileName: 'test.jpg', mimeType: 'image/png', mediaType: 'photo' as MediaType },
        { fileName: 'test.mp4', mimeType: 'video/quicktime', mediaType: 'video' as MediaType },
      ];

      testCases.forEach(({ fileName, mimeType, mediaType }) => {
        const file = Buffer.alloc(1024);
        const result = validationService.validateMediaFile(file, fileName, mimeType, mediaType);

        expect(result.valid).toBe(false);
        expect(result.error).toContain('does not match');
      });
    });

    it('should preserve extension mismatch rejection with property testing', () => {
      fc.assert(
        fc.property(
          fc.record({
            extension: fc.constantFrom('.jpg', '.png', '.webp', '.mp4', '.mov', '.pdf'),
            mimeType: fc.constantFrom('image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'application/pdf'),
            mediaType: fc.constantFrom<MediaType>('photo', 'video', 'document')
          }),
          ({ extension, mimeType, mediaType }) => {
            // Define correct mappings
            const correctMappings: Record<string, string> = {
              '.jpg': 'image/jpeg',
              '.jpeg': 'image/jpeg',
              '.png': 'image/png',
              '.webp': 'image/webp',
              '.mp4': 'video/mp4',
              '.mov': 'video/quicktime',
              '.pdf': 'application/pdf'
            };

            const expectedMimeType = correctMappings[extension];
            
            // If extension and MIME type match, skip this test case
            if (expectedMimeType === mimeType) {
              return true;
            }

            const file = Buffer.alloc(1024);
            const fileName = `test${extension}`;
            const result = validationService.validateMediaFile(file, fileName, mimeType, mediaType);

            // Mismatched extension and MIME type should be rejected
            return result.valid === false;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 2: Preservation - Empty File Rejection', () => {
    /**
     * **Validates: Requirements 3.6**
     * 
     * Property: Empty files (0 bytes) should continue to be rejected
     * with valid=false and appropriate error message
     */
    it('should preserve empty file rejection for all media types', () => {
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

            // Empty files should be rejected
            return result.valid === false && 
                   (result.error?.includes('empty') === true || 
                    result.error?.includes('0 bytes') === true);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should preserve empty file rejection with specific error message', () => {
      const testCases = [
        { fileName: 'test.jpg', mimeType: 'image/jpeg', mediaType: 'photo' as MediaType },
        { fileName: 'test.mp4', mimeType: 'video/mp4', mediaType: 'video' as MediaType },
        { fileName: 'test.pdf', mimeType: 'application/pdf', mediaType: 'document' as MediaType },
      ];

      testCases.forEach(({ fileName, mimeType, mediaType }) => {
        const emptyFile = Buffer.alloc(0);
        const result = validationService.validateMediaFile(emptyFile, fileName, mimeType, mediaType);

        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
        expect(
          result.error?.includes('empty') || result.error?.includes('0 bytes')
        ).toBe(true);
      });
    });
  });
});
