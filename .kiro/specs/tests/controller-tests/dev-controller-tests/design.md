# Design Document: Dev Controller Tests

## Overview

This design document specifies the comprehensive integration test suite for the Dev Controller. The Dev Controller provides development-only endpoints for testing and data management operations including clearing sync queues, cleaning all data, deleting media, deleting listings, and retrieving database statistics. These endpoints include critical production safety checks and should NEVER be exposed in production.

The test suite will achieve 80%+ code coverage using complete mocking of DatabaseManager (PostgreSQL and SQLite adapters) and the fs module, following established patterns from marketplace-controller-tests and transaction-controller-tests. The tests will use supertest for HTTP testing, Jest for mocking, and follow the test helper pattern established in existing controller tests.

The Dev Controller exposes 6 endpoints:
- POST /api/dev/clear-sync-queue - Clear the pending_sync_queue table
- POST /api/dev/clean-all-data - Delete all data from databases and file system
- POST /api/dev/delete-media - Delete all media files and records
- POST /api/dev/delete-listings - Delete all listings and their media
- GET /api/dev/stats - Get database statistics
- getDbManager helper function - Retrieve shared DatabaseManager instance

## Architecture

### Test Infrastructure Components

```
dev.controller.test.ts
├── Test App (Express + supertest)
├── Mock Modules
│   ├── fs module (jest.mock)
│   └── DatabaseManager (global.sharedDbManager)
├── Mock Adapters
│   ├── PostgreSQL Adapter (query method)
│   └── SQLite Adapter (run, get methods)
└── Test Helpers
    ├── Data Factories
    ├── Mock Adapter Creators
    └── Test Constants
```

### Test Organization

The test suite will be organized into describe blocks matching the controller structure:

1. Test Infrastructure Setup (beforeEach/afterAll)
2. POST /api/dev/clear-sync-queue
   - Success Cases
   - Error Cases
3. POST /api/dev/clean-all-data
   - Success Cases
   - Error Cases
4. POST /api/dev/delete-media
   - Success Cases
   - Error Cases
5. POST /api/dev/delete-listings
   - Success Cases
   - Error Cases
6. GET /api/dev/stats
   - Success Cases
   - Error Cases
7. Production Safety Checks (cross-cutting)
8. Error Response Consistency (cross-cutting)

### Mocking Strategy

**Complete Isolation:**
- Mock fs module using jest.mock('fs')
- Mock DatabaseManager and assign to global.sharedDbManager
- Mock PostgreSQL adapter with query method
- Mock SQLite adapter with run and get methods
- No real database or file system operations

**Mock Configuration:**
- Use mockResolvedValue for async adapter methods
- Use mockReturnValue for synchronous fs methods
- Clear all mocks in beforeEach
- Clean up global state in afterAll
- Configure fresh mock implementations for each test

**Adapter Method Signatures:**
- PostgreSQL: `query(sql: string): Promise<{ rows: any[] }>`
- SQLite: `run(sql: string): Promise<void>`
- SQLite: `get(sql: string): Promise<any>`
- fs: `existsSync(path: string): boolean`
- fs: `rmSync(path: string, options: { recursive: boolean, force: boolean }): void`

## Components and Interfaces

### Test App Setup

```typescript
import request from 'supertest';
import express from 'express';
import { devController } from '../dev.controller';
import * as fs from 'fs';

// Mock fs module before imports
jest.mock('fs');

const app = express();
app.use(express.json());
app.use('/api/dev', devController);
```

### Mock Adapter Interfaces

**PostgreSQL Adapter Mock:**
```typescript
interface MockPostgreSQLAdapter {
  query: jest.Mock<Promise<{ rows: any[] }>, [string]>;
}
```

**SQLite Adapter Mock:**
```typescript
interface MockSQLiteAdapter {
  run: jest.Mock<Promise<void>, [string]>;
  get: jest.Mock<Promise<any>, [string]>;
}
```

**DatabaseManager Mock:**
```typescript
interface MockDatabaseManager {
  getPostgreSQLAdapter: jest.Mock<MockPostgreSQLAdapter, []>;
  getSQLiteAdapter: jest.Mock<MockSQLiteAdapter, []>;
}
```

### Test Helper Functions

**Mock Adapter Creators:**
- `createMockPostgreSQLAdapter()` - Create PostgreSQL adapter mock with query method
- `createMockSQLiteAdapter()` - Create SQLite adapter mock with run and get methods
- `createMockDatabaseManager()` - Create database manager mock with both adapters

**Test Constants:**
- `TEST_MEDIA_PATH` - Path to media directory (data/media/listings)
- `TEST_TABLE_NAMES` - PostgreSQL and SQLite table names
- `TEST_SYNC_QUEUE_COUNTS` - Sample sync queue item counts
- `TEST_DB_STATS` - Sample database statistics

**Environment Helpers:**
- `setProductionEnv()` - Set NODE_ENV to 'production'
- `setDevelopmentEnv()` - Set NODE_ENV to 'development'
- `restoreEnv()` - Restore original NODE_ENV

## Data Models

### Test Response Models

**Clear Sync Queue Response:**
```typescript
interface ClearSyncQueueResponse {
  success: boolean;
  message: string;
  itemsCleared: number;
}
```

**Clean All Data Response:**
```typescript
interface CleanAllDataResponse {
  success: boolean;
  message: string;
  cleaned: {
    postgresql: string[];
    sqlite: string[];
    filesystem: string[];
  };
}
```

**Delete Media Response:**
```typescript
interface DeleteMediaResponse {
  success: boolean;
  message: string;
}
```

**Delete Listings Response:**
```typescript
interface DeleteListingsResponse {
  success: boolean;
  message: string;
}
```

**Stats Response:**
```typescript
interface StatsResponse {
  success: boolean;
  postgresql: {
    users: number;
    listings: number;
    media: number;
    transactions: number;
  };
  sqlite: {
    users: string;
    listings: string;
    mediaCache: string;
    syncQueue: string;
    note: string;
  };
}
```

**Error Response:**
```typescript
interface ErrorResponse {
  success: boolean;
  error: string;
  details?: string;
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Production Safety - Status Code

*For any* POST endpoint (clear-sync-queue, clean-all-data, delete-media, delete-listings), when NODE_ENV is 'production', the controller should return 403 status code.

**Validates: Requirements 4.1, 6.1, 8.1, 10.1, 13.1**

### Property 2: Production Safety - Error Message

*For any* POST endpoint (clear-sync-queue, clean-all-data, delete-media, delete-listings), when NODE_ENV is 'production', the controller should return error message 'This endpoint is not available in production'.

**Validates: Requirements 4.2, 13.2, 16.4**

### Property 3: Production Safety - No Database Operations

*For any* POST endpoint (clear-sync-queue, clean-all-data, delete-media, delete-listings), when NODE_ENV is 'production', the controller should not call any database adapter methods (query, run, get).

**Validates: Requirements 4.3, 13.3**

### Property 4: Production Safety - No File System Operations

*For any* POST endpoint (clear-sync-queue, clean-all-data, delete-media, delete-listings), when NODE_ENV is 'production', the controller should not call any file system methods (existsSync, rmSync).

**Validates: Requirements 13.4**

### Property 5: Successful Response Structure

*For any* successful endpoint response (200 or 201 status), the response should contain a success field with value true.

**Validates: Requirements 3.6, 5.7, 7.6, 11.8**

### Property 6: Error Response Structure - Success Field

*For any* error response (403, 404, 500 status), the response should contain a success field with value false.

**Validates: Requirements 4.7, 6.6, 8.6, 10.6, 12.3, 16.1**

### Property 7: Error Response Structure - Error Field

*For any* error response (403, 404, 500 status), the response should contain an error field with a string message.

**Validates: Requirements 16.2**

### Property 8: Error Response Structure - Details Field

*For any* 500 error response, the response should contain a details field with error details from the caught exception.

**Validates: Requirements 6.7, 12.4, 16.3, 16.5**

### Property 9: DatabaseManager Initialization Check

*For any* endpoint, when global.sharedDbManager is undefined, the controller should return 500 status with error message.

**Validates: Requirements 4.4, 6.5, 8.5, 10.5, 12.1**

## Error Handling

### Error Categories

**Production Safety Errors (403):**
- NODE_ENV is 'production' for any POST endpoint
- Error message: 'This endpoint is not available in production'
- No database or file system operations should be executed

**Server Errors (500):**
- DatabaseManager not initialized (global.sharedDbManager is undefined)
- PostgreSQL adapter query throws error
- SQLite adapter run/get throws error
- File system operations throw error (for delete-media and delete-listings)

### Error Response Format

All errors follow consistent JSON structure:

**403 Production Safety Error:**
```typescript
{
  success: false,
  error: 'This endpoint is not available in production'
}
```

**500 Server Error:**
```typescript
{
  success: false,
  error: string,  // User-friendly error message
  details: string // Error details from exception
}
```

### Error Handling Behavior

**Production Safety:**
- Check NODE_ENV at the start of each POST endpoint
- Return 403 immediately without executing any operations
- Ensure no database or file system side effects

**DatabaseManager Initialization:**
- getDbManager helper throws error if global.sharedDbManager is undefined
- All endpoints catch this error and return 500 status
- Error message: 'DatabaseManager not initialized'

**Database Operation Failures:**
- Catch errors from adapter methods (query, run, get)
- Return 500 status with error details
- Log error to console for debugging

**File System Operation Failures:**
- For clean-all-data: catch fs.rmSync errors but continue execution (return success)
- For delete-media and delete-listings: catch fs.rmSync errors and return 500 status
- Include error details in response

### Security Considerations

- Production safety checks prevent accidental data deletion in production
- Error responses include details for debugging but don't expose sensitive information
- All destructive operations require development environment

## Testing Strategy

### Dual Testing Approach

The test suite uses unit tests to verify controller behavior with complete mocking:

**Unit Tests:**
- Specific examples for each endpoint
- Edge cases (empty queue, missing directory, production environment)
- Error conditions (database failures, file system failures, missing DatabaseManager)
- Integration points (adapter method calls, parameter passing, call order)
- Response structure validation
- Status code verification
- Production safety verification

**Test Coverage Strategy:**
- Test all 6 endpoints (5 routes + getDbManager helper)
- Test success paths for each endpoint
- Test error paths for each endpoint
- Test production safety for all POST endpoints
- Test database operation verification
- Test file system operation verification
- Test error response consistency

### Test Execution

**Test Configuration:**
- Use Jest as test runner
- Use supertest for HTTP testing
- Mock fs module using jest.mock
- Mock DatabaseManager and adapters
- Clear mocks between tests

**Test Isolation:**
- Each test is independent
- No shared state between tests
- Clean up global state after all tests
- Fresh mock configurations for each test

**Mock Verification:**
- Verify correct adapter methods are called
- Verify correct SQL statements are used
- Verify operations are called in correct order
- Verify fs methods are called with correct parameters
- Verify no operations occur in production mode

### Coverage Target

- Minimum 80% line coverage for dev.controller.ts
- Minimum 80% branch coverage for dev.controller.ts
- All 6 endpoints tested
- All error paths tested
- All production safety checks tested

## Test Implementation Plan

### Phase 1: Test Infrastructure

1. Create test file: `src/features/dev/__tests__/dev.controller.test.ts`
2. Set up module mocks (fs module)
3. Create test app with Express and supertest
4. Configure global.sharedDbManager mock
5. Set up beforeEach/afterAll hooks

### Phase 2: Test Helpers

Create test helper files in `src/features/dev/__tests__/test-helpers/`:

1. **mock-database-manager.ts**
   - createMockPostgreSQLAdapter()
   - createMockSQLiteAdapter()
   - createMockDatabaseManager()

2. **test-constants.ts**
   - TEST_MEDIA_PATH
   - TEST_TABLE_NAMES (PostgreSQL and SQLite)
   - TEST_SYNC_QUEUE_COUNTS
   - TEST_DB_STATS

3. **test-env-helpers.ts**
   - setProductionEnv()
   - setDevelopmentEnv()
   - restoreEnv()

### Phase 3: Endpoint Tests

1. **POST /api/dev/clear-sync-queue**
   - Success: Returns 200 with itemsCleared count
   - Success: Calls SQLite get and run methods
   - Success: Returns correct message
   - Edge case: Empty queue (0 items)
   - Error: Production environment (403)
   - Error: DatabaseManager undefined (500)
   - Error: SQLite get throws error (500)
   - Error: SQLite run throws error (500)

2. **POST /api/dev/clean-all-data**
   - Success: Returns 200 with cleaned arrays
   - Success: Deletes PostgreSQL tables in correct order
   - Success: Deletes SQLite tables
   - Success: Calls fs.existsSync and fs.rmSync
   - Error: Production environment (403)
   - Error: DatabaseManager undefined (500)
   - Error: PostgreSQL query throws error (500)
   - Error: SQLite run throws error (500)
   - Error: fs.rmSync throws error (continues execution)

3. **POST /api/dev/delete-media**
   - Success: Returns 200 with success message
   - Success: Calls PostgreSQL query for listing_media
   - Success: Calls SQLite run for listing_media_cache
   - Success: Calls fs.existsSync and fs.rmSync
   - Error: Production environment (403)
   - Error: DatabaseManager undefined (500)
   - Error: PostgreSQL query throws error (500)
   - Error: SQLite run throws error (500)
   - Error: fs.rmSync throws error (500)

4. **POST /api/dev/delete-listings**
   - Success: Returns 200 with success message
   - Success: Calls PostgreSQL query for listings
   - Success: Calls SQLite run for listings and listing_media_cache
   - Success: Calls fs.existsSync and fs.rmSync
   - Error: Production environment (403)
   - Error: DatabaseManager undefined (500)
   - Error: PostgreSQL query throws error (500)
   - Error: SQLite run throws error (500)
   - Error: fs.rmSync throws error (500)

5. **GET /api/dev/stats**
   - Success: Returns 200 with statistics object
   - Success: Calls PostgreSQL query for all counts
   - Success: Returns postgresql object with counts
   - Success: Returns sqlite object with note
   - Error: DatabaseManager undefined (500)
   - Error: PostgreSQL query throws error (500)

6. **getDbManager Helper Function**
   - Success: Returns DatabaseManager when defined
   - Error: Throws error when undefined

### Phase 4: Cross-Cutting Tests

1. **Production Safety Checks**
   - Test all POST endpoints return 403 in production
   - Test no database operations in production
   - Test no file system operations in production
   - Test consistent error message

2. **Error Response Consistency**
   - Test all error responses have success: false
   - Test all error responses have error field
   - Test 500 responses have details field
   - Test consistent JSON structure

### Phase 5: Coverage Verification

1. Run coverage report: `npm test -- --coverage`
2. Identify uncovered lines
3. Add tests for uncovered paths
4. Verify 80%+ coverage achieved
5. Document coverage results

## Implementation Notes

### Mock Configuration Patterns

**PostgreSQL Adapter Mock:**
```typescript
const mockPgAdapter = {
  query: jest.fn().mockResolvedValue({ rows: [{ count: 0 }] })
};
```

**SQLite Adapter Mock:**
```typescript
const mockSqliteAdapter = {
  run: jest.fn().mockResolvedValue(undefined),
  get: jest.fn().mockResolvedValue({ count: 0 })
};
```

**File System Mock:**
```typescript
jest.mock('fs');
(fs.existsSync as jest.Mock).mockReturnValue(true);
(fs.rmSync as jest.Mock).mockImplementation(() => {});
```

### Test Organization Pattern

```typescript
describe('Dev Controller - Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Configure mocks
  });

  afterAll(() => {
    delete (global as any).sharedDbManager;
  });

  describe('POST /api/dev/clear-sync-queue', () => {
    describe('Success Cases', () => {
      it('should return 200 with itemsCleared count', async () => {
        // Test implementation
      });
    });

    describe('Error Cases', () => {
      it('should return 403 in production', async () => {
        // Test implementation
      });
    });
  });
});
```

### Environment Variable Management

```typescript
const originalEnv = process.env.NODE_ENV;

beforeEach(() => {
  process.env.NODE_ENV = 'development';
});

afterAll(() => {
  process.env.NODE_ENV = originalEnv;
});
```

### Verification Patterns

**Verify Method Calls:**
```typescript
expect(mockSqliteAdapter.run).toHaveBeenCalledTimes(1);
expect(mockSqliteAdapter.run).toHaveBeenCalledWith('DELETE FROM pending_sync_queue');
```

**Verify Call Order:**
```typescript
const calls = mockPgAdapter.query.mock.calls;
expect(calls[0][0]).toContain('DELETE FROM listing_media');
expect(calls[1][0]).toContain('DELETE FROM listings');
```

**Verify No Calls:**
```typescript
expect(mockPgAdapter.query).not.toHaveBeenCalled();
expect(fs.rmSync).not.toHaveBeenCalled();
```
