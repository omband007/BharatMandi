/**
 * User Profile Sequelize Model (PostgreSQL)
 * 
 * Replaces MongoDB UserProfileModel with PostgreSQL implementation
 */

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../../../shared/database/sequelize-config';
import type { UserProfile, Location, ProfilePicture, BankAccount, FarmSize, CropGrown, Points, TrustScoreHistoryEntry, PrivacyLevel } from '../types/profile.types';

// Attributes for creation (optional fields)
interface UserProfileCreationAttributes extends Optional<UserProfile, 
  'name' | 'profilePicture' | 'location' | 'userType' | 'cropsGrown' | 
  'farmSize' | 'languagePreference' | 'bankAccount' | 'pinHash' | 
  'biometricEnabled' | 'failedLoginAttempts' | 'lockedUntil' | 'lastLoginAt' | 
  'completionPercentage' | 'createdAt' | 'updatedAt' | 'lastActiveAt' | 
  'privacySettings' | 'points' | 'membershipTier' | 'referralCode' | 
  'referredBy' | 'dailyStreak' | 'lastStreakDate' | 'trustScore'
> {}

// Sequelize Model Class
class UserProfileModel extends Model<UserProfile, UserProfileCreationAttributes> implements UserProfile {
  // Identity
  declare userId: string;
  declare mobileNumber: string;
  declare countryCode: string;
  declare mobileVerified: boolean;
  
  // Basic Information
  declare name?: string;
  declare profilePicture?: ProfilePicture;
  
  // Location
  declare location?: Location;
  
  // Farming Details
  declare userType?: 'farmer' | 'buyer' | 'both';
  declare cropsGrown?: CropGrown[];
  declare farmSize?: FarmSize;
  
  // Preferences
  declare languagePreference?: string;
  
  // Financial
  declare bankAccount?: BankAccount;
  
  // Authentication & Security
  declare pinHash?: string;
  declare biometricEnabled: boolean;
  declare failedLoginAttempts: number;
  declare lockedUntil?: Date;
  declare lastLoginAt?: Date;
  
  // Metadata
  declare completionPercentage: number;
  declare createdAt: Date;
  declare updatedAt: Date;
  declare lastActiveAt?: Date;
  
  // Privacy
  declare privacySettings: Record<string, PrivacyLevel>;
  
  // Gamification
  declare points: Points;
  declare membershipTier: 'bronze' | 'silver' | 'gold' | 'platinum';
  declare referralCode: string;
  declare referredBy?: string;
  declare dailyStreak: number;
  declare lastStreakDate?: Date;
  
  // Trust
  declare trustScore: number;
  declare trustScoreHistory: TrustScoreHistoryEntry[];
}

// Initialize model
UserProfileModel.init(
  {
    // Identity
    userId: {
      type: DataTypes.STRING(255),
      primaryKey: true,
      field: 'user_id'
    },
    mobileNumber: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
      field: 'mobile_number'
    },
    countryCode: {
      type: DataTypes.STRING(10),
      allowNull: false,
      field: 'country_code'
    },
    mobileVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'mobile_verified'
    },
    
    // Basic Information
    name: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    profilePicture: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'profile_picture'
    },
    
    // Location (JSONB for flexibility)
    location: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    
    // User Details
    userType: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        isIn: [['farmer', 'buyer', 'both']]
      },
      field: 'user_type'
    },
    cropsGrown: {
      type: DataTypes.JSONB,
      defaultValue: [],
      field: 'crops_grown'
    },
    farmSize: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'farm_size'
    },
    languagePreference: {
      type: DataTypes.STRING(10),
      allowNull: true,
      field: 'language_preference'
    },
    
    // Financial
    bankAccount: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'bank_account'
    },
    
    // Authentication & Security
    pinHash: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'pin_hash'
    },
    biometricEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'biometric_enabled'
    },
    failedLoginAttempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'failed_login_attempts'
    },
    lockedUntil: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'locked_until'
    },
    lastLoginAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_login_at'
    },
    
    // Metadata
    completionPercentage: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'completion_percentage'
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_at'
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'updated_at'
    },
    lastActiveAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_active_at'
    },
    
    // Privacy (JSONB for flexible field-level settings)
    privacySettings: {
      type: DataTypes.JSONB,
      defaultValue: {},
      field: 'privacy_settings'
    },
    
    // Gamification
    points: {
      type: DataTypes.JSONB,
      defaultValue: {
        current: 0,
        lifetime: 0,
        lastUpdated: new Date()
      }
    },
    membershipTier: {
      type: DataTypes.STRING(20),
      defaultValue: 'bronze',
      validate: {
        isIn: [['bronze', 'silver', 'gold', 'platinum']]
      },
      field: 'membership_tier'
    },
    referralCode: {
      type: DataTypes.STRING(20),
      unique: true,
      field: 'referral_code'
    },
    referredBy: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'referred_by'
    },
    dailyStreak: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'daily_streak'
    },
    lastStreakDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'last_streak_date'
    },
    
    // Trust
    trustScore: {
      type: DataTypes.INTEGER,
      defaultValue: 50,
      field: 'trust_score'
    },
    trustScoreHistory: {
      type: DataTypes.JSONB,
      defaultValue: [],
      field: 'trust_score_history'
    }
  },
  {
    sequelize,
    tableName: 'user_profiles',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['mobile_number'] },
      { fields: ['referral_code'] },
      { fields: ['membership_tier'] },
      { fields: ['trust_score'] },
      { fields: ['created_at'] }
    ]
  }
);

export { UserProfileModel };
export default UserProfileModel;
