# Spec Conflict Analysis: Auth vs User Profile Management

## Executive Summary

**Status**: ⚠️ SIGNIFICANT OVERLAP AND CONFLICTS DETECTED

There is substantial duplication between the Auth spec and User Profile Management spec. Both specs cover:
- Mobile number registration
- OTP verification
- PIN/biometric authentication
- Profile management
- Session management

**Recommendation**: Consolidate into a single unified spec OR clearly delineate responsibilities.

---

## Detailed Conflict Analysis

### 🔴 CRITICAL CONFLICTS (Same Functionality, Different Specs)

#### 1. Mobile Number Registration & OTP Verification

**Auth Spec (Requirement 1)**:
- OTP-based registration
- Mobile number validation (not specified in detail)
- OTP expiration: 10 minutes
- Retry attempts: 3
- Creates user account after OTP verification

**User Profile Management Spec (Requirements 1-2)**:
- Mobile number registration with international support
- Detailed validation rules (10 digits → +91, international → E.164)
- OTP expiration: 10 minutes ✅ CONSISTENT
- Retry attempts: 3 ✅ CONSISTENT
- Creates user profile after OTP verification

**Conflict Type**: DUPLICATE FUNCTIONALITY
**Impact**: HIGH - Two specs defining the same registration flow
**Resolution Needed**: YES

---

#### 2. PIN Authentication

**Auth Spec (Requirement 2)**:
- PIN login generates JWT token
- PINs hashed with bcrypt
- JWT expiration: 24 hours

**User Profile Management Spec (Requirements 6, 10)**:
- PIN setup (4-6 digits)
- PIN login
- PINs hashed with bcrypt ✅ CONSISTENT
- JWT expiration: 30 days ⚠️ CONFLICT

**Conflict Type**: INCONSISTENT SPECIFICATIONS
**Impact**: HIGH - Different JWT expiration times
**Resolution Needed**: YES

---

#### 3. Biometric Authentication

**Auth Spec (Requirement 2)**:
- Biometric login generates JWT token
- JWT expiration: 24 hours

**User Profile Management Spec (Requirements 7, 11)**:
- Biometric setup and login
- Device-native biometric APIs
- JWT expiration: 30 days ⚠️ CONFLICT

**Conflict Type**: INCONSISTENT SPECIFICATIONS
**Impact**: HIGH - Different JWT expiration times
**Resolution Needed**: YES

---

#### 4. Profile Management

**Auth Spec (Requirement 4)**:
- View and update profile
- Validate changes
- Re-verification for sensitive data
- Persist to database

**User Profile Management Spec (Requirements 13-14)**:
- View profile (GET endpoint)
- Edit profile (PATCH endpoint)
- Validate updates
- Recalculate completeness
- Log edits with timestamp

**Conflict Type**: OVERLAPPING FUNCTIONALITY
**Impact**: MEDIUM - Both specs define profile CRUD operations
**Resolution Needed**: YES

---

#### 5. Account Security

**Auth Spec (Requirement 3)**:
- Account lockout after 3 failed login attempts
- Lockout duration: 30 minutes
- Automatic unlock after expiration

**User Profile Management Spec (Requirement 24)**:
- Rate limiting on authentication endpoints
- Brute force attack prevention
- No specific lockout mechanism mentioned

**Conflict Type**: PARTIAL OVERLAP
**Impact**: MEDIUM - Different approaches to security
**Resolution Needed**: YES

---

### 🟡 MODERATE CONFLICTS (Overlapping Concerns)

#### 6. Session Management

**Auth Spec**:
- JWT tokens with 24-hour expiration
- Token validation on protected endpoints

**User Profile Management Spec (Requirement 12)**:
- JWT tokens with 30-day expiration ⚠️ CONFLICT
- Token validation on protected endpoints ✅ CONSISTENT
- Automatic token refresh
- Multiple concurrent sessions
- Update lastActiveAt timestamp

**Conflict Type**: INCONSISTENT SPECIFICATIONS + ADDITIONAL FEATURES
**Impact**: MEDIUM
**Resolution Needed**: YES

---

#### 7. Data Models

**Auth Spec**:
```typescript
interface User {
  id: string;
  phone: string;
  name: string;
  userType: 'farmer' | 'buyer';
  pin?: string;
  failedLoginAttempts: number;
  lockedUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

**User Profile Management Spec**:
```typescript
interface UserProfile {
  userId: string;
  mobileNumber: string;  // E.164 format
  countryCode: string;
  mobileVerified: boolean;
  name?: string;
  profilePicture?: {...};
  location?: {...};
  userType?: 'farmer' | 'buyer' | 'both';
  // ... many more fields
  completionPercentage: number;
  points: {...};
  membershipTier: string;
  trustScore: number;
  // ...
}
```

**Conflict Type**: DIFFERENT DATA MODELS FOR SAME ENTITY
**Impact**: HIGH - Incompatible schemas
**Resolution Needed**: YES

---

#### 8. API Endpoints

**Auth Spec**:
- `POST /api/auth/register`
- `POST /api/auth/verify-otp`
- `POST /api/auth/login`
- `GET /api/auth/profile`
- `PUT /api/auth/profile`

**User Profile Management Spec**:
- `POST /api/v1/profiles/register`
- `POST /api/v1/profiles/verify-otp`
- `GET /api/v1/profiles/{userId}`
- `PATCH /api/v1/profiles/{userId}/fields`
- `POST /api/v1/profiles/{userId}/picture`

**Conflict Type**: DUPLICATE API ENDPOINTS WITH DIFFERENT PATHS
**Impact**: HIGH - API inconsistency
**Resolution Needed**: YES

---

### 🟢 NO CONFLICTS (Unique to Each Spec)

#### Auth Spec Unique Features:
- ✅ Account lockout mechanism (specific implementation)
- ✅ Failed login attempt tracking
- ✅ Dual database integration (PostgreSQL + SQLite)

#### User Profile Management Spec Unique Features:
- ✅ Progressive profiling (contextual prompts, implicit updates)
- ✅ Profile completeness calculation
- ✅ Privacy controls
- ✅ Profile picture management
- ✅ Gamification (points, tiers, referrals)
- ✅ Trust scoring
- ✅ International mobile number support (detailed)
- ✅ Location capture (GPS vs manual)
- ✅ Crop detection and tracking
- ✅ Language preference detection
- ✅ Farm size collection
- ✅ Bank account management
- ✅ Data export and deletion
- ✅ Mobile number change workflow
- ✅ Audit logging

---

## Conflict Summary Table

| Feature | Auth Spec | User Profile Spec | Conflict Level | Resolution Needed |
|---------|-----------|-------------------|----------------|-------------------|
| Mobile Registration | ✅ Basic | ✅ Detailed + International | 🔴 HIGH | YES |
| OTP Verification | ✅ | ✅ | 🔴 HIGH | YES |
| PIN Authentication | ✅ | ✅ | 🔴 HIGH | YES |
| Biometric Auth | ✅ | ✅ | 🔴 HIGH | YES |
| JWT Expiration | 24 hours | 30 days | 🔴 HIGH | YES |
| Profile CRUD | ✅ Basic | ✅ Detailed | 🟡 MEDIUM | YES |
| Account Lockout | ✅ Specific | ✅ General | 🟡 MEDIUM | YES |
| Data Model | Simple User | Complex UserProfile | 🔴 HIGH | YES |
| API Endpoints | /api/auth/* | /api/v1/profiles/* | 🔴 HIGH | YES |
| Progressive Profiling | ❌ | ✅ | 🟢 NONE | NO |
| Gamification | ❌ | ✅ | 🟢 NONE | NO |
| Trust Scoring | ❌ | ✅ | 🟢 NONE | NO |
| International Mobile | ❌ | ✅ Detailed | 🟢 NONE | NO |

---

## Root Cause Analysis

### Why Do These Conflicts Exist?

1. **Historical Evolution**: Auth spec was created first as a simple authentication system. User Profile Management spec was created later with more comprehensive requirements.

2. **Scope Creep**: User Profile Management spec expanded to include authentication features that were already in Auth spec.

3. **Lack of Coordination**: The two specs were developed/updated independently without cross-referencing.

4. **Unclear Boundaries**: No clear delineation of responsibilities between "authentication" and "profile management".

---

## Resolution Options

### Option 1: Consolidate into Single Spec (RECOMMENDED)

**Approach**: Merge both specs into "User Authentication & Profile Management"

**Pros**:
- Single source of truth
- No duplication
- Consistent specifications
- Easier to maintain

**Cons**:
- Large spec file
- Requires significant refactoring
- Need to update all references

**Implementation**:
1. Create new unified spec: `user-auth-profile-management`
2. Merge requirements from both specs
3. Resolve conflicts (use User Profile Management as base, it's more detailed)
4. Update implementation code to use unified spec
5. Deprecate old Auth spec
6. Update all references

---

### Option 2: Clear Separation of Concerns

**Approach**: Define clear boundaries between Auth and Profile Management

**Auth Spec Scope** (Core Authentication Only):
- Mobile number validation and normalization
- OTP generation and verification
- PIN/biometric authentication
- JWT token generation and validation
- Session management
- Account security (lockout, rate limiting)

**User Profile Management Spec Scope** (Profile Data Only):
- Profile data storage and retrieval
- Profile completeness calculation
- Progressive profiling
- Privacy controls
- Gamification
- Trust scoring
- Profile-specific features (picture, location, crops, etc.)

**Pros**:
- Clear separation of concerns
- Smaller, focused specs
- Easier to understand each spec

**Cons**:
- Still have some overlap (both need user data model)
- Need tight coordination between specs
- Potential for inconsistencies

**Implementation**:
1. Update Auth spec to focus only on authentication
2. Remove authentication details from User Profile Management spec
3. Define shared data model in a common location
4. Establish clear API boundaries
5. Document dependencies between specs

---

### Option 3: Auth as Foundation, Profile as Extension

**Approach**: Auth spec provides core authentication, User Profile Management extends it

**Auth Spec** (Foundation):
- Basic registration (mobile + OTP)
- Authentication methods (OTP, PIN, biometric)
- Session management
- Basic user data model

**User Profile Management Spec** (Extension):
- Extends Auth user model with additional fields
- Progressive profiling
- Gamification
- Trust scoring
- All profile-specific features

**Pros**:
- Layered architecture
- Auth can be used independently
- Profile Management builds on top

**Cons**:
- Complex dependency management
- Risk of tight coupling
- Harder to maintain consistency

---

## Recommended Resolution: Option 1 (Consolidation)

### Why Consolidation is Best

1. **Single Source of Truth**: No ambiguity about which spec to follow
2. **Consistency**: All authentication and profile features in one place
3. **Maintainability**: Easier to keep specifications consistent
4. **Implementation**: Clearer for developers - one spec to implement
5. **Current State**: User Profile Management spec is already comprehensive and includes authentication

### Consolidation Plan

#### Phase 1: Create Unified Spec Structure
```
.kiro/specs/features/user-auth-profile-management/
├── requirements.md (merged from both specs)
├── design.md (merged from both specs)
├── tasks.md (merged from both specs)
├── .config.kiro
└── CONSOLIDATION-NOTES.md
```

#### Phase 2: Merge Requirements
1. Use User Profile Management requirements as base (more detailed)
2. Add unique Auth spec requirements:
   - Account lockout mechanism details
   - Dual database integration
3. Resolve conflicts:
   - JWT expiration: Use 30 days (User Profile Management)
   - API endpoints: Use /api/v1/profiles/* (versioned)
   - Data model: Use UserProfile (comprehensive)

#### Phase 3: Merge Design Documents
1. Use User Profile Management design as base
2. Add Auth-specific sections:
   - Dual database integration details
   - Account lockout implementation
3. Consolidate API endpoints
4. Merge data models

#### Phase 4: Merge Implementation Tasks
1. Combine task lists
2. Remove duplicates
3. Ensure all features covered

#### Phase 5: Update Implementation Code
1. Update imports and references
2. Consolidate services if needed
3. Update API routes
4. Update tests

#### Phase 6: Deprecate Old Auth Spec
1. Mark Auth spec as deprecated
2. Add redirect notice to unified spec
3. Update all references in other specs
4. Archive old Auth spec

---

## Immediate Actions Required

### 1. Decision Point
**Who decides**: Product Owner / Tech Lead / Architecture Team
**Timeline**: Before any new implementation work begins
**Options**: Choose Option 1, 2, or 3

### 2. If Consolidation (Option 1) Chosen:
- [ ] Create consolidation plan document
- [ ] Review and approve merged requirements
- [ ] Create unified spec structure
- [ ] Merge requirements documents
- [ ] Merge design documents
- [ ] Merge task lists
- [ ] Update implementation code references
- [ ] Deprecate Auth spec
- [ ] Update FEATURE-OVERVIEW.md

### 3. If Separation (Option 2) Chosen:
- [ ] Define clear boundaries document
- [ ] Update Auth spec to remove overlaps
- [ ] Update User Profile Management spec to remove auth details
- [ ] Create shared data model specification
- [ ] Define API boundaries
- [ ] Document dependencies
- [ ] Update implementation code

### 4. If Extension (Option 3) Chosen:
- [ ] Define foundation vs extension layers
- [ ] Update Auth spec as foundation
- [ ] Update User Profile Management as extension
- [ ] Document dependency chain
- [ ] Update implementation code

---

## Impact Assessment

### If No Action Taken:

**Risks**:
- ❌ Developers confused about which spec to follow
- ❌ Inconsistent implementations
- ❌ Duplicate code and effort
- ❌ Maintenance nightmare
- ❌ API inconsistencies
- ❌ Different JWT expiration times causing bugs
- ❌ Conflicting data models

**Cost**: HIGH - Technical debt accumulation

### If Consolidation Implemented:

**Benefits**:
- ✅ Single source of truth
- ✅ Consistent specifications
- ✅ Easier maintenance
- ✅ Clear implementation path
- ✅ No duplication

**Cost**: MEDIUM - One-time refactoring effort

---

## Conclusion

The Auth spec and User Profile Management spec have **significant conflicts and duplication**. This is not sustainable and will lead to implementation issues, bugs, and maintenance problems.

**Recommendation**: Consolidate into a single unified spec using User Profile Management as the base (it's more comprehensive and detailed). The Auth spec can be deprecated and archived.

**Priority**: HIGH - Should be resolved before continuing with implementation.

**Next Step**: Schedule a decision meeting with stakeholders to choose resolution approach and create action plan.

---

**Document Created**: 2026-03-02  
**Status**: ANALYSIS COMPLETE - DECISION REQUIRED  
**Priority**: HIGH  
**Stakeholders**: Product Owner, Tech Lead, Development Team
