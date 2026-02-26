# Implementation Plan: Auth Service Unit Tests

## Overview

This plan implements comprehensive unit tests for the Auth Service to achieve 80%+ code coverage. The test suite will cover all 18 exported service functions with success, error, and edge cases, using complete dependency mocking (DatabaseManager, bcrypt, jwt, sqliteHelpers) for fast, isolated tests. Property-based tests will validate universal correctness properties using fast-check.

## Tasks

- [x] 1. Set up test infrastructure and mocks
  - [x] 1.1 Create mock database helper
    - Create `src/features/auth/__tests__/test-helpers/mock-database.ts`
    - Implement `createMockDatabaseManager()` function
    - Implement `configureMockDatabase()` function with default behavior
    - _Requirements: 13.1_

  - [x] 1.2 Create mock sqliteHelpers configuration
    - Create `src/features/auth/__tests__/test-helpers/mock-sqlite-helpers.ts`
    - Implement `createMockSqliteHelpers()` function for all 8 helper functions
    - Implement `configureMockSqliteHelpers()` with default resolved values
    - _Requirements: 13.2_

  - [x] 1.3 Set up main test file structure
    - Create `src/features/auth/__tests__/auth.service.test.ts`
    - Import and configure all mocks (sqliteHelpers, bcrypt, jwt, DatabaseManager)
    - Set up beforeEach to clear mocks and reset state
    - Set up afterEach to clear verified phone numbers
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.8, 13.9_

- [x] 2. Implement phone normalization tests
  - [x] 2.1 Write tests for normalizePhoneNumber function
    - Test 10-digit number preservation (6-9 starting digit)
    - Test +91 prefix removal
    - Test 91 prefix removal
    - Test whitespace trimming
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 3. Implement OTP generation tests
  - [x] 3.1 Write tests for generateOTP function
    - Test OTP is exactly 6 characters
    - Test OTP contains only numeric digits
    - Test OTP value is in range 100000-999999
    - Test multiple calls generate different values
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 4. Implement OTP request tests
  - [x] 4.1 Write success case tests for requestOTP
    - Test valid 10-digit phone number creates OTP session
    - Test +91 prefix normalization before storage
    - Test OTP expiration set to 10 minutes
    - Verify insertOTPSession called with correct parameters
    - _Requirements: 3.1, 3.2, 3.3, 3.7_

  - [x] 4.2 Write error case tests for requestOTP
    - Test invalid phone format rejection
    - Test phone starting with 0-5 rejection
    - Test non-numeric characters rejection
    - Test database error handling
    - _Requirements: 3.4, 3.5, 3.6_

- [x] 5. Implement OTP verification tests
  - [x] 5.1 Write success case tests for verifyOTP
    - Test correct OTP before expiration returns success
    - Test phone number added to verified set
    - Test OTP session deleted after success
    - Test 5-minute TTL set for verified status
    - Verify deleteOTPSession called
    - _Requirements: 4.1, 4.2, 4.3, 4.8_

  - [x] 5.2 Write error case tests for verifyOTP
    - Test incorrect OTP increments attempt counter
    - Test 3 failed attempts deletes session
    - Test expired OTP returns error message
    - Test non-existent session returns error
    - Verify updateOTPAttempts called on failure
    - _Requirements: 4.4, 4.5, 4.6, 4.7_

  - [ ]* 5.3 Write timer tests for verified phone TTL
    - Use jest.useFakeTimers() to test TTL behavior
    - Test setTimeout called with 5-minute duration
    - Test phone removed from verified set after TTL
    - _Requirements: 4.8, 13.10_

- [x] 6. Implement user creation tests
  - [x] 6.1 Write success case tests for createUser
    - Test user creation with verified phone number
    - Test UUID generation for user ID
    - Test createdAt timestamp set
    - Test bank account data included when provided
    - Test phone removed from verified set after creation
    - Verify insertUser called with correct data
    - _Requirements: 5.1, 5.5, 5.6, 5.7, 5.8_

  - [x] 6.2 Write error case tests for createUser
    - Test error when phone not verified
    - Test error for duplicate phone number
    - Test phone normalization before duplicate check
    - Test database error handling
    - _Requirements: 5.2, 5.3, 5.4_

- [x] 7. Implement user retrieval tests
  - [x] 7.1 Write tests for getUserByPhone function
    - Test existing user retrieval returns user object
    - Test non-existent user returns null
    - Test +91 prefix normalization before lookup
    - Test 91 prefix normalization before lookup
    - Test database error returns null and logs error
    - Verify getUserByPhone helper called with normalized phone
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 8. Implement PIN setup tests
  - [x] 8.1 Write success case tests for setupPIN
    - Test 4-digit PIN acceptance
    - Test 5-digit PIN acceptance
    - Test 6-digit PIN acceptance
    - Test bcrypt.hash called before storage
    - Test phone normalization before user lookup
    - Verify updateUser called with pinHash
    - _Requirements: 7.1, 7.2, 7.3, 7.8, 7.9_

  - [x] 8.2 Write error case tests for setupPIN
    - Test 3-digit PIN rejection
    - Test 7-digit PIN rejection
    - Test non-numeric PIN rejection
    - Test non-existent user error
    - Test database error handling
    - _Requirements: 7.4, 7.5, 7.6, 7.7_

- [x] 9. Implement PIN login tests
  - [x] 9.1 Write success case tests for loginWithPIN
    - Test correct PIN returns success with JWT token
    - Test user object returned in response
    - Test failed attempt counter reset on success
    - Test phone normalization before processing
    - Verify bcrypt.compare called with PIN and hash
    - Verify jwt.sign called with correct payload
    - _Requirements: 8.1, 8.2, 8.3, 8.10_

  - [x] 9.2 Write error case tests for loginWithPIN
    - Test incorrect PIN increments failed attempts
    - Test 3 failed attempts locks account for 30 minutes
    - Test locked account returns error with time remaining
    - Test non-existent user error
    - Test user without PIN setup error
    - Test invalid phone format error
    - Test database error handling
    - _Requirements: 8.4, 8.5, 8.6, 8.7, 8.8, 8.9_

- [x] 10. Implement JWT token tests
  - [x] 10.1 Write token generation tests
    - Test JWT contains userId in payload
    - Test JWT contains phoneNumber in payload
    - Test JWT contains userType in payload
    - Verify jwt.sign called with correct parameters
    - _Requirements: 9.1, 9.2, 9.3_

  - [x] 10.2 Write token verification tests for verifyToken
    - Test valid token returns valid true with decoded payload
    - Test invalid token returns valid false
    - Test expired token returns valid false
    - Test tampered token returns valid false
    - Verify jwt.verify called with token
    - _Requirements: 9.4, 9.5, 9.6, 9.7_

- [x] 11. Implement biometric login tests
  - [x] 11.1 Write success case tests for loginWithBiometric
    - Test valid phone returns success with JWT token
    - Test user object returned in response
    - Test phone normalization before processing
    - Verify jwt.sign called with correct payload
    - _Requirements: 10.1, 10.2, 10.6_

  - [x] 11.2 Write error case tests for loginWithBiometric
    - Test locked account returns error with time remaining
    - Test non-existent user error
    - Test invalid phone format error
    - Test database error handling
    - _Requirements: 10.3, 10.4, 10.5_

- [x] 12. Implement user profile tests
  - [x] 12.1 Write tests for getUserProfile function
    - Test existing user ID returns success with user object
    - Test non-existent user ID returns error
    - Test database error returns error message
    - Verify getUserById helper called
    - _Requirements: 11.1, 11.2, 11.3_

  - [x] 12.2 Write tests for updateUserProfile function
    - Test name update without verification
    - Test location update without verification
    - Test language preferences update
    - Test phone number change requires verification
    - Test bank account change requires verification
    - Test phone number update with verification succeeds
    - Test duplicate phone number error
    - Test non-existent user error
    - Test database error handling
    - Verify updateUser helper called with correct data
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8_

- [x] 13. Checkpoint - Ensure all unit tests pass
  - Run `npm test -- auth.service.test.ts`
  - Verify all tests pass
  - Ask the user if questions arise

- [x] 14. Implement property-based tests
  - [x] 14.1 Create property-based test file
    - Create `src/features/auth/__tests__/auth.service.pbt.test.ts`
    - Import fast-check and auth service functions
    - Set up test structure with describe blocks
    - _Requirements: 14.5_

  - [ ]* 14.2 Write property test for phone normalization idempotence
    - **Property 1: Phone normalization idempotence**
    - **Validates: Requirements 1.5, 1.2, 1.3, 1.4**
    - Use fc.string() generator for random phone inputs
    - Test normalizePhoneNumber(normalizePhoneNumber(x)) === normalizePhoneNumber(x)
    - Run 100 iterations
    - _Requirements: 14.1, 14.6_

  - [ ]* 14.3 Write property test for OTP format validation
    - **Property 2: OTP format validation**
    - **Validates: Requirements 2.1, 2.2, 2.3**
    - Test all generated OTPs are 6 digits in range 100000-999999
    - Test OTP is numeric only
    - Run 100 iterations
    - _Requirements: 14.3, 14.6_

  - [ ]* 14.4 Write property test for invalid phone rejection
    - **Property 3: Invalid phone number rejection**
    - **Validates: Requirements 3.4, 3.5, 3.6**
    - Generate invalid phone formats (wrong length, invalid starting digit, non-numeric)
    - Test requestOTP consistently rejects with success: false
    - Run 100 iterations
    - _Requirements: 14.6_

  - [ ]* 14.5 Write property test for JWT round-trip verification
    - **Property 4: JWT round-trip verification**
    - **Validates: Requirements 9.8**
    - Generate random valid user data (userId, phoneNumber, userType)
    - Test encoding to JWT and verifying returns same data
    - Run 100 iterations
    - _Requirements: 14.4, 14.6_

- [ ] 15. Implement security tests
  - [ ]* 15.1 Write PIN hashing security tests
    - Test bcrypt.hash called before PIN storage
    - Test raw PIN never stored in database
    - Verify hash salt rounds set to 10
    - _Requirements: 16.1_

  - [ ]* 15.2 Write account locking security tests
    - Test account locks after exactly 3 failed attempts
    - Test lock duration is 30 minutes
    - Test locked account rejects all login attempts
    - _Requirements: 16.2_

  - [ ]* 15.3 Write OTP security tests
    - Test expired OTPs are rejected
    - Test OTP session deleted after 3 failed attempts
    - Test OTP expiration enforced at 10 minutes
    - _Requirements: 16.3, 16.4_

  - [ ]* 15.4 Write JWT security tests
    - Test tampered tokens are rejected
    - Test token signature verification
    - Test expired tokens are rejected
    - _Requirements: 16.5_

  - [ ]* 15.5 Write verification requirement tests
    - Test user creation requires OTP verification
    - Test phone number update requires verification
    - Test bank account update requires verification
    - _Requirements: 16.6, 16.7_

  - [ ]* 15.6 Write SQL injection safety tests
    - Test SQL injection payloads in phone numbers handled safely
    - Test SQL injection payloads in names handled safely
    - Verify no database errors from malicious inputs
    - _Requirements: 16.8_

- [ ] 16. Verify test coverage
  - [x] 16.1 Run coverage report
    - Run `npm test -- auth.service --coverage`
    - Generate coverage report
    - _Requirements: 15.1, 15.2, 15.3, 15.4_

  - [x] 16.2 Validate coverage thresholds
    - Verify statement coverage >= 80%
    - Verify branch coverage >= 80%
    - Verify function coverage >= 80%
    - Verify line coverage >= 80%
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

  - [x] 16.3 Identify and test uncovered code paths
    - Review coverage report for gaps
    - Add tests for uncovered branches
    - Add tests for uncovered error paths
    - _Requirements: 15.6, 15.7_

- [x] 17. Final checkpoint - Ensure all tests pass
  - Run `npm test -- auth.service` to execute all tests
  - Verify unit tests pass
  - Verify property-based tests pass
  - Verify coverage meets 80%+ threshold
  - Ensure all tests pass, ask the user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- All tests use complete dependency mocking for fast execution (< 5 seconds)
- Property tests run 100+ iterations to discover edge cases
- Security tests validate protection against common vulnerabilities
- Test infrastructure follows patterns from successful auth controller tests
- Mock helpers enable consistent test setup across all test files
