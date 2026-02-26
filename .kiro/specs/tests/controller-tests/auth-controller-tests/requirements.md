# Requirements Document: Auth Controller Integration Tests

## Introduction

This document defines the requirements for comprehensive integration tests for the Auth Controller in the Bharat Mandi application. The Auth Controller is security-critical code that handles user registration, OTP verification, PIN-based authentication, biometric login, and profile management. Currently, the auth controller has 0% test coverage (328 lines) and the auth service has 0% test coverage (583 lines). These integration tests will validate HTTP endpoints, security mechanisms, error handling, and multi-language support to achieve 80%+ coverage and ensure authentication flows work correctly.

## Glossary

- **Auth_Controller**: Express.js router that exposes HTTP endpoints for authentication operations
- **Auth_Service**: Business logic layer that implements authentication, OTP management, and user operations
- **Test_Suite**: Collection of integration tests using Jest and Supertest
- **Mock_Service**: Jest mock implementation of Auth_Service for isolated controller testing
- **Test_Database**: In-memory or test database instance used during test execution
- **OTP_Session**: Temporary session storing OTP code, expiration time, and attempt count
- **PIN_Hash**: Bcrypt-hashed PIN stored securely in the database
- **JWT_Token**: JSON Web Token used for authenticated session management
- **Phone_Number**: 10-digit Indian mobile number (normalized format without +91 prefix)
- **User_Type**: Enum of farmer, buyer, or transporter
- **Test_Coverage**: Percentage of code lines executed during test runs
- **Property_Test**: Generative test that validates universal correctness properties
- **Integration_Test**: Test that validates HTTP endpoint behavior with mocked services
- **Security_Test**: Test that validates protection against malicious inputs and attacks

## Requirements

### Requirement 1: OTP Request Endpoint Testing

**User Story:** As a developer, I want comprehensive tests for the OTP request endpoint, so that I can ensure phone number validation and OTP generation work correctly.

#### Acceptance Criteria

1. WHEN a valid 10-digit phone number is provided, THE Test_Suite SHALL verify the endpoint returns 200 status with success message
2. WHEN a phone number with +91 prefix is provided, THE Test_Suite SHALL verify the endpoint normalizes it and returns 200 status
3. WHEN an invalid phone number format is provided, THE Test_Suite SHALL verify the endpoint returns 400 status with error message
4. WHEN the phone number field is missing, THE Test_Suite SHALL verify the endpoint returns 400 status with "Phone number is required" error
5. WHEN the Auth_Service throws an error, THE Test_Suite SHALL verify the endpoint returns 500 status with "Internal server error" message
6. THE Test_Suite SHALL verify the Mock_Service.requestOTP method is called with normalized phone number

### Requirement 2: OTP Verification Endpoint Testing

**User Story:** As a developer, I want comprehensive tests for the OTP verification endpoint, so that I can ensure OTP validation and user existence checks work correctly.

#### Acceptance Criteria

1. WHEN valid phone number and OTP are provided for existing user, THE Test_Suite SHALL verify the endpoint returns 200 status with userExists true
2. WHEN valid phone number and OTP are provided for new user, THE Test_Suite SHALL verify the endpoint returns 200 status with userExists false
3. WHEN an invalid OTP is provided, THE Test_Suite SHALL verify the endpoint returns 400 status with error message
4. WHEN an expired OTP is provided, THE Test_Suite SHALL verify the endpoint returns 400 status with "OTP expired" message
5. WHEN phone number or OTP field is missing, THE Test_Suite SHALL verify the endpoint returns 400 status with validation error
6. WHEN the Auth_Service throws an error, THE Test_Suite SHALL verify the endpoint returns 500 status
7. THE Test_Suite SHALL verify the Mock_Service.verifyOTP and Mock_Service.getUserByPhone methods are called with correct parameters

### Requirement 3: User Registration Endpoint Testing

**User Story:** As a developer, I want comprehensive tests for the registration endpoint, so that I can ensure user creation with validation works correctly.

#### Acceptance Criteria

1. WHEN all required fields are provided with valid data, THE Test_Suite SHALL verify the endpoint returns 201 status with created user
2. WHEN userType is farmer, THE Test_Suite SHALL verify the endpoint accepts and creates farmer user
3. WHEN userType is buyer, THE Test_Suite SHALL verify the endpoint accepts and creates buyer user
4. WHEN userType is transporter, THE Test_Suite SHALL verify the endpoint accepts and creates transporter user
5. WHEN an invalid userType is provided, THE Test_Suite SHALL verify the endpoint returns 400 status with "Invalid user type" error
6. WHEN required fields (phoneNumber, name, userType, location) are missing, THE Test_Suite SHALL verify the endpoint returns 400 status with "Missing required fields" error
7. WHEN location data is incomplete (missing latitude, longitude, or address), THE Test_Suite SHALL verify the endpoint returns 400 status with "Invalid location data" error
8. WHEN optional bankAccount data is provided, THE Test_Suite SHALL verify the endpoint includes it in user creation
9. WHEN the Auth_Service returns failure, THE Test_Suite SHALL verify the endpoint returns 400 status with service error message
10. WHEN the Auth_Service throws an error, THE Test_Suite SHALL verify the endpoint returns 500 status
11. THE Test_Suite SHALL verify the Mock_Service.createUser method is called with all provided fields

### Requirement 4: Get User Endpoint Testing

**User Story:** As a developer, I want comprehensive tests for the get user endpoint, so that I can ensure user retrieval by phone number works correctly.

#### Acceptance Criteria

1. WHEN a valid phone number for existing user is provided, THE Test_Suite SHALL verify the endpoint returns 200 status with user data
2. WHEN a phone number for non-existent user is provided, THE Test_Suite SHALL verify the endpoint returns 404 status with "User not found" error
3. WHEN the Auth_Service throws an error, THE Test_Suite SHALL verify the endpoint returns 500 status
4. THE Test_Suite SHALL verify the Mock_Service.getUserByPhone method is called with the phone number parameter

### Requirement 5: PIN Setup Endpoint Testing

**User Story:** As a developer, I want comprehensive tests for the PIN setup endpoint, so that I can ensure secure PIN configuration works correctly.

#### Acceptance Criteria

1. WHEN valid phone number and 4-digit PIN are provided, THE Test_Suite SHALL verify the endpoint returns 200 status with success message
2. WHEN valid phone number and 6-digit PIN are provided, THE Test_Suite SHALL verify the endpoint returns 200 status with success message
3. WHEN phone number or PIN field is missing, THE Test_Suite SHALL verify the endpoint returns 400 status with validation error
4. WHEN the Auth_Service returns failure (user not found), THE Test_Suite SHALL verify the endpoint returns 400 status with error message
5. WHEN the Auth_Service returns failure (invalid PIN format), THE Test_Suite SHALL verify the endpoint returns 400 status with error message
6. WHEN the Auth_Service throws an error, THE Test_Suite SHALL verify the endpoint returns 500 status
7. THE Test_Suite SHALL verify the Mock_Service.setupPIN method is called with phone number and PIN

### Requirement 6: PIN Login Endpoint Testing

**User Story:** As a developer, I want comprehensive tests for the PIN login endpoint, so that I can ensure secure authentication with PIN works correctly.

#### Acceptance Criteria

1. WHEN valid phone number and correct PIN are provided, THE Test_Suite SHALL verify the endpoint returns 200 status with JWT token and user data
2. WHEN valid phone number and incorrect PIN are provided, THE Test_Suite SHALL verify the endpoint returns 400 status with error message
3. WHEN phone number or PIN field is missing, THE Test_Suite SHALL verify the endpoint returns 400 status with validation error
4. WHEN the Auth_Service returns account locked status, THE Test_Suite SHALL verify the endpoint returns 400 status with lock duration message
5. WHEN the Auth_Service returns user not found, THE Test_Suite SHALL verify the endpoint returns 400 status with error message
6. WHEN the Auth_Service returns PIN not set up, THE Test_Suite SHALL verify the endpoint returns 400 status with setup instruction message
7. WHEN the Auth_Service throws an error, THE Test_Suite SHALL verify the endpoint returns 500 status
8. THE Test_Suite SHALL verify the Mock_Service.loginWithPIN method is called with phone number and PIN
9. THE Test_Suite SHALL verify the returned JWT token is a non-empty string

### Requirement 7: Biometric Login Endpoint Testing

**User Story:** As a developer, I want comprehensive tests for the biometric login endpoint, so that I can ensure biometric authentication works correctly.

#### Acceptance Criteria

1. WHEN valid phone number is provided, THE Test_Suite SHALL verify the endpoint returns 200 status with JWT token and user data
2. WHEN phone number field is missing, THE Test_Suite SHALL verify the endpoint returns 400 status with "Phone number is required" error
3. WHEN the Auth_Service returns user not found, THE Test_Suite SHALL verify the endpoint returns 400 status with error message
4. WHEN the Auth_Service returns account locked status, THE Test_Suite SHALL verify the endpoint returns 400 status with lock duration message
5. WHEN the Auth_Service throws an error, THE Test_Suite SHALL verify the endpoint returns 500 status
6. THE Test_Suite SHALL verify the Mock_Service.loginWithBiometric method is called with phone number
7. THE Test_Suite SHALL verify the returned JWT token is a non-empty string

### Requirement 8: Token Verification Endpoint Testing

**User Story:** As a developer, I want comprehensive tests for the token verification endpoint, so that I can ensure JWT validation works correctly.

#### Acceptance Criteria

1. WHEN a valid JWT token is provided, THE Test_Suite SHALL verify the endpoint returns 200 status with decoded user information
2. WHEN an invalid JWT token is provided, THE Test_Suite SHALL verify the endpoint returns 401 status with "Invalid or expired token" error
3. WHEN an expired JWT token is provided, THE Test_Suite SHALL verify the endpoint returns 401 status with error message
4. WHEN token field is missing, THE Test_Suite SHALL verify the endpoint returns 400 status with "Token is required" error
5. WHEN the Auth_Service throws an error, THE Test_Suite SHALL verify the endpoint returns 500 status
6. THE Test_Suite SHALL verify the Mock_Service.verifyToken method is called with the token
7. THE Test_Suite SHALL verify the response includes userId, phoneNumber, and userType fields

### Requirement 9: Get Profile Endpoint Testing

**User Story:** As a developer, I want comprehensive tests for the get profile endpoint, so that I can ensure user profile retrieval works correctly.

#### Acceptance Criteria

1. WHEN a valid userId is provided for existing user, THE Test_Suite SHALL verify the endpoint returns 200 status with user profile
2. WHEN a userId for non-existent user is provided, THE Test_Suite SHALL verify the endpoint returns 404 status with "User not found" error
3. WHEN userId parameter is missing, THE Test_Suite SHALL verify the endpoint returns 400 status with "User ID is required" error
4. WHEN the Auth_Service throws an error, THE Test_Suite SHALL verify the endpoint returns 500 status
5. THE Test_Suite SHALL verify the Mock_Service.getUserProfile method is called with userId

### Requirement 10: Update Profile Endpoint Testing

**User Story:** As a developer, I want comprehensive tests for the update profile endpoint, so that I can ensure profile updates with security checks work correctly.

#### Acceptance Criteria

1. WHEN valid userId and non-sensitive updates (name, location) are provided, THE Test_Suite SHALL verify the endpoint returns 200 status with updated user
2. WHEN userId and phone number update with isPhoneVerified true are provided, THE Test_Suite SHALL verify the endpoint returns 200 status
3. WHEN userId and phone number update with isPhoneVerified false are provided, THE Test_Suite SHALL verify the endpoint returns 403 status with requiresVerification true
4. WHEN userId and bankAccount update with isPhoneVerified true are provided, THE Test_Suite SHALL verify the endpoint returns 200 status
5. WHEN userId and bankAccount update with isPhoneVerified false are provided, THE Test_Suite SHALL verify the endpoint returns 403 status with requiresVerification true
6. WHEN userId parameter is missing, THE Test_Suite SHALL verify the endpoint returns 400 status with "User ID is required" error
7. WHEN the Auth_Service returns user not found, THE Test_Suite SHALL verify the endpoint returns 400 status with error message
8. WHEN the Auth_Service throws an error, THE Test_Suite SHALL verify the endpoint returns 500 status
9. THE Test_Suite SHALL verify the Mock_Service.updateUserProfile method is called with userId, updates, and isPhoneVerified flag

### Requirement 11: Security Testing for SQL Injection

**User Story:** As a developer, I want security tests that validate protection against SQL injection, so that I can ensure the application is secure against database attacks.

#### Acceptance Criteria

1. WHEN SQL injection payload is provided in phoneNumber field, THE Test_Suite SHALL verify the endpoint rejects it with 400 status
2. WHEN SQL injection payload is provided in name field, THE Test_Suite SHALL verify the endpoint rejects it with 400 status
3. WHEN SQL injection payload is provided in userId parameter, THE Test_Suite SHALL verify the endpoint handles it safely without database errors
4. THE Test_Suite SHALL verify no SQL injection payloads cause database errors or unauthorized data access
5. THE Security_Test SHALL test common SQL injection patterns (UNION, DROP, SELECT, OR 1=1)

### Requirement 12: Security Testing for Rate Limiting

**User Story:** As a developer, I want security tests that validate rate limiting on authentication endpoints, so that I can ensure protection against brute force attacks.

#### Acceptance Criteria

1. WHEN multiple OTP requests are made rapidly for same phone number, THE Test_Suite SHALL verify rate limiting is enforced
2. WHEN multiple login attempts are made rapidly with wrong PIN, THE Test_Suite SHALL verify account locking mechanism activates
3. WHEN 3 failed PIN login attempts occur, THE Test_Suite SHALL verify the account is locked for 30 minutes
4. THE Security_Test SHALL verify rate limiting prevents brute force attacks on authentication endpoints

### Requirement 13: Error Handling Testing

**User Story:** As a developer, I want comprehensive error handling tests, so that I can ensure all error scenarios return appropriate responses.

#### Acceptance Criteria

1. WHEN the Auth_Service throws unexpected errors, THE Test_Suite SHALL verify all endpoints return 500 status with generic error message
2. WHEN the Auth_Service returns validation errors, THE Test_Suite SHALL verify endpoints return 400 status with specific error messages
3. WHEN the Auth_Service returns authorization errors, THE Test_Suite SHALL verify endpoints return 403 status with error messages
4. WHEN the Auth_Service returns not found errors, THE Test_Suite SHALL verify endpoints return 404 status with error messages
5. THE Test_Suite SHALL verify error responses never expose sensitive information (stack traces, database details)
6. THE Test_Suite SHALL verify all error responses follow consistent JSON format with error field

### Requirement 14: Phone Number Normalization Testing

**User Story:** As a developer, I want tests that validate phone number normalization, so that I can ensure consistent phone number handling across all endpoints.

#### Acceptance Criteria

1. WHEN phone number with +91 prefix is provided, THE Test_Suite SHALL verify it is normalized to 10-digit format
2. WHEN phone number with 91 prefix (12 digits) is provided, THE Test_Suite SHALL verify it is normalized to 10-digit format
3. WHEN phone number without prefix (10 digits) is provided, THE Test_Suite SHALL verify it is accepted as-is
4. THE Test_Suite SHALL verify normalization is applied consistently across all endpoints that accept phone numbers
5. FOR ALL valid phone number formats, THE Property_Test SHALL verify normalization produces consistent 10-digit output

### Requirement 15: Mock Service Configuration Testing

**User Story:** As a developer, I want tests that validate mock service setup, so that I can ensure test isolation and reliability.

#### Acceptance Criteria

1. THE Test_Suite SHALL configure Mock_Service before each test to return predictable responses
2. THE Test_Suite SHALL clear all Mock_Service call history between tests
3. THE Test_Suite SHALL verify Mock_Service methods are called with expected parameters
4. THE Test_Suite SHALL verify Mock_Service call counts match expected invocations
5. WHEN multiple tests run in sequence, THE Test_Suite SHALL ensure complete isolation between tests

### Requirement 16: Test Coverage Measurement

**User Story:** As a developer, I want test coverage measurement for the auth controller, so that I can track progress toward 80%+ coverage goal.

#### Acceptance Criteria

1. THE Test_Suite SHALL generate code coverage reports for auth.controller.ts
2. THE Test_Suite SHALL measure statement coverage, branch coverage, function coverage, and line coverage
3. WHEN all tests pass, THE Test_Suite SHALL verify auth.controller.ts achieves at least 80% line coverage
4. WHEN all tests pass, THE Test_Suite SHALL verify auth.controller.ts achieves at least 75% branch coverage
5. THE Test_Suite SHALL fail if coverage drops below minimum thresholds

### Requirement 17: Test Organization and Structure

**User Story:** As a developer, I want well-organized test files following project conventions, so that I can maintain and extend tests easily.

#### Acceptance Criteria

1. THE Test_Suite SHALL be located in src/features/auth/__tests__/auth.controller.test.ts
2. THE Test_Suite SHALL use describe blocks to group tests by endpoint
3. THE Test_Suite SHALL use descriptive test names that explain what is being tested
4. THE Test_Suite SHALL follow the Arrange-Act-Assert pattern in each test
5. THE Test_Suite SHALL include setup (beforeAll, beforeEach) and teardown (afterAll, afterEach) hooks
6. THE Test_Suite SHALL follow the naming convention from TEST-STRATEGY.md (*.test.ts for integration tests)

### Requirement 18: Property-Based Testing for Authentication Invariants

**User Story:** As a developer, I want property-based tests for authentication invariants, so that I can validate universal correctness properties across many inputs.

#### Acceptance Criteria

1. THE Property_Test SHALL verify phone number normalization is idempotent (normalizing twice produces same result)
2. THE Property_Test SHALL verify valid phone numbers always pass validation
3. THE Property_Test SHALL verify invalid phone numbers always fail validation
4. THE Property_Test SHALL verify JWT token generation produces unique tokens for different users
5. THE Property_Test SHALL verify JWT token verification correctly decodes valid tokens
6. THE Property_Test SHALL be located in src/features/auth/__tests__/auth.controller.pbt.test.ts
7. THE Property_Test SHALL use fast-check library for generative testing
8. THE Property_Test SHALL run at least 100 test cases per property

### Requirement 19: Multi-Language Support Testing

**User Story:** As a developer, I want tests that validate multi-language support in authentication flows, so that I can ensure the system works for all 11 Indian languages.

#### Acceptance Criteria

1. WHEN user data with languagePreference is provided, THE Test_Suite SHALL verify it is stored correctly
2. WHEN user data with voiceLanguagePreference is provided, THE Test_Suite SHALL verify it is stored correctly
3. WHEN user data with recentLanguages array is provided, THE Test_Suite SHALL verify it is stored correctly
4. THE Test_Suite SHALL verify language preferences are returned in user profile responses
5. THE Test_Suite SHALL test with language codes for all 11 supported Indian languages (en, hi, bn, te, mr, ta, gu, kn, ml, or, pa)

### Requirement 20: Database Integration Mock Strategy

**User Story:** As a developer, I want a clear mock strategy for database operations, so that I can test controller logic in isolation from database implementation.

#### Acceptance Criteria

1. THE Test_Suite SHALL mock the Auth_Service completely without real database connections
2. THE Test_Suite SHALL configure Mock_Service to return realistic user objects matching User type definition
3. THE Test_Suite SHALL configure Mock_Service to simulate database errors (connection failures, constraint violations)
4. THE Test_Suite SHALL verify controller error handling when Mock_Service throws errors
5. THE Test_Suite SHALL not require Test_Database setup for controller integration tests
