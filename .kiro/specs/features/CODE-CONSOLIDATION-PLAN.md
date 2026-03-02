# Code Consolidation Plan: Duplicate Profile Management Implementations

## Overview

There are TWO separate implementations of profile management in the codebase:
1. **Auth Implementation**: `src/features/auth/` (from Auth spec)
2. **Profile Implementation**: `src/features/profile/` (from User Profile Management spec)

Both implement similar functionality (registration, OTP, profile management) but with different approaches and APIs.

**Date**: 2026-03-02  
**Status**: ANALYSIS COMPLETE - CLEANUP REQUIRED  
**Priority**: HIGH

---

## Duplicate Implementations Identified

### 1. Registration & OTP Verification

**Auth Implementation** (`src/features/auth/auth.service.ts`):
- `requestOTP(phoneNumber)` - Request OTP
- `verifyOTP(phoneNumber, otp)` - Verify OTP
- `createUser(userData)` - Create user after OTP verification
- Uses `sqliteHelpers` for OTP sessions
- Normalizes phone numbers (removes +91 prefix)
- Stores in `verifiedPhoneNumbers` Set (in-memory)

**Profile Implementation** (`src/features/profile/services/registration.service.ts`):
- `register(request)` - Request OTP
- `verifyOTP(request)` - Verify OTP
- `createInitialProfile(mobileNumber)` - Create profile
- Uses `sqliteHelpers` for OTP sessions
- Validates Indian mobile format
- Creates comprehensive UserProfile

**Conflict**: TWO separate registration flows with different data models

---

### 2. User Data Models

**Auth Implementation** (`src/features/auth/auth.types.ts`):
```typescript
interface User {
  id: string;
  phoneNumber: string;
  name: string;
  userType: 'farmer' | 'buyer';
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  bankAccount?: {...};
  createdAt: Date;
  pin?: string;  // Added later
  failedLoginAttempts?: number;
  lockedUntil?: Date;
}
```

**Profile Implementation** (`src/features/profile/models/profile.schema.ts`):
```typescript
interface UserProfile {
  userId: string;
  mobileNumber: string;
  countryCode: string;
  mobileVerified: boolean;
  name?: string;
  profilePicture?: {...};
  location?: {...};
  userType?: 'farmer' | 'buyer' | 'both';
  cropsGrown?: [...];
  farmSize?: {...};
  languagePreference?: string;
  bankAccount?: {...};
  pinHash?: string;
  biometricEnabled: boolean;
  failedLoginAttempts: number;
  lockedUntil?: Date;
  lastLoginAt?: Date;
  completionPercentage: number;
  points: {...};
  membershipTier: string;
  referralCode: string;
  trustScore: number;
  trustScoreHistory: [...];
  privacySettings: {...};
  // ... many more fields
}
```

**Conflict**: TWO incompatible data models for the same entity (User)

---

### 3. API Endpoints

**Auth Implementation** (`src/features/auth/auth.controller.ts`):
- `POST /api/auth/request-otp`
- `POST /api/auth/verify-otp`
- `POST /api/auth/register`
- `POST /api/auth/setup-pin`
- `POST /api/auth/login`
- `POST /api/auth/login/biometric`
- `GET /api/auth/profile/:userId`
- `PUT /api/auth/profile/:userId`
- `GET /api/auth/user/:phoneNumber`

**Profile Implementation** (from spec, not fully implemented yet):
- `POST /api/v1/profiles/register`
- `POST /api/v1/profiles/verify-otp`
- `GET /api/v1/profiles/{userId}`
- `PATCH /api/v1/profiles/{userId}/fields`
- `POST /api/v1/profiles/{userId}/picture`

**Conflict**: TWO different API patterns for the same functionality

---

### 4. PIN & Authentication

**Auth Implementation**:
- `setupPIN(phoneNumber, pin)` - Set up PIN
- `loginWithPIN(phoneNumber, pin)` - Login with PIN
- `loginWithBiometric(phoneNumber)` - Biometric login
- `verifyToken(token)` - JWT verification
- JWT expiration: 7 days
- Uses bcrypt for PIN hashing
- Account lockout after 3 failed attempts (30 min)

**Profile Implementation**:
- Not yet implemented (only in spec)
- Spec defines JWT expiration: 30 days
- Spec defines account lockout (Requirement 24A)

**Conflict**: Auth has working implementation, Profile only has spec

---

### 5. Profile Management

**Auth Implementation**:
- `getUserProfile(userId)` - Get profile
- `updateUserProfile(userId, updates)` - Update profile
- Requires re-verification for sensitive data
- Simple validation

**Profile Implementation**:
- Not fully implemented yet
- Spec defines comprehensive profile management
- Progressive profiling
- Gamification
- Trust scoring
- Privacy controls

**Conflict**: Auth has basic implementation, Profile has comprehensive spec

---

## Consolidation Strategy

### Option 1: Migrate Auth to Profile (RECOMMENDED)

**Approach**: Keep Profile implementation as primary, migrate Auth functionality

**Why**:
- Profile spec is more comprehensive (38 requirements)
- Profile data model supports all features
- Profile implementation aligns with unified spec
- Auth implementation is simpler and easier to migrate

**Steps**:
1. Keep `src/features/profile/` as primary
2. Migrate Auth's working code to Profile:
   - PIN setup and login logic
   - Biometric login logic
   - JWT token generation
   - Account lockout implementation
3. Update Profile to use Auth's API endpoints temporarily (backward compatibility)
4. Gradually migrate to new API pattern
5. Deprecate `src/features/auth/`

---

### Option 2: Keep Auth, Extend with Profile Features

**Approach**: Keep Auth implementation, add Profile features to it

**Why**:
- Auth implementation is working and tested
- Less disruption to existing code
- Incremental enhancement

**Steps**:
1. Keep `src/features/auth/` as primary
2. Extend Auth's User model with Profile fields
3. Add Profile features (gamification, trust, etc.)
4. Update Auth spec to match unified spec
5. Deprecate `src/features/profile/`

**Cons**:
- Auth data model is simpler, needs major extension
- Auth doesn't have progressive profiling architecture
- More work to add all Profile features

---

## Recommended Approach: Option 1 (Migrate Auth to Profile)

### Phase 1: Analysis & Planning (Week 1)

**Tasks**:
- [x] Identify all duplicate code
- [x] Create consolidation plan
- [ ] Map Auth functions to Profile equivalents
- [ ] Identify dependencies on Auth code
- [ ] Create migration checklist

---

### Phase 2: Migrate Core Authentication (Week 2)

**Tasks**:
- [ ] Copy PIN setup logic from Auth to Profile
  - Source: `auth.service.ts::setupPIN()`
  - Destination: `src/features/profile/services/auth.service.ts` (new file)
  
- [ ] Copy PIN login logic from Auth to Profile
  - Source: `auth.service.ts::loginWithPIN()`
  - Destination: `src/features/profile/services/auth.service.ts`
  
- [ ] Copy biometric login logic from Auth to Profile
  - Source: `auth.service.ts::loginWithBiometric()`
  - Destination: `src/features/profile/services/auth.service.ts`
  
- [ ] Copy JWT token logic from Auth to Profile
  - Source: `auth.service.ts::verifyToken()`
  - Destination: `src/features/profile/services/auth.service.ts`
  
- [ ] Update JWT expiration from 7 days to 30 days
  - Align with unified spec

- [ ] Copy account lockout logic from Auth to Profile
  - Source: `auth.service.ts::loginWithPIN()` (lockout checks)
  - Destination: `src/features/profile/services/auth.service.ts`
  - Already specified in unified spec (Requirement 24A)

---

### Phase 3: Migrate API Endpoints (Week 3)

**Tasks**:
- [ ] Create backward-compatible API routes
  - Keep `/api/auth/*` endpoints working
  - Route to Profile implementation internally
  
- [ ] Implement new `/api/v1/profiles/*` endpoints
  - `POST /api/v1/profiles/register`
  - `POST /api/v1/profiles/verify-otp`
  - `POST /api/v1/profiles/login` (PIN/biometric)
  - `GET /api/v1/profiles/{userId}`
  - `PATCH /api/v1/profiles/{userId}/fields`
  
- [ ] Add deprecation warnings to old endpoints
  - Log warnings when `/api/auth/*` is used
  - Include migration instructions

---

### Phase 4: Update Data Model (Week 4)

**Tasks**:
- [ ] Migrate existing User data to UserProfile schema
  - Create migration script
  - Map Auth User fields to Profile UserProfile fields
  - Add default values for new fields
  
- [ ] Update database schema
  - Already done in `profile.schema.ts`
  - Add migration for existing data
  
- [ ] Update all code references
  - Change `User` type to `UserProfile`
  - Update imports

---

### Phase 5: Testing & Validation (Week 5)

**Tasks**:
- [ ] Update Auth tests to use Profile implementation
  - Migrate `auth.service.test.ts` tests
  - Migrate `auth.service.pbt.test.ts` tests
  
- [ ] Add new tests for Profile features
  - Progressive profiling tests
  - Gamification tests
  - Trust scoring tests
  
- [ ] Integration testing
  - Test registration flow end-to-end
  - Test authentication flow end-to-end
  - Test profile management end-to-end
  
- [ ] Backward compatibility testing
  - Ensure old `/api/auth/*` endpoints still work
  - Test with existing clients

---

### Phase 6: Deprecation & Cleanup (Week 6)

**Tasks**:
- [ ] Mark Auth implementation as deprecated
  - Add deprecation comments to all Auth files
  - Update README
  
- [ ] Remove Auth implementation (after grace period)
  - Delete `src/features/auth/` directory
  - Remove Auth routes from app
  - Update all imports
  
- [ ] Update documentation
  - API documentation
  - Developer guides
  - Deployment docs

---

## File-by-File Migration Plan

### Files to Migrate FROM Auth TO Profile

| Auth File | Profile Destination | Action |
|-----------|-------------------|--------|
| `auth.service.ts::setupPIN()` | `profile/services/auth.service.ts` | Copy & adapt |
| `auth.service.ts::loginWithPIN()` | `profile/services/auth.service.ts` | Copy & adapt |
| `auth.service.ts::loginWithBiometric()` | `profile/services/auth.service.ts` | Copy & adapt |
| `auth.service.ts::verifyToken()` | `profile/services/auth.service.ts` | Copy & adapt |
| `auth.service.ts::normalizePhoneNumber()` | `profile/services/registration.service.ts` | Merge with existing validation |
| `auth.controller.ts` (all routes) | `profile/routes/auth.routes.ts` | Create new file, copy routes |
| `auth.types.ts` | `profile/types/profile.types.ts` | Merge types |
| `auth.service.test.ts` | `profile/services/__tests__/auth.service.test.ts` | Copy & update |
| `auth.service.pbt.test.ts` | `profile/services/__tests__/auth.service.pbt.test.ts` | Copy & update |

### Files to Keep in Profile (Already Exist)

| File | Status | Notes |
|------|--------|-------|
| `profile/services/registration.service.ts` | ✅ Keep | Already implements registration |
| `profile/models/profile.schema.ts` | ✅ Keep | Comprehensive schema |
| `profile/types/profile.types.ts` | ✅ Keep | Comprehensive types |
| `profile/constants/profile.constants.ts` | ✅ Keep | Validation rules |

### Files to Create in Profile

| File | Purpose |
|------|---------|
| `profile/services/auth.service.ts` | PIN/biometric auth, JWT tokens |
| `profile/services/profile-manager.service.ts` | Profile CRUD operations |
| `profile/routes/auth.routes.ts` | Authentication API routes |
| `profile/routes/profile.routes.ts` | Profile management API routes |
| `profile/middleware/auth.middleware.ts` | JWT verification middleware |

---

## API Migration Strategy

### Backward Compatibility Approach

**Phase 1: Dual Endpoints (Weeks 2-4)**
- Both `/api/auth/*` and `/api/v1/profiles/*` work
- Old endpoints route to new implementation internally
- Log deprecation warnings

**Phase 2: Deprecation Notice (Weeks 5-8)**
- Add deprecation headers to old endpoints
- Update API documentation
- Notify API consumers

**Phase 3: Removal (Week 9+)**
- Remove old `/api/auth/*` endpoints
- Only `/api/v1/profiles/*` remains

### Endpoint Mapping

| Old Endpoint (Auth) | New Endpoint (Profile) | Notes |
|---------------------|----------------------|-------|
| `POST /api/auth/request-otp` | `POST /api/v1/profiles/register` | Combined |
| `POST /api/auth/verify-otp` | `POST /api/v1/profiles/verify-otp` | Same |
| `POST /api/auth/register` | `POST /api/v1/profiles/complete-registration` | New |
| `POST /api/auth/setup-pin` | `POST /api/v1/profiles/auth/setup-pin` | Moved |
| `POST /api/auth/login` | `POST /api/v1/profiles/auth/login` | Moved |
| `POST /api/auth/login/biometric` | `POST /api/v1/profiles/auth/login/biometric` | Moved |
| `GET /api/auth/profile/:userId` | `GET /api/v1/profiles/:userId` | Simplified |
| `PUT /api/auth/profile/:userId` | `PATCH /api/v1/profiles/:userId` | Changed method |

---

## Data Migration Strategy

### Database Migration Script

```typescript
// migration-auth-to-profile.ts

async function migrateAuthUsersToProfiles() {
  // 1. Get all users from Auth schema
  const authUsers = await getAuthUsers();
  
  // 2. For each user, create UserProfile
  for (const authUser of authUsers) {
    const profile: UserProfile = {
      userId: authUser.id,
      mobileNumber: authUser.phoneNumber,
      countryCode: '+91',  // Default for existing users
      mobileVerified: true,
      name: authUser.name,
      location: authUser.location,
      userType: authUser.userType,
      bankAccount: authUser.bankAccount,
      
      // New fields with defaults
      pinHash: authUser.pin,  // Migrate PIN hash
      biometricEnabled: false,
      failedLoginAttempts: authUser.failedLoginAttempts || 0,
      lockedUntil: authUser.lockedUntil,
      lastLoginAt: undefined,
      completionPercentage: calculateInitialCompleteness(authUser),
      points: { current: 0, lifetime: 0, lastUpdated: new Date() },
      membershipTier: 'bronze',
      referralCode: await generateReferralCode(),
      trustScore: 50,
      trustScoreHistory: [{
        timestamp: new Date(),
        change: 50,
        reason: 'Migrated from Auth system',
        newScore: 50
      }],
      privacySettings: DEFAULT_PRIVACY_SETTINGS,
      createdAt: authUser.createdAt,
      updatedAt: new Date(),
      lastActiveAt: new Date()
    };
    
    await UserProfileModel.create(profile);
  }
}
```

---

## Testing Strategy

### Unit Tests to Migrate
- [x] Auth OTP tests → Profile registration tests
- [ ] Auth PIN tests → Profile auth tests
- [ ] Auth login tests → Profile auth tests
- [ ] Auth profile tests → Profile manager tests

### Integration Tests to Create
- [ ] End-to-end registration flow
- [ ] End-to-end authentication flow
- [ ] End-to-end profile management flow
- [ ] Backward compatibility tests

### Property-Based Tests to Migrate
- [ ] Auth PBT tests → Profile PBT tests
- [ ] Add new PBT tests for Profile features

---

## Rollback Plan

### If Migration Fails

**Immediate Rollback**:
1. Revert to Auth implementation
2. Disable new Profile endpoints
3. Re-enable old Auth endpoints
4. Restore database from backup

**Partial Rollback**:
1. Keep both implementations running
2. Route traffic based on feature flag
3. Fix issues in Profile implementation
4. Retry migration

---

## Success Criteria

### Migration Complete When:
- [ ] All Auth functionality works in Profile implementation
- [ ] All tests passing
- [ ] API backward compatibility maintained
- [ ] Data migration successful (no data loss)
- [ ] Performance equivalent or better
- [ ] Documentation updated
- [ ] Team trained on new implementation

---

## Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Data loss during migration | HIGH | LOW | Backup before migration, test thoroughly |
| API breaking changes | HIGH | MEDIUM | Maintain backward compatibility |
| Performance degradation | MEDIUM | LOW | Load testing before deployment |
| Missing functionality | MEDIUM | MEDIUM | Comprehensive testing, feature parity checklist |
| User disruption | HIGH | LOW | Phased rollout, feature flags |

---

## Next Steps

### Immediate (This Week)
1. [ ] Review and approve this consolidation plan
2. [ ] Create detailed task breakdown
3. [ ] Set up feature flags for gradual rollout
4. [ ] Create database backup strategy

### Short-term (Weeks 2-3)
1. [ ] Begin Phase 2: Migrate core authentication
2. [ ] Create new Profile auth service
3. [ ] Copy PIN/biometric/JWT logic
4. [ ] Update tests

### Medium-term (Weeks 4-6)
1. [ ] Complete API migration
2. [ ] Data migration
3. [ ] Testing and validation
4. [ ] Deprecation notices

### Long-term (Weeks 7+)
1. [ ] Remove Auth implementation
2. [ ] Complete documentation
3. [ ] Team training
4. [ ] Monitor production

---

## References

- [Unified Spec](./user-profile-management/requirements.md)
- [Consolidation Notes](./user-profile-management/CONSOLIDATION-NOTES.md)
- [Spec Conflict Analysis](./SPEC-CONFLICT-ANALYSIS.md)

---

**Status**: PLAN COMPLETE - AWAITING APPROVAL  
**Date**: 2026-03-02  
**Next Action**: Review and approve consolidation plan
