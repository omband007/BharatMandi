/**
 * Implicit Update Service
 * 
 * Automatically updates profile fields from user interactions.
 */

import { UserProfileModel } from '../models/profile.model';
import { ContextualPromptService } from './contextual-prompt.service';
import type { UserProfile, CropGrown, UserType } from '../types/profile.types';

export class ImplicitUpdateService {
  private promptService: ContextualPromptService;
  private languageMessageCount: Map<string, { language: string; count: number }>;

  constructor() {
    this.promptService = new ContextualPromptService();
    this.languageMessageCount = new Map();
  }

  /**
   * Detect and update language preference from message
   */
  async detectAndUpdateLanguage(userId: string, messageText: string): Promise<boolean> {
    // Detect language (simplified - in production, use AWS Comprehend or Google Cloud Translation)
    const detectedLanguage = this.detectLanguage(messageText);
    if (!detectedLanguage) {
      return false;
    }

    // Get current profile
    const profile = await UserProfileModel.findOne({ userId });
    if (!profile) {
      return false;
    }

    // If no language preference set, set it immediately with high confidence
    if (!profile.languagePreference) {
      profile.languagePreference = detectedLanguage as 'en' | 'hi' | 'pa' | 'ta' | 'te' | 'mr';
      profile.updatedAt = new Date();
      await profile.save();

      // Record collection
      await this.promptService.recordFieldCollected(userId, 'languagePreference', 'implicit_update');
      return true;
    }

    // If language is different, track consecutive messages
    if (profile.languagePreference !== detectedLanguage) {
      const key = `${userId}:${detectedLanguage}`;
      const current = this.languageMessageCount.get(key) || { language: detectedLanguage, count: 0 };
      current.count++;
      this.languageMessageCount.set(key, current);

      // Switch after 3 consecutive messages in new language
      if (current.count >= 3) {
        profile.languagePreference = detectedLanguage as 'en' | 'hi' | 'pa' | 'ta' | 'te' | 'mr';
        profile.updatedAt = new Date();
        await profile.save();

        // Clear counter
        this.languageMessageCount.delete(key);

        return true;
      }
    } else {
      // Reset counter if back to current language
      const keys = Array.from(this.languageMessageCount.keys()).filter(k => k.startsWith(`${userId}:`));
      keys.forEach(k => this.languageMessageCount.delete(k));
    }

    return false;
  }

  /**
   * Simple language detection (in production, use external API)
   */
  private detectLanguage(text: string): string | null {
    // Simple heuristic-based detection
    // In production, use AWS Comprehend or Google Cloud Translation API

    // Hindi detection (Devanagari script)
    if (/[\u0900-\u097F]/.test(text)) {
      return 'hi';
    }

    // Punjabi detection (Gurmukhi script)
    if (/[\u0A00-\u0A7F]/.test(text)) {
      return 'pa';
    }

    // Tamil detection
    if (/[\u0B80-\u0BFF]/.test(text)) {
      return 'ta';
    }

    // Telugu detection
    if (/[\u0C00-\u0C7F]/.test(text)) {
      return 'te';
    }

    // Marathi detection (also uses Devanagari, harder to distinguish from Hindi)
    // Would need more sophisticated detection in production

    // Default to English if only Latin characters
    if (/^[a-zA-Z0-9\s.,!?'"]+$/.test(text)) {
      return 'en';
    }

    return null;
  }

  /**
   * Add crop to user's crops_grown list from image upload
   */
  async addCropFromImage(userId: string, cropName: string, confidence: number): Promise<boolean> {
    if (confidence < 0.8) {
      return false; // Only add if confidence > 80%
    }

    const profile = await UserProfileModel.findOne({ userId });
    if (!profile) {
      return false;
    }

    // Check if crop already exists
    const existingCrop = profile.cropsGrown?.find(c => c.cropName.toLowerCase() === cropName.toLowerCase());
    if (existingCrop) {
      return false; // Already exists
    }

    // Add crop
    const newCrop: CropGrown = {
      cropName,
      source: 'image_upload',
      addedAt: new Date()
    };

    if (!profile.cropsGrown) {
      profile.cropsGrown = [] as any;
    }
    profile.cropsGrown.push(newCrop as any);
    profile.updatedAt = new Date();
    await profile.save();

    // Record collection if this is the first crop
    if (profile.cropsGrown.length === 1) {
      await this.promptService.recordFieldCollected(userId, 'cropsGrown', 'implicit_update');
    }

    return true;
  }

  /**
   * Add crop from price query
   */
  async addCropFromPriceQuery(userId: string, cropName: string): Promise<boolean> {
    const profile = await UserProfileModel.findOne({ userId });
    if (!profile) {
      return false;
    }

    // Check if crop already exists
    const existingCrop = profile.cropsGrown?.find(c => c.cropName.toLowerCase() === cropName.toLowerCase());
    if (existingCrop) {
      return false;
    }

    // Add crop
    const newCrop: CropGrown = {
      cropName,
      source: 'price_query',
      addedAt: new Date()
    };

    if (!profile.cropsGrown) {
      profile.cropsGrown = [] as any;
    }
    profile.cropsGrown.push(newCrop as any);
    profile.updatedAt = new Date();
    await profile.save();

    // Record collection if this is the first crop
    if (profile.cropsGrown.length === 1) {
      await this.promptService.recordFieldCollected(userId, 'cropsGrown', 'implicit_update');
    }

    return true;
  }

  /**
   * Add crop from sale post
   */
  async addCropFromSalePost(userId: string, cropName: string): Promise<boolean> {
    const profile = await UserProfileModel.findOne({ userId });
    if (!profile) {
      return false;
    }

    // Check if crop already exists
    const existingCrop = profile.cropsGrown?.find(c => c.cropName.toLowerCase() === cropName.toLowerCase());
    if (existingCrop) {
      return false;
    }

    // Add crop
    const newCrop: CropGrown = {
      cropName,
      source: 'sale_post',
      addedAt: new Date()
    };

    if (!profile.cropsGrown) {
      profile.cropsGrown = [] as any;
    }
    profile.cropsGrown.push(newCrop as any);
    profile.updatedAt = new Date();
    await profile.save();

    // Record collection if this is the first crop
    if (profile.cropsGrown.length === 1) {
      await this.promptService.recordFieldCollected(userId, 'cropsGrown', 'implicit_update');
    }

    return true;
  }

  /**
   * Infer user type from marketplace behavior
   */
  async inferUserType(userId: string, behavior: 'selling' | 'buying'): Promise<boolean> {
    const profile = await UserProfileModel.findOne({ userId });
    if (!profile) {
      return false;
    }

    let updated = false;
    let newUserType: UserType | undefined;

    if (behavior === 'selling') {
      if (!profile.userType) {
        newUserType = 'farmer';
        updated = true;
      } else if (profile.userType === 'buyer') {
        newUserType = 'both';
        updated = true;
      }
    } else if (behavior === 'buying') {
      if (!profile.userType) {
        newUserType = 'buyer';
        updated = true;
      } else if (profile.userType === 'farmer') {
        newUserType = 'both';
        updated = true;
      }
    }

    if (updated && newUserType) {
      profile.userType = newUserType;
      profile.updatedAt = new Date();
      await profile.save();

      // Record collection
      await this.promptService.recordFieldCollected(userId, 'userType', 'implicit_update');
      return true;
    }

    return false;
  }

  /**
   * Check if user should be explicitly prompted for user type
   */
  async shouldPromptForUserType(userId: string): Promise<boolean> {
    const profile = await UserProfileModel.findOne({ userId });
    if (!profile || profile.userType) {
      return false; // Already has user type
    }

    // Count user interactions (simplified - in production, track actual interactions)
    // For now, just check if profile is old enough
    const daysSinceCreation = (Date.now() - profile.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    
    // Prompt after 5 days if still no user type
    return daysSinceCreation >= 5;
  }
}
