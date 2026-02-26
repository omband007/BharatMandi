# Design Document: I18n Controller Integration Tests

## Overview

This design document specifies the comprehensive integration test suite for the I18n Controller. The test suite will achieve 80%+ code coverage while following established patterns from marketplace-controller-tests and transaction-controller-tests, using complete service and file system mocking for fast, isolated tests.

The I18n Controller exposes 5 endpoints managing internationalization functionality across 11 supported Indian languages:
- GET /api/i18n/translations/:lang - Retrieve translation bundle for a specific language
- GET /api/i18n/languages - Get list of all supported languages
- GET /api/i18n/validate - Validate translation completeness across all languages
- POST /api/i18n/change-language - Update user language preference
- GET /api/i18n/user-language/:userId - Retrieve user language preference

The test suite will use supertest for HTTP testing, Jest for mocking, and follow the test helper pattern established in marketplace and transaction controller tests. All file system operations (fs/promises) and service layer calls (i18nService) will be fully mocked.

## Architecture

### Test Infrastructure Components

```
i18n.controller.test.ts
├── Test App (Express + supertest)
├── Mock Services
│   ├── i18nService (module mock)
│   └── fs/promises (module mock)
├── Mock DatabaseManager (global.sharedDbManager)
└── Test Helpers
    ├── Data Factories
    ├── Mock Service Creators
    └── Test Constants
```

### Test Organization

The test suite will be organized into describe blocks matching the controller endpoints:

1. Test Infrastructure Setup (beforeEach/afterAll)
2. GET /api/i18n/translations/:lang
   - Success Cases (all 11 languages)
   - Error Cases (unsupported language, file errors)
3. GET /api/i18n/languages
   - Success Cases
   - Error Cases
4. GET /api/i18n/validate
   - Success Cases (complete and incomplete translations)
   - Error Cases
5. POST /api/i18n/change-language
   - Success Cases
   - Validation Error Cases
   - Service Error Cases
6. GET /api/i18n/user-language/:userId
   - Success Cases
   - Error Cases
7. Error Response Consistency

### Mocking Strategy

**Complete Service and File System Isolation:**
- Mock i18nService module using jest.mock()
- Mock fs/promises module using jest.mock()
- Mock DatabaseManager and assign to global.sharedDbManager
- No real file system or database operations

**Mock Configuration:**
- Use mockResolvedValue for async service methods
- Use mockResolvedValue for fs.readFile operations
- Clear all mocks in beforeEach
- Clean up global state in afterAll

## Components and Interfaces

### Test App Setup

```typescript
import request from 'supertest';
import express from 'express';
import { Router } from 'express';
import { i18nController } from '../i18n.controller';

// Mock modules before imports
jest.mock('../i18n.service');
jest.mock('fs/promises');

// Create router with controller methods
const router = Router();
router.get('/translations/:lang', (req, res) => i18nController.getTranslations(req, res));
router.get('/languages', (req, res) => i18nController.getSupportedLanguages(req, res));
router.get('/validate', (req, res) => i18nController.validateTranslations(req, res));
router.post('/change-language', (req, res) => i18nController.changeLanguage(req, res));
router.get('/user-language/:userId', (req, res) => i18nController.getUserLanguage(req, res));

const app = express();
app.use(express.json());
app.use('/api/i18n', router);
```

### Mock Service Interfaces

**I18nService Mock:**
```typescript
interface MockI18nService {
  getSupportedLanguages: jest.Mock;
  initialize: jest.Mock;
  validateTranslationCompleteness: jest.Mock;
  changeLanguage: jest.Mock;
  getUserLanguagePreference: jest.Mock;
}
```

**File System Mock:**
```typescript
interface MockFsPromises {
  readFile: jest.Mock;
}
```

### Test Helper Functions

**Data Factories:**
- `createTestTranslationBundle(overrides?)` - Generate translation bundle objects
- `createTestLanguageConfig(overrides?)` - Generate language configuration objects
- `createTestValidationResult(overrides?)` - Generate validation result objects
- `createMockI18nService()` - Create i18n service mock
- `createMockDatabaseManager()` - Create database manager mock

**Test Constants:**
- `TEST_USER_IDS` - Sample user IDs
- `SUPPORTED_LANGUAGE_CODES` - All 11 language codes (en, hi, pa, mr, ta, te, bn, gu, kn, ml, or)
- `UNSUPPORTED_LANGUAGE_CODES` - Invalid language codes for testing
- `TEST_TRANSLATION_KEYS` - Sample translation keys

## Data Models

### Test Translation Bundle Model

```typescript
interface TestTranslationBundle {
  [key: string]: string | TestTranslationBundle;
  // Example:
  // common: {
  //   welcome: "Welcome",
  //   logout: "Logout"
  // }
}
```

### Test Language Config Model

```typescript
interface TestLanguageConfig {
  code: string;
  name: string;
  nativeName?: string;
  direction?: 'ltr' | 'rtl';
  dateFormat?: string;
  numberFormat?: string;
  currencyFormat?: string;
}
```

### Test Validation Result Model

```typescript
interface TestValidationResult {
  incomplete: string[];
  missing: string[];
  totalMissing?: number;
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, I identified the following testable properties. During reflection, I consolidated redundant properties:

- Properties about "all 11 languages" were combined into single comprehensive properties
- Properties about response structure consistency were merged across endpoints
- Properties about service delegation were consolidated
- Properties about error handling follow consistent patterns

### Property 1: Translation Retrieval for Supported Languages

*For any* supported language code from the 11 Indian languages (en, hi, pa, mr, ta, te, bn, gu, kn, ml, or), when requesting translations, the controller should return 200 status with the parsed translation bundle from the corresponding file.

**Validates: Requirements 3.1-3.11, 3.13, 3.14**

### Property 2: File Path Construction

*For any* supported language code, when requesting translations, the controller should call fs.readFile with a path that includes the language code in the format `locales/{lang}/translation.json`.

**Validates: Requirements 3.12**

### Property 3: Unsupported Language Rejection

*For any* language code not in the supported languages list, when requesting translations, the controller should return 400 status with success field set to false and a message containing "Unsupported language".

**Validates: Requirements 4.1, 4.2, 4.3**

### Property 4: Validation Before File Operations

*For any* unsupported language code, when requesting translations, the controller should not call fs.readFile (validation should prevent file operations).

**Validates: Requirements 4.7**

### Property 5: Supported Languages Response Structure

*For any* request to get supported languages, when the service returns successfully, the controller should return 200 status with a response containing success field set to true and a languages array with all 11 language configurations.

**Validates: Requirements 5.1, 5.2, 5.3, 5.4**

### Property 6: Language Configuration Completeness

*For any* language object in the supported languages response, it should contain code, name, and nativeName fields, and the codes should match the 11 supported language codes.

**Validates: Requirements 5.5-5.16**

### Property 7: Validation Service Delegation

*For any* validation request, the controller should call i18nService.initialize exactly once and i18nService.validateTranslationCompleteness exactly once before returning the response.

**Validates: Requirements 7.1, 7.2**

### Property 8: Validation Response Structure

*For any* validation result (complete or incomplete), the controller should return 200 status with success field set to true and a validation object containing incomplete, missingKeys, and totalMissing fields.

**Validates: Requirements 7.8, 7.9**

### Property 9: Language Change Success Response

*For any* valid userId and supported languageCode, when changing language preference, the controller should return 200 status with success field set to true, a success message, and the language code in the response.

**Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5**

### Property 10: Language Change Accepts All Supported Languages

*For any* of the 11 supported language codes, when provided with a valid userId, the change language endpoint should accept the language code and call i18nService.changeLanguage with the correct parameters.

**Validates: Requirements 9.6, 9.7**

### Property 11: Language Change Validation

*For any* request missing userId or languageCode, the controller should return 400 status with success field set to false and message "userId and languageCode are required", without calling i18nService.changeLanguage.

**Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5, 10.6**

### Property 12: User Language Retrieval Response Structure

*For any* valid userId, when retrieving user language preference, the controller should return 200 status with success field set to true and a language field containing one of the 11 supported language codes.

**Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5, 12.6**

### Property 13: Error Response Consistency

*For any* endpoint, when a 400 or 500 error occurs, the response should contain a success field set to false and a message field with an error description, using consistent JSON structure across all endpoints.

**Validates: Requirements 15.1, 15.2, 15.3, 15.4, 15.5**

### Property 14: Sensitive Information Protection

*For any* 500 error response, the error message should not expose sensitive internal details such as file paths, database connection strings, or stack traces.

**Validates: Requirements 15.6**

### Property 15: Service Method Call Verification

*For any* endpoint, when called with valid parameters, the controller should call the corresponding service method exactly once with the correct parameters.

**Validates: Requirements 16.1, 16.2, 16.3**

### Property 16: Service Method Call Prevention on Validation Failure

*For any* endpoint with validation, when validation fails, the controller should not call the corresponding service method.

**Validates: Requirements 16.4**

## Error Handling

### Error Categories

**Validation Errors (400):**
- Unsupported language code (GET /api/i18n/translations/:lang)
- Missing required fields: userId or languageCode (POST /api/i18n/change-language)

**Server Errors (500):**
- File system errors (file not found, read errors, invalid JSON)
- Service method throws error (getSupportedLanguages, initialize, validateTranslationCompleteness, changeLanguage, getUserLanguagePreference)

### Error Response Format

All errors follow consistent JSON structure:
```typescript
{
  success: false;
  message: string;  // User-friendly error message
}
```

### Error Handling Patterns

**File System Errors:**
- File not found: Return 500 with "Failed to load translations"
- Read error: Return 500 with "Failed to load translations"
- Invalid JSON: Return 500 with "Failed to load translations"

**Service Errors:**
- getSupportedLanguages fails: Return 500 with "Failed to get supported languages"
- initialize fails: Return 500 with "Failed to validate translations"
- validateTranslationCompleteness fails: Return 500 with "Failed to validate translations"
- changeLanguage fails: Return 500 with error.message or "Failed to change language"
- getUserLanguagePreference fails: Return 500 with "Failed to get user language preference"

### Security Considerations

- 500 errors must not expose sensitive information (file paths, internal errors, stack traces)
- Error messages should be generic and user-friendly
- Detailed error logging should only go to console.error, not response
- Language validation happens before file operations to prevent path traversal

## Testing Strategy

### Dual Testing Approach

The test suite uses unit tests to verify controller behavior:

**Unit Tests:**
- Specific examples for each endpoint
- Edge cases (unsupported languages, missing fields, file errors)
- Error conditions (service failures, validation failures, file system failures)
- Integration points (service method calls, parameter passing, fs.readFile calls)
- Response structure validation
- Status code verification
- Multi-language coverage (all 11 supported languages)

**Test Coverage Strategy:**
- Test all 5 endpoints
- Test success paths for each endpoint
- Test error paths for each endpoint
- Test validation rules for endpoints with validation
- Test service delegation and parameter passing
- Test file system operations and error handling
- Test response structure consistency
- Test all 11 supported languages
- Test unsupported language rejection

### Test Execution

**Test Configuration:**
- Use Jest as test runner
- Use supertest for HTTP testing
- Mock all external dependencies (i18nService, fs/promises)
- Clear mocks between tests using beforeEach
- Clean up global state in afterAll

**Test Isolation:**
- Each test is independent
- No shared state between tests
- No real file system operations
- No real database operations
- All service calls are mocked

### Multi-Language Testing

**Parameterized Testing:**
- Use test.each or loops to test all 11 supported languages
- Verify translation retrieval for each language
- Verify language change accepts each language
- Verify user language preference can return each language

**Language Codes:**
- en (English)
- hi (Hindi - हिन्दी)
- pa (Punjabi - ਪੰਜਾਬੀ)
- mr (Marathi - मराठी)
- ta (Tamil - தமிழ்)
- te (Telugu - తెలుగు)
- bn (Bengali - বাংলা)
- gu (Gujarati - ગુજરાતી)
- kn (Kannada - ಕನ್ನಡ)
- ml (Malayalam - മലയാളം)
- or (Odia - ଓଡ଼ିଆ)

### Coverage Target

- Minimum 80% line coverage for i18n.controller.ts
- Minimum 80% branch coverage for i18n.controller.ts
- All 5 endpoints tested
- All error paths tested
- All validation paths tested
- All 11 supported languages tested

## Test Implementation Plan

### Phase 1: Test Infrastructure

1. Create test file: `src/features/i18n/__tests__/i18n.controller.test.ts`
2. Set up module mocks (jest.mock for i18n.service and fs/promises)
3. Create test app with Express and supertest
4. Create router with all 5 controller endpoints
5. Configure global.sharedDbManager mock
6. Set up beforeEach hook to clear all mocks
7. Set up afterAll hook to clean up global state

### Phase 2: Test Helpers

1. Create test-helpers directory structure
2. Implement data factory functions:
   - `createTestTranslationBundle(overrides?)`
   - `createTestLanguageConfig(overrides?)`
   - `createTestValidationResult(overrides?)`
3. Implement mock service creators:
   - `createMockI18nService()`
   - `createMockFsPromises()`
   - `createMockDatabaseManager()`
4. Create test constants:
   - `TEST_USER_IDS`
   - `SUPPORTED_LANGUAGE_CODES`
   - `UNSUPPORTED_LANGUAGE_CODES`
   - `TEST_TRANSLATION_KEYS`

### Phase 3: Endpoint Tests

1. **GET /api/i18n/translations/:lang**
   - Test translation retrieval for all 11 supported languages (parameterized)
   - Test fs.readFile called with correct path for each language
   - Test JSON parsing and direct return of translation object
   - Test unsupported language returns 400 with correct error structure
   - Test file not found returns 500
   - Test file read error returns 500
   - Test invalid JSON returns 500
   - Test fs.readFile not called when validation fails

2. **GET /api/i18n/languages**
   - Test successful retrieval returns 200 with success true
   - Test response contains languages array with all 11 languages
   - Test each language object has code, name, nativeName fields
   - Test all 11 language codes are present
   - Test i18nService.getSupportedLanguages called exactly once
   - Test service error returns 500 with correct error structure

3. **GET /api/i18n/validate**
   - Test i18nService.initialize called exactly once
   - Test i18nService.validateTranslationCompleteness called exactly once
   - Test complete translations return 200 with empty incomplete array
   - Test incomplete translations return 200 with incomplete languages
   - Test response structure has success, validation object with required fields
   - Test initialize error returns 500
   - Test validateTranslationCompleteness error returns 500

4. **POST /api/i18n/change-language**
   - Test valid userId and languageCode return 200 with success message
   - Test all 11 supported languages are accepted (parameterized)
   - Test i18nService.changeLanguage called with correct parameters
   - Test i18nService.changeLanguage called exactly once
   - Test missing userId returns 400
   - Test missing languageCode returns 400
   - Test missing both fields returns 400
   - Test validation failure prevents service call
   - Test service error with message returns 500 with error message
   - Test service error without message returns 500 with default message

5. **GET /api/i18n/user-language/:userId**
   - Test valid userId returns 200 with success true and language code
   - Test response can contain any of the 11 supported languages
   - Test i18nService.getUserLanguagePreference called with correct userId
   - Test i18nService.getUserLanguagePreference called exactly once
   - Test service error returns 500 with correct error structure

### Phase 4: Error Consistency Tests

1. Test 400 error format consistency across endpoints
2. Test 500 error format consistency across endpoints
3. Test all error responses have success: false
4. Test all error responses have message field
5. Test sensitive information not exposed in 500 errors
6. Test no stack traces in error responses

### Phase 5: Coverage Verification

1. Run Jest with coverage: `npm test -- --coverage`
2. Review coverage report for i18n.controller.ts
3. Identify uncovered lines and branches
4. Add tests for uncovered paths
5. Verify 80%+ line and branch coverage achieved
6. Document coverage results

### Phase 6: Documentation and Review

1. Add JSDoc comments to test helper functions
2. Add descriptive test names following pattern: "should [expected behavior] when [condition]"
3. Add comments explaining complex test scenarios
4. Organize tests with clear describe block hierarchy
5. Review test suite for completeness and clarity
6. Verify all 20 requirements are covered by tests
