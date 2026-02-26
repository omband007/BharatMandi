# Implementation Plan: Users Controller Integration Tests

## Overview

This implementation plan breaks down the creation of a comprehensive integration test suite for the Users Controller. The test suite will achieve 80%+ coverage through systematic testing of both user management endpoints (POST /api/users and GET /api/users), including success cases, validation errors, conflict handling, and error consistency tests. The implementation uses Jest, Supertest, and follows the project's established testing patterns from marketplace-controller-tests and transaction-controller-tests.

## Tasks

- [ ] 1. Set up test infrastructure and helpers
  - [ ] 1.1 Create test file structure and database mocks
    - Create `src/features/users/__tests__/users.controller.test.ts`
    - Create mock DatabaseManager with PostgreSQL adapter
    - Mock PostgreSQL adapter methods: query(), createUser()
    - Configure Express test app with supertest
    - Mount usersController on test app at /api/users
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [ ] 1.2 Set up test lifecycle hooks
    - Assign mock DatabaseManager to global.sharedDbManager
    - Set up beforeEach hook to clear all mocks
    - Set up afterAll hook to clean up global.sharedDbManager
    - _Requirements: 1.5, 1.6_

  - [ ] 1.3 Create test data factories and constants
    - Create createMockDatabaseManager factory function
    - Create createTestUser factory function with partial overrides support
    - Create createTestUserRequest factory function
    - Define TEST_USER_IDS, TEST_PHONE_NUMBERS, TEST_USER_NAMES constants
    - Define TEST_USER_TYPES constant (farmer, buyer, transporter)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [ ] 2. Implement POST /api/users success case tests
  - [ ] 2.1 Write tests for user creation with phone field variations
    - Test valid user data with phoneNumber field returns 201 status with created user
    - Test valid user data with phone field returns 201 status with created user
    - Verify response contains id, name, phoneNumber, userType, location, createdAt fields
    - _Requirements: 3.1, 3.2, 3.10_

  - [ ]* 2.2 Write property test for user creation response structure
    - **Property 4: User Response Structure**
    - **Validates: Requirements 3.10**
    - Test any successful user creation returns all required fields
    - _Requirements: 3.10_

  - [ ] 2.3 Write tests for all user types
    - Test creating user with farmer type returns user with farmer type
    - Test creating user with buyer type returns user with buyer type
    - Test creating user with transporter type returns user with transporter type
    - _Requirements: 3.3, 3.4, 3.5_

  - [ ]* 2.4 Write property test for user type handling
    - **Property 1: User Type Handling**
    - **Validates: Requirements 3.3, 3.4, 3.5**
    - Test any valid user type is correctly stored and returned
    - _Requirements: 3.3, 3.4, 3.5_

  - [ ] 2.5 Write tests for location normalization
    - Test location string is converted to object with address, latitude 0, longitude 0
    - Test location object is used as provided without modification
    - _Requirements: 3.6, 3.7_

  - [ ] 2.6 Write test for UUID generation
    - Test response contains valid UUID in id field
    - Verify UUID format matches standard UUID pattern
    - _Requirements: 3.8_

  - [ ]* 2.7 Write property test for UUID generation
    - **Property 2: UUID Generation**
    - **Validates: Requirements 3.8**
    - Test any successful user creation generates valid UUID
    - _Requirements: 3.8_

- [ ] 3. Implement POST /api/users database operation tests
  - [ ] 3.1 Write tests for database adapter invocation
    - Test PostgreSQL_Adapter.createUser called with complete user data object
    - Test PostgreSQL_Adapter.createUser called with undefined as PIN parameter
    - Verify createUser receives all required fields (id, name, phoneNumber, userType, location, createdAt)
    - _Requirements: 3.9, 5.3, 5.4, 5.5_

  - [ ]* 3.2 Write property test for database adapter invocation
    - **Property 3: Database Adapter Invocation**
    - **Validates: Requirements 3.9**
    - Test any user creation calls createUser with correct parameters
    - _Requirements: 3.9_

  - [ ] 3.3 Write tests for existence check query
    - Test PostgreSQL_Adapter.query called with correct SQL for existence check
    - Test query called with phone number parameter
    - Verify query checks for existing user before creation
    - _Requirements: 5.1, 5.2_

- [ ] 4. Checkpoint - Ensure POST success tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Implement POST /api/users validation and error tests
  - [ ] 5.1 Write test for missing phone number validation
    - Test request without phoneNumber and phone fields returns 400 status
    - Test error message is "Phone number is required"
    - Verify no database operations occur when validation fails
    - _Requirements: 4.1, 5.6_

  - [ ] 5.2 Write tests for duplicate user handling
    - Test creating user with existing phone number returns 409 status
    - Test 409 response includes existingUser with name, userType, phoneNumber
    - Verify conflict error message indicates user already exists
    - _Requirements: 4.2, 4.3_

  - [ ]* 5.3 Write property test for duplicate user handling
    - **Property 5: Duplicate User Handling**
    - **Validates: Requirements 4.2, 4.3**
    - Test any existing phone number returns 409 with existing user details
    - _Requirements: 4.2, 4.3_

  - [ ] 5.4 Write tests for database errors during creation
    - Test PostgreSQL_Adapter.query error during existence check returns 500 status
    - Test PostgreSQL_Adapter.createUser error returns 500 status
    - Test error message is "Failed to create user"
    - _Requirements: 4.4, 4.5_

  - [ ] 5.5 Write test for uninitialized DatabaseManager
    - Test global.sharedDbManager not initialized throws error
    - Test error message is "DatabaseManager not initialized"
    - _Requirements: 4.6_

- [ ] 6. Implement GET /api/users success case tests
  - [ ] 6.1 Write tests for retrieving users
    - Test users exist in database returns 200 status with array of users
    - Test no users exist returns 200 status with empty array
    - Verify response contains users array
    - _Requirements: 6.1, 6.2_

  - [ ] 6.2 Write test for user list ordering
    - Test users returned are ordered by created_at DESC
    - Verify PostgreSQL_Adapter.query called with ORDER BY created_at DESC
    - _Requirements: 6.3, 8.3_

  - [ ]* 6.3 Write property test for user list ordering
    - **Property 6: User List Ordering**
    - **Validates: Requirements 6.3**
    - Test any set of users is returned in created_at DESC order
    - _Requirements: 6.3_

  - [ ] 6.4 Write test for field name transformation
    - Test response uses camelCase field names (id, name, phoneNumber, userType, location, createdAt)
    - Verify all fields from database query are included in response
    - _Requirements: 6.4, 6.5_

  - [ ]* 6.5 Write property test for field name transformation
    - **Property 7: Field Name Transformation**
    - **Validates: Requirements 6.4**
    - Test any user returned uses camelCase field names
    - _Requirements: 6.4_

  - [ ]* 6.6 Write property test for complete field inclusion
    - **Property 8: Complete Field Inclusion**
    - **Validates: Requirements 6.5**
    - Test any user returned includes all database fields
    - _Requirements: 6.5_

- [ ] 7. Implement GET /api/users database operation tests
  - [ ] 7.1 Write tests for database query verification
    - Test PostgreSQL_Adapter.query called exactly once
    - Test query selects id, name, phoneNumber, userType, location, createdAt fields
    - Test query uses ORDER BY created_at DESC
    - Test response contains rows from query result
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ] 8. Implement GET /api/users error case tests
  - [ ] 8.1 Write test for database query error
    - Test PostgreSQL_Adapter.query error returns 500 status
    - Test error message is "Failed to get users"
    - _Requirements: 7.1_

  - [ ] 8.2 Write test for uninitialized DatabaseManager
    - Test global.sharedDbManager not initialized throws error
    - Test error message is "DatabaseManager not initialized"
    - _Requirements: 7.2_

  - [ ] 8.3 Write test for error logging
    - Test errors are logged to console.error before returning response
    - Verify console.error called with error object
    - _Requirements: 7.3_

  - [ ]* 8.4 Write property test for error logging
    - **Property 9: Error Logging**
    - **Validates: Requirements 7.3**
    - Test any error is logged to console.error
    - _Requirements: 7.3_

- [ ] 9. Checkpoint - Ensure GET endpoint tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Implement backward compatibility tests
  - [ ] 10.1 Write tests for phone field backward compatibility
    - Test request with phoneNumber field uses phoneNumber value
    - Test request with phone field uses phone value
    - Test request with both fields prioritizes phoneNumber
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [ ] 11. Implement error response consistency tests
  - [ ] 11.1 Write tests for error response format
    - Test all error responses contain error field with string message
    - Test all 400 responses use descriptive validation error messages
    - Test all 409 responses include existingUser details
    - Test all 500 responses use "Failed to" prefix in error messages
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [ ]* 11.2 Write property test for error response structure
    - **Property 10: Error Response Structure**
    - **Validates: Requirements 10.1, 10.2**
    - Test any error returns response with error field
    - _Requirements: 10.1, 10.2_

  - [ ]* 11.3 Write property test for validation error messages
    - **Property 11: Validation Error Messages**
    - **Validates: Requirements 10.3**
    - Test any 400 error has descriptive message
    - _Requirements: 10.3_

  - [ ]* 11.4 Write property test for conflict response structure
    - **Property 12: Conflict Response Structure**
    - **Validates: Requirements 10.4**
    - Test any 409 error includes existingUser details
    - _Requirements: 10.4_

  - [ ]* 11.5 Write property test for server error message format
    - **Property 13: Server Error Message Format**
    - **Validates: Requirements 10.5**
    - Test any 500 error uses "Failed to" prefix
    - _Requirements: 10.5_

  - [ ] 11.6 Write test for error security
    - Test error responses do not expose sensitive database details
    - Test error responses do not expose connection strings
    - Test error responses do not expose internal paths
    - Test error responses do not expose stack traces
    - _Requirements: 10.6_

  - [ ]* 11.7 Write property test for error security
    - **Property 14: Error Security**
    - **Validates: Requirements 10.6**
    - Test any error does not expose sensitive information
    - _Requirements: 10.6_

- [ ] 12. Verify test coverage and generate coverage report
  - [ ] 12.1 Run tests with coverage and verify thresholds
    - Run `npm test -- users.controller --coverage`
    - Verify users.controller.ts achieves at least 80% line coverage
    - Verify users.controller.ts achieves at least 80% branch coverage
    - Identify any uncovered code paths
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7_

  - [ ] 12.2 Add tests for uncovered code paths if needed
    - Review coverage report for gaps
    - Add tests for uncovered branches
    - Add tests for uncovered error paths
    - Add tests for getDbManager helper function
    - _Requirements: 12.7_

- [ ] 13. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Integration tests validate HTTP endpoint behavior with mocked database
- All tests use mocked DatabaseManager and PostgreSQL adapter for complete isolation
- Test suite targets 80%+ line coverage and 80%+ branch coverage
- Follow patterns from marketplace-controller-tests and transaction-controller-tests for consistency
