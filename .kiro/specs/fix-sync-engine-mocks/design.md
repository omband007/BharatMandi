# Sync Engine Mock Invocation Issues - Bugfix Design

## Overview

Three sync engine tests are failing because mock functions for `updateSyncQueueRetry` are not being invoked when expected. The tests properly mock the `sqlite-helpers` module and set up expectations, but when the sync engine processes failed items, the mocks show zero invocations. The root cause is that the mock setup is incomplete - while `jest.mock('../sqlite-helpers')` creates a mock module, the individual function mocks need to be properly configured before each test that expects them to be called. The fix involves ensuring that `updateSyncQueueRetry` is explicitly mocked with a resolved value in the test setup, similar to how other sqlite-helpers functions like `getPendingSyncItems` and `removeSyncQueueItem` are already being mocked.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when tests expect `updateSyncQueueRetry` to be called during sync queue processing but the mock is not invoked
- **Property (P)**: The desired behavior - `updateSyncQueueRetry` mock should be called with correct parameters when sync items fail
- **Preservation**: Existing test behavior for successful sync operations and other mock functions must remain unchanged
- **processSyncQueue**: The method in `sync-engine.ts` that processes pending sync items and handles failures with retry logic
- **updateSyncQueueRetry**: The function in `sqlite-helpers.ts` that updates a sync queue item's retry count and error message
- **jest.mocked()**: TypeScript-aware Jest utility that provides type-safe access to mocked functions

## Bug Details

### Fault Condition

The bug manifests when tests run that expect `updateSyncQueueRetry` to be called during sync queue processing. The `processSyncQueue` method in sync-engine.ts correctly calls `sqliteHelpers.updateSyncQueueRetry()` when items fail, but the mock function is not being invoked because it hasn't been properly initialized with a mock implementation.

**Formal Specification:**
```
FUNCTION isBugCondition(testContext)
  INPUT: testContext containing test setup and expectations
  OUTPUT: boolean
  
  RETURN testContext.testName IN [
           'should continue processing remaining items if one fails',
           'should mark item as failed after 3 attempts',
           'should track retry count correctly across multiple failures'
         ]
         AND testContext.expectsMockCall('updateSyncQueueRetry')
         AND NOT testContext.mockIsConfigured('updateSyncQueueRetry')
END FUNCTION
```

### Examples

- **Test: "should continue processing remaining items if one fails"**
  - Expected: `updateSyncQueueRetry(1, 'Retry 1: Database error')` called once
  - Actual: Mock shows 0 invocations
  - Reason: Mock not configured with `mockResolvedValue()`

- **Test: "should mark item as failed after 3 attempts"**
  - Expected: `updateSyncQueueRetry(1, 'Failed after 3 attempts: Permanent failure')` called once
  - Actual: Mock shows 0 invocations
  - Reason: Mock not configured with `mockResolvedValue()`

- **Test: "should track retry count correctly across multiple failures"**
  - Expected: `updateSyncQueueRetry(1, 'Retry 1: First failure')` called once
  - Actual: Mock shows 0 invocations
  - Reason: Mock not configured with `mockResolvedValue()`

- **Edge case: Tests that don't expect updateSyncQueueRetry to be called**
  - Expected: Mock not called (e.g., successful sync operations)
  - Actual: Works correctly (no regression)

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Tests for successful sync operations must continue to pass without calling `updateSyncQueueRetry`
- Mock setup for other sqlite-helpers functions (`getPendingSyncItems`, `removeSyncQueueItem`, `addToSyncQueue`) must remain unchanged
- Tests that verify exponential backoff timing must continue to work correctly
- Tests that verify retry count logic must continue to work correctly
- Tests for unknown entity types and DELETE operations must continue to pass

**Scope:**
All tests that do NOT involve sync item failures should be completely unaffected by this fix. This includes:
- Tests for adding items to queue
- Tests for retrieving pending items
- Tests for removing items from queue
- Tests for successful sync operations
- Tests for connectivity event handlers
- Tests for SQLite propagation

## Hypothesized Root Cause

Based on the bug description and code analysis, the most likely issue is:

1. **Incomplete Mock Configuration**: The test file uses `jest.mock('../sqlite-helpers')` at the module level, which creates automatic mocks for all exported functions. However, when a test expects a specific function to be called, it needs to explicitly configure that mock with a return value using `mockResolvedValue()` or `mockImplementation()`. The failing tests set up mocks for `getPendingSyncItems` and `removeSyncQueueItem` but forget to set up `updateSyncQueueRetry`.

2. **Pattern Inconsistency**: Looking at the test file, successful tests follow this pattern:
   ```typescript
   const mockGetPendingSyncItems = jest.mocked(sqliteHelpers.getPendingSyncItems);
   mockGetPendingSyncItems.mockResolvedValue([...]);
   ```
   The failing tests declare `mockUpdateSyncQueueRetry` but never call `.mockResolvedValue()` on it, so the mock remains unconfigured and doesn't track invocations properly.

3. **Jest Mock Behavior**: When `jest.mock()` is called without a factory function, Jest creates automatic mocks that return `undefined` by default. For async functions, this means they return `Promise<undefined>`. However, without explicitly configuring the mock, Jest may not properly track invocations in all scenarios.

## Correctness Properties

Property 1: Fault Condition - Mock Invocation Tracking

_For any_ test where a sync item fails during `processSyncQueue` execution and retry_count < 3, the `updateSyncQueueRetry` mock SHALL be invoked with the correct item ID and error message, and the test assertion `expect(mockUpdateSyncQueueRetry).toHaveBeenCalledWith(...)` SHALL pass.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation - Non-Failure Test Behavior

_For any_ test that does NOT involve sync item failures (successful operations, queue management, connectivity events), the test SHALL produce exactly the same results as before the fix, with no changes to mock setup or assertions.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `src/shared/database/__tests__/sync-engine.test.ts`

**Specific Changes**:

1. **Test: "should continue processing remaining items if one fails"** (around line 650):
   - Add mock configuration: `mockUpdateSyncQueueRetry.mockResolvedValue();`
   - This should be added after the line `const mockUpdateSyncQueueRetry = jest.mocked(sqliteHelpers.updateSyncQueueRetry);`

2. **Test: "should mark item as failed after 3 attempts"** (around line 750):
   - Add mock configuration: `mockUpdateSyncQueueRetry.mockResolvedValue();`
   - This should be added after the line `const mockUpdateSyncQueueRetry = jest.mocked(sqliteHelpers.updateSyncQueueRetry);`

3. **Test: "should track retry count correctly across multiple failures"** (around line 820):
   - Add mock configuration: `mockUpdateSyncQueueRetry.mockResolvedValue();`
   - This should be added after the line `const mockUpdateSyncQueueRetry = jest.mocked(sqliteHelpers.updateSyncQueueRetry);`

4. **Pattern to Follow**: Each failing test should follow the same pattern as successful tests:
   ```typescript
   const mockUpdateSyncQueueRetry = jest.mocked(sqliteHelpers.updateSyncQueueRetry);
   mockUpdateSyncQueueRetry.mockResolvedValue(); // ADD THIS LINE
   ```

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, confirm the tests are currently failing with the expected error messages, then verify the fix makes them pass while preserving all other test behavior.

### Exploratory Fault Condition Checking

**Goal**: Confirm the tests are failing because mocks are not being invoked, not due to other issues. Verify our root cause hypothesis.

**Test Plan**: Run the three failing tests and examine the error messages. They should show "Expected number of calls: 1, Received number of calls: 0" or similar mock invocation failures.

**Test Cases**:
1. **Run "should continue processing remaining items if one fails"**: Should fail with mock not called error
2. **Run "should mark item as failed after 3 attempts"**: Should fail with mock not called error
3. **Run "should track retry count correctly across multiple failures"**: Should fail with mock not called error
4. **Verify other tests pass**: Confirm that tests not involving `updateSyncQueueRetry` are passing

**Expected Counterexamples**:
- Error messages showing `expect(mockUpdateSyncQueueRetry).toHaveBeenCalledWith(...)` assertions failing
- Mock invocation count showing 0 instead of expected 1
- Possible root cause: Mock not configured with `mockResolvedValue()`

### Fix Checking

**Goal**: Verify that after adding `mockResolvedValue()` to the three failing tests, all assertions pass and mocks are properly invoked.

**Pseudocode:**
```
FOR ALL test WHERE isBugCondition(test) DO
  result := runTestAfterFix(test)
  ASSERT result.passed = true
  ASSERT result.mockInvocations['updateSyncQueueRetry'] >= 1
END FOR
```

**Test Plan**: After adding the mock configuration lines, run the three previously failing tests and verify they pass.

**Test Cases**:
1. **"should continue processing remaining items if one fails"**: Should pass with mock called once
2. **"should mark item as failed after 3 attempts"**: Should pass with mock called once
3. **"should track retry count correctly across multiple failures"**: Should pass with mock called once

### Preservation Checking

**Goal**: Verify that all other tests continue to pass exactly as before, with no changes to their behavior.

**Pseudocode:**
```
FOR ALL test WHERE NOT isBugCondition(test) DO
  ASSERT runTestAfterFix(test) = runTestBeforeFix(test)
END FOR
```

**Testing Approach**: Run the full test suite for sync-engine.test.ts and verify that all non-failing tests continue to pass with the same behavior.

**Test Cases**:
1. **Queue Management Tests**: Verify addToQueue, getPendingSyncItems, removeSyncQueueItem tests pass
2. **Successful Sync Tests**: Verify tests for successful sync operations pass
3. **Connectivity Tests**: Verify event handler tests pass
4. **Propagation Tests**: Verify propagateToSQLite tests pass
5. **Other Failure Tests**: Verify exponential backoff and timing tests pass

### Unit Tests

- Verify mock configuration is added to exactly 3 tests
- Verify mock is called with correct parameters (item ID and error message)
- Verify retry count logic works correctly (0 -> 1, 1 -> 2, 2 -> 3)
- Verify error message format matches expected pattern ("Retry N: ..." or "Failed after 3 attempts: ...")

### Property-Based Tests

Not applicable for this bugfix - the issue is with test infrastructure (mocks) rather than production code logic. The fix only modifies test setup, not the sync engine implementation.

### Integration Tests

- Run full sync-engine.test.ts suite and verify all tests pass
- Verify test execution time remains similar (no performance regression)
- Verify no new console warnings or errors appear during test execution
- Verify coverage metrics remain the same or improve
