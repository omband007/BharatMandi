/**
 * Profile Database Schemas
 * 
 * MongoDB schemas for profile management collections.
 */

import { Schema } from 'mongoose';

// ============================================================================
// USER PROFILE SCHEMA
// ============================================================================

const LocationSchema = new Schema({
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  addressLine1: { type: String },
  addressLine2: { type: String },
  city: { type: String },
  district: { type: String },
  state: { type: String },
  pincode: { type: String },
  country: { type: String, required: true, default: 'India' },
  locationType: { type: String, enum: ['gps', 'manual'], required: true },
  isVerified: { type: Boolean, default: false },
  lastUpdated: { type: Date, default: Date.now }
}, { _id: false });

const ProfilePictureSchema = new Schema({
  url: { type: String, required: true },
  thumbnailUrl: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now }
}, { _id: false });

const CropGrownSchema = new Schema({
  cropName: { type: String, required: true },
  source: { 
    type: String, 
    enum: ['image_upload', 'price_query', 'sale_post'], 
    required: true 
  },
  addedAt: { type: Date, default: Date.now }
}, { _id: false });

const FarmSizeSchema = new Schema({
  value: { type: Number, required: true, min: 0.1, max: 10000 },
  unit: { type: String, enum: ['acres', 'hectares'], required: true }
}, { _id: false });

const BankAccountSchema = new Schema({
  accountNumber: { type: String, required: true },
  ifscCode: { type: String, required: true },
  verified: { type: Boolean, default: false }
}, { _id: false });

const PointsSchema = new Schema({
  current: { type: Number, default: 0, min: 0 },
  lifetime: { type: Number, default: 0, min: 0 },
  lastUpdated: { type: Date, default: Date.now }
}, { _id: false });

const TrustScoreHistorySchema = new Schema({
  timestamp: { type: Date, default: Date.now },
  change: { type: Number, required: true },
  reason: { type: String, required: true },
  newScore: { type: Number, required: true, min: 0, max: 100 }
}, { _id: false });

export const UserProfileSchema = new Schema({
  userId: { type: String, required: true, unique: true, index: true },
  mobileNumber: { 
    type: String, 
    required: true, 
    unique: true, 
    index: true,
    // Stores E.164 format (e.g., +919876543210, +447700900123)
  },
  countryCode: { 
    type: String, 
    required: true,
    index: true,
    // Stores country calling code (e.g., +91, +44, +1)
  },
  mobileVerified: { type: Boolean, default: false },
  
  // Basic Information
  name: { type: String, minlength: 2, maxlength: 100 },
  profilePicture: { type: ProfilePictureSchema },
  
  // Location
  location: { type: LocationSchema },
  
  // Farming Details
  userType: { type: String, enum: ['farmer', 'buyer', 'both'] },
  cropsGrown: [CropGrownSchema],
  farmSize: { type: FarmSizeSchema },
  
  // Preferences
  languagePreference: { 
    type: String, 
    enum: ['en', 'hi', 'pa', 'ta', 'te', 'mr'] 
  },
  
  // Financial
  bankAccount: { type: BankAccountSchema },
  
  // Authentication & Security
  pinHash: { type: String },  // bcrypt hash of PIN
  biometricEnabled: { type: Boolean, default: false },
  failedLoginAttempts: { type: Number, default: 0, min: 0 },  // Counter for failed PIN/biometric attempts
  lockedUntil: { type: Date },  // Account lockout timestamp
  lastLoginAt: { type: Date },  // Last successful login
  
  // Metadata
  completionPercentage: { type: Number, default: 10, min: 0, max: 105 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  lastActiveAt: { type: Date, default: Date.now },
  
  // Privacy
  privacySettings: { 
    type: Map, 
    of: String,
    default: new Map()
  },
  
  // Gamification
  points: { type: PointsSchema, default: () => ({ current: 0, lifetime: 0 }) },
  membershipTier: { 
    type: String, 
    enum: ['bronze', 'silver', 'gold', 'platinum'],
    default: 'bronze',
    index: true
  },
  referralCode: { type: String, required: true, unique: true, index: true },
  referredBy: { type: String, index: true },
  dailyStreak: { type: Number, default: 0, min: 0 },
  lastStreakDate: { type: Date },
  
  // Trust
  trustScore: { type: Number, default: 50, min: 0, max: 100, index: true },
  trustScoreHistory: [TrustScoreHistorySchema]
}, {
  timestamps: true,
  collection: 'user_profiles'
});

// Indexes
UserProfileSchema.index({ membershipTier: 1, 'points.lifetime': -1 });
UserProfileSchema.index({ trustScore: -1 });
UserProfileSchema.index({ completionPercentage: 1 });
UserProfileSchema.index({ countryCode: 1 });  // For analytics
UserProfileSchema.index({ lockedUntil: 1 });  // For lockout queries

// ============================================================================
// PROMPT TRACKING SCHEMA
// ============================================================================

export const PromptTrackingSchema = new Schema({
  userId: { type: String, required: true, index: true },
  fieldName: { type: String, required: true, index: true },
  promptCount: { type: Number, default: 0, min: 0 },
  lastPromptedAt: { type: Date },
  dismissalCount: { type: Number, default: 0, min: 0 },
  lastDismissedAt: { type: Date },
  status: { 
    type: String, 
    enum: ['pending', 'collected', 'user_declined'],
    default: 'pending',
    index: true
  },
  collectedAt: { type: Date },
  collectionSource: { 
    type: String, 
    enum: ['explicit_prompt', 'implicit_update', 'manual_edit', 'import']
  }
}, {
  timestamps: true,
  collection: 'prompt_tracking'
});

// Compound index for efficient queries
PromptTrackingSchema.index({ userId: 1, fieldName: 1 }, { unique: true });
PromptTrackingSchema.index({ userId: 1, status: 1 });

// ============================================================================
// POINTS TRANSACTION SCHEMA
// ============================================================================

export const PointsTransactionSchema = new Schema({
  transactionId: { type: String, required: true, unique: true, index: true },
  userId: { type: String, required: true, index: true },
  points: { type: Number, required: true },
  type: { type: String, enum: ['earn', 'redeem'], required: true, index: true },
  activity: { type: String, required: true, index: true },
  description: { type: String, required: true },
  timestamp: { type: Date, default: Date.now, index: true },
  metadata: { type: Schema.Types.Mixed }
}, {
  timestamps: true,
  collection: 'points_transactions'
});

// Indexes for analytics
PointsTransactionSchema.index({ userId: 1, timestamp: -1 });
PointsTransactionSchema.index({ activity: 1, timestamp: -1 });
PointsTransactionSchema.index({ type: 1, timestamp: -1 });

// ============================================================================
// REFERRAL SCHEMA
// ============================================================================

export const ReferralSchema = new Schema({
  referralId: { type: String, required: true, unique: true, index: true },
  referrerId: { type: String, required: true, index: true },
  refereeId: { type: String, required: true, index: true },
  referralCode: { type: String, required: true, index: true },
  registrationDate: { type: Date, default: Date.now },
  registrationPointsAwarded: { type: Boolean, default: false },
  firstTransactionDate: { type: Date },
  transactionPointsAwarded: { type: Boolean, default: false },
  status: { 
    type: String, 
    enum: ['registered', 'active', 'inactive'],
    default: 'registered',
    index: true
  }
}, {
  timestamps: true,
  collection: 'referrals'
});

// Indexes
ReferralSchema.index({ referrerId: 1, status: 1 });
ReferralSchema.index({ refereeId: 1 });
