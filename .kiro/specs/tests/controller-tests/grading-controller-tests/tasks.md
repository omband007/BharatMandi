# Implementation Plan: Grading Controller Integration Tests

## Overview

This implementation plan breaks down the creation of a comprehensive integration test suite for the Grading Controller. The test suite will achieve 80%+ coverage through systematic testing of both grading endpoints (with-image and legacy base64), including success cases, error cases, multer validation, and error consistency tests. The implementation uses Jest, Supertest, and follows the project's established testing patterns from marketplace.controller.test.ts and transaction.controller.test.ts.

## Tasks

- [ ] 1. Set up test infrastructure and helpers
  - [ ] 1.1 Create test file structure and module mocks
    - Create `src/features/grading/__tests__/grading.controller.test.ts`
    - Set up jest.mock() for grading.service module
    - Configure Express test app with supertest
    - Mount gradingController on test app
    - _Requirements: 1.1, 1.2, 1.4_

  - [ ] 1.2 Create mock DatabaseManager and global setup
    - Create mock DatabaseManager with required methods
    - Assign mock to global.sharedDbManager
    - Set up beforeEach hook to clear all mocks
    - Set up afterAll hook to clean up global.sharedDbManager
    - _Requirements: 1.3, 1.5_

  - [ ] 1.3 Create test data factories and constants
    - Create createTestGradingResult factory function with partial overrides support
    - Create createTestCertificate factory function
    - Create createTestAnalysis factory function
    - Create createTestFile factory function for mock file objects
    - Create createTestGradeRequest factory function for legacy endpoint
    - Define TEST_FARMER_IDS, TEST_PRODUCE_TYPES, TEST_GRADES constants
    - Define TEST_LOCATIONS constant with sample lat/lng coordinates
    - Define ALLOWED_IMAGE_TYPES constant (image/jpeg, image/jpg, image/png, image/webp, image/gif)
    - Define INVALID_FILE_TYPES constant (text/plain, application/x-msdownload, application/pdf, video/mp4)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [ ] 1.4 Create mock service configuration helpers
    - Create createMockGradingService function
    - Configure mock return values using mockResolvedValue for gradeProduceImage
    - Configure mock return values using mockReturnValue for generateCertificate
    - _Requirements: 2.1_

  - [ ] 1.5 Add placeholder test to verify infrastructure
    - Write simple test to verify test app is configured correctly
    - _Requirements: 1.6_

- [ ] 2. Implement POST /api/grading/grade-with-image endpoint - Success cases
  - [ ] 2.1 Write test for valid image upload with all required fields
    - Test valid image file with farmerId, lat, lng returns 201 status
    - Test response body contains gradingResult, certificate, and analysis objects
    - Test response contains all expected fields in each object
    - _Requirements: 3.1, 3.9_

  - [ ] 2.2 Write test for service method call verification
    - Test gradingService.gradeProduceImage called exactly once
    - Test gradeProduceImage called with correct image buffer parameter
    - Test gradeProduceImage called with correct location object (lat, lng)
    - Test gradingService.generateCertificate called exactly once
    - Test generateCertificate called with correct farmerId, produceType, gradingResult, imageBuffer, detectedCrop
    - _Requirements: 3.2, 3.3, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9_

  - [ ] 2.3 Write test for lat/lng parsing as floating point numbers
    - Test lat and lng form fields parsed as floats
    - Test parsed values passed correctly to grading service
    - _Requirements: 3.8_

  - [ ] 2.4 Write test for auto-detect enabled with detected crop
    - Test when auto-detect is enabled and crop is detected
    - Test detected crop type used for certificate generation
    - Verify generateCertificate called with detectedCrop parameter
    - _Requirements: 3.4_

  - [ ] 2.5 Write test for auto-detect disabled with provided produceType
    - Test when auto-detect is disabled
    - Test provided produceType used for certificate generation
    - _Requirements: 3.5_

  - [ ] 2.6 Write test for produceType not provided with auto-detect enabled
    - Test when produceType not provided and auto-detect enabled
    - Test detected crop type used for certificate generation
    - _Requirements: 3.6_

  - [ ] 2.7 Write test for produceType not provided with no crop detected
    - Test when produceType not provided and no crop detected
    - Test 'unknown' used as produce type for certificate generation
    - _Requirements: 3.7_

- [ ] 3. Implement POST /api/grading/grade-with-image endpoint - Error cases
  - [ ] 3.1 Write test for missing image file
    - Test no image file uploaded returns 400 status
    - Test error message is "No image file uploaded"
    - Test error response contains error field
    - _Requirements: 4.1_

  - [ ] 3.2 Write test for missing required fields
    - Test missing farmerId returns 400 status with error message
    - Test missing lat returns 400 status with error message
    - Test missing lng returns 400 status with error message
    - Test error message indicates missing required fields
    - _Requirements: 4.2, 4.3, 4.4_

  - [ ] 3.3 Write test for service errors
    - Test gradingService.gradeProduceImage throws error returns 500 status
    - Test gradingService.generateCertificate throws error returns 500 status
    - Test error message is "Failed to grade image"
    - Test error response does not expose sensitive information
    - Test error response does not expose stack traces
    - _Requirements: 4.5, 4.6, 4.7, 4.8_

- [ ] 4. Checkpoint - Ensure with-image endpoint tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Implement multer file type validation tests
  - [ ] 5.1 Write tests for allowed image file types
    - Test JPEG image (image/jpeg) is accepted by multer
    - Test JPG image (image/jpg) is accepted by multer
    - Test PNG image (image/png) is accepted by multer
    - Test WebP image (image/webp) is accepted by multer
    - Test GIF image (image/gif) is accepted by multer
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ] 5.2 Write tests for rejected non-image file types
    - Test text file (text/plain) is rejected with 400 status
    - Test executable file (application/x-msdownload) is rejected with 400 status
    - Test PDF file (application/pdf) is rejected with 400 status
    - Test video file (video/mp4) is rejected with 400 status
    - Test error message is "Only image files are allowed"
    - _Requirements: 5.6, 5.7, 5.8, 5.9, 5.10_

- [ ] 6. Implement multer file size validation tests
  - [ ] 6.1 Write tests for file size limits
    - Test file under 10MB is accepted by multer
    - Test file exactly 10MB is accepted by multer
    - Test file exceeding 10MB is rejected with 400 status
    - Test error message indicates size limit exceeded
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 7. Implement POST /api/grading/grade endpoint (Legacy) - Success cases
  - [ ] 7.1 Write test for valid base64 image with all required fields
    - Test valid base64 image with farmerId, produceType, imageData, location returns 200 status
    - Test response body contains gradingResult, certificate, and analysis objects
    - Test response contains all expected fields in each object
    - _Requirements: 7.1, 7.6_

  - [ ] 7.2 Write test for base64 with data URI prefix
    - Test base64 image with data URI prefix (data:image/jpeg;base64,) is decoded correctly
    - Test prefix is stripped before decoding
    - _Requirements: 7.2_

  - [ ] 7.3 Write test for base64 without data URI prefix
    - Test base64 image without data URI prefix is decoded correctly
    - _Requirements: 7.3_

  - [ ] 7.4 Write test for service method call verification
    - Test gradingService.gradeProduceImage called with correct buffer
    - Test gradingService.generateCertificate called with correct parameters
    - _Requirements: 7.4, 7.5_

- [ ] 8. Implement POST /api/grading/grade endpoint (Legacy) - Error cases
  - [ ] 8.1 Write test for missing required fields
    - Test missing farmerId returns 400 status with error message "Missing required fields"
    - Test missing produceType returns 400 status with error message "Missing required fields"
    - Test missing imageData returns 400 status with error message "Missing required fields"
    - Test missing location returns 400 status with error message "Missing required fields"
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [ ] 8.2 Write test for service errors
    - Test gradingService.gradeProduceImage throws error returns 500 status
    - Test gradingService.generateCertificate throws error returns 500 status
    - Test error message is "Failed to grade image"
    - Test error response does not expose sensitive information
    - Test error response does not expose stack traces
    - _Requirements: 8.5, 8.6, 8.7, 8.8_

- [ ] 9. Checkpoint - Ensure legacy endpoint tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Implement error response consistency tests
  - [ ] 10.1 Write tests for error response format consistency
    - Test all 400 errors contain error field with string message
    - Test all 500 errors contain error field with string message
    - Test 500 errors use "Failed to grade image" message for both endpoints
    - Test all error responses use consistent JSON structure
    - Test 500 errors do not expose stack traces
    - Test 500 errors do not expose internal file paths
    - Test 500 errors do not expose database connection details
    - Test all error messages are user-friendly and non-technical
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9_

- [ ]* 11. Implement property-based tests
  - [ ]* 11.1 Create property-based test file structure
    - Create `src/features/grading/__tests__/grading.controller.pbt.test.ts`
    - Set up fast-check imports and test structure
    - Configure numRuns to 100 for all properties
    - _Requirements: 12.1_

  - [ ]* 11.2 Write property test for service delegation for image grading
    - **Property 1: Service Delegation for Image Grading**
    - **Validates: Requirements 3.2, 7.4, 9.1, 9.2, 9.3**
    - Test any valid image upload request calls gradingService.gradeProduceImage exactly once with correct parameters
    - _Requirements: 3.2, 7.4, 9.1, 9.2, 9.3_

  - [ ]* 11.3 Write property test for service delegation for certificate generation
    - **Property 2: Service Delegation for Certificate Generation**
    - **Validates: Requirements 3.3, 7.5, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9**
    - Test any successful grading operation calls gradingService.generateCertificate exactly once with correct parameters
    - _Requirements: 3.3, 7.5, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9_

  - [ ]* 11.4 Write property test for location parsing
    - **Property 3: Location Parsing**
    - **Validates: Requirements 3.8**
    - Test any valid lat and lng form field values are parsed as floating point numbers
    - _Requirements: 3.8_

  - [ ]* 11.5 Write property test for response structure consistency
    - **Property 4: Response Structure Consistency**
    - **Validates: Requirements 3.9, 7.6**
    - Test any successful grading request returns response with gradingResult, certificate, and analysis fields
    - _Requirements: 3.9, 7.6_

  - [ ]* 11.6 Write property test for service error handling
    - **Property 5: Service Error Handling**
    - **Validates: Requirements 4.5, 4.6, 4.7, 4.8, 8.5, 8.6, 8.7, 8.8**
    - Test any service method error returns 500 status with "Failed to grade image" message without sensitive details
    - _Requirements: 4.5, 4.6, 4.7, 4.8, 8.5, 8.6, 8.7, 8.8_

  - [ ]* 11.7 Write property test for non-image file rejection
    - **Property 6: Non-Image File Rejection**
    - **Validates: Requirements 5.6**
    - Test any file with MIME type not starting with "image/" is rejected with 400 status
    - _Requirements: 5.6_

  - [ ]* 11.8 Write property test for error response structure
    - **Property 7: Error Response Structure**
    - **Validates: Requirements 10.1, 10.2, 10.5, 10.6, 10.7, 10.8**
    - Test any error response contains error field with consistent JSON structure without stack traces or internal details
    - _Requirements: 10.1, 10.2, 10.5, 10.6, 10.7, 10.8_

- [ ] 12. Verify test coverage and generate coverage report
  - [ ] 12.1 Run tests with coverage and verify thresholds
    - Run `npm test -- grading.controller --coverage`
    - Verify grading.controller.ts achieves at least 80% line coverage
    - Verify grading.controller.ts achieves at least 80% branch coverage
    - Verify grading.controller.ts achieves at least 80% function coverage
    - Verify grading.controller.ts achieves at least 80% statement coverage
    - Identify any uncovered code paths
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_

  - [ ] 12.2 Add tests for uncovered code paths if needed
    - Review coverage report for gaps
    - Add tests for uncovered branches
    - Add tests for uncovered error paths
    - Add tests for uncovered conditional branches (auto-detect logic, base64 prefix handling)
    - _Requirements: 11.5, 11.6, 11.7_

- [ ] 13. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Integration tests validate HTTP endpoint behavior with mocked services
- All tests use mocked grading service for complete isolation
- Test suite targets 80%+ line coverage, branch coverage, function coverage, and statement coverage
- Follow patterns from marketplace.controller.test.ts and transaction.controller.test.ts for consistency
- Both endpoints (with-image and legacy base64) are tested comprehensively
- Multer validation tests ensure file type and size limits are enforced
