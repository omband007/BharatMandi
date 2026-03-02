# Code Cleanup Action Plan: Eliminate Duplicate Profile Management Implementations

## Executive Summary

**Problem**: Two separate implementations of profile management exist:
- `src/features/auth/` - Complete authentication + basic profile (from deprecated Auth spec)
- `src/features/profile/` - Comprehensive profile management but MISSING authentication (from User Profile Management spec)

**Solution**: Migrate missing authentication features from Auth to Profile, then delete Auth module.

**Status**: READY TO EXECUTE  
**Priority**: HIGH  
**Estimated Time**: 1-3 weeks depending on approach

---

## Current State Analysis

### What Auth Has (That Profile Needs)

| Feature | Auth Implementation | Profile Implementation | Action Required |
|---------|-------------------|----------------------|-----------------|
| PIN Setup | ✅ Working | ❌ Missing | Migrate |
| PIN Login | ✅ Working | ❌ Missing | Migrate |
| Biometric Login | ✅ Working | ❌ Missing | Migrate |
| JWT Token Generation | ✅ Working | ❌ Missing | Migrate |
| JWT Token Verification | ✅ Working | ❌ Missing | Migrate |
| Account Lockout Logic | ✅ Working | ❌ Missing | Migrate |
| Auth Middleware | ✅ Working | ❌ Missing | Migrate |
| Auth API Routes | ✅ Working | ❌ Missing | Migrate |

### What Profile Has (That Auth Doesn't)

| Feature | Profile Implementation | Auth Implementation | Status |
|---------|----------------------|-------------------|--------|
| Comprehensive UserProfile Model | ✅ Complete | ❌ Simple User model | Keep Profile |
| Progressive Profiling | ✅ Complete | ❌ Missing | Keep Profile |
| Profile Picture Management | ✅ Complete | ❌ Missing | Keep Profile |
| Privacy Controls | ✅ Complete | ❌ Missing | Keep Profile |
| International Mobile Support | ✅ Spec ready | ❌ Missing | Keep Profile |
| Gamification Integration | ✅ Spec ready | ❌ Missing | Keep Profile |
| Trust Scoring Integration | ✅ Spec ready | ❌ Missing | Keep Profile |

---

## Recommended Approach: Fast Migration (1 Week)

### Why This Approach?

- Fastest path to consolidation
- Minimal risk (copy working code)
- Can refactor later if needed
- Aligns with unified spec

### Phase 1: Create Auth Service in Profile (Days 1-2)

**Create**: `src/features/profile/services/auth.service.ts`

**Copy from Auth**:
```typescript
// From: src/features/auth/auth.service.ts

// 1. PIN Management
export async function setupPIN(userId: string, pin: string): Promise<{...}>
export async function changePIN(userId: string, oldPin: string, newPin: string): Promise<{...}>

// 2. Authentication
export async function loginWithPIN(mobileNumber: string, pin: string): Promise<LoginResponse>
export async function loginWithBiometric(mobileNumber: string): Promise<LoginResponse>

// 3. JWT Management
export function generateToken(user: UserProfile): string
export function verifyToken(token: string): TokenPayload | null
export function refreshToken(token: string): string

// 4. Account Security
export async function checkAccountLockout(userId: string): Promise<boolean>
export async function handleFailedLogin(userId: string): Promise<void>
export async function handleSuccessfulLogin(userId: string): Promise<void>
```

**Adaptations Needed**:
- Change `User` type to `UserProfile`
- Update JWT expiration from 7 days to 30 days
- Use Profile's database schema (with lockout fields)
- Update imports to use Profile types

---

### Phase 2: Create Auth Routes in Profile (Day 3)

**Create**: `src/features/profile/routes/auth.routes.ts`

**Copy from Auth**:
```typescript
// From: src/features/auth/auth.controller.ts

POST /api/v1/profiles/auth/setup-pin
POST /api/v1/profiles/auth/change-pin
POST /api/v1/profiles/auth/login/pin
POST /api/v1/profiles/auth/login/biometric
POST /api/v1/profiles/auth/verify-token
POST /api/v1/profiles/auth/refresh-token
POST /api/v1/profiles/auth/logout
```

**Backward Compatibility Routes** (temporary):
```typescript
// Keep old Auth endpoints working temporarily
POST /api/auth/setup-pin → routes to Profile auth service
POST /api/auth/login → routes to Profile auth service
POST /api/auth/login/biometric → routes to Profile auth service
```

---

### Phase 3: Create Auth Middleware (Day 3)

**Create**: `src/features/profile/middleware/auth.middleware.ts`

**Copy from Auth**:
```typescript
// From: src/features/auth/auth.service.ts::verifyToken()

export function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const payload = verifyToken(token);
  
  if (!payload) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  req.user = payload;
  next();
}

export function optionalAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const payload = verifyToken(token);
  
  if (payload) {
    req.user = payload;
  }
  
  next();
}
```

---

### Phase 4: Update Profile Registration (Day 4)

**Update**: `src/features/profile/services/registration.service.ts`

**Changes**:
1. After OTP verification, offer PIN setup
2. After PIN setup, offer biometric setup
3. Generate JWT token after registration
4. Return session token in registration response

**Integration**:
```typescript
// In registration.service.ts

import { setupPIN, generateToken } from './auth.service';

export async function completeRegistration(userId: string, data: RegistrationData) {
  // ... existing registration logic ...
  
  // Offer PIN setup
  if (data.pin) {
    await setupPIN(userId, data.pin);
  }
  
  // Generate session token
  const profile = await getProfile(userId);
  const token = generateToken(profile);
  
  return {
    success: true,
    userId,
    token,
    profile
  };
}
```

---

### Phase 5: Migrate Tests (Day 5)

**Copy Tests**:
```
src/features/auth/__tests__/auth.service.test.ts
  → src/features/profile/services/__tests__/auth.service.test.ts

src/features/auth/auth.service.pbt.test.ts
  → src/features/profile/services/__tests__/auth.service.pbt.test.ts
```

**Update Tests**:
- Change imports to use Profile auth service
- Update types from `User` to `UserProfile`
- Update JWT expiration expectations (7d → 30d)
- Add tests for account lockout (Requirement 24A)

---

### Phase 6: Integration Testing (Day 6)

**Test Scenarios**:
1. ✅ Registration flow with PIN setup
2. ✅ Registration flow with biometric setup
3. ✅ PIN login with correct PIN
4. ✅ PIN login with incorrect PIN (3 attempts → lockout)
5. ✅ Biometric login
6. ✅ Account lockout after 3 failed attempts
7. ✅ Auto-unlock after 30 minutes
8. ✅ OTP login while account is locked
9. ✅ JWT token generation and verification
10. ✅ Protected API endpoints with auth middleware
11. ✅ Backward compatibility with old `/api/auth/*` endpoints

**Test Commands**:
```bash
# Run all profile tests
npm test -- src/features/profile

# Run auth service tests specifically
npm test -- src/features/profile/services/__tests__/auth.service.test.ts

# Run property-based tests
npm test -- src/features/profile/services/__tests__/auth.service.pbt.test.ts
```

---

### Phase 7: Deploy and Monitor (Day 7)

**Deployment Steps**:
1. Deploy to staging environment
2. Run smoke tests on staging
3. Monitor error logs for 24 hours
4. Deploy to production with feature flag
5. Gradually roll out to users (10% → 50% → 100%)
6. Monitor authentication success rates
7. Monitor API error rates

**Rollback Plan**:
- If critical issues detected, route traffic back to Auth module
- Fix issues in Profile implementation
- Re-deploy when ready

---

### Phase 8: Delete Auth Module (Week 2)

**Only After**:
- ✅ All tests passing
- ✅ Production deployment successful
- ✅ No regressions detected for 7 days
- ✅ Authentication success rate stable
- ✅ Error rates normal

**Deletion Steps**:
1. Remove backward compatibility routes
2. Delete `src/features/auth/` directory
3. Remove Auth routes from main app
4. Update all imports across codebase
5. Update API documentation
6. Update developer guides
7. Notify team of changes

---

## Detailed File Migration Checklist

### Files to Create in Profile

- [ ] `src/features/profile/services/auth.service.ts`
  - [ ] setupPIN()
  - [ ] changePIN()
  - [ ] loginWithPIN()
  - [ ] loginWithBiometric()
  - [ ] generateToken()
  - [ ] verifyToken()
  - [ ] refreshToken()
  - [ ] checkAccountLockout()
  - [ ] handleFailedLogin()
  - [ ] handleSuccessfulLogin()

- [ ] `src/features/profile/routes/auth.routes.ts`
  - [ ] POST /api/v1/profiles/auth/setup-pin
  - [ ] POST /api/v1/profiles/auth/change-pin
  - [ ] POST /api/v1/profiles/auth/login/pin
  - [ ] POST /api/v1/profiles/auth/login/biometric
  - [ ] POST /api/v1/profiles/auth/verify-token
  - [ ] POST /api/v1/profiles/auth/refresh-token
  - [ ] POST /api/v1/profiles/auth/logout

- [ ] `src/features/profile/middleware/auth.middleware.ts`
  - [ ] requireAuth()
  - [ ] optionalAuth()

- [ ] `src/features/profile/services/__tests__/auth.service.test.ts`
  - [ ] Migrate all unit tests from Auth

- [ ] `src/features/profile/services/__tests__/auth.service.pbt.test.ts`
  - [ ] Migrate all property-based tests from Auth

### Files to Update in Profile

- [ ] `src/features/profile/services/registration.service.ts`
  - [ ] Add PIN setup integration
  - [ ] Add biometric setup integration
  - [ ] Add JWT token generation
  - [ ] Return session token in response

- [ ] `src/features/profile/types/profile.types.ts`
  - [ ] Add LoginResponse type
  - [ ] Add TokenPayload type
  - [ ] Add AuthenticationMethod type

- [ ] `src/features/profile/models/profile.schema.ts`
  - [ ] Already has lockout fields ✅
  - [ ] Verify pinHash field exists ✅
  - [ ] Verify biometricEnabled field exists ✅

### Files to Delete (After Migration Complete)

- [ ] `src/features/auth/auth.service.ts`
- [ ] `src/features/auth/auth.controller.ts`
- [ ] `src/features/auth/auth.types.ts`
- [ ] `src/features/auth/auth.service.test.ts`
- [ ] `src/features/auth/auth.service.pbt.test.ts`
- [ ] `src/features/auth/__tests__/` (entire directory)
- [ ] `src/features/auth/index.ts`
- [ ] `src/features/auth/` (entire directory)

---

## Key Adaptations Required

### 1. Data Model Changes

**Auth Uses**:
```typescript
interface User {
  id: string;
  phoneNumber: string;
  name: string;
  userType: 'farmer' | 'buyer';
  pin?: string;
  failedLoginAttempts?: number;
  lockedUntil?: Date;
}
```

**Profile Uses**:
```typescript
interface UserProfile {
  userId: string;
  mobileNumber: string;  // E.164 format
  countryCode: string;
  name?: string;
  userType?: 'farmer' | 'buyer' | 'both';
  pinHash?: string;
  biometricEnabled: boolean;
  failedLoginAttempts: number;
  lockedUntil?: Date;
  lastLoginAt?: Date;
  // ... 30+ more fields
}
```

**Mapping**:
- `id` → `userId`
- `phoneNumber` → `mobileNumber`
- `pin` → `pinHash`
- Add `countryCode` extraction
- Add `biometricEnabled` flag
- Add `lastLoginAt` tracking

---

### 2. JWT Token Changes

**Auth Current**:
```typescript
const JWT_EXPIRY = '7d';  // 7 days
```

**Profile Target** (per unified spec):
```typescript
const JWT_EXPIRY = '30d';  // 30 days
```

**Update Required**: Change expiration in token generation

---

### 3. Account Lockout Implementation

**Auth Current**:
```typescript
// Lockout after 3 failed attempts for 30 minutes
if (failedAttempts >= 3) {
  const lockUntil = new Date(Date.now() + 30 * 60 * 1000);
  await sqliteHelpers.lockAccount(normalizedPhone, lockUntil);
}
```

**Profile Target** (per Requirement 24A):
```typescript
// Same logic, but use UserProfile schema fields
if (profile.failedLoginAttempts >= 3) {
  profile.lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
  await updateProfile(profile.userId, { 
    failedLoginAttempts: profile.failedLoginAttempts,
    lockedUntil: profile.lockedUntil 
  });
}
```

**Update Required**: Use Profile's database schema instead of Auth's

---

### 4. Mobile Number Format

**Auth Current**:
```typescript
// Removes +91 prefix
function normalizePhoneNumber(phone: string): string {
  return phone.replace(/^\+91/, '');
}
```

**Profile Target** (per Requirements 1, 36, 37):
```typescript
// Stores in E.164 international format
function normalizePhoneNumber(phone: string): string {
  if (phone.length === 10) {
    // Assume Indian number
    return `+91${phone}`;
  }
  // Already international format
  return phone;
}
```

**Update Required**: Store in E.164 format, extract country code

---

## Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Authentication breaks | CRITICAL | LOW | Thorough testing, feature flag, rollback plan |
| Data loss | CRITICAL | VERY LOW | No data migration needed (only code) |
| API breaking changes | HIGH | LOW | Maintain backward compatibility temporarily |
| Performance degradation | MEDIUM | LOW | Load testing before deployment |
| Missing functionality | MEDIUM | LOW | Comprehensive test coverage |
| User disruption | HIGH | LOW | Gradual rollout, monitoring |

---

## Success Criteria

### Migration Complete When:
- [x] Unified spec created (DONE)
- [ ] Auth service created in Profile
- [ ] Auth routes created in Profile
- [ ] Auth middleware created in Profile
- [ ] Registration service updated
- [ ] All tests migrated and passing
- [ ] Integration tests passing
- [ ] Deployed to staging successfully
- [ ] Deployed to production successfully
- [ ] No regressions detected for 7 days
- [ ] Auth module deleted
- [ ] Documentation updated

---

## Next Steps

### Immediate Actions (This Week)

1. **Review and Approve** this action plan
2. **Create feature branch**: `feature/consolidate-auth-profile`
3. **Start Phase 1**: Create `auth.service.ts` in Profile
4. **Daily standups**: Track progress and blockers

### Week 1 Tasks

- [ ] Day 1: Create auth.service.ts (PIN, biometric, JWT)
- [ ] Day 2: Complete auth.service.ts (lockout, helpers)
- [ ] Day 3: Create auth.routes.ts and auth.middleware.ts
- [ ] Day 4: Update registration.service.ts integration
- [ ] Day 5: Migrate tests
- [ ] Day 6: Integration testing
- [ ] Day 7: Deploy to staging

### Week 2 Tasks

- [ ] Day 1-3: Monitor staging, fix issues
- [ ] Day 4: Deploy to production (10% rollout)
- [ ] Day 5: Increase to 50% rollout
- [ ] Day 6: Increase to 100% rollout
- [ ] Day 7: Monitor production

### Week 3 Tasks (If All Stable)

- [ ] Remove backward compatibility routes
- [ ] Delete Auth module
- [ ] Update documentation
- [ ] Team training
- [ ] Close consolidation project

---

## Alternative: Slower, Cleaner Migration (3 Weeks)

If you prefer a more thorough refactoring approach:

### Week 1: Design & Architecture
- Redesign auth service with clean architecture
- Write comprehensive test suite first (TDD)
- Design new API contracts

### Week 2: Implementation
- Implement auth service from scratch
- Implement auth routes and middleware
- Migrate tests

### Week 3: Testing & Deployment
- Integration testing
- Performance testing
- Gradual deployment
- Delete Auth module

**Pros**: Cleaner code, better architecture  
**Cons**: Takes longer, more risk of introducing bugs

---

## Recommendation

**Use Fast Migration (1 Week)** because:
1. Auth code is already working and tested
2. Minimal risk of introducing bugs
3. Faster time to consolidation
4. Can refactor later if needed
5. Aligns with unified spec requirements

---

## Questions to Answer Before Starting

1. **Do we have a staging environment?** (for testing before production)
2. **Do we have feature flags?** (for gradual rollout)
3. **Do we have monitoring/alerting?** (to detect issues quickly)
4. **Who will review the code?** (need approval before merging)
5. **When is the best time to deploy?** (low-traffic period)

---

## References

- [Unified Spec](.kiro/specs/features/user-profile-management/requirements.md)
- [Code Consolidation Plan](./CODE-CONSOLIDATION-PLAN.md)
- [Profile vs Auth Comparison](./PROFILE-VS-AUTH-COMPARISON.md)
- [Consolidation Notes](.kiro/specs/features/user-profile-management/CONSOLIDATION-NOTES.md)

---

**Status**: READY TO EXECUTE  
**Date**: 2026-03-02  
**Next Action**: Review and approve, then start Phase 1  
**Estimated Completion**: 1-3 weeks depending on approach
