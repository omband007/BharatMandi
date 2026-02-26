# Requirements Document: I18n Controller Integration Tests

## Introduction

This document specifies the requirements for comprehensive integration tests for the I18n Controller. The I18n Controller provides internationalization functionality through 5 endpoints that manage translation bundles, language preferences, and validation across 11 supported Indian languages. The tests will achieve 80%+ code coverage using complete service mocking following patterns from marketplace-controller-tests and transaction-controller-tests.

## Glossary

- **I18n_Controller**: The Express router handling HTTP requests for internationalization operations
- **I18n_Service**: The service layer managing translation loading, validation, and user language preferences
- **Test_Suite**: The Jest test suite containing all test cases for the I18n Controller
- **Mock_Service**: A Jest mock implementation of the I18n Service for isolated testing
- **Translation_Bundle**: A JSON object containing key-value pairs for UI text in a specific language
- **Language_Code**: A two-letter ISO 639-1 code identifying a language (en, hi, pa, mr, ta, te, bn, gu, kn, ml, or)
- **Supported_Languages**: The array of 11 Indian languages supported by the system
- **Test_Factory**: A function that creates test data objects with sensible defaults
- **Coverage_Target**: The minimum 80% code coverage requirement for i18n.controller.ts
- **Validation_Result**: An object containing incomplete languages and missing translation keys
- **User_Language_Preference**: The stored language code preference for a specific user

## Requirements

### Requirement 1: Test Infrastructure Setup

**User Story:** As a developer, I want a properly configured test infrastructure, so that I can run isolated controller tests without file system or database dependencies.

#### Acceptance Criteria

1. THE Test_Suite SHALL import and configure the I18n Controller with Express
2. THE Test_Suite SHALL mock the i18n.service module using jest.mock
3. THE Test_Suite SHALL mock the fs/promises module using jest.mock
4. THE Test_Suite SHALL create a Mock_Service with all I18n_Service methods
5. THE Test_Suite SHALL use supertest for HTTP request testing
6. WHEN each test begins, THE Test_Suite SHALL clear all mock call history using beforeEach
7. THE Test_Suite SHALL follow the same infrastructure pattern as marketplace-controller-tests

### Requirement 2: Test Helper Functions and Data Factories

**User Story:** As a developer, I want reusable test helper functions, so that I can create test data efficiently and maintain consistency.

#### Acceptance Criteria

1. THE Test_Suite SHALL provide a createMockI18nService Test_Factory
2. THE Test_Suite SHALL provide a createTestTranslationBundle Test_Factory
3. THE Test_Suite SHALL provide a createTestLanguageConfig Test_Factory
4. THE Test_Suite SHALL provide a createTestValidationResult Test_Factory
5. THE Test_Suite SHALL provide test constants for user IDs and language codes
6. THE Test_Suite SHALL support partial overrides in all Test_Factory functions
7. THE Test_Suite SHALL create test data with realistic default values for all 11 supported languages

### Requirement 3: GET /api/i18n/translations/:lang - Success Cases

**User Story:** As a developer, I want comprehensive tests for translation retrieval success scenarios, so that I can verify translation bundles are loaded correctly for all supported languages.

#### Acceptance Criteria

1. WHEN a valid English language code is provided, THE I18n_Controller SHALL return 200 status with translation bundle
2. WHEN a valid Hindi language code is provided, THE I18n_Controller SHALL return 200 status with translation bundle
3. WHEN a valid Punjabi language code is provided, THE I18n_Controller SHALL return 200 status with translation bundle
4. WHEN a valid Marathi language code is provided, THE I18n_Controller SHALL return 200 status with translation bundle
5. WHEN a valid Tamil language code is provided, THE I18n_Controller SHALL return 200 status with translation bundle
6. WHEN a valid Telugu language code is provided, THE I18n_Controller SHALL return 200 status with translation bundle
7. WHEN a valid Bengali language code is provided, THE I18n_Controller SHALL return 200 status with translation bundle
8. WHEN a valid Gujarati language code is provided, THE I18n_Controller SHALL return 200 status with translation bundle
9. WHEN a valid Kannada language code is provided, THE I18n_Controller SHALL return 200 status with translation bundle
10. WHEN a valid Malayalam language code is provided, THE I18n_Controller SHALL return 200 status with translation bundle
11. WHEN a valid Odia language code is provided, THE I18n_Controller SHALL return 200 status with translation bundle
12. THE I18n_Controller SHALL call fs.readFile with the correct translation file path
13. THE I18n_Controller SHALL parse the translation file as JSON
14. THE I18n_Controller SHALL return the parsed translation object directly

### Requirement 4: GET /api/i18n/translations/:lang - Error Cases

**User Story:** As a developer, I want comprehensive tests for translation retrieval error scenarios, so that I can verify proper error handling for invalid languages and file errors.

#### Acceptance Criteria

1. WHEN an unsupported language code is provided, THE I18n_Controller SHALL return 400 status with error message
2. WHEN an unsupported language code is provided, THE I18n_Controller SHALL include "Unsupported language" in the error message
3. WHEN an unsupported language code is provided, THE I18n_Controller SHALL set success field to false
4. WHEN the translation file does not exist, THE I18n_Controller SHALL return 500 status with error message
5. WHEN the translation file cannot be read, THE I18n_Controller SHALL return 500 status with "Failed to load translations" message
6. WHEN the translation file contains invalid JSON, THE I18n_Controller SHALL return 500 status with error message
7. THE I18n_Controller SHALL not call fs.readFile when language validation fails

### Requirement 5: GET /api/i18n/languages - Success Cases

**User Story:** As a developer, I want comprehensive tests for supported languages retrieval, so that I can verify the endpoint returns all 11 supported languages correctly.

#### Acceptance Criteria

1. WHEN the endpoint is called, THE I18n_Controller SHALL return 200 status with languages array
2. WHEN the endpoint is called, THE I18n_Controller SHALL call i18nService.getSupportedLanguages exactly once
3. WHEN the endpoint is called, THE I18n_Controller SHALL return success field set to true
4. WHEN the endpoint is called, THE I18n_Controller SHALL return languages array containing all 11 supported languages
5. THE I18n_Controller SHALL return language objects with code, name, and nativeName fields
6. THE I18n_Controller SHALL return English language with code "en"
7. THE I18n_Controller SHALL return Hindi language with code "hi"
8. THE I18n_Controller SHALL return Punjabi language with code "pa"
9. THE I18n_Controller SHALL return Marathi language with code "mr"
10. THE I18n_Controller SHALL return Tamil language with code "ta"
11. THE I18n_Controller SHALL return Telugu language with code "te"
12. THE I18n_Controller SHALL return Bengali language with code "bn"
13. THE I18n_Controller SHALL return Gujarati language with code "gu"
14. THE I18n_Controller SHALL return Kannada language with code "kn"
15. THE I18n_Controller SHALL return Malayalam language with code "ml"
16. THE I18n_Controller SHALL return Odia language with code "or"

### Requirement 6: GET /api/i18n/languages - Error Cases

**User Story:** As a developer, I want comprehensive tests for supported languages retrieval error scenarios, so that I can verify proper error handling when service fails.

#### Acceptance Criteria

1. WHEN i18nService.getSupportedLanguages throws an error, THE I18n_Controller SHALL return 500 status
2. WHEN i18nService.getSupportedLanguages throws an error, THE I18n_Controller SHALL return success field set to false
3. WHEN i18nService.getSupportedLanguages throws an error, THE I18n_Controller SHALL return "Failed to get supported languages" message
4. THE I18n_Controller SHALL log the error to console

### Requirement 7: GET /api/i18n/validate - Success Cases

**User Story:** As a developer, I want comprehensive tests for translation validation, so that I can verify completeness checking works correctly.

#### Acceptance Criteria

1. WHEN validation is requested, THE I18n_Controller SHALL call i18nService.initialize exactly once
2. WHEN validation is requested, THE I18n_Controller SHALL call i18nService.validateTranslationCompleteness exactly once
3. WHEN all translations are complete, THE I18n_Controller SHALL return 200 status with empty incomplete array
4. WHEN all translations are complete, THE I18n_Controller SHALL return totalMissing count of 0
5. WHEN some translations are incomplete, THE I18n_Controller SHALL return 200 status with incomplete languages array
6. WHEN some translations are incomplete, THE I18n_Controller SHALL return missingKeys array with missing key details
7. WHEN some translations are incomplete, THE I18n_Controller SHALL return correct totalMissing count
8. THE I18n_Controller SHALL return success field set to true
9. THE I18n_Controller SHALL return validation object with incomplete, missingKeys, and totalMissing fields

### Requirement 8: GET /api/i18n/validate - Error Cases

**User Story:** As a developer, I want comprehensive tests for translation validation error scenarios, so that I can verify proper error handling when validation fails.

#### Acceptance Criteria

1. WHEN i18nService.initialize throws an error, THE I18n_Controller SHALL return 500 status
2. WHEN i18nService.validateTranslationCompleteness throws an error, THE I18n_Controller SHALL return 500 status
3. WHEN validation fails, THE I18n_Controller SHALL return success field set to false
4. WHEN validation fails, THE I18n_Controller SHALL return "Failed to validate translations" message
5. THE I18n_Controller SHALL log the error to console

### Requirement 9: POST /api/i18n/change-language - Success Cases

**User Story:** As a developer, I want comprehensive tests for language preference changes, so that I can verify user language updates work correctly.

#### Acceptance Criteria

1. WHEN valid userId and languageCode are provided, THE I18n_Controller SHALL return 200 status with success message
2. WHEN valid userId and languageCode are provided, THE I18n_Controller SHALL call i18nService.changeLanguage with correct parameters
3. WHEN valid userId and languageCode are provided, THE I18n_Controller SHALL return success field set to true
4. WHEN valid userId and languageCode are provided, THE I18n_Controller SHALL return "Language preference updated successfully" message
5. WHEN valid userId and languageCode are provided, THE I18n_Controller SHALL return the language code in response
6. THE I18n_Controller SHALL accept all 11 supported language codes
7. THE I18n_Controller SHALL call i18nService.changeLanguage exactly once per request

### Requirement 10: POST /api/i18n/change-language - Validation Error Cases

**User Story:** As a developer, I want comprehensive tests for language preference change validation, so that I can verify required field validation works correctly.

#### Acceptance Criteria

1. WHEN userId is missing, THE I18n_Controller SHALL return 400 status with error message
2. WHEN languageCode is missing, THE I18n_Controller SHALL return 400 status with error message
3. WHEN both userId and languageCode are missing, THE I18n_Controller SHALL return 400 status with error message
4. WHEN required fields are missing, THE I18n_Controller SHALL return "userId and languageCode are required" message
5. WHEN required fields are missing, THE I18n_Controller SHALL return success field set to false
6. WHEN validation fails, THE I18n_Controller SHALL not call i18nService.changeLanguage

### Requirement 11: POST /api/i18n/change-language - Service Error Cases

**User Story:** As a developer, I want comprehensive tests for language preference change service errors, so that I can verify proper error handling when service operations fail.

#### Acceptance Criteria

1. WHEN i18nService.changeLanguage throws an error with message, THE I18n_Controller SHALL return 500 status
2. WHEN i18nService.changeLanguage throws an error with message, THE I18n_Controller SHALL return the error message
3. WHEN i18nService.changeLanguage throws an error without message, THE I18n_Controller SHALL return "Failed to change language" message
4. WHEN service fails, THE I18n_Controller SHALL return success field set to false
5. THE I18n_Controller SHALL log the error to console

### Requirement 12: GET /api/i18n/user-language/:userId - Success Cases

**User Story:** As a developer, I want comprehensive tests for user language preference retrieval, so that I can verify language preference fetching works correctly.

#### Acceptance Criteria

1. WHEN a valid userId is provided, THE I18n_Controller SHALL return 200 status with language code
2. WHEN a valid userId is provided, THE I18n_Controller SHALL call i18nService.getUserLanguagePreference with the userId
3. WHEN a valid userId is provided, THE I18n_Controller SHALL return success field set to true
4. WHEN a valid userId is provided, THE I18n_Controller SHALL return the language code in response
5. THE I18n_Controller SHALL call i18nService.getUserLanguagePreference exactly once per request
6. THE I18n_Controller SHALL return language codes for all 11 supported languages

### Requirement 13: GET /api/i18n/user-language/:userId - Error Cases

**User Story:** As a developer, I want comprehensive tests for user language preference retrieval errors, so that I can verify proper error handling when service fails.

#### Acceptance Criteria

1. WHEN i18nService.getUserLanguagePreference throws an error, THE I18n_Controller SHALL return 500 status
2. WHEN i18nService.getUserLanguagePreference throws an error, THE I18n_Controller SHALL return success field set to false
3. WHEN i18nService.getUserLanguagePreference throws an error, THE I18n_Controller SHALL return "Failed to get user language preference" message
4. THE I18n_Controller SHALL log the error to console

### Requirement 14: Service Mock Isolation

**User Story:** As a developer, I want complete service mocking, so that tests run fast without real file system or database operations.

#### Acceptance Criteria

1. THE Test_Suite SHALL mock i18nService.getSupportedLanguages with jest.fn()
2. THE Test_Suite SHALL mock i18nService.initialize with jest.fn()
3. THE Test_Suite SHALL mock i18nService.validateTranslationCompleteness with jest.fn()
4. THE Test_Suite SHALL mock i18nService.changeLanguage with jest.fn()
5. THE Test_Suite SHALL mock i18nService.getUserLanguagePreference with jest.fn()
6. THE Test_Suite SHALL mock fs.readFile with jest.fn()
7. THE Test_Suite SHALL configure mock return values using mockResolvedValue for async operations
8. THE Test_Suite SHALL verify no real file system or database operations occur during tests

### Requirement 15: Error Response Consistency

**User Story:** As a developer, I want tests that verify consistent error response formats, so that API consumers receive predictable error structures.

#### Acceptance Criteria

1. FOR ALL endpoints, WHEN a 400 error occurs, THE I18n_Controller SHALL return success field set to false
2. FOR ALL endpoints, WHEN a 400 error occurs, THE I18n_Controller SHALL return a message field with error description
3. FOR ALL endpoints, WHEN a 500 error occurs, THE I18n_Controller SHALL return success field set to false
4. FOR ALL endpoints, WHEN a 500 error occurs, THE I18n_Controller SHALL return a message field with error description
5. THE Test_Suite SHALL verify all error responses use consistent JSON structure with success and message fields
6. THE Test_Suite SHALL verify 500 errors do not expose sensitive internal details

### Requirement 16: Service Method Call Verification

**User Story:** As a developer, I want to verify service method calls, so that I can ensure the controller properly delegates to the service layer.

#### Acceptance Criteria

1. FOR ALL endpoints, THE Test_Suite SHALL verify the correct service method is called
2. FOR ALL endpoints, THE Test_Suite SHALL verify service methods are called with correct parameters
3. FOR ALL endpoints, THE Test_Suite SHALL verify service methods are called exactly once per request
4. FOR ALL endpoints, THE Test_Suite SHALL verify service methods are not called when validation fails
5. THE Test_Suite SHALL use jest.mock assertions to verify call counts and parameters

### Requirement 17: Code Coverage Target

**User Story:** As a developer, I want to achieve 80%+ code coverage for i18n.controller.ts, so that I can ensure comprehensive testing of the controller.

#### Acceptance Criteria

1. THE Test_Suite SHALL achieve at least 80% line coverage for i18n.controller.ts
2. THE Test_Suite SHALL achieve at least 80% branch coverage for i18n.controller.ts
3. THE Test_Suite SHALL test all 5 endpoint handlers
4. THE Test_Suite SHALL test all success paths for each endpoint
5. THE Test_Suite SHALL test all error paths for each endpoint
6. THE Test_Suite SHALL test all validation paths for endpoints with validation
7. THE Test_Suite SHALL test language code validation against SUPPORTED_LANGUAGES array

### Requirement 18: Test Organization and Documentation

**User Story:** As a developer, I want well-organized and documented tests, so that I can understand and maintain the test suite.

#### Acceptance Criteria

1. THE Test_Suite SHALL organize tests using describe blocks for each endpoint
2. THE Test_Suite SHALL use nested describe blocks for success and error cases
3. THE Test_Suite SHALL use descriptive test names that explain what is being tested
4. THE Test_Suite SHALL include comments explaining complex test scenarios
5. THE Test_Suite SHALL follow the same organization pattern as marketplace-controller-tests
6. THE Test_Suite SHALL use consistent naming conventions for test data and mocks
7. THE Test_Suite SHALL be located in src/features/i18n/__tests__/i18n.controller.test.ts

### Requirement 19: Multi-Language Coverage Testing

**User Story:** As a developer, I want tests that verify all 11 supported languages, so that I can ensure the system works correctly for all Indian languages.

#### Acceptance Criteria

1. THE Test_Suite SHALL test translation retrieval for all 11 language codes (en, hi, pa, mr, ta, te, bn, gu, kn, ml, or)
2. THE Test_Suite SHALL verify getSupportedLanguages returns all 11 languages
3. THE Test_Suite SHALL test changeLanguage with all 11 language codes
4. THE Test_Suite SHALL test getUserLanguage returns all 11 language codes
5. THE Test_Suite SHALL verify language validation rejects codes not in the supported list
6. THE Test_Suite SHALL use parameterized tests or test.each for testing multiple languages

### Requirement 20: File System Mock Strategy

**User Story:** As a developer, I want a clear mock strategy for file system operations, so that I can test controller logic in isolation from file system implementation.

#### Acceptance Criteria

1. THE Test_Suite SHALL mock fs.readFile to return realistic translation bundle JSON strings
2. THE Test_Suite SHALL configure fs.readFile to simulate file not found errors
3. THE Test_Suite SHALL configure fs.readFile to simulate file read errors
4. THE Test_Suite SHALL configure fs.readFile to simulate invalid JSON errors
5. THE Test_Suite SHALL verify controller error handling when fs.readFile throws errors
6. THE Test_Suite SHALL not require real translation files for controller tests
7. THE Test_Suite SHALL verify correct file paths are constructed for each language code
