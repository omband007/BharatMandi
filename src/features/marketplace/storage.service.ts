// Storage service for media files
// Handles both cloud storage (AWS S3) and local storage for offline support

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import sharp from 'sharp';
import { THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT, IMAGE_COMPRESSION_QUALITY, SIGNED_URL_EXPIRATION } from './media.constants';
import type { MediaType } from './media.types';

// AWS S3 configuration (requires @aws-sdk/client-s3 and @aws-sdk/s3-request-presigner)
// TODO: Install dependencies: npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
// import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
// import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export class StorageService {
  private s3Client: any; // S3Client when AWS SDK is installed
  private bucketName: string;
  private localStoragePath: string;

  constructor() {
    this.bucketName = process.env.AWS_S3_BUCKET || 'bharat-mandi-media';
    this.localStoragePath = process.env.LOCAL_MEDIA_PATH || path.join(__dirname, '../../../data/media');
    
    // Initialize S3 client (when AWS SDK is installed)
    // this.s3Client = new S3Client({
    //   region: process.env.AWS_REGION || 'us-east-1',
    //   credentials: {
    //     accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    //     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
    //   }
    // });

    // Ensure local storage directory exists
    this.ensureLocalStorageDirectory();
  }

  /**
   * Upload file to cloud storage (AWS S3)
   * @param file - File buffer
   * @param key - Storage key (path)
   * @param mimeType - File MIME type
   * @returns Storage URL
   */
  async uploadFile(file: Buffer, key: string, mimeType: string): Promise<string> {
    try {
      // TODO: Implement S3 upload when AWS SDK is installed
      // const command = new PutObjectCommand({
      //   Bucket: this.bucketName,
      //   Key: key,
      //   Body: file,
      //   ContentType: mimeType
      // });
      // await this.s3Client.send(command);
      // return `https://${this.bucketName}.s3.amazonaws.com/${key}`;

      // Fallback to local storage for development
      console.warn('AWS S3 not configured, using local storage');
      return await this.uploadToLocal(file, key);
    } catch (error) {
      console.error('Error uploading file to S3:', error);
      throw new Error('Failed to upload file to cloud storage');
    }
  }

  /**
   * Delete file from cloud storage (AWS S3)
   * @param key - Storage key (path)
   * @returns Success boolean
   */
  async deleteFile(key: string): Promise<boolean> {
    try {
      // TODO: Implement S3 delete when AWS SDK is installed
      // const command = new DeleteObjectCommand({
      //   Bucket: this.bucketName,
      //   Key: key
      // });
      // await this.s3Client.send(command);
      // return true;

      // Fallback to local storage for development
      console.warn('AWS S3 not configured, using local storage');
      return await this.deleteFromLocal(key);
    } catch (error) {
      console.error('Error deleting file from S3:', error);
      return false;
    }
  }

  /**
   * Generate signed URL for secure file access
   * @param urlOrKey - Storage URL or key (path)
   * @param expiresIn - Expiration time in seconds
   * @returns Signed URL or URL path
   */
  async generateSignedUrl(urlOrKey: string, expiresIn: number = SIGNED_URL_EXPIRATION): Promise<string> {
    try {
      // If it's already a URL path (starts with /), return as-is
      if (urlOrKey.startsWith('/')) {
        return urlOrKey;
      }
      
      // TODO: Implement signed URL generation when AWS SDK is installed
      // const command = new GetObjectCommand({
      //   Bucket: this.bucketName,
      //   Key: urlOrKey
      // });
      // return await getSignedUrl(this.s3Client, command, { expiresIn });

      // For S3 keys (relative paths), convert to URL path for local development
      return `/data/media/${urlOrKey.replace(/\\/g, '/')}`;
    } catch (error) {
      console.error('Error generating signed URL:', error);
      throw new Error('Failed to generate signed URL');
    }
  }

  /**
   * Upload file to local storage (offline support)
   * @param file - File buffer
   * @param filePath - Relative file path
   * @returns URL path for accessing the file
   */
  async uploadToLocal(file: Buffer, filePath: string): Promise<string> {
    try {
      const fullPath = path.join(this.localStoragePath, filePath);
      const directory = path.dirname(fullPath);

      // Ensure directory exists
      if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
      }

      // Write file
      fs.writeFileSync(fullPath, file);
      
      // Return URL path instead of file system path
      // Convert backslashes to forward slashes for URLs
      const urlPath = `/data/media/${filePath.replace(/\\/g, '/')}`;
      return urlPath;
    } catch (error) {
      console.error('Error uploading file to local storage:', error);
      throw new Error('Failed to upload file to local storage');
    }
  }

  /**
   * Delete file from local storage
   * @param filePath - Relative file path
   * @returns Success boolean
   */
  async deleteFromLocal(filePath: string): Promise<boolean> {
    try {
      const fullPath = path.join(this.localStoragePath, filePath);
      
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error deleting file from local storage:', error);
      return false;
    }
  }

  /**
   * Generate thumbnail for image or video
   * @param file - Original file buffer
   * @param mediaType - Type of media (photo or video)
   * @returns Thumbnail buffer
   */
  async generateThumbnail(file: Buffer, mediaType: MediaType): Promise<Buffer> {
    try {
      if (mediaType === 'photo') {
        // Generate thumbnail for photo
        return await sharp(file)
          .resize(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT, {
            fit: 'cover',
            position: 'center'
          })
          .jpeg({ quality: IMAGE_COMPRESSION_QUALITY })
          .toBuffer();
      } else if (mediaType === 'video') {
        // For video, we would need ffmpeg to extract first frame
        // For now, return a placeholder or skip thumbnail generation
        // TODO: Implement video thumbnail generation with ffmpeg
        console.warn('Video thumbnail generation not implemented yet');
        return Buffer.from('');
      } else {
        // No thumbnail for documents
        return Buffer.from('');
      }
    } catch (error) {
      console.error('Error generating thumbnail:', error);
      throw new Error('Failed to generate thumbnail');
    }
  }

  /**
   * Compress image before upload
   * @param file - Original image buffer
   * @returns Compressed image buffer
   */
  async compressImage(file: Buffer): Promise<Buffer> {
    try {
      return await sharp(file)
        .jpeg({ quality: IMAGE_COMPRESSION_QUALITY })
        .toBuffer();
    } catch (error) {
      console.error('Error compressing image:', error);
      throw new Error('Failed to compress image');
    }
  }

  /**
   * Generate storage key for media file
   * @param listingId - Listing ID
   * @param mediaId - Media ID
   * @param fileName - Original file name
   * @returns Storage key
   */
  generateStorageKey(listingId: string, mediaId: string, fileName: string): string {
    const extension = path.extname(fileName);
    return `listings/${listingId}/media/${mediaId}${extension}`;
  }

  /**
   * Generate storage key for thumbnail
   * @param listingId - Listing ID
   * @param mediaId - Media ID
   * @returns Thumbnail storage key
   */
  generateThumbnailKey(listingId: string, mediaId: string): string {
    return `listings/${listingId}/thumbnails/${mediaId}_thumb.jpg`;
  }

  /**
   * Ensure local storage directory exists
   */
  private ensureLocalStorageDirectory(): void {
    if (!fs.existsSync(this.localStoragePath)) {
      fs.mkdirSync(this.localStoragePath, { recursive: true });
      console.log(`✓ Created local storage directory: ${this.localStoragePath}`);
    }
  }

  /**
   * Get file size
   * @param filePath - File path (can be URL path or relative path)
   * @returns File size in bytes
   */
  getFileSize(filePath: string): number {
    try {
      // Convert URL path to file system path if needed
      let fsPath = filePath;
      if (filePath.startsWith('/data/media/')) {
        fsPath = filePath.replace('/data/media/', '');
      }
      
      const fullPath = path.join(this.localStoragePath, fsPath);
      const stats = fs.statSync(fullPath);
      return stats.size;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Check if file exists
   * @param filePath - File path (can be URL path or relative path)
   * @returns Boolean indicating if file exists
   */
  fileExists(filePath: string): boolean {
    try {
      // Convert URL path to file system path if needed
      let fsPath = filePath;
      if (filePath.startsWith('/data/media/')) {
        fsPath = filePath.replace('/data/media/', '');
      }
      
      const fullPath = path.join(this.localStoragePath, fsPath);
      return fs.existsSync(fullPath);
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
export const storageService = new StorageService();
