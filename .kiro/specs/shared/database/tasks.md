# Implementation Plan: Database Sync PostgreSQL-SQLite

## Overview

This implementation plan converts the dual database architecture design into discrete coding tasks. The approach follows an incremental strategy: build core adapters first, then add the abstraction layer, implement the sync engine, add connection monitoring, and finally integrate with the auth service. Each step validates functionality through tests before proceeding.

## Tasks

- [x] 1. Set up PostgreSQL schema and adapter
  - Create PostgreSQL schema file with users and otp_sessions tables
  - Implement PostgreSQLAdapter class with user CRUD operations
  - Implement OTP session operations in PostgreSQLAdapter
  - Add connection health check method
  - _Requirements: 1.1, 1.2, 1.5_

- [ ]* 1.1 Write property test for PostgreSQL adapter
  - **Property 1: Write operations target PostgreSQL first**
  - **Validates: Requirements 1.2, 1.4**

- [x] 2. Create SQLite adapter wrapper
  - Implement SQLiteAdapter class that wraps existing sqlite-helpers
  - Ensure SQLiteAdapter implements same interface as PostgreSQLAdapter
  - Add all user CRUD operations
  - Add OTP session operations
  - _Requirements: 2.1, 2.3_

- [ ]* 2.1 Write unit tests for SQLite adapter
  - Test that adapter correctly delegates to sqlite-helpers
  - Test error handling
  - _Requirements: 2.1_

- [x] 3. Implement connection monitor
  - Create ConnectionMonitor class extending EventEmitter
  - Implement connectivity checking (every 30 seconds)
  - Emit 'connected' and 'disconnected' events on state changes
  - Add health status endpoint data method
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [ ]* 3.1 Write property test for connection monitor
  - **Property 11: Connectivity changes trigger sync**
  - **Validates: Requirements 9.2, 9.3**

- [ ] 4. Build sync engine core
  - [x] 4.1 Create SyncEngine class with queue management
    - Implement addToQueue method
    - Implement getPendingSyncItems using sqlite-helpers
    - Implement removeSyncQueueItem method
    - _Requirements: 6.1, 6.2_
  
  - [ ]* 4.2 Write property test for queue operations
    - **Property 4: Failed writes are queued**
    - **Validates: Requirements 4.5, 6.1**
  
  - [x] 4.3 Implement sync queue processing
    - Implement processSyncQueue method
    - Process items in chronological order
    - Handle individual item processing
    - _Requirements: 3.2, 6.3_
  
  - [ ]* 4.4 Write property test for queue processing
    - **Property 5: Sync queue processes in order**
    - **Validates: Requirements 3.2, 6.3**

- [ ] 5. Add retry logic to sync engine
  - [x] 5.1 Implement exponential backoff retry
    - Add retry logic with 2^n second backoff
    - Track retry count in queue items
    - Mark items as failed after 3 attempts
    - _Requirements: 3.4, 6.5_
  
  - [ ]* 5.2 Write property test for retry logic
    - **Property 7: Failed sync items retry with backoff**
    - **Property 8: Failed items marked after max retries**
    - **Validates: Requirements 3.4, 6.5**

- [x] 6. Implement propagation to SQLite
  - Add propagateToSQLite method to SyncEngine
  - Ensure propagation happens asynchronously (within 5 seconds)
  - Handle propagation errors gracefully
  - _Requirements: 3.1, 4.4_

- [ ]* 6.1 Write property test for propagation
  - **Property 3: Successful writes propagate to SQLite**
  - **Validates: Requirements 3.1, 4.4**

- [x] 7. Checkpoint - Ensure sync engine tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Create database abstraction layer
  - [x] 8.1 Define DatabaseAdapter interface
    - Define interface with all user operations
    - Define interface with OTP operations
    - Define interface with account security operations
    - _Requirements: 1.2, 1.4_
  
  - [x] 8.2 Implement DatabaseManager class
    - Initialize PostgreSQL and SQLite adapters
    - Initialize ConnectionMonitor and SyncEngine
    - Wire components together
    - _Requirements: 1.2, 1.4, 5.1, 5.2_
  
  - [x] 8.3 Implement write operations in DatabaseManager
    - Implement createUser (PostgreSQL first, queue on failure)
    - Implement updateUser (PostgreSQL first, queue on failure)
    - Implement updateUserPin (PostgreSQL first, queue on failure)
    - _Requirements: 4.1, 4.2, 4.3, 4.5_
  
  - [ ]* 8.4 Write property test for write operations
    - **Property 1: Write operations target PostgreSQL first**
    - **Validates: Requirements 1.2, 1.4, 4.1, 4.2, 4.3**

- [ ] 9. Implement read operations with fallback
  - [x] 9.1 Add read operations to DatabaseManager
    - Implement getUserByPhone (PostgreSQL first, fallback to SQLite)
    - Implement getUserById (PostgreSQL first, fallback to SQLite)
    - Add staleness indicator when serving from SQLite
    - _Requirements: 5.1, 5.2, 5.3, 5.5_
  
  - [ ]* 9.2 Write property test for read fallback
    - **Property 2: Read operations fall back to SQLite**
    - **Property 15: Read operations use PostgreSQL when available**
    - **Validates: Requirements 2.2, 5.1, 5.2, 5.3, 5.5**

- [~] 10. Add conflict resolution
  - Implement timestamp-based conflict resolution
  - Prefer PostgreSQL version in conflicts
  - Log conflicts for monitoring
  - _Requirements: 8.2, 8.3_

- [ ]* 10.1 Write property test for conflict resolution
  - **Property 10: Conflict resolution prefers PostgreSQL**
  - **Validates: Requirements 8.2, 8.3**

- [~] 11. Implement batch processing
  - Add batch processing logic to SyncEngine
  - Activate batching when queue has >10 items
  - Process batches efficiently
  - _Requirements: 11.4_

- [ ]* 11.1 Write property test for batch processing
  - **Property 14: Batch processing for large queues**
  - **Validates: Requirements 11.4**

- [~] 12. Add sync status tracking
  - Create sync status tracking in SyncEngine
  - Update last sync timestamp after successful sync
  - Persist sync status to database
  - _Requirements: 9.5_

- [ ]* 12.1 Write property test for sync timestamps
  - **Property 12: Sync timestamps are tracked**
  - **Validates: Requirements 9.5**

- [~] 13. Checkpoint - Ensure database abstraction tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 14. Integrate with auth service
  - [x] 14.1 Update auth service to use DatabaseManager
    - Replace direct sqlite-helpers calls with DatabaseManager
    - Update createUser to use DatabaseManager
    - Update getUserByPhone to use DatabaseManager
    - Update loginWithPIN to use DatabaseManager
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  
  - [ ]* 14.2 Write integration tests for auth service
    - Test user registration flow (online and offline)
    - Test user login flow (online and offline)
    - Test PIN update flow (online and offline)
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ] 15. Add error handling and validation
  - [~] 15.1 Implement comprehensive error handling
    - Handle PostgreSQL connection errors
    - Handle SQLite connection errors
    - Handle sync errors with proper logging
    - Handle validation errors with descriptive messages
    - _Requirements: 10.1, 10.2, 10.3_
  
  - [ ]* 15.2 Write property test for validation errors
    - **Property 13: Validation errors return descriptive messages**
    - **Validates: Requirements 10.3**

- [~] 16. Add health check endpoint
  - Create health check endpoint in Express app
  - Expose connectivity status
  - Expose last sync timestamps
  - _Requirements: 9.4_

- [ ]* 16.1 Write unit test for health check endpoint
  - Test endpoint returns correct status
  - Test endpoint includes sync timestamps
  - _Requirements: 9.4_

- [~] 17. Implement database convergence verification
  - Add method to verify PostgreSQL and SQLite contain same data
  - Use for testing and monitoring
  - _Requirements: 2.1, 2.4_

- [ ]* 17.1 Write property test for database convergence
  - **Property 9: Databases converge after sync**
  - **Validates: Requirements 2.1, 2.4**

- [~] 18. Add initialization and startup logic
  - Create initialization function for DatabaseManager
  - Start ConnectionMonitor on app startup
  - Start SyncEngine on app startup
  - Initialize PostgreSQL schema if needed
  - _Requirements: 1.1, 9.1_

- [ ]* 18.1 Write integration test for startup
  - Test full system initialization
  - Test connectivity monitoring starts
  - Test sync engine starts
  - _Requirements: 1.1, 9.1_

- [~] 19. Final checkpoint - Run all tests
  - Ensure all tests pass, ask the user if questions arise.

- [~] 20. Add documentation and examples
  - Document DatabaseManager API
  - Add usage examples for common operations
  - Document error handling patterns
  - Add troubleshooting guide

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The implementation assumes PostgreSQL starts empty (no migration needed for POC)
- Connection pooling is configured in pg-config.ts (max 20 connections, 30s idle timeout)
- SQLite indexes already exist in the current schema
