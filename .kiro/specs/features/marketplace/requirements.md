---
parent_spec: bharat-mandi
implements_requirements: [6, 7]
depends_on: [database-sync-postgresql-sqlite]
status: complete
type: feature
---

# Requirements Document

**Parent Spec:** [Bharat Mandi](../bharat-mandi/requirements.md) - Requirements 6 & 7  
**Depends On:** [Dual Database Sync](../database-sync-postgresql-sqlite/requirements.md)  
**Status:** ✅ Complete

## Introduction

This document specifies the requirements for persisting listings, transactions, and escrow accounts to the dual database system (PostgreSQL + SQLite with sync). The system will migrate from in-memory storage to persistent storage, leveraging the existing DatabaseManager, ConnectionMonitor, and SyncEngine infrastructure that is already implemented and working for user authentication.

## Glossary

- **Primary_Database**: PostgreSQL database that serves as the authoritative source of truth for all marketplace data
- **Offline_Cache**: SQLite database that stores a local copy of marketplace data for offline access
- **Sync_Engine**: Component responsible for synchronizing data between PostgreSQL and SQLite (already implemented)
- **DatabaseManager**: Unified interface for database operations with automatic routing and fallback (already implemented)
- **Listing**: A farmer's produce listing in the marketplace
- **Transaction**: A purchase transaction between a buyer and farmer
- **Escrow_Account**: A locked payment account associated with a transaction
- **Memory_Database**: Current in-memory storage that will be replaced with persistent storage
- **Marketplace_Service**: Service component that manages marketplace operations

## Requirements

### Requirement 1: Listings Table Schema

**User Story:** As a system architect, I want listings stored in both PostgreSQL and SQLite with a consistent schema, so that marketplace data persists reliably across restarts.

#### Acceptance Criteria

1. THE Primary_Database SHALL store listings with fields: id, farmer_id, produce_type, quantity, price_per_kg, certificate_id, expected_harvest_date, is_active, created_at
2. THE Offline_Cache SHALL store listings with the same schema as the Primary_Database
3. THE System SHALL create indexes on farmer_id and is_active fields for fast lookups
4. THE System SHALL enforce NOT NULL constraints on id, farmer_id, produce_type, quantity, price_per_kg, certificate_id, is_active, and created_at
5. THE System SHALL use VARCHAR(36) for UUID fields (id, farmer_id, certificate_id)

### Requirement 2: Transactions Table Schema

**User Story:** As a system architect, I want transactions stored in both PostgreSQL and SQLite with a consistent schema, so that transaction history persists reliably.

#### Acceptance Criteria

1. THE Primary_Database SHALL store transactions with fields: id, listing_id, farmer_id, buyer_id, amount, status, created_at, updated_at, dispatched_at, delivered_at, completed_at
2. THE Offline_Cache SHALL store transactions with the same schema as the Primary_Database
3. THE System SHALL create indexes on listing_id, farmer_id, buyer_id, and status fields for fast lookups
4. THE System SHALL enforce NOT NULL constraints on id, listing_id, farmer_id, buyer_id, amount, status, created_at, and updated_at
5. THE System SHALL use VARCHAR(36) for UUID fields and DECIMAL(10,2) for amount field

### Requirement 3: Escrow Accounts Table Schema

**User Story:** As a system architect, I want escrow accounts stored in both PostgreSQL and SQLite with a consistent schema, so that payment locks persist reliably.

#### Acceptance Criteria

1. THE Primary_Database SHALL store escrow accounts with fields: id, transaction_id, amount, status, is_locked, created_at, released_at
2. THE Offline_Cache SHALL store escrow accounts with the same schema as the Primary_Database
3. THE System SHALL create an index on transaction_id field for fast lookups
4. THE System SHALL enforce NOT NULL constraints on id, transaction_id, amount, status, is_locked, and created_at
5. THE System SHALL enforce a UNIQUE constraint on transaction_id to ensure one escrow per transaction

### Requirement 4: Listing CRUD Operations

**User Story:** As a farmer, I want to create, read, update, and deactivate my produce listings, so that I can manage my marketplace presence.

#### Acceptance Criteria

1. WHEN a listing is created, THE System SHALL write to the Primary_Database first, then propagate to the Offline_Cache
2. WHEN a listing is updated, THE System SHALL write to the Primary_Database first, then propagate to the Offline_Cache
3. WHEN active listings are queried, THE System SHALL read from the Primary_Database if available, otherwise from the Offline_Cache
4. WHEN a listing is queried by ID, THE System SHALL read from the Primary_Database if available, otherwise from the Offline_Cache
5. IF a write operation to the Primary_Database fails, THEN THE System SHALL add the operation to the sync queue

### Requirement 5: Transaction CRUD Operations

**User Story:** As a buyer or farmer, I want to create and track transactions, so that I can manage my purchases and sales.

#### Acceptance Criteria

1. WHEN a transaction is created, THE System SHALL write to the Primary_Database first, then propagate to the Offline_Cache
2. WHEN a transaction status is updated, THE System SHALL write to the Primary_Database first, then propagate to the Offline_Cache
3. WHEN a transaction is queried by ID, THE System SHALL read from the Primary_Database if available, otherwise from the Offline_Cache
4. WHEN transactions are queried by listing, THE System SHALL read from the Primary_Database if available, otherwise from the Offline_Cache
5. IF a write operation to the Primary_Database fails, THEN THE System SHALL add the operation to the sync queue

### Requirement 6: Escrow Account Operations

**User Story:** As a system administrator, I want escrow accounts to lock and release payments reliably, so that transactions are secure.

#### Acceptance Criteria

1. WHEN an escrow account is created, THE System SHALL write to the Primary_Database first, then propagate to the Offline_Cache
2. WHEN an escrow account is updated, THE System SHALL write to the Primary_Database first, then propagate to the Offline_Cache
3. WHEN an escrow account is queried by transaction ID, THE System SHALL read from the Primary_Database if available, otherwise from the Offline_Cache
4. WHEN an escrow account is queried by ID, THE System SHALL read from the Primary_Database if available, otherwise from the Offline_Cache
5. IF a write operation to the Primary_Database fails, THEN THE System SHALL add the operation to the sync queue

### Requirement 7: Database Adapter Extensions

**User Story:** As a developer, I want the existing PostgreSQL and SQLite adapters extended with marketplace operations, so that I can use the same patterns as user authentication.

#### Acceptance Criteria

1. THE PostgreSQLAdapter SHALL implement methods for all listing CRUD operations
2. THE PostgreSQLAdapter SHALL implement methods for all transaction CRUD operations
3. THE PostgreSQLAdapter SHALL implement methods for all escrow account CRUD operations
4. THE SQLiteAdapter SHALL implement methods for all listing CRUD operations
5. THE SQLiteAdapter SHALL implement methods for all transaction CRUD operations
6. THE SQLiteAdapter SHALL implement methods for all escrow account CRUD operations

### Requirement 8: Sync Engine Integration

**User Story:** As a developer, I want the existing SyncEngine to handle marketplace entity synchronization, so that offline operations sync automatically when connectivity returns.

#### Acceptance Criteria

1. WHEN processing a sync queue item with entity_type 'listing', THE Sync_Engine SHALL apply the operation to the Primary_Database
2. WHEN processing a sync queue item with entity_type 'transaction', THE Sync_Engine SHALL apply the operation to the Primary_Database
3. WHEN processing a sync queue item with entity_type 'escrow', THE Sync_Engine SHALL apply the operation to the Primary_Database
4. WHEN a marketplace write operation succeeds in the Primary_Database, THE Sync_Engine SHALL propagate changes to the Offline_Cache within 5 seconds
5. WHEN a marketplace write operation fails, THE Sync_Engine SHALL add the operation to the sync queue with retry logic

### Requirement 9: DatabaseManager Extensions

**User Story:** As a developer, I want the existing DatabaseManager extended with marketplace operations, so that I have a unified interface for all database operations.

#### Acceptance Criteria

1. THE DatabaseManager SHALL provide methods for all listing CRUD operations
2. THE DatabaseManager SHALL provide methods for all transaction CRUD operations
3. THE DatabaseManager SHALL provide methods for all escrow account CRUD operations
4. THE DatabaseManager SHALL route marketplace write operations to the Primary_Database first
5. THE DatabaseManager SHALL route marketplace read operations to the Primary_Database if available, otherwise to the Offline_Cache

### Requirement 10: Migration from Memory Database

**User Story:** As a developer, I want to replace in-memory storage with persistent storage, so that marketplace data survives application restarts.

#### Acceptance Criteria

1. WHEN the application starts, THE System SHALL use the DatabaseManager for all marketplace operations instead of the Memory_Database
2. THE System SHALL remove dependencies on the Memory_Database for listings, transactions, and escrow accounts
3. THE System SHALL maintain the same method signatures for marketplace operations to minimize code changes
4. THE System SHALL initialize database tables on first startup if they don't exist
5. THE System SHALL log all migration-related operations for debugging

### Requirement 11: Data Consistency Guarantees

**User Story:** As a system architect, I want strong consistency guarantees for marketplace data, so that buyers and farmers never see conflicting information.

#### Acceptance Criteria

1. WHEN a write operation completes, THE System SHALL ensure the Primary_Database and Offline_Cache contain the same data within 5 seconds
2. WHEN a conflict is detected, THE System SHALL prefer the Primary_Database version
3. THE System SHALL maintain transaction atomicity for write operations
4. WHEN an escrow account is locked, THE System SHALL ensure the lock status is consistent across both databases
5. WHEN a listing is deactivated, THE System SHALL ensure the status is consistent across both databases

### Requirement 12: Error Handling for Marketplace Operations

**User Story:** As a developer, I want robust error handling for marketplace database operations, so that the system gracefully handles failures.

#### Acceptance Criteria

1. WHEN a marketplace write operation fails due to connectivity, THE System SHALL add it to the sync queue
2. WHEN a marketplace write operation fails due to validation errors, THE System SHALL return a descriptive error message
3. IF a listing creation fails, THEN THE System SHALL not create an associated transaction
4. IF an escrow creation fails, THEN THE System SHALL roll back the associated transaction
5. THE System SHALL log all marketplace database errors with full context

### Requirement 13: Performance Optimization for Marketplace Data

**User Story:** As a user, I want fast response times for marketplace operations, so that browsing and purchasing feels responsive.

#### Acceptance Criteria

1. WHEN querying active listings, THE System SHALL return results within 200ms for cached data
2. THE System SHALL use indexes on frequently queried fields (farmer_id, is_active, status)
3. WHEN querying transactions by listing, THE System SHALL use the listing_id index for fast lookups
4. WHEN querying escrow by transaction, THE System SHALL use the transaction_id index for fast lookups
5. THE Sync_Engine SHALL batch marketplace sync operations when processing more than 10 items

### Requirement 14: Referential Integrity

**User Story:** As a system architect, I want referential integrity between marketplace entities, so that data relationships remain valid.

#### Acceptance Criteria

1. WHEN a transaction is created, THE System SHALL verify the listing_id references an existing listing
2. WHEN an escrow account is created, THE System SHALL verify the transaction_id references an existing transaction
3. WHEN a listing is queried, THE System SHALL verify the farmer_id references an existing user
4. THE System SHALL enforce foreign key constraints in the Primary_Database
5. THE System SHALL validate entity relationships before adding operations to the sync queue
