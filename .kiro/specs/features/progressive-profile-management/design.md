# Design Document: Progressive Profile Management

## Overview

The Progressive Profile Management system implements a friction-minimized onboarding approach that collects only essential information (mobile number) at registration, then progressively builds comprehensive user profiles through contextual prompts and implicit data collection during natural platform interactions.

### Core Design Principles

1. **Minimal Friction**: Registration requires only mobile number verification
2. **Contextual Collection**: Profile data is requested when relevant to user actions
3. **Implicit Intelligence**: System automatically infers profile attributes from user behavior
4. **Gamified Engagement**: Points, tiers, and rewards motivate profile completion and platform usage
5. **Trust Building**: Transparent trust scoring system builds community confidence
6. **Privacy First**: User-controlled privacy settings for all profile fields

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                        API Gateway Layer                         │
└─────────────────────────────────────────────────────────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
┌───────▼────────┐    ┌─────────▼────────┐    ┌─────────▼────────┐
│ Registration   │    │ Profile Manager  │    │ Gamification     │
│ Service        │    │ Service          │    │ Service          │
└────────────────┘    └──────────────────┘    └──────────────────┘
        │                        │                        │
        │             ┌──────────┼──────────┐            │
        │             │          │          │            │
┌───────▼────────┐ ┌──▼────┐ ┌──▼────┐ ┌──▼────┐ ┌─────▼─────┐
│ Contextual     │ │Implicit│ │Profile│ │Trust  │ │Points &   │
│ Prompt Engine  │ │Update │ │Picture│ │Score  │ │Tier       │
│                │ │Service│ │Service│ │Service│ │Manager    │
└────────────────┘ └───────┘ └───────┘ └───────┘ └───────────┘
```

### Component Responsibilities

#### 1. Registration Service
- Validates mobile number format
- Sends OTP via SMS gateway
- Verifies OTP codes
- Creates initial user account
- Initializes profile with default values

#### 2. Profile Manager Service
- CRUD operations for profile data
- Profile field validation
- Completeness percentage calculation
- Privacy settings management
- Data export and deletion
- Profile verification status tracking

#### 3. Contextual Prompt Engine
- Monitors user interactions for prompt opportunities
- Determines optimal timing for profile data requests
- Manages prompt frequency limits
- Prioritizes high-value fields
- Tracks dismissals and user preferences

#### 4. Implicit Update Service
- Detects language from user messages
- Extracts crop types from images and queries
- Infers user type from marketplace behavior
- Updates profile fields automatically
- Maintains data source metadata

#### 5. Gamification Service
- Points calculation and awarding
- Membership tier management
- Referral code generation and tracking
- Points redemption processing
- Gamification analytics

#### 6. Trust Score Service
- Calculates trust scores based on behaviors
- Tracks positive and negative events
- Maintains trust score history
- Provides trust improvement recommendations
- Enforces feature restrictions for low trust users

#### 7. Profile Picture Service
- Image upload and validation
- Image resizing and thumbnail generation
- Content moderation integration
- Storage management
- Default avatar handling

## Data Models

### User Profile Schema

```typescript
interface UserProfile {
  // Identity
  userId: string;
  mobileNumber: string;
  mobileVerified: boolean;
  
  // Basic Information
  name?: string;
  profilePicture?: {
    url: string;
    thumbnailUrl: string;
    uploadedAt: Date;
  };
  
  // Location
  location?: {
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
  };
  
  // Farming Details
  userType?: 'farmer' | 'buyer' | 'both';
  cropsGrown?: Array<{
    cropName: string;
    source: 'image_upload' | 'price_query' | 'sale_post';
    addedAt: Date;
  }>;
  farmSize?: {
    value: number;
    unit: 'acres' | 'hectares';
  };
  
  // Preferences
  languagePreference?: string;
  
  // Financial
  bankAccount?: {
    accountNumber: string;
    ifscCode: string;
    verified: boolean;
  };
  
  // Metadata
  completionPercentage: number;
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt: Date;
  
  // Privacy
  privacySettings: {
    [field: string]: 'public' | 'private' | 'platform_only';
  };
  
  // Gamification
  points: {
    current: number;
    lifetime: number;
    lastUpdated: Date;
  };
  membershipTier: 'bronze' | 'silver' | 'gold' | 'platinum';
  referralCode: string;
  referredBy?: string;
  dailyStreak: number;
  lastStreakDate?: Date;
  
  // Trust
  trustScore: number;
  trustScoreHistory: Array<{
    timestamp: Date;
    change: number;
    reason: string;
    newScore: number;
  }>;
}
```

### Prompt Tracking Schema

```typescript
interface PromptTracking {
  userId: string;
  fieldName: string;
  promptCount: number;
  lastPromptedAt?: Date;
  dismissalCount: number;
  lastDismissedAt?: Date;
  status: 'pending' | 'collected' | 'user_declined';
  collectedAt?: Date;
  collectionSource: 'explicit_prompt' | 'implicit_update' | 'manual_edit' | 'import';
}
```

### Points Transaction Schema

```typescript
interface PointsTransaction {
  transactionId: string;
  userId: string;
  points: number;
  type: 'earn' | 'redeem';
  activity: string;
  description: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}
```

### Referral Schema

```typescript
interface Referral {
  referralId: string;
  referrerId: string;
  refereeId: string;
  referralCode: string;
  registrationDate: Date;
  registrationPointsAwarded: boolean;
  firstTransactionDate?: Date;
  transactionPointsAwarded: boolean;
  status: 'registered' | 'active' | 'inactive';
}
```

## Core Workflows

### 1. User Registration Flow

```
User → Enter Mobile Number → Validate Format → Send OTP
                                                    ↓
User ← Display Success ← Activate Account ← Verify OTP
                                                    ↓
                                    Initialize Profile (10% complete)
                                                    ↓
                                    Award Bronze Tier, 50 Trust Score
```

### 2. Progressive Data Collection Flow

```
User Interaction → Check Missing Fields → Determine Priority Field
                                                    ↓
                                    Check Prompt Frequency Limits
                                                    ↓
                                    Display Contextual Prompt
                                                    ↓
                        User Provides Data ← → User Dismisses
                                ↓                   ↓
                        Update Profile      Track Dismissal
                                ↓                   ↓
                    Recalculate Completion%    Check Dismissal Count
                                ↓                   ↓
                        Award Points        Mark as user_declined (if 3x)
```

### 3. Implicit Profile Update Flow

```
User Action (upload/query/post) → Detect Relevant Data
                                            ↓
                                    Validate Confidence
                                            ↓
                                    Update Profile Field
                                            ↓
                                    Store Source Metadata
                                            ↓
                                    Recalculate Completion%
```

### 4. Points Award Flow

```
User Activity → Validate Activity Type → Check Daily Limits
                                                ↓
                                        Calculate Points
                                                ↓
                                        Award Points
                                                ↓
                                    Update Lifetime Points
                                                ↓
                                    Check Tier Threshold
                                                ↓
                                    Promote Tier (if eligible)
                                                ↓
                                    Send Notification
```

### 5. Trust Score Update Flow

```
User Event → Determine Trust Impact → Calculate Score Change
                                                ↓
                                        Update Trust Score
                                                ↓
                                        Log to History
                                                ↓
                                    Check Feature Restrictions
                                                ↓
                                    Apply/Remove Restrictions
```

## API Design

### Profile Management APIs

#### Create Profile (Registration)
```
POST /api/v1/profiles/register
Request: { mobileNumber: string }
Response: { userId: string, otpSent: boolean }
```

#### Verify OTP
```
POST /api/v1/profiles/verify-otp
Request: { userId: string, otp: string }
Response: { verified: boolean, profile: UserProfile }
```

#### Get Profile
```
GET /api/v1/profiles/{userId}
Response: { profile: UserProfile }
```

#### Update Profile Field
```
PATCH /api/v1/profiles/{userId}/fields
Request: { fieldName: string, value: any }
Response: { updated: boolean, completionPercentage: number }
```

#### Upload Profile Picture
```
POST /api/v1/profiles/{userId}/picture
Request: multipart/form-data (image file)
Response: { url: string, thumbnailUrl: string }
```

### Gamification APIs

#### Get Points Balance
```
GET /api/v1/gamification/{userId}/points
Response: { current: number, lifetime: number, tier: string }
```

#### Get Points History
```
GET /api/v1/gamification/{userId}/points/history
Response: { transactions: PointsTransaction[] }
```

#### Redeem Points
```
POST /api/v1/gamification/{userId}/redeem
Request: { rewardType: string, pointsCost: number }
Response: { success: boolean, newBalance: number }
```

#### Get Referral Code
```
GET /api/v1/gamification/{userId}/referral-code
Response: { referralCode: string, referralCount: number }
```

### Trust Score APIs

#### Get Trust Score
```
GET /api/v1/trust/{userId}
Response: { score: number, range: string, history: TrustScoreHistory[] }
```

#### Record Trust Event
```
POST /api/v1/trust/{userId}/event
Request: { eventType: string, impact: number, reason: string }
Response: { newScore: number }
```

### Dashboard API

#### Get Integrated Dashboard
```
GET /api/v1/profiles/{userId}/dashboard
Response: {
  profile: UserProfile,
  completionPercentage: number,
  points: { current: number, lifetime: number },
  tier: string,
  tierProgress: number,
  trustScore: number,
  referralCount: number,
  dailyStreak: number,
  recentActivities: Activity[],
  lockedFeatures: Feature[],
  quickActions: Action[]
}
```

## Business Logic

### Profile Completeness Calculation

```typescript
function calculateCompletionPercentage(profile: UserProfile): number {
  const weights = {
    mobileNumber: 10,      // Always present
    name: 15,
    location: 20,
    userType: 15,
    cropsGrown: 15,        // At least one crop
    languagePreference: 10,
    farmSize: 10,
    bankAccount: 5,
    profilePicture: 5      // New field
  };
  
  let total = weights.mobileNumber; // Always verified
  
  if (profile.name) total += weights.name;
  if (profile.location) total += weights.location;
  if (profile.userType) total += weights.userType;
  if (profile.cropsGrown && profile.cropsGrown.length > 0) total += weights.cropsGrown;
  if (profile.languagePreference) total += weights.languagePreference;
  if (profile.farmSize) total += weights.farmSize;
  if (profile.bankAccount) total += weights.bankAccount;
  if (profile.profilePicture) total += weights.profilePicture;
  
  return total;
}
```

### Points Award Rules

```typescript
const POINTS_RULES = {
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
};

const DAILY_LIMITS = {
  CREATE_LISTING: 3,
  CHECK_WEATHER: 5,
  QUERY_CROP_PRICE: 5,
  REQUEST_FARMING_ADVICE: 5,
  UPLOAD_CROP_PHOTO: 3,
  DAILY_CAP: 200  // Excluding referrals and transactions
};
```

### Membership Tier Thresholds

```typescript
const TIER_THRESHOLDS = {
  BRONZE: 0,
  SILVER: 500,
  GOLD: 2000,
  PLATINUM: 5000
};

function calculateTier(lifetimePoints: number): string {
  if (lifetimePoints >= TIER_THRESHOLDS.PLATINUM) return 'platinum';
  if (lifetimePoints >= TIER_THRESHOLDS.GOLD) return 'gold';
  if (lifetimePoints >= TIER_THRESHOLDS.SILVER) return 'silver';
  return 'bronze';
}
```

### Trust Score Rules

```typescript
const TRUST_SCORE_RULES = {
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
};
```

### Contextual Prompt Priority

```typescript
const FIELD_PRIORITY = {
  location: 100,      // Highest - needed for weather, logistics
  name: 90,           // High - personalization
  userType: 85,       // High - UI customization
  cropsGrown: 80,     // High - recommendations
  languagePreference: 70,  // Medium - already detected implicitly
  farmSize: 60,       // Medium - advice scaling
  profilePicture: 50, // Medium - trust building
  bankAccount: 40     // Low - only for payments
};
```

## Integration Points

### External Services

1. **SMS Gateway** (OTP delivery)
   - Provider: Twilio / AWS SNS
   - Fallback: Secondary provider

2. **Image Storage** (Profile pictures)
   - Provider: AWS S3 / Cloudinary
   - CDN: CloudFront

3. **Content Moderation** (Profile pictures)
   - Provider: AWS Rekognition / Clarifai
   - Checks: Inappropriate content, violence, explicit material

4. **Geocoding Service** (Location validation)
   - Provider: OpenStreetMap Nominatim
   - Fallback: Google Maps Geocoding API

5. **Language Detection** (Implicit language preference)
   - Provider: AWS Comprehend / Google Cloud Translation
   - Supported: Hindi, English, Punjabi, Tamil, Telugu, Marathi

### Internal Service Dependencies

1. **Marketplace Service** (User type inference, transaction tracking)
2. **Kisan Mitra Service** (Implicit crop detection, language detection)
3. **Weather Service** (Location requirement trigger)
4. **Crop Detection Service** (Image-based crop identification)
5. **Notification Service** (Tier promotions, feature unlocks)

## Security & Privacy

### Data Protection

1. **Encryption**
   - Mobile numbers: Hashed with salt
   - Bank account details: Encrypted at rest
   - Profile pictures: Access-controlled URLs

2. **Privacy Controls**
   - Default: All fields set to `platform_only`
   - User-configurable per field
   - Public profile respects privacy settings

3. **Data Retention**
   - Active profiles: Indefinite
   - Deleted profiles: 30-day grace period
   - Transaction records: 7 years (legal requirement)

4. **Access Control**
   - User: Full access to own profile
   - Platform: Read access for recommendations
   - Other users: Only public fields
   - Admins: Audit logs for all access

### Compliance

1. **GDPR/Data Protection**
   - Right to access (data export)
   - Right to deletion (profile deletion)
   - Right to rectification (profile editing)
   - Data portability (JSON export)

2. **KYC Requirements**
   - Mobile number verification (mandatory)
   - Location verification (optional, GPS-based)
   - Bank account verification (for payments)

## Performance Considerations

### Caching Strategy

1. **Profile Data**
   - Cache: Redis
   - TTL: 5 minutes
   - Invalidation: On profile update

2. **Completion Percentage**
   - Cache: In-memory
   - Recalculate: On field update
   - Async update: Non-blocking

3. **Points Balance**
   - Cache: Redis
   - TTL: 1 minute
   - Invalidation: On points transaction

### Database Optimization

1. **Indexes**
   - userId (primary key)
   - mobileNumber (unique)
   - referralCode (unique)
   - membershipTier (for analytics)
   - trustScore (for filtering)

2. **Partitioning**
   - Points transactions: By month
   - Trust score history: By quarter
   - Prompt tracking: By userId

### Scalability

1. **Horizontal Scaling**
   - Stateless services
   - Load balancer distribution
   - Database read replicas

2. **Async Processing**
   - Points calculation: Queue-based
   - Trust score updates: Event-driven
   - Analytics: Batch processing

## Monitoring & Analytics

### Key Metrics

1. **Profile Metrics**
   - Average completion percentage
   - Time to 50%, 70%, 90% completion
   - Field collection rates
   - Prompt acceptance vs dismissal rates

2. **Gamification Metrics**
   - Points awarded by activity type
   - Tier distribution
   - Referral conversion rates
   - Points redemption rates

3. **Trust Metrics**
   - Average trust score
   - Trust score distribution
   - Trust events frequency
   - Low trust user percentage

4. **System Metrics**
   - API response times
   - Cache hit rates
   - Error rates
   - Database query performance

### Dashboards

1. **Product Dashboard**
   - Profile completion trends
   - Feature unlock rates
   - User engagement metrics

2. **Operations Dashboard**
   - System health
   - API performance
   - Error tracking
   - Resource utilization

3. **Business Dashboard**
   - User growth
   - Tier distribution
   - Referral effectiveness
   - Revenue impact (from gamification)

## Testing Strategy

### Unit Tests
- Profile completeness calculation
- Points award logic
- Trust score calculation
- Tier promotion logic
- Validation functions

### Integration Tests
- Registration flow
- Profile update flow
- Points transaction flow
- Referral flow
- Trust score update flow

### End-to-End Tests
- Complete user journey from registration to profile completion
- Gamification flow from earning to redemption
- Trust score lifecycle
- Privacy settings enforcement

### Performance Tests
- Profile API load testing
- Concurrent points transactions
- Cache effectiveness
- Database query optimization

## Deployment Strategy

### Phased Rollout

**Phase 1: Core Profile Management** (Week 1-2)
- Registration service
- Basic profile CRUD
- Completeness calculation
- Privacy controls

**Phase 2: Progressive Collection** (Week 3-4)
- Contextual prompt engine
- Implicit update service
- Profile picture management

**Phase 3: Gamification** (Week 5-6)
- Points system
- Membership tiers
- Referral program

**Phase 4: Trust & Polish** (Week 7-8)
- Trust score system
- Integrated dashboard
- Analytics
- Performance optimization

### Feature Flags

- `enable_progressive_profiling`
- `enable_gamification`
- `enable_trust_score`
- `enable_referrals`
- `enable_points_redemption`

### Rollback Plan

- Database migrations: Reversible
- Feature flags: Instant disable
- Cache invalidation: Automated
- Monitoring: Real-time alerts

## Future Enhancements

1. **AI-Powered Recommendations**
   - Optimal prompt timing prediction
   - Personalized incentive suggestions

2. **Social Features**
   - Profile badges and achievements
   - Leaderboards
   - Community recognition

3. **Advanced Analytics**
   - Predictive profile completion
   - Churn risk identification
   - Engagement optimization

4. **Enhanced Trust**
   - Peer verification
   - Document verification
   - Third-party trust scores

## Appendix

### Glossary Reference
See requirements.md for complete glossary of terms.

### Related Documents
- Requirements Document: requirements.md
- Implementation Tasks: tasks.md (to be created)
- API Specification: (to be created)
- Database Schema: (to be created)
