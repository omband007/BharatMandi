# Design Document: Transaction Controller Tests

## Overview

This design document specifies the comprehensive unit test suite for the transaction controller. The test suite will achieve 80%+ code coverage while following established patterns from auth.controller.test.ts and marketplace.controller.test.ts, using complete service mocking for fast, isolated tests.

The transaction controller exposes 7 endpoints managing the complete order lifecycle:
- POST /api/transactions - Initiate a purchase
- POST /api/transactions/:id/accept - Accept an order
- POST /api/transactions/:id/lock-payment - Lock payment in escrow
- POST /api/transactions/:id/dispatch - Mark transaction as dispatched
- POST /api/transactions/:id/deliver - Mark transaction as delivered
- POST /api/transactions/:id/release-funds - Release funds from escrow
- GET /api/transactions/:id - Get transaction by ID

The test suite will use supertest for HTTP testing, Jest for mocking, and follow the test helper pattern established in the auth and marketplace controller tests.

## Architecture

### Test Infrastructure Components

```
transaction.controller.test.ts
├── Test App (Express + supertest)
├── Mock Services
│   └── transactionService (module mock)
├── Mock DatabaseManager (global.sharedDbManager)
└── Test Helpers
    ├── Data Factories
    ├── Mock Service Creators
    └── Test Constants
```

### Test Organization

The test suite will be organized into describe blocks matching the controller endpoints:

1. Test Infrastructure Setup (beforeEach/afterAll)
2. POST /api/transactions
3. POST /api/transactions/:id/accept
4. POST /api/transactions/:id/lock-payment
5. POST /api/transactions/:id/dispatch
6. POST /api/transactions/:id/deliver
7. POST /api/transactions/:id/release-funds
8. GET /api/transactions/:id
9. Error Response Consistency

### Mocking Strategy

**Complete Service Isolation:**
- Mock transactionService module using jest.mock()
- Mock DatabaseManager and assign to global.sharedDbManager
- No real database operations

**Mock Configuration:**
- Use mockResolvedValue for async service methods
- Clear all mocks in beforeEach
- Clean up global state in afterAll

## Components and Interfaces

### Test App Setup

```typescript
import request from 'supertest';
import express from 'express';
import { transactionController } from '../transaction.controller';

// Mock modules before imports
jest.mock('../transaction.service');

const app = express();
app.use(express.json());
app.use('/api/transactions', transactionController);
```

### Mock Service Interfaces

**TransactionService Mock:**
```typescript
interface MockTransactionService {
  initiatePurchase: jest.Mock;
  acceptOrder: jest.Mock;
  createEscrow: jest.Mock;
  lockPayment: jest.Mock;
  markDispatched: jest.Mock;
  markDelivered: jest.Mock;
  releaseFunds: jest.Mock;
  getTransaction: jest.Mock;
}
```

### Test Helper Functions

**Data Factories:**
- `createTestTransaction(overrides?)` - Generate transaction objects
- `createTestEscrow(overrides?)` - Generate escrow account objects
- `createTestTransactionRequest(overrides?)` - Generate request data
- `createTestLockPaymentResult(overrides?)` - Generate lock payment results
- `createTestReleaseFundsResult(overrides?)` - Generate release funds results

**Mock Service Creators:**
- `createMockTransactionService()` - Create transaction service mock
- `createMockDatabaseManager()` - Create database manager mock

**Test Constants:**
- `TEST_TRANSACTION_IDS` - Sample transaction IDs
- `TEST_LISTING_IDS` - Sample listing IDs
- `TEST_FARMER_IDS` - Sample farmer IDs
- `TEST_BUYER_IDS` - Sample buyer IDs
- `TEST_AMOUNTS` - Sample transaction amounts

## Data Models

### Test Transaction Model

```typescript
interface TestTransaction {
  id: string;
  listingId: string;
  farmerId: string;
  buyerId: string;
  amount: number;
  status: TransactionStatus;
  createdAt: Date;
  updatedAt: Date;
  dispatchedAt?: Date;
  deliveredAt?: Date;
  completedAt?: Date;
}
```

### Test Escrow Model

```typescript
interface TestEscrowAccount {
  id: string;
  transactionId: string;
  amount: number;
  status: EscrowStatus;
  isLocked: boolean;
  createdAt: Date;
  releasedAt?: Date;
}
```

### Test Transaction Request Model

```typescript
interface TestTransactionRequest {
  listingId: string;
  farmerId: string;
  buyerId?: string;
  amount: number;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Service Error Handling

*For any* endpoint, when the transaction service throws an error, the controller should return 500 status with an error message that does not expose sensitive internal details or stack traces.

**Validates: Requirements 3.7, 4.5, 5.4, 6.4, 7.4, 8.4, 9.4, 10.3, 10.4**

### Property 2: Transaction Response Structure

*For any* successful transaction response, the response should contain all expected fields (id, listingId, farmerId, buyerId, amount, status, createdAt, updatedAt).

**Validates: Requirements 3.8, 9.5**

### Property 3: Error Response Structure

*For any* error response (400, 404, 500), the response should contain an error field with a string message and use consistent JSON structure.

**Validates: Requirements 10.1, 10.2**

### Property 4: Error Message Consistency

*For any* error status code (404, 500), all endpoints returning that status code should use consistent error message patterns.

**Validates: Requirements 10.5, 10.6**

## Error Handling

### Error Categories

**Validation Errors (400):**
- Missing required fields (listingId, farmerId, amount)

**Not Found Errors (404):**
- Transaction ID does not exist
- Transaction or escrow not found

**Server Errors (500):**
- Service method throws error
- Database operation fails

### Error Response Format

All errors follow consistent JSON structure:
```typescript
{
  error: string;  // User-friendly error message
}
```

### Security Considerations

- 500 errors must not expose sensitive information (database connection strings, internal paths, stack traces)
- Error messages should be generic and user-friendly
- Detailed error logging should only go to console, not response

## Testing Strategy

### Dual Testing Approach

The test suite uses unit tests to verify controller behavior:

**Unit Tests:**
- Specific examples for each endpoint
- Edge cases (missing fields, not found scenarios)
- Error conditions (service failures, validation failures)
- Integration points (service method calls, parameter passing)
- Response structure validation
- Status code verification

**Test Coverage Strategy:**
- Test all 7 endpoints
- Test success paths for each endpoint
- Test error paths for each endpoint
- Test validation rules for POST /api/transactions
- Test service delegation and parameter passing
- Test response structure consistency

### Test Execution

**Test Configuration:**
- Use Jest as test runner
- Use supertest for HTTP testing
- Mock all external dependencies
- Clear mocks between tests

**Test Isolation:**
- Each test is independent
- No shared state between tests
- Clean up global state after all tests

### Coverage Target

- Minimum 80% line coverage for transaction.controller.ts
- Minimum 80% branch coverage for transaction.controller.ts
- All 7 endpoints tested
- All error paths tested
- All validation paths tested

## Test Implementation Plan

### Phase 1: Test Infrastructure

1. Create test file structure
2. Set up module mocks
3. Create test app with supertest
4. Configure global.sharedDbManager mock
5. Set up beforeEach/afterAll hooks

### Phase 2: Test Helpers

1. Create data factory functions
2. Create mock service creators
3. Create test constants

### Phase 3: Endpoint Tests

1. POST /api/transactions
   - Valid purchase creation
   - Missing listingId validation
   - Missing farmerId validation
   - Missing amount validation
   - Default buyerId behavior
   - Service error handling
   - Response structure validation
   - Initial status verification

2. POST /api/transactions/:id/accept
   - Valid order acceptance
   - Transaction not found (404)
   - Service error handling
   - Escrow creation verification
   - Response structure validation
   - Status update verification

3. POST /api/transactions/:id/lock-payment
   - Valid payment locking
   - Transaction/escrow not found (404)
   - Service error handling
   - Response structure validation
   - Status and lock state verification

4. POST /api/transactions/:id/dispatch
   - Valid dispatch marking
   - Transaction not found (404)
   - Service error handling
   - Status update verification

5. POST /api/transactions/:id/deliver
   - Valid delivery marking
   - Transaction not found (404)
   - Service error handling
   - Status update verification

6. POST /api/transactions/:id/release-funds
   - Valid fund release
   - Transaction/escrow not found (404)
   - Service error handling
   - Response structure validation
   - Status and lock state verification

7. GET /api/transactions/:id
   - Valid transaction retrieval
   - Transaction not found (404)
   - Service error handling
   - Response structure validation

### Phase 4: Error Consistency Tests

1. Test 400 error format
2. Test 404 error format
3. Test 500 error format
4. Test sensitive information not exposed
5. Test error message consistency

### Phase 5: Coverage Verification

1. Run coverage report
2. Identify uncovered lines
3. Add tests for uncovered paths
4. Verify 80%+ coverage achieved
