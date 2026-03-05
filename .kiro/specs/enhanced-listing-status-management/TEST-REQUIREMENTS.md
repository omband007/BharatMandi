# Test Requirements for Enhanced Listing Status Management

## Overview
This document outlines the test requirements for Tasks 8, 9, 9A, and 9B of the Enhanced Listing Status Management feature.

## Test Files to Create

### 1. MarketplaceService Tests (Task 8 & 9)
**File**: `src/features/marketplace/__tests__/marketplace.service.test.ts`

#### Test Suite: createListing()
- ✅ Should create listing with valid inputs (ACTIVE status, correct expiry date)
- ✅ Should default payment_method_preference to BOTH if not specified
- ✅ Should reject invalid produce_category_id
- ✅ Should reject invalid listing_type (not PRE_HARVEST or POST_HARVEST)
- ✅ Should reject invalid payment_method_preference (not PLATFORM_ONLY, DIRECT_ONLY, or BOTH)
- ✅ Should calculate expiry date for PRE_HARVEST listings
- ✅ Should calculate expiry date for POST_HARVEST listings
- ✅ Should record initial status change in audit trail

#### Test Suite: cancelListing()
- ✅ Should cancel ACTIVE listing without active transactions
- ✅ Should reject cancellation of non-ACTIVE listing (SOLD, EXPIRED, CANCELLED)
- ✅ Should reject cancellation when active transaction exists (PAYMENT_LOCKED or later)
- ✅ Should allow cancellation with PENDING transaction
- ✅ Should allow cancellation with ACCEPTED transaction
- ✅ Should record cancellation in audit trail with correct metadata

### 2. ListingStatusManager Tests (Task 9A)
**File**: `src/features/marketplace/__tests__/listing-status-manager.test.ts`

#### Test Suite: markAsSold()
- ✅ Should mark ACTIVE listing as SOLD with PLATFORM_DIRECT channel
- ✅ Should mark ACTIVE listing as SOLD with EXTERNAL channel
- ✅ Should reject marking non-ACTIVE listing as sold
- ✅ Should reject invalid sale channel (not PLATFORM_DIRECT or EXTERNAL)
- ✅ Should require transactionId for PLATFORM_DIRECT sales
- ✅ Should allow optional salePrice and saleNotes for EXTERNAL sales
- ✅ Should reject when active transaction exists (PAYMENT_LOCKED or later)
- ✅ Should allow marking as sold when transaction is PENDING or ACCEPTED
- ✅ Should record status change in audit trail with USER trigger type
- ✅ Should include sale channel and transaction details in audit metadata

### 3. TransactionService Tests (Task 9B.1)
**File**: `src/features/transactions/__tests__/transaction.service.test.ts`

#### Test Suite: completeDirectPayment()
- ✅ Should complete direct payment for ACCEPTED transaction with BOTH preference
- ✅ Should complete direct payment for ACCEPTED transaction with DIRECT_ONLY preference
- ✅ Should reject if transaction not found
- ✅ Should reject if transaction is not in ACCEPTED state
- ✅ Should reject if transaction is already COMPLETED or COMPLETED_DIRECT
- ✅ Should reject if listing not found
- ✅ Should reject if listing has PLATFORM_ONLY payment preference
- ✅ Should reject if transaction is in PAYMENT_LOCKED state (escrow already started)
- ✅ Should skip PAYMENT_LOCKED, DISPATCHED, IN_TRANSIT, DELIVERED states
- ✅ Should set completedAt timestamp
- ✅ Should transition directly from ACCEPTED to COMPLETED_DIRECT

### 4. StatusSynchronizer Tests (Task 9B.2)
**File**: `src/features/marketplace/__tests__/status-synchronizer.test.ts`

#### Test Suite: onTransactionCompletedDirect()
- ✅ Should mark ACTIVE listing as SOLD with PLATFORM_DIRECT channel
- ✅ Should skip if listing is not ACTIVE
- ✅ Should throw error if transaction not found
- ✅ Should throw error if listing not found
- ✅ Should record audit trail with TRANSACTION trigger type
- ✅ Should include transaction_id and sale_channel in audit metadata
- ✅ Should set sold_at timestamp

#### Test Suite: onTransactionCompleted() (escrow)
- ✅ Should mark ACTIVE listing as SOLD with PLATFORM_ESCROW channel
- ✅ Should differentiate between PLATFORM_ESCROW and PLATFORM_DIRECT channels

## Test Implementation Notes

### Mocking Strategy
- Use Jest mocks for all dependencies (categoryManager, listingStatusManager, dbManager)
- Mock global sharedDbManager for database operations
- Use `jest.fn()` for function mocks
- Use `jest.Mock` type for TypeScript type safety

### Example Test Structure
```typescript
// Mock dependencies
jest.mock('../category-manager');
jest.mock('../listing-status-manager');

const mockDbManager = {
  run: jest.fn(),
  get: jest.fn(),
  all: jest.fn(),
};

beforeEach(() => {
  (global as any).sharedDbManager = mockDbManager;
  jest.clearAllMocks();
});

afterEach(() => {
  delete (global as any).sharedDbManager;
});

describe('ServiceName - methodName', () => {
  it('should do something', async () => {
    // Arrange
    (dependency.method as jest.Mock).mockResolvedValue(mockData);
    
    // Act
    const result = await service.method(input);
    
    // Assert
    expect(result).toBeDefined();
    expect(dependency.method).toHaveBeenCalledWith(expectedArgs);
  });
});
```

### Key Testing Patterns

1. **State Validation**: Verify correct status transitions
2. **Error Handling**: Test all rejection scenarios
3. **Audit Trail**: Verify status changes are recorded with correct metadata
4. **Transaction Blocking**: Verify active transactions prevent certain operations
5. **Channel Tracking**: Verify sale_channel is set correctly for different flows

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- marketplace.service.test.ts

# Run with coverage
npm test -- --coverage
```

## Test Coverage Goals

- Line Coverage: > 80%
- Branch Coverage: > 75%
- Function Coverage: > 90%

## Integration with CI/CD

Tests should be run:
- Before every commit (pre-commit hook)
- On every pull request
- Before deployment to staging/production

## Property-Based Testing (Optional Tasks)

The following property-based tests are marked as optional in tasks.md:
- Task 8.2: Property test for listing creation (all new listings start ACTIVE)
- Task 9.2: Property test for cancellation validation
- Task 9A.2: Property test for manual sale confirmation
- Task 9A.3: Property test for active transaction blocking
- Task 9B.3: Property test for direct payment flow

These can be implemented using fast-check library if desired for additional confidence.

## Status

- ✅ Test requirements documented
- ⏳ Test files to be created
- ⏳ Tests to be run and verified
- ⏳ Coverage reports to be generated

## Next Steps

1. Create test files following the structure above
2. Run tests and fix any failures
3. Generate coverage reports
4. Add any missing edge case tests
5. Document any test-specific setup requirements
