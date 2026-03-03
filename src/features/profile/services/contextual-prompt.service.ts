/**
 * Contextual Prompt Engine
 * 
 * Determines when and what profile data to request based on user interactions.
 */

import { UserProfileModel } from '../models/profile.sequelize.model';
// TODO: Migrate PromptTrackingModel to Sequelize
// import { PromptTrackingModel } from '../models/profile.model';
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
    const profile = await UserProfileModel.findOne({ where: { userId } });
    if (!profile) {
      throw new Error('Profile not found');
    }

    // Get all missing fields
    const profileObj = profile.toJSON() as UserProfile;
    const missingFields = this.getMissingFields(profileObj);
    if (missingFields.length === 0) {
      return null; // Profile is complete
    }

    // TODO: Re-enable prompt tracking after migrating PromptTrackingModel to Sequelize
    // For now, return the highest priority missing field
    const eligibleFields: PromptOpportunity[] = missingFields.map(fieldName => ({
      fieldName,
      priority: this.getFieldPriority(fieldName),
      reason: this.getPromptReason(fieldName, interactionContext),
      shouldPrompt: true
    }));

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
   * TODO: Re-enable after migrating PromptTrackingModel to Sequelize
   */
  async canPromptNow(userId: string): Promise<boolean> {
    // Temporarily always return true until PromptTrackingModel is migrated
    return true;
  }

  /**
   * Record that a prompt was shown
   * TODO: Re-enable after migrating PromptTrackingModel to Sequelize
   */
  async recordPromptShown(userId: string, fieldName: string): Promise<void> {
    // Temporarily disabled until PromptTrackingModel is migrated
    return;
  }

  /**
   * Record that a prompt was dismissed
   * TODO: Re-enable after migrating PromptTrackingModel to Sequelize
   */
  async recordPromptDismissed(userId: string, fieldName: string): Promise<void> {
    // Temporarily disabled until PromptTrackingModel is migrated
    return;
  }

  /**
   * Record that a field was collected
   * TODO: Re-enable after migrating PromptTrackingModel to Sequelize
   */
  async recordFieldCollected(
    userId: string,
    fieldName: string,
    source: 'explicit_prompt' | 'implicit_update' | 'manual_edit' | 'import'
  ): Promise<void> {
    // Temporarily disabled until PromptTrackingModel is migrated
    return;
  }

  /**
   * Get prompt statistics for a user
   * TODO: Re-enable after migrating PromptTrackingModel to Sequelize
   */
  async getPromptStats(userId: string): Promise<any> {
    // Temporarily return empty stats until PromptTrackingModel is migrated
    return {
      totalFields: 0,
      collected: 0,
      pending: 0,
      declined: 0,
      trackings: []
    };
  }
}
