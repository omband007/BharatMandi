// Storage service for media files
// Handles both cloud storage (AWS S3) and local storage for offline support

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import sharp from 'sharp';
import { THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT, IMAGE_COMPRESSION_QUALITY, SIGNED_URL_EXPIRATION } from './media.constants';
import type { MediaType } from './media.types';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getEnvironmentConfig } from '../../config/environment';

const config = getEnvironmentConfig();

export class StorageService {
  private s3Client: S3Client | null;
  private bucketName: string;
  private localStoragePath: string;
  private useS3: boolean;

  constructor() {
    this.useS3 = config.aws.s3.useS3ForListings;
    this.bucketName = config.aws.s3.listingsBucket;
    this.localStoragePath = process.env.LOCAL_MEDIA_PATH || path.join(__dirname, '../../../data/media');
    
    // Initialize S3 client if S3 is enabled
    if (this.useS3) {
      this.s3Client = new S3Client({
        region: config.aws.region,
        credentials: {
          accessKeyId: config.aws.accessKeyId,
          secretAccessKey: config.aws.secretAccessKey
        }
      });
      console.log(`✓ S3 storage enabled: ${this.bucketName}`);
    } else {
      this.s3Client = null;
      console.log('✓ Local storage enabled (S3 disabled)');
    }

    // Ensure local storage directory exists
    this.ensureLocalStorageDirectory();
  }

  /**
   * Upload file to cloud storage (AWS S3) or local storage
   * @param file - File buffer
   * @param key - Storage key (path)
   * @param mimeType - File MIME type
   * @returns Storage URL
   */
  async uploadFile(file: Buffer, key: string, mimeType: string): Promise<string> {
    try {
      if (this.useS3 && this.s3Client) {
        // Upload to S3
        const command = new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: file,
          ContentType: mimeType
        });
        await this.s3Client.send(command);
        
        // Return S3 URL
        return `https://${this.bucketName}.s3.${config.aws.region}.amazonaws.com/${key}`;
      } else {
        // Fallback to local storage
        return await this.uploadToLocal(file, key);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      throw new Error('Failed to upload file');
    }
  }

  /**
   * Delete file from cloud storage (AWS S3) or local storage
   * @param key - Storage key (path)
   * @returns Success boolean
   */
  async deleteFile(key: string): Promise<boolean> {
    try {
      if (this.useS3 && this.s3Client) {
        // Delete from S3
        const command = new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: key
        });
        await this.s3Client.send(command);
        return true;
      } else {
        // Fallback to local storage
        return await this.deleteFromLocal(key);
      }
    } catch (error) {
      console.error('Error deleting file:', error);
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
      
      // If it's an S3 URL, extract the key
      if (urlOrKey.startsWith('https://')) {
        // For S3 URLs, they're already public (we configured public read access)
        return urlOrKey;
      }
      
      if (this.useS3 && this.s3Client) {
        // Generate signed URL for S3
        const command = new GetObjectCommand({
          Bucket: this.bucketName,
          Key: urlOrKey
        });
        return await getSignedUrl(this.s3Client, command, { expiresIn });
      } else {
        // For local storage, convert to URL path
        return `/data/media/${urlOrKey.replace(/\\/g, '/')}`;
      }
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
