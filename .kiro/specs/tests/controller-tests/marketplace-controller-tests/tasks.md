# Implementation Plan: Marketplace Controller Integration Tests

## Overview

This implementation plan breaks down the creation of a comprehensive integration test suite for the Marketplace Controller. The test suite will achieve 80%+ coverage through systematic testing of all 4 marketplace endpoints, including success cases, error cases, multer validation, and error consistency tests. The implementation uses Jest, Supertest, and follows the project's established testing patterns from auth.controller.test.ts.

## Tasks

- [x] 1. Set up test infrastructure and helpers
  - [x] 1.1 Create test file structure and module mocks
    - Create `src/features/marketplace/__tests__/marketplace.controller.test.ts`
    - Set up jest.mock() for marketplaceService module
    - Set up jest.mock() for MediaService module
    - Configure Express test app with supertest
    - Mount marketplaceController on test app
    - _Requirements: 1.1, 1.7_

  - [x] 1.2 Create mock DatabaseManager and global setup
    - Create mock DatabaseManager with required methods
    - Assign mock to global.sharedDbManager
    - Set up beforeEach hook to clear all mocks
    - Set up afterAll hook to clean up global.sharedDbManager
    - _Requirements: 1.4, 1.5, 1.6_

  - [x] 1.3 Create test data factories and constants
    - Create createTestListing factory function with partial overrides support
    - Create createTestListingRequest factory function
    - Create createTestMediaResult factory function
    - Create createTestFile factory function for mock file objects
    - Define TEST_LISTING_IDS, TEST_FARMER_IDS, TEST_PRODUCE_TYPES constants
    - Define ALLOWED_MIME_TYPES and INVALID_MIME_TYPES constants
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

  - [x] 1.4 Create mock service configuration helpers
    - Create createMockMarketplaceService function
    - Create createMockMediaService function
    - Configure mock return values using mockResolvedValue
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

- [x] 2. Implement POST /api/marketplace/listings endpoint tests
  - [x] 2.1 Write success case tests for create listing
    - Test valid listing data returns 201 status with created listing
    - Test response body contains all expected listing fields (id, farmerId, produceType, quantity, pricePerKg, certificateId)
    - Verify marketplaceService.createListing called with correct parameters
    - Verify service receives farmerId, produceType, quantity, pricePerKg, certificateId
    - _Requirements: 2.1, 2.2, 2.5_

  - [x] 2.2 Write error case tests for create listing
    - Test missing required fields returns 400 status
    - Test service error returns 500 status with error message
    - Test error response contains error field
    - Verify error message does not expose sensitive details
    - _Requirements: 2.3, 2.4, 10.1, 10.4_

- [x] 3. Implement GET /api/marketplace/listings endpoint tests
  - [x] 3.1 Write success case tests for get all listings
    - Test active listings exist returns 200 status with array of listings
    - Test no listings exist returns 200 status with empty array
    - Test response body contains listings array
    - Verify marketplaceService.getActiveListings called exactly once
    - _Requirements: 3.1, 3.2, 3.4, 3.5_

  - [x] 3.2 Write error case tests for get all listings
    - Test service error returns 500 status with error message
    - Test error response contains error field
    - _Requirements: 3.3, 10.3_

- [x] 4. Implement GET /api/marketplace/listings/:id endpoint tests
  - [x] 4.1 Write success case tests for get listing by ID
    - Test existing listing ID returns 200 status with listing object
    - Test response body contains the listing with all fields
    - Verify marketplaceService.getListing called with correct listing ID
    - _Requirements: 4.1, 4.4_

  - [x] 4.2 Write error case tests for get listing by ID
    - Test non-existent listing ID returns 404 status with "Listing not found" message
    - Test service error returns 500 status with error message
    - Test 404 error response contains error field
    - _Requirements: 4.2, 4.3, 4.5, 10.2_

- [x] 5. Checkpoint - Ensure basic endpoint tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement POST /api/marketplace/listings/with-media endpoint - Success cases
  - [x] 6.1 Write test for listing creation without files
    - Test valid listing data without files returns 201 status
    - Test response contains listing object
    - Test response contains media.total = 0, media.successful = 0, media.failed = 0
    - Test response contains empty media.results array
    - Verify marketplaceService.createListing called before MediaService.uploadMedia
    - _Requirements: 5.1, 5.6, 5.7_

  - [x] 6.2 Write test for listing creation with photo files
    - Test valid listing data with JPEG files returns 201 status
    - Test valid listing data with PNG files returns 201 status
    - Test response contains listing and successful media results
    - Test media results include fileName, success, mediaId for each file
    - Verify MediaService.uploadMedia called for each file
    - _Requirements: 5.2, 5.6_

  - [x] 6.3 Write test for video media type auto-detection
    - Test file with video/mp4 MIME type auto-detects as 'video' media type
    - Test file with video/quicktime MIME type auto-detects as 'video' media type
    - Verify MediaService.uploadMedia called with correct media type parameter
    - _Requirements: 5.3_

  - [x] 6.4 Write test for document media type auto-detection
    - Test file with application/pdf MIME type auto-detects as 'document' media type
    - Verify MediaService.uploadMedia called with correct media type parameter
    - _Requirements: 5.4_

  - [x] 6.5 Write test for multiple file processing
    - Test multiple valid files (up to 10) are all processed
    - Test response contains results for each file
    - Test media.total equals number of files uploaded
    - Verify MediaService.uploadMedia called once per file
    - _Requirements: 5.5, 5.6_

- [x] 7. Implement POST /api/marketplace/listings/with-media endpoint - Error cases
  - [x] 7.1 Write test for listing creation failure
    - Test marketplaceService.createListing throws error returns 500 status
    - Test error response contains error and details fields
    - Test error message does not expose sensitive information
    - _Requirements: 6.1, 6.7, 10.4_

  - [x] 7.2 Write test for partial file upload failures
    - Test one file upload fails but listing creation succeeds returns 201 status
    - Test failed file included in media.results with success: false and error message
    - Test media.failed count incremented for failed upload
    - Test media.successful count reflects only successful uploads
    - _Requirements: 6.2, 6.3, 5.6_

  - [x] 7.3 Write test for multiple file upload failures
    - Test multiple files fail with different errors
    - Test response contains correct media.total, media.successful, media.failed counts
    - Test each failed file has error message in results
    - _Requirements: 6.3, 5.6_

- [x] 8. Implement multer file validation tests
  - [x] 8.1 Write tests for allowed file types
    - Test JPEG image (image/jpeg) is accepted by multer
    - Test JPG image (image/jpg) is accepted by multer
    - Test PNG image (image/png) is accepted by multer
    - Test WebP image (image/webp) is accepted by multer
    - Test MP4 video (video/mp4) is accepted by multer
    - Test QuickTime video (video/quicktime) is accepted by multer
    - Test PDF document (application/pdf) is accepted by multer
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

  - [x] 8.2 Write tests for rejected file types
    - Test text file (text/plain) is rejected with 400 status and error message
    - Test executable file (application/x-msdownload) is rejected with 400 status
    - Test error message indicates invalid file type
    - _Requirements: 6.4, 7.8, 7.9_

  - [x] 8.3 Write tests for file size and count limits
    - Test file size exceeding 50MB is rejected with 400 status
    - Test more than 10 files uploaded is rejected with 400 status
    - Test error messages indicate size or count limit exceeded
    - _Requirements: 6.5, 6.6_

- [x] 9. Checkpoint - Ensure all with-media tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Implement error response consistency tests
  - [x] 10.1 Write tests for error response format consistency
    - Test all 400 errors contain error field with string message
    - Test all 404 errors contain error field with "not found" message
    - Test all 500 errors contain error field with "Failed to" message
    - Test all error responses use consistent JSON structure
    - Test 500 errors do not expose sensitive internal details (stack traces, database details)
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ]* 11. Implement property-based tests
  - [ ]* 11.1 Create property-based test file structure
    - Create `src/features/marketplace/__tests__/marketplace.controller.pbt.test.ts`
    - Set up fast-check imports and test structure
    - Configure numRuns to 100 for all properties
    - _Requirements: 11.1_

  - [ ]* 11.2 Write property test for service error handling
    - **Property 1: Service Error Handling**
    - **Validates: Requirements 2.4, 3.3, 4.3, 10.4**
    - Test any endpoint with any service error returns 500 status without sensitive details
    - _Requirements: 2.4, 3.3, 4.3, 10.4_

  - [ ]* 11.3 Write property test for video media type detection
    - **Property 3: Video Media Type Detection**
    - **Validates: Requirements 5.3**
    - Test any file with video MIME type auto-detects as 'video' media type
    - _Requirements: 5.3_

  - [ ]* 11.4 Write property test for multiple file processing
    - **Property 4: Multiple File Processing**
    - **Validates: Requirements 5.5**
    - Test any set of valid files up to 10 are all processed and return results
    - _Requirements: 5.5_

  - [ ]* 11.5 Write property test for partial upload failure handling
    - **Property 5: Partial Upload Failure Handling**
    - **Validates: Requirements 6.2**
    - Test any file upload failure includes failure in results but returns 201 status
    - _Requirements: 6.2_

  - [ ]* 11.6 Write property test for success and failure counting
    - **Property 6: Success and Failure Counting**
    - **Validates: Requirements 6.3**
    - Test any combination of successful and failed uploads returns correct counts
    - _Requirements: 6.3_

  - [ ]* 11.7 Write property test for invalid file type rejection
    - **Property 7: Invalid File Type Rejection**
    - **Validates: Requirements 6.4**
    - Test any file with MIME type not in allowed list is rejected with 400 status
    - _Requirements: 6.4_

  - [ ]* 11.8 Write property test for error response structure
    - **Property 8: Error Response Structure**
    - **Validates: Requirements 6.7, 10.1, 10.2, 10.3, 10.5**
    - Test any error response contains error field and uses consistent JSON structure
    - _Requirements: 6.7, 10.1, 10.2, 10.3, 10.5_

- [x] 12. Verify test coverage and generate coverage report
  - [x] 12.1 Run tests with coverage and verify thresholds
    - Run `npm test -- marketplace.controller --coverage`
    - Verify marketplace.controller.ts achieves at least 80% line coverage
    - Verify marketplace.controller.ts achieves at least 80% branch coverage
    - Identify any uncovered code paths
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_

  - [x] 12.2 Add tests for uncovered code paths if needed
    - Review coverage report for gaps
    - Add tests for uncovered branches
    - Add tests for uncovered error paths
    - Add tests for getMediaService lazy initialization
    - _Requirements: 11.5_

- [x] 13. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Integration tests validate HTTP endpoint behavior with mocked services
- All tests use mocked marketplace and media services for complete isolation
- Test suite targets 80%+ line coverage and 80%+ branch coverage
- Follow patterns from auth.controller.test.ts for consistency
