/**
 * Profile Management Types
 * 
 * Type definitions for the Progressive Profile Management feature.
 * Supports minimal registration, progressive data collection, gamification,
 * and trust scoring.
 */

// ============================================================================
// CORE PROFILE TYPES
// ============================================================================

export interface Location {
  latitude: number;
  longitude: number;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  district?: string;
  state?: string;
  pincode?: string;
  country: string;
  locationType: 'gps' | 'manual';
  isVerified: boolean;
  lastUpdated: Date;
}

export interface ProfilePicture {
  url: string;
  thumbnailUrl: string;
  uploadedAt: Date;
}

export interface CropGrown {
  cropName: string;
  source: 'image_upload' | 'price_query' | 'sale_post';
  addedAt: Date;
}

export interface FarmSize {
  value: number;
  unit: 'acres' | 'hectares';
}

export interface BankAccount {
  accountNumber: string;
  ifscCode: string;
  verified: boolean;
}

export interface Points {
  current: number;
  lifetime: number;
  lastUpdated: Date;
}

export interface TrustScoreHistoryEntry {
  timestamp: Date;
  change: number;
  reason: string;
  newScore: number;
}

export type UserType = 'farmer' | 'buyer' | 'both';
export type MembershipTier = 'bronze' | 'silver' | 'gold' | 'platinum';
export type PrivacyLevel = 'public' | 'private' | 'platform_only';

export interface UserProfile {
  // Identity
  userId: string;
  mobileNumber: string;
  mobileVerified: boolean;
  
  // Basic Information
  name?: string;
  profilePicture?: ProfilePicture;
  
  // Location
  location?: Location;
  
  // Farming Details
  userType?: UserType;
  cropsGrown?: CropGrown[];
  farmSize?: FarmSize;
  
  // Preferences
  languagePreference?: string;
  
  // Financial
  bankAccount?: BankAccount;
  
  // Metadata
  completionPercentage: number;
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt: Date;
  
  // Privacy
  privacySettings: Record<string, PrivacyLevel>;
  
  // Gamification
  points: Points;
  membershipTier: MembershipTier;
  referralCode: string;
  referredBy?: string;
  dailyStreak: number;
  lastStreakDate?: Date;
  
  // Trust
  trustScore: number;
  trustScoreHistory: TrustScoreHistoryEntry[];
}

// ============================================================================
// PROMPT TRACKING TYPES
// ============================================================================

export type PromptStatus = 'pending' | 'collected' | 'user_declined';
export type CollectionSource = 'explicit_prompt' | 'implicit_update' | 'manual_edit' | 'import';

export interface PromptTracking {
  userId: string;
  fieldName: string;
  promptCount: number;
  lastPromptedAt?: Date;
  dismissalCount: number;
  lastDismissedAt?: Date;
  status: PromptStatus;
  collectedAt?: Date;
  collectionSource?: CollectionSource;
}

// ============================================================================
// GAMIFICATION TYPES
// ============================================================================

export type TransactionType = 'earn' | 'redeem';

export interface PointsTransaction {
  transactionId: string;
  userId: string;
  points: number;
  type: TransactionType;
  activity: string;
  description: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export type ReferralStatus = 'registered' | 'active' | 'inactive';

export interface Referral {
  referralId: string;
  referrerId: string;
  refereeId: string;
  referralCode: string;
  registrationDate: Date;
  registrationPointsAwarded: boolean;
  firstTransactionDate?: Date;
  transactionPointsAwarded: boolean;
  status: ReferralStatus;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface RegisterRequest {
  mobileNumber: string;
  referralCode?: string;
}

export interface RegisterResponse {
  userId: string;
  otpSent: boolean;
}

export interface VerifyOTPRequest {
  userId: string;
  otp: string;
}

export interface VerifyOTPResponse {
  verified: boolean;
  profile: UserProfile;
}

export interface UpdateProfileFieldRequest {
  fieldName: string;
  value: any;
}

export interface UpdateProfileFieldResponse {
  updated: boolean;
  completionPercentage: number;
}

export interface DashboardResponse {
  profile: UserProfile;
  completionPercentage: number;
  points: { current: number; lifetime: number };
  tier: MembershipTier;
  tierProgress: number;
  trustScore: number;
  referralCount: number;
  dailyStreak: number;
  recentActivities: any[];
  lockedFeatures: any[];
  quickActions: any[];
}
