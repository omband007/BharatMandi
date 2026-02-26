# Implementation Plan: I18n Controller Integration Tests

## Overview

This implementation plan breaks down the creation of a comprehensive integration test suite for the I18n Controller. The test suite will achieve 80%+ coverage through systematic testing of all 5 internationalization endpoints, including success cases for all 11 supported Indian languages, error cases, validation, and error consistency tests. The implementation uses Jest, Supertest, and follows the project's established testing patterns from marketplace-controller-tests and transaction-controller-tests.

## Tasks

- [ ] 1. Set up test infrastructure and helpers
  - [ ] 1.1 Create test file structure and module mocks
    - Create `src/features/i18n/__tests__/i18n.controller.test.ts`
    - Set up jest.mock() for i18n.service module
    - Set up jest.mock() for fs/promises module
    - Configure Express test app with supertest
    - Mount i18nController on test app with all 5 routes
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 1.7, 18.7_

  - [ ] 1.2 Create mock DatabaseManager and global setup
    - Create mock DatabaseManager with required methods
    - Assign mock to global.sharedDbManager
    - Set up beforeEach hook to clear all mocks
    - Set up afterAll hook to clean up global.sharedDbManager
    - _Requirements: 1.4, 1.6_

  - [ ] 1.3 Create test data factories and constants
    - Create createTestTranslationBundle factory function with partial overrides support
    - Create createTestLanguageConfig factory function
    - Create createTestValidationResult factory function
    - Define TEST_USER_IDS constant array
    - Define SUPPORTED_LANGUAGE_CODES constant array with all 11 languages (en, hi, pa, mr, ta, te, bn, gu, kn, ml, or)
    - Define UNSUPPORTED_LANGUAGE_CODES constant array for testing
    - Define TEST_TRANSLATION_KEYS constant array
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [ ] 1.4 Create mock service configuration helpers
    - Create createMockI18nService function
    - Create createMockFsPromises function
    - Configure mock return values using mockResolvedValue
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7_

- [ ] 2. Implement GET /api/i18n/translations/:lang endpoint tests
  - [ ] 2.1 Write success case tests for all 11 supported languages
    - Test English (en) returns 200 status with translation bundle
    - Test Hindi (hi) returns 200 status with translation bundle
    - Test Punjabi (pa) returns 200 status with translation bundle
    - Test Marathi (mr) returns 200 status with translation bundle
    - Test Tamil (ta) returns 200 status with translation bundle
    - Test Telugu (te) returns 200 status with translation bundle
    - Test Bengali (bn) returns 200 status with translation bundle
    - Test Gujarati (gu) returns 200 status with translation bundle
    - Test Kannada (kn) returns 200 status with translation bundle
    - Test Malayalam (ml) returns 200 status with translation bundle
    - Test Odia (or) returns 200 status with translation bundle
    - Verify fs.readFile called with correct path format for each language
    - Verify translation bundle is parsed JSON and returned directly
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 3.12, 3.13, 3.14, 19.1_

  - [ ]* 2.2 Write property test for translation retrieval
    - **Property 1: Translation Retrieval for Supported Languages**
    - **Validates: Requirements 3.1-3.11, 3.13, 3.14**
    - Test any supported language code returns 200 with parsed translation bundle
    - _Requirements: 3.1-3.14_

  - [ ]* 2.3 Write property test for file path construction
    - **Property 2: File Path Construction**
    - **Validates: Requirements 3.12**
    - Test any supported language code calls fs.readFile with correct path format
    - _Requirements: 3.12, 20.7_

  - [ ] 2.4 Write error case tests for unsupported languages
    - Test unsupported language code returns 400 status
    - Test error response contains success: false
    - Test error message contains "Unsupported language"
    - Verify fs.readFile not called when validation fails
    - _Requirements: 4.1, 4.2, 4.3, 4.7, 19.5_

  - [ ]* 2.5 Write property test for unsupported language rejection
    - **Property 3: Unsupported Language Rejection**
    - **Validates: Requirements 4.1, 4.2, 4.3**
    - Test any unsupported language code returns 400 with error message
    - _Requirements: 4.1, 4.2, 4.3_

  - [ ]* 2.6 Write property test for validation before file operations
    - **Property 4: Validation Before File Operations**
    - **Validates: Requirements 4.7**
    - Test any unsupported language code does not call fs.readFile
    - _Requirements: 4.7_

  - [ ] 2.7 Write error case tests for file system errors
    - Test file not found returns 500 status with error message
    - Test file read error returns 500 status with "Failed to load translations"
    - Test invalid JSON returns 500 status with error message
    - _Requirements: 4.4, 4.5, 4.6, 20.2, 20.3, 20.4, 20.5_

- [ ] 3. Implement GET /api/i18n/languages endpoint tests
  - [ ] 3.1 Write success case tests for supported languages
    - Test endpoint returns 200 status with success: true
    - Test response contains languages array with all 11 languages
    - Test each language object has code, name, nativeName fields
    - Test English language with code "en" is present
    - Test Hindi language with code "hi" is present
    - Test Punjabi language with code "pa" is present
    - Test Marathi language with code "mr" is present
    - Test Tamil language with code "ta" is present
    - Test Telugu language with code "te" is present
    - Test Bengali language with code "bn" is present
    - Test Gujarati language with code "gu" is present
    - Test Kannada language with code "kn" is present
    - Test Malayalam language with code "ml" is present
    - Test Odia language with code "or" is present
    - Verify i18nService.getSupportedLanguages called exactly once
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 5.11, 5.12, 5.13, 5.14, 5.15, 5.16, 19.2_

  - [ ]* 3.2 Write property test for supported languages response structure
    - **Property 5: Supported Languages Response Structure**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4**
    - Test any successful request returns 200 with success: true and languages array
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ]* 3.3 Write property test for language configuration completeness
    - **Property 6: Language Configuration Completeness**
    - **Validates: Requirements 5.5-5.16**
    - Test any language object contains code, name, nativeName fields
    - _Requirements: 5.5-5.16_

  - [ ] 3.4 Write error case tests for supported languages
    - Test i18nService.getSupportedLanguages error returns 500 status
    - Test error response contains success: false
    - Test error message is "Failed to get supported languages"
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 4. Implement GET /api/i18n/validate endpoint tests
  - [ ] 4.1 Write success case tests for complete translations
    - Test complete translations return 200 status with success: true
    - Test response contains validation object with incomplete, missingKeys, totalMissing fields
    - Test incomplete array is empty when all translations complete
    - Test totalMissing is 0 when all translations complete
    - Verify i18nService.initialize called exactly once
    - Verify i18nService.validateTranslationCompleteness called exactly once
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.8, 7.9_

  - [ ] 4.2 Write success case tests for incomplete translations
    - Test incomplete translations return 200 status with success: true
    - Test response contains incomplete languages array
    - Test response contains missingKeys array with missing key details
    - Test totalMissing count is correct
    - _Requirements: 7.5, 7.6, 7.7, 7.8, 7.9_

  - [ ]* 4.3 Write property test for validation service delegation
    - **Property 7: Validation Service Delegation**
    - **Validates: Requirements 7.1, 7.2**
    - Test any validation request calls initialize and validateTranslationCompleteness exactly once
    - _Requirements: 7.1, 7.2_

  - [ ]* 4.4 Write property test for validation response structure
    - **Property 8: Validation Response Structure**
    - **Validates: Requirements 7.8, 7.9**
    - Test any validation result returns 200 with success: true and validation object
    - _Requirements: 7.8, 7.9_

  - [ ] 4.5 Write error case tests for validation failures
    - Test i18nService.initialize error returns 500 status
    - Test i18nService.validateTranslationCompleteness error returns 500 status
    - Test error response contains success: false
    - Test error message is "Failed to validate translations"
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 5. Checkpoint - Ensure basic endpoint tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implement POST /api/i18n/change-language endpoint tests
  - [ ] 6.1 Write success case tests for language change
    - Test valid userId and languageCode return 200 status with success: true
    - Test response contains "Language preference updated successfully" message
    - Test response contains the language code
    - Test all 11 supported language codes are accepted (parameterized test)
    - Verify i18nService.changeLanguage called with correct userId and languageCode
    - Verify i18nService.changeLanguage called exactly once per request
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 19.3_

  - [ ]* 6.2 Write property test for language change success response
    - **Property 9: Language Change Success Response**
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5**
    - Test any valid userId and supported languageCode returns 200 with success message
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ]* 6.3 Write property test for language change accepts all supported languages
    - **Property 10: Language Change Accepts All Supported Languages**
    - **Validates: Requirements 9.6, 9.7**
    - Test any of the 11 supported language codes is accepted with valid userId
    - _Requirements: 9.6, 9.7_

  - [ ] 6.4 Write validation error case tests
    - Test missing userId returns 400 status with error message
    - Test missing languageCode returns 400 status with error message
    - Test missing both fields returns 400 status with error message
    - Test error message is "userId and languageCode are required"
    - Test error response contains success: false
    - Verify i18nService.changeLanguage not called when validation fails
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [ ]* 6.5 Write property test for language change validation
    - **Property 11: Language Change Validation**
    - **Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5, 10.6**
    - Test any request missing userId or languageCode returns 400 without calling service
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [ ] 6.6 Write service error case tests
    - Test service error with message returns 500 status with error message
    - Test service error without message returns 500 status with "Failed to change language"
    - Test error response contains success: false
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [ ] 7. Implement GET /api/i18n/user-language/:userId endpoint tests
  - [ ] 7.1 Write success case tests for user language retrieval
    - Test valid userId returns 200 status with success: true
    - Test response contains language field with language code
    - Test response can contain any of the 11 supported languages
    - Verify i18nService.getUserLanguagePreference called with correct userId
    - Verify i18nService.getUserLanguagePreference called exactly once per request
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 19.4_

  - [ ]* 7.2 Write property test for user language retrieval response structure
    - **Property 12: User Language Retrieval Response Structure**
    - **Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5, 12.6**
    - Test any valid userId returns 200 with success: true and supported language code
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_

  - [ ] 7.3 Write error case tests for user language retrieval
    - Test service error returns 500 status
    - Test error response contains success: false
    - Test error message is "Failed to get user language preference"
    - _Requirements: 13.1, 13.2, 13.3, 13.4_

- [ ] 8. Checkpoint - Ensure all endpoint tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Implement error response consistency tests
  - [ ] 9.1 Write tests for 400 error format consistency
    - Test all 400 errors contain success: false
    - Test all 400 errors contain message field with error description
    - Test all 400 error responses use consistent JSON structure
    - _Requirements: 15.1, 15.2, 15.5_

  - [ ] 9.2 Write tests for 500 error format consistency
    - Test all 500 errors contain success: false
    - Test all 500 errors contain message field with error description
    - Test all 500 error responses use consistent JSON structure
    - Test 500 errors do not expose sensitive internal details (file paths, stack traces)
    - _Requirements: 15.3, 15.4, 15.5, 15.6_

  - [ ]* 9.3 Write property test for error response consistency
    - **Property 13: Error Response Consistency**
    - **Validates: Requirements 15.1, 15.2, 15.3, 15.4, 15.5**
    - Test any endpoint with any error returns consistent JSON structure with success: false and message
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

  - [ ]* 9.4 Write property test for sensitive information protection
    - **Property 14: Sensitive Information Protection**
    - **Validates: Requirements 15.6**
    - Test any 500 error response does not expose sensitive internal details
    - _Requirements: 15.6_

- [ ] 10. Implement service method call verification tests
  - [ ] 10.1 Write tests for service delegation
    - Test GET /api/i18n/translations/:lang calls fs.readFile with correct parameters
    - Test GET /api/i18n/languages calls i18nService.getSupportedLanguages exactly once
    - Test GET /api/i18n/validate calls i18nService.initialize and validateTranslationCompleteness
    - Test POST /api/i18n/change-language calls i18nService.changeLanguage with correct parameters
    - Test GET /api/i18n/user-language/:userId calls i18nService.getUserLanguagePreference with correct userId
    - _Requirements: 16.1, 16.2, 16.3_

  - [ ] 10.2 Write tests for service call prevention on validation failure
    - Test unsupported language does not call fs.readFile
    - Test missing userId or languageCode does not call i18nService.changeLanguage
    - _Requirements: 16.4_

  - [ ]* 10.3 Write property test for service method call verification
    - **Property 15: Service Method Call Verification**
    - **Validates: Requirements 16.1, 16.2, 16.3**
    - Test any endpoint with valid parameters calls corresponding service method exactly once
    - _Requirements: 16.1, 16.2, 16.3, 16.5_

  - [ ]* 10.4 Write property test for service call prevention on validation failure
    - **Property 16: Service Method Call Prevention on Validation Failure**
    - **Validates: Requirements 16.4**
    - Test any endpoint with validation failure does not call service method
    - _Requirements: 16.4_

- [ ] 11. Verify test coverage and generate coverage report
  - [ ] 11.1 Run tests with coverage and verify thresholds
    - Run `npm test -- i18n.controller --coverage`
    - Verify i18n.controller.ts achieves at least 80% line coverage
    - Verify i18n.controller.ts achieves at least 80% branch coverage
    - Identify any uncovered code paths
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7_

  - [ ] 11.2 Add tests for uncovered code paths if needed
    - Review coverage report for gaps
    - Add tests for uncovered branches
    - Add tests for uncovered error paths
    - Add tests for edge cases
    - _Requirements: 17.1, 17.2_

- [ ] 12. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Integration tests validate HTTP endpoint behavior with mocked services
- All tests use mocked i18n service and file system for complete isolation
- Test suite targets 80%+ line coverage and 80%+ branch coverage
- Follow patterns from marketplace-controller-tests and transaction-controller-tests for consistency
- All 11 supported Indian languages (en, hi, pa, mr, ta, te, bn, gu, kn, ml, or) are tested
- Use parameterized tests or test.each for testing multiple languages efficiently
