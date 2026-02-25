# Bugfix Requirements Document: Sync Engine Mock Invocation Issues

## Introduction

Three sync engine tests are failing because mock functions are not being called as expected. The tests set up mocks for `updateSyncQueueRetry` from the `sqlite-helpers` module, but when the sync engine processes failed items, these mocks are not being invoked. This suggests either:
1. The mock setup is incorrect or incomplete
2. The sync engine code is not calling the expected functions
3. There's an issue with how the mocked module is being used

The failing tests are:
1. "should continue processing remaining items if one fails" - expects `updateSyncQueueRetry` to be called when first item fails
2. "should mark item as failed after 3 attempts" - expects `updateSyncQueueRetry` to be called with failure message
3. "should track retry count correctly across multiple failures" - expects `updateSyncQueueRetry` to be called with retry count

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the test "should continue processing remaining items if one fails" runs and the first sync item fails THEN the system does not call `updateSyncQueueRetry` mock (expected to be called once)

1.2 WHEN the test "should mark item as failed after 3 attempts" runs with an item that has retry_count=2 THEN the system does not call `updateSyncQueueRetry` mock with the failure message

1.3 WHEN the test "should track retry count correctly across multiple failures" runs with an item that has undefined retry_count THEN the system does not call `updateSyncQueueRetry` mock with "Retry 1: First failure"

### Expected Behavior (Correct)

2.1 WHEN the test "should continue processing remaining items if one fails" runs and the first sync item fails THEN the system SHALL call `updateSyncQueueRetry(1, 'Retry 1: Database error')`

2.2 WHEN the test "should mark item as failed after 3 attempts" runs with an item that has retry_count=2 THEN the system SHALL call `updateSyncQueueRetry(1, 'Failed after 3 attempts: Permanent failure')`

2.3 WHEN the test "should track retry count correctly across multiple failures" runs with an item that has undefined retry_count THEN the system SHALL call `updateSyncQueueRetry(1, 'Retry 1: First failure')`

### Unchanged Behavior (Regression Prevention)

3.1 WHEN sync items are processed successfully THEN the system SHALL CONTINUE TO call `removeSyncQueueItem` to remove them from the queue

3.2 WHEN sync items fail and retry_count < 3 THEN the system SHALL CONTINUE TO apply exponential backoff (2^retry_count seconds)

3.3 WHEN sync items fail and retry_count >= 3 THEN the system SHALL CONTINUE TO log error and mark as permanently failed without applying backoff

3.4 WHEN the sync queue is empty THEN the system SHALL CONTINUE TO complete without errors

3.5 WHEN processing multiple sync items THEN the system SHALL CONTINUE TO process them in chronological order

3.6 WHEN unknown entity types are encountered THEN the system SHALL CONTINUE TO log warning and remove the item from queue
