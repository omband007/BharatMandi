# Implementation Plan: Dev Controller Tests

## Overview

This implementation plan creates a comprehensive integration test suite for the Dev Controller with 80%+ code coverage. The test suite will use Jest, supertest, and complete mocking of DatabaseManager and fs module, following patterns from marketplace-controller-tests and transaction-controller-tests. The implementation covers 6 endpoints with production safety checks, database operation verification, and file system operation verification.

## Tasks

- [ ] 1. Set up test infrastructure and module mocks
  - Create test file at `src/features/dev/__tests__/dev.controller.test.ts`
  - Configure jest.mock for fs module
  - Set up Express app with supertest
  - Configure global.sharedDbManager mock
  - Set up beforeEach/afterAll hooks for mock cleanup
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 19.7_

- [ ] 2. Create test helper utilities
  - [ ] 2.1 Create mock database manager helpers
    - Create `src/features/dev/__tests__/test-helpers/mock-database-manager.ts`
    - Implement createMockPostgreSQLAdapter factory function
    - Implement createMockSQLiteAdapter factory function
    - Implement createMockDatabaseManager factory function
    - Configure mock adapters with query, run, and get methods
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ] 2.2 Create test constants file
    - Create `src/features/dev/__tests__/test-helpers/test-constants.ts`
    - Define TEST_MEDIA_PATH constant
    - Define TEST_TABLE_NAMES for PostgreSQL and SQLite
    - Define TEST_SYNC_QUEUE_COUNTS sample data
    - Define TEST_DB_STATS sample data
    - _Requirements: 2.6_

  - [ ] 2.3 Create environment helper utilities
    - Create `src/features/dev/__tests__/test-helpers/test-env-helpers.ts`
    - Implement setProductionEnv function
    - Implement setDevelopmentEnv function
    - Implement restoreEnv function
    - _Requirements: 4.1, 6.1, 8.1, 10.1_

- [ ] 3. Implement POST /api/dev/clear-sync-queue tests
  - [ ] 3.1 Write success case tests
    - Test returns 200 status with success message
    - Test calls SQLite adapter get method to count items
    - Test calls SQLite adapter run method with DELETE statement
    - Test returns correct itemsCleared count (5 items scenario)
    - Test returns correct itemsCleared count (0 items scenario)
    - Test returns success: true in response
    - Test returns correct message in response
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [ ]* 3.2 Write property test for production safety
    - **Property 1: Production Safety - Status Code**
    - **Validates: Requirements 4.1, 13.1**

  - [ ]* 3.3 Write property test for error response structure
    - **Property 6: Error Response Structure - Success Field**
    - **Validates: Requirements 4.7, 16.1**

  - [ ] 3.4 Write error case tests
    - Test returns 403 in production environment
    - Test returns production error message
    - Test does not call database methods in production
    - Test returns 500 when DatabaseManager undefined
    - Test returns 500 when SQLite get throws error
    - Test returns 500 when SQLite run throws error
    - Test returns success: false for all error cases
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

- [ ] 4. Checkpoint - Ensure clear-sync-queue tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Implement POST /api/dev/clean-all-data tests
  - [ ] 5.1 Write success case tests
    - Test returns 200 status with success message
    - Test deletes PostgreSQL tables in correct order (listing_media, listings, transactions, escrow_accounts, users)
    - Test deletes SQLite tables (listing_media_cache, listings, pending_sync_queue, transactions, escrow_accounts, users, otp_sessions, account_security)
    - Test calls fs.existsSync to check media directory
    - Test calls fs.rmSync with recursive and force options when directory exists
    - Test returns cleaned object with postgresql, sqlite, and filesystem arrays
    - Test returns success: true in response
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

  - [ ]* 5.2 Write property test for production safety
    - **Property 2: Production Safety - Error Message**
    - **Validates: Requirements 6.1, 13.2, 16.4**

  - [ ]* 5.3 Write property test for no database operations in production
    - **Property 3: Production Safety - No Database Operations**
    - **Validates: Requirements 6.1, 13.3**

  - [ ] 5.4 Write error case tests
    - Test returns 403 in production environment
    - Test returns 500 when PostgreSQL query throws error
    - Test returns 500 when SQLite run throws error
    - Test continues execution when fs.rmSync throws error
    - Test returns 500 when DatabaseManager undefined
    - Test returns success: false for all error cases
    - Test includes error details in response
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

- [ ] 6. Implement POST /api/dev/delete-media tests
  - [ ] 6.1 Write success case tests
    - Test returns 200 status with success message
    - Test calls PostgreSQL query with DELETE FROM listing_media
    - Test calls SQLite run with DELETE FROM listing_media_cache
    - Test calls fs.existsSync to check media directory
    - Test calls fs.rmSync with recursive and force options when directory exists
    - Test returns success: true in response
    - Test returns correct message in response
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

  - [ ]* 6.2 Write property test for no file system operations in production
    - **Property 4: Production Safety - No File System Operations**
    - **Validates: Requirements 13.4**

  - [ ]* 6.3 Write property test for successful response structure
    - **Property 5: Successful Response Structure**
    - **Validates: Requirements 7.6, 11.8**

  - [ ] 6.4 Write error case tests
    - Test returns 403 in production environment
    - Test returns 500 when PostgreSQL query throws error
    - Test returns 500 when SQLite run throws error
    - Test returns 500 when fs.rmSync throws error
    - Test returns 500 when DatabaseManager undefined
    - Test returns success: false for all error cases
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

- [ ] 7. Checkpoint - Ensure delete-media tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Implement POST /api/dev/delete-listings tests
  - [ ] 8.1 Write success case tests
    - Test returns 200 status with success message
    - Test calls PostgreSQL query with DELETE FROM listings
    - Test calls SQLite run with DELETE FROM listings
    - Test calls SQLite run with DELETE FROM listing_media_cache
    - Test calls fs.existsSync to check media directory
    - Test calls fs.rmSync with recursive and force options when directory exists
    - Test returns correct message about listings and media deletion
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_

  - [ ]* 8.2 Write property test for error response details field
    - **Property 8: Error Response Structure - Details Field**
    - **Validates: Requirements 16.3, 16.5**

  - [ ] 8.3 Write error case tests
    - Test returns 403 in production environment
    - Test returns 500 when PostgreSQL query throws error
    - Test returns 500 when SQLite run throws error
    - Test returns 500 when fs.rmSync throws error
    - Test returns 500 when DatabaseManager undefined
    - Test returns success: false for all error cases
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

- [ ] 9. Implement GET /api/dev/stats tests
  - [ ] 9.1 Write success case tests
    - Test returns 200 status with statistics object
    - Test calls PostgreSQL query for users count
    - Test calls PostgreSQL query for listings count
    - Test calls PostgreSQL query for listing_media count
    - Test calls PostgreSQL query for transactions count
    - Test returns postgresql object with users, listings, media, and transactions counts
    - Test returns sqlite object with note about stats being disabled
    - Test returns success: true in response
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8_

  - [ ]* 9.2 Write property test for DatabaseManager initialization check
    - **Property 9: DatabaseManager Initialization Check**
    - **Validates: Requirements 12.1**

  - [ ] 9.3 Write error case tests
    - Test returns 500 when DatabaseManager undefined
    - Test returns 500 when PostgreSQL query throws error
    - Test returns success: false for all error cases
    - Test includes error details in response
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

- [ ] 10. Implement getDbManager helper function tests
  - [ ] 10.1 Write success case test
    - Test returns DatabaseManager when global.sharedDbManager is defined
    - _Requirements: 18.5_

  - [ ] 10.2 Write error case test
    - Test throws error when global.sharedDbManager is undefined
    - _Requirements: 4.4, 6.5, 8.5, 10.5, 12.1_

- [ ] 11. Checkpoint - Ensure all endpoint tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Implement cross-cutting production safety tests
  - [ ] 12.1 Write comprehensive production safety verification
    - Test all POST endpoints return 403 in production
    - Test no database operations occur in production for all POST endpoints
    - Test no file system operations occur in production for all POST endpoints
    - Test consistent error message across all POST endpoints
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8_

- [ ] 13. Implement database operation verification tests
  - [ ] 13.1 Write database operation verification
    - Test correct adapter methods are called for all endpoints
    - Test correct SQL statements are used for all endpoints
    - Test operations are called in correct order for clean-all-data
    - Test PostgreSQL operations use query method
    - Test SQLite operations use run or get methods
    - Test mock call counts match expected invocations
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6_

- [ ] 14. Implement file system operation verification tests
  - [ ] 14.1 Write file system operation verification
    - Test fs.existsSync called with correct path for all endpoints
    - Test fs.rmSync called with recursive: true and force: true
    - Test fs.rmSync called with path containing 'data/media/listings'
    - Test fs.rmSync not called when media directory does not exist
    - Test file system operations are mocked and do not affect real file system
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

- [ ] 15. Implement error response consistency tests
  - [ ] 15.1 Write error response consistency verification
    - Test all error responses have success: false field
    - Test all error responses have error field with message
    - Test all 500 responses have details field with error details
    - Test all 403 responses use consistent production safety error message
    - Test all error responses follow consistent JSON structure
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6_

- [ ] 16. Verify mock isolation and test independence
  - [ ] 16.1 Write mock isolation verification
    - Test all mock call history is cleared before each test
    - Test all mock return values are reset before each test
    - Test fresh mock implementations are configured for each test
    - Test no test affects the state of subsequent tests
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5_

- [ ] 17. Final checkpoint - Verify coverage and test organization
  - [ ] 17.1 Run coverage report and verify targets
    - Run `npm test -- --coverage` to generate coverage report
    - Verify minimum 80% line coverage for dev.controller.ts
    - Verify minimum 80% branch coverage for dev.controller.ts
    - Identify any uncovered lines or branches
    - _Requirements: 18.6, 18.7_

  - [ ] 17.2 Verify test organization and documentation
    - Verify tests are organized using describe blocks for each endpoint
    - Verify nested describe blocks for success and error cases
    - Verify descriptive test names explain what is being tested
    - Verify comments explain complex test scenarios
    - Verify consistent naming conventions for test data and mocks
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6_

  - [ ] 17.3 Final verification
    - Ensure all 6 endpoints are tested (clear-sync-queue, clean-all-data, delete-media, delete-listings, stats, getDbManager)
    - Ensure all success paths are tested
    - Ensure all error paths are tested
    - Ensure all production safety checks are tested
    - Ensure coverage targets are met
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7_

## Notes

- Tasks marked with `*` are optional property-based tests and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at logical breaks
- Follow patterns from marketplace-controller-tests and transaction-controller-tests
- All tests use complete mocking - no real database or file system operations
- Production safety is critical - verify all POST endpoints are blocked in production
- Target 80%+ code coverage for dev.controller.ts
