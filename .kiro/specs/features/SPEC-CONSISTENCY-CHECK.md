# Spec Consistency Check - User Profile Management

## Summary

Performed comprehensive consistency check between requirements.md and design.md. Found and fixed one inconsistency in profile completeness weights.

## Consistency Check Results

### ✅ CONSISTENT: Mandatory Fields
- **Requirements**: name, mobile, location, userType (Requirement 3, AC 1)
- **Design**: name, mobile, location, userType (Registration Flow)
- **Status**: ✅ Consistent

### ✅ CONSISTENT: Registration Flow
- **Requirements**: Mobile → OTP → Collect Mandatory Fields → Create Profile (Requirement 1-3)
- **Design**: Mobile → OTP → Collect Mandatory Fields → Create Profile (Registration Flow diagram)
- **Status**: ✅ Consistent

### ✅ CONSISTENT: Initial Completeness
- **Requirements**: 40% after mandatory fields (Requirement 3, AC 11)
- **Design**: 40% after mandatory fields (Registration Flow)
- **Status**: ✅ Consistent

### ⚠️ FIXED: Profile Completeness Weights

**Issue Found**: Three-way inconsistency in completeness calculation weights

**Before Fix:**
- Requirement 3 AC 11: Says 40% after mandatory fields
- Requirement 16: mobileNumber (20%) + name (10%) + location (10%) + userType (15%) = **55%**
- Design: mobileNumber (10%) + name (15%) + location (20%) + userType (15%) = **60%**

**After Fix (Now Consistent):**
- Requirement 3 AC 11: 40% after mandatory fields ✅
- Requirement 16: mobileNumber (10%) + name (10%) + location (10%) + userType (10%) = **40%** ✅
- Design: mobileNumber (10%) + name (10%) + location (10%) + userType (10%) = **40%** ✅

**New Weight Distribution:**
```
Mandatory Fields (40% total):
- mobileNumber: 10%
- name: 10%
- location: 10%
- userType: 10%

Optional Fields (60% total):
- cropsGrown: 20%
- languagePreference: 10%
- farmSize: 10%
- bankAccount: 10%
- profilePicture: 10%
```

### ✅ CONSISTENT: Field Validation Rules
- **Requirements**: 
  - Name: 2-100 characters, Unicode letters (Requirement 3, AC 2-3)
  - UserType: 'farmer' | 'buyer' | 'both' (Requirement 3, AC 4-5)
  - Location GPS: coordinates with metadata (Requirement 4)
  - Location Manual: min 3 characters (Requirement 5, AC 2)
- **Design**: Same validation rules in Registration Flow
- **Status**: ✅ Consistent

### ✅ CONSISTENT: API Endpoint
- **Requirements**: Collect mandatory fields after OTP (Requirement 3, AC 1)
- **Design**: POST /api/v1/profiles/verify-otp accepts name, userType, location
- **Status**: ✅ Consistent

### ✅ CONSISTENT: Profile Creation Timing
- **Requirements**: Do NOT create profile until all mandatory fields collected (Requirement 3, AC 14)
- **Design**: Create UserProfile step comes AFTER "Validate All Mandatory Fields"
- **Status**: ✅ Consistent

### ✅ CONSISTENT: JWT Token Generation
- **Requirements**: Return session token after registration (Requirement 3, AC 13)
- **Design**: Generate JWT Token (30-day expiration) at end of flow
- **Status**: ✅ Consistent

### ✅ CONSISTENT: Optional Auth Setup
- **Requirements**: 
  - PIN setup is optional after registration (Requirement 6, AC 1, 7)
  - Biometric setup is optional after registration (Requirement 7, AC 1, 6)
- **Design**: [OPTIONAL] Offer PIN Setup, [OPTIONAL] Offer Biometric Setup
- **Status**: ✅ Consistent

## Changes Made

### 1. Requirements Document
**File**: `.kiro/specs/features/user-profile-management/requirements.md`

**Requirement 16 - Profile Completeness Calculation:**
- Changed mobileNumber weight from 20% → 10%
- Changed name weight from 10% → 10% (no change)
- Changed location weight from 10% → 10% (no change)
- Changed userType weight from 15% → 10%
- Changed cropsGrown weight from 15% → 20%
- Changed languagePreference weight from 10% → 10% (no change)
- Changed farmSize weight from 10% → 10% (no change)
- Changed bankAccount weight from 5% → 10%
- Changed profilePicture weight from 5% → 10%
- Added AC 13: "THE mandatory fields (mobileNumber, name, location, userType) SHALL total 40% completeness"

### 2. Design Document
**File**: `.kiro/specs/features/user-profile-management/design.md`

**Profile Completeness Calculation Section:**
- Changed mobileNumber weight from 10% → 10% (no change)
- Changed name weight from 15% → 10%
- Changed location weight from 20% → 10%
- Changed userType weight from 15% → 10%
- Changed cropsGrown weight from 15% → 20%
- Changed languagePreference weight from 10% → 10% (no change)
- Changed farmSize weight from 10% → 10% (no change)
- Changed bankAccount weight from 5% → 10%
- Changed profilePicture weight from 5% → 10%
- Added comment: "Mandatory fields (40% total)"
- Added comment: "Optional fields (60% total)"
- Added completeness breakdown documentation

## Verification

### Mandatory Fields Total
✅ mobileNumber (10%) + name (10%) + location (10%) + userType (10%) = **40%**

### Optional Fields Total
✅ cropsGrown (20%) + languagePreference (10%) + farmSize (10%) + bankAccount (10%) + profilePicture (10%) = **60%**

### Grand Total
✅ 40% + 60% = **100%**

## Conclusion

✅ **Spec is now fully consistent between requirements and design documents.**

All mandatory fields, validation rules, registration flow, API endpoints, and completeness calculations are aligned. Ready to proceed with implementation.

## Next Steps

1. ✅ Spec consistency verified
2. ⏳ Update implementation (registration.service.ts)
3. ⏳ Update type definitions (profile.types.ts)
4. ⏳ Update tests (registration.service.test.ts)
5. ⏳ Update POC UI files
6. ⏳ Run all tests to verify changes
