/**
 * S3 Service
 * 
 * Handles image storage operations for crop disease diagnosis.
 * 
 * Requirements:
 * - 1.6: Store images in S3 with unique identifiers
 * - 1.7: Generate secure, time-limited URLs valid for 24 hours
 * - 12.4: Compress images to max 5MB while maintaining quality
 * - 14.2: Server-side encryption for stored images
 * - 14.6: Support image deletion
 */

import sharp from 'sharp';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getEnvironmentConfig } from '../../../config/environment';

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_COMPRESSED_SIZE = 5 * 1024 * 1024; // 5MB for Bedrock
const DEFAULT_EXPIRY_HOURS = 24; // 24 hours for presigned URLs

// ============================================================================
// TYPES
// ============================================================================

export interface ImageMetadata {
  userId: string;
  diagnosisId: string;
  uploadedAt: Date;
  originalFilename: string;
  contentType: string;
}

export interface UploadResult {
  key: string;
  url: string;
  sizeBytes: number;
}

// ============================================================================
// S3 SERVICE
// ============================================================================

export class S3Service {
  private s3Client: S3Client | null = null;
  private bucketName: string;

  constructor() {
    const config = getEnvironmentConfig();
    
    // Initialize S3 client if credentials are available
    if (config.aws.accessKeyId && config.aws.secretAccessKey) {
      this.s3Client = new S3Client({
        region: config.aws.region,
        credentials: {
          accessKeyId: config.aws.accessKeyId,
          secretAccessKey: config.aws.secretAccessKey
        }
      });
    }
    
    this.bucketName = config.aws.s3.cropDiagnosisBucket || 'bharat-mandi-crop-diagnosis';
  }

  /**
   * Compress image to meet Bedrock requirements
   * 
   * Requirement 12.4: Compress images to max 5MB while maintaining quality
   * 
   * Strategy:
   * - Start with quality 85
   * - Resize to max 1920x1920 if needed
   * - Reduce quality in steps if still too large
   * - Minimum quality: 60
   */
  async compressImage(file: Buffer): Promise<Buffer> {
    try {
      const metadata = await sharp(file).metadata();
      
      // Check if image needs resizing
      const needsResize = (metadata.width || 0) > 1920 || (metadata.height || 0) > 1920;
      
      // If already under 5MB, in JPEG format, and doesn't need resizing, return as-is
      if (file.length <= MAX_COMPRESSED_SIZE && metadata.format === 'jpeg' && !needsResize) {
        return file;
      }

      // Start with quality 85
      let quality = 85;
      let compressed: Buffer;
      
      // Apply resize and/or convert to JPEG
      if (needsResize) {
        compressed = await sharp(file)
          .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality, progressive: true })
          .toBuffer();
      } else {
        // Just convert to JPEG without resizing
        compressed = await sharp(file)
          .jpeg({ quality, progressive: true })
          .toBuffer();
      }

      // Reduce quality if still too large
      while (compressed.length > MAX_COMPRESSED_SIZE && quality > 60) {
        quality -= 5;
        if (needsResize) {
          compressed = await sharp(file)
            .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality, progressive: true })
            .toBuffer();
        } else {
          compressed = await sharp(file)
            .jpeg({ quality, progressive: true })
            .toBuffer();
        }
      }

      return compressed;
    } catch (error) {
      throw new Error(`Failed to compress image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Upload image to S3
   * 
   * Requirement 1.6: Store images in S3 with unique identifiers
   * Requirement 14.2: Server-side AES-256 encryption
   * 
   * S3 Key Format: diagnoses/{userId}/{diagnosisId}/{timestamp}.jpg
   * 
   * @param buffer - Image buffer (should be compressed)
   * @param metadata - Image metadata
   * @returns S3 key of uploaded image
   */
  async uploadImage(buffer: Buffer, metadata: ImageMetadata): Promise<string> {
    if (!this.s3Client) {
      throw new Error('S3 client not initialized. Check AWS credentials.');
    }

    try {
      // Generate unique S3 key
      const timestamp = Date.now();
      const s3Key = `diagnoses/${metadata.userId}/${metadata.diagnosisId}/${timestamp}.jpg`;

      // Upload to S3 with server-side encryption
      await this.s3Client.send(new PutObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
        Body: buffer,
        ContentType: metadata.contentType,
        ServerSideEncryption: 'AES256', // Requirement 14.2
        Metadata: {
          userId: metadata.userId,
          diagnosisId: metadata.diagnosisId,
          uploadedAt: metadata.uploadedAt.toISOString(),
          originalFilename: metadata.originalFilename
        }
      }));

      return s3Key;
    } catch (error) {
      throw new Error(`Failed to upload image to S3: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate presigned URL for image access
   * 
   * Requirement 1.7: Generate secure, time-limited URLs valid for 24 hours
   * 
   * @param key - S3 key of the image
   * @param expiryHours - URL expiry time in hours (default: 24)
   * @returns Presigned URL
   */
  async generatePresignedUrl(key: string, expiryHours: number = DEFAULT_EXPIRY_HOURS): Promise<string> {
    if (!this.s3Client) {
      throw new Error('S3 client not initialized. Check AWS credentials.');
    }

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key
      });

      const url = await getSignedUrl(this.s3Client, command, {
        expiresIn: expiryHours * 3600 // Convert hours to seconds
      });

      return url;
    } catch (error) {
      throw new Error(`Failed to generate presigned URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete image from S3
   * 
   * Requirement 14.6: Support image deletion
   * 
   * @param key - S3 key of the image to delete
   */
  async deleteImage(key: string): Promise<void> {
    if (!this.s3Client) {
      throw new Error('S3 client not initialized. Check AWS credentials.');
    }

    try {
      await this.s3Client.send(new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key
      }));
    } catch (error) {
      throw new Error(`Failed to delete image from S3: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get S3 bucket name
   * 
   * @returns Configured S3 bucket name
   */
  getBucketName(): string {
    return this.bucketName;
  }

  /**
   * Check if S3 client is initialized
   * 
   * @returns True if S3 client is ready
   */
  isInitialized(): boolean {
    return this.s3Client !== null;
  }
}

// Export singleton instance
export const s3Service = new S3Service();
