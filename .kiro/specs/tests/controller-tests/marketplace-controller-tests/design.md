# Design Document: Marketplace Controller Tests

## Overview

This design document specifies the comprehensive unit test suite for the marketplace controller. The test suite will achieve 80%+ code coverage while following established patterns from auth.controller.test.ts, using complete service mocking for fast, isolated tests.

The marketplace controller exposes 4 main endpoints:
- POST /api/marketplace/listings - Create a new listing
- POST /api/marketplace/listings/with-media - Create listing with media files
- GET /api/marketplace/listings - Get all active listings
- GET /api/marketplace/listings/:id - Get listing by ID

The test suite will use supertest for HTTP testing, Jest for mocking, and follow the test helper pattern established in the auth controller tests.

## Architecture

### Test Infrastructure Components

```
marketplace.controller.test.ts
├── Test App (Express + supertest)
├── Mock Services
│   ├── marketplaceService (module mock)
│   └── MediaService (constructor mock)
├── Mock DatabaseManager (global.sharedDbManager)
└── Test Helpers
    ├── Data Factories
    ├── Mock Service Creators
    └── Test Constants
```

### Test Organization

The test suite will be organized into describe blocks matching the controller endpoints:

1. Test Infrastructure Setup (beforeEach/afterAll)
2. POST /api/marketplace/listings
3. GET /api/marketplace/listings
4. GET /api/marketplace/listings/:id
5. POST /api/marketplace/listings/with-media
   - Success cases
   - Error cases
   - Multer validation
6. Error Response Consistency

### Mocking Strategy

**Complete Service Isolation:**
- Mock marketplaceService module using jest.mock()
- Mock MediaService constructor to return mock instance
- Mock DatabaseManager and assign to global.sharedDbManager
- No real database or storage operations

**Mock Configuration:**
- Use mockResolvedValue for async service methods
- Use mockReturnValue for synchronous methods
- Clear all mocks in beforeEach
- Clean up global state in afterAll

## Components and Interfaces

### Test App Setup

```typescript
import request from 'supertest';
import express from 'express';
import { marketplaceController } from '../marketplace.controller';

// Mock modules before imports
jest.mock('../marketplace.service');
jest.mock('../media.service');

const app = express();
app.use(express.json());
app.use('/api/marketplace', marketplaceController);
```

### Mock Service Interfaces

**MarketplaceService Mock:**
```typescript
interface MockMarketplaceService {
  createListing: jest.Mock;
  getActiveListings: jest.Mock;
  getListing: jest.Mock;
}
```

**MediaService Mock:**
```typescript
interface MockMediaService {
  uploadMedia: jest.Mock;
}
```

### Test Helper Functions

**Data Factories:**
- `createTestListing(overrides?)` - Generate listing objects
- `createTestListingRequest(overrides?)` - Generate request data
- `createTestMediaResult(overrides?)` - Generate media upload results
- `createTestFile(overrides?)` - Generate mock file objects

**Mock Service Creators:**
- `createMockMarketplaceService()` - Create marketplace service mock
- `createMockMediaService()` - Create media service mock
- `createMockDatabaseManager()` - Create database manager mock

**Test Constants:**
- `TEST_LISTING_IDS` - Sample listing IDs
- `TEST_FARMER_IDS` - Sample farmer IDs
- `TEST_PRODUCE_TYPES` - Sample produce types
- `ALLOWED_MIME_TYPES` - Valid file MIME types
- `INVALID_MIME_TYPES` - Invalid file MIME types

## Data Models

### Test Listing Model

```typescript
interface TestListing {
  id: string;
  farmerId: string;
  produceType: string;
  quantity: number;
  pricePerKg: number;
  certificateId: string;
  createdAt: Date;
  isActive: boolean;
}
```

### Test Media Result Model

```typescript
interface TestMediaResult {
  fileName: string;
  success: boolean;
  mediaId: string;
  error?: string;
}
```

### Test File Model

```typescript
interface TestFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Service Error Handling

*For any* endpoint and any service error, the controller should return 500 status with an error message that does not expose sensitive internal details.

**Validates: Requirements 2.4, 3.3, 4.3, 10.4**

### Property 2: Missing Field Validation

*For any* required field in the create listing request, when that field is missing, the endpoint should handle the error gracefully (either through validation or service error handling).

**Validates: Requirements 2.3**

### Property 3: Video Media Type Detection

*For any* file with a video MIME type (video/mp4, video/quicktime), the with-media endpoint should auto-detect the media type as 'video'.

**Validates: Requirements 5.3**

### Property 4: Multiple File Processing

*For any* set of valid files up to the limit of 10, the with-media endpoint should process all files and return results for each.

**Validates: Requirements 5.5**

### Property 5: Partial Upload Failure Handling

*For any* file upload that fails, the with-media endpoint should include the failure in media results but still return 201 status (not fail the entire request).

**Validates: Requirements 6.2**

### Property 6: Success and Failure Counting

*For any* combination of successful and failed file uploads, the with-media endpoint should return correct counts for media.total, media.successful, and media.failed.

**Validates: Requirements 6.3**

### Property 7: Invalid File Type Rejection

*For any* file with a MIME type not in the allowed list, multer should reject the request with 400 status.

**Validates: Requirements 6.4**

### Property 8: Error Response Structure

*For any* error response (400, 404, 500), the response should contain an error field with a string message and use consistent JSON structure.

**Validates: Requirements 6.7, 10.1, 10.2, 10.3, 10.5**

## Error Handling

### Error Categories

**Validation Errors (400):**
- Missing required fields
- Invalid file types
- File size exceeds limit
- Too many files

**Not Found Errors (404):**
- Listing ID does not exist

**Server Errors (500):**
- Service method throws error
- Database operation fails
- Storage operation fails

### Error Response Format

All errors follow consistent JSON structure:
```typescript
{
  error: string;        // User-friendly error message
  details?: string;     // Additional context (only for 500 errors)
}
```

### Security Considerations

- 500 errors must not expose sensitive information (database connection strings, internal paths, stack traces)
- Error messages should be generic and user-friendly
- Detailed error logging should only go to console, not response

## Testing Strategy

### Dual Testing Approach

The test suite uses both unit tests and property-based tests:

**Unit Tests:**
- Specific examples for each endpoint
- Edge cases (empty arrays, missing data)
- Error conditions (service failures, validation failures)
- Integration points (service method calls, parameter passing)

**Property-Based Tests:**
- Not applicable for this test suite (testing the tests themselves)
- The test suite validates properties of the controller behavior

### Test Coverage Strategy

**Endpoint Coverage:**
- Test all 4 endpoints
- Test success paths for each endpoint
- Test error paths for each endpoint
- Test multer validation rules

**Branch Coverage:**
- Test conditional logic (file type detection, error handling)
- Test early returns (404 responses, validation failures)
- Test loops (multiple file processing)

**Line Coverage:**
- Test all code paths in controller
- Test lazy initialization (getMediaService)
- Test error logging

### Test Execution

**Test Configuration:**
- Use Jest as test runner
- Use supertest for HTTP testing
- Mock all external dependencies
- Clear mocks between tests

**Test Isolation:**
- Each test is independent
- No shared state between tests
- Clean up global state after all tests

### Coverage Target

- Minimum 80% line coverage for marketplace.controller.ts
- Minimum 80% branch coverage for marketplace.controller.ts
- All 4 endpoints tested
- All error paths tested

## Test Implementation Plan

### Phase 1: Test Infrastructure

1. Create test file structure
2. Set up module mocks
3. Create test app with supertest
4. Configure global.sharedDbManager mock
5. Set up beforeEach/afterAll hooks

### Phase 2: Test Helpers

1. Create data factory functions
2. Create mock service creators
3. Create test constants
4. Create file generation utilities

### Phase 3: Endpoint Tests

1. POST /api/marketplace/listings
   - Valid listing creation
   - Parameter passing verification
   - Service error handling
   - Response structure validation

2. GET /api/marketplace/listings
   - Active listings retrieval
   - Empty array handling
   - Service error handling
   - Service method invocation

3. GET /api/marketplace/listings/:id
   - Listing found
   - Listing not found (404)
   - Service error handling
   - Parameter passing verification

4. POST /api/marketplace/listings/with-media
   - No files
   - With photo files
   - With video files
   - With PDF files
   - Multiple files
   - File upload failures
   - Listing creation failure
   - Multer validation (file type, size, count)

### Phase 4: Error Consistency Tests

1. Test 400 error format
2. Test 404 error format
3. Test 500 error format
4. Test sensitive information not exposed

### Phase 5: Coverage Verification

1. Run coverage report
2. Identify uncovered lines
3. Add tests for uncovered paths
4. Verify 80%+ coverage achieved
