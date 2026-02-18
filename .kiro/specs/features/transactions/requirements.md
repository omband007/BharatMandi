---
parent_spec: bharat-mandi-main
implements_requirements: [7]
depends_on: [shared/database, features/marketplace]
status: complete
type: feature
code_location: src/features/transactions/
---

# Requirements Document: Transaction Management

**Parent Spec:** [Bharat Mandi Main](../../bharat-mandi-main/requirements.md) - Requirement 7  
**Depends On:** [Dual Database](../../shared/database/requirements.md), [Marketplace](../marketplace/requirements.md)  
**Code Location:** `src/features/transactions/`  
**Status:** ✅ Complete

## Introduction

This document specifies the requirements for transaction management in Bharat Mandi. The system handles purchase requests, transaction lifecycle, escrow accounts, and payment management with full offline support.

## Requirements

### Requirement 1: Purchase Request Flow

**User Story:** As a buyer, I want to initiate a purchase request for a listing, so that I can buy produce from farmers.

#### Acceptance Criteria

1. WHEN a buyer selects a listing, THE System SHALL allow initiating a purchase request
2. WHEN a purchase request is sent, THE System SHALL notify the farmer
3. WHEN a farmer receives a request, THE System SHALL allow accept/reject actions
4. WHEN a farmer accepts, THE System SHALL create a transaction record
5. WHEN a farmer rejects, THE System SHALL notify the buyer

### Requirement 2: Transaction Lifecycle

**User Story:** As a user, I want to track transaction status through its lifecycle, so that I know the current state of my purchases/sales.

#### Acceptance Criteria

1. WHEN a transaction is created, THE System SHALL set status to 'pending'
2. WHEN payment is deposited, THE System SHALL update status to 'paid'
3. WHEN produce is dispatched, THE System SHALL update status to 'dispatched'
4. WHEN produce is delivered, THE System SHALL update status to 'delivered'
5. WHEN transaction completes, THE System SHALL update status to 'completed'
6. THE System SHALL record timestamps for each status change

### Requirement 3: Escrow Account Management

**User Story:** As a farmer, I want payments held in escrow until delivery, so that I'm protected from payment defaults.

#### Acceptance Criteria

1. WHEN a transaction is created, THE System SHALL create an escrow account
2. WHEN buyer deposits funds, THE System SHALL lock the escrow account
3. WHEN escrow is locked, THE System SHALL prevent buyer withdrawal
4. WHEN delivery is confirmed, THE System SHALL release funds to farmer
5. WHEN a dispute occurs, THE System SHALL freeze the escrow account

### Requirement 4: Transaction Persistence

**User Story:** As a system architect, I want transactions persisted to the dual database, so that transaction history survives restarts.

#### Acceptance Criteria

1. WHEN a transaction is created, THE System SHALL write to PostgreSQL first
2. IF PostgreSQL is unavailable, THE System SHALL write to SQLite and queue for sync
3. WHEN reading transactions, THE System SHALL read from PostgreSQL if available
4. IF PostgreSQL is unavailable, THE System SHALL read from SQLite cache
5. WHEN connectivity restores, THE System SHALL sync queued transactions

### Requirement 5: Transaction Queries

**User Story:** As a user, I want to view my transaction history, so that I can track my purchases and sales.

#### Acceptance Criteria

1. THE System SHALL provide query by transaction ID
2. THE System SHALL provide query by listing ID
3. THE System SHALL provide query by farmer ID
4. THE System SHALL provide query by buyer ID
5. THE System SHALL provide query by status
6. THE System SHALL return transactions sorted by creation date (newest first)

### Requirement 6: Escrow Operations

**User Story:** As a system administrator, I want escrow operations to be reliable and secure, so that payments are protected.

#### Acceptance Criteria

1. THE System SHALL ensure one escrow account per transaction
2. THE System SHALL prevent duplicate escrow creation
3. THE System SHALL validate escrow amount matches transaction amount
4. THE System SHALL track escrow status (pending, locked, released, refunded)
5. THE System SHALL record release/refund timestamps

### Requirement 7: Offline Transaction Support

**User Story:** As a user in a rural area, I want to manage transactions offline, so that poor connectivity doesn't prevent me from using the platform.

#### Acceptance Criteria

1. WHERE internet is unavailable, THE System SHALL allow viewing cached transactions
2. WHERE internet is unavailable, THE System SHALL queue transaction updates
3. WHEN connectivity restores, THE System SHALL sync queued updates
4. THE System SHALL resolve conflicts by preferring server data
5. THE System SHALL notify users of sync status

## Implementation Status

✅ **Complete** - All requirements implemented and tested
- Transaction CRUD operations working
- Escrow account management functional
- Dual database integration complete
- Offline support with sync working
- All API endpoints functional

## Related Files

- `src/features/transactions/transaction.service.ts` - Transaction business logic
- `src/features/transactions/transaction.controller.ts` - API endpoints
- `src/features/transactions/transaction.types.ts` - TypeScript interfaces
- `src/features/transactions/index.ts` - Module exports

## Database Schema

### Transactions Table

```sql
CREATE TABLE transactions (
    id UUID PRIMARY KEY,
    listing_id UUID NOT NULL REFERENCES listings(id),
    farmer_id UUID NOT NULL,
    buyer_id UUID NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    dispatched_at TIMESTAMP,
    delivered_at TIMESTAMP,
    completed_at TIMESTAMP
);
```

### Escrow Accounts Table

```sql
CREATE TABLE escrow_accounts (
    id UUID PRIMARY KEY,
    transaction_id UUID NOT NULL UNIQUE REFERENCES transactions(id),
    amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) NOT NULL,
    is_locked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    released_at TIMESTAMP
);
```

## API Endpoints

- `POST /api/transactions` - Create transaction
- `GET /api/transactions/:id` - Get transaction by ID
- `GET /api/transactions/listing/:listingId` - Get transactions for listing
- `PUT /api/transactions/:id/status` - Update transaction status
- `POST /api/transactions/:id/escrow` - Create escrow account
- `PUT /api/transactions/:id/escrow/release` - Release escrow funds
