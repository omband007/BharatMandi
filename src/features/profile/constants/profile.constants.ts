/**
 * Profile Management Constants
 * 
 * Business logic constants for profile completeness, points, tiers, and trust scores.
 */

// ============================================================================
// PROFILE COMPLETENESS WEIGHTS
// ============================================================================

export const PROFILE_FIELD_WEIGHTS = {
  mobileNumber: 10,      // Always present after registration
  name: 15,
  location: 20,
  userType: 15,
  cropsGrown: 15,        // At least one crop
  languagePreference: 10,
  farmSize: 10,
  bankAccount: 5,
  profilePicture: 5
} as const;

// ============================================================================
// POINTS AWARD RULES
// ============================================================================

export const POINTS_RULES = {
  PROFILE_COMPLETE_100: 50,
  CREATE_LISTING: 10,
  CHECK_WEATHER: 5,
  QUERY_CROP_PRICE: 5,
  REQUEST_FARMING_ADVICE: 5,
  COMPLETE_TRANSACTION: 20,
  UPLOAD_CROP_PHOTO: 15,
  DAILY_STREAK: 10,
  REFERRAL_REGISTRATION: 100,
  REFERRAL_FIRST_TRANSACTION: 200
} as const;

// ============================================================================
// DAILY ACTIVITY LIMITS
// ============================================================================

export const DAILY_LIMITS = {
  CREATE_LISTING: 3,
  CHECK_WEATHER: 5,
  QUERY_CROP_PRICE: 5,
  REQUEST_FARMING_ADVICE: 5,
  UPLOAD_CROP_PHOTO: 3,
  DAILY_CAP: 200  // Excluding referrals and transactions
} as const;

// ============================================================================
// MEMBERSHIP TIER THRESHOLDS
// ============================================================================

export const TIER_THRESHOLDS = {
  BRONZE: 0,
  SILVER: 500,
  GOLD: 2000,
  PLATINUM: 5000
} as const;

// ============================================================================
// TRUST SCORE RULES
// ============================================================================

export const TRUST_SCORE_RULES = {
  INITIAL: 50,
  MIN: 0,
  MAX: 100,
  
  POSITIVE_EVENTS: {
    PROFILE_COMPLETE_100: 5,
    VERIFY_LOCATION_GPS: 3,
    COMPLETE_TRANSACTION: 2,
    RECEIVE_POSITIVE_FEEDBACK: 5
  },
  
  NEGATIVE_EVENTS: {
    RECEIVE_NEGATIVE_FEEDBACK: -10,
    CANCEL_TRANSACTION: -15,
    DISPUTE_RAISED: -20
  },
  
  RANGES: {
    LOW: { min: 0, max: 40 },
    MEDIUM: { min: 41, max: 70 },
    HIGH: { min: 71, max: 85 },
    EXCELLENT: { min: 86, max: 100 }
  }
} as const;

// ============================================================================
// CONTEXTUAL PROMPT PRIORITY
// ============================================================================

export const FIELD_PRIORITY = {
  location: 100,           // Highest - needed for weather, logistics
  name: 90,                // High - personalization
  userType: 85,            // High - UI customization
  cropsGrown: 80,          // High - recommendations
  languagePreference: 70,  // Medium - already detected implicitly
  farmSize: 60,            // Medium - advice scaling
  profilePicture: 50,      // Medium - trust building
  bankAccount: 40          // Low - only for payments
} as const;

// ============================================================================
// PROMPT FREQUENCY LIMITS
// ============================================================================

export const PROMPT_LIMITS = {
  MAX_DISMISSALS: 3,                    // Mark as user_declined after 3 dismissals
  DISMISSAL_COOLDOWN_HOURS: 24,         // Don't re-prompt within 24 hours
  MIN_PROMPT_INTERVAL_MINUTES: 5,      // Don't show prompts within 5 minutes
  MAX_PROMPTS_PER_SESSION: 1           // Only one prompt per interaction
} as const;

// ============================================================================
// VALIDATION RULES
// ============================================================================

export const VALIDATION_RULES = {
  MOBILE_NUMBER: {
    LENGTH: 10,
    PATTERN: /^[6-9]\d{9}$/  // Indian mobile numbers start with 6-9
  },
  NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 100,
    PATTERN: /^[\p{L}\s]+$/u  // Unicode letters and spaces
  },
  FARM_SIZE: {
    MIN: 0.1,
    MAX: 10000
  },
  PROFILE_PICTURE: {
    MAX_SIZE_MB: 5,
    ALLOWED_FORMATS: ['image/jpeg', 'image/png', 'image/webp'],
    DIMENSIONS: {
      FULL: { width: 400, height: 400 },
      THUMBNAIL: { width: 100, height: 100 }
    }
  },
  REFERRAL_CODE: {
    LENGTH: 8,
    PATTERN: /^[A-Z0-9]{8}$/
  }
} as const;

// ============================================================================
// SUPPORTED LANGUAGES
// ============================================================================

export const SUPPORTED_LANGUAGES = [
  'en',  // English
  'hi',  // Hindi
  'pa',  // Punjabi
  'ta',  // Tamil
  'te',  // Telugu
  'mr'   // Marathi
] as const;

// ============================================================================
// PRIVACY DEFAULTS
// ============================================================================

export const DEFAULT_PRIVACY_SETTINGS = {
  name: 'platform_only',
  location: 'platform_only',
  userType: 'platform_only',
  cropsGrown: 'platform_only',
  farmSize: 'platform_only',
  languagePreference: 'platform_only',
  bankAccount: 'private',
  profilePicture: 'public'
} as const;

// ============================================================================
// POINTS REDEMPTION CATALOG
// ============================================================================

export const REDEMPTION_CATALOG = {
  FEATURED_LISTING_24H: {
    pointsCost: 500,
    duration: 24 * 60 * 60 * 1000  // 24 hours in milliseconds
  },
  TRANSACTION_FEE_WAIVER: {
    pointsCost: 2000,
    uses: 1
  },
  PRIORITY_SUPPORT_30D: {
    pointsCost: 3000,
    duration: 30 * 24 * 60 * 60 * 1000  // 30 days in milliseconds
  }
} as const;
