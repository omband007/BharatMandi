# Design Document: Enhanced Listing Status Management

## Overview

### Purpose

This design document specifies the technical implementation for enhanced listing status management in the Bharat Mandi marketplace. The feature replaces the simple boolean `isActive` flag with an explicit status enumeration (ACTIVE, SOLD, EXPIRED, CANCELLED) to accurately track listing lifecycle, improve analytics, and provide better user experience.

### Scope

The design covers:
- Database schema changes for PostgreSQL and SQLite
- Status enumeration and validation logic
- Automatic expiration service based on harvest dates
- Transaction-listing status synchronization
- API response format changes
- Audit trail for status changes
- Bulk operations support

**Development Phase Note**: This project is in development with test data only. We will use clean schema recreation (DROP TABLE IF EXISTS + CREATE TABLE) instead of migrations. No backward compatibility or data preservation required.

### Goals

1. Enable accurate tracking of listing lifecycle states
2. Automate listing expiration based on harvest dates
3. Synchronize listing status with transaction completion
4. Provide comprehensive audit trail for compliance
5. Enable analytics and reporting on listing outcomes

### Non-Goals

1. Backward compatibility with existing `isActive` field
2. Data migration from existing listings
3. Changing the transaction state machine
4. Modifying escrow flow logic
5. Altering the notification system architecture
6. Implementing new UI components (frontend implementation)


## High-Level Design (HLD)

> **Related Documentation**: See [State Diagrams](../../shared/state-diagrams.md) for complete visual state machine diagrams and marketplace flow.

### System Architecture

The enhanced listing status management feature integrates into the existing Bharat Mandi architecture as follows:

```mermaid
graph TB
    subgraph "Client Layer"
        UI[Web UI]
        Mobile[Mobile App]
    end
    
    subgraph "API Layer"
        API[Express API Server]
        ListingController[Listing Controller]
        TransactionController[Transaction Controller]
    end
    
    subgraph "Service Layer"
        MarketplaceService[Marketplace Service]
        TransactionService[Transaction Service]
        StatusManager[Listing Status Manager]
        ExpirationService[Expiration Service]
        StatusSynchronizer[Status Synchronizer]
    end
    
    subgraph "Data Layer"
        DatabaseManager[Database Manager]
        PostgreSQL[(PostgreSQL)]
        SQLite[(SQLite)]
        SyncEngine[Sync Engine]
    end
    
    subgraph "Background Jobs"
        ExpirationCron[Expiration Cron Job]
        NotificationService[Notification Service]
    end
    
    UI --> API
    Mobile --> API
    API --> ListingController
    API --> TransactionController
    ListingController --> MarketplaceService
    TransactionController --> TransactionService
    MarketplaceService --> StatusManager
    TransactionService --> StatusSynchronizer
    StatusManager --> DatabaseManager
    StatusSynchronizer --> DatabaseManager
    ExpirationCron --> ExpirationService
    ExpirationService --> StatusManager
    ExpirationService --> NotificationService
    DatabaseManager --> PostgreSQL
    DatabaseManager --> SQLite
    DatabaseManager --> SyncEngine
    SyncEngine --> PostgreSQL
    SyncEngine --> SQLite
```

### Component Interaction Diagram

```mermaid
sequenceDiagram
    participant Farmer
    participant API
    participant MarketplaceService
    participant StatusManager
    participant DatabaseManager
    participant PostgreSQL
    participant SQLite
    
    Farmer->>API: Create Listing
    API->>MarketplaceService: createListing()
    MarketplaceService->>StatusManager: createListing(status=ACTIVE)
    StatusManager->>DatabaseManager: createListing()
    DatabaseManager->>PostgreSQL: INSERT listing
    PostgreSQL-->>DatabaseManager: listing created
    DatabaseManager->>SQLite: propagate async
    DatabaseManager-->>StatusManager: listing
    StatusManager-->>MarketplaceService: listing
    MarketplaceService-->>API: listing
    API-->>Farmer: 201 Created
```

### State Transition Diagram

```mermaid
stateDiagram-v2
    [*] --> ACTIVE: Listing Created
    
    ACTIVE --> SOLD: Transaction Completed
    ACTIVE --> EXPIRED: Expiry Date Passed (Harvest Date + Category Expiry Period)
    ACTIVE --> CANCELLED: Farmer Cancels
    
    CANCELLED --> ACTIVE: Transaction Rejected/Cancelled Early
    
    SOLD --> [*]
    EXPIRED --> [*]
    CANCELLED --> [*]: Final State (if not reactivated)
    
    note right of ACTIVE
        Valid transitions:
        - To SOLD
        - To EXPIRED
        - To CANCELLED
    end note
    
    note right of CANCELLED
        Can return to ACTIVE only if:
        - Transaction was PENDING/ACCEPTED
        - Transaction was REJECTED
        - Escrow was REFUNDED
    end note
    
    note right of SOLD
        Terminal state
        No transitions allowed
    end note
    
    note right of EXPIRED
        Terminal state
        No transitions allowed
    end note
```


### Data Flow Diagram

#### Automatic Expiration Flow

```mermaid
flowchart TD
    Start[Cron Job Triggers] --> Query[Query ACTIVE listings]
    Query --> GetCategory[Get produce category]
    GetCategory --> CalcExpiry[Calculate: expiry_date = harvest_date + category.expiry_period_hours]
    CalcExpiry --> Check{expiry_date < Now?}
    Check -->|Yes| Expire[Transition to EXPIRED]
    Check -->|No| Skip[Skip listing]
    Expire --> Record[Record expired_at timestamp]
    Record --> Notify[Send notification to farmer]
    Notify --> Log[Log expiration event]
    Log --> Next{More listings?}
    Skip --> Next
    Next -->|Yes| GetCategory
    Next -->|No| End[Complete]
```

#### Transaction Completion Synchronization Flow

```mermaid
flowchart TD
    Start[Transaction Status Updated] --> CheckStatus{Status = COMPLETED?}
    CheckStatus -->|Yes| GetListing[Get associated listing]
    CheckStatus -->|No| CheckCancel{Status = CANCELLED/REJECTED?}
    
    GetListing --> ValidateStatus{Listing status = ACTIVE?}
    ValidateStatus -->|Yes| MarkSold[Transition to SOLD]
    ValidateStatus -->|No| LogWarning[Log warning]
    
    MarkSold --> RecordSold[Record sold_at, transaction_id]
    RecordSold --> NotifySold[Notify farmer]
    NotifySold --> End[Complete]
    
    CheckCancel -->|Yes| GetListing2[Get associated listing]
    CheckCancel -->|No| End
    
    GetListing2 --> CheckHarvest{Harvest date passed?}
    CheckHarvest -->|Yes| MarkExpired[Transition to EXPIRED]
    CheckHarvest -->|No| MarkActive[Transition to ACTIVE]
    
    MarkExpired --> End
    MarkActive --> ClearTxn[Clear transaction_id]
    ClearTxn --> NotifyActive[Notify farmer]
    NotifyActive --> End
    
    LogWarning --> End
```

### Database Schema Overview

The feature adds a `status` column to the `listings` table and creates a new `listing_status_history` table for audit trail:

```mermaid
erDiagram
    LISTINGS ||--o{ LISTING_STATUS_HISTORY : has
    LISTINGS ||--o| TRANSACTIONS : "associated with"
    LISTINGS }o--|| PRODUCE_CATEGORIES : "belongs to"
    
    LISTINGS {
        uuid id PK
        uuid farmer_id FK
        string produce_type
        decimal quantity
        decimal price_per_kg
        uuid certificate_id
        timestamp expected_harvest_date
        timestamp created_at
        boolean is_active "COMPUTED"
        enum status "NEW: ACTIVE|SOLD|EXPIRED|CANCELLED"
        timestamp sold_at "NEW"
        uuid transaction_id "NEW"
        timestamp expired_at "NEW"
        timestamp cancelled_at "NEW"
        uuid cancelled_by "NEW"
        enum listing_type "NEW: PRE_HARVEST|POST_HARVEST"
        uuid produce_category_id "NEW: FK"
        timestamp expiry_date "NEW"
        enum payment_method_preference "NEW: PLATFORM_ONLY|DIRECT_ONLY|BOTH"
        enum sale_channel "NEW: PLATFORM_ESCROW|PLATFORM_DIRECT|EXTERNAL"
        decimal sale_price "NEW: for EXTERNAL sales"
        text sale_notes "NEW: for EXTERNAL sales"
    }
    
    PRODUCE_CATEGORIES {
        uuid id PK
        string name
        integer expiry_period_hours
        text description
        timestamp created_at
        timestamp updated_at
    }
    
    LISTING_STATUS_HISTORY {
        uuid id PK
        uuid listing_id FK
        enum previous_status
        enum new_status
        timestamp changed_at
        string triggered_by
        string trigger_type "USER|SYSTEM|TRANSACTION"
        jsonb metadata
    }
    
    TRANSACTIONS {
        uuid id PK
        uuid listing_id FK
        uuid farmer_id FK
        uuid buyer_id FK
        decimal amount
        enum status
        timestamp created_at
        timestamp updated_at
    }
```


### Service Layer Architecture

```mermaid
classDiagram
    class MarketplaceService {
        -dbManager: DatabaseManager
        +createListing(data): Promise~Listing~
        +getActiveListings(): Promise~Listing[]~
        +getListing(id): Promise~Listing~
        +cancelListing(id, farmerId): Promise~Listing~
    }
    
    class ListingStatusManager {
        -dbManager: DatabaseManager
        +transitionStatus(listingId, newStatus, metadata): Promise~Listing~
        +validateTransition(currentStatus, newStatus): ValidationResult
        +getListingsByStatus(status): Promise~Listing[]~
        +bulkUpdateStatus(listingIds, newStatus): Promise~BulkResult~
        +getStatusHistory(listingId): Promise~StatusHistory[]~
        +calculateExpiryDate(harvestDate, categoryExpiryPeriodHours): Date
        -recordStatusChange(listing, oldStatus, newStatus, metadata): Promise~void~
    }
    
    class ExpirationService {
        -dbManager: DatabaseManager
        -notificationService: NotificationService
        +checkExpiredListings(): Promise~void~
        +expireListing(listingId): Promise~Listing~
        +scheduleExpirationCheck(): void
        -sendExpirationNotification(listing): Promise~void~
    }
    
    class CategoryManager {
        -dbManager: DatabaseManager
        +createCategory(name, expiryPeriodHours, description): Promise~ProduceCategory~
        +updateCategory(id, updates): Promise~ProduceCategory~
        +deleteCategory(id): Promise~void~
        +getCategories(): Promise~ProduceCategory[]~
        +getCategoryById(id): Promise~ProduceCategory~
    }
    
    class StatusSynchronizer {
        -dbManager: DatabaseManager
        -statusManager: ListingStatusManager
        +onTransactionCompleted(transaction): Promise~void~
        +onTransactionCancelled(transaction): Promise~void~
        +onTransactionRejected(transaction): Promise~void~
        +onEscrowRefunded(escrow): Promise~void~
        -shouldReactivateListing(listing): boolean
    }
    
    class TransactionService {
        -dbManager: DatabaseManager
        -statusSynchronizer: StatusSynchronizer
        +initiatePurchase(data): Promise~Transaction~
        +acceptOrder(transactionId): Promise~Transaction~
        +rejectOrder(transactionId): Promise~Transaction~
        +completeTransaction(transactionId): Promise~Transaction~
    }
    
    MarketplaceService --> ListingStatusManager
    ExpirationService --> ListingStatusManager
    StatusSynchronizer --> ListingStatusManager
    TransactionService --> StatusSynchronizer
    ListingStatusManager --> DatabaseManager
    ListingStatusManager --> CategoryManager
    CategoryManager --> DatabaseManager
    ExpirationService --> NotificationService
```

### Event-Driven Synchronization Design

The system uses an event-driven approach to synchronize listing status with transaction state changes:

```mermaid
sequenceDiagram
    participant TransactionService
    participant StatusSynchronizer
    participant ListingStatusManager
    participant DatabaseManager
    participant NotificationService
    
    TransactionService->>TransactionService: completeTransaction()
    TransactionService->>StatusSynchronizer: onTransactionCompleted(transaction)
    StatusSynchronizer->>DatabaseManager: getListing(transaction.listingId)
    DatabaseManager-->>StatusSynchronizer: listing
    
    alt listing.status == ACTIVE
        StatusSynchronizer->>ListingStatusManager: transitionStatus(listingId, SOLD, metadata)
        ListingStatusManager->>ListingStatusManager: validateTransition(ACTIVE, SOLD)
        ListingStatusManager->>DatabaseManager: updateListing(id, {status: SOLD, sold_at, transaction_id})
        DatabaseManager-->>ListingStatusManager: updated listing
        ListingStatusManager->>DatabaseManager: recordStatusChange(listing, ACTIVE, SOLD, metadata)
        ListingStatusManager-->>StatusSynchronizer: updated listing
        StatusSynchronizer->>NotificationService: notifyFarmer(listing, "SOLD")
    else listing.status != ACTIVE
        StatusSynchronizer->>StatusSynchronizer: log warning
    end
```


## Low-Level Design (LLD)

### Detailed Database Schema

**Development Phase Approach**: Use DROP TABLE IF EXISTS + CREATE TABLE for clean schema recreation. No ALTER TABLE migrations or data preservation needed.

#### PostgreSQL Schema

##### Produce Categories Table (Requirement 6)

```sql
-- Drop existing table if present
DROP TABLE IF EXISTS produce_categories CASCADE;

-- Create produce categories table
CREATE TABLE produce_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    expiry_period_hours INTEGER NOT NULL CHECK (expiry_period_hours > 0 AND expiry_period_hours <= 8760),
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create index for name lookups
CREATE INDEX idx_produce_categories_name ON produce_categories(name);

-- Insert default categories (Requirement 6.5)
INSERT INTO produce_categories (name, expiry_period_hours, description) VALUES
('Leafy Greens', 24, 'Palak, methi, dhania, lettuce - highly perishable greens'),
('Fruits', 48, 'Tomato, apple, mango, banana - moderately perishable fruits'),
('Root Vegetables', 168, 'Potato, onion, garlic, carrot - long-lasting root vegetables'),
('Grains', 672, 'Wheat, rice, corn, millet - dry grains with extended shelf life');

COMMENT ON TABLE produce_categories IS 'Produce categories with expiry periods for automatic listing expiration';
COMMENT ON COLUMN produce_categories.expiry_period_hours IS 'Hours after harvest when produce expires (1-8760 hours = 1 hour to 1 year)';
```

##### Listings Table Recreation

```sql
-- Drop existing tables
DROP TABLE IF EXISTS listing_status_history CASCADE;
DROP TABLE IF EXISTS listings CASCADE;

-- Drop existing enum types if present
DROP TYPE IF EXISTS listing_status CASCADE;
DROP TYPE IF EXISTS listing_type CASCADE;
DROP TYPE IF EXISTS payment_method_preference CASCADE;
DROP TYPE IF EXISTS sale_channel CASCADE;

-- Create enum types
CREATE TYPE listing_status AS ENUM ('ACTIVE', 'SOLD', 'EXPIRED', 'CANCELLED');
CREATE TYPE listing_type AS ENUM ('PRE_HARVEST', 'POST_HARVEST');
CREATE TYPE payment_method_preference AS ENUM ('PLATFORM_ONLY', 'DIRECT_ONLY', 'BOTH');
CREATE TYPE sale_channel AS ENUM ('PLATFORM_ESCROW', 'PLATFORM_DIRECT', 'EXTERNAL');

-- Create listings table with new schema
CREATE TABLE listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID NOT NULL REFERENCES users(id),
    produce_type VARCHAR(100) NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    price_per_kg DECIMAL(10, 2) NOT NULL,
    certificate_id UUID REFERENCES certificates(id),
    expected_harvest_date TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Status tracking fields
    status listing_status NOT NULL DEFAULT 'ACTIVE',
    sold_at TIMESTAMP,
    transaction_id UUID REFERENCES transactions(id),
    expired_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    cancelled_by UUID REFERENCES users(id),
    
    -- Perishability-based expiration fields
    listing_type listing_type NOT NULL DEFAULT 'POST_HARVEST',
    produce_category_id UUID NOT NULL REFERENCES produce_categories(id),
    expiry_date TIMESTAMP NOT NULL,
    
    -- Manual sale confirmation fields
    payment_method_preference payment_method_preference NOT NULL DEFAULT 'BOTH',
    sale_channel sale_channel,
    sale_price DECIMAL(10, 2),
    sale_notes TEXT,
    
    -- Constraints
    CONSTRAINT chk_sold_at_when_sold 
        CHECK ((status = 'SOLD' AND sold_at IS NOT NULL) OR status != 'SOLD'),
    CONSTRAINT chk_expired_at_when_expired 
        CHECK ((status = 'EXPIRED' AND expired_at IS NOT NULL) OR status != 'EXPIRED'),
    CONSTRAINT chk_cancelled_at_when_cancelled 
        CHECK ((status = 'CANCELLED' AND cancelled_at IS NOT NULL) OR status != 'CANCELLED')
);

-- Create indexes
CREATE INDEX idx_listings_status ON listings(status);
CREATE INDEX idx_listings_expiry_date_status ON listings(expiry_date, status) WHERE status = 'ACTIVE';
CREATE INDEX idx_listings_category ON listings(produce_category_id);
CREATE INDEX idx_listings_farmer ON listings(farmer_id);
```

##### Listing Status History Table (Requirement 11)

```sql
CREATE TABLE listing_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    previous_status listing_status,
    new_status listing_status NOT NULL,
    changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    triggered_by VARCHAR(255) NOT NULL, -- user_id or 'SYSTEM'
    trigger_type VARCHAR(50) NOT NULL CHECK (trigger_type IN ('USER', 'SYSTEM', 'TRANSACTION')),
    metadata JSONB, -- Additional context (e.g., transaction_id, reason)
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_status_history_listing ON listing_status_history(listing_id, changed_at DESC);
CREATE INDEX idx_status_history_changed_at ON listing_status_history(changed_at DESC);

COMMENT ON TABLE listing_status_history IS 'Audit trail for listing status changes. Retain for at least 2 years.';
```

#### SQLite Schema

```sql
-- Drop existing tables
DROP TABLE IF EXISTS listing_status_history;
DROP TABLE IF EXISTS listings;
DROP TABLE IF EXISTS produce_categories;

-- Create produce categories table
CREATE TABLE produce_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    expiry_period_hours INTEGER NOT NULL CHECK (expiry_period_hours > 0 AND expiry_period_hours <= 8760),
    description TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX idx_produce_categories_name ON produce_categories(name);

-- Insert default categories
INSERT INTO produce_categories (id, name, expiry_period_hours, description, created_at, updated_at) VALUES
(lower(hex(randomblob(16))), 'Leafy Greens', 24, 'Palak, methi, dhania, lettuce - highly perishable greens', datetime('now'), datetime('now')),
(lower(hex(randomblob(16))), 'Fruits', 48, 'Tomato, apple, mango, banana - moderately perishable fruits', datetime('now'), datetime('now')),
(lower(hex(randomblob(16))), 'Root Vegetables', 168, 'Potato, onion, garlic, carrot - long-lasting root vegetables', datetime('now'), datetime('now')),
(lower(hex(randomblob(16))), 'Grains', 672, 'Wheat, rice, corn, millet - dry grains with extended shelf life', datetime('now'), datetime('now'));

-- Create listings table with new schema
CREATE TABLE listings (
    id TEXT PRIMARY KEY,
    farmer_id TEXT NOT NULL,
    produce_type TEXT NOT NULL,
    quantity REAL NOT NULL,
    price_per_kg REAL NOT NULL,
    certificate_id TEXT,
    expected_harvest_date TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    
    -- Status tracking fields
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SOLD', 'EXPIRED', 'CANCELLED')),
    sold_at TEXT,
    transaction_id TEXT,
    expired_at TEXT,
    cancelled_at TEXT,
    cancelled_by TEXT,
    
    -- Perishability-based expiration fields
    listing_type TEXT NOT NULL DEFAULT 'POST_HARVEST' CHECK (listing_type IN ('PRE_HARVEST', 'POST_HARVEST')),
    produce_category_id TEXT NOT NULL,
    expiry_date TEXT NOT NULL,
    
    -- Manual sale confirmation fields
    payment_method_preference TEXT NOT NULL DEFAULT 'BOTH' CHECK (payment_method_preference IN ('PLATFORM_ONLY', 'DIRECT_ONLY', 'BOTH')),
    sale_channel TEXT CHECK (sale_channel IN ('PLATFORM_ESCROW', 'PLATFORM_DIRECT', 'EXTERNAL')),
    sale_price REAL,
    sale_notes TEXT,
    
    -- Foreign keys
    FOREIGN KEY (farmer_id) REFERENCES users(id),
    FOREIGN KEY (certificate_id) REFERENCES certificates(id),
    FOREIGN KEY (transaction_id) REFERENCES transactions(id),
    FOREIGN KEY (cancelled_by) REFERENCES users(id),
    FOREIGN KEY (produce_category_id) REFERENCES produce_categories(id)
);

-- Create indexes
CREATE INDEX idx_listings_status ON listings(status);
CREATE INDEX idx_listings_expiry_date_status ON listings(expiry_date, status) WHERE status = 'ACTIVE';
CREATE INDEX idx_listings_category ON listings(produce_category_id);
CREATE INDEX idx_listings_farmer ON listings(farmer_id);

-- Create status history table
CREATE TABLE listing_status_history (
    id TEXT PRIMARY KEY,
    listing_id TEXT NOT NULL,
    previous_status TEXT,
    new_status TEXT NOT NULL CHECK (new_status IN ('ACTIVE', 'SOLD', 'EXPIRED', 'CANCELLED')),
    changed_at TEXT NOT NULL,
    triggered_by TEXT NOT NULL,
    trigger_type TEXT NOT NULL CHECK (trigger_type IN ('USER', 'SYSTEM', 'TRANSACTION')),
    metadata TEXT, -- JSON string
    created_at TEXT NOT NULL,
    FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
);

CREATE INDEX idx_status_history_listing ON listing_status_history(listing_id, changed_at DESC);
CREATE INDEX idx_status_history_changed_at ON listing_status_history(changed_at DESC);
```



**Note**: No migration scripts needed. In development phase, we use DROP TABLE IF EXISTS + CREATE TABLE for clean schema recreation.


## Components and Interfaces

### ListingStatusManager Service

```typescript
// src/features/marketplace/listing-status-manager.ts

import { DatabaseManager } from '../../shared/database/db-abstraction';
import { Listing } from './marketplace.types';
import { ListingStatus } from '../../shared/types/common.types';

export interface StatusTransitionMetadata {
  triggeredBy: string; // user_id or 'SYSTEM'
  triggerType: 'USER' | 'SYSTEM' | 'TRANSACTION';
  transactionId?: string;
  reason?: string;
  [key: string]: any;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface BulkStatusResult {
  successful: string[]; // listing IDs
  failed: Array<{
    listingId: string;
    error: string;
  }>;
}

export interface StatusHistory {
  id: string;
  listingId: string;
  previousStatus: ListingStatus | null;
  newStatus: ListingStatus;
  changedAt: Date;
  triggeredBy: string;
  triggerType: 'USER' | 'SYSTEM' | 'TRANSACTION';
  metadata?: Record<string, any>;
}

export class ListingStatusManager {
  private dbManager: DatabaseManager;

  constructor(dbManager: DatabaseManager) {
    this.dbManager = dbManager;
  }

  /**
   * Transition a listing to a new status
   * Requirements: 1.1, 1.3, 10.1, 10.2, 10.5, 11.1, 11.2
   * 
   * @param listingId - Listing ID
   * @param newStatus - Target status
   * @param metadata - Context about the transition
   * @returns Updated listing
   * @throws Error if transition is invalid
   */
  async transitionStatus(
    listingId: string,
    newStatus: ListingStatus,
    metadata: StatusTransitionMetadata
  ): Promise<Listing> {
    // Implementation details in LLD
  }

  /**
   * Validate if a status transition is allowed
   * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
   * 
   * @param currentStatus - Current listing status
   * @param newStatus - Target status
   * @returns Validation result
   */
  validateTransition(
    currentStatus: ListingStatus,
    newStatus: ListingStatus
  ): ValidationResult {
    // Implementation details in LLD
  }

  /**
   * Get listings by status
   * Requirements: 8.1, 8.2, 8.3
   * 
   * @param status - Status to filter by (single or array)
   * @returns Array of listings
   */
  async getListingsByStatus(
    status: ListingStatus | ListingStatus[]
  ): Promise<Listing[]> {
    // Implementation details in LLD
  }

  /**
   * Bulk update status for multiple listings
   * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5
   * 
   * @param listingIds - Array of listing IDs
   * @param newStatus - Target status
   * @param metadata - Context about the transition
   * @returns Bulk operation result
   */
  async bulkUpdateStatus(
    listingIds: string[],
    newStatus: ListingStatus,
    metadata: StatusTransitionMetadata
  ): Promise<BulkStatusResult> {
    // Implementation details in LLD
  }

  /**
   * Calculate expiry date for a listing
   * Requirements: 17.1, 17.2, 17.5
   * 
   * @param harvestDate - Expected or actual harvest date
   * @param categoryExpiryPeriodHours - Expiry period from produce category
   * @returns Calculated expiry date
   */
  calculateExpiryDate(
    harvestDate: Date,
    categoryExpiryPeriodHours: number
  ): Date {
    const expiryDate = new Date(harvestDate);
    expiryDate.setHours(expiryDate.getHours() + categoryExpiryPeriodHours);
    return expiryDate;
  }
    metadata: StatusTransitionMetadata
  ): Promise<BulkStatusResult> {
    // Implementation details in LLD
  }

  /**
   * Get status change history for a listing
   * Requirements: 11.5
   * 
   * @param listingId - Listing ID
   * @returns Array of status history records
   */
  async getStatusHistory(listingId: string): Promise<StatusHistory[]> {
    // Implementation details in LLD
  }

  /**
   * Record a status change in the audit trail
   * Requirements: 11.1, 11.2, 11.3
   * 
   * @param listing - Listing object
   * @param oldStatus - Previous status
   * @param newStatus - New status
   * @param metadata - Context about the change
   */
  private async recordStatusChange(
    listing: Listing,
    oldStatus: ListingStatus | null,
    newStatus: ListingStatus,
    metadata: StatusTransitionMetadata
  ): Promise<void> {
    // Implementation details in LLD
  }
}
```


### ExpirationService

```typescript
// src/features/marketplace/expiration.service.ts

import { DatabaseManager } from '../../shared/database/db-abstraction';
import { NotificationService } from '../notifications/notification.service';
import { Listing } from './marketplace.types';
import { ListingStatusManager } from './listing-status-manager';

export class ExpirationService {
  private dbManager: DatabaseManager;
  private notificationService: NotificationService;
  private statusManager: ListingStatusManager;
  private checkInterval: NodeJS.Timeout | null = null;

  constructor(
    dbManager: DatabaseManager,
    notificationService: NotificationService,
    statusManager: ListingStatusManager
  ) {
    this.dbManager = dbManager;
    this.notificationService = notificationService;
    this.statusManager = statusManager;
  }

  /**
   * Check for expired listings and transition them to EXPIRED status
   * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
   * 
   * Runs hourly to check for listings past their expiration time
   * Query: WHERE status='ACTIVE' AND expiry_date < NOW()
   */
  async checkExpiredListings(): Promise<void> {
    // Implementation details in LLD
  }

  /**
   * Expire a specific listing
   * Requirements: 4.1, 4.4, 4.5
   * 
   * @param listingId - Listing ID to expire
   * @returns Updated listing
   */
  async expireListing(listingId: string): Promise<Listing> {
    // Implementation details in LLD
  }

  /**
   * Schedule periodic expiration checks
   * Requirements: 4.2
   * 
   * Starts a cron job that runs every hour
   */
  scheduleExpirationCheck(): void {
    // Implementation details in LLD
  }

  /**
   * Stop the expiration check scheduler
   */
  stopScheduler(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Send expiration notification to farmer
   * Requirements: 4.5
   * 
   * @param listing - Listing that expired or is about to expire
   * @param type - 'WARNING' or 'EXPIRED'
   */
  private async sendExpirationNotification(
    listing: Listing,
    type: 'WARNING' | 'EXPIRED'
  ): Promise<void> {
    // Implementation details in LLD
  }
}
```

### CategoryManager

```typescript
// src/features/marketplace/category-manager.ts

import { DatabaseManager } from '../../shared/database/db-abstraction';

export interface ProduceCategory {
  id: string;
  name: string;
  expiryPeriodHours: number;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCategoryInput {
  name: string;
  expiryPeriodHours: number;
  description?: string;
}

export interface UpdateCategoryInput {
  name?: string;
  expiryPeriodHours?: number;
  description?: string;
}

export class CategoryManager {
  private dbManager: DatabaseManager;

  constructor(dbManager: DatabaseManager) {
    this.dbManager = dbManager;
  }

  /**
   * Create a new produce category
   * Requirements: 6.1, 6.2
   * 
   * @param input - Category creation data
   * @returns Created category
   * @throws Error if name already exists or expiry period is invalid
   */
  async createCategory(input: CreateCategoryInput): Promise<ProduceCategory> {
    // Implementation details in LLD
  }

  /**
   * Update an existing produce category
   * Requirements: 6.3
   * 
   * @param id - Category ID
   * @param updates - Fields to update
   * @returns Updated category
   * @throws Error if category not found
   */
  async updateCategory(
    id: string,
    updates: UpdateCategoryInput
  ): Promise<ProduceCategory> {
    // Implementation details in LLD
  }

  /**
   * Delete a produce category
   * Requirements: 6.4
   * 
   * @param id - Category ID
   * @throws Error if category has existing listings
   */
  async deleteCategory(id: string): Promise<void> {
    // Implementation details in LLD
  }

  /**
   * Get all produce categories
   * Requirements: 6.2
   * 
   * @returns Array of all categories
   */
  async getCategories(): Promise<ProduceCategory[]> {
    // Implementation details in LLD
  }

  /**
   * Get a specific category by ID
   * Requirements: 6.2
   * 
   * @param id - Category ID
   * @returns Category or null if not found
   */
  async getCategoryById(id: string): Promise<ProduceCategory | null> {
    // Implementation details in LLD
  }

  /**
   * Validate expiry period is within allowed range
   * Requirements: 6.6
   * 
   * @param hours - Expiry period in hours
   * @returns true if valid (1-8760 hours)
   */
  validateExpiryPeriod(hours: number): boolean {
    return hours >= 1 && hours <= 8760;
  }
}
```


### StatusSynchronizer

```typescript
// src/features/marketplace/status-synchronizer.ts

import { DatabaseManager } from '../../shared/database/db-abstraction';
import { Transaction, EscrowAccount } from '../transactions/transaction.types';
import { Listing } from './marketplace.types';
import { ListingStatusManager } from './listing-status-manager';
import { TransactionStatus, EscrowStatus, ListingStatus } from '../../shared/types/common.types';

export class StatusSynchronizer {
  private dbManager: DatabaseManager;
  private statusManager: ListingStatusManager;

  constructor(dbManager: DatabaseManager, statusManager: ListingStatusManager) {
    this.dbManager = dbManager;
    this.statusManager = statusManager;
  }

  /**
   * Handle transaction completion event
   * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
   * 
   * @param transaction - Completed transaction
   */
  async onTransactionCompleted(transaction: Transaction): Promise<void> {
    // Implementation details in LLD
  }

  /**
   * Handle transaction cancellation event
   * Requirements: 7.1, 7.2, 7.4, 7.5
   * 
   * @param transaction - Cancelled transaction
   */
  async onTransactionCancelled(transaction: Transaction): Promise<void> {
    // Implementation details in LLD
  }

  /**
   * Handle transaction rejection event
   * Requirements: 7.2, 7.4, 7.5
   * 
   * @param transaction - Rejected transaction
   */
  async onTransactionRejected(transaction: Transaction): Promise<void> {
    // Implementation details in LLD
  }

  /**
   * Handle escrow refund event
   * Requirements: 6.3, 6.4, 6.5
   * 
   * @param escrow - Refunded escrow account
   */
  async onEscrowRefunded(escrow: EscrowAccount): Promise<void> {
    // Implementation details in LLD
  }

  /**
   * Determine if a listing should be reactivated
   * Requirements: 6.5
   * 
   * @param listing - Listing to check
   * @returns true if harvest date has not passed, false otherwise
   */
  private shouldReactivateListing(listing: Listing): boolean {
    // Implementation details in LLD
  }
}
```

### Updated Listing Type

```typescript
// src/features/marketplace/marketplace.types.ts

import { ProduceGrade } from '../../shared/types/common.types';
import { ListingStatus, ListingType } from '../../shared/types/common.types';

export interface Listing {
  id: string;
  farmerId: string;
  produceType: string;
  quantity: number;
  pricePerKg: number;
  certificateId: string;
  expectedHarvestDate?: Date;
  createdAt: Date;
  
  // Status fields
  status: ListingStatus;
  soldAt?: Date;
  transactionId?: string;
  expiredAt?: Date;
  cancelledAt?: Date;
  cancelledBy?: string;
  
  // New perishability-based expiration fields (Requirements 16, 17, 18)
  listingType: ListingType; // 'PRE_HARVEST' | 'POST_HARVEST'
  produceCategoryId: string;
  produceCategoryName?: string; // Populated in API responses
  expiryDate: Date;
  
  // New manual sale confirmation fields (Requirements 18, 19)
  paymentMethodPreference: 'PLATFORM_ONLY' | 'DIRECT_ONLY' | 'BOTH';
  saleChannel?: 'PLATFORM_ESCROW' | 'PLATFORM_DIRECT' | 'EXTERNAL';
  salePrice?: number; // For EXTERNAL sales
  saleNotes?: string; // For EXTERNAL sales
}

export interface TranslatedListing extends Listing {
  originalProduceType: string;
  translatedProduceType: string;
  isTranslated: boolean;
  sourceLanguage: string;
  targetLanguage: string;
}
```


### API Endpoint Signatures

#### Get Active Listings

```typescript
/**
 * GET /api/marketplace/listings
 * Get listings filtered by status
 * Requirements: 8.1, 8.2, 8.3, 13.1, 13.2
 */

// Query Parameters
interface GetListingsQuery {
  status?: 'ACTIVE' | 'SOLD' | 'EXPIRED' | 'CANCELLED' | string; // Comma-separated for multiple
  farmerId?: string;
  limit?: number;
  offset?: number;
}

// Response
interface GetListingsResponse {
  listings: Array<{
    id: string;
    farmerId: string;
    produceType: string;
    quantity: number;
    pricePerKg: number;
    certificateId: string;
    expectedHarvestDate?: string; // ISO 8601
    createdAt: string; // ISO 8601
    status: 'ACTIVE' | 'SOLD' | 'EXPIRED' | 'CANCELLED';
    soldAt?: string; // ISO 8601, present if status is SOLD
    transactionId?: string; // Present if status is SOLD
    expiredAt?: string; // ISO 8601, present if status is EXPIRED
    cancelledAt?: string; // ISO 8601, present if status is CANCELLED
    cancelledBy?: string; // User ID, present if status is CANCELLED
    listingType: 'PRE_HARVEST' | 'POST_HARVEST'; // Requirement 14.3
    produceCategoryId: string; // Requirement 14.4
    produceCategoryName: string; // Requirement 14.4
    expiryDate: string; // ISO 8601, Requirement 14.5
    paymentMethodPreference: 'PLATFORM_ONLY' | 'DIRECT_ONLY' | 'BOTH'; // Requirement 18
    saleChannel?: 'PLATFORM_ESCROW' | 'PLATFORM_DIRECT' | 'EXTERNAL'; // Requirement 19, present if SOLD
    salePrice?: number; // Requirement 19, present if SOLD via EXTERNAL
    saleNotes?: string; // Requirement 19, present if SOLD via EXTERNAL
  }>;
  total: number;
}
```

#### Cancel Listing

```typescript
/**
 * POST /api/marketplace/listings/:id/cancel
 * Cancel an active listing
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */

// Request Body
interface CancelListingRequest {
  reason?: string;
}

// Response
interface CancelListingResponse {
  listing: {
    id: string;
    status: 'CANCELLED';
    cancelledAt: string; // ISO 8601
    cancelledBy: string; // User ID
    // ... other listing fields
  };
}

// Error Response (if listing has active transaction)
interface CancelListingError {
  error: string;
  message: string;
  currentStatus: string;
  transactionId?: string;
  transactionStatus?: string;
}
```

#### Mark Listing as Sold (New - Requirement 19)

```typescript
/**
 * POST /api/marketplace/listings/:id/mark-sold
 * Manually mark a listing as sold
 * Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 19.7, 19.8, 19.9, 19.10
 */

// Request Body
interface MarkListingAsSoldRequest {
  saleChannel: 'PLATFORM_DIRECT' | 'EXTERNAL';
  transactionId?: string; // Required if saleChannel is PLATFORM_DIRECT
  salePrice?: number; // Optional for EXTERNAL
  saleNotes?: string; // Optional for EXTERNAL
}

// Response
interface MarkListingAsSoldResponse {
  listing: {
    id: string;
    status: 'SOLD';
    soldAt: string; // ISO 8601
    saleChannel: 'PLATFORM_DIRECT' | 'EXTERNAL';
    transactionId?: string; // Present if PLATFORM_DIRECT
    salePrice?: number; // Present if EXTERNAL
    saleNotes?: string; // Present if EXTERNAL
    // ... other listing fields
  };
}

// Error Response (if listing has active transaction with PAYMENT_LOCKED+)
interface MarkListingAsSoldError {
  error: string;
  message: string;
  currentStatus: string;
  activeTransactionId?: string;
  activeTransactionStatus?: string;
}
```

#### Complete Direct Payment Transaction (New - Requirement 20)

```typescript
/**
 * PUT /api/transactions/:id/complete-direct
 * Complete a transaction with direct payment (no escrow)
 * Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.6, 20.7
 */

// Request Body
interface CompleteDirectPaymentRequest {
  notes?: string; // Optional confirmation notes
}

// Response
interface CompleteDirectPaymentResponse {
  transaction: {
    id: string;
    status: 'COMPLETED_DIRECT';
    completedAt: string; // ISO 8601
    listingId: string;
    farmerId: string;
    buyerId: string;
    amount: number;
    notes?: string;
  };
  listing: {
    id: string;
    status: 'SOLD';
    soldAt: string;
    saleChannel: 'PLATFORM_DIRECT';
    transactionId: string;
  };
}

// Error Response
interface CompleteDirectPaymentError {
  error: string;
  message: string;
  currentTransactionStatus: string;
  listingPaymentPreference?: string;
}
```

#### Produce Category Management (New - Requirement 6)

```typescript
/**
 * POST /api/admin/produce-categories
 * Create a new produce category
 * Requirements: 6.1, 6.2
 */

// Request Body
interface CreateCategoryRequest {
  name: string;
  expiryPeriodHours: number; // 1-8760 hours
  description?: string;
}

// Response
interface CreateCategoryResponse {
  category: {
    id: string;
    name: string;
    expiryPeriodHours: number;
    description?: string;
    createdAt: string; // ISO 8601
    updatedAt: string; // ISO 8601
  };
}

/**
 * GET /api/produce-categories
 * Get all produce categories
 * Requirements: 6.2
 */

// Response
interface GetCategoriesResponse {
  categories: Array<{
    id: string;
    name: string;
    expiryPeriodHours: number;
    description?: string;
    createdAt: string; // ISO 8601
    updatedAt: string; // ISO 8601
  }>;
}

/**
 * PATCH /api/admin/produce-categories/:id
 * Update a produce category
 * Requirements: 6.3
 */

// Request Body
interface UpdateCategoryRequest {
  name?: string;
  expiryPeriodHours?: number; // 1-8760 hours
  description?: string;
}

// Response
interface UpdateCategoryResponse {
  category: {
    id: string;
    name: string;
    expiryPeriodHours: number;
    description?: string;
    createdAt: string; // ISO 8601
    updatedAt: string; // ISO 8601
  };
}

/**
 * DELETE /api/admin/produce-categories/:id
 * Delete a produce category
 * Requirements: 6.4
 */

// Response (success)
interface DeleteCategoryResponse {
  message: string;
}

// Error Response (if category has existing listings)
interface DeleteCategoryError {
  error: string;
  message: string;
  activeListingsCount: number;
}
```

#### Get Listing Status History

```typescript
/**
 * GET /api/marketplace/listings/:id/history
 * Get status change history for a listing
 * Requirements: 11.5
 */

// Response
interface GetStatusHistoryResponse {
  history: Array<{
    id: string;
    listingId: string;
    previousStatus: 'ACTIVE' | 'SOLD' | 'EXPIRED' | 'CANCELLED' | null;
    newStatus: 'ACTIVE' | 'SOLD' | 'EXPIRED' | 'CANCELLED';
    changedAt: string; // ISO 8601
    triggeredBy: string; // User ID or 'SYSTEM'
    triggerType: 'USER' | 'SYSTEM' | 'TRANSACTION';
    metadata?: Record<string, any>;
  }>;
}
```

#### Bulk Update Status (Admin)

```typescript
/**
 * POST /api/admin/marketplace/listings/bulk-status
 * Bulk update status for multiple listings
 * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5
 */

// Request Body
interface BulkUpdateStatusRequest {
  listingIds: string[];
  status: 'ACTIVE' | 'SOLD' | 'EXPIRED' | 'CANCELLED';
  reason?: string;
}

// Response
interface BulkUpdateStatusResponse {
  successful: string[]; // Listing IDs
  failed: Array<{
    listingId: string;
    error: string;
  }>;
  totalProcessed: number;
  successCount: number;
  failureCount: number;
}
```

#### Get Analytics

```typescript
/**
 * GET /api/marketplace/analytics/listings
 * Get listing analytics by status
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

// Query Parameters
interface GetAnalyticsQuery {
  startDate?: string; // ISO 8601
  endDate?: string; // ISO 8601
  farmerId?: string;
}

// Response
interface GetAnalyticsResponse {
  statusCounts: {
    ACTIVE: number;
    SOLD: number;
    EXPIRED: number;
    CANCELLED: number;
  };
  averageTimeToSold: number; // In hours
  expiredWithoutSale: number;
  cancellationRate: number; // Percentage
  totalListings: number;
  dateRange: {
    start: string; // ISO 8601
    end: string; // ISO 8601
  };
}
```

#### Get Sales Analytics by Channel (New - Requirement 21)

```typescript
/**
 * GET /api/marketplace/analytics/sales-by-channel
 * Get sales analytics grouped by sale channel
 * Requirements: 21.1, 21.2, 21.3, 21.4, 21.5, 21.6
 */

// Query Parameters
interface GetSalesByChannelQuery {
  startDate?: string; // ISO 8601
  endDate?: string; // ISO 8601
  farmerId?: string;
}

// Response
interface GetSalesByChannelResponse {
  totalSales: number;
  byChannel: {
    PLATFORM_ESCROW: {
      count: number;
      percentage: number;
      totalRevenue: number; // From transaction data
    };
    PLATFORM_DIRECT: {
      count: number;
      percentage: number;
    };
    EXTERNAL: {
      count: number;
      percentage: number;
      reportedRevenue: number; // From sale_price field
    };
    UNKNOWN: {
      count: number; // Legacy data with NULL sale_channel
      percentage: number;
    };
  };
  dateRange: {
    start: string; // ISO 8601
    end: string; // ISO 8601
  };
}
```

