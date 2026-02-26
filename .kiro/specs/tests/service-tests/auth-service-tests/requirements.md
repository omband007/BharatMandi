# Requirements Document: Auth Service Unit Tests

## Introduction

This document defines the requirements for comprehensive unit tests for the Auth Service (auth.service.ts) to achieve 80%+ code coverage. The Auth Service handles critical security functions including OTP generation/verification, phone number normalization, PIN authentication, JWT token management, and user profile operations. These tests will ensure correctness, security, and reliability of authentication flows.

## Glossary

- **Auth_Service**: The authentication service module that handles user authentication, OTP verification, and profile management
- **OTP**: One-Time Password - a 6-digit code sent via SMS for phone verification
- **PIN**: Personal Identification Number - a 4-6 digit code used for user authentication
- **JWT**: JSON Web Token - used for session management and API authentication
- **Normalized_Phone**: Phone number in standard 10-digit format (without country code prefix)
- **DatabaseManager**: Abstraction layer for database operations (PostgreSQL/SQLite)
- **Property_Test**: Test that validates mathematical properties across many generated inputs
- **Test_Coverage**: Percentage of code executed by tests (statement, branch, function, line)

## Requirements

### Requirement 1: Phone Number Normalization Tests

**User Story:** As a developer, I want comprehensive tests for phone number normalization, so that phone numbers are consistently stored and retrieved regardless of input format.

#### Acceptance Criteria

1. WHEN normalizePhoneNumber is called with a 10-digit number starting with 6-9, THE Auth_Service SHALL return the same 10-digit number
2. WHEN normalizePhoneNumber is called with +91 prefix, THE Auth_Service SHALL remove the prefix and return 10 digits
3. WHEN normalizePhoneNumber is called with 91 prefix and 12 total digits, THE Auth_Service SHALL remove the prefix and return 10 digits
4. WHEN normalizePhoneNumber is called with whitespace, THE Auth_Service SHALL trim whitespace before processing
5. FOR ALL valid phone inputs, normalizePhoneNumber(normalizePhoneNumber(x)) SHALL equal normalizePhoneNumber(x) (idempotence property)
6. FOR ALL 10-digit numbers starting with 6-9, normalizePhoneNumber SHALL preserve the original number (identity property)

### Requirement 2: OTP Generation Tests

**User Story:** As a developer, I want tests for OTP generation, so that OTPs are always valid 6-digit codes.

#### Acceptance Criteria

1. WHEN generateOTP is called, THE Auth_Service SHALL return a string of exactly 6 characters
2. WHEN generateOTP is called, THE Auth_Service SHALL return only numeric digits
3. FOR ALL generated OTPs, the numeric value SHALL be between 100000 and 999999 inclusive (property test)
4. WHEN generateOTP is called multiple times, THE Auth_Service SHALL generate different values with high probability

### Requirement 3: OTP Request Tests

**User Story:** As a developer, I want tests for OTP request functionality, so that OTP sessions are created correctly and invalid inputs are rejected.

#### Acceptance Criteria

1. WHEN requestOTP is called with a valid 10-digit phone number, THE Auth_Service SHALL return success true
2. WHEN requestOTP is called with a valid phone number, THE Auth_Service SHALL create an OTP session in the database
3. WHEN requestOTP is called with +91 prefix, THE Auth_Service SHALL normalize the phone number before storing
4. WHEN requestOTP is called with invalid phone format, THE Auth_Service SHALL return success false with error message
5. WHEN requestOTP is called with phone starting with 0-5, THE Auth_Service SHALL reject it as invalid
6. WHEN requestOTP is called with non-numeric characters, THE Auth_Service SHALL reject it as invalid
7. WHEN requestOTP is called, THE Auth_Service SHALL set OTP expiration to 10 minutes from creation

### Requirement 4: OTP Verification Tests

**User Story:** As a developer, I want tests for OTP verification, so that only valid OTPs within the expiration window are accepted.

#### Acceptance Criteria

1. WHEN verifyOTP is called with correct OTP before expiration, THE Auth_Service SHALL return success true
2. WHEN verifyOTP is called with correct OTP, THE Auth_Service SHALL add the phone number to verified set
3. WHEN verifyOTP is called with correct OTP, THE Auth_Service SHALL delete the OTP session
4. WHEN verifyOTP is called with incorrect OTP, THE Auth_Service SHALL increment attempt counter
5. WHEN verifyOTP is called with incorrect OTP 3 times, THE Auth_Service SHALL delete the session and return error
6. WHEN verifyOTP is called with expired OTP, THE Auth_Service SHALL return error message about expiration
7. WHEN verifyOTP is called without existing session, THE Auth_Service SHALL return error message
8. WHEN verifyOTP succeeds, THE Auth_Service SHALL set 5-minute TTL for verified status

### Requirement 5: User Creation Tests

**User Story:** As a developer, I want tests for user creation, so that users can only be created after OTP verification and duplicate phone numbers are prevented.

#### Acceptance Criteria

1. WHEN createUser is called with verified phone number, THE Auth_Service SHALL create user successfully
2. WHEN createUser is called without OTP verification, THE Auth_Service SHALL return error requiring verification
3. WHEN createUser is called with existing phone number, THE Auth_Service SHALL return error about duplicate
4. WHEN createUser is called, THE Auth_Service SHALL normalize the phone number before checking duplicates
5. WHEN createUser succeeds, THE Auth_Service SHALL remove phone from verified set
6. WHEN createUser is called, THE Auth_Service SHALL generate a unique UUID for user ID
7. WHEN createUser is called, THE Auth_Service SHALL set createdAt timestamp
8. WHEN createUser is called with bank account data, THE Auth_Service SHALL include it in user record

### Requirement 6: User Retrieval Tests

**User Story:** As a developer, I want tests for user retrieval by phone, so that users can be found regardless of phone number format.

#### Acceptance Criteria

1. WHEN getUserByPhone is called with existing user's phone, THE Auth_Service SHALL return the user object
2. WHEN getUserByPhone is called with non-existent phone, THE Auth_Service SHALL return null
3. WHEN getUserByPhone is called with +91 prefix, THE Auth_Service SHALL normalize and find the user
4. WHEN getUserByPhone is called with 91 prefix, THE Auth_Service SHALL normalize and find the user
5. WHEN getUserByPhone encounters database error, THE Auth_Service SHALL return null and log error

### Requirement 7: PIN Setup Tests

**User Story:** As a developer, I want tests for PIN setup, so that only valid PINs are accepted and properly hashed.

#### Acceptance Criteria

1. WHEN setupPIN is called with 4-digit PIN, THE Auth_Service SHALL accept it and return success
2. WHEN setupPIN is called with 6-digit PIN, THE Auth_Service SHALL accept it and return success
3. WHEN setupPIN is called with 5-digit PIN, THE Auth_Service SHALL accept it and return success
4. WHEN setupPIN is called with 3-digit PIN, THE Auth_Service SHALL reject it with error message
5. WHEN setupPIN is called with 7-digit PIN, THE Auth_Service SHALL reject it with error message
6. WHEN setupPIN is called with non-numeric characters, THE Auth_Service SHALL reject it with error message
7. WHEN setupPIN is called for non-existent user, THE Auth_Service SHALL return error
8. WHEN setupPIN is called, THE Auth_Service SHALL hash the PIN using bcrypt before storage
9. WHEN setupPIN is called, THE Auth_Service SHALL normalize phone number before lookup

### Requirement 8: PIN Login Tests

**User Story:** As a developer, I want tests for PIN login, so that authentication is secure with account locking after failed attempts.

#### Acceptance Criteria

1. WHEN loginWithPIN is called with correct PIN, THE Auth_Service SHALL return success with JWT token
2. WHEN loginWithPIN is called with correct PIN, THE Auth_Service SHALL return user object
3. WHEN loginWithPIN is called with correct PIN, THE Auth_Service SHALL reset failed attempt counter
4. WHEN loginWithPIN is called with incorrect PIN, THE Auth_Service SHALL increment failed attempts
5. WHEN loginWithPIN is called with incorrect PIN 3 times, THE Auth_Service SHALL lock account for 30 minutes
6. WHEN loginWithPIN is called on locked account, THE Auth_Service SHALL return error with time remaining
7. WHEN loginWithPIN is called for non-existent user, THE Auth_Service SHALL return error
8. WHEN loginWithPIN is called without PIN setup, THE Auth_Service SHALL return error requiring PIN setup
9. WHEN loginWithPIN is called with invalid phone format, THE Auth_Service SHALL return error
10. WHEN loginWithPIN is called, THE Auth_Service SHALL normalize phone number before processing

### Requirement 9: JWT Token Tests

**User Story:** As a developer, I want tests for JWT token operations, so that tokens are correctly generated and verified.

#### Acceptance Criteria

1. WHEN loginWithPIN succeeds, THE Auth_Service SHALL generate JWT token with userId in payload
2. WHEN loginWithPIN succeeds, THE Auth_Service SHALL generate JWT token with phoneNumber in payload
3. WHEN loginWithPIN succeeds, THE Auth_Service SHALL generate JWT token with userType in payload
4. WHEN verifyToken is called with valid token, THE Auth_Service SHALL return valid true with decoded payload
5. WHEN verifyToken is called with invalid token, THE Auth_Service SHALL return valid false
6. WHEN verifyToken is called with expired token, THE Auth_Service SHALL return valid false
7. WHEN verifyToken is called with tampered token, THE Auth_Service SHALL return valid false
8. FOR ALL valid tokens, verifyToken SHALL return the same userId that was encoded (round-trip property)

### Requirement 10: Biometric Login Tests

**User Story:** As a developer, I want tests for biometric login, so that biometric authentication generates valid tokens and respects account locks.

#### Acceptance Criteria

1. WHEN loginWithBiometric is called with valid phone, THE Auth_Service SHALL return success with JWT token
2. WHEN loginWithBiometric is called with valid phone, THE Auth_Service SHALL return user object
3. WHEN loginWithBiometric is called on locked account, THE Auth_Service SHALL return error with time remaining
4. WHEN loginWithBiometric is called for non-existent user, THE Auth_Service SHALL return error
5. WHEN loginWithBiometric is called with invalid phone format, THE Auth_Service SHALL return error
6. WHEN loginWithBiometric is called, THE Auth_Service SHALL normalize phone number before processing

### Requirement 11: User Profile Retrieval Tests

**User Story:** As a developer, I want tests for user profile retrieval, so that profiles can be fetched by user ID.

#### Acceptance Criteria

1. WHEN getUserProfile is called with existing user ID, THE Auth_Service SHALL return success with user object
2. WHEN getUserProfile is called with non-existent user ID, THE Auth_Service SHALL return error
3. WHEN getUserProfile encounters database error, THE Auth_Service SHALL return error message

### Requirement 12: User Profile Update Tests

**User Story:** As a developer, I want tests for user profile updates, so that sensitive data changes require verification and non-sensitive changes work without it.

#### Acceptance Criteria

1. WHEN updateUserProfile is called with name change, THE Auth_Service SHALL update without requiring verification
2. WHEN updateUserProfile is called with location change, THE Auth_Service SHALL update without requiring verification
3. WHEN updateUserProfile is called with phone number change without verification, THE Auth_Service SHALL return requiresVerification true
4. WHEN updateUserProfile is called with bank account change without verification, THE Auth_Service SHALL return requiresVerification true
5. WHEN updateUserProfile is called with phone number change with verification, THE Auth_Service SHALL update successfully
6. WHEN updateUserProfile is called with duplicate phone number, THE Auth_Service SHALL return error
7. WHEN updateUserProfile is called for non-existent user, THE Auth_Service SHALL return error
8. WHEN updateUserProfile is called with language preferences, THE Auth_Service SHALL update successfully

### Requirement 13: Test Infrastructure Requirements

**User Story:** As a developer, I want proper test infrastructure, so that tests are isolated, fast, and maintainable.

#### Acceptance Criteria

1. THE Test_Suite SHALL mock DatabaseManager using global.sharedDbManager pattern
2. THE Test_Suite SHALL mock all sqliteHelpers functions
3. THE Test_Suite SHALL use beforeEach to reset mocks before each test
4. THE Test_Suite SHALL use afterEach to clear verified phone numbers set
5. THE Test_Suite SHALL group tests by function using describe blocks
6. THE Test_Suite SHALL use test data factories from test-helpers directory
7. THE Test_Suite SHALL use test constants from test-helpers directory
8. THE Test_Suite SHALL mock bcrypt hash and compare functions
9. THE Test_Suite SHALL mock jwt sign and verify functions
10. THE Test_Suite SHALL mock setTimeout for verified phone TTL testing

### Requirement 14: Property-Based Testing Requirements

**User Story:** As a developer, I want property-based tests for mathematical properties, so that edge cases are automatically discovered.

#### Acceptance Criteria

1. THE Test_Suite SHALL include property test for phone normalization idempotence
2. THE Test_Suite SHALL include property test for phone normalization identity on 10-digit numbers
3. THE Test_Suite SHALL include property test for OTP range validation
4. THE Test_Suite SHALL include property test for JWT round-trip encoding/decoding
5. THE Test_Suite SHALL use fast-check library for property test generation
6. THE Test_Suite SHALL run at least 100 iterations per property test

### Requirement 15: Coverage Requirements

**User Story:** As a developer, I want 80%+ test coverage, so that the Auth Service is thoroughly tested.

#### Acceptance Criteria

1. THE Test_Suite SHALL achieve at least 80% statement coverage
2. THE Test_Suite SHALL achieve at least 80% branch coverage
3. THE Test_Suite SHALL achieve at least 80% function coverage
4. THE Test_Suite SHALL achieve at least 80% line coverage
5. THE Test_Suite SHALL test all exported functions
6. THE Test_Suite SHALL test error handling paths
7. THE Test_Suite SHALL test edge cases and boundary conditions

### Requirement 16: Security Testing Requirements

**User Story:** As a developer, I want security-focused tests, so that authentication vulnerabilities are prevented.

#### Acceptance Criteria

1. THE Test_Suite SHALL verify PINs are hashed before storage
2. THE Test_Suite SHALL verify account locking after 3 failed attempts
3. THE Test_Suite SHALL verify OTP expiration is enforced
4. THE Test_Suite SHALL verify OTP attempt limits are enforced
5. THE Test_Suite SHALL verify JWT tokens cannot be tampered with
6. THE Test_Suite SHALL verify phone verification is required before user creation
7. THE Test_Suite SHALL verify sensitive data updates require verification
8. THE Test_Suite SHALL test SQL injection payloads are handled safely
