# Mandatory Registration Fields - Spec Update

## Summary

Updated the User Profile Management spec to make `userType` a mandatory field during registration, aligning with user requirements.

## Changes Made

### 1. Requirements Document Updates

**File**: `.kiro/specs/features/user-profile-management/requirements.md`

#### Introduction Section
- Updated mandatory fields list from "name, mobile, location" to "name, mobile, location, user type"

#### Glossary Section
- Updated `Mandatory_Field` definition to include userType
- Updated `Optional_Field` definition to remove user_type from examples

#### Requirement 3: Complete Registration with Mandatory Fields
- **User Story**: Updated to include "user type" in the story
- **Acceptance Criteria**: Added 3 new criteria for userType validation:
  - AC 4: Require userType to be one of: 'farmer', 'buyer', or 'both'
  - AC 5: Validate that userType is provided and is a valid value
  - AC 14: Do NOT create profile until all mandatory fields are collected
- **Updated AC 1**: Changed from "name and location" to "name, location, and userType"
- **Updated AC 10**: Changed from "all mandatory fields" to explicitly list "name, location, userType"

### 2. Design Document Updates

**File**: `.kiro/specs/features/user-profile-management/design.md`

#### Overview Section
- Updated from "only essential information (mobile number)" to "essential information (mobile number, name, location, user type)"

#### Core Design Principles
- Updated Principle 2 from "Registration requires only mobile number verification" to "Registration requires mobile number, name, location, and user type (farmer/buyer)"
- Updated Principle 4 from "Profile data is requested" to "Additional profile data is requested"

#### Registration Service Component
- Updated responsibilities to include:
  - "Collects mandatory fields after OTP verification: name, location, userType"
  - "Validates mandatory field formats and constraints"
  - "Creates user profile only after all mandatory fields are collected"
  - "Initializes profile with 40% completeness (mandatory fields complete)"

#### Registration Flow Diagram
- Added new section: "[MANDATORY] Collect Registration Fields"
- Added steps for collecting name, userType, and location
- Added validation step: "Validate All Mandatory Fields (name, userType, location)"
- Updated profile creation to happen AFTER mandatory fields are collected
- Updated completionPercentage from 10% to 40%
- Added new section documenting mandatory fields requirements

#### API Endpoint: POST /api/v1/profiles/verify-otp
- Renamed from "Verify OTP" to "Verify OTP and Complete Registration"
- Updated request body to include:
  ```typescript
  {
    userId: string,
    otp: string,
    name: string,  // MANDATORY: 2-100 characters
    userType: 'farmer' | 'buyer' | 'both',  // MANDATORY
    location: {  // MANDATORY: GPS OR manual
      type: 'gps' | 'manual',
      latitude?: number,
      longitude?: number,
      text?: string
    }
  }
  ```
- Updated response to show 40% completeness

## Impact on Implementation

### Current Implementation Issues
The current implementation creates the profile immediately after OTP verification with only the mobile number (10% completeness). This needs to be updated to:

1. **Split OTP verification into two steps**:
   - Step 1: Verify OTP (validate the OTP code)
   - Step 2: Complete registration (collect mandatory fields and create profile)

2. **Update `registration.service.ts`**:
   - Modify `verifyOTP()` to accept additional parameters: name, userType, location
   - Add validation for name (2-100 characters, Unicode letters)
   - Add validation for userType (must be 'farmer', 'buyer', or 'both')
   - Add validation for location (GPS with coordinates OR manual with text min 3 chars)
   - Update `createInitialProfile()` to accept and store mandatory fields
   - Change initial completionPercentage from 10% to 40%

3. **Update `profile.types.ts`**:
   - Update `VerifyOTPRequest` interface to include mandatory fields
   - Ensure userType field is properly typed as `'farmer' | 'buyer' | 'both'`

4. **Update POC UI files**:
   - `public/profile-test.html`: Add mandatory field collection after OTP verification
   - `public/index.html`: Update registration flow to collect mandatory fields

5. **Update tests**:
   - Update registration tests to include mandatory fields
   - Update property-based tests to generate valid mandatory field values
   - Update expected completionPercentage from 10% to 40%

## Validation Rules

### Name
- Length: 2-100 characters
- Characters: Unicode letters, spaces, and common name characters
- Cannot be empty or only whitespace

### User Type
- Must be one of: `'farmer'`, `'buyer'`, or `'both'`
- Case-sensitive
- Required (cannot be null or undefined)

### Location
- **GPS Location**:
  - Requires: latitude (number), longitude (number)
  - Optional: accuracy metadata
  - Marked with locationType: 'gps'
  
- **Manual Location**:
  - Requires: text (string, min 3 characters)
  - Suggested format: "Village/City, District, State"
  - Marked with locationType: 'manual'

## Profile Completeness Calculation

After registration with mandatory fields:
- Mobile number verified: Base requirement
- Name provided: +10%
- User type selected: +10%
- Location provided: +10%
- **Total: 40% completeness**

Additional optional fields contribute to reaching 100%:
- Profile picture: +10%
- Crops grown: +10%
- Farm size: +10%
- Language preference: +5%
- Bank account: +15%
- Other fields: Remaining percentage

## Next Steps

1. Update implementation files (registration.service.ts, profile.types.ts)
2. Update POC UI files to collect mandatory fields
3. Update all tests to reflect new requirements
4. Test the complete registration flow end-to-end
5. Update API documentation if separate from spec

## Files Modified

- `.kiro/specs/features/user-profile-management/requirements.md`
- `.kiro/specs/features/user-profile-management/design.md`
- `.kiro/specs/features/MANDATORY-FIELDS-SPEC-UPDATE.md` (this file)
