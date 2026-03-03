# Design Document: User Authentication & Profile Management

## Overview

The User Authentication & Profile Management system provides unified user authentication and comprehensive profile management for Bharat Mandi. It implements a friction-minimized onboarding approach that collects essential information (mobile number, name, location, user type) at registration, then progressively builds comprehensive user profiles through contextual prompts and implicit data collection during natural platform interactions.

This design consolidates authentication (OTP, PIN, biometric, session management) and profile management into a single cohesive system with clean code separation.

### Core Design Principles

1. **Unified Authentication & Profile**: Single system handling both authentication and profile data
2. **Minimal Friction**: Registration requires mobile number, name, location, and user type (farmer/buyer)
3. **Multiple Auth Methods**: OTP, PIN, and biometric authentication options
4. **Contextual Collection**: Additional profile data is requested when relevant to user actions
5. **Implicit Intelligence**: System automatically infers profile attributes from user behavior
6. **Privacy First**: User-controlled privacy settings for all profile fields
7. **Security First**: Account lockout protection, JWT tokens, secure credential storage

## Architecture

### Database Architecture

**Primary Database: PostgreSQL (AWS RDS)**
- User profiles and transactional data
- ACID compliance for financial transactions
- Relational data with proper foreign keys
- Supports complex queries and joins
- AWS RDS for managed backups and scaling

**Cache Layer: SQLite (Local) + Redis**
- SQLite: Offline-first cache for mobile/edge scenarios
- Redis: Session management, OTP storage, rate limiting
- Automatic sync between PostgreSQL and SQLite

**Media Storage: AWS S3**
- Profile pictures, listing images, voice recordings
- CloudFront CDN for global delivery
- Presigned URLs for secure access

**Migration from MongoDB:**
- Previous implementation used MongoDB (Mongoose models)
- Migrating to PostgreSQL for better relational data handling
- Using Sequelize ORM for PostgreSQL integration
- Maintaining same API contracts for backward compatibility

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                        API Gateway Layer                         │
└─────────────────────────────────────────────────────────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
┌───────▼────────┐    ┌─────────▼────────┐    ┌─────────▼────────┐
│ Auth Service   │    │ Profile Manager  │    │ Contextual       │
│                │    │ Service          │    │ Prompt Engine    │
│ - PIN/Bio Auth │    │ - Profile CRUD   │    │ - Timing         │
│ - JWT Tokens   │    │ - Progressive    │    │ - Frequency      │
│ - Lockout      │    │ - Privacy        │    │ - Priority       │
└────────────────┘    └──────────────────┘    └──────────────────┘
        │                        │                        │
        │             ┌──────────┼──────────┐            │
        │             │          │          │            │
┌───────▼────────┐ ┌──▼────┐ ┌──▼────┐ ┌──▼────────────▼─────┐
│ Registration   │ │Implicit│ │Profile│ │ Analytics           │
│ Service        │ │Update │ │Picture│ │ Service             │
│ - OTP          │ │Service│ │Service│ │ - Completion Trends │
│ - Validation   │ │       │ │       │ │ - Field Collection  │
└────────────────┘ └───────┘ └───────┘ └─────────────────────┘
```

### Component Responsibilities

#### 1. Auth Service (NEW - Core Authentication)
**Location**: `src/features/profile/services/auth.service.ts`

- **PIN Management**
  - Setup PIN (hash with bcrypt)
  - Change PIN (with OTP verification)
  - Validate PIN on login
  
- **Biometric Management**
  - Enable/disable biometric authentication
  - Validate biometric login requests
  
- **JWT Token Management**
  - Generate JWT tokens (30-day expiration)
  - Verify JWT tokens
  - Refresh tokens
  - Token payload: userId, mobileNumber, name
  
- **Account Security**
  - Track failed login attempts
  - Implement account lockout (3 attempts → 30 min lockout)
  - Auto-unlock after lockout period
  - Allow OTP login when locked (account recovery)
  - Reset failed attempts on successful login
  
- **Session Management**
  - Create authenticated sessions
  - Update lastLoginAt timestamp
  - Support multiple concurrent sessions

#### 2. Registration Service
**Location**: `src/features/profile/services/registration.service.ts`

- Validates mobile number format (international support via libphonenumber-js)
- Normalizes 10-digit numbers to +91 (Indian default)
- Validates international numbers according to country-specific rules
- Extracts and stores country code
- Sends OTP via international SMS gateway
- Verifies OTP codes
- Collects mandatory fields after OTP verification: name, location, userType
- Validates mandatory field formats and constraints
- Creates user profile only after all mandatory fields are collected
- Initializes profile with 40% completeness (mandatory fields complete)
- Integrates with Auth Service for optional PIN/biometric setup
- Generates initial JWT token after registration

#### 3. Profile Manager Service
**Location**: `src/features/profile/services/profile-manager.service.ts`

- CRUD operations for profile data
- Profile field validation
- Completeness percentage calculation
- Privacy settings management
- Data export and deletion
- Profile verification status tracking
- Mobile number change (with dual OTP verification)

#### 4. Contextual Prompt Engine
**Location**: `src/features/profile/services/contextual-prompt.service.ts`

- Monitors user interactions for prompt opportunities
- Determines optimal timing for profile data requests
- Manages prompt frequency limits
- Prioritizes high-value fields
- Tracks dismissals and user preferences

#### 5. Implicit Update Service
**Location**: `src/features/profile/services/implicit-update.service.ts`

- Detects language from user messages
- Extracts crop types from images and queries
- Infers user type from marketplace behavior
- Updates profile fields automatically
- Maintains data source metadata

#### 6. Profile Picture Service
**Location**: `src/features/profile/services/profile-picture.service.ts`

- Image upload and validation
- Image resizing and thumbnail generation
- Content moderation integration
- Storage management
- Default avatar handling

#### 7. Analytics Service
**Location**: `src/features/profile/services/analytics.service.ts`

- Track profile completion patterns
- Monitor field collection sources
- Calculate average completion percentage
- Track prompt acceptance/dismissal rates
- Identify low collection rate fields
- Correlation analysis with user retention

### API Routes Structure

#### Authentication Routes
**Location**: `src/features/profile/routes/auth.routes.ts`

- POST `/api/v1/profiles/auth/setup-pin` - Set up PIN
- POST `/api/v1/profiles/auth/change-pin` - Change PIN (requires OTP)
- POST `/api/v1/profiles/auth/login/pin` - Login with PIN
- POST `/api/v1/profiles/auth/login/biometric` - Login with biometric
- POST `/api/v1/profiles/auth/login/otp` - Login with OTP
- POST `/api/v1/profiles/auth/verify-token` - Verify JWT token
- POST `/api/v1/profiles/auth/refresh-token` - Refresh JWT token
- POST `/api/v1/profiles/auth/logout` - Logout (invalidate session)

#### Profile Routes
**Location**: `src/features/profile/routes/profile.routes.ts`

- POST `/api/v1/profiles/register` - Register new user
- POST `/api/v1/profiles/verify-otp` - Verify OTP
- GET `/api/v1/profiles/{userId}` - Get profile
- PATCH `/api/v1/profiles/{userId}/fields` - Update profile field
- POST `/api/v1/profiles/{userId}/picture` - Upload profile picture
- GET `/api/v1/profiles/{userId}/dashboard` - Get integrated dashboard
- POST `/api/v1/profiles/{userId}/export` - Export profile data
- DELETE `/api/v1/profiles/{userId}` - Delete profile
- POST `/api/v1/profiles/{userId}/change-mobile` - Change mobile number

### Middleware

#### Auth Middleware
**Location**: `src/features/profile/middleware/auth.middleware.ts`

- `requireAuth()` - Require valid JWT token
- `optionalAuth()` - Optional JWT token (for public/private content)
- Token verification
- User context injection into request

## Data Models

### PostgreSQL Schema Design

**Table: user_profiles**
```sql
CREATE TABLE user_profiles (
  user_id VARCHAR(255) PRIMARY KEY,
  mobile_number VARCHAR(20) UNIQUE NOT NULL,
  country_code VARCHAR(10) NOT NULL,
  mobile_verified BOOLEAN DEFAULT FALSE,
  
  -- Basic Information
  name VARCHAR(100),
  profile_picture_url TEXT,
  profile_picture_thumbnail_url TEXT,
  profile_picture_uploaded_at TIMESTAMP,
  
  -- Location (JSONB for flexibility)
  location JSONB,
  
  -- User Details
  user_type VARCHAR(20) CHECK (user_type IN ('farmer', 'buyer', 'both')),
  crops_grown JSONB DEFAULT '[]'::jsonb,
  farm_size JSONB,
  language_preference VARCHAR(10),
  
  -- Financial
  bank_account JSONB,
  
  -- Authentication & Security
  pin_hash VARCHAR(255),
  biometric_enabled BOOLEAN DEFAULT FALSE,
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP,
  last_login_at TIMESTAMP,
  
  -- Metadata
  completion_percentage INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_active_at TIMESTAMP,
  
  -- Privacy (JSONB for flexible field-level settings)
  privacy_settings JSONB DEFAULT '{}'::jsonb,
  
  -- Gamification
  points_current INTEGER DEFAULT 0,
  points_lifetime INTEGER DEFAULT 0,
  points_last_updated TIMESTAMP,
  membership_tier VARCHAR(20) DEFAULT 'bronze',
  referral_code VARCHAR(20) UNIQUE,
  referred_by VARCHAR(255),
  daily_streak INTEGER DEFAULT 0,
  last_streak_date DATE,
  
  -- Trust
  trust_score INTEGER DEFAULT 50,
  
  -- Indexes
  CONSTRAINT fk_referred_by FOREIGN KEY (referred_by) REFERENCES user_profiles(user_id)
);

CREATE INDEX idx_mobile_number ON user_profiles(mobile_number);
CREATE INDEX idx_referral_code ON user_profiles(referral_code);
CREATE INDEX idx_membership_tier ON user_profiles(membership_tier);
CREATE INDEX idx_trust_score ON user_profiles(trust_score);
CREATE INDEX idx_created_at ON user_profiles(created_at);
```

**Table: otp_sessions** (SQLite for offline support)
```sql
CREATE TABLE otp_sessions (
  phone_number VARCHAR(20) PRIMARY KEY,
  otp VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Table: points_transactions**
```sql
CREATE TABLE points_transactions (
  transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  points INTEGER NOT NULL,
  type VARCHAR(10) CHECK (type IN ('earn', 'redeem')),
  activity VARCHAR(100) NOT NULL,
  description TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB,
  
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_points_user_id ON points_transactions(user_id);
CREATE INDEX idx_points_timestamp ON points_transactions(timestamp);
CREATE INDEX idx_points_type ON points_transactions(type);
```

**Table: trust_score_history**
```sql
CREATE TABLE trust_score_history (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  change INTEGER NOT NULL,
  reason TEXT NOT NULL,
  new_score INTEGER NOT NULL,
  
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_trust_user_id ON trust_score_history(user_id);
CREATE INDEX idx_trust_timestamp ON trust_score_history(timestamp);
```

**Table: referrals**
```sql
CREATE TABLE referrals (
  referral_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id VARCHAR(255) NOT NULL,
  referee_id VARCHAR(255) NOT NULL,
  referral_code VARCHAR(20) NOT NULL,
  registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  registration_points_awarded BOOLEAN DEFAULT FALSE,
  first_transaction_date TIMESTAMP,
  transaction_points_awarded BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'registered' CHECK (status IN ('registered', 'active', 'inactive')),
  
  CONSTRAINT fk_referrer FOREIGN KEY (referrer_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_referee FOREIGN KEY (referee_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  CONSTRAINT unique_referee UNIQUE (referee_id)
);

CREATE INDEX idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX idx_referrals_referee ON referrals(referee_id);
CREATE INDEX idx_referrals_code ON referrals(referral_code);
```

**Table: prompt_tracking**
```sql
CREATE TABLE prompt_tracking (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  field_name VARCHAR(100) NOT NULL,
  prompt_count INTEGER DEFAULT 0,
  last_prompted_at TIMESTAMP,
  dismissal_count INTEGER DEFAULT 0,
  last_dismissed_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'collected', 'user_declined')),
  collected_at TIMESTAMP,
  collection_source VARCHAR(50),
  
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  CONSTRAINT unique_user_field UNIQUE (user_id, field_name)
);

CREATE INDEX idx_prompt_user_id ON prompt_tracking(user_id);
CREATE INDEX idx_prompt_status ON prompt_tracking(status);
```

### User Profile Schema (TypeScript Interface)

```typescript
interface UserProfile {
  // Identity
  userId: string;
  mobileNumber: string;  // E.164 international format (e.g., +919876543210, +447700900123)
  countryCode: string;   // Country calling code (e.g., +91, +44, +1)
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
  
  // Authentication & Security
  pinHash?: string;  // bcrypt hash of PIN
  biometricEnabled: boolean;
  failedLoginAttempts: number;  // Counter for failed PIN/biometric attempts
  lockedUntil?: Date;  // Account lockout timestamp
  lastLoginAt?: Date;
  
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

### 1. User Registration Flow (with Mandatory Fields & Optional Auth Setup)

```
User → Enter Mobile Number (10 digits OR full international)
         ↓
    Validate Format → Normalize to E.164 → Extract Country Code
         ↓
    Send OTP via International SMS Gateway
         ↓
User ← Receive OTP
         ↓
User → Enter OTP
         ↓
    Verify OTP → OTP Session Valid
         ↓
    [MANDATORY] Collect Registration Fields
         ↓
User → Enter Name (2-100 characters)
         ↓
User → Select User Type (farmer / buyer / both)
         ↓
User → Provide Location (GPS OR Manual Text)
         ↓
    IF GPS:
      - Capture coordinates (latitude, longitude)
      - Store accuracy metadata
      - Mark as GPS location
         ↓
    IF Manual:
      - Accept text input (min 3 characters)
      - Suggest format: "Village/City, District, State"
      - Mark as manual location
         ↓
    Validate All Mandatory Fields (name, userType, location)
         ↓
    Create UserProfile → Initialize with mandatory fields
         ↓
    Store (mobileNumber in E.164, countryCode, name, userType, location)
         ↓
    Set completionPercentage = 40% (mandatory fields complete)
         ↓
    Award Bronze Tier, 50 Trust Score
         ↓
    [OPTIONAL] Offer PIN Setup
         ↓
    User chooses: Setup PIN / Skip
         ↓
    IF Setup PIN:
      - User enters 4-6 digit PIN (twice for confirmation)
      - Hash PIN with bcrypt
      - Store pinHash in UserProfile
         ↓
    [OPTIONAL] Offer Biometric Setup
         ↓
    User chooses: Enable Biometric / Skip
         ↓
    IF Enable Biometric:
      - Check device biometric capability
      - Set biometricEnabled = true in UserProfile
         ↓
    Generate JWT Token (30-day expiration)
         ↓
User ← Return { userId, token, profile }
```

**Mobile Number Handling:**
- 10 digits (e.g., 9876543210) → Normalized to +919876543210, countryCode: +91
- Full international (e.g., +447700900123) → Stored as-is, countryCode: +44
- Validation uses libphonenumber-js for accuracy
- Storage always in E.164 format for consistency

**Mandatory Fields:**
- Name: 2-100 characters, Unicode letters and spaces
- User Type: Must be 'farmer', 'buyer', or 'both'
- Location: GPS coordinates OR manual text (min 3 characters)
- Profile completeness starts at 40% after mandatory fields are collected

### 2. PIN Login Flow

```
User → Enter Mobile Number + PIN
         ↓
    Lookup UserProfile by mobileNumber
         ↓
    Check if account is locked (isAccountLocked())
         ↓
    IF locked AND lockoutUntil > now:
      - Calculate remaining minutes
      - Return error: "Account locked. Try again in X minutes or use OTP login"
         ↓
    IF not locked:
      - Compare PIN with pinHash (bcrypt.compare)
         ↓
      IF PIN matches:
        - Reset failedLoginAttempts = 0
        - Clear lockedUntil
        - Update lastLoginAt = now
        - Update lastActiveAt = now
        - Generate JWT Token (30-day expiration)
        - Return { success: true, token, profile }
         ↓
      IF PIN doesn't match:
        - Increment failedLoginAttempts
        - IF failedLoginAttempts >= 3:
          - Set lockedUntil = now + 30 minutes
          - Log security event
          - Send SMS notification
          - Return error: "Account locked for 30 minutes"
        - ELSE:
          - Return error: "Invalid PIN. X attempts remaining"
```

### 3. Biometric Login Flow

```
User → Request Biometric Login (mobileNumber)
         ↓
    Lookup UserProfile by mobileNumber
         ↓
    Check if biometricEnabled = true
         ↓
    IF not enabled:
      - Return error: "Biometric not enabled. Use PIN or OTP"
         ↓
    Check if account is locked (isAccountLocked())
         ↓
    IF locked AND lockoutUntil > now:
      - Return error: "Account locked. Try again in X minutes or use OTP login"
         ↓
    IF not locked:
      - Device performs biometric verification (fingerprint/face ID)
         ↓
      IF biometric succeeds:
        - Reset failedLoginAttempts = 0
        - Clear lockedUntil
        - Update lastLoginAt = now
        - Update lastActiveAt = now
        - Generate JWT Token (30-day expiration)
        - Return { success: true, token, profile }
         ↓
      IF biometric fails:
        - Increment failedLoginAttempts
        - IF failedLoginAttempts >= 3:
          - Set lockedUntil = now + 30 minutes
          - Log security event
          - Send SMS notification
          - Return error: "Account locked for 30 minutes"
        - ELSE:
          - Offer fallback: "Try PIN or OTP login"
```

### 4. OTP Login Flow (Always Available, Even When Locked)

```
User → Enter Mobile Number
         ↓
    Lookup UserProfile by mobileNumber
         ↓
    Generate 6-digit OTP
         ↓
    Send OTP via SMS
         ↓
    Store OTP with 10-minute expiration
         ↓
User ← Receive OTP
         ↓
User → Enter OTP
         ↓
    Verify OTP
         ↓
    IF OTP valid:
      - Reset failedLoginAttempts = 0 (unlock account)
      - Clear lockedUntil
      - Update lastLoginAt = now
      - Update lastActiveAt = now
      - Generate JWT Token (30-day expiration)
      - Return { success: true, token, profile }
         ↓
    IF OTP invalid:
      - Increment OTP attempt counter
      - IF attempts >= 3:
        - Invalidate OTP session
        - Return error: "Max attempts exceeded. Request new OTP"
```

### 5. JWT Token Verification Flow

```
API Request → Extract token from Authorization header
         ↓
    Parse JWT token
         ↓
    Verify signature with JWT_SECRET
         ↓
    Check expiration (30 days)
         ↓
    IF valid:
      - Extract payload: { userId, mobileNumber, name }
      - Inject user context into request
      - Continue to API handler
         ↓
    IF invalid/expired:
      - Return 401 Unauthorized
      - Suggest: "Please log in again"
```

### 6. Account Lockout & Recovery Flow

```
Failed Login Attempt (PIN or Biometric)
         ↓
    Increment failedLoginAttempts
         ↓
    IF failedLoginAttempts >= 3:
      - Set lockedUntil = now + 30 minutes
      - Log security event: { userId, event: 'account_locked', reason, timestamp }
      - Send SMS: "Your account has been locked for 30 minutes due to multiple failed login attempts"
         ↓
    User attempts login while locked
         ↓
    IF method = PIN or Biometric:
      - Calculate remaining minutes
      - Return error: "Account locked. Try again in X minutes or use OTP login"
         ↓
    IF method = OTP:
      - Allow OTP login (account recovery path)
      - On successful OTP verification:
        - Reset failedLoginAttempts = 0
        - Clear lockedUntil
        - Account unlocked
         ↓
    Auto-unlock after 30 minutes:
      - When lockoutUntil < now
      - isAccountLocked() returns false
      - User can attempt login again
```

### 7. Progressive Data Collection Flow

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

### 8. Implicit Profile Update Flow

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

### 9. Points Award Flow

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

### 10. Trust Score Update Flow

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

### Authentication APIs

#### Setup PIN
```
POST /api/v1/profiles/auth/setup-pin
Request: { 
  userId: string,
  pin: string,  // 4-6 digits
  confirmPin: string
}
Response: { 
  success: boolean,
  message: string
}
```

#### Change PIN
```
POST /api/v1/profiles/auth/change-pin
Request: { 
  userId: string,
  otp: string,  // Requires OTP verification first
  newPin: string,
  confirmNewPin: string
}
Response: { 
  success: boolean,
  message: string
}
```

#### Login with PIN
```
POST /api/v1/profiles/auth/login/pin
Request: { 
  mobileNumber: string,
  pin: string
}
Response: { 
  success: boolean,
  token: string,  // JWT token (30-day expiration)
  profile: UserProfile,
  message?: string  // Error message if locked
}
```

#### Login with Biometric
```
POST /api/v1/profiles/auth/login/biometric
Request: { 
  mobileNumber: string,
  biometricToken: string  // Device-generated token
}
Response: { 
  success: boolean,
  token: string,  // JWT token (30-day expiration)
  profile: UserProfile,
  message?: string  // Error message if locked
}
```

#### Login with OTP
```
POST /api/v1/profiles/auth/login/otp
Request: { 
  mobileNumber: string,
  otp: string
}
Response: { 
  success: boolean,
  token: string,  // JWT token (30-day expiration)
  profile: UserProfile
}
```

#### Verify Token
```
POST /api/v1/profiles/auth/verify-token
Request: { 
  token: string
}
Response: { 
  valid: boolean,
  payload?: {
    userId: string,
    mobileNumber: string,
    name: string
  }
}
```

#### Refresh Token
```
POST /api/v1/profiles/auth/refresh-token
Request: { 
  token: string  // Current token
}
Response: { 
  token: string,  // New JWT token (30-day expiration)
  expiresAt: Date
}
```

#### Logout
```
POST /api/v1/profiles/auth/logout
Request: { 
  token: string
}
Response: { 
  success: boolean
}
```

### Profile Management APIs

#### Create Profile (Registration)
```
POST /api/v1/profiles/register
Request: { mobileNumber: string }
Response: { userId: string, otpSent: boolean }
```

#### Verify OTP and Complete Registration
```
POST /api/v1/profiles/verify-otp
Request: { 
  userId: string,  // Mobile number from registration
  otp: string,
  name: string,  // MANDATORY: 2-100 characters
  userType: 'farmer' | 'buyer' | 'both',  // MANDATORY
  location: {  // MANDATORY: GPS OR manual
    type: 'gps' | 'manual',
    latitude?: number,  // Required if type='gps'
    longitude?: number,  // Required if type='gps'
    text?: string  // Required if type='manual', min 3 characters
  }
}
Response: { 
  verified: boolean, 
  token: string,  // JWT token generated after verification
  profile: UserProfile  // Profile with 40% completeness
}
```

#### Get Profile
```
GET /api/v1/profiles/{userId}
Headers: Authorization: Bearer <token>
Response: { profile: UserProfile }
```

#### Update Profile Field
```
PATCH /api/v1/profiles/{userId}/fields
Headers: Authorization: Bearer <token>
Request: { fieldName: string, value: any }
Response: { updated: boolean, completionPercentage: number }
```

#### Upload Profile Picture
```
POST /api/v1/profiles/{userId}/picture
Headers: Authorization: Bearer <token>
Request: multipart/form-data (image file)
Response: { url: string, thumbnailUrl: string }
```

#### Change Mobile Number
```
POST /api/v1/profiles/{userId}/change-mobile
Headers: Authorization: Bearer <token>
Request: { 
  currentOtp: string,  // OTP sent to current number
  newMobileNumber: string,
  newOtp: string  // OTP sent to new number
}
Response: { 
  success: boolean,
  message: string,
  newToken: string  // New JWT with updated mobile number
}
```

#### Export Profile Data
```
POST /api/v1/profiles/{userId}/export
Headers: Authorization: Bearer <token>
Response: { 
  data: UserProfile,  // Complete profile data in JSON
  exportedAt: Date
}
```

#### Delete Profile
```
DELETE /api/v1/profiles/{userId}
Headers: Authorization: Bearer <token>
Request: { 
  otp: string,  // Requires OTP confirmation
  confirmation: "DELETE"
}
Response: { 
  success: boolean,
  message: string,
  deletionScheduledFor: Date  // 30 days from now
}
```

### Gamification APIs

#### Get Points Balance
```
GET /api/v1/gamification/{userId}/points
Headers: Authorization: Bearer <token>
Response: { current: number, lifetime: number, tier: string }
```

#### Get Points History
```
GET /api/v1/gamification/{userId}/points/history
Headers: Authorization: Bearer <token>
Response: { transactions: PointsTransaction[] }
```

#### Redeem Points
```
POST /api/v1/gamification/{userId}/redeem
Headers: Authorization: Bearer <token>
Request: { rewardType: string, pointsCost: number }
Response: { success: boolean, newBalance: number }
```

#### Get Referral Code
```
GET /api/v1/gamification/{userId}/referral-code
Headers: Authorization: Bearer <token>
Response: { referralCode: string, referralCount: number }
```

### Trust Score APIs

#### Get Trust Score
```
GET /api/v1/trust/{userId}
Headers: Authorization: Bearer <token>
Response: { score: number, range: string, history: TrustScoreHistory[] }
```

#### Record Trust Event
```
POST /api/v1/trust/{userId}/event
Headers: Authorization: Bearer <token>
Request: { eventType: string, impact: number, reason: string }
Response: { newScore: number }
```

### Dashboard API

#### Get Integrated Dashboard
```
GET /api/v1/profiles/{userId}/dashboard
Headers: Authorization: Bearer <token>
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

### Mobile Number Validation and Normalization

```typescript
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';

interface ValidationResult {
  valid: boolean;
  normalizedNumber?: string;  // E.164 format
  countryCode?: string;       // e.g., +91, +44
  error?: string;
}

function validateAndNormalizeMobileNumber(input: string): ValidationResult {
  const cleaned = input.replace(/[\s-]/g, '');
  
  // Case 1: 10 digits without country code → Assume +91 (India)
  if (cleaned.length === 10 && /^[6-9]/.test(cleaned)) {
    const fullNumber = `+91${cleaned}`;
    if (isValidPhoneNumber(fullNumber, 'IN')) {
      return {
        valid: true,
        normalizedNumber: fullNumber,
        countryCode: '+91'
      };
    }
    return {
      valid: false,
      error: 'Invalid Indian mobile number. Must start with 6-9'
    };
  }
  
  // Case 2: Full international number with country code
  try {
    const phoneNumber = parsePhoneNumber(cleaned);
    if (phoneNumber && phoneNumber.isValid()) {
      return {
        valid: true,
        normalizedNumber: phoneNumber.format('E.164'),
        countryCode: `+${phoneNumber.countryCallingCode}`
      };
    }
  } catch (error) {
    return {
      valid: false,
      error: 'Invalid phone number format'
    };
  }
  
  return {
    valid: false,
    error: 'Invalid phone number. Provide 10 digits or full international format'
  };
}
```

**Examples:**
- Input: `9876543210` → Output: `+919876543210`, countryCode: `+91`
- Input: `+447700900123` → Output: `+447700900123`, countryCode: `+44`
- Input: `+12025551234` → Output: `+12025551234`, countryCode: `+1`
- Input: `1234567890` → Error: Invalid (doesn't start with 6-9 for Indian)

### Country Code Usage

```typescript
// Use country code for localization
function getDefaultLanguage(countryCode: string): string {
  const languageMap: Record<string, string> = {
    '+91': 'hi',  // India → Hindi
    '+44': 'en',  // UK → English
    '+1': 'en',   // US → English
    '+971': 'ar', // UAE → Arabic
    // ... more mappings
  };
  return languageMap[countryCode] || 'en';
}

// Use country code for display formatting
function formatMobileNumber(mobileNumber: string, countryCode: string): string {
  try {
    const phoneNumber = parsePhoneNumber(mobileNumber);
    return phoneNumber.formatNational(); // Localized format
  } catch {
    return mobileNumber; // Fallback to raw number
  }
}
```

### Profile Completeness Calculation

```typescript
function calculateCompletionPercentage(profile: UserProfile): number {
  const weights = {
    // Mandatory fields (40% total)
    mobileNumber: 10,      // Always present after registration
    name: 10,
    location: 10,
    userType: 10,
    
    // Optional fields (60% total)
    cropsGrown: 20,        // At least one crop
    languagePreference: 10,
    farmSize: 10,
    bankAccount: 10,
    profilePicture: 10
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

**Completeness Breakdown:**
- **Mandatory fields (40%)**: mobileNumber (10%), name (10%), location (10%), userType (10%)
- **Optional fields (60%)**: cropsGrown (20%), languagePreference (10%), farmSize (10%), bankAccount (10%), profilePicture (10%)

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

### Account Lockout Logic

```typescript
const LOCKOUT_RULES = {
  MAX_FAILED_ATTEMPTS: 3,
  LOCKOUT_DURATION_MINUTES: 30,
  RESET_ON_SUCCESS: true,
  ALLOW_OTP_WHEN_LOCKED: true  // For account recovery
};

async function handleFailedLogin(userId: string, method: 'pin' | 'biometric'): Promise<void> {
  const user = await getUserProfile(userId);
  
  // Increment failed attempts
  user.failedLoginAttempts += 1;
  
  // Check if lockout threshold reached
  if (user.failedLoginAttempts >= LOCKOUT_RULES.MAX_FAILED_ATTEMPTS) {
    const lockoutUntil = new Date(Date.now() + LOCKOUT_RULES.LOCKOUT_DURATION_MINUTES * 60 * 1000);
    user.lockedUntil = lockoutUntil;
    
    // Log lockout event
    await logSecurityEvent({
      userId,
      event: 'account_locked',
      reason: `${LOCKOUT_RULES.MAX_FAILED_ATTEMPTS} failed ${method} attempts`,
      lockedUntil
    });
    
    // Send SMS notification
    await sendSMS(user.mobileNumber, 
      `Your account has been locked for ${LOCKOUT_RULES.LOCKOUT_DURATION_MINUTES} minutes due to multiple failed login attempts.`
    );
  }
  
  await updateUserProfile(user);
}

async function handleSuccessfulLogin(userId: string): Promise<void> {
  const user = await getUserProfile(userId);
  
  // Reset failed attempts counter
  if (LOCKOUT_RULES.RESET_ON_SUCCESS) {
    user.failedLoginAttempts = 0;
    user.lockedUntil = undefined;
  }
  
  // Update last login timestamp
  user.lastLoginAt = new Date();
  user.lastActiveAt = new Date();
  
  await updateUserProfile(user);
}

function isAccountLocked(user: UserProfile): boolean {
  if (!user.lockedUntil) return false;
  
  // Check if lockout period has expired
  if (new Date() > user.lockedUntil) {
    // Auto-unlock
    return false;
  }
  
  return true;
}

async function attemptLogin(userId: string, method: 'pin' | 'biometric' | 'otp', credentials: any): Promise<LoginResult> {
  const user = await getUserProfile(userId);
  
  // Check if account is locked
  if (isAccountLocked(user) && method !== 'otp') {
    const remainingMinutes = Math.ceil((user.lockedUntil!.getTime() - Date.now()) / 60000);
    throw new Error(`Account is locked. Try again in ${remainingMinutes} minutes or use OTP login.`);
  }
  
  // Attempt authentication
  const authenticated = await verifyCredentials(user, method, credentials);
  
  if (authenticated) {
    await handleSuccessfulLogin(userId);
    return { success: true, token: generateJWT(user) };
  } else {
    await handleFailedLogin(userId, method);
    const attemptsRemaining = LOCKOUT_RULES.MAX_FAILED_ATTEMPTS - user.failedLoginAttempts;
    throw new Error(`Invalid credentials. ${attemptsRemaining} attempts remaining.`);
  }
}
```

## Integration Points

### External Services

1. **SMS Gateway** (OTP delivery)
   - Provider: Twilio / AWS SNS (with international support)
   - Fallback: Secondary provider
   - Supports: Global SMS delivery to 200+ countries
   - Cost monitoring: Per-country rate tracking

2. **Phone Number Validation** (International format validation)
   - Library: libphonenumber-js (v1.10+)
   - Purpose: Parse and validate international phone numbers
   - Features: E.164 formatting, country code extraction, format validation

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
