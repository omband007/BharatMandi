---
parent_spec: bharat-mandi-main
implements_requirements: [8]
depends_on: []
status: complete
type: infrastructure
---

# Requirements Document

**Parent Spec:** [Bharat Mandi](../../bharat-mandi-main/requirements.md) - Requirement 8 (Offline Functionality)  
**Status:** ✅ Complete  
**Type:** Infrastructure Foundation

## Introduction

This document specifies the requirements for implementing a dual database architecture for the Bharat Mandi application. The system will use PostgreSQL as the primary database for persistent storage and SQLite as an offline cache for mobile/offline scenarios. The architecture enables seamless operation in both online and offline modes with automatic synchronization between the databases.

## Glossary

- **Primary_Database**: PostgreSQL database that serves as the authoritative source of truth for all user data
- **Offline_Cache**: SQLite database that stores a local copy of data for offline access and performance optimization
- **Sync_Engine**: Component responsible for synchronizing data between PostgreSQL and SQLite
- **Sync_Queue**: Persistent queue in SQLite that stores operations performed while offline for later synchronization
- **Write_Operation**: Any CREATE, UPDATE, or DELETE operation on user data
- **Read_Operation**: Any SELECT or query operation to retrieve user data
- **Connectivity_Status**: Boolean state indicating whether the application can connect to PostgreSQL
- **Auth_Service**: Authentication service component that manages user authentication and registration
- **Migration_Process**: One-time process to transfer existing SQLite user data to PostgreSQL

## Requirements

### Requirement 1: PostgreSQL as Primary Database

**User Story:** As a system administrator, I want all user data stored in PostgreSQL as the primary database, so that data persists reliably and can be accessed across multiple devices.

#### Acceptance Criteria

1. THE Primary_Database SHALL store all user records with complete user information including id, phone_number, name, user_type, location, bank_account, pin_hash, failed_attempts, locked_until, created_at, and updated_at
2. WHEN a write operation is performed, THE Primary_Database SHALL be updated first before any other database
3. THE Primary_Database SHALL serve as the authoritative source of truth for all user data
4. WHEN the Primary_Database is available, THE System SHALL use it for all write operations
5. THE Primary_Database SHALL maintain referential integrity and data consistency constraints

### Requirement 2: SQLite as Offline Cache

**User Story:** As a mobile user, I want to access user data when offline, so that I can continue using the application without internet connectivity.

#### Acceptance Criteria

1. THE Offline_Cache SHALL maintain a synchronized copy of user data from the Primary_Database
2. WHEN the Primary_Database is unavailable, THE System SHALL serve read operations from the Offline_Cache
3. THE Offline_Cache SHALL store the same user data structure as the Primary_Database
4. WHEN connectivity is restored, THE Offline_Cache SHALL synchronize with the Primary_Database
5. THE Offline_Cache SHALL not be modified directly except through the Sync_Engine

### Requirement 3: Bidirectional Sync Mechanism

**User Story:** As a developer, I want automatic synchronization between PostgreSQL and SQLite, so that both databases remain consistent without manual intervention.

#### Acceptance Criteria

1. WHEN data is written to the Primary_Database, THE Sync_Engine SHALL propagate changes to the Offline_Cache within 5 seconds
2. WHEN the System detects connectivity to the Primary_Database, THE Sync_Engine SHALL process all pending items in the Sync_Queue
3. THE Sync_Engine SHALL synchronize user data in both directions (PostgreSQL to SQLite and SQLite to PostgreSQL)
4. WHEN a sync operation fails, THE Sync_Engine SHALL retry with exponential backoff up to 3 attempts
5. THE Sync_Engine SHALL log all sync operations with timestamps and status

### Requirement 4: Write Operations to PostgreSQL

**User Story:** As a developer, I want all write operations to target PostgreSQL first, so that data is persisted reliably before being cached.

#### Acceptance Criteria

1. WHEN a user is created, THE Auth_Service SHALL write to the Primary_Database first
2. WHEN a user profile is updated, THE Auth_Service SHALL write to the Primary_Database first
3. WHEN a user PIN is updated, THE Auth_Service SHALL write to the Primary_Database first
4. WHEN a write operation to the Primary_Database succeeds, THE System SHALL then update the Offline_Cache
5. IF a write operation to the Primary_Database fails, THEN THE System SHALL add the operation to the Sync_Queue

### Requirement 5: Read Operations with Fallback

**User Story:** As a user, I want the application to work seamlessly regardless of connectivity, so that I experience no interruption in service.

#### Acceptance Criteria

1. WHEN the Primary_Database is available, THE System SHALL serve read operations from the Primary_Database
2. IF the Primary_Database is unavailable, THEN THE System SHALL serve read operations from the Offline_Cache
3. WHEN serving from the Offline_Cache, THE System SHALL indicate the data may be stale
4. THE System SHALL check connectivity to the Primary_Database before each read operation
5. WHEN connectivity is restored, THE System SHALL switch back to reading from the Primary_Database

### Requirement 6: Offline Operations Queue

**User Story:** As a mobile user, I want my actions to be saved when offline, so that they are synchronized when I regain connectivity.

#### Acceptance Criteria

1. WHEN a write operation is attempted while the Primary_Database is unavailable, THE System SHALL add the operation to the Sync_Queue
2. THE Sync_Queue SHALL store operation_type, entity_type, entity_id, data, created_at, retry_count, last_retry_at, and error_message
3. WHEN connectivity is restored, THE Sync_Engine SHALL process Sync_Queue items in chronological order
4. WHEN a Sync_Queue item is successfully synchronized, THE System SHALL remove it from the queue
5. IF a Sync_Queue item fails after 3 retry attempts, THEN THE System SHALL mark it as failed and log the error

### Requirement 7: Auth Service Integration

**User Story:** As a developer, I want the Auth Service to use the dual database system, so that authentication works with both online and offline modes.

#### Acceptance Criteria

1. WHEN a user registers, THE Auth_Service SHALL create the user in the Primary_Database first
2. WHEN a user logs in, THE Auth_Service SHALL verify credentials against the Primary_Database if available
3. IF the Primary_Database is unavailable during login, THEN THE Auth_Service SHALL verify credentials against the Offline_Cache
4. WHEN a user updates their PIN, THE Auth_Service SHALL update the Primary_Database first
5. THE Auth_Service SHALL use the Sync_Engine for all database operations

### Requirement 8: Data Consistency Guarantees

**User Story:** As a system architect, I want strong consistency guarantees between databases, so that users never see conflicting or stale data.

#### Acceptance Criteria

1. WHEN a write operation completes, THE System SHALL ensure the Primary_Database and Offline_Cache contain the same data within 5 seconds
2. THE System SHALL use timestamps to resolve conflicts when the same record is modified in both databases
3. WHEN a conflict is detected, THE System SHALL prefer the Primary_Database version
4. THE System SHALL maintain transaction atomicity for write operations
5. THE System SHALL log all data consistency violations for monitoring

### Requirement 9: Connection Health Monitoring

**User Story:** As a system administrator, I want to monitor database connectivity, so that I can detect and respond to connection issues.

#### Acceptance Criteria

1. THE System SHALL check Primary_Database connectivity every 30 seconds
2. WHEN the Primary_Database becomes unavailable, THE System SHALL log the event and switch to offline mode
3. WHEN the Primary_Database becomes available after being unavailable, THE System SHALL log the event and trigger synchronization
4. THE System SHALL expose a health check endpoint that reports Connectivity_Status
5. THE System SHALL track and report the last successful sync timestamp for each entity type

### Requirement 10: Error Handling and Recovery

**User Story:** As a developer, I want robust error handling for database operations, so that the system gracefully handles failures.

#### Acceptance Criteria

1. WHEN a database operation fails, THE System SHALL log the error with full context
2. IF a write operation to the Primary_Database fails due to connectivity, THEN THE System SHALL add it to the Sync_Queue
3. IF a write operation fails due to validation errors, THEN THE System SHALL return a descriptive error message
4. WHEN the Sync_Engine encounters an error, THE System SHALL retry with exponential backoff
5. THE System SHALL expose metrics for failed operations and retry counts

### Requirement 11: Performance Optimization

**User Story:** As a user, I want fast response times for database operations, so that the application feels responsive.

#### Acceptance Criteria

1. WHEN reading user data, THE System SHALL return results within 200ms for cached data
2. THE System SHALL use connection pooling for the Primary_Database with a maximum of 20 connections
3. THE Offline_Cache SHALL use indexes on phone_number and id fields for fast lookups
4. THE Sync_Engine SHALL batch sync operations when processing more than 10 items
5. THE System SHALL close idle database connections after 30 seconds

