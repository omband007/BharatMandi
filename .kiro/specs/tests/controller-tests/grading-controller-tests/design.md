# Design Document: Grading Controller Tests

## Overview

This design document specifies the comprehensive unit test suite for the grading controller. The test suite will achieve 80%+ code coverage while following established patterns from marketplace.controller.test.ts, using complete service mocking for fast, isolated tests.

The grading controller exposes 2 main endpoints for AI-powered produce grading:
- POST /api/grading/grade-with-image - Grade produce with actual image upload using multer
- POST /api/grading/grade - Legacy endpoint accepting base64-encoded images

The test suite will use supertest for HTTP testing, Jest for mocking, and follow the test helper pattern established in the marketplace controller tests.

## Architecture

### Test Infrastructure Components

```
grading.controller.test.ts
├── Test App (Express + supertest)
├── Mock Services
│   └── gradingService (module mock)
└── Test Helpers
    ├── Data Factories
    ├── Mock Service Creators
    └── Test Constants
```

### Test Organization

The test suite will be organized into describe blocks matching the controller endpoints:

1. Test Infrastructure Setup (beforeEach/afterAll)
2. POST /api/grading/grade-with-image
   - Success cases
   - Error cases
   - Multer file type validation
   - Multer file size validation
3. POST /api/grading/grade (Legacy endpoint)
   - Success cases
   - Error cases
4. Error Response Consistency

### Mocking Strategy

**Complete Service Isolation:**
- Mock gradingService module using jest.mock()
- No real AI service calls or file system operations

**Mock Configuration:**
- Use mockResolvedValue for async service methods (gradeProduceImage)
- Use mockReturnValue for synchronous methods (generateCertificate)
- Clear all mocks in beforeEach
- No global state cleanup needed (no DatabaseManager dependency)

## Components and Interfaces

### Test App Setup

```typescript
import request from 'supertest';
import express from 'express';
import { gradingController } from '../grading.controller';

// Mock modules before imports
jest.mock('../grading.service');

const app = express();
app.use(express.json());
app.use('/api/grading', gradingController);
```

### Mock Service Interfaces

**GradingService Mock:**
```typescript
interface MockGradingService {
  gradeProduceImage: jest.Mock;  // async method
  generateCertificate: jest.Mock; // synchronous method
}
```

### Test Helper Functions

**Data Factories:**
- `createTestGradingResult(overrides?)` - Generate grading result objects
- `createTestCertificate(overrides?)` - Generate certificate objects
- `createTestAnalysis(overrides?)` - Generate AI analysis response objects
- `createTestFile(overrides?)` - Generate mock file objects for multer
- `createTestGradeRequest(overrides?)` - Generate legacy endpoint request data

**Mock Service Creators:**
- `createMockGradingService()` - Create grading service mock

**Test Constants:**
- `TEST_FARMER_IDS` - Sample farmer IDs
- `TEST_PRODUCE_TYPES` - Sample produce types (tomatoes, carrots, etc.)
- `TEST_GRADES` - Sample grade values (A, B, C)
- `TEST_LOCATIONS` - Sample location coordinates
- `ALLOWED_IMAGE_TYPES` - Valid image MIME types
- `INVALID_FILE_TYPES` - Invalid file MIME types

## Data Models

### Test Grading Result Model

```typescript
interface TestGradingResult {
  grade: string;           // A, B, C, etc.
  quality: number;         // 0-100
  confidence: number;      // 0-1
  defects: string[];       // Array of detected defects
  recommendations: string[]; // Array of recommendations
}
```

### Test Certificate Model

```typescript
interface TestCertificate {
  certificateId: string;
  farmerId: string;
  produceType: string;
  grade: string;
  issuedAt: Date;
  expiresAt: Date;
  imageHash: string;
}
```

### Test Analysis Model

```typescript
interface TestAnalysis {
  detectedCrop: string;    // Detected produce type or 'unknown'
  ripeness: string;        // Ripeness level
  estimatedShelfLife: number; // Days
  processingTime: number;  // Milliseconds
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

### Property 1: Service Delegation for Image Grading

*For any* valid image upload request (with-image or legacy endpoint), the controller should call gradingService.gradeProduceImage exactly once with the correct image buffer and location parameters.

**Validates: Requirements 3.2, 7.4, 9.1, 9.2, 9.3**

### Property 2: Service Delegation for Certificate Generation

*For any* successful grading operation, the controller should call gradingService.generateCertificate exactly once with the correct farmerId, produceType, gradingResult, imageBuffer, and detectedCrop parameters.

**Validates: Requirements 3.3, 7.5, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9**

### Property 3: Location Parsing

*For any* valid lat and lng form field values, the with-image endpoint should parse them as floating point numbers and pass them correctly to the grading service.

**Validates: Requirements 3.8**

### Property 4: Response Structure Consistency

*For any* successful grading request (with-image or legacy), the response should contain all expected fields: gradingResult, certificate, and analysis.

**Validates: Requirements 3.9, 7.6**

### Property 5: Service Error Handling

*For any* service method (gradeProduceImage or generateCertificate) that throws an error, the controller should return 500 status with error message "Failed to grade image" without exposing sensitive details or stack traces.

**Validates: Requirements 4.5, 4.6, 4.7, 4.8, 8.5, 8.6, 8.7, 8.8**

### Property 6: Non-Image File Rejection

*For any* file with a MIME type that does not start with "image/", multer should reject the request with 400 status and error message "Only image files are allowed".

**Validates: Requirements 5.6**

### Property 7: Error Response Structure

*For any* error response (400 or 500), the response should contain an error field with a string message and use consistent JSON structure without stack traces, internal paths, or database details.

**Validates: Requirements 10.1, 10.2, 10.5, 10.6, 10.7, 10.8**

## Error Handling

### Error Categories

**Validation Errors (400):**
- No image file uploaded
- Missing required fields (farmerId, lat, lng for with-image; farmerId, produceType, imageData, location for legacy)
- Invalid file type (non-image MIME type)
- File size exceeds 10MB limit

**Server Errors (500):**
- gradingService.gradeProduceImage throws error
- gradingService.generateCertificate throws error
- Any unexpected error during request processing

### Error Response Format

All errors follow consistent JSON structure:
```typescript
{
  error: string;  // User-friendly error message
}
```

### Security Considerations

- 500 errors must use generic message "Failed to grade image"
- Error responses must not expose:
  - Stack traces
  - Internal file paths
  - Database connection details
  - Sensitive service error details
- Detailed error logging should only go to console, not response

## Testing Strategy

### Dual Testing Approach

The test suite uses unit tests to verify controller behavior:

**Unit Tests:**
- Specific examples for each endpoint
- Edge cases (missing fields, invalid files, boundary conditions)
- Error conditions (service failures, validation failures)
- Integration points (service method calls, parameter passing)
- Response structure validation
- Status code verification
- Multer validation rules

**Test Coverage Strategy:**
- Test both endpoints (with-image and legacy)
- Test success paths for each endpoint
- Test error paths for each endpoint
- Test validation rules (missing fields, file types, file sizes)
- Test service delegation and parameter passing
- Test response structure consistency
- Test auto-detect logic variations
- Test base64 decoding (with and without data URI prefix)

### Test Execution

**Test Configuration:**
- Use Jest as test runner
- Use supertest for HTTP testing
- Mock all external dependencies (gradingService)
- Clear mocks between tests

**Test Isolation:**
- Each test is independent
- No shared state between tests
- No global state cleanup needed

### Coverage Target

- Minimum 80% line coverage for grading.controller.ts
- Minimum 80% branch coverage for grading.controller.ts
- Both endpoints tested
- All error paths tested
- All validation paths tested
- All conditional branches tested (auto-detect logic, base64 prefix handling)

## Test Implementation Plan

### Phase 1: Test Infrastructure

1. Create test file structure
2. Set up module mocks (gradingService)
3. Create test app with supertest
4. Set up beforeEach hook for mock clearing

### Phase 2: Test Helpers

1. Create data factory functions
   - createTestGradingResult
   - createTestCertificate
   - createTestAnalysis
   - createTestFile
   - createTestGradeRequest
2. Create mock service creator
   - createMockGradingService
3. Create test constants
   - TEST_FARMER_IDS
   - TEST_PRODUCE_TYPES
   - TEST_GRADES
   - TEST_LOCATIONS
   - ALLOWED_IMAGE_TYPES
   - INVALID_FILE_TYPES

### Phase 3: Image Upload Endpoint Tests

1. Success Cases
   - Valid image upload with all fields
   - Service method call verification (gradeProduceImage)
   - Service method call verification (generateCertificate)
   - Auto-detect enabled with detected crop
   - Auto-detect disabled with provided produceType
   - ProduceType not provided with auto-detect enabled
   - ProduceType not provided with no crop detected (edge case)
   - Lat/lng parsing verification
   - Response structure validation

2. Error Cases
   - No image file uploaded
   - Missing farmerId
   - Missing lat
   - Missing lng
   - gradeProduceImage throws error
   - generateCertificate throws error
   - Sensitive information not exposed

3. Multer File Type Validation
   - Accept JPEG files
   - Accept JPG files
   - Accept PNG files
   - Accept WebP files
   - Accept GIF files
   - Reject text files
   - Reject executable files
   - Reject PDF files
   - Reject video files

4. Multer File Size Validation
   - Accept file under 10MB
   - Accept file exactly 10MB (boundary)
   - Reject file exceeding 10MB
   - Error message for oversized file

### Phase 4: Legacy Endpoint Tests

1. Success Cases
   - Valid base64 image with all fields
   - Base64 with data URI prefix
   - Base64 without data URI prefix
   - Service method call verification (gradeProduceImage)
   - Service method call verification (generateCertificate)
   - Response structure validation

2. Error Cases
   - Missing farmerId
   - Missing produceType
   - Missing imageData
   - Missing location
   - gradeProduceImage throws error
   - generateCertificate throws error
   - Sensitive information not exposed

### Phase 5: Error Consistency Tests

1. Test 400 error format
2. Test 500 error format
3. Test error message consistency ("Failed to grade image")
4. Test no stack traces in responses
5. Test no internal paths in responses
6. Test no database details in responses

### Phase 6: Coverage Verification

1. Run coverage report
2. Identify uncovered lines
3. Add tests for uncovered paths
4. Verify 80%+ coverage achieved

