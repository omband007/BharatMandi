# Spec Consolidation Notes: Auth + User Profile Management

## Overview

This document records the consolidation of the Auth spec and User Profile Management spec into a single unified specification.

**Date**: 2026-03-02  
**Action**: Merged Auth spec into User Profile Management spec  
**New Name**: User Authentication & Profile Management  
**Location**: `.kiro/specs/features/user-profile-management/`

---

## Consolidation Summary

### What Was Merged

**From Auth Spec** (`.kiro/specs/features/auth/`):
- ✅ Account lockout protection (Requirement 3)
- ✅ Account lockout business logic
- ✅ Failed login attempt tracking
- ✅ Auto-unlock mechanism
- ✅ Security-related glossary terms

**Into User Profile Management Spec**:
- ✅ Added as Requirement 24A: Account Lockout Protection
- ✅ Added lockout fields to UserProfile data model
- ✅ Added account lockout business logic to design.md
- ✅ Added implementation tasks (Task 5.0)
- ✅ Updated glossary with lockout terms

---

## What Was Already Present (No Duplication)

The User Profile Management spec already contained:
- ✅ Mobile number registration (with international support)
- ✅ OTP verification
- ✅ PIN setup and authentication
- ✅ Biometric setup and authentication
- ✅ Session management (JWT tokens)
- ✅ Profile CRUD operations
- ✅ Account security (hashing, HTTPS, rate limiting)

---

## Conflicts Resolved

### 1. JWT Token Expiration
- **Auth spec**: 24 hours
- **User Profile spec**: 30 days
- **Resolution**: Kept 30 days (User Profile Management spec)
- **Rationale**: Better user experience, aligns with mobile app patterns

### 2. API Endpoints
- **Auth spec**: `/api/auth/*`
- **User Profile spec**: `/api/v1/profiles/*`
- **Resolution**: Kept `/api/v1/profiles/*` (versioned API)
- **Rationale**: Better API versioning strategy

### 3. Data Model
- **Auth spec**: Simple `User` model (8 fields)
- **User Profile spec**: Comprehensive `UserProfile` model (30+ fields)
- **Resolution**: Kept `UserProfile` model, added lockout fields
- **Rationale**: More comprehensive, supports all features

### 4. Account Lockout
- **Auth spec**: Specific implementation (3 attempts, 30 min lockout)
- **User Profile spec**: General security requirements
- **Resolution**: Added Auth spec's detailed lockout as Requirement 24A
- **Rationale**: Auth spec had more detailed implementation

---

## Changes Made to User Profile Management Spec

### requirements.md

**Added**:
- Requirement 24A: Account Lockout Protection (10 acceptance criteria)
- Glossary terms: Account_Lockout, Failed_Login_Attempt, Lockout_Duration, Brute_Force_Attack

**Updated**:
- Introduction: Mentioned consolidation
- Title: Changed to "User Authentication & Profile Management"

**Total Requirements**: 38 (was 37)

### design.md

**Added**:
- `failedLoginAttempts` field to UserProfile model
- `lockedUntil` field to UserProfile model
- `lastLoginAt` field to UserProfile model
- Account Lockout Logic section with complete implementation
- `handleFailedLogin()` function
- `handleSuccessfulLogin()` function
- `isAccountLocked()` function
- `attemptLogin()` function

**Updated**:
- UserProfile interface with authentication & security fields

### tasks.md

**Added**:
- Task 5.0: Implement Account Lockout Protection (7 sub-tasks)
  - 5.0.1: Add lockout fields to schema
  - 5.0.2: Implement failed login tracking
  - 5.0.3: Implement lockout logic
  - 5.0.4: Implement auto-unlock
  - 5.0.5: Allow OTP when locked
  - 5.0.6: Add lockout notifications
  - 5.0.7: Write tests (optional)

---

## Auth Spec Status

### Current State
- **Location**: `.kiro/specs/features/auth/`
- **Status**: DEPRECATED (but preserved for reference)
- **Action**: Marked as deprecated, not deleted

### Files Preserved
- `requirements.md` - Marked as deprecated
- `design.md` - Marked as deprecated
- `tasks.md` - Marked as deprecated

### Deprecation Notice Added
A deprecation notice will be added to the Auth spec pointing to the unified spec.

---

## Implementation Impact

### Code Location
- **Old**: `src/features/auth/`
- **New**: `src/features/profile/` (already exists)
- **Action**: Auth code should be migrated/consolidated into profile feature

### API Endpoints
- **Old**: `/api/auth/*`
- **New**: `/api/v1/profiles/*`
- **Action**: Update API routes, maintain backward compatibility if needed

### Database Schema
- **Old**: Simple `users` table
- **New**: Comprehensive `user_profiles` table
- **Action**: Migrate schema, add lockout fields

---

## Migration Checklist

### Spec Files
- [x] Merge requirements
- [x] Merge design documents
- [x] Merge task lists
- [x] Update glossary
- [x] Create consolidation notes
- [ ] Add deprecation notice to Auth spec
- [ ] Update FEATURE-OVERVIEW.md

### Implementation Code
- [ ] Review `src/features/auth/` code
- [ ] Migrate auth logic to `src/features/profile/`
- [ ] Update API routes
- [ ] Update database schema
- [ ] Add lockout fields to schema
- [ ] Implement lockout logic
- [ ] Update tests
- [ ] Update API documentation

### Documentation
- [ ] Update README files
- [ ] Update API documentation
- [ ] Update developer guides
- [ ] Update deployment docs

---

## Benefits of Consolidation

### Before (Separate Specs)
- ❌ Duplicate registration flow
- ❌ Duplicate authentication logic
- ❌ Conflicting JWT expiration times
- ❌ Different API endpoints
- ❌ Incompatible data models
- ❌ Confusion about which spec to follow

### After (Unified Spec)
- ✅ Single source of truth
- ✅ Consistent specifications
- ✅ No duplication
- ✅ Clear implementation path
- ✅ Unified data model
- ✅ Easier maintenance

---

## Unique Features Preserved

### From Auth Spec
- ✅ Account lockout protection (detailed implementation)
- ✅ Failed login attempt tracking
- ✅ Auto-unlock mechanism
- ✅ Dual database integration (noted in design)

### From User Profile Management Spec
- ✅ International mobile number support
- ✅ Progressive profiling
- ✅ Gamification system
- ✅ Trust scoring
- ✅ Profile completeness
- ✅ Privacy controls
- ✅ All profile-specific features

---

## Testing Considerations

### New Tests Needed
- Account lockout after 3 failed attempts
- Auto-unlock after 30 minutes
- OTP bypass when account locked
- Failed attempt counter reset
- Lockout notification delivery

### Existing Tests to Update
- Authentication flow tests
- Profile creation tests
- API endpoint tests
- Integration tests

---

## Rollout Plan

### Phase 1: Spec Consolidation (COMPLETE)
- [x] Merge requirements
- [x] Merge design
- [x] Merge tasks
- [x] Create consolidation notes

### Phase 2: Deprecation (NEXT)
- [ ] Add deprecation notice to Auth spec
- [ ] Update FEATURE-OVERVIEW.md
- [ ] Communicate changes to team

### Phase 3: Implementation (FUTURE)
- [ ] Migrate auth code
- [ ] Update API routes
- [ ] Update database schema
- [ ] Implement lockout logic
- [ ] Update tests

### Phase 4: Cleanup (FUTURE)
- [ ] Archive old Auth spec
- [ ] Remove deprecated code
- [ ] Update all references

---

## References

### Related Documents
- [Spec Conflict Analysis](../SPEC-CONFLICT-ANALYSIS.md)
- [Conflict Resolution Quick Guide](../CONFLICT-RESOLUTION-QUICK-GUIDE.md)
- [International Mobile Impact](./INTERNATIONAL-MOBILE-IMPACT.md)
- [Spec Update Summary](./SPEC-UPDATE-SUMMARY.md)

### Spec Files
- **Unified Spec**: `.kiro/specs/features/user-profile-management/`
- **Deprecated Auth Spec**: `.kiro/specs/features/auth/` (preserved for reference)

---

## Notes

- The consolidation prioritized the User Profile Management spec as the base because it was more comprehensive and detailed
- The Auth spec's unique feature (account lockout) was fully integrated
- All conflicts were resolved in favor of the more detailed specification
- The unified spec now has 38 requirements (was 37 + 4 = 41, but with deduplication)
- JWT token expiration is now consistently 30 days across all authentication methods
- API endpoints are now consistently under `/api/v1/profiles/*`

---

**Consolidation Completed**: 2026-03-02  
**Status**: ✅ COMPLETE  
**Next Action**: Add deprecation notice to Auth spec
