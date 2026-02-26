# Implementation Plan: Transaction Controller Integration Tests

## Overview

This implementation plan breaks down the creation of a comprehensive integration test suite for the Transaction Controller. The test suite will achieve 80%+ coverage through systematic testing of all 7 transaction endpoints, including success cases, error cases, validation, and error consistency tests. The implementation uses Jest, Supertest, and follows the project's established testing patterns from auth.controller.test.ts and marketplace.controller.test.ts.

## Tasks

- [ ] 1. Set up test infrastructure and helpers
  - [ ] 1.1 Create test file structure and module mocks
    - Create `src/features/transactions/__tests__/transaction.controller.test.ts`
    - Set up jest.mock() for transaction.service module
    - Configure Express test app with supertest
    - Mount transactionController on test app
    - _Requirements: 1.1, 1.2, 1.5, 1.7_

  - [ ] 1.2 Create mock DatabaseManager and global setup
    - Create mock DatabaseManager with required methods
    - Assign mock to global.sharedDbManager
    - Set up beforeEach hook to clear all mocks
    - Set up afterAll hook to clean up global.sharedDbManager
    - _Requirements: 1.3, 1.4, 1.6_

  - [ ] 1.3 Create test data factories and constants
    - Create createTestTransaction factory function with partial overrides support
    - Create createTestEscrow factory function
    - Create createTestTransactionRequest factory function
    - Create createTestLockPaymentResult factory function
    - Create createTestReleaseFundsResult factory function
    - Define TEST_TRANSACTION_IDS, TEST_LISTING_IDS, TEST_FARMER_IDS, TEST_BUYER_IDS, TEST_AMOUNTS constants
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [ ] 1.4 Create mock service configuration helpers
    - Create createMockTransactionService function
    - Configure mock return values using mockResolvedValue
    - _Requirements: 2.1_

- [ ] 2. Implement POST /api/transactions endpoint tests
  - [ ] 2.1 Write success case tests for initiate purchase
    - Test valid purchase data returns 201 status with created transaction
    - Test response body contains all expected fields (id, listingId, farmerId, buyerId, amount, status, createdAt, updatedAt)
    - Test initial status is set to PENDING
    - Verify transactionService.initiatePurchase called with correct parameters
    - _Requirements: 3.1, 3.2, 3.8, 3.9_

  - [ ] 2.2 Write validation tests for initiate purchase
    - Test missing listingId returns 400 status with error message
    - Test missing farmerId returns 400 status with error message
    - Test missing amount returns 400 status with error message
    - Test missing buyerId uses farmerId as effectiveBuyerId
    - Verify service not called when validation fails
    - _Requirements: 3.3, 3.4, 3.5, 3.6, 11.4_

  - [ ] 2.3 Write error case tests for initiate purchase
    - Test service error returns 500 status with error message
    - Test error response contains error field
    - Verify error message does not expose sensitive details
    - _Requirements: 3.7, 10.1, 10.3, 10.4_

- [ ] 3. Implement POST /api/transactions/:id/accept endpoint tests
  - [ ] 3.1 Write success case tests for accept order
    - Test valid transaction ID returns 200 status with transaction and escrow
    - Test response contains both transaction and escrow objects
    - Test transaction status updated to ACCEPTED
    - Test escrow created with status CREATED and isLocked false
    - Verify transactionService.acceptOrder called with transaction ID
    - Verify transactionService.createEscrow called with transaction ID and amount
    - _Requirements: 4.1, 4.2, 4.3, 4.6, 4.7, 4.8_

  - [ ] 3.2 Write error case tests for accept order
    - Test transaction not found returns 404 status with error message
    - Test service error returns 500 status with error message
    - Test error response contains error field
    - _Requirements: 4.4, 4.5, 10.2_

- [ ] 4. Implement POST /api/transactions/:id/lock-payment endpoint tests
  - [ ] 4.1 Write success case tests for lock payment
    - Test valid transaction ID returns 200 status with transaction and escrow
    - Test response contains both transaction and escrow objects
    - Test transaction status updated to PAYMENT_LOCKED
    - Test escrow isLocked set to true
    - Verify transactionService.lockPayment called with transaction ID
    - _Requirements: 5.1, 5.2, 5.5, 5.6, 5.7_

  - [ ] 4.2 Write error case tests for lock payment
    - Test transaction or escrow not found returns 404 status with error message
    - Test service error returns 500 status with error message
    - Test error response contains error field
    - _Requirements: 5.3, 5.4, 10.2_

- [ ] 5. Checkpoint - Ensure basic endpoint tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implement POST /api/transactions/:id/dispatch endpoint tests
  - [ ] 6.1 Write success case tests for mark dispatched
    - Test valid transaction ID returns 200 status with updated transaction
    - Test transaction status updated to IN_TRANSIT
    - Verify transactionService.markDispatched called with transaction ID
    - _Requirements: 6.1, 6.2, 6.5_

  - [ ] 6.2 Write error case tests for mark dispatched
    - Test transaction not found returns 404 status with error message
    - Test service error returns 500 status with error message
    - Test error response contains error field
    - _Requirements: 6.3, 6.4, 10.2_

- [ ] 7. Implement POST /api/transactions/:id/deliver endpoint tests
  - [ ] 7.1 Write success case tests for mark delivered
    - Test valid transaction ID returns 200 status with updated transaction
    - Test transaction status updated to DELIVERED
    - Verify transactionService.markDelivered called with transaction ID
    - _Requirements: 7.1, 7.2, 7.5_

  - [ ] 7.2 Write error case tests for mark delivered
    - Test transaction not found returns 404 status with error message
    - Test service error returns 500 status with error message
    - Test error response contains error field
    - _Requirements: 7.3, 7.4, 10.2_

- [ ] 8. Implement POST /api/transactions/:id/release-funds endpoint tests
  - [ ] 8.1 Write success case tests for release funds
    - Test valid transaction ID returns 200 status with transaction and escrow
    - Test response contains both transaction and escrow objects
    - Test transaction status updated to COMPLETED
    - Test escrow isLocked set to false
    - Verify transactionService.releaseFunds called with transaction ID
    - _Requirements: 8.1, 8.2, 8.5, 8.6, 8.7_

  - [ ] 8.2 Write error case tests for release funds
    - Test transaction or escrow not found returns 404 status with error message
    - Test service error returns 500 status with error message
    - Test error response contains error field
    - _Requirements: 8.3, 8.4, 10.2_

- [ ] 9. Implement GET /api/transactions/:id endpoint tests
  - [ ] 9.1 Write success case tests for get transaction
    - Test valid transaction ID returns 200 status with transaction object
    - Test response body contains all expected fields
    - Verify transactionService.getTransaction called with transaction ID
    - _Requirements: 9.1, 9.2, 9.5_

  - [ ] 9.2 Write error case tests for get transaction
    - Test transaction not found returns 404 status with error message
    - Test service error returns 500 status with error message
    - Test error response contains error field
    - _Requirements: 9.3, 9.4, 10.2_

- [ ] 10. Checkpoint - Ensure all endpoint tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Implement error response consistency tests
  - [ ] 11.1 Write tests for error response format consistency
    - Test all 400 errors contain error field with string message
    - Test all 404 errors contain error field with consistent "not found" message
    - Test all 500 errors contain error field with consistent error message
    - Test all error responses use consistent JSON structure
    - Test 500 errors do not expose sensitive internal details (stack traces, database details)
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

- [ ] 12. Implement service method call verification tests
  - [ ] 12.1 Write tests for service delegation
    - Test correct service method called for each endpoint
    - Test service methods called with correct parameters
    - Test service methods called exactly once per request
    - Test service methods not called when validation fails
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [ ]* 13. Implement property-based tests
  - [ ]* 13.1 Create property-based test file structure
    - Create `src/features/transactions/__tests__/transaction.controller.pbt.test.ts`
    - Set up fast-check imports and test structure
    - Configure numRuns to 100 for all properties
    - _Requirements: 13.1_

  - [ ]* 13.2 Write property test for service error handling
    - **Property 1: Service Error Handling**
    - **Validates: Requirements 3.7, 4.5, 5.4, 6.4, 7.4, 8.4, 9.4, 10.3, 10.4**
    - Test any endpoint with any service error returns 500 status without sensitive details
    - _Requirements: 3.7, 4.5, 5.4, 6.4, 7.4, 8.4, 9.4, 10.3, 10.4_

  - [ ]* 13.3 Write property test for transaction response structure
    - **Property 2: Transaction Response Structure**
    - **Validates: Requirements 3.8, 9.5**
    - Test any successful transaction response contains all expected fields
    - _Requirements: 3.8, 9.5_

  - [ ]* 13.4 Write property test for error response structure
    - **Property 3: Error Response Structure**
    - **Validates: Requirements 10.1, 10.2**
    - Test any error response contains error field with string message and consistent JSON structure
    - _Requirements: 10.1, 10.2_

  - [ ]* 13.5 Write property test for error message consistency
    - **Property 4: Error Message Consistency**
    - **Validates: Requirements 10.5, 10.6**
    - Test any error status code uses consistent error message patterns across endpoints
    - _Requirements: 10.5, 10.6_

- [ ] 14. Verify test coverage and generate coverage report
  - [ ] 14.1 Run tests with coverage and verify thresholds
    - Run `npm test -- transaction.controller --coverage`
    - Verify transaction.controller.ts achieves at least 80% line coverage
    - Verify transaction.controller.ts achieves at least 80% branch coverage
    - Identify any uncovered code paths
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

  - [ ] 14.2 Add tests for uncovered code paths if needed
    - Review coverage report for gaps
    - Add tests for uncovered branches
    - Add tests for uncovered error paths
    - _Requirements: 12.1, 12.2_

- [ ] 15. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Integration tests validate HTTP endpoint behavior with mocked services
- All tests use mocked transaction service for complete isolation
- Test suite targets 80%+ line coverage and 80%+ branch coverage
- Follow patterns from auth.controller.test.ts and marketplace.controller.test.ts for consistency
