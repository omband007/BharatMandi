/**
 * Contextual Prompt Engine
 * 
 * Determines when and what profile data to request based on user interactions.
 */

import { PromptTrackingModel, UserProfileModel } from '../models/profile.model';
import { FIELD_PRIORITY, PROMPT_LIMITS } from '../constants/profile.constants';
import type { UserProfile, PromptTracking, PrivacyLevel } from '../types/profile.types';

export interface PromptOpportunity {
  fieldName: string;
  priority: number;
  reason: string;
  shouldPrompt: boolean;
}

export class ContextualPromptService {
  /**
   * Identify the highest priority missing field to prompt for
   */
  async identifyPromptOpportunity(userId: string, interactionContext?: string): Promise<PromptOpportunity | null> {
    // Get user profile
    const profile = await UserProfileModel.findOne({ userId });
    if (!profile) {
      throw new Error('Profile not found');
    }

    // Get all missing fields
    // Convert Map to Record for type compatibility
    const privacySettingsObj: Record<string, PrivacyLevel> = {};
    profile.privacySettings.forEach((value, key) => {
      privacySettingsObj[key] = value as PrivacyLevel;
    });

    const profileObj: UserProfile = {
      ...profile.toObject(),
      privacySettings: privacySettingsObj
    } as UserProfile;

    const missingFields = this.getMissingFields(profileObj);
    if (missingFields.length === 0) {
      return null; // Profile is complete
    }

    // Check prompt tracking for each missing field
    const eligibleFields: PromptOpportunity[] = [];

    for (const fieldName of missingFields) {
      const tracking = await PromptTrackingModel.findOne({ userId, fieldName });

      // Check if field is eligible for prompting
      const isEligible = await this.isFieldEligibleForPrompt(tracking);
      if (!isEligible) {
        continue;
      }

      const priority = this.getFieldPriority(fieldName);
      const reason = this.getPromptReason(fieldName, interactionContext);

      eligibleFields.push({
        fieldName,
        priority,
        reason,
        shouldPrompt: true
      });
    }

    if (eligibleFields.length === 0) {
      return null;
    }

    // Sort by priority (highest first)
    eligibleFields.sort((a, b) => b.priority - a.priority);

    // Return highest priority field
    return eligibleFields[0];
  }

  /**
   * Get missing profile fields
   */
  private getMissingFields(profile: UserProfile): string[] {
    const missing: string[] = [];

    if (!profile.name) missing.push('name');
    if (!profile.location) missing.push('location');
    if (!profile.userType) missing.push('userType');
    if (!profile.cropsGrown || profile.cropsGrown.length === 0) missing.push('cropsGrown');
    if (!profile.languagePreference) missing.push('languagePreference');
    if (!profile.farmSize) missing.push('farmSize');
    if (!profile.profilePicture) missing.push('profilePicture');
    if (!profile.bankAccount) missing.push('bankAccount');

    return missing;
  }

  /**
   * Get field priority
   */
  private getFieldPriority(fieldName: string): number {
    return (FIELD_PRIORITY as any)[fieldName] || 0;
  }

  /**
   * Get prompt reason based on field and context
   */
  private getPromptReason(fieldName: string, context?: string): string {
    const reasons: Record<string, string> = {
      location: 'To provide accurate weather information and local market prices',
      name: 'To personalize your experience on Bharat Mandi',
      userType: 'To customize features and recommendations for you',
      cropsGrown: 'To provide relevant crop recommendations and market insights',
      languagePreference: 'To communicate in your preferred language',
      farmSize: 'To provide appropriately scaled farming advice',
      profilePicture: 'To build trust with other users in the marketplace',
      bankAccount: 'To enable payment features and transactions'
    };

    return reasons[fieldName] || 'To complete your profile';
  }

  /**
   * Check if field is eligible for prompting
   */
  private async isFieldEligibleForPrompt(tracking: any): Promise<boolean> {
    if (!tracking) {
      return true; // Never prompted before
    }

    // Check if marked as user_declined
    if (tracking.status === 'user_declined') {
      return false;
    }

    // Check if already collected
    if (tracking.status === 'collected') {
      return false;
    }

    // Check dismissal cooldown (24 hours)
    if (tracking.lastDismissedAt) {
      const hoursSinceDismissal = (Date.now() - tracking.lastDismissedAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceDismissal < PROMPT_LIMITS.DISMISSAL_COOLDOWN_HOURS) {
        return false;
      }
    }

    // Check if dismissed too many times
    if (tracking.dismissalCount >= PROMPT_LIMITS.MAX_DISMISSALS) {
      return false;
    }

    return true;
  }

  /**
   * Check if user can receive a prompt now (timing check)
   */
  async canPromptNow(userId: string): Promise<boolean> {
    // Get last prompt time across all fields
    const recentPrompt = await PromptTrackingModel.findOne({
      userId,
      lastPromptedAt: {
        $gte: new Date(Date.now() - PROMPT_LIMITS.MIN_PROMPT_INTERVAL_MINUTES * 60 * 1000)
      }
    });

    return !recentPrompt;
  }

  /**
   * Record that a prompt was shown
   */
  async recordPromptShown(userId: string, fieldName: string): Promise<void> {
    await PromptTrackingModel.findOneAndUpdate(
      { userId, fieldName },
      {
        $inc: { promptCount: 1 },
        $set: { lastPromptedAt: new Date() }
      },
      { upsert: true }
    );
  }

  /**
   * Record that a prompt was dismissed
   */
  async recordPromptDismissed(userId: string, fieldName: string): Promise<void> {
    const tracking = await PromptTrackingModel.findOneAndUpdate(
      { userId, fieldName },
      {
        $inc: { dismissalCount: 1 },
        $set: { lastDismissedAt: new Date() }
      },
      { upsert: true, new: true }
    );

    // Check if should mark as user_declined
    if (tracking && tracking.dismissalCount >= PROMPT_LIMITS.MAX_DISMISSALS) {
      tracking.status = 'user_declined';
      await tracking.save();
    }
  }

  /**
   * Record that a field was collected
   */
  async recordFieldCollected(
    userId: string,
    fieldName: string,
    source: 'explicit_prompt' | 'implicit_update' | 'manual_edit' | 'import'
  ): Promise<void> {
    await PromptTrackingModel.findOneAndUpdate(
      { userId, fieldName },
      {
        $set: {
          status: 'collected',
          collectedAt: new Date(),
          collectionSource: source
        }
      },
      { upsert: true }
    );
  }

  /**
   * Get prompt statistics for a user
   */
  async getPromptStats(userId: string): Promise<any> {
    const trackings = await PromptTrackingModel.find({ userId });

    return {
      totalFields: trackings.length,
      collected: trackings.filter(t => t.status === 'collected').length,
      pending: trackings.filter(t => t.status === 'pending').length,
      declined: trackings.filter(t => t.status === 'user_declined').length,
      trackings: trackings.map(t => ({
        fieldName: t.fieldName,
        status: t.status,
        promptCount: t.promptCount,
        dismissalCount: t.dismissalCount,
        collectionSource: t.collectionSource
      }))
    };
  }
}
