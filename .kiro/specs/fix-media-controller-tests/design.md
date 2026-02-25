# Media Controller Integration Tests Bugfix Design

## Overview

The media controller integration tests are failing because the test suite creates an Express app with the media controller but does not mock the underlying services (MediaService, StorageService, ValidationService) that the controller depends on. When the controller attempts to call these unmocked services, it results in runtime errors that manifest as 500 Internal Server Error responses instead of the expected status codes (201, 200, 404, 403, 400).

The fix involves adding proper service mocks to the test suite so that the controller can execute its logic and return the correct HTTP status codes based on different scenarios (success, validation errors, authorization errors, not found errors).

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when integration tests run without mocked services, causing 500 errors
- **Property (P)**: The desired behavior when tests run - controllers should return expected HTTP status codes with mocked services
- **Preservation**: Existing controller behavior with real services in production must remain unchanged
- **MediaService**: The service in `src/features/marketplace/media.service.ts` that handles media business logic
- **StorageService**: The service in `src/features/marketplace/storage.service.ts` that handles file storage operations
- **ValidationService**: The service in `src/features/marketplace/validation.service.ts` that validates media files
- **getMediaService()**: The lazy initialization function in the controller that creates MediaService with dependencies
- **Integration Test**: Tests that verify the controller's HTTP request/response handling with mocked dependencies

## Bug Details

### Fault Condition

The bug manifests when integration tests run against the media controller without properly mocked services. The controller's `getMediaService()` function attempts to instantiate MediaService with real StorageService and ValidationService instances, which fail during test execution because they depend on external resources (file system, database) that are not available or properly configured in the test environment.

**Formal Specification:**
```
FUNCTION isBugCondition(testExecution)
  INPUT: testExecution of type TestContext
  OUTPUT: boolean
  
  RETURN testExecution.hasServiceMocks == false
         AND testExecution.controllerCallsService == true
         AND testExecution.serviceThrowsError == true
         AND testExecution.httpStatusCode == 500
END FUNCTION
```

### Examples

- **Upload Test**: POST /api/marketplace/listings/listing-1/media with file → Expected 201, Actual 500 (MediaService.uploadMedia() fails)
- **Validation Test**: POST without file → Expected 400 "No file uploaded", Actual 500 (service instantiation fails before validation)
- **Get Media Test**: GET /api/marketplace/listings/listing-1/media → Expected 200 with array, Actual 500 (MediaService.getListingMedia() fails)
- **Delete Test**: DELETE with non-existent media → Expected 404, Actual 500 (MediaService.deleteMedia() fails)
- **Authorization Test**: DELETE with wrong userId → Expected 403, Actual 500 (service fails before authorization check)
- **Reorder Test**: PUT with invalid mediaOrder format → Expected 400, Actual 500 (service fails before validation)
- **Set Primary Test**: PUT for non-photo media → Expected 400 "Only photos", Actual 500 (service fails before media type check)

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- The media controller must continue to work correctly with real services in production
- Error handling logic in the controller (try-catch blocks, error message mapping) must remain unchanged
- Request validation logic (checking for file presence, mediaType validation, array validation) must remain unchanged
- HTTP status code mapping based on error types must remain unchanged
- Multer configuration and file upload handling must remain unchanged

**Scope:**
All production usage of the media controller with real services should be completely unaffected by this fix. This includes:
- Actual API requests in production or development environments
- Controller logic for handling service responses
- Error propagation from services to HTTP responses
- Request parameter validation

## Hypothesized Root Cause

Based on the bug description and code analysis, the root cause is:

1. **Missing Service Mocks**: The test file does not mock MediaService, StorageService, or ValidationService
   - Tests create a basic Express app with the controller
   - Controller's `getMediaService()` function creates real service instances
   - Real services fail during instantiation or method calls in test environment

2. **Service Instantiation Failures**: When `getMediaService()` runs, it creates:
   - `new StorageService()` - may fail if file system paths don't exist
   - `new ValidationService()` - may fail if dependencies are missing
   - `new MediaService(dbManager, storageService, validationService)` - fails if dbManager is not initialized

3. **Database Manager Not Initialized**: The controller expects `(global as any).sharedDbManager` to be set
   - In production, this is set by app.ts
   - In tests, this global is not initialized
   - `getDbManager()` throws error: "DatabaseManager not initialized"

4. **Uncaught Service Errors**: When services fail, errors are caught by controller's catch blocks
   - Errors don't match specific error message patterns (Unauthorized, not found, etc.)
   - Fall through to generic 500 error response
   - Tests receive 500 instead of expected status codes

## Correctness Properties

Property 1: Fault Condition - Tests Return Expected HTTP Status Codes

_For any_ integration test execution where service mocks are properly configured, the media controller SHALL return the expected HTTP status code (201, 200, 404, 403, 400) based on the test scenario, and the response body SHALL contain the expected success/error messages.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 2.12, 2.13, 2.14**

Property 2: Preservation - Production Controller Behavior

_For any_ production request where real services are used (not mocked), the media controller SHALL produce exactly the same behavior as before the fix, preserving all error handling, validation logic, and HTTP status code mapping.

**Validates: Requirements 3.1, 3.2, 3.3**

## Fix Implementation

### Changes Required

**File**: `src/features/marketplace/__tests__/media.controller.test.ts`

**Specific Changes**:

1. **Add Service Mocks at Top of Test File**:
   - Mock MediaService with jest.mock()
   - Mock StorageService with jest.mock()
   - Mock ValidationService with jest.mock()
   - Mock DatabaseManager and set global.sharedDbManager

2. **Create Mock Implementations Before Tests**:
   - Create mockMediaService with methods: uploadMedia, getListingMedia, deleteMedia, reorderMedia, setPrimaryMedia
   - Create mockStorageService (may not need methods if MediaService is mocked)
   - Create mockValidationService (may not need methods if MediaService is mocked)
   - Configure mocks to return appropriate responses for each test scenario

3. **Configure Mock Behavior in Each Test**:
   - Use `mockMediaService.uploadMedia.mockResolvedValue()` to return success/error responses
   - Use `mockMediaService.deleteMedia.mockResolvedValue()` or `mockRejectedValue()` for different scenarios
   - Configure mocks to throw errors with specific messages for authorization/not found cases
   - Reset mocks between tests using `beforeEach(() => jest.clearAllMocks())`

4. **Mock Database Manager**:
   - Create mockDbManager with necessary methods
   - Set `(global as any).sharedDbManager = mockDbManager` in beforeAll
   - Clean up in afterAll

5. **Ensure Mocks Match Expected Behavior**:
   - Success cases: Return `{ success: true, mediaId: 'mock-id' }` or similar
   - Validation errors: Return `{ success: false, error: 'error message' }`
   - Authorization errors: Throw error with message containing "Unauthorized"
   - Not found errors: Throw error with message containing "not found"
   - Media type errors: Throw error with message containing "Only photos"

### Implementation Strategy

The fix will use Jest's mocking capabilities to intercept service instantiation and method calls:

```typescript
// Mock the service modules
jest.mock('../media.service');
jest.mock('../storage.service');
jest.mock('../validation.service');

// Create mock instances
const mockMediaService = {
  uploadMedia: jest.fn(),
  getListingMedia: jest.fn(),
  deleteMedia: jest.fn(),
  reorderMedia: jest.fn(),
  setPrimaryMedia: jest.fn()
};

// Configure MediaService constructor to return mock
(MediaService as jest.Mock).mockImplementation(() => mockMediaService);
```

Then in each test, configure the mock behavior:

```typescript
it('should upload a photo successfully', async () => {
  mockMediaService.uploadMedia.mockResolvedValue({
    success: true,
    mediaId: 'mock-media-id'
  });
  
  const response = await request(app)
    .post('/api/marketplace/listings/listing-1/media')
    .field('mediaType', 'photo')
    .attach('file', Buffer.from('fake-image-data'), 'test.jpg')
    .expect(201);
    
  expect(response.body.success).toBe(true);
  expect(response.body.mediaId).toBeDefined();
});
```

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, run tests on the UNFIXED code to confirm they fail with 500 errors, then add service mocks and verify tests pass with expected status codes.

### Exploratory Fault Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm that tests fail with 500 errors when services are not mocked.

**Test Plan**: Run the existing test suite without any modifications. Observe that all 14 tests fail with 500 status codes instead of expected codes. Document the specific failures to confirm the root cause.

**Test Cases**:
1. **Upload Success Test**: Run "should upload a photo successfully" → Fails with 500 instead of 201
2. **Upload Validation Test**: Run "should reject upload without file" → Fails with 500 instead of 400
3. **Get Media Test**: Run "should get all media for a listing" → Fails with 500 instead of 200
4. **Delete Not Found Test**: Run "should return 404 for non-existent media" → Fails with 500 instead of 404
5. **Delete Unauthorized Test**: Run "should return 403 for unauthorized deletion" → Fails with 500 instead of 403
6. **Reorder Validation Test**: Run "should reject invalid mediaOrder format" → Fails with 500 instead of 400
7. **Set Primary Not Found Test**: Run "should return 404 for non-existent media" → Fails with 500 instead of 404
8. **Set Primary Media Type Test**: Run "should return 400 for non-photo media" → Fails with 500 instead of 400

**Expected Counterexamples**:
- All tests return 500 status code
- Response bodies contain generic error messages like "Failed to upload media" or "Failed to delete media"
- Console logs show errors related to service instantiation or method calls
- Possible error messages: "DatabaseManager not initialized", "Cannot read property of undefined", service method failures

### Fix Checking

**Goal**: Verify that for all test cases where service mocks are configured, the controller returns the expected HTTP status codes and response bodies.

**Pseudocode:**
```
FOR ALL testCase IN integrationTests DO
  configureMocks(testCase.expectedBehavior)
  response := executeHttpRequest(testCase.request)
  ASSERT response.statusCode == testCase.expectedStatusCode
  ASSERT response.body.success == testCase.expectedSuccess
  ASSERT response.body.error CONTAINS testCase.expectedErrorMessage (if error)
END FOR
```

**Test Plan**: After adding service mocks, run all 14 tests and verify they pass with expected status codes.

**Test Cases**:
1. **Upload Success**: Mock uploadMedia to return success → Expect 201
2. **Upload No File**: Controller validation catches this → Expect 400
3. **Upload Invalid Type**: Controller validation catches this → Expect 400
4. **Get Media Success**: Mock getListingMedia to return array → Expect 200
5. **Get Media Empty**: Mock getListingMedia to return empty array → Expect 200
6. **Delete Success**: Mock deleteMedia to return true → Expect 200
7. **Delete Not Found**: Mock deleteMedia to throw "not found" error → Expect 404
8. **Delete Unauthorized**: Mock deleteMedia to throw "Unauthorized" error → Expect 403
9. **Reorder Success**: Mock reorderMedia to return true → Expect 200
10. **Reorder Invalid Format**: Controller validation catches this → Expect 400
11. **Reorder Unauthorized**: Mock reorderMedia to throw "Unauthorized" error → Expect 403
12. **Set Primary Success**: Mock setPrimaryMedia to return true → Expect 200
13. **Set Primary Not Found**: Mock setPrimaryMedia to throw "not found" error → Expect 404
14. **Set Primary Non-Photo**: Mock setPrimaryMedia to throw "Only photos" error → Expect 400

### Preservation Checking

**Goal**: Verify that the controller's behavior with real services in production remains unchanged after adding test mocks.

**Pseudocode:**
```
FOR ALL productionRequest WHERE usesRealServices(productionRequest) DO
  ASSERT controllerBehavior_original(productionRequest) == controllerBehavior_fixed(productionRequest)
END FOR
```

**Testing Approach**: Since we're only modifying the test file and not the controller itself, preservation is automatically guaranteed. However, we should verify:
- Controller code remains unchanged
- Service instantiation logic remains unchanged
- Error handling logic remains unchanged
- HTTP status code mapping remains unchanged

**Test Plan**: Review the fix to ensure no controller code is modified. Only the test file should change.

**Verification Steps**:
1. **No Controller Changes**: Verify that `media.controller.ts` is not modified
2. **Service Mocks Only in Tests**: Verify that mocks are only created in test file using jest.mock()
3. **Mock Isolation**: Verify that mocks don't affect other test files or production code
4. **Error Handling Preserved**: Verify that controller's try-catch blocks and error message checks remain unchanged

### Unit Tests

The existing integration tests will serve as unit tests once mocks are added:
- Test each endpoint with success scenarios
- Test validation errors (400 responses)
- Test authorization errors (403 responses)
- Test not found errors (404 responses)
- Test edge cases (invalid formats, missing parameters)

### Property-Based Tests

Property-based testing is not applicable for this bugfix because:
- The bug is in the test setup, not the controller logic
- Integration tests already cover the input domain (different HTTP requests)
- Mocking services provides deterministic behavior for testing

### Integration Tests

The existing test suite IS the integration test suite. After adding mocks:
- Tests verify controller correctly handles HTTP requests
- Tests verify controller correctly calls service methods
- Tests verify controller correctly maps service responses to HTTP status codes
- Tests verify controller correctly handles service errors
