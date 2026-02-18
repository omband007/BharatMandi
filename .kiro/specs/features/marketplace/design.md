---
parent_spec: bharat-mandi
implements_requirements: [6, 7]
depends_on: [database-sync-postgresql-sqlite]
status: complete
type: feature
---

# Design Document: Persist Listings and Transactions

**Parent Spec:** [Bharat Mandi Design](../bharat-mandi/design.md)  
**Related Requirements:** [Persist Listings Requirements](./requirements.md)  
**Depends On:** [Dual Database Sync Design](../database-sync-postgresql-sqlite/design.md)  
**Status:** ✅ Complete

## Overview

This design extends the existing dual database architecture (PostgreSQL + SQLite with sync) to persist marketplace data: listings, transactions, and escrow accounts. The system will migrate from in-memory storage (memory-db.ts) to persistent storage, reusing the existing DatabaseManager, ConnectionMonitor, and SyncEngine infrastructure that is already implemented and working for user authentication.

The design follows the same architectural patterns established in the database-sync-postgresql-sqlite spec:
- **PostgreSQL First**: All write operations target PostgreSQL when available
- **SQLite Fallback**: Read operations fall back to SQLite when PostgreSQL is unavailable
- **Automatic Sync**: Changes propagate automatically between databases using the existing SyncEngine
- **Offline Queue**: Operations performed offline are queued and synchronized when connectivity returns
- **Minimal Disruption**: Existing marketplace services require minimal changes

Key benefits of this approach:
- Data persists across application restarts
- Marketplace operations work offline with automatic sync
- Consistent patterns with existing user authentication
- Leverages proven sync infrastructure
- No need to reimplement connection monitoring or sync logic

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
│            (Marketplace Service, Transaction Service)        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              DatabaseManager (Extended)                      │
│         (Unified Interface + Marketplace Operations)         │
└───────────┬─────────────────────────────────┬───────────────┘
            │                                 │
            ▼                                 ▼
┌───────────────────────┐         ┌──────────────────────────┐
│   PostgreSQL Adapter  │         │    SQLite Adapter        │
│   (Extended with      │         │   (Extended with         │
│   Marketplace Ops)    │         │   Marketplace Ops)       │
└───────────┬───────────┘         └──────────┬───────────────┘
            │                                 │
            ▼                                 ▼
┌───────────────────────┐         ┌──────────────────────────┐
│    PostgreSQL DB      │◄────────┤    Sync Engine           │
│  - users              │         │  (Extended with          │
│  - listings           │         │   Marketplace Entities)  │
│  - transactions       │         └──────────┬───────────────┘
│  - escrow_accounts    │                    │
└───────────────────────┘                    ▼
                                  ┌──────────────────────────┐
                                  │      SQLite DB           │
                                  │  - users                 │
                                  │  - listings              │
                                  │  - transactions          │
                                  │  - escrow_accounts       │
                                  │  - pending_sync_queue    │
                                  └──────────────────────────┘
```

### Component Responsibilities

**DatabaseManager (Extended)**:
- Adds marketplace CRUD operations to existing interface
- Routes marketplace operations to appropriate database based on connectivity
- Handles fallback logic for marketplace reads
- Manages transaction boundaries for marketplace writes
- Reuses existing connection monitoring and sync infrastructure

**PostgreSQL Adapter (Extended)**:
- Adds listing CRUD operations
- Adds transaction CRUD operations
- Adds escrow account CRUD operations
- Maintains same patterns as existing user operations
- Provides transaction support for atomic operations

**SQLite Adapter (Extended)**:
- Adds listing CRUD operations
- Adds transaction CRUD operations
- Adds escrow account CRUD operations
- Wraps new sqlite-helpers functions
- Maintains same interface as PostgreSQL adapter

**Sync Engine (Extended)**:
- Processes 'listing', 'transaction', and 'escrow' entity types
- Propagates marketplace changes from PostgreSQL to SQLite
- Handles marketplace operations in sync queue
- Reuses existing retry logic and exponential backoff
- Maintains same 5-second propagation guarantee

**Connection Monitor (No Changes)**:
- Already monitors PostgreSQL connectivity
- Already emits connectivity events
- No changes needed for marketplace data

## Components and Interfaces

### 1. Database Adapter Interface Extensions

**File**: `src/shared/database/db-abstraction.ts`

```typescript
// Extend existing DatabaseAdapter interface
export interface DatabaseAdapter {
  // ... existing user operations ...
  
  // Listing operations
  createListing(listing: Listing): Promise<Listing>;
  getListing(id: string): Promise<Listing | undefined>;
  getActiveListings(): Promise<Listing[]>;
  updateListing(id: string, updates: Partial<Listing>): Promise<Listing | undefined>;
  
  // Transaction operations
  createTransaction(transaction: Transaction): Promise<Transaction>;
  getTransaction(id: string): Promise<Transaction | undefined>;
  updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction | undefined>;
  
  // Escrow operations
  createEscrow(escrow: EscrowAccount): Promise<EscrowAccount>;
  getEscrow(id: string): Promise<EscrowAccount | undefined>;
  getEscrowByTransaction(transactionId: string): Promise<EscrowAccount | undefined>;
  updateEscrow(id: string, updates: Partial<EscrowAccount>): Promise<EscrowAccount | undefined>;
}
```

### 2. DatabaseManager Extensions

**File**: `src/shared/database/db-abstraction.ts`

```typescript
export class DatabaseManager {
  // ... existing properties and user methods ...
  
  // ============================================================================
  // Listing Operations
  // ============================================================================
  
  async createListing(listing: Listing): Promise<Listing> {
    if (this.connectionMonitor.isConnected()) {
      try {
        const created = await this.pgAdapter.createListing(listing);
        await this.syncEngine.propagateToSQLite('CREATE', 'listing', created.id, created);
        return created;
      } catch (error) {
        await this.syncEngine.addToQueue('CREATE', 'listing', listing.id, listing);
        throw error;
      }
    } else {
      await this.syncEngine.addToQueue('CREATE', 'listing', listing.id, listing);
      throw new Error('PostgreSQL unavailable. Operation queued for sync.');
    }
  }
  
  async getListing(id: string): Promise<Listing | undefined> {
    if (this.connectionMonitor.isConnected()) {
      try {
        return await this.pgAdapter.getListing(id);
      } catch (error) {
        console.warn('[DatabaseManager] PostgreSQL read failed, falling back to SQLite. Data may be stale.', error);
        return await this.sqliteAdapter.getListing(id);
      }
    } else {
      console.warn('[DatabaseManager] PostgreSQL unavailable, serving from SQLite. Data may be stale.');
      return await this.sqliteAdapter.getListing(id);
    }
  }
  
  async getActiveListings(): Promise<Listing[]> {
    if (this.connectionMonitor.isConnected()) {
      try {
        return await this.pgAdapter.getActiveListings();
      } catch (error) {
        console.warn('[DatabaseManager] PostgreSQL read failed, falling back to SQLite. Data may be stale.', error);
        return await this.sqliteAdapter.getActiveListings();
      }
    } else {
      console.warn('[DatabaseManager] PostgreSQL unavailable, serving from SQLite. Data may be stale.');
      return await this.sqliteAdapter.getActiveListings();
    }
  }
  
  async updateListing(id: string, updates: Partial<Listing>): Promise<Listing | undefined> {
    if (this.connectionMonitor.isConnected()) {
      try {
        const updated = await this.pgAdapter.updateListing(id, updates);
        if (updated) {
          await this.syncEngine.propagateToSQLite('UPDATE', 'listing', id, updated);
        }
        return updated;
      } catch (error) {
        await this.syncEngine.addToQueue('UPDATE', 'listing', id, updates);
        throw error;
      }
    } else {
      await this.syncEngine.addToQueue('UPDATE', 'listing', id, updates);
      throw new Error('PostgreSQL unavailable. Operation queued for sync.');
    }
  }
  
  // ============================================================================
  // Transaction Operations
  // ============================================================================
  
  async createTransaction(transaction: Transaction): Promise<Transaction> {
    if (this.connectionMonitor.isConnected()) {
      try {
        const created = await this.pgAdapter.createTransaction(transaction);
        await this.syncEngine.propagateToSQLite('CREATE', 'transaction', created.id, created);
        return created;
      } catch (error) {
        await this.syncEngine.addToQueue('CREATE', 'transaction', transaction.id, transaction);
        throw error;
      }
    } else {
      await this.syncEngine.addToQueue('CREATE', 'transaction', transaction.id, transaction);
      throw new Error('PostgreSQL unavailable. Operation queued for sync.');
    }
  }
  
  async getTransaction(id: string): Promise<Transaction | undefined> {
    if (this.connectionMonitor.isConnected()) {
      try {
        return await this.pgAdapter.getTransaction(id);
      } catch (error) {
        console.warn('[DatabaseManager] PostgreSQL read failed, falling back to SQLite. Data may be stale.', error);
        return await this.sqliteAdapter.getTransaction(id);
      }
    } else {
      console.warn('[DatabaseManager] PostgreSQL unavailable, serving from SQLite. Data may be stale.');
      return await this.sqliteAdapter.getTransaction(id);
    }
  }
  
  async updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction | undefined> {
    if (this.connectionMonitor.isConnected()) {
      try {
        const updated = await this.pgAdapter.updateTransaction(id, updates);
        if (updated) {
          await this.syncEngine.propagateToSQLite('UPDATE', 'transaction', id, updated);
        }
        return updated;
      } catch (error) {
        await this.syncEngine.addToQueue('UPDATE', 'transaction', id, updates);
        throw error;
      }
    } else {
      await this.syncEngine.addToQueue('UPDATE', 'transaction', id, updates);
      throw new Error('PostgreSQL unavailable. Operation queued for sync.');
    }
  }
  
  // ============================================================================
  // Escrow Operations
  // ============================================================================
  
  async createEscrow(escrow: EscrowAccount): Promise<EscrowAccount> {
    if (this.connectionMonitor.isConnected()) {
      try {
        const created = await this.pgAdapter.createEscrow(escrow);
        await this.syncEngine.propagateToSQLite('CREATE', 'escrow', created.id, created);
        return created;
      } catch (error) {
        await this.syncEngine.addToQueue('CREATE', 'escrow', escrow.id, escrow);
        throw error;
      }
    } else {
      await this.syncEngine.addToQueue('CREATE', 'escrow', escrow.id, escrow);
      throw new Error('PostgreSQL unavailable. Operation queued for sync.');
    }
  }
  
  async getEscrow(id: string): Promise<EscrowAccount | undefined> {
    if (this.connectionMonitor.isConnected()) {
      try {
        return await this.pgAdapter.getEscrow(id);
      } catch (error) {
        console.warn('[DatabaseManager] PostgreSQL read failed, falling back to SQLite. Data may be stale.', error);
        return await this.sqliteAdapter.getEscrow(id);
      }
    } else {
      console.warn('[DatabaseManager] PostgreSQL unavailable, serving from SQLite. Data may be stale.');
      return await this.sqliteAdapter.getEscrow(id);
    }
  }
  
  async getEscrowByTransaction(transactionId: string): Promise<EscrowAccount | undefined> {
    if (this.connectionMonitor.isConnected()) {
      try {
        return await this.pgAdapter.getEscrowByTransaction(transactionId);
      } catch (error) {
        console.warn('[DatabaseManager] PostgreSQL read failed, falling back to SQLite. Data may be stale.', error);
        return await this.sqliteAdapter.getEscrowByTransaction(transactionId);
      }
    } else {
      console.warn('[DatabaseManager] PostgreSQL unavailable, serving from SQLite. Data may be stale.');
      return await this.sqliteAdapter.getEscrowByTransaction(transactionId);
    }
  }
  
  async updateEscrow(id: string, updates: Partial<EscrowAccount>): Promise<EscrowAccount | undefined> {
    if (this.connectionMonitor.isConnected()) {
      try {
        const updated = await this.pgAdapter.updateEscrow(id, updates);
        if (updated) {
          await this.syncEngine.propagateToSQLite('UPDATE', 'escrow', id, updated);
        }
        return updated;
      } catch (error) {
        await this.syncEngine.addToQueue('UPDATE', 'escrow', id, updates);
        throw error;
      }
    } else {
      await this.syncEngine.addToQueue('UPDATE', 'escrow', id, updates);
      throw new Error('PostgreSQL unavailable. Operation queued for sync.');
    }
  }
}
```


### 3. PostgreSQL Adapter Extensions

**File**: `src/shared/database/pg-adapter.ts`

```typescript
import type { Listing } from '../../features/marketplace/marketplace.types';
import type { Transaction, EscrowAccount } from '../../features/transactions/transaction.types';

export class PostgreSQLAdapter implements DatabaseAdapter {
  // ... existing user operations ...
  
  // ============================================================================
  // Listing Operations
  // ============================================================================
  
  async createListing(listing: Listing): Promise<Listing> {
    const result = await pool.query(
      `INSERT INTO listings (
        id, farmer_id, produce_type, quantity, price_per_kg, 
        certificate_id, expected_harvest_date, is_active, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        listing.id,
        listing.farmerId,
        listing.produceType,
        listing.quantity,
        listing.pricePerKg,
        listing.certificateId,
        listing.expectedHarvestDate || null,
        listing.isActive,
        listing.createdAt
      ]
    );
    return this.mapRowToListing(result.rows[0]);
  }
  
  async getListing(id: string): Promise<Listing | undefined> {
    const result = await pool.query(
      'SELECT * FROM listings WHERE id = $1',
      [id]
    );
    return result.rows[0] ? this.mapRowToListing(result.rows[0]) : undefined;
  }
  
  async getActiveListings(): Promise<Listing[]> {
    const result = await pool.query(
      'SELECT * FROM listings WHERE is_active = true ORDER BY created_at DESC'
    );
    return result.rows.map(row => this.mapRowToListing(row));
  }
  
  async updateListing(id: string, updates: Partial<Listing>): Promise<Listing | undefined> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    if (updates.quantity !== undefined) {
      fields.push(`quantity = $${paramIndex++}`);
      values.push(updates.quantity);
    }
    if (updates.pricePerKg !== undefined) {
      fields.push(`price_per_kg = $${paramIndex++}`);
      values.push(updates.pricePerKg);
    }
    if (updates.isActive !== undefined) {
      fields.push(`is_active = $${paramIndex++}`);
      values.push(updates.isActive);
    }
    
    if (fields.length === 0) return this.getListing(id);
    
    values.push(id);
    const result = await pool.query(
      `UPDATE listings SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return result.rows[0] ? this.mapRowToListing(result.rows[0]) : undefined;
  }
  
  private mapRowToListing(row: any): Listing {
    return {
      id: row.id,
      farmerId: row.farmer_id,
      produceType: row.produce_type,
      quantity: parseFloat(row.quantity),
      pricePerKg: parseFloat(row.price_per_kg),
      certificateId: row.certificate_id,
      expectedHarvestDate: row.expected_harvest_date ? new Date(row.expected_harvest_date) : undefined,
      isActive: row.is_active,
      createdAt: new Date(row.created_at)
    };
  }
  
  // ============================================================================
  // Transaction Operations
  // ============================================================================
  
  async createTransaction(transaction: Transaction): Promise<Transaction> {
    const result = await pool.query(
      `INSERT INTO transactions (
        id, listing_id, farmer_id, buyer_id, amount, status, 
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        transaction.id,
        transaction.listingId,
        transaction.farmerId,
        transaction.buyerId,
        transaction.amount,
        transaction.status,
        transaction.createdAt,
        transaction.updatedAt
      ]
    );
    return this.mapRowToTransaction(result.rows[0]);
  }
  
  async getTransaction(id: string): Promise<Transaction | undefined> {
    const result = await pool.query(
      'SELECT * FROM transactions WHERE id = $1',
      [id]
    );
    return result.rows[0] ? this.mapRowToTransaction(result.rows[0]) : undefined;
  }
  
  async updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction | undefined> {
    const fields: string[] = ['updated_at = CURRENT_TIMESTAMP'];
    const values: any[] = [];
    let paramIndex = 1;
    
    if (updates.status !== undefined) {
      fields.push(`status = $${paramIndex++}`);
      values.push(updates.status);
    }
    if (updates.dispatchedAt !== undefined) {
      fields.push(`dispatched_at = $${paramIndex++}`);
      values.push(updates.dispatchedAt);
    }
    if (updates.deliveredAt !== undefined) {
      fields.push(`delivered_at = $${paramIndex++}`);
      values.push(updates.deliveredAt);
    }
    if (updates.completedAt !== undefined) {
      fields.push(`completed_at = $${paramIndex++}`);
      values.push(updates.completedAt);
    }
    
    values.push(id);
    const result = await pool.query(
      `UPDATE transactions SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return result.rows[0] ? this.mapRowToTransaction(result.rows[0]) : undefined;
  }
  
  private mapRowToTransaction(row: any): Transaction {
    return {
      id: row.id,
      listingId: row.listing_id,
      farmerId: row.farmer_id,
      buyerId: row.buyer_id,
      amount: parseFloat(row.amount),
      status: row.status,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      dispatchedAt: row.dispatched_at ? new Date(row.dispatched_at) : undefined,
      deliveredAt: row.delivered_at ? new Date(row.delivered_at) : undefined,
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined
    };
  }
  
  // ============================================================================
  // Escrow Operations
  // ============================================================================
  
  async createEscrow(escrow: EscrowAccount): Promise<EscrowAccount> {
    const result = await pool.query(
      `INSERT INTO escrow_accounts (
        id, transaction_id, amount, status, is_locked, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [
        escrow.id,
        escrow.transactionId,
        escrow.amount,
        escrow.status,
        escrow.isLocked,
        escrow.createdAt
      ]
    );
    return this.mapRowToEscrow(result.rows[0]);
  }
  
  async getEscrow(id: string): Promise<EscrowAccount | undefined> {
    const result = await pool.query(
      'SELECT * FROM escrow_accounts WHERE id = $1',
      [id]
    );
    return result.rows[0] ? this.mapRowToEscrow(result.rows[0]) : undefined;
  }
  
  async getEscrowByTransaction(transactionId: string): Promise<EscrowAccount | undefined> {
    const result = await pool.query(
      'SELECT * FROM escrow_accounts WHERE transaction_id = $1',
      [transactionId]
    );
    return result.rows[0] ? this.mapRowToEscrow(result.rows[0]) : undefined;
  }
  
  async updateEscrow(id: string, updates: Partial<EscrowAccount>): Promise<EscrowAccount | undefined> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    if (updates.status !== undefined) {
      fields.push(`status = $${paramIndex++}`);
      values.push(updates.status);
    }
    if (updates.isLocked !== undefined) {
      fields.push(`is_locked = $${paramIndex++}`);
      values.push(updates.isLocked);
    }
    if (updates.releasedAt !== undefined) {
      fields.push(`released_at = $${paramIndex++}`);
      values.push(updates.releasedAt);
    }
    
    if (fields.length === 0) return this.getEscrow(id);
    
    values.push(id);
    const result = await pool.query(
      `UPDATE escrow_accounts SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return result.rows[0] ? this.mapRowToEscrow(result.rows[0]) : undefined;
  }
  
  private mapRowToEscrow(row: any): EscrowAccount {
    return {
      id: row.id,
      transactionId: row.transaction_id,
      amount: parseFloat(row.amount),
      status: row.status,
      isLocked: row.is_locked,
      createdAt: new Date(row.created_at),
      releasedAt: row.released_at ? new Date(row.released_at) : undefined
    };
  }
}
```


### 4. SQLite Adapter Extensions

**File**: `src/shared/database/sqlite-adapter.ts`

```typescript
import * as sqliteHelpers from './sqlite-helpers';
import type { Listing } from '../../features/marketplace/marketplace.types';
import type { Transaction, EscrowAccount } from '../../features/transactions/transaction.types';

export class SQLiteAdapter implements DatabaseAdapter {
  // ... existing user operations ...
  
  // ============================================================================
  // Listing Operations
  // ============================================================================
  
  async createListing(listing: Listing): Promise<Listing> {
    return await sqliteHelpers.createListing(listing);
  }
  
  async getListing(id: string): Promise<Listing | undefined> {
    return await sqliteHelpers.getListing(id);
  }
  
  async getActiveListings(): Promise<Listing[]> {
    return await sqliteHelpers.getActiveListings();
  }
  
  async updateListing(id: string, updates: Partial<Listing>): Promise<Listing | undefined> {
    return await sqliteHelpers.updateListing(id, updates);
  }
  
  // ============================================================================
  // Transaction Operations
  // ============================================================================
  
  async createTransaction(transaction: Transaction): Promise<Transaction> {
    return await sqliteHelpers.createTransaction(transaction);
  }
  
  async getTransaction(id: string): Promise<Transaction | undefined> {
    return await sqliteHelpers.getTransaction(id);
  }
  
  async updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction | undefined> {
    return await sqliteHelpers.updateTransaction(id, updates);
  }
  
  // ============================================================================
  // Escrow Operations
  // ============================================================================
  
  async createEscrow(escrow: EscrowAccount): Promise<EscrowAccount> {
    return await sqliteHelpers.createEscrow(escrow);
  }
  
  async getEscrow(id: string): Promise<EscrowAccount | undefined> {
    return await sqliteHelpers.getEscrow(id);
  }
  
  async getEscrowByTransaction(transactionId: string): Promise<EscrowAccount | undefined> {
    return await sqliteHelpers.getEscrowByTransaction(transactionId);
  }
  
  async updateEscrow(id: string, updates: Partial<EscrowAccount>): Promise<EscrowAccount | undefined> {
    return await sqliteHelpers.updateEscrow(id, updates);
  }
}
```

### 5. SQLite Helpers Extensions

**File**: `src/shared/database/sqlite-helpers.ts`

```typescript
import type { Listing } from '../../features/marketplace/marketplace.types';
import type { Transaction, EscrowAccount } from '../../features/transactions/transaction.types';

// ============================================================================
// Listing Operations
// ============================================================================

export async function createListing(listing: Listing): Promise<Listing> {
  const db = await getDatabase();
  await db.run(
    `INSERT INTO listings (
      id, farmer_id, produce_type, quantity, price_per_kg, 
      certificate_id, expected_harvest_date, is_active, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      listing.id,
      listing.farmerId,
      listing.produceType,
      listing.quantity,
      listing.pricePerKg,
      listing.certificateId,
      listing.expectedHarvestDate?.toISOString() || null,
      listing.isActive ? 1 : 0,
      listing.createdAt.toISOString()
    ]
  );
  return listing;
}

export async function getListing(id: string): Promise<Listing | undefined> {
  const db = await getDatabase();
  const row = await db.get('SELECT * FROM listings WHERE id = ?', [id]);
  return row ? mapRowToListing(row) : undefined;
}

export async function getActiveListings(): Promise<Listing[]> {
  const db = await getDatabase();
  const rows = await db.all('SELECT * FROM listings WHERE is_active = 1 ORDER BY created_at DESC');
  return rows.map(mapRowToListing);
}

export async function updateListing(id: string, updates: Partial<Listing>): Promise<Listing | undefined> {
  const db = await getDatabase();
  const fields: string[] = [];
  const values: any[] = [];
  
  if (updates.quantity !== undefined) {
    fields.push('quantity = ?');
    values.push(updates.quantity);
  }
  if (updates.pricePerKg !== undefined) {
    fields.push('price_per_kg = ?');
    values.push(updates.pricePerKg);
  }
  if (updates.isActive !== undefined) {
    fields.push('is_active = ?');
    values.push(updates.isActive ? 1 : 0);
  }
  
  if (fields.length === 0) return getListing(id);
  
  values.push(id);
  await db.run(
    `UPDATE listings SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
  return getListing(id);
}

function mapRowToListing(row: any): Listing {
  return {
    id: row.id,
    farmerId: row.farmer_id,
    produceType: row.produce_type,
    quantity: row.quantity,
    pricePerKg: row.price_per_kg,
    certificateId: row.certificate_id,
    expectedHarvestDate: row.expected_harvest_date ? new Date(row.expected_harvest_date) : undefined,
    isActive: row.is_active === 1,
    createdAt: new Date(row.created_at)
  };
}

// ============================================================================
// Transaction Operations
// ============================================================================

export async function createTransaction(transaction: Transaction): Promise<Transaction> {
  const db = await getDatabase();
  await db.run(
    `INSERT INTO transactions (
      id, listing_id, farmer_id, buyer_id, amount, status, 
      created_at, updated_at, dispatched_at, delivered_at, completed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      transaction.id,
      transaction.listingId,
      transaction.farmerId,
      transaction.buyerId,
      transaction.amount,
      transaction.status,
      transaction.createdAt.toISOString(),
      transaction.updatedAt.toISOString(),
      transaction.dispatchedAt?.toISOString() || null,
      transaction.deliveredAt?.toISOString() || null,
      transaction.completedAt?.toISOString() || null
    ]
  );
  return transaction;
}

export async function getTransaction(id: string): Promise<Transaction | undefined> {
  const db = await getDatabase();
  const row = await db.get('SELECT * FROM transactions WHERE id = ?', [id]);
  return row ? mapRowToTransaction(row) : undefined;
}

export async function updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction | undefined> {
  const db = await getDatabase();
  const fields: string[] = ['updated_at = ?'];
  const values: any[] = [new Date().toISOString()];
  
  if (updates.status !== undefined) {
    fields.push('status = ?');
    values.push(updates.status);
  }
  if (updates.dispatchedAt !== undefined) {
    fields.push('dispatched_at = ?');
    values.push(updates.dispatchedAt.toISOString());
  }
  if (updates.deliveredAt !== undefined) {
    fields.push('delivered_at = ?');
    values.push(updates.deliveredAt.toISOString());
  }
  if (updates.completedAt !== undefined) {
    fields.push('completed_at = ?');
    values.push(updates.completedAt.toISOString());
  }
  
  values.push(id);
  await db.run(
    `UPDATE transactions SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
  return getTransaction(id);
}

function mapRowToTransaction(row: any): Transaction {
  return {
    id: row.id,
    listingId: row.listing_id,
    farmerId: row.farmer_id,
    buyerId: row.buyer_id,
    amount: row.amount,
    status: row.status,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    dispatchedAt: row.dispatched_at ? new Date(row.dispatched_at) : undefined,
    deliveredAt: row.delivered_at ? new Date(row.delivered_at) : undefined,
    completedAt: row.completed_at ? new Date(row.completed_at) : undefined
  };
}

// ============================================================================
// Escrow Operations
// ============================================================================

export async function createEscrow(escrow: EscrowAccount): Promise<EscrowAccount> {
  const db = await getDatabase();
  await db.run(
    `INSERT INTO escrow_accounts (
      id, transaction_id, amount, status, is_locked, created_at, released_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      escrow.id,
      escrow.transactionId,
      escrow.amount,
      escrow.status,
      escrow.isLocked ? 1 : 0,
      escrow.createdAt.toISOString(),
      escrow.releasedAt?.toISOString() || null
    ]
  );
  return escrow;
}

export async function getEscrow(id: string): Promise<EscrowAccount | undefined> {
  const db = await getDatabase();
  const row = await db.get('SELECT * FROM escrow_accounts WHERE id = ?', [id]);
  return row ? mapRowToEscrow(row) : undefined;
}

export async function getEscrowByTransaction(transactionId: string): Promise<EscrowAccount | undefined> {
  const db = await getDatabase();
  const row = await db.get('SELECT * FROM escrow_accounts WHERE transaction_id = ?', [transactionId]);
  return row ? mapRowToEscrow(row) : undefined;
}

export async function updateEscrow(id: string, updates: Partial<EscrowAccount>): Promise<EscrowAccount | undefined> {
  const db = await getDatabase();
  const fields: string[] = [];
  const values: any[] = [];
  
  if (updates.status !== undefined) {
    fields.push('status = ?');
    values.push(updates.status);
  }
  if (updates.isLocked !== undefined) {
    fields.push('is_locked = ?');
    values.push(updates.isLocked ? 1 : 0);
  }
  if (updates.releasedAt !== undefined) {
    fields.push('released_at = ?');
    values.push(updates.releasedAt.toISOString());
  }
  
  if (fields.length === 0) return getEscrow(id);
  
  values.push(id);
  await db.run(
    `UPDATE escrow_accounts SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
  return getEscrow(id);
}

function mapRowToEscrow(row: any): EscrowAccount {
  return {
    id: row.id,
    transactionId: row.transaction_id,
    amount: row.amount,
    status: row.status,
    isLocked: row.is_locked === 1,
    createdAt: new Date(row.created_at),
    releasedAt: row.released_at ? new Date(row.released_at) : undefined
  };
}
```


### 6. Sync Engine Extensions

**File**: `src/shared/database/sync-engine.ts`

```typescript
export class SyncEngine {
  // ... existing properties and methods ...
  
  // Extend processSyncItem to handle marketplace entities
  private async processSyncItem(item: SyncQueueItem): Promise<void> {
    const data = JSON.parse(item.data);
    
    switch (item.entity_type) {
      case 'user':
      case 'user_pin':
        // ... existing user handling ...
        break;
        
      case 'listing':
        if (item.operation_type === 'CREATE') {
          await this.pgAdapter.createListing(data);
        } else if (item.operation_type === 'UPDATE') {
          await this.pgAdapter.updateListing(item.entity_id, data);
        }
        break;
        
      case 'transaction':
        if (item.operation_type === 'CREATE') {
          await this.pgAdapter.createTransaction(data);
        } else if (item.operation_type === 'UPDATE') {
          await this.pgAdapter.updateTransaction(item.entity_id, data);
        }
        break;
        
      case 'escrow':
        if (item.operation_type === 'CREATE') {
          await this.pgAdapter.createEscrow(data);
        } else if (item.operation_type === 'UPDATE') {
          await this.pgAdapter.updateEscrow(item.entity_id, data);
        }
        break;
        
      default:
        console.warn(`Unknown entity type: ${item.entity_type}`);
    }
  }
  
  // Extend propagateToSQLite to handle marketplace entities
  async propagateToSQLite(
    operationType: 'CREATE' | 'UPDATE' | 'DELETE',
    entityType: string,
    entityId: string,
    data: any
  ): Promise<void> {
    setImmediate(async () => {
      try {
        switch (entityType) {
          case 'user':
          case 'user_pin':
            // ... existing user handling ...
            break;
            
          case 'listing':
            if (operationType === 'CREATE') {
              await this.sqliteAdapter.createListing(data);
            } else if (operationType === 'UPDATE') {
              await this.sqliteAdapter.updateListing(entityId, data);
            }
            break;
            
          case 'transaction':
            if (operationType === 'CREATE') {
              await this.sqliteAdapter.createTransaction(data);
            } else if (operationType === 'UPDATE') {
              await this.sqliteAdapter.updateTransaction(entityId, data);
            }
            break;
            
          case 'escrow':
            if (operationType === 'CREATE') {
              await this.sqliteAdapter.createEscrow(data);
            } else if (operationType === 'UPDATE') {
              await this.sqliteAdapter.updateEscrow(entityId, data);
            }
            break;
        }
      } catch (error) {
        console.error(`Failed to propagate ${entityType} to SQLite:`, error);
      }
    });
  }
}
```

## Data Models

### PostgreSQL Schema Extensions

**File**: `src/shared/database/pg-schema.sql`

```sql
-- Listings table
CREATE TABLE IF NOT EXISTS listings (
  id VARCHAR(36) PRIMARY KEY,
  farmer_id VARCHAR(36) NOT NULL,
  produce_type VARCHAR(100) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  price_per_kg DECIMAL(10,2) NOT NULL,
  certificate_id VARCHAR(36) NOT NULL,
  expected_harvest_date TIMESTAMP,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (farmer_id) REFERENCES users(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_listings_farmer ON listings(farmer_id);
CREATE INDEX IF NOT EXISTS idx_listings_active ON listings(is_active);
CREATE INDEX IF NOT EXISTS idx_listings_created ON listings(created_at);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id VARCHAR(36) PRIMARY KEY,
  listing_id VARCHAR(36) NOT NULL,
  farmer_id VARCHAR(36) NOT NULL,
  buyer_id VARCHAR(36) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  dispatched_at TIMESTAMP,
  delivered_at TIMESTAMP,
  completed_at TIMESTAMP,
  FOREIGN KEY (listing_id) REFERENCES listings(id),
  FOREIGN KEY (farmer_id) REFERENCES users(id),
  FOREIGN KEY (buyer_id) REFERENCES users(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_listing ON transactions(listing_id);
CREATE INDEX IF NOT EXISTS idx_transactions_farmer ON transactions(farmer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_buyer ON transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at);

-- Escrow accounts table
CREATE TABLE IF NOT EXISTS escrow_accounts (
  id VARCHAR(36) PRIMARY KEY,
  transaction_id VARCHAR(36) UNIQUE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) NOT NULL,
  is_locked BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  released_at TIMESTAMP,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_escrow_transaction ON escrow_accounts(transaction_id);

-- Update sync_status for marketplace entities
INSERT INTO sync_status (entity_type, last_sync_status)
VALUES 
  ('listings', 'SUCCESS'),
  ('transactions', 'SUCCESS'),
  ('escrow_accounts', 'SUCCESS')
ON CONFLICT (entity_type) DO NOTHING;
```

### SQLite Schema Extensions

**File**: `src/shared/database/sqlite-schema.sql`

```sql
-- Listings table
CREATE TABLE IF NOT EXISTS listings (
  id TEXT PRIMARY KEY,
  farmer_id TEXT NOT NULL,
  produce_type TEXT NOT NULL,
  quantity REAL NOT NULL,
  price_per_kg REAL NOT NULL,
  certificate_id TEXT NOT NULL,
  expected_harvest_date TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_listings_farmer ON listings(farmer_id);
CREATE INDEX IF NOT EXISTS idx_listings_active ON listings(is_active);
CREATE INDEX IF NOT EXISTS idx_listings_created ON listings(created_at);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL,
  farmer_id TEXT NOT NULL,
  buyer_id TEXT NOT NULL,
  amount REAL NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  dispatched_at TEXT,
  delivered_at TEXT,
  completed_at TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_listing ON transactions(listing_id);
CREATE INDEX IF NOT EXISTS idx_transactions_farmer ON transactions(farmer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_buyer ON transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at);

-- Escrow accounts table
CREATE TABLE IF NOT EXISTS escrow_accounts (
  id TEXT PRIMARY KEY,
  transaction_id TEXT UNIQUE NOT NULL,
  amount REAL NOT NULL,
  status TEXT NOT NULL,
  is_locked INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  released_at TEXT
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_escrow_transaction ON escrow_accounts(transaction_id);
```

### TypeScript Data Models

The existing type definitions remain unchanged:

```typescript
// Listing (from marketplace.types.ts)
interface Listing {
  id: string;
  farmerId: string;
  produceType: string;
  quantity: number;
  pricePerKg: number;
  certificateId: string;
  expectedHarvestDate?: Date;
  createdAt: Date;
  isActive: boolean;
}

// Transaction (from transaction.types.ts)
interface Transaction {
  id: string;
  listingId: string;
  farmerId: string;
  buyerId: string;
  amount: number;
  status: TransactionStatus;
  createdAt: Date;
  updatedAt: Date;
  dispatchedAt?: Date;
  deliveredAt?: Date;
  completedAt?: Date;
}

// EscrowAccount (from transaction.types.ts)
interface EscrowAccount {
  id: string;
  transactionId: string;
  amount: number;
  status: EscrowStatus;
  isLocked: boolean;
  createdAt: Date;
  releasedAt?: Date;
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Write Operations Target PostgreSQL First

*For any* marketplace entity (listing, transaction, or escrow account), when created or updated and PostgreSQL is available, the operation should write to PostgreSQL before writing to SQLite.

**Validates: Requirements 4.1, 4.2, 5.1, 5.2, 6.1, 6.2**

### Property 2: Read Operations Fall Back to SQLite

*For any* marketplace entity query (listing, transaction, or escrow account), when PostgreSQL is unavailable, the system should serve the request from SQLite and log a staleness warning.

**Validates: Requirements 4.3, 4.4, 5.3, 5.4, 6.3, 6.4**

### Property 3: Successful Writes Propagate to SQLite

*For any* successful write operation to PostgreSQL for marketplace entities, the change should propagate to SQLite within 5 seconds.

**Validates: Requirements 8.4, 11.1**

### Property 4: Failed Writes Are Queued

*For any* write operation that fails due to PostgreSQL unavailability, the operation should be added to the sync queue with all necessary data to retry later.

**Validates: Requirements 4.5, 5.5, 6.5, 8.5, 12.1**

### Property 5: Sync Queue Processes Marketplace Entities

*For any* sync queue item with entity_type 'listing', 'transaction', or 'escrow', when processed, the sync engine should apply the operation to PostgreSQL.

**Validates: Requirements 8.1, 8.2, 8.3**

### Property 6: Databases Converge After Sync

*For any* marketplace entity (listing, transaction, or escrow account), after synchronization completes successfully, querying the same entity from PostgreSQL and SQLite should return equivalent data.

**Validates: Requirements 11.1**

### Property 7: Conflict Resolution Prefers PostgreSQL

*For any* conflict where the same marketplace entity is modified in both databases, the system should resolve the conflict by preferring the PostgreSQL version.

**Validates: Requirements 11.2**

### Property 8: Required Fields Are Enforced

*For any* marketplace entity creation attempt with null or missing required fields, the system should reject the operation with a descriptive error message.

**Validates: Requirements 1.4, 2.4, 3.4, 12.2**

### Property 9: Unique Constraints Are Enforced

*For any* attempt to create a second escrow account with the same transaction_id, the system should reject the operation.

**Validates: Requirements 3.5**

### Property 10: Transaction Atomicity Is Maintained

*For any* write operation that partially fails, the system should not leave the database in an inconsistent state (either all changes succeed or all are rolled back).

**Validates: Requirements 11.3**

### Property 11: Referential Integrity Is Validated

*For any* transaction creation, the system should verify the listing_id references an existing listing, and for any escrow creation, the system should verify the transaction_id references an existing transaction.

**Validates: Requirements 14.1, 14.2, 14.5**

### Property 12: Failed Listing Creation Prevents Transaction Creation

*For any* listing creation that fails, no associated transaction should be created in either database.

**Validates: Requirements 12.3**

### Property 13: Failed Escrow Creation Rolls Back Transaction

*For any* escrow creation that fails, the associated transaction should be rolled back in both databases.

**Validates: Requirements 12.4**

### Property 14: Batch Processing for Large Queues

*For any* sync queue containing more than 10 marketplace items, the sync engine should process them in batches rather than one at a time.

**Validates: Requirements 13.5**

## Error Handling

### Connection Errors

**PostgreSQL Connection Failures**:
- Catch connection timeout errors (2 second timeout)
- Log error with full context (timestamp, operation, entity type, error message)
- Switch to offline mode immediately
- Queue marketplace write operations for later sync
- Serve marketplace reads from SQLite cache

**SQLite Connection Failures**:
- These are critical since SQLite is the fallback
- Log error and alert monitoring system
- Attempt to reopen database connection
- If SQLite fails, return error to user (cannot operate without any database)

### Sync Errors

**Queue Processing Errors**:
- Catch and log each marketplace item's error individually
- Don't let one failed item block others
- Implement exponential backoff: 2^n seconds (2s, 4s, 8s)
- After 3 failures, mark item as failed
- Continue processing remaining queue items

**Conflict Resolution Errors**:
- Log conflicts with both versions of marketplace data
- Apply timestamp-based resolution (PostgreSQL wins)
- If timestamps are equal, prefer PostgreSQL version
- Update SQLite with resolved version

### Data Validation Errors

**Listing Validation**:
- Validate required fields (farmerId, produceType, quantity, pricePerKg, certificateId)
- Validate numeric fields are positive (quantity > 0, pricePerKg > 0)
- Validate farmer_id references an existing user
- Return descriptive error messages to caller
- Don't queue invalid data for sync

**Transaction Validation**:
- Validate required fields (listingId, farmerId, buyerId, amount, status)
- Validate listing_id references an existing listing
- Validate farmer_id and buyer_id reference existing users
- Validate amount is positive
- Return descriptive error messages to caller
- Don't queue invalid data for sync

**Escrow Validation**:
- Validate required fields (transactionId, amount, status, isLocked)
- Validate transaction_id references an existing transaction
- Validate amount matches transaction amount
- Enforce unique constraint on transaction_id
- Return descriptive error messages to caller
- Don't queue invalid data for sync

### Referential Integrity Errors

**Foreign Key Violations**:
- Catch foreign key constraint violations from PostgreSQL
- Return user-friendly error messages (e.g., "Listing not found")
- Don't queue operations that violate referential integrity
- Log violations for monitoring

**Orphaned Records**:
- Prevent creation of transactions without valid listings
- Prevent creation of escrow accounts without valid transactions
- If a listing is deleted, handle associated transactions appropriately
- If a transaction is deleted, handle associated escrow appropriately

## Testing Strategy

### Dual Testing Approach

This feature requires both unit tests and property-based tests for comprehensive coverage:

**Unit Tests** focus on:
- Specific examples of marketplace CRUD operations
- Edge cases (zero quantity, negative prices, null fields)
- Error conditions (connection failures, validation errors, foreign key violations)
- Integration points between DatabaseManager and adapters
- Schema initialization and migration

**Property-Based Tests** focus on:
- Universal properties that hold for all marketplace entities
- Comprehensive input coverage through randomization
- Sync engine behavior across many operations
- Data consistency guarantees between databases
- Concurrent operation scenarios

### Property-Based Testing Configuration

**Framework**: Use `fast-check` library for TypeScript property-based testing

**Configuration**:
- Minimum 100 iterations per property test
- Each test tagged with: `Feature: persist-listings-transactions, Property N: [property text]`
- Use custom generators for Listing, Transaction, and EscrowAccount objects

**Test Organization**:
```
src/shared/database/__tests__/
  ├── marketplace-db.test.ts              # Unit tests for marketplace operations
  ├── marketplace-db.pbt.test.ts          # Property tests for marketplace operations
  ├── marketplace-sync.test.ts            # Unit tests for marketplace sync
  ├── marketplace-sync.pbt.test.ts        # Property tests for marketplace sync
  └── marketplace-generators.ts           # Custom generators for property tests
```

### Custom Generators

```typescript
// marketplace-generators.ts
import fc from 'fast-check';
import { Listing, Transaction, EscrowAccount } from '../../../features/marketplace/marketplace.types';
import { TransactionStatus, EscrowStatus } from '../../../shared/types/common.types';

// Generate listing
export const listingArb = fc.record({
  id: fc.uuid(),
  farmerId: fc.uuid(),
  produceType: fc.constantFrom('Wheat', 'Rice', 'Corn', 'Tomatoes', 'Potatoes'),
  quantity: fc.double({ min: 0.1, max: 10000 }),
  pricePerKg: fc.double({ min: 1, max: 1000 }),
  certificateId: fc.uuid(),
  expectedHarvestDate: fc.option(fc.date(), { nil: undefined }),
  isActive: fc.boolean(),
  createdAt: fc.date()
});

// Generate transaction status
export const transactionStatusArb = fc.constantFrom<TransactionStatus>(
  'PENDING', 'CONFIRMED', 'DISPATCHED', 'DELIVERED', 'COMPLETED', 'CANCELLED'
);

// Generate transaction
export const transactionArb = fc.record({
  id: fc.uuid(),
  listingId: fc.uuid(),
  farmerId: fc.uuid(),
  buyerId: fc.uuid(),
  amount: fc.double({ min: 1, max: 100000 }),
  status: transactionStatusArb,
  createdAt: fc.date(),
  updatedAt: fc.date(),
  dispatchedAt: fc.option(fc.date(), { nil: undefined }),
  deliveredAt: fc.option(fc.date(), { nil: undefined }),
  completedAt: fc.option(fc.date(), { nil: undefined })
});

// Generate escrow status
export const escrowStatusArb = fc.constantFrom<EscrowStatus>(
  'LOCKED', 'RELEASED', 'REFUNDED'
);

// Generate escrow account
export const escrowArb = fc.record({
  id: fc.uuid(),
  transactionId: fc.uuid(),
  amount: fc.double({ min: 1, max: 100000 }),
  status: escrowStatusArb,
  isLocked: fc.boolean(),
  createdAt: fc.date(),
  releasedAt: fc.option(fc.date(), { nil: undefined })
});
```

### Example Property Test

```typescript
// marketplace-db.pbt.test.ts
import fc from 'fast-check';
import { DatabaseManager } from '../db-abstraction';
import { listingArb, transactionArb, escrowArb } from './marketplace-generators';

describe('Marketplace Database Property Tests', () => {
  let dbManager: DatabaseManager;
  
  beforeAll(async () => {
    dbManager = new DatabaseManager();
    dbManager.start();
  });
  
  afterAll(async () => {
    dbManager.stop();
  });
  
  test('Property 1: Write operations target PostgreSQL first', async () => {
    // Feature: persist-listings-transactions, Property 1: Write operations target PostgreSQL first
    await fc.assert(
      fc.asyncProperty(listingArb, async (listing) => {
        // Ensure PostgreSQL is connected
        const isConnected = dbManager.isPostgreSQLConnected();
        fc.pre(isConnected);
        
        // Track which database was written to first
        const writeOrder: string[] = [];
        
        // Mock to track write order
        const originalPgCreate = dbManager.getPostgreSQLAdapter().createListing;
        const originalSqliteCreate = dbManager.getSQLiteAdapter().createListing;
        
        dbManager.getPostgreSQLAdapter().createListing = async (...args) => {
          writeOrder.push('postgresql');
          return originalPgCreate.apply(dbManager.getPostgreSQLAdapter(), args);
        };
        
        dbManager.getSQLiteAdapter().createListing = async (...args) => {
          writeOrder.push('sqlite');
          return originalSqliteCreate.apply(dbManager.getSQLiteAdapter(), args);
        };
        
        try {
          await dbManager.createListing(listing);
          
          // PostgreSQL should be written first
          expect(writeOrder[0]).toBe('postgresql');
        } finally {
          // Restore original methods
          dbManager.getPostgreSQLAdapter().createListing = originalPgCreate;
          dbManager.getSQLiteAdapter().createListing = originalSqliteCreate;
        }
      }),
      { numRuns: 100 }
    );
  });
  
  test('Property 6: Databases converge after sync', async () => {
    // Feature: persist-listings-transactions, Property 6: Databases converge after sync
    await fc.assert(
      fc.asyncProperty(listingArb, async (listing) => {
        // Create listing in PostgreSQL
        await dbManager.createListing(listing);
        
        // Wait for sync to complete (max 5 seconds)
        await new Promise(resolve => setTimeout(resolve, 5500));
        
        // Fetch from both databases
        const pgListing = await dbManager.getPostgreSQLAdapter().getListing(listing.id);
        const sqliteListing = await dbManager.getSQLiteAdapter().getListing(listing.id);
        
        // Both should exist and be equivalent
        expect(pgListing).toBeDefined();
        expect(sqliteListing).toBeDefined();
        expect(pgListing).toEqual(sqliteListing);
      }),
      { numRuns: 100 }
    );
  });
  
  test('Property 11: Referential integrity is validated', async () => {
    // Feature: persist-listings-transactions, Property 11: Referential integrity is validated
    await fc.assert(
      fc.asyncProperty(transactionArb, async (transaction) => {
        // Try to create transaction with non-existent listing
        const nonExistentListingId = 'non-existent-listing-id';
        const invalidTransaction = { ...transaction, listingId: nonExistentListingId };
        
        // Should reject the operation
        await expect(dbManager.createTransaction(invalidTransaction)).rejects.toThrow();
      }),
      { numRuns: 100 }
    );
  });
});
```

### Integration Tests

**End-to-End Scenarios**:
1. Create listing → Create transaction → Create escrow (verify all in both DBs)
2. Update listing → Verify sync to SQLite
3. Deactivate listing → Verify status in both DBs
4. Update transaction status → Verify sync to SQLite
5. Release escrow → Verify status in both DBs
6. Connectivity loss and recovery scenario with marketplace operations

**Test Environment**:
- Use Docker containers for PostgreSQL (test database)
- Use in-memory SQLite for fast tests
- Mock connection failures for offline scenarios
- Use test fixtures for known marketplace data sets

### Performance Tests

**Load Testing**:
- Test with 1000+ listings in sync queue
- Measure sync processing time for marketplace entities
- Verify batch processing activates for >10 items
- Ensure read operations complete within 200ms

**Stress Testing**:
- Simulate rapid connectivity changes during marketplace operations
- Test concurrent write operations on listings and transactions
- Verify connection pool limits (max 20)
- Test with large marketplace data sets
