---
parent_spec: bharat-mandi-main
implements_requirements: [5]
depends_on: [shared/database]
status: complete
type: feature
code_location: src/features/auth/
---

# Requirements Document: User Authentication

**Parent Spec:** [Bharat Mandi Main](../../bharat-mandi-main/requirements.md) - Requirement 5  
**Depends On:** [Dual Database](../../shared/database/requirements.md)  
**Code Location:** `src/features/auth/`  
**Status:** ✅ Complete

## Introduction

This document specifies the requirements for user authentication in Bharat Mandi. The system provides OTP-based registration, PIN/biometric login, JWT token management, and account security features.

## Requirements

### Requirement 1: OTP-Based Registration

**User Story:** As a new user, I want to register using my mobile number with OTP verification, so that my account is secure.

#### Acceptance Criteria

1. WHEN a user provides a mobile number, THE System SHALL send an OTP via SMS
2. WHEN the user enters the OTP, THE System SHALL verify it matches the sent OTP
3. WHEN OTP verification succeeds, THE System SHALL create a user account
4. WHEN OTP verification fails, THE System SHALL allow up to 3 retry attempts
5. THE System SHALL expire OTPs after 10 minutes

### Requirement 2: PIN and Biometric Login

**User Story:** As a registered user, I want to login using PIN or biometric authentication, so that access is quick and secure.

#### Acceptance Criteria

1. WHEN a user logs in with correct PIN, THE System SHALL generate a JWT token
2. WHEN a user logs in with biometric, THE System SHALL generate a JWT token
3. THE System SHALL hash PINs using bcrypt before storage
4. THE System SHALL validate JWT tokens on protected endpoints
5. THE System SHALL expire JWT tokens after 24 hours

### Requirement 3: Account Lockout Protection

**User Story:** As a user, I want my account protected from brute force attacks, so that unauthorized access is prevented.

#### Acceptance Criteria

1. WHEN login fails 3 consecutive times, THE System SHALL lock the account for 30 minutes
2. WHEN account is locked, THE System SHALL return a clear error message
3. WHEN lockout period expires, THE System SHALL automatically unlock the account
4. THE System SHALL reset failed attempt counter on successful login

### Requirement 4: Profile Management

**User Story:** As a user, I want to view and update my profile information, so that my account details stay current.

#### Acceptance Criteria

1. WHEN a user views their profile, THE System SHALL display all account information
2. WHEN a user updates profile, THE System SHALL validate the changes
3. WHEN sensitive data changes (phone, bank details), THE System SHALL require re-verification
4. THE System SHALL persist profile changes to the database

## Implementation Status

✅ **Complete** - All requirements implemented and tested
- OTP registration working
- PIN login working
- Account lockout implemented
- Profile management functional
- Integrated with dual database system

## Related Files

- `src/features/auth/auth.service.ts` - Authentication business logic
- `src/features/auth/auth.controller.ts` - API endpoints
- `src/features/auth/auth.types.ts` - TypeScript interfaces
- `src/features/auth/auth.service.test.ts` - Unit tests
- `src/features/auth/auth.service.pbt.test.ts` - Property-based tests
