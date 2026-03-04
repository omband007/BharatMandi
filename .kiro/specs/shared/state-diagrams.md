# Bharat Mandi - State Transition Diagrams

> **Shared Documentation**: This document provides visual state machine diagrams for the entire Bharat Mandi marketplace, covering Listing, Transaction, and Escrow states.
>
> **Referenced by**:
> - [Enhanced Listing Status Management](../enhanced-listing-status-management/requirements.md)
> - [Enhanced Listing Status Management - Design](../enhanced-listing-status-management/design.md)
> - [State Synchronization](../enhanced-listing-status-management/STATE-SYNCHRONIZATION.md)

## 1. Listing States

### Current Implementation (Simplified)
```mermaid
stateDiagram-v2
    [*] --> Active: Farmer creates listing
    
    Active --> Inactive: Transaction initiated\nor Farmer deletes
    
    Inactive --> [*]
    
    note right of Active
        isActive = true
        Visible to buyers
        Available for purchase
    end note
    
    note right of Inactive
        isActive = false
        Hidden from marketplace
        (SOLD, CANCELLED, or EXPIRED)
    end note
```

### Recommended Enhanced Implementation
```mermaid
stateDiagram-v2
    [*] --> ACTIVE: Farmer creates listing

    ACTIVE --> SOLD: Path 1: Transaction completed (escrow)\nPath 2: Transaction completed (direct payment)\nPath 3: Farmer marks as sold (manual)
    ACTIVE --> EXPIRED: Expiry date passed\n(harvest date + category expiry period)
    ACTIVE --> CANCELLED: Farmer cancels\n(manual deletion)
    
    SOLD --> [*]
    EXPIRED --> [*]
    CANCELLED --> [*]
    
    note right of ACTIVE
        isActive = true
        status = 'ACTIVE'
        Available for purchase
        Visible in marketplace
        Expiry: harvest_date + category_expiry_period
        Payment preference: PLATFORM_ONLY | DIRECT_ONLY | BOTH
    end note
    
    note right of SOLD
        isActive = false
        status = 'SOLD'
        Sale channel: PLATFORM_ESCROW | PLATFORM_DIRECT | EXTERNAL
        Path 1: Escrow transaction completed
        Path 2: Direct payment transaction completed
        Path 3: Farmer manually confirmed sale
    end note
    
    note right of EXPIRED
        isActive = false
        status = 'EXPIRED'
        Expiry date passed
        (harvest_date + category_expiry_period)
        Based on produce perishability
    end note
    
    note right of CANCELLED
        isActive = false
        status = 'CANCELLED'
        Farmer removed listing
        Soft deleted
    end note
```

---

## 2. Transaction States (Current Implementation + Direct Payment)

### Transaction Flow with Escrow and Direct Payment
```mermaid
stateDiagram-v2
    [*] --> PENDING: Buyer initiates purchase

    PENDING --> ACCEPTED: Farmer accepts order
    PENDING --> REJECTED: Farmer rejects order
    PENDING --> CANCELLED: Buyer cancels order
    
    ACCEPTED --> PAYMENT_LOCKED: Buyer locks payment in escrow
    ACCEPTED --> COMPLETED_DIRECT: Farmer confirms direct payment
    ACCEPTED --> CANCELLED: Buyer cancels before payment
    
    PAYMENT_LOCKED --> DISPATCHED: Farmer dispatches goods
    PAYMENT_LOCKED --> CANCELLED: Mutual cancellation
    
    DISPATCHED --> IN_TRANSIT: Logistics tracking active
    
    IN_TRANSIT --> DELIVERED: Buyer confirms delivery
    IN_TRANSIT --> DISPUTED: Delivery issues
    
    DELIVERED --> COMPLETED: Funds released to farmer
    
    DISPUTED --> COMPLETED: Dispute resolved - release funds
    DISPUTED --> CANCELLED: Dispute resolved - refund buyer
    
    REJECTED --> [*]
    CANCELLED --> [*]
    COMPLETED --> [*]
    
    note right of PENDING
        ⏳ Waiting for farmer
        Escrow: Not created
        Listing: Still ACTIVE
    end note
    
    note right of ACCEPTED
        ✅ Farmer confirmed
        Escrow: Created
        Listing: Still ACTIVE
    end note
    
    note right of PAYMENT_LOCKED
        🔒 Payment secured
        Escrow: FUNDED & LOCKED
        Listing: Reserved
    end note
    
    note right of DISPATCHED
        📦 Goods shipped
        Escrow: LOCKED
        Listing: Reserved
    end note
    
    note right of IN_TRANSIT
        🚚 In delivery
        Escrow: LOCKED
        Listing: Reserved
    end note
    
    note right of DELIVERED
        📬 Goods received
        Escrow: LOCKED
        Listing: Reserved
    end note
    
    note right of COMPLETED
        ✨ Transaction done
        Escrow: RELEASED
        Listing: SOLD (PLATFORM_ESCROW)
    end note
    
    note right of COMPLETED_DIRECT
        ✨ Direct payment confirmed
        Escrow: Not used
        Listing: SOLD (PLATFORM_DIRECT)
    end note
    
    note right of DISPUTED
        ⚠️ Issue raised
        Escrow: DISPUTED
        Listing: Reserved
    end note
```

---

## 3. Escrow States

```mermaid
stateDiagram-v2
    [*] --> CREATED: Transaction accepted

    CREATED --> FUNDED: Buyer deposits payment
    
    FUNDED --> LOCKED: Farmer dispatches goods
    
    LOCKED --> RELEASED: Buyer confirms delivery
    LOCKED --> DISPUTED: Delivery issue raised
    
    DISPUTED --> RELEASED: Resolved - release to farmer
    DISPUTED --> REFUNDED: Resolved - refund to buyer
    
    RELEASED --> [*]
    REFUNDED --> [*]
    
    note right of CREATED
        Escrow account created
        Awaiting buyer payment
    end note
    
    note right of FUNDED
        Payment deposited
        Awaiting dispatch
    end note
    
    note right of LOCKED
        Payment secured
        Cannot be withdrawn
        Awaiting delivery confirmation
    end note
    
    note right of RELEASED
        Funds transferred to farmer
        Transaction complete
    end note
    
    note right of REFUNDED
        Funds returned to buyer
        Transaction cancelled
    end note
    
    note right of DISPUTED
        Issue under review
        Funds held
        Awaiting resolution
    end note
```

---

## 4. Complete Marketplace Flow

### Listing Lifecycle with Transaction Integration

```mermaid
stateDiagram-v2
    [*] --> ListingActive: Farmer creates listing
    
    ListingActive --> TxPending: Buyer initiates purchase
    
    TxPending --> TxAccepted: Farmer accepts
    TxPending --> ListingActive: Farmer rejects
    TxPending --> ListingActive: Buyer cancels
    
    TxAccepted --> TxPaymentLocked: Buyer locks payment
    TxAccepted --> ListingActive: Cancelled before payment
    
    TxPaymentLocked --> TxDispatched: Farmer dispatches
    TxPaymentLocked --> ListingActive: Mutual cancellation
    
    TxDispatched --> TxInTransit: Logistics tracking
    
    TxInTransit --> TxDelivered: Buyer confirms delivery
    TxInTransit --> TxDisputed: Delivery issue
    
    TxDelivered --> TxCompleted: Release funds
    
    TxCompleted --> ListingSold: Mark listing as sold
    
    TxDisputed --> TxCompleted: Resolved - release
    TxDisputed --> ListingActive: Resolved - refund
    
    ListingActive --> ListingExpired: Expiry date passed\n(harvest date + category expiry period)
    ListingActive --> ListingCancelled: Farmer cancels
    
    ListingSold --> [*]
    ListingExpired --> [*]
    ListingCancelled --> [*]
    
    note right of ListingActive
        Listing State: ACTIVE
        isActive = true
        Available for purchase
    end note
    
    note right of TxPending
        Transaction: PENDING
        Listing: ACTIVE (reserved)
        Escrow: Not created
    end note
    
    note right of TxPaymentLocked
        Transaction: PAYMENT_LOCKED
        Listing: ACTIVE (reserved)
        Escrow: FUNDED & LOCKED
    end note
    
    note right of TxCompleted
        Transaction: COMPLETED
        Listing: About to be SOLD
        Escrow: RELEASED
    end note
    
    note right of ListingSold
        Listing State: SOLD
        isActive = false
        Transaction completed
    end note
```

---

## 5. Transaction Flow Steps (As Shown in UI)

### Escrow Flow (5-step process)

1. **Farmer Accepts Order** (PENDING → ACCEPTED)
   - Farmer reviews and accepts the purchase request
   - Escrow account is created

2. **Buyer Locks Payment** (ACCEPTED → PAYMENT_LOCKED)
   - Buyer deposits payment into escrow
   - Funds are secured and locked

3. **Farmer Dispatches** (PAYMENT_LOCKED → DISPATCHED/IN_TRANSIT)
   - Farmer ships the goods
   - Tracking information updated

4. **Buyer Confirms Delivery** (IN_TRANSIT → DELIVERED)
   - Buyer receives and verifies goods
   - Confirms delivery in system

5. **Release Funds** (DELIVERED → COMPLETED)
   - System releases funds from escrow to farmer
   - Listing marked as SOLD (PLATFORM_ESCROW)
   - Transaction complete

### Direct Payment Flow (2-step process)

1. **Farmer Accepts Order** (PENDING → ACCEPTED)
   - Farmer reviews and accepts the purchase request
   - No escrow account created (direct payment agreed)

2. **Farmer Confirms Payment** (ACCEPTED → COMPLETED_DIRECT)
   - Farmer confirms direct payment received from buyer
   - Listing marked as SOLD (PLATFORM_DIRECT)
   - Transaction complete

### Manual Sale Confirmation (No transaction)

1. **Farmer Marks as Sold**
   - Farmer sold produce outside Bharat Mandi or through direct arrangement
   - Farmer manually marks listing as SOLD
   - Selects sale channel: PLATFORM_DIRECT or EXTERNAL
   - Listing marked as SOLD (EXTERNAL)
   - Helps platform track all sales for analytics

---

## Implementation Notes

### Current Database Schema
- **Listings Table**: Uses `isActive` boolean (true/false)
- **Transactions Table**: Uses `status` enum with all states
- **Escrow Table**: Uses `status` enum with escrow states

### Recommended Enhancements
1. Add `status` column to listings table (ACTIVE, SOLD, EXPIRED, CANCELLED)
2. Add `payment_method_preference` column (PLATFORM_ONLY, DIRECT_ONLY, BOTH)
3. Add `sale_channel` column (PLATFORM_ESCROW, PLATFORM_DIRECT, EXTERNAL)
4. Add `COMPLETED_DIRECT` to transaction status enum
5. Keep `isActive` as computed field for backward compatibility
6. Implement automatic expiration based on produce category perishability (harvest_date + category_expiry_period)
7. Update listing status to SOLD when transaction reaches COMPLETED or COMPLETED_DIRECT state
8. Allow farmers to manually mark listings as SOLD for external sales
9. Add webhook/event system to sync listing and transaction states

### State Synchronization Rules
- When transaction → COMPLETED: listing → SOLD (sale_channel = PLATFORM_ESCROW)
- When transaction → COMPLETED_DIRECT: listing → SOLD (sale_channel = PLATFORM_DIRECT)
- When farmer marks as sold: listing → SOLD (sale_channel = PLATFORM_DIRECT or EXTERNAL)
- When transaction → CANCELLED (before PAYMENT_LOCKED): listing → ACTIVE
- When transaction → DISPUTED → REFUNDED: listing → ACTIVE
- When expiry date passes (harvest_date + category_expiry_period): listing → EXPIRED (automatic job)
- When farmer deletes: listing → CANCELLED
