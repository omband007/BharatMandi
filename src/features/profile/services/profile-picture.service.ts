/**
 * Profile Picture Service
 * 
 * Handles profile picture upload, processing, and storage.
 */

import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import { UserProfileModel } from '../models/profile.model';
import { ContextualPromptService } from './contextual-prompt.service';
import { validateProfilePicture } from '../utils/validators';
import { VALIDATION_RULES } from '../constants/profile.constants';
import type { ProfilePicture } from '../types/profile.types';

export class ProfilePictureService {
  private promptService: ContextualPromptService;
  private storageBasePath: string;

  constructor() {
    this.promptService = new ContextualPromptService();
    // In production, this would be S3 bucket or Cloudinary URL
    this.storageBasePath = process.env.PROFILE_PICTURE_STORAGE_PATH || '/uploads/profile-pictures';
  }

  /**
   * Upload and process profile picture
   */
  async uploadProfilePicture(
    userId: string,
    fileBuffer: Buffer,
    mimeType: string,
    originalSize: number
  ): Promise<ProfilePicture> {
    // Validate file
    const validation = validateProfilePicture({
      size: originalSize,
      mimetype: mimeType
    });

    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Check content moderation
    const isSafe = await this.moderateContent(fileBuffer);
    if (!isSafe) {
      throw new Error('Profile picture contains inappropriate content');
    }

    // Generate unique filename
    const fileId = uuidv4();
    const extension = this.getExtensionFromMimeType(mimeType);

    // Process images
    const fullImagePath = await this.resizeAndSave(
      fileBuffer,
      fileId,
      extension,
      VALIDATION_RULES.PROFILE_PICTURE.DIMENSIONS.FULL.width,
      VALIDATION_RULES.PROFILE_PICTURE.DIMENSIONS.FULL.height
    );

    const thumbnailPath = await this.resizeAndSave(
      fileBuffer,
      `${fileId}_thumb`,
      extension,
      VALIDATION_RULES.PROFILE_PICTURE.DIMENSIONS.THUMBNAIL.width,
      VALIDATION_RULES.PROFILE_PICTURE.DIMENSIONS.THUMBNAIL.height
    );

    // Create profile picture object
    const profilePicture: ProfilePicture = {
      url: fullImagePath,
      thumbnailUrl: thumbnailPath,
      uploadedAt: new Date()
    };

    // Update profile
    const profile = await UserProfileModel.findOne({ userId });
    if (!profile) {
      throw new Error('Profile not found');
    }

    // Delete old profile picture if exists
    if (profile.profilePicture) {
      await this.deleteStoredImages(profile.profilePicture);
    }

    profile.profilePicture = profilePicture;
    profile.updatedAt = new Date();
    await profile.save();

    // Record collection
    await this.promptService.recordFieldCollected(userId, 'profilePicture', 'manual_edit');

    return profilePicture;
  }

  /**
   * Resize and save image
   */
  private async resizeAndSave(
    buffer: Buffer,
    fileId: string,
    extension: string,
    width: number,
    height: number
  ): Promise<string> {
    const filename = `${fileId}.${extension}`;
    const filepath = `${this.storageBasePath}/${filename}`;

    // Resize image using sharp
    const resizedBuffer = await sharp(buffer)
      .resize(width, height, {
        fit: 'cover',
        position: 'center'
      })
      .toFormat(extension === 'png' ? 'png' : 'jpeg', {
        quality: 85
      })
      .toBuffer();

    // In production, upload to S3 or Cloudinary
    // For now, just return the path
    // Example with S3:
    // await s3Client.putObject({
    //   Bucket: process.env.S3_BUCKET,
    //   Key: filepath,
    //   Body: resizedBuffer,
    //   ContentType: `image/${extension}`
    // });

    console.log(`[ProfilePicture] Saved ${width}x${height} image: ${filepath}`);

    return filepath;
  }

  /**
   * Moderate content using AWS Rekognition or similar
   */
  private async moderateContent(buffer: Buffer): Promise<boolean> {
    // TODO: Integrate with AWS Rekognition or Clarifai
    // For now, just return true (safe)

    console.log('[ProfilePicture] Content moderation check (placeholder)');

    // Example with AWS Rekognition:
    // const rekognition = new AWS.Rekognition();
    // const result = await rekognition.detectModerationLabels({
    //   Image: { Bytes: buffer },
    //   MinConfidence: 60
    // }).promise();
    //
    // const unsafeLabels = result.ModerationLabels?.filter(
    //   label => label.Confidence && label.Confidence > 60
    // );
    //
    // return !unsafeLabels || unsafeLabels.length === 0;

    return true;
  }

  /**
   * Get file extension from MIME type
   */
  private getExtensionFromMimeType(mimeType: string): string {
    const map: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp'
    };
    return map[mimeType] || 'jpg';
  }

  /**
   * Delete stored images
   */
  private async deleteStoredImages(profilePicture: ProfilePicture): Promise<void> {
    // In production, delete from S3 or Cloudinary
    console.log(`[ProfilePicture] Deleting images: ${profilePicture.url}, ${profilePicture.thumbnailUrl}`);

    // Example with S3:
    // await s3Client.deleteObject({
    //   Bucket: process.env.S3_BUCKET,
    //   Key: profilePicture.url
    // });
    // await s3Client.deleteObject({
    //   Bucket: process.env.S3_BUCKET,
    //   Key: profilePicture.thumbnailUrl
    // });
  }

  /**
   * Remove profile picture
   */
  async removeProfilePicture(userId: string): Promise<boolean> {
    const profile = await UserProfileModel.findOne({ userId });
    if (!profile) {
      throw new Error('Profile not found');
    }

    if (!profile.profilePicture) {
      return false; // No picture to remove
    }

    // Delete stored images
    await this.deleteStoredImages(profile.profilePicture);

    // Remove from profile
    profile.profilePicture = undefined;
    profile.updatedAt = new Date();
    await profile.save();

    return true;
  }

  /**
   * Get profile picture
   */
  async getProfilePicture(userId: string): Promise<ProfilePicture | null> {
    const profile = await UserProfileModel.findOne({ userId });
    return profile?.profilePicture || null;
  }

  /**
   * Get default avatar URL
   */
  getDefaultAvatar(): string {
    return '/assets/default-avatar.png';
  }
}
