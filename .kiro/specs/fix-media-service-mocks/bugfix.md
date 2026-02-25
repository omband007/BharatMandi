# Bugfix Requirements Document: Media Service Mock Configuration

## Introduction

The media service unit tests are failing with the error "sqliteAdapter.getListing is not a function". The test suite sets up mock adapters (mockPgAdapter and mockSqliteAdapter) but the mockSqliteAdapter is missing the `getListing` method that is called by the MediaService during certain operations (specifically during delete, reorder, and setPrimary operations for authorization checks).

This affects 7 tests:
- "should successfully delete media"
- "should reject unauthorized deletion"
- "should reassign primary when deleting primary photo"
- "should successfully reorder media"
- "should reject unauthorized reorder"
- "should successfully set primary media"
- "should reject unauthorized set primary"

Additionally, one test "should handle thumbnail generation failure gracefully" expects `result.success` to be `true` but receives `false`, indicating the thumbnail generation failure is not being handled gracefully as intended.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the test "should successfully delete media" runs THEN the system throws error "sqliteAdapter.getListing is not a function"

1.2 WHEN the test "should reject unauthorized deletion" runs THEN the system throws error "sqliteAdapter.getListing is not a function"

1.3 WHEN the test "should reassign primary when deleting primary photo" runs THEN the system throws error "sqliteAdapter.getListing is not a function"

1.4 WHEN the test "should successfully reorder media" runs THEN the system throws error "sqliteAdapter.getListing is not a function"

1.5 WHEN the test "should reject unauthorized reorder" runs THEN the system throws error "sqliteAdapter.getListing is not a function"

1.6 WHEN the test "should successfully set primary media" runs THEN the system throws error "sqliteAdapter.getListing is not a function"

1.7 WHEN the test "should reject unauthorized set primary" runs THEN the system throws error "sqliteAdapter.getListing is not a function"

1.8 WHEN the test "should handle thumbnail generation failure gracefully" runs THEN the system returns `result.success = false` instead of `result.success = true`

### Expected Behavior (Correct)

2.1 WHEN the test "should successfully delete media" runs THEN the system SHALL successfully delete the media and return true

2.2 WHEN the test "should reject unauthorized deletion" runs THEN the system SHALL throw an "Unauthorized" error

2.3 WHEN the test "should reassign primary when deleting primary photo" runs THEN the system SHALL call setPrimaryMedia with the next photo's ID

2.4 WHEN the test "should successfully reorder media" runs THEN the system SHALL successfully reorder media and return true

2.5 WHEN the test "should reject unauthorized reorder" runs THEN the system SHALL throw an "Unauthorized" error

2.6 WHEN the test "should successfully set primary media" runs THEN the system SHALL successfully set primary media and return true

2.7 WHEN the test "should reject unauthorized set primary" runs THEN the system SHALL throw an "Unauthorized" error

2.8 WHEN the test "should handle thumbnail generation failure gracefully" runs THEN the system SHALL return `result.success = true` (upload succeeds even if thumbnail fails)

### Unchanged Behavior (Regression Prevention)

3.1 WHEN other media service tests run (upload, getListingMedia) THEN the system SHALL CONTINUE TO pass without requiring getListing mock

3.2 WHEN the MediaService is used in production THEN the system SHALL CONTINUE TO call getListing on the appropriate adapter (PostgreSQL or SQLite)

3.3 WHEN mock adapters are configured with all required methods THEN the system SHALL CONTINUE TO execute tests without runtime errors
