# Requirements Document: Dev Controller Tests

## Introduction

This document specifies the requirements for comprehensive integration tests for the Dev Controller. The Dev Controller provides development-only endpoints for testing and data management operations including clearing sync queues, cleaning all data, deleting media, deleting listings, and retrieving database statistics. These endpoints include critical production safety checks and should NEVER be exposed in production. The tests will achieve 80%+ code coverage using complete mocking of DatabaseManager and fs module, following established patterns from marketplace-controller-tests and transaction-controller-tests.

## Glossary

- **Dev_Controller**: The Express router handling HTTP requests for development-only operations
- **Database_Manager**: The shared database abstraction providing PostgreSQL and SQLite adapters
- **PostgreSQL_Adapter**: The adapter for PostgreSQL database operations
- **SQLite_Adapter**: The adapter for SQLite database operations
- **Test_Suite**: The Jest test suite containing all test cases for the Dev Controller
- **Mock_Database_Manager**: A Jest mock implementation of DatabaseManager for isolated testing
- **Mock_FS**: A Jest mock of the Node.js fs module for file system operations
- **Sync_Queue**: The pending_sync_queue table in SQLite containing synchronization tasks
- **Production_Safety_Check**: The NODE_ENV validation that returns 403 in production
- **Coverage_Target**: The minimum 80% code coverage requirement for dev.controller.ts
- **Media_Path**: The file system path data/media/listings where media files are stored

## Requirements

### Requirement 1: Test Infrastructure Setup

**User Story:** As a developer, I want a properly configured test infrastructure, so that I can run isolated controller tests without real database or file system dependencies.

#### Acceptance Criteria

1. THE Test_Suite SHALL import and configure the Dev Controller with Express
2. THE Test_Suite SHALL mock the fs module using jest.mock
3. THE Test_Suite SHALL create a Mock_Database_Manager with getPostgreSQLAdapter and getSQLiteAdapter methods
4. THE Test_Suite SHALL assign Mock_Database_Manager to global.sharedDbManager
5. THE Test_Suite SHALL use supertest for HTTP request testing
6. WHEN each test begins, THE Test_Suite SHALL clear all mock call history using beforeEach
7. WHEN all tests complete, THE Test_Suite SHALL clean up global.sharedDbManager using afterAll
8. THE Test_Suite SHALL follow the same infrastructure pattern as marketplace-controller-tests and transaction-controller-tests

### Requirement 2: Test Helper Functions

**User Story:** As a developer, I want reusable test helper functions, so that I can create mock adapters and test data efficiently.

#### Acceptance Criteria

1. THE Test_Suite SHALL provide a createMockPostgreSQLAdapter factory function
2. THE Test_Suite SHALL provide a createMockSQLiteAdapter factory function
3. THE Test_Suite SHALL provide a createMockDatabaseManager factory function
4. THE Test_Suite SHALL configure mock adapters with query, run, and get methods
5. THE Test_Suite SHALL support configuring mock return values for database operations
6. THE Test_Suite SHALL provide test constants for table names and file paths

### Requirement 3: POST /api/dev/clear-sync-queue - Success Cases

**User Story:** As a developer, I want comprehensive tests for the clear sync queue endpoint success scenarios, so that I can verify queue clearing works correctly.

#### Acceptance Criteria

1. WHEN the endpoint is called in development mode, THE Dev_Controller SHALL return 200 status with success message
2. WHEN the endpoint is called, THE Dev_Controller SHALL call SQLite_Adapter.get to count items before deletion
3. WHEN the endpoint is called, THE Dev_Controller SHALL call SQLite_Adapter.run with 'DELETE FROM pending_sync_queue'
4. WHEN 5 items exist in the queue, THE Dev_Controller SHALL return itemsCleared: 5 in the response
5. WHEN 0 items exist in the queue, THE Dev_Controller SHALL return itemsCleared: 0 in the response
6. THE Dev_Controller SHALL return success: true in the response
7. THE Dev_Controller SHALL return message: 'Sync queue cleared successfully' in the response

### Requirement 4: POST /api/dev/clear-sync-queue - Error Cases

**User Story:** As a developer, I want comprehensive tests for the clear sync queue endpoint error scenarios, so that I can verify proper error handling.

#### Acceptance Criteria

1. WHEN NODE_ENV is 'production', THE Dev_Controller SHALL return 403 status with error message
2. WHEN NODE_ENV is 'production', THE Dev_Controller SHALL return error: 'This endpoint is not available in production'
3. WHEN NODE_ENV is 'production', THE Dev_Controller SHALL NOT call any database methods
4. WHEN global.sharedDbManager is undefined, THE Dev_Controller SHALL return 500 status with error message
5. WHEN SQLite_Adapter.get throws an error, THE Dev_Controller SHALL return 500 status with error details
6. WHEN SQLite_Adapter.run throws an error, THE Dev_Controller SHALL return 500 status with error details
7. THE Dev_Controller SHALL return success: false for all error cases

### Requirement 5: POST /api/dev/clean-all-data - Success Cases

**User Story:** As a developer, I want comprehensive tests for the clean all data endpoint success scenarios, so that I can verify complete data cleanup works correctly.

#### Acceptance Criteria

1. WHEN the endpoint is called in development mode, THE Dev_Controller SHALL return 200 status with success message
2. WHEN the endpoint is called, THE Dev_Controller SHALL delete from PostgreSQL tables in correct order (listing_media, listings, transactions, escrow_accounts, users)
3. WHEN the endpoint is called, THE Dev_Controller SHALL delete from SQLite tables (listing_media_cache, listings, pending_sync_queue, transactions, escrow_accounts, users, otp_sessions, account_security)
4. WHEN the endpoint is called, THE Dev_Controller SHALL call fs.existsSync to check for media directory
5. WHEN media directory exists, THE Dev_Controller SHALL call fs.rmSync with recursive: true and force: true
6. THE Dev_Controller SHALL return cleaned object with postgresql, sqlite, and filesystem arrays
7. THE Dev_Controller SHALL return success: true in the response

### Requirement 6: POST /api/dev/clean-all-data - Error Cases

**User Story:** As a developer, I want comprehensive tests for the clean all data endpoint error scenarios, so that I can verify proper error handling for database and file system failures.

#### Acceptance Criteria

1. WHEN NODE_ENV is 'production', THE Dev_Controller SHALL return 403 status with production safety error
2. WHEN PostgreSQL_Adapter.query throws an error, THE Dev_Controller SHALL return 500 status with error details
3. WHEN SQLite_Adapter.run throws an error, THE Dev_Controller SHALL return 500 status with error details
4. WHEN fs.rmSync throws an error, THE Dev_Controller SHALL continue execution and return success
5. WHEN global.sharedDbManager is undefined, THE Dev_Controller SHALL return 500 status with error message
6. THE Dev_Controller SHALL return success: false for all error cases
7. THE Dev_Controller SHALL include error details in the response

### Requirement 7: POST /api/dev/delete-media - Success Cases

**User Story:** As a developer, I want comprehensive tests for the delete media endpoint success scenarios, so that I can verify media deletion works correctly.

#### Acceptance Criteria

1. WHEN the endpoint is called in development mode, THE Dev_Controller SHALL return 200 status with success message
2. WHEN the endpoint is called, THE Dev_Controller SHALL call PostgreSQL_Adapter.query with 'DELETE FROM listing_media'
3. WHEN the endpoint is called, THE Dev_Controller SHALL call SQLite_Adapter.run with 'DELETE FROM listing_media_cache'
4. WHEN the endpoint is called, THE Dev_Controller SHALL call fs.existsSync to check for media directory
5. WHEN media directory exists, THE Dev_Controller SHALL call fs.rmSync with recursive: true and force: true
6. THE Dev_Controller SHALL return success: true in the response
7. THE Dev_Controller SHALL return message: 'All media deleted successfully' in the response

### Requirement 8: POST /api/dev/delete-media - Error Cases

**User Story:** As a developer, I want comprehensive tests for the delete media endpoint error scenarios, so that I can verify proper error handling.

#### Acceptance Criteria

1. WHEN NODE_ENV is 'production', THE Dev_Controller SHALL return 403 status with production safety error
2. WHEN PostgreSQL_Adapter.query throws an error, THE Dev_Controller SHALL return 500 status with error details
3. WHEN SQLite_Adapter.run throws an error, THE Dev_Controller SHALL return 500 status with error details
4. WHEN fs.rmSync throws an error, THE Dev_Controller SHALL return 500 status with error details
5. WHEN global.sharedDbManager is undefined, THE Dev_Controller SHALL return 500 status with error message
6. THE Dev_Controller SHALL return success: false for all error cases

### Requirement 9: POST /api/dev/delete-listings - Success Cases

**User Story:** As a developer, I want comprehensive tests for the delete listings endpoint success scenarios, so that I can verify listing deletion with CASCADE works correctly.

#### Acceptance Criteria

1. WHEN the endpoint is called in development mode, THE Dev_Controller SHALL return 200 status with success message
2. WHEN the endpoint is called, THE Dev_Controller SHALL call PostgreSQL_Adapter.query with 'DELETE FROM listings'
3. WHEN the endpoint is called, THE Dev_Controller SHALL call SQLite_Adapter.run with 'DELETE FROM listings'
4. WHEN the endpoint is called, THE Dev_Controller SHALL call SQLite_Adapter.run with 'DELETE FROM listing_media_cache'
5. WHEN the endpoint is called, THE Dev_Controller SHALL call fs.existsSync to check for media directory
6. WHEN media directory exists, THE Dev_Controller SHALL call fs.rmSync with recursive: true and force: true
7. THE Dev_Controller SHALL return message: 'All listings and their media deleted successfully' in the response

### Requirement 10: POST /api/dev/delete-listings - Error Cases

**User Story:** As a developer, I want comprehensive tests for the delete listings endpoint error scenarios, so that I can verify proper error handling.

#### Acceptance Criteria

1. WHEN NODE_ENV is 'production', THE Dev_Controller SHALL return 403 status with production safety error
2. WHEN PostgreSQL_Adapter.query throws an error, THE Dev_Controller SHALL return 500 status with error details
3. WHEN SQLite_Adapter.run throws an error, THE Dev_Controller SHALL return 500 status with error details
4. WHEN fs.rmSync throws an error, THE Dev_Controller SHALL return 500 status with error details
5. WHEN global.sharedDbManager is undefined, THE Dev_Controller SHALL return 500 status with error message
6. THE Dev_Controller SHALL return success: false for all error cases

### Requirement 11: GET /api/dev/stats - Success Cases

**User Story:** As a developer, I want comprehensive tests for the stats endpoint success scenarios, so that I can verify database statistics retrieval works correctly.

#### Acceptance Criteria

1. WHEN the endpoint is called, THE Dev_Controller SHALL return 200 status with statistics object
2. WHEN the endpoint is called, THE Dev_Controller SHALL call PostgreSQL_Adapter.query for users count
3. WHEN the endpoint is called, THE Dev_Controller SHALL call PostgreSQL_Adapter.query for listings count
4. WHEN the endpoint is called, THE Dev_Controller SHALL call PostgreSQL_Adapter.query for listing_media count
5. WHEN the endpoint is called, THE Dev_Controller SHALL call PostgreSQL_Adapter.query for transactions count
6. THE Dev_Controller SHALL return postgresql object with users, listings, media, and transactions counts
7. THE Dev_Controller SHALL return sqlite object with note about stats being disabled
8. THE Dev_Controller SHALL return success: true in the response

### Requirement 12: GET /api/dev/stats - Error Cases

**User Story:** As a developer, I want comprehensive tests for the stats endpoint error scenarios, so that I can verify proper error handling.

#### Acceptance Criteria

1. WHEN global.sharedDbManager is undefined, THE Dev_Controller SHALL return 500 status with error message
2. WHEN PostgreSQL_Adapter.query throws an error, THE Dev_Controller SHALL return 500 status with error details
3. THE Dev_Controller SHALL return success: false for all error cases
4. THE Dev_Controller SHALL include error details in the response

### Requirement 13: Production Safety Check Testing

**User Story:** As a developer, I want comprehensive tests for production safety checks, so that I can ensure these dangerous endpoints are never accessible in production.

#### Acceptance Criteria

1. FOR ALL POST endpoints, WHEN NODE_ENV is 'production', THE Dev_Controller SHALL return 403 status
2. FOR ALL POST endpoints, WHEN NODE_ENV is 'production', THE Dev_Controller SHALL return error message about production unavailability
3. FOR ALL POST endpoints, WHEN NODE_ENV is 'production', THE Dev_Controller SHALL NOT execute any database operations
4. FOR ALL POST endpoints, WHEN NODE_ENV is 'production', THE Dev_Controller SHALL NOT execute any file system operations
5. THE Test_Suite SHALL verify production safety for clear-sync-queue endpoint
6. THE Test_Suite SHALL verify production safety for clean-all-data endpoint
7. THE Test_Suite SHALL verify production safety for delete-media endpoint
8. THE Test_Suite SHALL verify production safety for delete-listings endpoint

### Requirement 14: Database Operation Verification

**User Story:** As a developer, I want tests that verify correct database operations, so that I can ensure data is deleted from the correct tables in the correct order.

#### Acceptance Criteria

1. FOR ALL endpoints that delete data, THE Test_Suite SHALL verify the correct adapter methods are called
2. FOR ALL endpoints that delete data, THE Test_Suite SHALL verify the correct SQL statements are used
3. FOR ALL endpoints that delete data, THE Test_Suite SHALL verify operations are called in the correct order
4. THE Test_Suite SHALL verify PostgreSQL operations use PostgreSQL_Adapter.query
5. THE Test_Suite SHALL verify SQLite operations use SQLite_Adapter.run or SQLite_Adapter.get
6. THE Test_Suite SHALL verify mock call counts match expected invocations

### Requirement 15: File System Operation Verification

**User Story:** As a developer, I want tests that verify correct file system operations, so that I can ensure media files are properly deleted.

#### Acceptance Criteria

1. FOR ALL endpoints that delete files, THE Test_Suite SHALL verify fs.existsSync is called with correct path
2. FOR ALL endpoints that delete files, THE Test_Suite SHALL verify fs.rmSync is called with recursive: true and force: true
3. FOR ALL endpoints that delete files, THE Test_Suite SHALL verify fs.rmSync is called with path containing 'data/media/listings'
4. WHEN media directory does not exist, THE Test_Suite SHALL verify fs.rmSync is not called
5. THE Test_Suite SHALL verify file system operations are mocked and do not affect real file system

### Requirement 16: Error Response Consistency

**User Story:** As a developer, I want consistent error responses across all endpoints, so that API consumers receive predictable error structures.

#### Acceptance Criteria

1. FOR ALL endpoints, WHEN an error occurs, THE Dev_Controller SHALL return a response with success: false
2. FOR ALL endpoints, WHEN an error occurs, THE Dev_Controller SHALL return a response with error field containing error message
3. FOR ALL endpoints, WHEN an error occurs, THE Dev_Controller SHALL return a response with details field containing error details
4. FOR ALL 403 responses, THE Dev_Controller SHALL use consistent production safety error message
5. FOR ALL 500 responses, THE Dev_Controller SHALL include error details from caught exceptions
6. THE Test_Suite SHALL verify all error responses follow consistent JSON structure

### Requirement 17: Mock Isolation and Test Independence

**User Story:** As a developer, I want complete mock isolation between tests, so that tests run independently without side effects.

#### Acceptance Criteria

1. THE Test_Suite SHALL clear all mock call history before each test
2. THE Test_Suite SHALL reset all mock return values before each test
3. THE Test_Suite SHALL configure fresh mock implementations for each test
4. WHEN multiple tests run in sequence, THE Test_Suite SHALL ensure complete isolation between tests
5. THE Test_Suite SHALL verify no test affects the state of subsequent tests

### Requirement 18: Code Coverage Target

**User Story:** As a developer, I want to achieve 80%+ code coverage for dev.controller.ts, so that I have confidence in the controller's reliability.

#### Acceptance Criteria

1. THE Test_Suite SHALL test all 6 endpoint handlers (clear-sync-queue, clean-all-data, delete-media, delete-listings, stats, and getDbManager)
2. THE Test_Suite SHALL test all success paths for each endpoint
3. THE Test_Suite SHALL test all error paths for each endpoint
4. THE Test_Suite SHALL test all production safety checks
5. THE Test_Suite SHALL test the getDbManager helper function
6. THE Test_Suite SHALL achieve minimum 80% line coverage for dev.controller.ts
7. THE Test_Suite SHALL achieve minimum 80% branch coverage for dev.controller.ts

### Requirement 19: Test Organization and Documentation

**User Story:** As a developer, I want well-organized and documented tests, so that I can understand and maintain the test suite.

#### Acceptance Criteria

1. THE Test_Suite SHALL organize tests using describe blocks for each endpoint
2. THE Test_Suite SHALL use nested describe blocks for success cases and error cases
3. THE Test_Suite SHALL use descriptive test names that explain what is being tested
4. THE Test_Suite SHALL include comments explaining complex test scenarios
5. THE Test_Suite SHALL follow the same organization pattern as marketplace-controller-tests and transaction-controller-tests
6. THE Test_Suite SHALL use consistent naming conventions for test data and mocks
7. THE Test_Suite SHALL be located in src/features/dev/__tests__/dev.controller.test.ts
