// Unit tests for validation service edge cases

import { ValidationService } from '../validation.service';

describe('ValidationService - Edge Cases', () => {
  const validationService = new ValidationService();

  describe('validateFileExtension', () => {
    it('should reject file without extension', () => {
      const result = validationService.validateFileExtension('testfile', 'image/jpeg');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('valid extension');
    });

    it('should reject unsupported extension', () => {
      const result = validationService.validateFileExtension('test.exe', 'application/x-msdownload');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unsupported file extension');
    });

    it('should handle case-insensitive extensions', () => {
      const result1 = validationService.validateFileExtension('test.JPG', 'image/jpeg');
      const result2 = validationService.validateFileExtension('test.jpg', 'image/jpeg');
      
      expect(result1.valid).toBe(true);
      expect(result2.valid).toBe(true);
    });

    it('should reject mismatched extension and MIME type', () => {
      const result = validationService.validateFileExtension('test.jpg', 'video/mp4');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('does not match');
    });
  });

  describe('validateMimeType', () => {
    it('should accept valid photo MIME types', () => {
      expect(validationService.validateMimeType('image/jpeg', 'photo').valid).toBe(true);
      expect(validationService.validateMimeType('image/png', 'photo').valid).toBe(true);
      expect(validationService.validateMimeType('image/webp', 'photo').valid).toBe(true);
    });

    it('should accept valid video MIME types', () => {
      expect(validationService.validateMimeType('video/mp4', 'video').valid).toBe(true);
      expect(validationService.validateMimeType('video/quicktime', 'video').valid).toBe(true);
    });

    it('should accept valid document MIME types', () => {
      expect(validationService.validateMimeType('application/pdf', 'document').valid).toBe(true);
    });

    it('should reject invalid MIME types', () => {
      const result = validationService.validateMimeType('text/plain', 'photo');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid MIME type');
    });
  });

  describe('validateFileSize', () => {
    it('should reject zero-byte files', () => {
      const result = validationService.validateFileSize(0, 'photo');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('empty');
    });

    it('should accept files at exact size limit', () => {
      const photoMaxSize = 5 * 1024 * 1024; // 5MB
      const result = validationService.validateFileSize(photoMaxSize, 'photo');
      expect(result.valid).toBe(true);
    });

    it('should reject files one byte over limit', () => {
      const photoMaxSize = 5 * 1024 * 1024; // 5MB
      const result = validationService.validateFileSize(photoMaxSize + 1, 'photo');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds maximum');
    });

    it('should provide helpful error message with file sizes', () => {
      const oversizedFile = 10 * 1024 * 1024; // 10MB photo (limit is 5MB)
      const result = validationService.validateFileSize(oversizedFile, 'photo');
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('10.00MB');
      expect(result.error).toContain('5MB');
      expect(result.error).toContain('compress');
    });
  });

  describe('detectMediaType', () => {
    it('should detect photo media type from MIME', () => {
      expect(validationService.detectMediaType('image/jpeg')).toBe('photo');
      expect(validationService.detectMediaType('image/png')).toBe('photo');
      expect(validationService.detectMediaType('image/webp')).toBe('photo');
    });

    it('should detect video media type from MIME', () => {
      expect(validationService.detectMediaType('video/mp4')).toBe('video');
      expect(validationService.detectMediaType('video/quicktime')).toBe('video');
    });

    it('should detect document media type from MIME', () => {
      expect(validationService.detectMediaType('application/pdf')).toBe('document');
    });

    it('should return undefined for unsupported MIME type', () => {
      expect(validationService.detectMediaType('text/plain')).toBeUndefined();
      expect(validationService.detectMediaType('application/json')).toBeUndefined();
    });
  });

  describe('detectMediaTypeFromExtension', () => {
    it('should detect media type from photo extensions', () => {
      expect(validationService.detectMediaTypeFromExtension('photo.jpg')).toBe('photo');
      expect(validationService.detectMediaTypeFromExtension('image.png')).toBe('photo');
      expect(validationService.detectMediaTypeFromExtension('pic.webp')).toBe('photo');
    });

    it('should detect media type from video extensions', () => {
      expect(validationService.detectMediaTypeFromExtension('video.mp4')).toBe('video');
      expect(validationService.detectMediaTypeFromExtension('clip.mov')).toBe('video');
    });

    it('should detect media type from document extensions', () => {
      expect(validationService.detectMediaTypeFromExtension('doc.pdf')).toBe('document');
    });

    it('should handle case-insensitive extensions', () => {
      expect(validationService.detectMediaTypeFromExtension('photo.JPG')).toBe('photo');
      expect(validationService.detectMediaTypeFromExtension('video.MP4')).toBe('video');
      expect(validationService.detectMediaTypeFromExtension('doc.PDF')).toBe('document');
    });

    it('should return undefined for unsupported extension', () => {
      expect(validationService.detectMediaTypeFromExtension('file.txt')).toBeUndefined();
      expect(validationService.detectMediaTypeFromExtension('file.exe')).toBeUndefined();
    });
  });

  describe('getUserFriendlyError', () => {
    it('should return user-friendly message for size errors', () => {
      const error = 'File size 10.00MB exceeds maximum allowed size of 5MB';
      const friendly = validationService.getUserFriendlyError(error);
      expect(friendly).toContain('10.00MB');
      expect(friendly).toContain('5MB');
    });

    it('should return user-friendly message for extension errors', () => {
      const error = 'Unsupported file extension: .exe';
      const friendly = validationService.getUserFriendlyError(error);
      expect(friendly).toContain('valid file type');
      expect(friendly).toContain('JPEG');
    });

    it('should return user-friendly message for MIME type errors', () => {
      const error = 'Invalid MIME type text/plain for photo';
      const friendly = validationService.getUserFriendlyError(error);
      expect(friendly).toContain('not supported');
    });

    it('should return user-friendly message for empty file errors', () => {
      const error = 'File is empty (0 bytes)';
      const friendly = validationService.getUserFriendlyError(error);
      expect(friendly).toContain('empty or corrupted');
    });

    it('should return generic message for unknown errors', () => {
      const error = 'Some unknown error';
      const friendly = validationService.getUserFriendlyError(error);
      expect(friendly).toContain('validation failed');
    });
  });

  describe('validateMediaFile - Integration', () => {
    it('should validate complete valid photo', () => {
      const file = Buffer.alloc(1024 * 1024); // 1MB
      const result = validationService.validateMediaFile(file, 'photo.jpg', 'image/jpeg', 'photo');
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should validate complete valid video', () => {
      const file = Buffer.alloc(10 * 1024 * 1024); // 10MB
      const result = validationService.validateMediaFile(file, 'video.mp4', 'video/mp4', 'video');
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should validate complete valid document', () => {
      const file = Buffer.alloc(2 * 1024 * 1024); // 2MB
      const result = validationService.validateMediaFile(file, 'doc.pdf', 'application/pdf', 'document');
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject file with multiple validation errors', () => {
      const file = Buffer.alloc(0); // Empty file
      const result = validationService.validateMediaFile(file, 'test.exe', 'application/x-msdownload', 'photo');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
