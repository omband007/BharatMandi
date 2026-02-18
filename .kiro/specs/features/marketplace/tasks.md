# Implementation Plan: Persist Listings and Transactions

## Overview

This implementation plan extends the existing dual database architecture to persist marketplace data (listings, transactions, and escrow accounts). The plan leverages the existing DatabaseManager, ConnectionMonitor, and SyncEngine infrastructure, following the same patterns established for user authentication.

## Tasks

- [x] 1. Create PostgreSQL schema for marketplace tables
  - Add listings, transactions, and escrow_accounts tables to pg-schema.sql
  - Add indexes for performance optimization
  - Add foreign key constraints for referential integrity
  - Update sync_status table with marketplace entity types
  - _Requirements: 1.1, 1.3, 2.1, 2.3, 3.1, 3.3, 3.5, 14.4_

- [x] 2. Create SQLite schema for marketplace tables
  - Add listings, transactions, and escrow_accounts tables to sqlite-schema.sql
  - Add indexes matching PostgreSQL schema
  - Ensure schema consistency with PostgreSQL
  - _Requirements: 1.2, 2.2, 3.2_

- [x] 3. Extend DatabaseAdapter interface with marketplace operations
  - [x] 3.1 Add listing CRUD method signatures to DatabaseAdapter interface
    - Add createListing, getListing, getActiveListings, updateListing methods
    - _Requirements: 7.1, 7.4, 9.1_
  
  - [x] 3.2 Add transaction CRUD method signatures to DatabaseAdapter interface
    - Add createTransaction, getTransaction, updateTransaction methods
    - _Requirements: 7.2, 7.5, 9.2_
  
  - [x] 3.3 Add escrow CRUD method signatures to DatabaseAdapter interface
    - Add createEscrow, getEscrow, getEscrowByTransaction, updateEscrow methods
    - _Requirements: 7.3, 7.6, 9.3_

- [x] 4. Implement PostgreSQL adapter marketplace operations
  - [x] 4.1 Implement listing operations in PostgreSQLAdapter
    - Implement createListing with INSERT query
    - Implement getListing with SELECT by ID
    - Implement getActiveListings with filtered SELECT
    - Implement updateListing with dynamic UPDATE
    - Add mapRowToListing helper method
    - _Requirements: 7.1_
  
  - [ ]* 4.2 Write property test for listing operations
    - **Property 1: Write operations target PostgreSQL first**
    - **Validates: Requirements 4.1, 4.2**
  
  - [x] 4.3 Implement transaction operations in PostgreSQLAdapter
    - Implement createTransaction with INSERT query
    - Implement getTransaction with SELECT by ID
    - Implement updateTransaction with dynamic UPDATE
    - Add mapRowToTransaction helper method
    - _Requirements: 7.2_
  
  - [ ]* 4.4 Write property test for transaction operations
    - **Property 1: Write operations target PostgreSQL first**
    - **Validates: Requirements 5.1, 5.2**
  
  - [x] 4.5 Implement escrow operations in PostgreSQLAdapter
    - Implement createEscrow with INSERT query
    - Implement getEscrow with SELECT by ID
    - Implement getEscrowByTransaction with SELECT by transaction_id
    - Implement updateEscrow with dynamic UPDATE
    - Add mapRowToEscrow helper method
    - _Requirements: 7.3_
  
  - [ ]* 4.6 Write property test for escrow operations
    - **Property 1: Write operations target PostgreSQL first**
    - **Validates: Requirements 6.1, 6.2**

- [x] 5. Implement SQLite helpers for marketplace operations
  - [x] 5.1 Implement listing helpers in sqlite-helpers.ts
    - Implement createListing with INSERT statement
    - Implement getListing with SELECT by ID
    - Implement getActiveListings with filtered SELECT
    - Implement updateListing with dynamic UPDATE
    - Add mapRowToListing helper function
    - _Requirements: 7.4_
  
  - [x] 5.2 Implement transaction helpers in sqlite-helpers.ts
    - Implement createTransaction with INSERT statement
    - Implement getTransaction with SELECT by ID
    - Implement updateTransaction with dynamic UPDATE
    - Add mapRowToTransaction helper function
    - _Requirements: 7.5_
  
  - [x] 5.3 Implement escrow helpers in sqlite-helpers.ts
    - Implement createEscrow with INSERT statement
    - Implement getEscrow with SELECT by ID
    - Implement getEscrowByTransaction with SELECT by transaction_id
    - Implement updateEscrow with dynamic UPDATE
    - Add mapRowToEscrow helper function
    - _Requirements: 7.6_

- [x] 6. Extend SQLite adapter with marketplace operations
  - [x] 6.1 Implement listing operations in SQLiteAdapter
    - Delegate createListing to sqlite-helpers
    - Delegate getListing to sqlite-helpers
    - Delegate getActiveListings to sqlite-helpers
    - Delegate updateListing to sqlite-helpers
    - _Requirements: 7.4_
  
  - [x] 6.2 Implement transaction operations in SQLiteAdapter
    - Delegate createTransaction to sqlite-helpers
    - Delegate getTransaction to sqlite-helpers
    - Delegate updateTransaction to sqlite-helpers
    - _Requirements: 7.5_
  
  - [x] 6.3 Implement escrow operations in SQLiteAdapter
    - Delegate createEscrow to sqlite-helpers
    - Delegate getEscrow to sqlite-helpers
    - Delegate getEscrowByTransaction to sqlite-helpers
    - Delegate updateEscrow to sqlite-helpers
    - _Requirements: 7.6_

- [ ] 7. Checkpoint - Ensure adapter tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Extend DatabaseManager with marketplace operations
  - [x] 8.1 Implement listing operations in DatabaseManager
    - Implement createListing with PostgreSQL-first pattern
    - Implement getListing with fallback pattern
    - Implement getActiveListings with fallback pattern
    - Implement updateListing with PostgreSQL-first pattern
    - Add sync queue integration for failed writes
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 9.1, 9.4, 9.5_
  
  - [ ]* 8.2 Write property test for listing DatabaseManager operations
    - **Property 2: Read operations fall back to SQLite**
    - **Property 4: Failed writes are queued**
    - **Validates: Requirements 4.3, 4.4, 4.5**
  
  - [x] 8.3 Implement transaction operations in DatabaseManager
    - Implement createTransaction with PostgreSQL-first pattern
    - Implement getTransaction with fallback pattern
    - Implement updateTransaction with PostgreSQL-first pattern
    - Add sync queue integration for failed writes
    - _Requirements: 5.1, 5.2, 5.3, 5.5, 9.2, 9.4, 9.5_
  
  - [ ]* 8.4 Write property test for transaction DatabaseManager operations
    - **Property 2: Read operations fall back to SQLite**
    - **Property 4: Failed writes are queued**
    - **Validates: Requirements 5.3, 5.5**
  
  - [x] 8.5 Implement escrow operations in DatabaseManager
    - Implement createEscrow with PostgreSQL-first pattern
    - Implement getEscrow with fallback pattern
    - Implement getEscrowByTransaction with fallback pattern
    - Implement updateEscrow with PostgreSQL-first pattern
    - Add sync queue integration for failed writes
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 9.3, 9.4, 9.5_
  
  - [ ]* 8.6 Write property test for escrow DatabaseManager operations
    - **Property 2: Read operations fall back to SQLite**
    - **Property 4: Failed writes are queued**
    - **Validates: Requirements 6.3, 6.4, 6.5**

- [x] 9. Extend SyncEngine to handle marketplace entities
  - [x] 9.1 Extend processSyncItem method for marketplace entities
    - Add case handling for 'listing' entity_type
    - Add case handling for 'transaction' entity_type
    - Add case handling for 'escrow' entity_type
    - Apply CREATE and UPDATE operations to PostgreSQL
    - _Requirements: 8.1, 8.2, 8.3_
  
  - [ ]* 9.2 Write property test for sync queue processing
    - **Property 5: Sync queue processes marketplace entities**
    - **Validates: Requirements 8.1, 8.2, 8.3**
  
  - [x] 9.3 Extend propagateToSQLite method for marketplace entities
    - Add case handling for 'listing' entity_type
    - Add case handling for 'transaction' entity_type
    - Add case handling for 'escrow' entity_type
    - Apply CREATE and UPDATE operations to SQLite
    - Maintain 5-second propagation guarantee
    - _Requirements: 8.4_
  
  - [ ]* 9.4 Write property test for SQLite propagation
    - **Property 3: Successful writes propagate to SQLite**
    - **Validates: Requirements 8.4**

- [ ] 10. Checkpoint - Ensure sync engine tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Add validation for marketplace entities
  - [ ] 11.1 Add listing validation
    - Validate required fields (farmerId, produceType, quantity, pricePerKg, certificateId)
    - Validate numeric fields are positive
    - Validate farmer_id references existing user
    - Return descriptive error messages
    - _Requirements: 1.4, 12.2, 14.1_
  
  - [ ]* 11.2 Write property test for listing validation
    - **Property 8: Required fields are enforced**
    - **Validates: Requirements 1.4, 12.2**
  
  - [ ] 11.3 Add transaction validation
    - Validate required fields (listingId, farmerId, buyerId, amount, status)
    - Validate listing_id references existing listing
    - Validate farmer_id and buyer_id reference existing users
    - Validate amount is positive
    - Return descriptive error messages
    - _Requirements: 2.4, 12.2, 14.1_
  
  - [ ]* 11.4 Write property test for transaction validation
    - **Property 8: Required fields are enforced**
    - **Property 11: Referential integrity is validated**
    - **Validates: Requirements 2.4, 12.2, 14.1**
  
  - [ ] 11.5 Add escrow validation
    - Validate required fields (transactionId, amount, status, isLocked)
    - Validate transaction_id references existing transaction
    - Validate amount matches transaction amount
    - Enforce unique constraint on transaction_id
    - Return descriptive error messages
    - _Requirements: 3.4, 3.5, 12.2, 14.2_
  
  - [ ]* 11.6 Write property test for escrow validation
    - **Property 8: Required fields are enforced**
    - **Property 9: Unique constraints are enforced**
    - **Property 11: Referential integrity is validated**
    - **Validates: Requirements 3.4, 3.5, 12.2, 14.2**

- [ ] 12. Add error handling for marketplace operations
  - [ ] 12.1 Add connection error handling
    - Catch PostgreSQL connection failures
    - Log errors with full context
    - Queue failed writes to sync queue
    - Serve reads from SQLite on connection failure
    - _Requirements: 12.1_
  
  - [ ] 12.2 Add referential integrity error handling
    - Catch foreign key constraint violations
    - Return user-friendly error messages
    - Prevent queueing of invalid operations
    - Log violations for monitoring
    - _Requirements: 12.3, 12.4, 14.5_
  
  - [ ]* 12.3 Write property test for error handling
    - **Property 12: Failed listing creation prevents transaction creation**
    - **Property 13: Failed escrow creation rolls back transaction**
    - **Validates: Requirements 12.3, 12.4**

- [x] 13. Update marketplace services to use DatabaseManager
  - [x] 13.1 Update marketplace service to use DatabaseManager
    - Replace memory-db calls with DatabaseManager calls for listings
    - Maintain same method signatures
    - Add error handling for database operations
    - _Requirements: 10.1, 10.2, 10.3_
  
  - [x] 13.2 Update transaction service to use DatabaseManager
    - Replace memory-db calls with DatabaseManager calls for transactions
    - Replace memory-db calls with DatabaseManager calls for escrow accounts
    - Maintain same method signatures
    - Add error handling for database operations
    - _Requirements: 10.1, 10.2, 10.3_

- [ ] 14. Add database initialization
  - [ ] 14.1 Add schema initialization for PostgreSQL
    - Run pg-schema.sql on first startup
    - Check if tables exist before creating
    - Log initialization operations
    - _Requirements: 10.4, 10.5_
  
  - [ ] 14.2 Add schema initialization for SQLite
    - Run sqlite-schema.sql on first startup
    - Check if tables exist before creating
    - Log initialization operations
    - _Requirements: 10.4, 10.5_

- [ ] 15. Checkpoint - Ensure integration tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 16. Add property-based tests for data consistency
  - [ ]* 16.1 Write property test for database convergence
    - **Property 6: Databases converge after sync**
    - **Validates: Requirements 11.1**
  
  - [ ]* 16.2 Write property test for conflict resolution
    - **Property 7: Conflict resolution prefers PostgreSQL**
    - **Validates: Requirements 11.2**
  
  - [ ]* 16.3 Write property test for transaction atomicity
    - **Property 10: Transaction atomicity is maintained**
    - **Validates: Requirements 11.3**
  
  - [ ]* 16.4 Write property test for batch processing
    - **Property 14: Batch processing for large queues**
    - **Validates: Requirements 13.5**

- [ ] 17. Add integration tests for end-to-end scenarios
  - [ ]* 17.1 Write integration test for listing lifecycle
    - Test create listing → update listing → deactivate listing
    - Verify data in both databases
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  
  - [ ]* 17.2 Write integration test for transaction lifecycle
    - Test create listing → create transaction → update status
    - Verify data in both databases
    - _Requirements: 5.1, 5.2, 5.3_
  
  - [ ]* 17.3 Write integration test for escrow lifecycle
    - Test create transaction → create escrow → release escrow
    - Verify data in both databases
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  
  - [ ]* 17.4 Write integration test for offline scenario
    - Test marketplace operations during connectivity loss
    - Verify sync queue processing on reconnection
    - Verify data consistency after sync
    - _Requirements: 4.5, 5.5, 6.5, 8.1, 8.2, 8.3_

- [ ] 18. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The implementation reuses existing dual database infrastructure
- No changes needed to ConnectionMonitor (already working)
- Schema files should be idempotent (safe to run multiple times)
