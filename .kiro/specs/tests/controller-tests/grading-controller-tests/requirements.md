# Requirements Document

## Introduction

This document specifies the requirements for comprehensive integration tests for the Grading Controller. The Grading Controller provides two endpoints for AI-powered produce grading: one with actual image upload using multer, and a legacy endpoint accepting base64-encoded images. The tests must achieve 80%+ code coverage and follow established patterns from the marketplace controller tests.

## Glossary

- **Grading_Controller**: The Express router handling produce grading API endpoints
- **Grading_Service**: The service layer that performs AI-powered image analysis and certificate generation
- **Test_Suite**: The Jest test suite containing all integration tests for the Grading Controller
- **Multer**: The middleware library handling multipart/form-data file uploads
- **Mock_Service**: A Jest mock implementation of the Grading Service for isolated testing
- **Test_Helper**: Utility functions and factories for creating test data
- **Coverage_Target**: The minimum 80% code coverage requirement for the controller
- **Image_Upload_Endpoint**: POST /api/grading/grade-with-image endpoint accepting file uploads
- **Legacy_Endpoint**: POST /api/grading/grade endpoint accepting base64 image data
- **Auto_Detect**: Optional feature to automatically detect produce type from image analysis

## Requirements

### Requirement 1: Test Infrastructure Setup

**User Story:** As a developer, I want a properly configured test infrastructure, so that I can run isolated integration tests for the Grading Controller.

#### Acceptance Criteria

1. THE Test_Suite SHALL import and configure the Grading Controller with Express
2. THE Test_Suite SHALL mock the Grading Service module using Jest
3. THE Test_Suite SHALL create mock service instances with all required methods
4. THE Test_Suite SHALL configure Express middleware for JSON parsing
5. THE Test_Suite SHALL clear all mocks before each test execution
6. THE Test_Suite SHALL verify test infrastructure setup with a placeholder test

### Requirement 2: Test Helper Functions

**User Story:** As a developer, I want reusable test helper functions, so that I can create test data consistently across all test cases.

#### Acceptance Criteria

1. THE Test_Helper SHALL provide a factory function to create mock Grading Service instances
2. THE Test_Helper SHALL provide a factory function to create test grading results with default values
3. THE Test_Helper SHALL provide a factory function to create test certificates with default values
4. THE Test_Helper SHALL provide a factory function to create test AI analysis responses
5. THE Test_Helper SHALL provide a factory function to create test file objects for multer
6. THE Test_Helper SHALL provide constants for test farmer IDs, produce types, and grades
7. THE Test_Helper SHALL support partial overrides for all factory functions

### Requirement 3: Image Upload Endpoint Success Cases

**User Story:** As a developer, I want to test successful image upload scenarios, so that I can verify the endpoint works correctly with valid inputs.

#### Acceptance Criteria

1. WHEN a valid image file with all required fields is uploaded, THE Image_Upload_Endpoint SHALL return 201 status with grading result, certificate, and analysis
2. WHEN the service successfully grades an image, THE Image_Upload_Endpoint SHALL call gradingService.gradeProduceImage with correct parameters
3. WHEN the service successfully grades an image, THE Image_Upload_Endpoint SHALL call gradingService.generateCertificate with correct parameters
4. WHEN auto-detect is enabled and a crop is detected, THE Image_Upload_Endpoint SHALL use the detected crop type for certificate generation
5. WHEN auto-detect is disabled, THE Image_Upload_Endpoint SHALL use the provided produceType for certificate generation
6. WHEN produceType is not provided and auto-detect is enabled, THE Image_Upload_Endpoint SHALL use the detected crop type
7. WHEN produceType is not provided and no crop is detected, THE Image_Upload_Endpoint SHALL use 'unknown' as the produce type
8. THE Image_Upload_Endpoint SHALL parse lat and lng as floating point numbers from form fields
9. THE Image_Upload_Endpoint SHALL return response body containing all expected fields (gradingResult, certificate, analysis)

### Requirement 4: Image Upload Endpoint Error Cases

**User Story:** As a developer, I want to test error scenarios for image uploads, so that I can verify proper error handling and validation.

#### Acceptance Criteria

1. WHEN no image file is uploaded, THE Image_Upload_Endpoint SHALL return 400 status with error message "No image file uploaded"
2. WHEN farmerId is missing, THE Image_Upload_Endpoint SHALL return 400 status with error message about missing required fields
3. WHEN lat is missing, THE Image_Upload_Endpoint SHALL return 400 status with error message about missing required fields
4. WHEN lng is missing, THE Image_Upload_Endpoint SHALL return 400 status with error message about missing required fields
5. WHEN gradingService.gradeProduceImage throws an error, THE Image_Upload_Endpoint SHALL return 500 status with error message
6. WHEN gradingService.generateCertificate throws an error, THE Image_Upload_Endpoint SHALL return 500 status with error message
7. THE Image_Upload_Endpoint SHALL not expose sensitive information in error responses
8. THE Image_Upload_Endpoint SHALL not expose stack traces in error responses

### Requirement 5: Multer File Validation

**User Story:** As a developer, I want to test multer file validation, so that I can verify only valid image files are accepted.

#### Acceptance Criteria

1. WHEN a JPEG image file is uploaded, THE Multer SHALL accept the file
2. WHEN a JPG image file is uploaded, THE Multer SHALL accept the file
3. WHEN a PNG image file is uploaded, THE Multer SHALL accept the file
4. WHEN a WebP image file is uploaded, THE Multer SHALL accept the file
5. WHEN a GIF image file is uploaded, THE Multer SHALL accept the file
6. WHEN a non-image file is uploaded, THE Multer SHALL reject the file with error message "Only image files are allowed"
7. WHEN a text file is uploaded, THE Multer SHALL reject the file with 400 status
8. WHEN an executable file is uploaded, THE Multer SHALL reject the file with 400 status
9. WHEN a PDF file is uploaded, THE Multer SHALL reject the file with 400 status
10. WHEN a video file is uploaded, THE Multer SHALL reject the file with 400 status

### Requirement 6: Multer File Size Validation

**User Story:** As a developer, I want to test file size limits, so that I can verify the 10MB limit is enforced.

#### Acceptance Criteria

1. WHEN a file under 10MB is uploaded, THE Multer SHALL accept the file
2. WHEN a file exactly 10MB is uploaded, THE Multer SHALL accept the file
3. WHEN a file exceeding 10MB is uploaded, THE Multer SHALL reject the file with 400 status
4. WHEN a file exceeding 10MB is uploaded, THE Multer SHALL return an error message indicating size limit exceeded

### Requirement 7: Legacy Endpoint Success Cases

**User Story:** As a developer, I want to test the legacy base64 endpoint, so that I can verify backward compatibility.

#### Acceptance Criteria

1. WHEN a valid base64 image with all required fields is provided, THE Legacy_Endpoint SHALL return 200 status with grading result, certificate, and analysis
2. WHEN a base64 image with data URI prefix is provided, THE Legacy_Endpoint SHALL strip the prefix and decode correctly
3. WHEN a base64 image without data URI prefix is provided, THE Legacy_Endpoint SHALL decode correctly
4. WHEN the service successfully grades a base64 image, THE Legacy_Endpoint SHALL call gradingService.gradeProduceImage with correct buffer
5. WHEN the service successfully grades a base64 image, THE Legacy_Endpoint SHALL call gradingService.generateCertificate with correct parameters
6. THE Legacy_Endpoint SHALL return response body containing all expected fields (gradingResult, certificate, analysis)

### Requirement 8: Legacy Endpoint Error Cases

**User Story:** As a developer, I want to test error scenarios for the legacy endpoint, so that I can verify proper validation and error handling.

#### Acceptance Criteria

1. WHEN farmerId is missing, THE Legacy_Endpoint SHALL return 400 status with error message "Missing required fields"
2. WHEN produceType is missing, THE Legacy_Endpoint SHALL return 400 status with error message "Missing required fields"
3. WHEN imageData is missing, THE Legacy_Endpoint SHALL return 400 status with error message "Missing required fields"
4. WHEN location is missing, THE Legacy_Endpoint SHALL return 400 status with error message "Missing required fields"
5. WHEN gradingService.gradeProduceImage throws an error, THE Legacy_Endpoint SHALL return 500 status with error message
6. WHEN gradingService.generateCertificate throws an error, THE Legacy_Endpoint SHALL return 500 status with error message
7. THE Legacy_Endpoint SHALL not expose sensitive information in error responses
8. THE Legacy_Endpoint SHALL not expose stack traces in error responses

### Requirement 9: Service Integration Testing

**User Story:** As a developer, I want to verify service method calls, so that I can ensure correct integration between controller and service layers.

#### Acceptance Criteria

1. WHEN grading an image, THE Grading_Controller SHALL call gradingService.gradeProduceImage exactly once
2. WHEN grading an image, THE Grading_Controller SHALL pass the image buffer to gradingService.gradeProduceImage
3. WHEN grading an image, THE Grading_Controller SHALL pass the location object with lat and lng to gradingService.gradeProduceImage
4. WHEN generating a certificate, THE Grading_Controller SHALL call gradingService.generateCertificate exactly once
5. WHEN generating a certificate, THE Grading_Controller SHALL pass farmerId to gradingService.generateCertificate
6. WHEN generating a certificate, THE Grading_Controller SHALL pass produceType to gradingService.generateCertificate
7. WHEN generating a certificate, THE Grading_Controller SHALL pass gradingResult to gradingService.generateCertificate
8. WHEN generating a certificate, THE Grading_Controller SHALL pass imageBuffer to gradingService.generateCertificate
9. WHEN generating a certificate, THE Grading_Controller SHALL pass detectedCrop to gradingService.generateCertificate

### Requirement 10: Error Response Consistency

**User Story:** As a developer, I want consistent error response formats, so that API consumers can handle errors predictably.

#### Acceptance Criteria

1. THE Grading_Controller SHALL return 400 errors with an error field containing a string message
2. THE Grading_Controller SHALL return 500 errors with an error field containing a string message
3. THE Grading_Controller SHALL use "Failed to grade image" message for 500 errors on Image_Upload_Endpoint
4. THE Grading_Controller SHALL use "Failed to grade image" message for 500 errors on Legacy_Endpoint
5. THE Grading_Controller SHALL not include stack traces in any error response
6. THE Grading_Controller SHALL not include internal file paths in any error response
7. THE Grading_Controller SHALL not include database connection details in any error response
8. THE Grading_Controller SHALL return consistent JSON structure for all error types
9. THE Grading_Controller SHALL ensure all error messages are user-friendly and non-technical

### Requirement 11: Code Coverage Target

**User Story:** As a developer, I want to achieve 80%+ code coverage, so that I can ensure comprehensive testing of the controller.

#### Acceptance Criteria

1. THE Test_Suite SHALL achieve at least 80% line coverage for the Grading Controller
2. THE Test_Suite SHALL achieve at least 80% branch coverage for the Grading Controller
3. THE Test_Suite SHALL achieve at least 80% function coverage for the Grading Controller
4. THE Test_Suite SHALL achieve at least 80% statement coverage for the Grading Controller
5. THE Test_Suite SHALL test all success paths in the controller
6. THE Test_Suite SHALL test all error paths in the controller
7. THE Test_Suite SHALL test all conditional branches in the controller

### Requirement 12: Test Organization and Documentation

**User Story:** As a developer, I want well-organized and documented tests, so that I can easily understand and maintain the test suite.

#### Acceptance Criteria

1. THE Test_Suite SHALL organize tests using nested describe blocks by endpoint
2. THE Test_Suite SHALL separate success cases and error cases into distinct describe blocks
3. THE Test_Suite SHALL separate multer validation tests into a distinct describe block
4. THE Test_Suite SHALL use descriptive test names that clearly state the scenario and expected outcome
5. THE Test_Suite SHALL include comments explaining complex test setups
6. THE Test_Suite SHALL follow the Arrange-Act-Assert pattern in all test cases
7. THE Test_Suite SHALL include a header comment describing the test file purpose and scope
