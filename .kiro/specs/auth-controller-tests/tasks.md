# Implementation Plan: Auth Controller Integration Tests

## Overview

This implementation plan breaks down the creation of a comprehensive integration test suite for the Auth Controller. The test suite will achieve 80%+ coverage through systematic testing of all 10 authentication endpoints, including success cases, error cases, edge cases, and security tests. The implementation uses Jest, Supertest, and fast-check, following the project's established testing patterns.

## Tasks

- [x] 1. Set up test infrastructure and helpers
  - [x] 1.1 Create test helpers directory structure and test constants
    - Create `src/features/auth/__tests__/test-helpers/` directory
    - Create `test-constants.ts` with TEST_PHONE_NUMBERS, TEST_PINS, TEST_USER_TYPES, SUPPORTED_LANGUAGES, and SQL_INJECTION_PAYLOADS constants
    - _Requirements: 17.1, 17.5_

  - [x] 1.2 Create test data factories
    - Create `test-data-factories.ts` with createTestUser, createTestLocation, createTestBankAccount, and createTestOTPSession factory functions
    - Ensure factories support partial overrides for flexibility
    - _Requirements: 17.4, 20.2_

  - [x] 1.3 Set up mock auth service configuration
    - Create `mock-auth-service.ts` with mock implementations for all 10 auth service methods
    - Configure Jest mocks with proper TypeScript types
    - _Requirements: 15.1, 20.1_

- [x] 2. Implement OTP request endpoint tests
  - [x] 2.1 Create test file structure and mock setup
    - Create `src/features/auth/__tests__/auth.controller.test.ts`
    - Set up Express test app with auth controller
    - Configure Jest mocks for auth service
    - Add beforeEach hook to clear mock call history
    - _Requirements: 17.1, 17.2, 17.5, 15.2_

  - [x] 2.2 Write OTP request success and error tests
    - Test valid 10-digit phone number returns 200 status
    - Test phone number with +91 prefix is normalized and returns 200
    - Test invalid phone number format returns 400 status
    - Test missing phone number returns 400 with "Phone number is required"
    - Test service error returns 500 with "Internal server error"
    - Verify Mock_Service.requestOTP is called with normalized phone number
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 14.1, 14.2, 14.3_

  - [ ]* 2.3 Write security tests for OTP request endpoint
    - Test SQL injection payloads in phoneNumber field return 400 or are handled safely
    - _Requirements: 11.1_

- [x] 3. Implement OTP verification endpoint tests
  - [x] 3.1 Write OTP verification success and error tests
    - Test valid phone and OTP for existing user returns 200 with userExists true
    - Test valid phone and OTP for new user returns 200 with userExists false
    - Test invalid OTP returns 400 with error message
    - Test expired OTP returns 400 with "OTP expired"
    - Test missing phone or OTP returns 400 with validation error
    - Test service error returns 500
    - Verify Mock_Service.verifyOTP and Mock_Service.getUserByPhone are called correctly
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

- [x] 4. Implement user registration endpoint tests
  - [x] 4.1 Write registration success tests for all user types
    - Test registration with all required fields returns 201 with created user
    - Test userType farmer creates farmer user
    - Test userType buyer creates buyer user
    - Test userType transporter creates transporter user
    - Test registration with optional bankAccount includes it in user creation
    - Verify Mock_Service.createUser is called with all provided fields
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.8, 3.11_

  - [x] 4.2 Write registration validation error tests
    - Test invalid userType returns 400 with "Invalid user type"
    - Test missing required fields returns 400 with "Missing required fields"
    - Test incomplete location data returns 400 with "Invalid location data"
    - Test service failure returns 400 with service error message
    - Test service error returns 500
    - _Requirements: 3.5, 3.6, 3.7, 3.9, 3.10_

  - [ ]* 4.3 Write security tests for registration endpoint
    - Test SQL injection payloads in name field return 400 or are handled safely
    - _Requirements: 11.2_

- [x] 5. Implement get user endpoint tests
  - [x] 5.1 Write get user success and error tests
    - Test valid phone for existing user returns 200 with user data
    - Test phone for non-existent user returns 404 with "User not found"
    - Test service error returns 500
    - Verify Mock_Service.getUserByPhone is called with phone number parameter
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ]* 5.2 Write security tests for get user endpoint
    - Test SQL injection payloads in phoneNumber parameter are handled safely
    - _Requirements: 11.1_

- [x] 6. Implement PIN setup endpoint tests
  - [x] 6.1 Write PIN setup success and error tests
    - Test valid phone and 4-digit PIN returns 200 with success message
    - Test valid phone and 6-digit PIN returns 200 with success message
    - Test missing phone or PIN returns 400 with validation error
    - Test service failure (user not found) returns 400 with error message
    - Test service failure (invalid PIN format) returns 400 with error message
    - Test service error returns 500
    - Verify Mock_Service.setupPIN is called with phone number and PIN
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

- [x] 7. Implement PIN login endpoint tests
  - [x] 7.1 Write PIN login success and error tests
    - Test valid phone and correct PIN returns 200 with JWT token and user data
    - Test valid phone and incorrect PIN returns 400 with error message
    - Test missing phone or PIN returns 400 with validation error
    - Test account locked status returns 400 with lock duration message
    - Test user not found returns 400 with error message
    - Test PIN not set up returns 400 with setup instruction message
    - Test service error returns 500
    - Verify Mock_Service.loginWithPIN is called with phone number and PIN
    - Verify returned JWT token is non-empty string
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9_

  - [ ]* 7.2 Write security tests for PIN login endpoint
    - Test multiple rapid login attempts with wrong PIN trigger account locking
    - Test 3 failed PIN attempts lock account for 30 minutes
    - _Requirements: 12.2, 12.3_

- [x] 8. Implement biometric login endpoint tests
  - [x] 8.1 Write biometric login success and error tests
    - Test valid phone returns 200 with JWT token and user data
    - Test missing phone returns 400 with "Phone number is required"
    - Test user not found returns 400 with error message
    - Test account locked status returns 400 with lock duration message
    - Test service error returns 500
    - Verify Mock_Service.loginWithBiometric is called with phone number
    - Verify returned JWT token is non-empty string
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

- [x] 9. Implement token verification endpoint tests
  - [x] 9.1 Write token verification success and error tests
    - Test valid JWT token returns 200 with decoded user information
    - Test invalid JWT token returns 401 with "Invalid or expired token"
    - Test expired JWT token returns 401 with error message
    - Test missing token returns 400 with "Token is required"
    - Test service error returns 500
    - Verify Mock_Service.verifyToken is called with the token
    - Verify response includes userId, phoneNumber, and userType fields
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

- [x] 10. Implement get profile endpoint tests
  - [x] 10.1 Write get profile success and error tests
    - Test valid userId for existing user returns 200 with user profile
    - Test userId for non-existent user returns 404 with "User not found"
    - Test missing userId returns 400 with "User ID is required"
    - Test service error returns 500
    - Verify Mock_Service.getUserProfile is called with userId
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ]* 10.2 Write security tests for get profile endpoint
    - Test SQL injection payloads in userId parameter are handled safely
    - _Requirements: 11.3_

- [x] 11. Implement update profile endpoint tests
  - [x] 11.1 Write update profile success tests
    - Test valid userId with non-sensitive updates (name, location) returns 200 with updated user
    - Test userId with phone update and isPhoneVerified true returns 200
    - Test userId with bankAccount update and isPhoneVerified true returns 200
    - Verify Mock_Service.updateUserProfile is called with userId, updates, and isPhoneVerified flag
    - _Requirements: 10.1, 10.2, 10.4, 10.9_

  - [x] 11.2 Write update profile authorization tests
    - Test userId with phone update and isPhoneVerified false returns 403 with requiresVerification true
    - Test userId with bankAccount update and isPhoneVerified false returns 403 with requiresVerification true
    - _Requirements: 10.3, 10.5_

  - [x] 11.3 Write update profile error tests
    - Test missing userId returns 400 with "User ID is required"
    - Test service returns user not found returns 400 with error message
    - Test service error returns 500
    - _Requirements: 10.6, 10.7, 10.8_

  - [ ]* 11.4 Write security tests for update profile endpoint
    - Test SQL injection payloads in userId parameter are handled safely
    - _Requirements: 11.3_

- [x] 12. Checkpoint - Ensure all integration tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Implement multi-language support tests
  - [x] 13.1 Write multi-language support tests for all 11 Indian languages
    - Test languagePreference is stored correctly for each of 11 languages (en, hi, bn, te, mr, ta, gu, kn, ml, or, pa)
    - Test voiceLanguagePreference is stored correctly
    - Test recentLanguages array is stored correctly
    - Test language preferences are returned in user profile responses
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5_

- [x] 14. Implement error handling consistency tests
  - [x] 14.1 Write error response format consistency tests
    - Test all error responses follow consistent JSON format with error field
    - Test 500 errors never expose sensitive information (stack traces, database details)
    - Test service validation errors return 400 with specific error messages
    - Test service authorization errors return 403 with error messages
    - Test service not found errors return 404 with error messages
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6_

- [ ]* 15. Implement rate limiting security tests
  - [ ]* 15.1 Write rate limiting tests for OTP requests
    - Test multiple rapid OTP requests for same phone number enforce rate limiting
    - _Requirements: 12.1, 12.4_

- [ ] 16. Implement property-based tests
  - [ ] 16.1 Create property-based test file structure
    - Create `src/features/auth/__tests__/auth.controller.pbt.test.ts`
    - Set up fast-check imports and test structure
    - Configure numRuns to 100 for all properties
    - _Requirements: 18.6, 18.7, 18.8_

  - [ ]* 16.2 Write property test for phone number normalization idempotence
    - **Property 1: Phone Number Normalization Idempotence**
    - **Validates: Requirements 14.5, 18.1**
    - Test normalizing phone number twice produces same result as normalizing once
    - _Requirements: 14.5, 18.1_

  - [ ]* 16.3 Write property test for valid phone number acceptance
    - **Property 6: Valid Phone Number Acceptance**
    - **Validates: Requirements 18.2**
    - Test all valid 10-digit Indian phone numbers (with/without +91 or 91 prefix) pass validation
    - _Requirements: 18.2_

  - [ ]* 16.4 Write property test for invalid phone number rejection
    - **Property 7: Invalid Phone Number Rejection**
    - **Validates: Requirements 18.3**
    - Test all invalid phone numbers (wrong length, non-numeric) fail validation
    - _Requirements: 18.3_

  - [ ]* 16.5 Write property test for JWT token uniqueness
    - **Property 8: JWT Token Uniqueness**
    - **Validates: Requirements 18.4**
    - Test different users generate different JWT tokens
    - _Requirements: 18.4_

  - [ ]* 16.6 Write property test for JWT token round-trip verification
    - **Property 9: JWT Token Round-Trip Verification**
    - **Validates: Requirements 18.5**
    - Test generating and verifying JWT token returns original user information
    - _Requirements: 18.5_

  - [ ]* 16.7 Write property test for SQL injection payload rejection
    - **Property 2: SQL Injection Payload Rejection**
    - **Validates: Requirements 11.1, 11.2, 11.3**
    - Test SQL injection payloads in all input fields are rejected or handled safely
    - _Requirements: 11.1, 11.2, 11.3_

  - [ ]* 16.8 Write property test for service error handling consistency
    - **Property 3: Service Error Handling Consistency**
    - **Validates: Requirements 13.1, 13.5**
    - Test all endpoints return 500 with generic error when service throws unexpected error
    - _Requirements: 13.1, 13.5_

  - [ ]* 16.9 Write property test for error response format consistency
    - **Property 4: Error Response Format Consistency**
    - **Validates: Requirements 13.6**
    - Test all error responses follow consistent JSON format with error field
    - _Requirements: 13.6_

  - [ ]* 16.10 Write property test for phone normalization consistency across endpoints
    - **Property 5: Phone Number Normalization Consistency Across Endpoints**
    - **Validates: Requirements 14.4**
    - Test phone number normalization produces consistent output across all endpoints
    - _Requirements: 14.4_

  - [ ]* 16.11 Write property test for multi-language support consistency
    - **Property 10: Multi-Language Support Consistency**
    - **Validates: Requirements 19.5**
    - Test all 11 supported language codes are stored and returned correctly
    - _Requirements: 19.5_

- [x] 17. Verify test coverage and generate coverage report
  - [x] 17.1 Run tests with coverage and verify thresholds
    - Run `npm test -- auth.controller --coverage`
    - Verify auth.controller.ts achieves at least 80% line coverage
    - Verify auth.controller.ts achieves at least 75% branch coverage
    - Verify auth.controller.ts achieves 100% function coverage
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_

- [x] 18. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Integration tests validate HTTP endpoint behavior with mocked services
- All tests use mocked auth service for complete isolation from database
- Test suite targets 80%+ line coverage and 75%+ branch coverage
