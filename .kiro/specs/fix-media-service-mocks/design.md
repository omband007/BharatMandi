# Media Service Mock Configuration Bugfix Design

## Overview

The media service unit tests are failing because the mock SQLite adapter is missing the `getListing` method that MediaService calls during authorization checks in delete, reorder, and setPrimary operations. Additionally, the thumbnail generation failure test expects graceful handling (success=true) but the current implementation returns success=false when thumbnail generation fails.

The fix involves:
1. Adding the `getListing` method to mockSqliteAdapter in the test setup
2. Adjusting the uploadMedia error handling to ensure thumbnail failures don't cause the entire upload to fail

This is a test infrastructure fix - no production code changes are needed for the getListing issue, as the MediaService correctly calls getListing on the PostgreSQL adapter. The thumbnail handling requires a small production code fix.

## Glossary

- **Bug_Condition (C)**: The condition that triggers test failures - when tests run that invoke MediaService methods requiring authorization checks (delete, reorder, setPrimary) or thumbnail generation failure handling
- **Property (P)**: The desired behavior - tests should execute without "method not found" errors and thumbnail failures should be handled gracefully
- **Preservation**: All other tests must continue to pass, and production MediaService behavior must remain unchanged
- **mockSqliteAdapter**: The mock SQLite database adapter used in unit tests for offline/cache operations
- **mockPgAdapter**: The mock PostgreSQL database adapter used in unit tests for primary database operations
- **getListing**: Method that retrieves a listing by ID, used for authorization checks to verify the user owns the listing
- **Authorization Check**: Pattern in MediaService where getListing is called to verify listing.farmerId matches userId before allowing operations

## Bug Details

### Fault Condition

The bug manifests in two distinct scenarios:

**Scenario 1: Missing Mock Method**
The tests fail when MediaService methods (deleteMedia, reorderMedia, setPrimaryMedia) call `pgAdapter.getListing()` for authorization checks, but the test setup only mocks the PostgreSQL adapter's getListing method, not the SQLite adapter's. The MediaService code correctly uses the PostgreSQL adapter, but the mock setup is incomplete.

**Scenario 2: Thumbnail Failure Handling**
The test "should handle thumbnail generation failure gracefully" expects the upload to succeed (result.success = true) when thumbnail generation fails, but the current implementation catches the thumbnail error and continues, yet the outer try-catch block catches any subsequent error and returns success=false.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type TestExecution
  OUTPUT: boolean
  
  RETURN (input.testName IN [
           'should successfully delete media',
           'should reject unauthorized deletion',
           'should reassign primary when deleting primary photo',
           'should successfully reorder media',
           'should reject unauthorized reorder',
           'should successfully set primary media',
           'should reject unauthorized set primary'
         ] AND mockSqliteAdapter.getListing IS undefined)
         OR (input.testName = 'should handle thumbnail generation failure gracefully'
             AND result.success = false)
END FUNCTION
```

### Examples

**Example 1: Delete Media Test**
- Test: "should successfully delete media"
- Current: Throws "sqliteAdapter.getListing is not a function"
- Expected: Successfully deletes media and returns true

**Example 2: Unauthorized Deletion Test**
- Test: "should reject unauthorized deletion"
- Current: Throws "sqliteAdapter.getListing is not a function"
- Expected: Throws "Unauthorized" error

**Example 3: Reorder Media Test**
- Test: "should successfully reorder media"
- Current: Throws "sqliteAdapter.getListing is not a function"
- Expected: Successfully reorders media and returns true

**Example 4: Thumbnail Failure Test**
- Test: "should handle thumbnail generation failure gracefully"
- Current: Returns result.success = false
- Expected: Returns result.success = true (upload succeeds despite thumbnail failure)

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- All currently passing tests (uploadMedia, getListingMedia) must continue to pass
- Production MediaService code must continue to call getListing on the PostgreSQL adapter (not SQLite)
- Mock setup for other adapter methods must remain unchanged
- Authorization logic in MediaService must remain unchanged

**Scope:**
All tests that do NOT involve authorization checks (getListing calls) or thumbnail generation failures should be completely unaffected by this fix. This includes:
- Upload tests that don't involve thumbnail failures
- GetListingMedia tests
- File validation tests
- Media count limit tests

## Hypothesized Root Cause

Based on the bug description and code analysis, the root causes are:

1. **Incomplete Mock Setup**: The test setup creates mockSqliteAdapter with only cache-related methods (cacheListingMedia, getCachedListingMedia, deleteCachedMedia) but doesn't include getListing. While MediaService correctly uses pgAdapter.getListing(), the mock framework may be incorrectly routing calls or the test setup is missing the method definition.

2. **Mock Configuration Issue**: The mockDbManager.getSQLiteAdapter() returns mockSqliteAdapter, but when MediaService calls pgAdapter.getListing(), the test framework might be checking both adapters or there's confusion in the mock setup.

3. **Thumbnail Error Propagation**: In uploadMedia, the thumbnail generation is wrapped in try-catch with a console.warn, but if any error occurs after the thumbnail catch block (e.g., in storage upload or database creation), the outer try-catch returns success=false. The test mocks might be causing an error that propagates to the outer catch.

4. **Test Assertion Logic**: The thumbnail test might be checking result.success before the upload completes, or the mock setup for thumbnail failure isn't correctly isolated from other operations.

## Correctness Properties

Property 1: Fault Condition - Mock Methods Available

_For any_ test execution where MediaService methods requiring authorization are called (deleteMedia, reorderMedia, setPrimaryMedia), the mock adapter setup SHALL include all methods that might be invoked during the test, including getListing on the appropriate adapter, preventing "method not found" runtime errors.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7**

Property 2: Fault Condition - Graceful Thumbnail Failure

_For any_ upload operation where thumbnail generation fails, the uploadMedia method SHALL continue with the upload process and return success=true with the media record created, treating thumbnail generation as a non-critical enhancement.

**Validates: Requirements 2.8**

Property 3: Preservation - Existing Test Behavior

_For any_ test that does NOT involve authorization checks or thumbnail generation failures, the test execution SHALL produce exactly the same results as before the fix, preserving all existing test coverage and validation logic.

**Validates: Requirements 3.1, 3.2, 3.3**

## Fix Implementation

### Changes Required

**File**: `src/features/marketplace/__tests__/media.service.test.ts`

**Location**: `beforeEach` block - mockSqliteAdapter setup

**Specific Changes**:

1. **Add getListing to mockSqliteAdapter**: Add the getListing method to the mockSqliteAdapter mock object
   - This ensures the mock has all methods that might be called during tests
   - The method should return a mock listing object with id and farmerId properties
   - Implementation: `getListing: jest.fn()`

2. **Configure getListing mock behavior**: Set up default return values for getListing
   - Should return a listing object matching the test scenarios
   - Implementation: `mockSqliteAdapter.getListing.mockResolvedValue({ id: 'listing-1', farmerId: 'farmer-1' })`

**File**: `src/features/marketplace/media.service.ts`

**Location**: `uploadMedia` method - thumbnail generation error handling

**Specific Changes**:

3. **Review Error Handling Flow**: Verify that thumbnail generation errors are properly caught and don't propagate to outer catch
   - The current code has try-catch around thumbnail generation
   - Need to ensure no errors occur after thumbnail catch that would cause outer catch to return success=false
   - May need to add additional error handling or logging

4. **Isolate Thumbnail Errors**: Ensure thumbnail generation failures are completely isolated from upload success
   - Current implementation looks correct with try-catch and console.warn
   - Verify test mock setup doesn't cause additional errors
   - May only need test-side fix, not production code change

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bugs on unfixed code, then verify the fixes work correctly and preserve existing behavior.

### Exploratory Fault Condition Checking

**Goal**: Surface counterexamples that demonstrate the bugs BEFORE implementing the fix. Confirm the root cause analysis.

**Test Plan**: Run the existing failing tests on UNFIXED code to observe the exact error messages and failure patterns. Examine the mock setup and MediaService code flow to understand why getListing is being called on the wrong adapter or why the method is missing.

**Test Cases**:
1. **Delete Media Test**: Run "should successfully delete media" (will fail with "getListing is not a function")
2. **Authorization Test**: Run "should reject unauthorized deletion" (will fail with "getListing is not a function")
3. **Reorder Test**: Run "should successfully reorder media" (will fail with "getListing is not a function")
4. **Thumbnail Failure Test**: Run "should handle thumbnail generation failure gracefully" (will fail with success=false instead of true)

**Expected Counterexamples**:
- Error message: "sqliteAdapter.getListing is not a function"
- This confirms mockSqliteAdapter is missing the getListing method
- Thumbnail test shows result.success = false when it should be true

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed test setup produces the expected behavior.

**Pseudocode:**
```
FOR ALL test WHERE test requires authorization check DO
  result := executeTest(test, fixedMockSetup)
  ASSERT result.passed = true
  ASSERT NO error contains "is not a function"
END FOR

FOR test = 'thumbnail failure handling' DO
  result := executeTest(test, fixedErrorHandling)
  ASSERT result.success = true
END FOR
```

### Preservation Checking

**Goal**: Verify that for all tests where the bug condition does NOT hold, the fixed code produces the same results as the original code.

**Pseudocode:**
```
FOR ALL test WHERE test does NOT require authorization OR thumbnail failure DO
  ASSERT executeTest(test, originalSetup) = executeTest(test, fixedSetup)
END FOR
```

**Testing Approach**: Run the full test suite and verify that all previously passing tests still pass with identical behavior.

**Test Plan**: Execute all media service tests and verify:
1. **Upload Tests Preservation**: All upload tests without thumbnail failures continue to pass
2. **GetListingMedia Preservation**: Media retrieval tests continue to pass
3. **Validation Preservation**: File validation tests continue to pass
4. **Mock Behavior Preservation**: Other mock methods continue to work as expected

### Unit Tests

- Run all 7 failing authorization-related tests and verify they pass
- Run the thumbnail failure test and verify result.success = true
- Run all other existing tests and verify they still pass
- Verify mock setup includes all required methods
- Verify authorization checks work correctly with mocked getListing

### Property-Based Tests

Not applicable for this bugfix - this is a test infrastructure fix, not a logic change that would benefit from property-based testing.

### Integration Tests

Not applicable for this bugfix - the MediaService integration with real adapters is not affected, only the unit test mocks.
