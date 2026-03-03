/**
 * Profile Manager Service
 * 
 * Core service for profile CRUD operations, completeness calculation,
 * and privacy settings management.
 */

import { UserProfileModel } from '../models/profile.sequelize.model';
import { PROFILE_FIELD_WEIGHTS, VALIDATION_RULES, DEFAULT_PRIVACY_SETTINGS } from '../constants/profile.constants';
import { ProfileCacheService } from './profile-cache.service';
import { validateField } from '../utils/validators';
import type { UserProfile, UpdateProfileFieldRequest, UpdateProfileFieldResponse, PrivacyLevel } from '../types/profile.types';

export class ProfileManagerService {
  private cacheService: ProfileCacheService;

  constructor() {
    this.cacheService = new ProfileCacheService();
  }

  /**
   * Get user profile by userId (with caching)
   */
  async getProfile(userId: string): Promise<UserProfile | null> {
    // Try cache first
    const cached = await this.cacheService.getCachedProfile(userId);
    if (cached) {
      return cached;
    }

    // Fetch from database using Sequelize
    const profile = await UserProfileModel.findOne({ where: { userId } });
    if (!profile) {
      return null;
    }

    // Convert to plain object
    const profileObj = profile.toJSON() as UserProfile;

    // Cache for next time
    await this.cacheService.cacheProfile(userId, profileObj);

    return profileObj;
  }

  /**
   * Update a single profile field
   */
  async updateProfileField(
    userId: string,
    fieldName: string,
    value: any
  ): Promise<UpdateProfileFieldResponse> {
    // Get existing profile
    const profile = await UserProfileModel.findOne({ where: { userId } });
    if (!profile) {
      throw new Error('Profile not found');
    }

    // Validate field value
    if (fieldName === 'mobileNumber') {
      throw new Error('Mobile number cannot be updated without re-verification');
    }

    const validation = validateField(fieldName, value);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Update the field
    (profile as any)[fieldName] = value;

    // Recalculate completion percentage
    const profileObj = profile.toJSON() as UserProfile;
    const completionPercentage = this.calculateCompletionPercentage(profileObj);
    profile.completionPercentage = completionPercentage;

    // Save profile
    await profile.save();

    // Invalidate cache
    await this.cacheService.invalidateProfile(userId);

    return {
      updated: true,
      completionPercentage
    };
  }

  /**
   * Calculate profile completion percentage
   */
  calculateCompletionPercentage(profile: UserProfile): number {
    let total = PROFILE_FIELD_WEIGHTS.mobileNumber; // Always present

    if (profile.name) {
      total += PROFILE_FIELD_WEIGHTS.name;
    }
    if (profile.location) {
      total += PROFILE_FIELD_WEIGHTS.location;
    }
    if (profile.userType) {
      total += PROFILE_FIELD_WEIGHTS.userType;
    }
    if (profile.cropsGrown && profile.cropsGrown.length > 0) {
      total += PROFILE_FIELD_WEIGHTS.cropsGrown;
    }
    if (profile.languagePreference) {
      total += PROFILE_FIELD_WEIGHTS.languagePreference;
    }
    if (profile.farmSize) {
      total += PROFILE_FIELD_WEIGHTS.farmSize;
    }
    if (profile.bankAccount) {
      total += PROFILE_FIELD_WEIGHTS.bankAccount;
    }
    if (profile.profilePicture) {
      total += PROFILE_FIELD_WEIGHTS.profilePicture;
    }

    return total;
  }

  /**
   * Export profile data as JSON
   */
  async exportProfileData(userId: string): Promise<any> {
    const profile = await this.getProfile(userId);
    if (!profile) {
      throw new Error('Profile not found');
    }

    // Include metadata
    return {
      profile,
      metadata: {
        exportedAt: new Date().toISOString(),
        version: '1.0'
      }
    };
  }

  /**
   * Update privacy setting for a field
   */
  async updatePrivacySetting(
    userId: string,
    fieldName: string,
    privacyLevel: PrivacyLevel
  ): Promise<boolean> {
    const profile = await UserProfileModel.findOne({ where: { userId } });
    if (!profile) {
      throw new Error('Profile not found');
    }

    const settings = profile.privacySettings || {};
    settings[fieldName] = privacyLevel;
    profile.privacySettings = settings;
    await profile.save();

    return true;
  }

  /**
   * Get privacy setting for a field
   */
  async getPrivacySetting(userId: string, fieldName: string): Promise<PrivacyLevel> {
    const profile = await UserProfileModel.findOne({ where: { userId } });
    if (!profile) {
      throw new Error('Profile not found');
    }

    return (profile.privacySettings?.[fieldName] as PrivacyLevel) || 'platform_only';
  }

  /**
   * Apply privacy filters to profile data
   */
  applyPrivacyFilters(profile: UserProfile, viewerContext: 'self' | 'public' | 'platform'): Partial<UserProfile> {
    if (viewerContext === 'self') {
      // User viewing their own profile - show everything
      return profile;
    }

    // For platform context, include all basic fields by default
    if (viewerContext === 'platform') {
      return {
        userId: profile.userId,
        mobileNumber: profile.mobileNumber,
        name: profile.name,
        userType: profile.userType,
        location: profile.location,
        profilePicture: profile.profilePicture,
        languagePreference: profile.languagePreference,
        cropsGrown: profile.cropsGrown,
        farmSize: profile.farmSize,
        completionPercentage: profile.completionPercentage,
        membershipTier: profile.membershipTier,
        trustScore: profile.trustScore,
        createdAt: profile.createdAt
      };
    }

    // For public context, only include public fields
    const filtered: any = {
      userId: profile.userId,
      profilePicture: profile.profilePicture,
      membershipTier: profile.membershipTier,
      trustScore: profile.trustScore
    };

    // Apply privacy filters for each field
    Object.keys(profile.privacySettings || {}).forEach(fieldName => {
      const privacyLevel = profile.privacySettings[fieldName];
      const fieldValue = (profile as any)[fieldName];

      if (privacyLevel === 'public') {
        filtered[fieldName] = fieldValue;
      }
    });

    return filtered;
  }

  /**
   * Delete user profile (mark for deletion)
   */
  async deleteProfile(userId: string): Promise<boolean> {
    const profile = await UserProfileModel.findOne({ where: { userId } });
    if (!profile) {
      throw new Error('Profile not found');
    }

    // Anonymize mobile number immediately
    profile.mobileNumber = `DELETED_${Date.now()}`;
    await profile.save();

    // TODO: Implement full deletion after 30 days
    // TODO: Retain transaction records as required by law

    return true;
  }

  /**
   * Update last active timestamp
   */
  async updateLastActive(userId: string): Promise<void> {
    await UserProfileModel.update(
      { lastActiveAt: new Date() },
      { where: { userId } }
    );
  }
}
