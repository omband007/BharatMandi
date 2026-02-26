# Requirements Document: Transaction Controller Tests

## Introduction

This document specifies the requirements for comprehensive integration tests for the Transaction Controller. The Transaction Controller manages the complete order lifecycle from purchase initiation through payment release, including escrow management. The tests will verify all 7 endpoints with complete service mocking, validation testing, error handling, and achieve 80%+ code coverage following established patterns from auth.controller.test.ts and marketplace.controller.test.ts.

## Glossary

- **Transaction_Controller**: The Express router handling HTTP requests for transaction operations
- **Transaction_Service**: The service layer managing transaction and escrow business logic
- **Test_Suite**: The Jest test suite containing all test cases for the Transaction Controller
- **Mock_Service**: A Jest mock implementation of the Transaction Service for isolated testing
- **Test_Factory**: A function that creates test data objects with sensible defaults
- **Supertest**: The HTTP testing library used to make requests to the controller
- **Escrow_Account**: A temporary holding account for transaction funds
- **Order_Lifecycle**: The sequence of states from purchase initiation to completion
- **Coverage_Target**: The minimum 80% code coverage requirement

## Requirements

### Requirement 1: Test Infrastructure Setup

**User Story:** As a developer, I want a properly configured test infrastructure, so that I can run isolated controller tests without database dependencies.

#### Acceptance Criteria

1. THE Test_Suite SHALL import and configure the Transaction Controller with Express
2. THE Test_Suite SHALL mock the transaction.service module using jest.mock
3. THE Test_Suite SHALL create a Mock_Service with all Transaction_Service methods
4. THE Test_Suite SHALL configure Mock_Service methods to replace actual service implementations
5. THE Test_Suite SHALL use supertest for HTTP request testing
6. WHEN each test begins, THE Test_Suite SHALL clear all mock call history
7. THE Test_Suite SHALL follow the same infrastructure pattern as auth.controller.test.ts

### Requirement 2: Test Helper Functions

**User Story:** As a developer, I want reusable test helper functions, so that I can create test data efficiently and maintain consistency.

#### Acceptance Criteria

1. THE Test_Suite SHALL provide a createMockTransactionService factory function
2. THE Test_Suite SHALL provide a createTestTransaction Test_Factory
3. THE Test_Suite SHALL provide a createTestEscrow Test_Factory
4. THE Test_Suite SHALL provide a createTestTransactionRequest Test_Factory
5. THE Test_Suite SHALL provide test constants for transaction IDs, farmer IDs, buyer IDs, and listing IDs
6. THE Test_Suite SHALL support partial overrides in all Test_Factory functions
7. THE Test_Suite SHALL create test data with realistic default values

### Requirement 3: POST /api/transactions - Initiate Purchase Tests

**User Story:** As a developer, I want comprehensive tests for purchase initiation, so that I can verify the endpoint handles all success and error cases correctly.

#### Acceptance Criteria

1. WHEN valid purchase data is provided, THE Transaction_Controller SHALL return 201 status with created transaction
2. WHEN valid purchase data is provided, THE Transaction_Controller SHALL call transactionService.initiatePurchase with correct parameters
3. WHEN listingId is missing, THE Transaction_Controller SHALL return 400 status with error message
4. WHEN farmerId is missing, THE Transaction_Controller SHALL return 400 status with error message
5. WHEN amount is missing, THE Transaction_Controller SHALL return 400 status with error message
6. WHEN buyerId is missing, THE Transaction_Controller SHALL use farmerId as effectiveBuyerId
7. WHEN Transaction_Service throws an error, THE Transaction_Controller SHALL return 500 status with error message
8. THE Transaction_Controller SHALL return transaction with all expected fields (id, listingId, farmerId, buyerId, amount, status, createdAt, updatedAt)
9. THE Transaction_Controller SHALL set initial status to PENDING

### Requirement 4: POST /api/transactions/:id/accept - Accept Order Tests

**User Story:** As a developer, I want comprehensive tests for order acceptance, so that I can verify escrow creation and proper error handling.

#### Acceptance Criteria

1. WHEN a valid transaction ID is provided, THE Transaction_Controller SHALL return 200 status with transaction and escrow
2. WHEN a valid transaction ID is provided, THE Transaction_Controller SHALL call transactionService.acceptOrder with the transaction ID
3. WHEN a valid transaction ID is provided, THE Transaction_Controller SHALL call transactionService.createEscrow with transaction ID and amount
4. WHEN transaction is not found, THE Transaction_Controller SHALL return 404 status with error message
5. WHEN Transaction_Service throws an error, THE Transaction_Controller SHALL return 500 status with error message
6. THE Transaction_Controller SHALL return both transaction and escrow objects in response
7. THE Transaction_Controller SHALL update transaction status to ACCEPTED
8. THE Transaction_Controller SHALL create escrow with status CREATED and isLocked false

### Requirement 5: POST /api/transactions/:id/lock-payment - Lock Payment Tests

**User Story:** As a developer, I want comprehensive tests for payment locking, so that I can verify escrow locking and error handling.

#### Acceptance Criteria

1. WHEN a valid transaction ID is provided, THE Transaction_Controller SHALL return 200 status with transaction and escrow
2. WHEN a valid transaction ID is provided, THE Transaction_Controller SHALL call transactionService.lockPayment with the transaction ID
3. WHEN transaction or escrow is not found, THE Transaction_Controller SHALL return 404 status with error message
4. WHEN Transaction_Service throws an error, THE Transaction_Controller SHALL return 500 status with error message
5. THE Transaction_Controller SHALL return both transaction and escrow objects in response
6. THE Transaction_Controller SHALL update transaction status to PAYMENT_LOCKED
7. THE Transaction_Controller SHALL set escrow isLocked to true

### Requirement 6: POST /api/transactions/:id/dispatch - Mark Dispatched Tests

**User Story:** As a developer, I want comprehensive tests for dispatch marking, so that I can verify status updates and error handling.

#### Acceptance Criteria

1. WHEN a valid transaction ID is provided, THE Transaction_Controller SHALL return 200 status with updated transaction
2. WHEN a valid transaction ID is provided, THE Transaction_Controller SHALL call transactionService.markDispatched with the transaction ID
3. WHEN transaction is not found, THE Transaction_Controller SHALL return 404 status with error message
4. WHEN Transaction_Service throws an error, THE Transaction_Controller SHALL return 500 status with error message
5. THE Transaction_Controller SHALL update transaction status to IN_TRANSIT

### Requirement 7: POST /api/transactions/:id/deliver - Mark Delivered Tests

**User Story:** As a developer, I want comprehensive tests for delivery marking, so that I can verify status updates and error handling.

#### Acceptance Criteria

1. WHEN a valid transaction ID is provided, THE Transaction_Controller SHALL return 200 status with updated transaction
2. WHEN a valid transaction ID is provided, THE Transaction_Controller SHALL call transactionService.markDelivered with the transaction ID
3. WHEN transaction is not found, THE Transaction_Controller SHALL return 404 status with error message
4. WHEN Transaction_Service throws an error, THE Transaction_Controller SHALL return 500 status with error message
5. THE Transaction_Controller SHALL update transaction status to DELIVERED

### Requirement 8: POST /api/transactions/:id/release-funds - Release Funds Tests

**User Story:** As a developer, I want comprehensive tests for fund release, so that I can verify escrow release and completion flow.

#### Acceptance Criteria

1. WHEN a valid transaction ID is provided, THE Transaction_Controller SHALL return 200 status with transaction and escrow
2. WHEN a valid transaction ID is provided, THE Transaction_Controller SHALL call transactionService.releaseFunds with the transaction ID
3. WHEN transaction or escrow is not found, THE Transaction_Controller SHALL return 404 status with error message
4. WHEN Transaction_Service throws an error, THE Transaction_Controller SHALL return 500 status with error message
5. THE Transaction_Controller SHALL return both transaction and escrow objects in response
6. THE Transaction_Controller SHALL update transaction status to COMPLETED
7. THE Transaction_Controller SHALL set escrow isLocked to false

### Requirement 9: GET /api/transactions/:id - Get Transaction Tests

**User Story:** As a developer, I want comprehensive tests for transaction retrieval, so that I can verify data fetching and error handling.

#### Acceptance Criteria

1. WHEN a valid transaction ID is provided, THE Transaction_Controller SHALL return 200 status with transaction object
2. WHEN a valid transaction ID is provided, THE Transaction_Controller SHALL call transactionService.getTransaction with the transaction ID
3. WHEN transaction is not found, THE Transaction_Controller SHALL return 404 status with error message
4. WHEN Transaction_Service throws an error, THE Transaction_Controller SHALL return 500 status with error message
5. THE Transaction_Controller SHALL return transaction with all expected fields

### Requirement 10: Error Response Consistency

**User Story:** As a developer, I want consistent error responses across all endpoints, so that clients can handle errors predictably.

#### Acceptance Criteria

1. FOR ALL endpoints, WHEN an error occurs, THE Transaction_Controller SHALL return a response with an error field
2. FOR ALL endpoints, WHEN an error occurs, THE Transaction_Controller SHALL return a string error message
3. FOR ALL endpoints, WHEN Transaction_Service throws an error, THE Transaction_Controller SHALL not expose sensitive details
4. FOR ALL endpoints, WHEN Transaction_Service throws an error, THE Transaction_Controller SHALL not expose stack traces
5. FOR ALL 404 responses, THE Transaction_Controller SHALL use consistent error messages
6. FOR ALL 500 responses, THE Transaction_Controller SHALL use consistent error messages

### Requirement 11: Service Method Call Verification

**User Story:** As a developer, I want to verify service method calls, so that I can ensure the controller properly delegates to the service layer.

#### Acceptance Criteria

1. FOR ALL endpoints, THE Test_Suite SHALL verify the correct service method is called
2. FOR ALL endpoints, THE Test_Suite SHALL verify service methods are called with correct parameters
3. FOR ALL endpoints, THE Test_Suite SHALL verify service methods are called exactly once per request
4. FOR ALL endpoints, THE Test_Suite SHALL verify service methods are not called when validation fails

### Requirement 12: Code Coverage Target

**User Story:** As a developer, I want to achieve 80%+ code coverage, so that I can ensure comprehensive testing of the controller.

#### Acceptance Criteria

1. THE Test_Suite SHALL achieve at least 80% line coverage for transaction.controller.ts
2. THE Test_Suite SHALL achieve at least 80% branch coverage for transaction.controller.ts
3. THE Test_Suite SHALL test all success paths for all 7 endpoints
4. THE Test_Suite SHALL test all error paths for all 7 endpoints
5. THE Test_Suite SHALL test all validation paths for endpoints with validation

### Requirement 13: Test Organization and Documentation

**User Story:** As a developer, I want well-organized and documented tests, so that I can understand and maintain the test suite.

#### Acceptance Criteria

1. THE Test_Suite SHALL organize tests using describe blocks for each endpoint
2. THE Test_Suite SHALL use nested describe blocks for success and error cases
3. THE Test_Suite SHALL use descriptive test names that explain what is being tested
4. THE Test_Suite SHALL include comments explaining complex test scenarios
5. THE Test_Suite SHALL follow the same organization pattern as auth.controller.test.ts
6. THE Test_Suite SHALL use consistent naming conventions for test data and mocks
