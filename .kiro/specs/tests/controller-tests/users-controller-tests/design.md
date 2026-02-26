# Design Document: Users Controller Tests

## Overview

This design document specifies the comprehensive integration test suite for the Users Controller. The test suite will achieve 80%+ code coverage while following established patterns from marketplace-controller-tests and transaction-controller-tests, using complete database mocking for fast, isolated tests.

The Users Controller exposes 2 endpoints for user management:
- POST /api/users - Create a new user (farmer, buyer, or transporter)
- GET /api/users - Retrieve all users

The test suite will use supertest for HTTP testing, Jest for mocking, and follow the test helper pattern established in the marketplace and transaction controller tests.

## Architecture

### Test Infrastructure Components

```
users.controller.test.ts
├── Test App (Express + supertest)
├── Mock DatabaseManager (global.sharedDbManager)
│   └── PostgreSQL Adapter Mock
│       ├── query (jest.fn)
│       └── createUser (jest.fn)
└── Test Helpers
    ├── Data Factories
    ├── Mock Database Creator
    └── Test Constants
```

### Test Organization

The test suite will be organized into describe blocks matching the controller endpoints:

1. Test Infrastructure Setup (beforeEach/afterAll)
2. POST /api/users
   - Success Cases
   - Validation and Error Cases
3. GET /api/users
   - Success Cases
   - Error Cases
4. Backward Compatibility Tests
5. Error Response Consistency

### Mocking Strategy

**Complete Database Isolation:**
- Mock DatabaseManager with PostgreSQL adapter
- Mock PostgreSQL adapter methods: query(), createUser()
- Assign mock to global.sharedDbManager
- No real database operations

**Mock Configuration:**
- Use mockResolvedValue for async database methods
- Clear all mocks in beforeEach
- Clean up global state in afterAll

## Components and Interfaces

### Test App Setup

```typescript
import request from 'supertest';
import express from 'express';
import { usersController } from '../users.controller';

const app = express();
app.use(express.json());
app.use('/api/users', usersController);
```

### Mock Database Interfaces

**DatabaseManager Mock:**
```typescript
interface MockDatabaseManager {
  getPostgreSQLAdapter: () => MockPostgreSQLAdapter;
}

interface MockPostgreSQLAdapter {
  query: jest.Mock;
  createUser: jest.Mock;
}
```

### Test Helper Functions

**Data Factories:**
- `createTestUser(overrides?)` - Generate user objects with defaults
- `createTestUserRequest(overrides?)` - Generate request data
- `createMockDatabaseManager()` - Create database manager mock

**Test Constants:**
- `TEST_USER_IDS` - Sample user IDs
- `TEST_PHONE_NUMBERS` - Sample phone numbers
- `TEST_USER_NAMES` - Sample user names
- `TEST_USER_TYPES` - User type enum values

## Data Models

### Test User Model

```typescript
interface TestUser {
  id: string;
  name: string;
  phoneNumber: string;
  userType: 'farmer' | 'buyer' | 'transporter';
  location: {
    address: string;
    latitude: number;
    longitude: number;
  };
  createdAt: Date;
}
```

### Test User Request Model

```typescript
interface TestUserRequest {
  name: string;
  phoneNumber?: string;
  phone?: string;
  type: 'farmer' | 'buyer' | 'transporter';
  location: string | {
    address: string;
    latitude: number;
    longitude: number;
  };
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: User Type Handling

*For any* valid user type (farmer, buyer, or transporter), when creating a user with that type, the controller should create the user with the specified type and return it in the response.

**Validates: Requirements 3.3, 3.4, 3.5**

### Property 2: UUID Generation

*For any* successful user creation, the controller should generate a valid UUID for the new user and include it in the response.

**Validates: Requirements 3.8**

### Property 3: Database Adapter Invocation

*For any* new user creation, the controller should call PostgreSQL_Adapter.createUser with the complete user data object and undefined as the PIN parameter.

**Validates: Requirements 3.9**

### Property 4: User Response Structure

*For any* successful user creation, the response should contain all required fields: id, name, phoneNumber, userType, location, and createdAt.

**Validates: Requirements 3.10**

### Property 5: Duplicate User Handling

*For any* phone number that already exists in the database, when attempting to create a user with that phone number, the controller should return 409 status with conflict error and include the existing user's name, userType, and phoneNumber in the response.

**Validates: Requirements 4.2, 4.3**

### Property 6: User List Ordering

*For any* set of users returned from the database, the controller should return them ordered by created_at DESC.

**Validates: Requirements 6.3**

### Property 7: Field Name Transformation

*For any* user returned from GET /api/users, the response should use camelCase field names (id, name, phoneNumber, userType, location, createdAt) regardless of database column naming.

**Validates: Requirements 6.4**

### Property 8: Complete Field Inclusion

*For any* user returned from GET /api/users, the response should include all user fields from the database query (id, name, phoneNumber, userType, location, createdAt).

**Validates: Requirements 6.5**

### Property 9: Error Logging

*For any* error that occurs in the controller, the error should be logged to console.error before returning the error response.

**Validates: Requirements 7.3**

### Property 10: Error Response Structure

*For any* endpoint, when an error occurs, the controller should return a response with an error field containing a string message.

**Validates: Requirements 10.1, 10.2**

### Property 11: Validation Error Messages

*For any* 400 validation error response, the error message should be descriptive and clearly indicate what validation failed.

**Validates: Requirements 10.3**

### Property 12: Conflict Response Structure

*For any* 409 conflict response, the response should include existingUser details with name, userType, and phoneNumber fields.

**Validates: Requirements 10.4**

### Property 13: Server Error Message Format

*For any* 500 server error response, the error message should use the "Failed to" prefix format.

**Validates: Requirements 10.5**

### Property 14: Error Security

*For any* error response, the controller should not expose sensitive database details (connection strings, internal paths, stack traces) in the error message.

**Validates: Requirements 10.6**

## Error Handling

### Error Categories

**Validation Errors (400):**
- Missing phone number (both phoneNumber and phone fields absent)

**Conflict Errors (409):**
- User with phone number already exists

**Server Errors (500):**
- Database query fails during existence check
- Database createUser operation fails
- DatabaseManager not initialized

### Error Response Format

All errors follow consistent JSON structure:
```typescript
{
  error: string;  // User-friendly error message
  existingUser?: {  // Only for 409 conflicts
    name: string;
    userType: string;
    phoneNumber: string;
  };
}
```

### Security Considerations

- 500 errors must not expose sensitive information (database connection strings, internal paths, stack traces)
- Error messages should be generic and user-friendly
- Detailed error logging should only go to console, not response

## Testing Strategy

### Dual Testing Approach

The test suite uses unit tests to verify controller behavior:

**Unit Tests:**
- Specific examples for each endpoint
- Edge cases (empty user list, missing fields)
- Error conditions (database failures, validation failures, conflicts)
- Integration points (database method calls, parameter passing)
- Response structure validation
- Status code verification
- Backward compatibility (phone vs phoneNumber fields)

**Test Coverage Strategy:**
- Test both POST and GET endpoints
- Test success paths for each endpoint
- Test error paths for each endpoint
- Test validation rules for POST /api/users
- Test database operation delegation
- Test response structure consistency
- Test backward compatibility scenarios
- Test location normalization (string vs object)
- Test all user types (farmer, buyer, transporter)

### Test Execution

**Test Configuration:**
- Use Jest as test runner
- Use supertest for HTTP testing
- Mock all external dependencies (DatabaseManager, PostgreSQL adapter)
- Clear mocks between tests using beforeEach
- Clean up global state using afterAll

**Test Isolation:**
- Each test is independent
- No shared state between tests
- Mock return values configured per test

### Coverage Target

- Minimum 80% line coverage for users.controller.ts
- Minimum 80% branch coverage for users.controller.ts
- Both endpoints tested
- All error paths tested
- All validation paths tested
- getDbManager helper function tested

## Test Implementation Plan

### Phase 1: Test Infrastructure

1. Create test file: src/features/users/__tests__/users.controller.test.ts
2. Set up Express app with supertest
3. Create mock DatabaseManager with PostgreSQL adapter
4. Configure global.sharedDbManager mock
5. Set up beforeEach/afterAll hooks

### Phase 2: Test Helpers

1. Create test-helpers directory structure
2. Implement createMockDatabaseManager factory
3. Implement createTestUser factory
4. Implement createTestUserRequest factory
5. Define test constants (IDs, phone numbers, names, types)

### Phase 3: POST /api/users Tests

**Success Cases:**
1. Create user with phoneNumber field (201 response)
2. Create user with phone field (201 response)
3. Create user with farmer type
4. Create user with buyer type
5. Create user with transporter type
6. Location string conversion to object
7. Location object passthrough
8. UUID generation verification
9. Database createUser call verification
10. Response structure validation

**Validation and Error Cases:**
1. Missing phone number (400 response)
2. Duplicate phone number (409 response with existingUser)
3. Database query error during existence check (500 response)
4. Database createUser error (500 response)
5. DatabaseManager not initialized (error thrown)
6. Verify no database operations on validation failure

### Phase 4: GET /api/users Tests

**Success Cases:**
1. Return users array when users exist (200 response)
2. Return empty array when no users exist (200 response)
3. Verify ordering by created_at DESC
4. Verify camelCase field names
5. Verify all fields included in response

**Error Cases:**
1. Database query error (500 response)
2. DatabaseManager not initialized (error thrown)
3. Error logging verification

### Phase 5: Backward Compatibility Tests

1. Request with phoneNumber field
2. Request with phone field
3. Request with both fields (phoneNumber priority)

### Phase 6: Error Response Consistency Tests

1. Test error field presence in all error responses
2. Test error message is string type
3. Test 400 error message descriptiveness
4. Test 409 response includes existingUser details
5. Test 500 error messages use "Failed to" prefix
6. Test sensitive information not exposed in errors

### Phase 7: Coverage Verification

1. Run Jest coverage report
2. Identify uncovered lines and branches
3. Add tests for uncovered paths
4. Verify 80%+ coverage achieved for users.controller.ts

