# Bharat Mandi - State Transition Diagrams

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

    ACTIVE --> SOLD: Transaction completed\n(funds released)
    ACTIVE --> EXPIRED: Harvest date passed\n(automatic)
    ACTIVE --> CANCELLED: Farmer cancels\n(manual deletion)
    
    SOLD --> [*]
    EXPIRED --> [*]
    CANCELLED --> [*]
    
    note right of ACTIVE
        isActive = true
        status = 'ACTIVE'
        Available for purchase
        Visible in marketplace
    end note
    
    note right of SOLD
        isActive = false
        status = 'SOLD'
        Transaction completed
        Funds released to farmer
    end note
    
    note right of EXPIRED
        isActive = false
        status = 'EXPIRED'
        Past harvest date
        No longer available
    end note
    
    note right of CANCELLED
        isActive = false
        status = 'CANCELLED'
        Farmer removed listing
        Soft deleted
    end note
```

---

## 2. Transaction States (Current Implementation)

### Transaction Flow with Escrow
```mermaid
stateDiagram-v2
    [*] --> PENDING: Buyer initiates purchase

    PENDING --> ACCEPTED: Farmer accepts order
    PENDING --> REJECTED: Farmer rejects order
    PENDING --> CANCELLED: Buyer cancels order
    
    ACCEPTED --> PAYMENT_LOCKED: Buyer locks payment in escrow
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
        Listing: SOLD
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
    
    ListingActive --> ListingExpired: Harvest date passed
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

The POC UI demonstrates this 5-step flow:

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
   - Listing marked as SOLD
   - Transaction complete

---

## Implementation Notes

### Current Database Schema
- **Listings Table**: Uses `isActive` boolean (true/false)
- **Transactions Table**: Uses `status` enum with all states
- **Escrow Table**: Uses `status` enum with escrow states

### Recommended Enhancements
1. Add `status` column to listings table (ACTIVE, SOLD, EXPIRED, CANCELLED)
2. Keep `isActive` as computed field for backward compatibility
3. Implement automatic expiration based on `expected_harvest_date`
4. Update listing status to SOLD when transaction reaches COMPLETED state
5. Add webhook/event system to sync listing and transaction states

### State Synchronization Rules
- When transaction → COMPLETED: listing → SOLD
- When transaction → CANCELLED (before PAYMENT_LOCKED): listing → ACTIVE
- When transaction → DISPUTED → REFUNDED: listing → ACTIVE
- When harvest date passes: listing → EXPIRED (automatic job)
- When farmer deletes: listing → CANCELLED
