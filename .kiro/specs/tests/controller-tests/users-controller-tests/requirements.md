# Requirements Document: Users Controller Tests

## Introduction

This document specifies the requirements for comprehensive integration tests for the Users Controller. The Users Controller provides user management functionality with 2 endpoints: POST /api/users for creating users and GET /api/users for retrieving all users. The controller uses PostgreSQL as the primary database via global.sharedDbManager. The tests will achieve 80%+ code coverage using complete mocking patterns established in marketplace-controller-tests and transaction-controller-tests.

## Glossary

- **Users_Controller**: The Express router handling HTTP requests for user management operations
- **Database_Manager**: The shared database abstraction layer providing PostgreSQL and SQLite adapters
- **PostgreSQL_Adapter**: The database adapter for PostgreSQL operations
- **Test_Suite**: The Jest test suite containing all test cases for the Users Controller
- **Mock_Database**: A Jest mock implementation of DatabaseManager for isolated testing
- **Test_Factory**: A function that creates test data objects with sensible defaults
- **Supertest**: The HTTP testing library used to make requests to the controller
- **User_Type**: Enum of farmer, buyer, or transporter
- **Coverage_Target**: The minimum 80% code coverage requirement

## Requirements

### Requirement 1: Test Infrastructure Setup

**User Story:** As a developer, I want a properly configured test infrastructure, so that I can run isolated controller tests without real database dependencies.

#### Acceptance Criteria

1. THE Test_Suite SHALL import and configure the Users Controller with Express
2. THE Test_Suite SHALL create a Mock_Database with mocked PostgreSQL_Adapter methods
3. THE Test_Suite SHALL assign Mock_Database to global.sharedDbManager before tests
4. THE Test_Suite SHALL use supertest for HTTP request testing
5. WHEN each test begins, THE Test_Suite SHALL clear all mock call history using beforeEach
6. WHEN all tests complete, THE Test_Suite SHALL clean up global.sharedDbManager using afterAll
7. THE Test_Suite SHALL follow the same infrastructure pattern as marketplace-controller-tests

### Requirement 2: Test Helper Functions

**User Story:** As a developer, I want reusable test helper functions, so that I can create test data efficiently and maintain consistency.

#### Acceptance Criteria

1. THE Test_Suite SHALL provide a createMockDatabaseManager factory function
2. THE Test_Suite SHALL provide a createTestUser Test_Factory
3. THE Test_Suite SHALL provide a createTestUserRequest Test_Factory
4. THE Test_Suite SHALL provide test constants for user IDs, phone numbers, and names
5. THE Test_Suite SHALL support partial overrides in all Test_Factory functions
6. THE Test_Suite SHALL create test data with realistic default values matching User type definition

### Requirement 3: POST /api/users - Success Cases

**User Story:** As a developer, I want comprehensive tests for user creation success scenarios, so that I can verify the endpoint creates users correctly.

#### Acceptance Criteria

1. WHEN valid user data with phoneNumber field is provided, THE Users_Controller SHALL return 201 status with created user
2. WHEN valid user data with phone field is provided, THE Users_Controller SHALL return 201 status with created user
3. WHEN userType is farmer, THE Users_Controller SHALL create user with farmer type
4. WHEN userType is buyer, THE Users_Controller SHALL create user with buyer type
5. WHEN userType is transporter, THE Users_Controller SHALL create user with transporter type
6. WHEN location is a string, THE Users_Controller SHALL convert it to location object with address, latitude 0, longitude 0
7. WHEN location is an object, THE Users_Controller SHALL use it as provided
8. THE Users_Controller SHALL generate a UUID for the new user
9. THE Users_Controller SHALL call PostgreSQL_Adapter.createUser with user data and undefined PIN
10. THE Users_Controller SHALL return user object with id, name, phoneNumber, userType, location, and createdAt fields

### Requirement 4: POST /api/users - Validation and Error Cases

**User Story:** As a developer, I want comprehensive tests for user creation validation and errors, so that I can verify proper error handling.

#### Acceptance Criteria

1. WHEN phoneNumber and phone fields are both missing, THE Users_Controller SHALL return 400 status with "Phone number is required" error
2. WHEN user with same phone number already exists in PostgreSQL, THE Users_Controller SHALL return 409 status with conflict error
3. WHEN user already exists, THE Users_Controller SHALL return existing user details (name, userType, phoneNumber) in response
4. WHEN PostgreSQL_Adapter.query throws an error during existence check, THE Users_Controller SHALL return 500 status with "Failed to create user" error
5. WHEN PostgreSQL_Adapter.createUser throws an error, THE Users_Controller SHALL return 500 status with "Failed to create user" error
6. WHEN global.sharedDbManager is not initialized, THE Users_Controller SHALL throw error with "DatabaseManager not initialized" message

### Requirement 5: POST /api/users - Database Operation Verification

**User Story:** As a developer, I want tests that verify database operations, so that I can ensure correct data persistence.

#### Acceptance Criteria

1. THE Test_Suite SHALL verify PostgreSQL_Adapter.query is called with correct SQL for existence check
2. THE Test_Suite SHALL verify PostgreSQL_Adapter.query is called with phone number parameter
3. THE Test_Suite SHALL verify PostgreSQL_Adapter.createUser is called exactly once for new users
4. THE Test_Suite SHALL verify PostgreSQL_Adapter.createUser receives user object with all required fields
5. THE Test_Suite SHALL verify PostgreSQL_Adapter.createUser receives undefined as PIN parameter
6. THE Test_Suite SHALL verify no database operations occur when validation fails

### Requirement 6: GET /api/users - Success Cases

**User Story:** As a developer, I want comprehensive tests for retrieving all users, so that I can verify the endpoint returns user data correctly.

#### Acceptance Criteria

1. WHEN users exist in PostgreSQL, THE Users_Controller SHALL return 200 status with array of users
2. WHEN no users exist in PostgreSQL, THE Users_Controller SHALL return 200 status with empty array
3. THE Users_Controller SHALL query PostgreSQL for all users ordered by created_at DESC
4. THE Users_Controller SHALL return users with camelCase field names (id, name, phoneNumber, userType, location, createdAt)
5. THE Users_Controller SHALL return all user fields from the database query

### Requirement 7: GET /api/users - Error Cases

**User Story:** As a developer, I want comprehensive tests for user retrieval errors, so that I can verify proper error handling.

#### Acceptance Criteria

1. WHEN PostgreSQL_Adapter.query throws an error, THE Users_Controller SHALL return 500 status with "Failed to get users" error
2. WHEN global.sharedDbManager is not initialized, THE Users_Controller SHALL throw error with "DatabaseManager not initialized" message
3. THE Users_Controller SHALL log errors to console.error before returning error response

### Requirement 8: GET /api/users - Database Operation Verification

**User Story:** As a developer, I want tests that verify database query operations, so that I can ensure correct data retrieval.

#### Acceptance Criteria

1. THE Test_Suite SHALL verify PostgreSQL_Adapter.query is called exactly once
2. THE Test_Suite SHALL verify PostgreSQL_Adapter.query is called with SQL selecting id, name, phoneNumber, userType, location, createdAt
3. THE Test_Suite SHALL verify PostgreSQL_Adapter.query uses ORDER BY created_at DESC
4. THE Test_Suite SHALL verify the response contains the rows from query result

### Requirement 9: Backward Compatibility Testing

**User Story:** As a developer, I want tests for backward compatibility, so that I can ensure both phone and phoneNumber fields work correctly.

#### Acceptance Criteria

1. WHEN request contains phoneNumber field, THE Users_Controller SHALL use phoneNumber value
2. WHEN request contains phone field, THE Users_Controller SHALL use phone value
3. WHEN request contains both phone and phoneNumber fields, THE Users_Controller SHALL prioritize phoneNumber
4. THE Test_Suite SHALL verify backward compatibility for the phone field is maintained

### Requirement 10: Error Response Consistency

**User Story:** As a developer, I want consistent error responses across all endpoints, so that clients can handle errors predictably.

#### Acceptance Criteria

1. FOR ALL endpoints, WHEN an error occurs, THE Users_Controller SHALL return a response with an error field
2. FOR ALL endpoints, WHEN an error occurs, THE Users_Controller SHALL return a string error message
3. FOR ALL 400 responses, THE Users_Controller SHALL use descriptive validation error messages
4. FOR ALL 409 responses, THE Users_Controller SHALL include existingUser details in response
5. FOR ALL 500 responses, THE Users_Controller SHALL use "Failed to" prefix in error messages
6. FOR ALL endpoints, THE Users_Controller SHALL not expose sensitive database details in error responses

### Requirement 11: Mock Database Configuration

**User Story:** As a developer, I want properly configured database mocks, so that I can test controller logic in complete isolation.

#### Acceptance Criteria

1. THE Mock_Database SHALL provide getPostgreSQLAdapter method returning mocked adapter
2. THE PostgreSQL_Adapter mock SHALL provide query method as jest.fn()
3. THE PostgreSQL_Adapter mock SHALL provide createUser method as jest.fn()
4. THE Test_Suite SHALL configure mock return values using mockResolvedValue for async operations
5. THE Test_Suite SHALL configure mock implementations to simulate database responses
6. THE Test_Suite SHALL verify no real database connections occur during tests

### Requirement 12: Code Coverage Target

**User Story:** As a developer, I want to achieve 80%+ code coverage, so that I can ensure comprehensive testing of the controller.

#### Acceptance Criteria

1. THE Test_Suite SHALL achieve at least 80% line coverage for users.controller.ts
2. THE Test_Suite SHALL achieve at least 80% branch coverage for users.controller.ts
3. THE Test_Suite SHALL test both POST and GET endpoints
4. THE Test_Suite SHALL test all success paths for both endpoints
5. THE Test_Suite SHALL test all error paths for both endpoints
6. THE Test_Suite SHALL test all validation paths
7. THE Test_Suite SHALL test the getDbManager helper function

### Requirement 13: Test Organization and Documentation

**User Story:** As a developer, I want well-organized and documented tests, so that I can understand and maintain the test suite.

#### Acceptance Criteria

1. THE Test_Suite SHALL organize tests using describe blocks for each endpoint
2. THE Test_Suite SHALL use nested describe blocks for success and error cases
3. THE Test_Suite SHALL use descriptive test names that explain what is being tested
4. THE Test_Suite SHALL follow the same organization pattern as marketplace-controller-tests
5. THE Test_Suite SHALL use consistent naming conventions for test data and mocks
6. THE Test_Suite SHALL be located in src/features/users/__tests__/users.controller.test.ts
