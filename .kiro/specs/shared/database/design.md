---
parent_spec: bharat-mandi-main
implements_requirements: [8]
depends_on: []
status: complete
type: infrastructure
---

# Design Document: Database Sync PostgreSQL-SQLite

**Parent Spec:** [Bharat Mandi Design](../../bharat-mandi-main/design.md)  
**Related Requirements:** [Database Sync Requirements](./requirements.md)  
**Status:** ✅ Complete  
**Type:** Infrastructure Foundation

## Overview

This design implements a dual database architecture for the Bharat Mandi application, using PostgreSQL as the primary authoritative database and SQLite as an offline cache. The system enables seamless operation in both online and offline modes with automatic bidirectional synchronization.

The architecture follows these key principles:
- **PostgreSQL First**: All write operations target PostgreSQL when available
- **SQLite Fallback**: Read operations fall back to SQLite when PostgreSQL is unavailable
- **Automatic Sync**: Changes propagate automatically between databases
- **Offline Queue**: Operations performed offline are queued and synchronized when connectivity returns
- **Minimal Disruption**: Existing auth service integration requires minimal changes

The design leverages the existing vertical slicing architecture (feature-based organization) and integrates with the current auth service that uses SQLite helpers.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
│                  (Auth Service, Features)                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   Database Abstraction Layer                 │
│                    (Unified Interface)                       │
└───────────┬─────────────────────────────────┬───────────────┘
            │                                 │
            ▼                                 ▼
┌───────────────────────┐         ┌──────────────────────────┐
│   PostgreSQL Adapter  │         │    SQLite Adapter        │
│   (Primary Database)  │         │   (Offline Cache)        │
└───────────┬───────────┘         └──────────┬───────────────┘
            │                                 │
            ▼                                 ▼
┌───────────────────────┐         ┌──────────────────────────┐
│    PostgreSQL DB      │◄────────┤    Sync Engine           │
│  (Source of Truth)    │         │  (Bidirectional Sync)    │
└───────────────────────┘         └──────────┬───────────────┘
                                              │
                                              ▼
                                  ┌──────────────────────────┐
                                  │      SQLite DB           │
                                  │   (Local Cache)          │
                                  └──────────────────────────┘
```

### Component Responsibilities

**Database Abstraction Layer**:
- Provides unified interface for CRUD operations
- Routes operations to appropriate database based on connectivity
- Handles fallback logic transparently
- Manages transaction boundaries

**PostgreSQL Adapter**:
- Implements user CRUD operations for PostgreSQL
- Manages connection pooling (max 20 connections)
- Handles connection health checks
- Provides transaction support

**SQLite Adapter**:
- Wraps existing sqlite-helpers.ts functions
- Provides same interface as PostgreSQL adapter
- Manages local cache operations
- Handles sync queue operations

**Sync Engine**:
- Monitors PostgreSQL connectivity (every 30 seconds)
- Processes sync queue when connectivity restored
- Propagates PostgreSQL changes to SQLite (within 5 seconds)
- Implements retry logic with exponential backoff (max 3 attempts)
- Resolves conflicts using timestamp-based strategy (PostgreSQL wins)
- Batches operations when processing >10 items

**Connection Monitor**:
- Tracks PostgreSQL connectivity status
- Emits events on connectivity changes
- Provides health check endpoint
- Logs connectivity transitions

## Components and Interfaces

### 1. Database Abstraction Layer

**File**: `src/shared/database/db-abstraction.ts`

```typescript
// Unified database interface
export interface DatabaseAdapter {
  // User operations
  createUser(user: User, pinHash?: string): Promise<User>;
  getUserById(id: string): Promise<User | undefined>;
  getUserByPhone(phoneNumber: string): Promise<User | undefined>;
  updateUser(userId: string, updates: Partial<User>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  
  // PIN operations
  getUserPinHash(phoneNumber: string): Promise<string | undefined>;
  updateUserPin(phoneNumber: string, pinHash: string): Promise<void>;
  
  // Account security operations
  getFailedAttempts(phoneNumber: string): Promise<{ failed_attempts: number; locked_until?: string } | undefined>;
  incrementFailedAttempts(phoneNumber: string): Promise<void>;
  resetFailedAttempts(phoneNumber: string): Promise<void>;
  lockAccount(phoneNumber: string, lockUntil: Date): Promise<void>;
  
  // OTP operations
  createOTPSession(session: OTPSession): Promise<void>;
  getOTPSession(phoneNumber: string): Promise<OTPSession | undefined>;
  updateOTPAttempts(phoneNumber: string, attempts: number): Promise<void>;
  deleteOTPSession(phoneNumber: string): Promise<void>;
}

// Main database manager
export class DatabaseManager {
  private pgAdapter: PostgreSQLAdapter;
  private sqliteAdapter: SQLiteAdapter;
  private syncEngine: SyncEngine;
  private connectionMonitor: ConnectionMonitor;
  
  constructor() {
    this.pgAdapter = new PostgreSQLAdapter();
    this.sqliteAdapter = new SQLiteAdapter();
    this.connectionMonitor = new ConnectionMonitor(this.pgAdapter);
    this.syncEngine = new SyncEngine(this.pgAdapter, this.sqliteAdapter, this.connectionMonitor);
  }
  
  // Write operations - always target PostgreSQL first
  async createUser(user: User, pinHash?: string): Promise<User> {
    if (await this.connectionMonitor.isConnected()) {
      try {
        const createdUser = await this.pgAdapter.createUser(user, pinHash);
        // Async propagation to SQLite
        this.syncEngine.propagateToSQLite('CREATE', 'user', createdUser.id, createdUser);
        return createdUser;
      } catch (error) {
        // Queue for later sync
        await this.syncEngine.addToQueue('CREATE', 'user', user.id, user);
        throw error;
      }
    } else {
      // Offline mode - queue operation
      await this.syncEngine.addToQueue('CREATE', 'user', user.id, user);
      throw new Error('PostgreSQL unavailable. Operation queued for sync.');
    }
  }
  
  // Read operations - PostgreSQL first, fallback to SQLite
  async getUserByPhone(phoneNumber: string): Promise<User | undefined> {
    if (await this.connectionMonitor.isConnected()) {
      try {
        return await this.pgAdapter.getUserByPhone(phoneNumber);
      } catch (error) {
        console.warn('PostgreSQL read failed, falling back to SQLite:', error);
        return await this.sqliteAdapter.getUserByPhone(phoneNumber);
      }
    } else {
      return await this.sqliteAdapter.getUserByPhone(phoneNumber);
    }
  }
  
  // Similar patterns for other operations...
}
```

### 2. PostgreSQL Adapter

**File**: `src/shared/database/pg-adapter.ts`

```typescript
import { pool } from './pg-config';
import type { User, OTPSession } from '../../features/auth/auth.types';

export class PostgreSQLAdapter implements DatabaseAdapter {
  // User operations
  async createUser(user: User, pinHash?: string): Promise<User> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO users (
          id, phone_number, name, user_type, location, bank_account, 
          pin_hash, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          user.id,
          user.phoneNumber,
          user.name,
          user.userType,
          JSON.stringify(user.location),
          user.bankAccount ? JSON.stringify(user.bankAccount) : null,
          pinHash,
          user.createdAt,
          user.updatedAt || user.createdAt
        ]
      );
      return this.mapRowToUser(result.rows[0]);
    } finally {
      client.release();
    }
  }
  
  async getUserByPhone(phoneNumber: string): Promise<User | undefined> {
    const result = await pool.query(
      'SELECT * FROM users WHERE phone_number = $1',
      [phoneNumber]
    );
    return result.rows[0] ? this.mapRowToUser(result.rows[0]) : undefined;
  }
  
  async updateUserPin(phoneNumber: string, pinHash: string): Promise<void> {
    await pool.query(
      'UPDATE users SET pin_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE phone_number = $2',
      [pinHash, phoneNumber]
    );
  }
  
  // Helper to map PostgreSQL row to User object
  private mapRowToUser(row: any): User {
    return {
      id: row.id,
      phoneNumber: row.phone_number,
      name: row.name,
      userType: row.user_type,
      location: JSON.parse(row.location),
      bankAccount: row.bank_account ? JSON.parse(row.bank_account) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: row.updated_at ? new Date(row.updated_at) : undefined
    };
  }
  
  // OTP operations
  async createOTPSession(session: OTPSession): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Delete existing sessions
      await client.query('DELETE FROM otp_sessions WHERE phone_number = $1', [session.phoneNumber]);
      // Insert new session
      await client.query(
        'INSERT INTO otp_sessions (phone_number, otp, expires_at, attempts) VALUES ($1, $2, $3, $4)',
        [session.phoneNumber, session.otp, session.expiresAt, session.attempts]
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  async getOTPSession(phoneNumber: string): Promise<OTPSession | undefined> {
    const result = await pool.query(
      'SELECT * FROM otp_sessions WHERE phone_number = $1 ORDER BY created_at DESC LIMIT 1',
      [phoneNumber]
    );
    if (!result.rows[0]) return undefined;
    
    const row = result.rows[0];
    return {
      phoneNumber: row.phone_number,
      otp: row.otp,
      expiresAt: new Date(row.expires_at),
      attempts: row.attempts
    };
  }
  
  // Connection health check
  async checkConnection(): Promise<boolean> {
    try {
      const result = await pool.query('SELECT 1');
      return result.rowCount === 1;
    } catch (error) {
      return false;
    }
  }
}
```

### 3. SQLite Adapter

**File**: `src/shared/database/sqlite-adapter.ts`

```typescript
import * as sqliteHelpers from './sqlite-helpers';
import type { User, OTPSession } from '../../features/auth/auth.types';

// Wrapper around existing sqlite-helpers to implement DatabaseAdapter interface
export class SQLiteAdapter implements DatabaseAdapter {
  async createUser(user: User, pinHash?: string): Promise<User> {
    return await sqliteHelpers.createUser(user, pinHash);
  }
  
  async getUserById(id: string): Promise<User | undefined> {
    return await sqliteHelpers.getUserById(id);
  }
  
  async getUserByPhone(phoneNumber: string): Promise<User | undefined> {
    return await sqliteHelpers.getUserByPhone(phoneNumber);
  }
  
  async updateUser(userId: string, updates: Partial<User>): Promise<User | undefined> {
    return await sqliteHelpers.updateUser(userId, updates);
  }
  
  async getUserPinHash(phoneNumber: string): Promise<string | undefined> {
    return await sqliteHelpers.getUserPinHash(phoneNumber);
  }
  
  async updateUserPin(phoneNumber: string, pinHash: string): Promise<void> {
    return await sqliteHelpers.updateUserPin(phoneNumber, pinHash);
  }
  
  async createOTPSession(session: OTPSession): Promise<void> {
    return await sqliteHelpers.createOTPSession(session);
  }
  
  async getOTPSession(phoneNumber: string): Promise<OTPSession | undefined> {
    return await sqliteHelpers.getOTPSession(phoneNumber);
  }
  
  // All other methods delegate to sqlite-helpers...
}
```

### 4. Sync Engine

**File**: `src/shared/database/sync-engine.ts`

```typescript
export interface SyncQueueItem {
  id?: number;
  operation_type: 'CREATE' | 'UPDATE' | 'DELETE';
  entity_type: string;
  entity_id: string;
  data: any;
  created_at?: Date;
  retry_count?: number;
  last_retry_at?: Date;
  error_message?: string;
}

export class SyncEngine {
  private pgAdapter: PostgreSQLAdapter;
  private sqliteAdapter: SQLiteAdapter;
  private connectionMonitor: ConnectionMonitor;
  private syncInterval: NodeJS.Timeout | null = null;
  private isSyncing: boolean = false;
  
  constructor(
    pgAdapter: PostgreSQLAdapter,
    sqliteAdapter: SQLiteAdapter,
    connectionMonitor: ConnectionMonitor
  ) {
    this.pgAdapter = pgAdapter;
    this.sqliteAdapter = sqliteAdapter;
    this.connectionMonitor = connectionMonitor;
    
    // Listen for connectivity changes
    this.connectionMonitor.on('connected', () => this.onConnected());
    this.connectionMonitor.on('disconnected', () => this.onDisconnected());
  }
  
  // Start sync engine
  start(): void {
    // Process queue every 30 seconds when connected
    this.syncInterval = setInterval(() => {
      if (this.connectionMonitor.isConnected() && !this.isSyncing) {
        this.processSyncQueue();
      }
    }, 30000);
  }
  
  stop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }
  
  // Add operation to sync queue
  async addToQueue(
    operationType: 'CREATE' | 'UPDATE' | 'DELETE',
    entityType: string,
    entityId: string,
    data: any
  ): Promise<void> {
    await sqliteHelpers.addToSyncQueue({
      operation_type: operationType,
      entity_type: entityType,
      entity_id: entityId,
      data: JSON.stringify(data)
    });
  }
  
  // Process sync queue
  async processSyncQueue(): Promise<void> {
    if (this.isSyncing) return;
    
    this.isSyncing = true;
    try {
      const items = await sqliteHelpers.getPendingSyncItems(50);
      
      if (items.length === 0) {
        return;
      }
      
      console.log(`Processing ${items.length} sync queue items`);
      
      // Batch processing for >10 items
      const shouldBatch = items.length > 10;
      
      for (const item of items) {
        try {
          await this.processSyncItem(item);
          await sqliteHelpers.removeSyncQueueItem(item.id!);
        } catch (error) {
          const retryCount = (item.retry_count || 0) + 1;
          
          if (retryCount >= 3) {
            console.error(`Sync item ${item.id} failed after 3 attempts:`, error);
            await sqliteHelpers.updateSyncQueueRetry(item.id!, `Failed after 3 attempts: ${error}`);
          } else {
            // Exponential backoff
            const backoffMs = Math.pow(2, retryCount) * 1000;
            await new Promise(resolve => setTimeout(resolve, backoffMs));
            await sqliteHelpers.updateSyncQueueRetry(item.id!, `Retry ${retryCount}: ${error}`);
          }
        }
      }
    } finally {
      this.isSyncing = false;
    }
  }
  
  // Process individual sync item
  private async processSyncItem(item: SyncQueueItem): Promise<void> {
    const data = JSON.parse(item.data);
    
    switch (item.entity_type) {
      case 'user':
        if (item.operation_type === 'CREATE') {
          await this.pgAdapter.createUser(data);
        } else if (item.operation_type === 'UPDATE') {
          await this.pgAdapter.updateUser(item.entity_id, data);
        }
        break;
      // Handle other entity types...
    }
  }
  
  // Propagate PostgreSQL changes to SQLite (async, within 5 seconds)
  async propagateToSQLite(
    operationType: 'CREATE' | 'UPDATE' | 'DELETE',
    entityType: string,
    entityId: string,
    data: any
  ): Promise<void> {
    // Run asynchronously without blocking
    setImmediate(async () => {
      try {
        switch (entityType) {
          case 'user':
            if (operationType === 'CREATE') {
              await this.sqliteAdapter.createUser(data);
            } else if (operationType === 'UPDATE') {
              await this.sqliteAdapter.updateUser(entityId, data);
            }
            break;
        }
      } catch (error) {
        console.error('Failed to propagate to SQLite:', error);
      }
    });
  }
  
  // Handle connectivity restored
  private async onConnected(): Promise<void> {
    console.log('PostgreSQL connection restored, processing sync queue');
    await this.processSyncQueue();
  }
  
  // Handle connectivity lost
  private onDisconnected(): Promise<void> {
    console.log('PostgreSQL connection lost, entering offline mode');
    return Promise.resolve();
  }
}
```

### 5. Connection Monitor

**File**: `src/shared/database/connection-monitor.ts`

```typescript
import { EventEmitter } from 'events';

export class ConnectionMonitor extends EventEmitter {
  private pgAdapter: PostgreSQLAdapter;
  private connected: boolean = false;
  private checkInterval: NodeJS.Timeout | null = null;
  private lastCheckTime: Date | null = null;
  
  constructor(pgAdapter: PostgreSQLAdapter) {
    super();
    this.pgAdapter = pgAdapter;
  }
  
  // Start monitoring
  start(): void {
    // Check connectivity every 30 seconds
    this.checkInterval = setInterval(() => {
      this.checkConnectivity();
    }, 30000);
    
    // Initial check
    this.checkConnectivity();
  }
  
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
  
  // Check PostgreSQL connectivity
  private async checkConnectivity(): Promise<void> {
    const wasConnected = this.connected;
    this.connected = await this.pgAdapter.checkConnection();
    this.lastCheckTime = new Date();
    
    // Emit events on state change
    if (this.connected && !wasConnected) {
      console.log('[ConnectionMonitor] PostgreSQL connected');
      this.emit('connected');
    } else if (!this.connected && wasConnected) {
      console.log('[ConnectionMonitor] PostgreSQL disconnected');
      this.emit('disconnected');
    }
  }
  
  // Get current connectivity status
  isConnected(): boolean {
    return this.connected;
  }
  
  // Get last check time
  getLastCheckTime(): Date | null {
    return this.lastCheckTime;
  }
  
  // Health check endpoint data
  getHealthStatus(): {
    connected: boolean;
    lastCheck: Date | null;
  } {
    return {
      connected: this.connected,
      lastCheck: this.lastCheckTime
    };
  }
}
```

## Data Models

### PostgreSQL Schema

**File**: `src/shared/database/pg-schema.sql`

```sql
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  phone_number VARCHAR(10) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  user_type VARCHAR(50) NOT NULL,
  location JSONB NOT NULL,
  bank_account JSONB,
  pin_hash VARCHAR(255),
  failed_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- OTP sessions table
CREATE TABLE IF NOT EXISTS otp_sessions (
  id SERIAL PRIMARY KEY,
  phone_number VARCHAR(10) NOT NULL,
  otp VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_sessions(phone_number);
CREATE INDEX IF NOT EXISTS idx_otp_expires ON otp_sessions(expires_at);

-- Sync status tracking
CREATE TABLE IF NOT EXISTS sync_status (
  id SERIAL PRIMARY KEY,
  entity_type VARCHAR(50) UNIQUE NOT NULL,
  last_sync_at TIMESTAMP,
  last_sync_status VARCHAR(20) NOT NULL DEFAULT 'SUCCESS',
  records_synced INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Initialize sync status for users
INSERT INTO sync_status (entity_type, last_sync_status)
VALUES ('users', 'SUCCESS')
ON CONFLICT (entity_type) DO NOTHING;
```

### SQLite Schema Updates

The existing SQLite schema already has most tables. We need to ensure the `pending_sync_queue` table exists:

```sql
-- Sync queue table (already exists in sqlite-schema.sql)
CREATE TABLE IF NOT EXISTS pending_sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  operation_type TEXT NOT NULL CHECK(operation_type IN ('CREATE', 'UPDATE', 'DELETE')),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  data TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  retry_count INTEGER DEFAULT 0,
  last_retry_at TIMESTAMP,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_sync_queue_created ON pending_sync_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_sync_queue_entity ON pending_sync_queue(entity_type, entity_id);
```

### User Data Model

Both databases store the same user structure:

```typescript
interface User {
  id: string;                    // UUID
  phoneNumber: string;           // 10-digit Indian mobile number
  name: string;                  // User's full name
  userType: UserType;            // 'FARMER' | 'BUYER' | 'ADMIN'
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  bankAccount?: {
    accountNumber: string;
    ifscCode: string;
    bankName: string;
    accountHolderName: string;
  };
  createdAt: Date;
  updatedAt?: Date;
}
```

### Sync Queue Item Model

```typescript
interface SyncQueueItem {
  id?: number;
  operation_type: 'CREATE' | 'UPDATE' | 'DELETE';
  entity_type: string;           // 'user', 'listing', etc.
  entity_id: string;             // ID of the entity
  data: string;                  // JSON-serialized entity data
  created_at?: Date;
  retry_count?: number;          // Number of retry attempts
  last_retry_at?: Date;
  error_message?: string;
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Write Operations Target PostgreSQL First

*For any* write operation (create user, update user, update PIN) when PostgreSQL is available, the operation should write to PostgreSQL before writing to SQLite.

**Validates: Requirements 1.2, 1.4, 4.1, 4.2, 4.3, 8.1, 8.4**

### Property 2: Read Operations Fall Back to SQLite

*For any* read operation when PostgreSQL is unavailable, the system should serve the request from SQLite and indicate the data may be stale.

**Validates: Requirements 2.2, 5.2, 5.3, 8.3**

### Property 3: Successful Writes Propagate to SQLite

*For any* successful write operation to PostgreSQL, the change should propagate to SQLite within 5 seconds.

**Validates: Requirements 3.1, 4.4, 9.1**

### Property 4: Failed Writes Are Queued

*For any* write operation that fails due to PostgreSQL unavailability, the operation should be added to the sync queue with all necessary data to retry later.

**Validates: Requirements 4.5, 6.1, 11.2**

### Property 5: Sync Queue Processes in Order

*For any* set of queued operations, when connectivity is restored, the sync engine should process them in chronological order (oldest first).

**Validates: Requirements 3.2, 6.3**

### Property 6: Successful Sync Removes Queue Items

*For any* sync queue item that successfully synchronizes to PostgreSQL, the item should be removed from the queue.

**Validates: Requirements 6.4**

### Property 7: Failed Sync Items Retry with Backoff

*For any* sync operation that fails, the system should retry with exponential backoff (2^n seconds) up to 3 attempts, then mark as failed.

**Validates: Requirements 3.4, 11.4**

### Property 8: Failed Items Marked After Max Retries

*For any* sync queue item that fails 3 times, the item should be marked as failed with an error message and not retried further.

**Validates: Requirements 6.5**

### Property 9: Databases Converge After Sync

*For any* user record, after synchronization completes successfully, querying the same user from PostgreSQL and SQLite should return equivalent data.

**Validates: Requirements 2.1, 2.4**

### Property 10: Conflict Resolution Prefers PostgreSQL

*For any* conflict where the same user record is modified in both databases, the system should resolve the conflict by preferring the PostgreSQL version.

**Validates: Requirements 8.2, 8.3**

### Property 11: Connectivity Changes Trigger Sync

*For any* transition from disconnected to connected state, the system should trigger synchronization of all pending queue items.

**Validates: Requirements 9.2, 9.3**

### Property 12: Sync Timestamps Are Tracked

*For any* entity type, after a successful sync operation, the system should update and persist the last successful sync timestamp.

**Validates: Requirements 9.5**

### Property 13: Validation Errors Return Descriptive Messages

*For any* write operation that fails due to validation errors (invalid phone format, missing required fields), the system should return a descriptive error message indicating what validation failed.

**Validates: Requirements 10.3**

### Property 14: Batch Processing for Large Queues

*For any* sync queue containing more than 10 items, the sync engine should process them in batches rather than one at a time.

**Validates: Requirements 11.4**

### Property 15: Read Operations Use PostgreSQL When Available

*For any* read operation when PostgreSQL is available and responsive, the system should serve the request from PostgreSQL rather than SQLite.

**Validates: Requirements 5.1, 5.5, 7.2**

## Error Handling

### Connection Errors

**PostgreSQL Connection Failures**:
- Catch connection timeout errors (2 second timeout)
- Log error with full context (timestamp, operation, error message)
- Switch to offline mode immediately
- Queue write operations for later sync
- Serve reads from SQLite cache

**SQLite Connection Failures**:
- These are critical since SQLite is the fallback
- Log error and alert monitoring system
- Attempt to reopen database connection
- If SQLite fails, return error to user (cannot operate without any database)

### Sync Errors

**Queue Processing Errors**:
- Catch and log each item's error individually
- Don't let one failed item block others
- Implement exponential backoff: 2^n seconds (2s, 4s, 8s)
- After 3 failures, mark item as failed
- Continue processing remaining queue items

**Conflict Resolution Errors**:
- Log conflicts with both versions of data
- Apply timestamp-based resolution (PostgreSQL wins)
- If timestamps are equal, prefer PostgreSQL version
- Update SQLite with resolved version

### Data Validation Errors

**User Data Validation**:
- Validate phone number format (10 digits, starts with 6-9)
- Validate required fields (name, userType, location)
- Validate JSON structure for location and bankAccount
- Return descriptive error messages to caller
- Don't queue invalid data for sync

**PIN Validation**:
- Validate PIN format (4-6 digits)
- Hash before storage
- Never log or expose PIN in plain text

### Migration Errors

**Note**: Data migration from existing SQLite to PostgreSQL is not included in this POC phase. The system assumes PostgreSQL starts empty and users are created fresh in both databases going forward.

## Testing Strategy

### Dual Testing Approach

This feature requires both unit tests and property-based tests for comprehensive coverage:

**Unit Tests** focus on:
- Specific examples of database operations
- Edge cases (empty data, null values, boundary conditions)
- Error conditions (connection failures, validation errors)
- Integration points between components
- Migration process with known data sets

**Property-Based Tests** focus on:
- Universal properties that hold for all inputs
- Comprehensive input coverage through randomization
- Concurrent operation scenarios
- Sync engine behavior across many operations
- Data consistency guarantees

### Property-Based Testing Configuration

**Framework**: Use `fast-check` library for TypeScript property-based testing

**Configuration**:
- Minimum 100 iterations per property test
- Each test tagged with: `Feature: database-sync-postgresql-sqlite, Property N: [property text]`
- Use custom generators for User objects, phone numbers, and operations

**Test Organization**:
```
src/shared/database/__tests__/
  ├── db-abstraction.test.ts          # Unit tests for DatabaseManager
  ├── db-abstraction.pbt.test.ts      # Property tests for DatabaseManager
  ├── sync-engine.test.ts             # Unit tests for SyncEngine
  ├── sync-engine.pbt.test.ts         # Property tests for SyncEngine
  ├── connection-monitor.test.ts      # Unit tests for ConnectionMonitor
  └── generators.ts                   # Custom generators for property tests
```

### Custom Generators

```typescript
// generators.ts
import fc from 'fast-check';
import { User, UserType } from '../../../features/auth/auth.types';

// Generate valid Indian phone numbers
export const phoneNumberArb = fc.stringOf(
  fc.integer({ min: 6, max: 9 }),
  { minLength: 1, maxLength: 1 }
).chain(first => 
  fc.stringOf(fc.integer({ min: 0, max: 9 }), { minLength: 9, maxLength: 9 })
    .map(rest => first + rest)
);

// Generate user type
export const userTypeArb = fc.constantFrom<UserType>('FARMER', 'BUYER', 'ADMIN');

// Generate location
export const locationArb = fc.record({
  latitude: fc.double({ min: -90, max: 90 }),
  longitude: fc.double({ min: -180, max: 180 }),
  address: fc.string({ minLength: 5, maxLength: 100 })
});

// Generate bank account
export const bankAccountArb = fc.record({
  accountNumber: fc.stringOf(fc.integer({ min: 0, max: 9 }), { minLength: 10, maxLength: 16 }),
  ifscCode: fc.string({ minLength: 11, maxLength: 11 }),
  bankName: fc.string({ minLength: 3, maxLength: 50 }),
  accountHolderName: fc.string({ minLength: 3, maxLength: 100 })
});

// Generate complete user
export const userArb = fc.record({
  id: fc.uuid(),
  phoneNumber: phoneNumberArb,
  name: fc.string({ minLength: 2, maxLength: 100 }),
  userType: userTypeArb,
  location: locationArb,
  bankAccount: fc.option(bankAccountArb, { nil: undefined }),
  createdAt: fc.date(),
  updatedAt: fc.option(fc.date(), { nil: undefined })
});

// Generate sync operations
export const syncOperationArb = fc.constantFrom('CREATE', 'UPDATE', 'DELETE');
```

### Example Property Test

```typescript
// db-abstraction.pbt.test.ts
import fc from 'fast-check';
import { DatabaseManager } from '../db-abstraction';
import { userArb } from './generators';

describe('DatabaseManager Property Tests', () => {
  let dbManager: DatabaseManager;
  
  beforeAll(async () => {
    dbManager = new DatabaseManager();
    await dbManager.initialize();
  });
  
  afterAll(async () => {
    await dbManager.close();
  });
  
  test('Property 1: Write operations target PostgreSQL first', async () => {
    // Feature: database-sync-postgresql-sqlite, Property 1: Write operations target PostgreSQL first
    await fc.assert(
      fc.asyncProperty(userArb, async (user) => {
        // Ensure PostgreSQL is connected
        const isConnected = await dbManager.isPostgreSQLConnected();
        fc.pre(isConnected); // Skip if not connected
        
        // Track which database was written to first
        const writeOrder: string[] = [];
        
        // Mock to track write order
        const originalPgCreate = dbManager['pgAdapter'].createUser;
        const originalSqliteCreate = dbManager['sqliteAdapter'].createUser;
        
        dbManager['pgAdapter'].createUser = async (...args) => {
          writeOrder.push('postgresql');
          return originalPgCreate.apply(dbManager['pgAdapter'], args);
        };
        
        dbManager['sqliteAdapter'].createUser = async (...args) => {
          writeOrder.push('sqlite');
          return originalSqliteCreate.apply(dbManager['sqliteAdapter'], args);
        };
        
        try {
          await dbManager.createUser(user);
          
          // PostgreSQL should be written first
          expect(writeOrder[0]).toBe('postgresql');
        } finally {
          // Restore original methods
          dbManager['pgAdapter'].createUser = originalPgCreate;
          dbManager['sqliteAdapter'].createUser = originalSqliteCreate;
        }
      }),
      { numRuns: 100 }
    );
  });
  
  test('Property 9: Databases converge after sync', async () => {
    // Feature: database-sync-postgresql-sqlite, Property 9: Databases converge after sync
    await fc.assert(
      fc.asyncProperty(userArb, async (user) => {
        // Create user in PostgreSQL
        await dbManager.createUser(user);
        
        // Wait for sync to complete (max 5 seconds)
        await new Promise(resolve => setTimeout(resolve, 5500));
        
        // Fetch from both databases
        const pgUser = await dbManager['pgAdapter'].getUserById(user.id);
        const sqliteUser = await dbManager['sqliteAdapter'].getUserById(user.id);
        
        // Both should exist and be equivalent
        expect(pgUser).toBeDefined();
        expect(sqliteUser).toBeDefined();
        expect(pgUser).toEqual(sqliteUser);
      }),
      { numRuns: 100 }
    );
  });
});
```

### Integration Tests

**End-to-End Scenarios**:
1. User registration flow (OTP → create user → verify in both DBs)
2. User login flow (online and offline modes)
3. PIN update flow (online and offline modes)
4. Connectivity loss and recovery scenario

**Test Environment**:
- Use Docker containers for PostgreSQL (test database)
- Use in-memory SQLite for fast tests
- Mock connection failures for offline scenarios
- Use test fixtures for known data sets

### Performance Tests

**Load Testing**:
- Test with 1000+ users in sync queue
- Measure sync processing time
- Verify batch processing activates for >10 items
- Ensure read operations complete within 200ms

**Stress Testing**:
- Simulate rapid connectivity changes
- Test concurrent write operations
- Verify connection pool limits (max 20)
- Test with large user data (long addresses, etc.)
