# Requirements Document

## Introduction

This document specifies the requirements for comprehensive unit tests for the marketplace controller. The marketplace controller handles listing CRUD operations through 4 main endpoints. The tests must achieve 80%+ code coverage while following established patterns from auth.controller.test.ts and media.controller.test.ts, using complete service mocking for fast, isolated tests.

## Glossary

- **Marketplace_Controller**: The Express router that handles HTTP requests for marketplace listing operations
- **Marketplace_Service**: The business logic service that manages listing data operations
- **Media_Service**: The service that handles media file uploads and management
- **Test_Suite**: The complete set of unit tests for the marketplace controller
- **Service_Mock**: A Jest mock that simulates service behavior without real implementation
- **Test_App**: An Express application instance configured for testing with supertest
- **Coverage_Target**: The minimum 80% code coverage requirement for marketplace.controller.ts

## Requirements

### Requirement 1: Test Infrastructure Setup

**User Story:** As a developer, I want a properly configured test infrastructure, so that I can run isolated, fast unit tests for the marketplace controller.

#### Acceptance Criteria

1. THE Test_Suite SHALL import and configure supertest with an Express test application
2. THE Test_Suite SHALL mock the marketplaceService module using Jest mocks
3. THE Test_Suite SHALL mock the MediaService module using Jest mocks
4. THE Test_Suite SHALL create a mock DatabaseManager and assign it to global.sharedDbManager
5. THE Test_Suite SHALL clear all mocks before each test using beforeEach
6. THE Test_Suite SHALL clean up global.sharedDbManager after all tests using afterAll
7. THE Test_Suite SHALL mount the marketplaceController on the test Express application

### Requirement 2: Test POST /api/marketplace/listings Endpoint

**User Story:** As a developer, I want comprehensive tests for the create listing endpoint, so that I can verify it handles all success and error cases correctly.

#### Acceptance Criteria

1. WHEN valid listing data is provided, THE Test_Suite SHALL verify the endpoint returns 201 status with the created listing
2. WHEN the marketplaceService.createListing is called, THE Test_Suite SHALL verify it receives the correct parameters (farmerId, produceType, quantity, pricePerKg, certificateId)
3. WHEN required fields are missing, THE Test_Suite SHALL verify the endpoint returns 400 status
4. WHEN the service throws an error, THE Test_Suite SHALL verify the endpoint returns 500 status with error message
5. THE Test_Suite SHALL verify the response body contains the listing object with all expected fields

### Requirement 3: Test GET /api/marketplace/listings Endpoint

**User Story:** As a developer, I want comprehensive tests for the get all listings endpoint, so that I can verify it retrieves active listings correctly.

#### Acceptance Criteria

1. WHEN active listings exist, THE Test_Suite SHALL verify the endpoint returns 200 status with an array of listings
2. WHEN no listings exist, THE Test_Suite SHALL verify the endpoint returns 200 status with an empty array
3. WHEN the service throws an error, THE Test_Suite SHALL verify the endpoint returns 500 status with error message
4. THE Test_Suite SHALL verify the marketplaceService.getActiveListings is called exactly once
5. THE Test_Suite SHALL verify the response body contains the listings array

### Requirement 4: Test GET /api/marketplace/listings/:id Endpoint

**User Story:** As a developer, I want comprehensive tests for the get listing by ID endpoint, so that I can verify it handles found and not found cases correctly.

#### Acceptance Criteria

1. WHEN a listing with the given ID exists, THE Test_Suite SHALL verify the endpoint returns 200 status with the listing object
2. WHEN no listing with the given ID exists, THE Test_Suite SHALL verify the endpoint returns 404 status with error message
3. WHEN the service throws an error, THE Test_Suite SHALL verify the endpoint returns 500 status with error message
4. THE Test_Suite SHALL verify the marketplaceService.getListing is called with the correct listing ID
5. THE Test_Suite SHALL verify the 404 error message is "Listing not found"

### Requirement 5: Test POST /api/marketplace/listings/with-media Endpoint - Success Cases

**User Story:** As a developer, I want comprehensive tests for the create listing with media endpoint success scenarios, so that I can verify atomic listing and media creation works correctly.

#### Acceptance Criteria

1. WHEN valid listing data is provided without files, THE Test_Suite SHALL verify the endpoint returns 201 status with listing and empty media results
2. WHEN valid listing data is provided with photo files, THE Test_Suite SHALL verify the endpoint returns 201 status with listing and successful media results
3. WHEN valid listing data is provided with video files, THE Test_Suite SHALL verify the endpoint auto-detects video media type from MIME type
4. WHEN valid listing data is provided with PDF files, THE Test_Suite SHALL verify the endpoint auto-detects document media type from MIME type
5. WHEN multiple valid files are provided, THE Test_Suite SHALL verify the endpoint processes all files and returns results for each
6. THE Test_Suite SHALL verify the response contains media.total, media.successful, media.failed counts
7. THE Test_Suite SHALL verify the marketplaceService.createListing is called before MediaService.uploadMedia

### Requirement 6: Test POST /api/marketplace/listings/with-media Endpoint - Error Cases

**User Story:** As a developer, I want comprehensive tests for the create listing with media endpoint error scenarios, so that I can verify proper error handling for file uploads.

#### Acceptance Criteria

1. WHEN listing creation fails, THE Test_Suite SHALL verify the endpoint returns 500 status with error details
2. WHEN a file upload fails, THE Test_Suite SHALL verify the endpoint includes the failure in media results but still returns 201
3. WHEN multiple files are uploaded and some fail, THE Test_Suite SHALL verify the endpoint returns correct success and fail counts
4. WHEN an invalid file type is provided, THE Test_Suite SHALL verify multer rejects the request with 400 status
5. WHEN file size exceeds 50MB limit, THE Test_Suite SHALL verify multer rejects the request with 400 status
6. WHEN more than 10 files are uploaded, THE Test_Suite SHALL verify multer rejects the request with 400 status
7. THE Test_Suite SHALL verify error responses contain error and details fields

### Requirement 7: Test Multer File Validation

**User Story:** As a developer, I want tests for multer file validation, so that I can verify only allowed file types are accepted.

#### Acceptance Criteria

1. WHEN a JPEG image is uploaded, THE Test_Suite SHALL verify multer accepts the file
2. WHEN a JPG image is uploaded, THE Test_Suite SHALL verify multer accepts the file
3. WHEN a PNG image is uploaded, THE Test_Suite SHALL verify multer accepts the file
4. WHEN a WebP image is uploaded, THE Test_Suite SHALL verify multer accepts the file
5. WHEN an MP4 video is uploaded, THE Test_Suite SHALL verify multer accepts the file
6. WHEN a QuickTime video is uploaded, THE Test_Suite SHALL verify multer accepts the file
7. WHEN a PDF document is uploaded, THE Test_Suite SHALL verify multer accepts the file
8. WHEN a text file is uploaded, THE Test_Suite SHALL verify multer rejects the file with error message
9. WHEN an executable file is uploaded, THE Test_Suite SHALL verify multer rejects the file with error message

### Requirement 8: Test Service Mock Isolation

**User Story:** As a developer, I want complete service mocking, so that tests run fast without real database or storage operations.

#### Acceptance Criteria

1. THE Test_Suite SHALL mock marketplaceService.createListing with jest.fn()
2. THE Test_Suite SHALL mock marketplaceService.getActiveListings with jest.fn()
3. THE Test_Suite SHALL mock marketplaceService.getListing with jest.fn()
4. THE Test_Suite SHALL mock MediaService constructor to return a mock instance
5. THE Test_Suite SHALL mock MediaService.uploadMedia with jest.fn()
6. THE Test_Suite SHALL configure mock return values using mockResolvedValue for async operations
7. THE Test_Suite SHALL verify no real database or storage operations occur during tests

### Requirement 9: Test Helper Functions and Data Factories

**User Story:** As a developer, I want reusable test helpers and data factories, so that I can create test data consistently and reduce duplication.

#### Acceptance Criteria

1. THE Test_Suite SHALL create a factory function for generating valid listing objects
2. THE Test_Suite SHALL create a factory function for generating listing request data
3. THE Test_Suite SHALL create a factory function for generating media upload results
4. THE Test_Suite SHALL create constants for test listing IDs, farmer IDs, and produce types
5. THE Test_Suite SHALL reuse factory functions across multiple test cases
6. THE Test_Suite SHALL allow factory functions to accept partial overrides for customization

### Requirement 10: Test Error Response Consistency

**User Story:** As a developer, I want tests that verify consistent error response formats, so that API consumers receive predictable error structures.

#### Acceptance Criteria

1. WHEN a 400 error occurs, THE Test_Suite SHALL verify the response contains an error field with string message
2. WHEN a 404 error occurs, THE Test_Suite SHALL verify the response contains an error field with "not found" message
3. WHEN a 500 error occurs, THE Test_Suite SHALL verify the response contains an error field with "Failed to" message
4. THE Test_Suite SHALL verify 500 errors do not expose sensitive internal details
5. THE Test_Suite SHALL verify all error responses use consistent JSON structure

### Requirement 11: Achieve Coverage Target

**User Story:** As a developer, I want to achieve 80%+ code coverage for marketplace.controller.ts, so that I have confidence in the controller's reliability.

#### Acceptance Criteria

1. THE Test_Suite SHALL test all 4 endpoint handlers (POST /listings, POST /listings/with-media, GET /listings, GET /listings/:id)
2. THE Test_Suite SHALL test all success paths for each endpoint
3. THE Test_Suite SHALL test all error paths for each endpoint
4. THE Test_Suite SHALL test all multer validation rules
5. THE Test_Suite SHALL test the getMediaService lazy initialization function
6. THE Test_Suite SHALL achieve minimum 80% line coverage for marketplace.controller.ts
7. THE Test_Suite SHALL achieve minimum 80% branch coverage for marketplace.controller.ts
