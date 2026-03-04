# State Synchronization: Listings, Transactions, and Escrow

## Overview

The Bharat Mandi marketplace has **three independent but interconnected state machines**:

1. **Listing States** - Tracks produce availability
2. **Transaction States** - Tracks buyer-farmer transaction progress
3. **Escrow States** - Tracks payment security

These state machines operate independently but synchronize at specific points to maintain data consistency.

---

## The Three State Machines

### 1. Listing States (What We're Implementing)

```
ACTIVE → SOLD (when transaction completes)
ACTIVE → EXPIRED (when expiry date passes)
ACTIVE → CANCELLED (when farmer cancels)
CANCELLED → ACTIVE (when transaction is rejected/refunded)
```

**Purpose**: Track whether produce is available for purchase

**Triggers**:
- **ACTIVE → SOLD**: Transaction reaches COMPLETED state
- **ACTIVE → EXPIRED**: Expiry date (harvest_date + category_expiry_period) passes
- **ACTIVE → CANCELLED**: Farmer manually cancels
- **CANCELLED → ACTIVE**: Transaction is REJECTED or REFUNDED

---

### 2. Transaction States (Already Implemented)

```
PENDING → ACCEPTED → PAYMENT_LOCKED → DISPATCHED → IN_TRANSIT → DELIVERED → COMPLETED
         ↓           ↓                  ↓                        ↓
      REJECTED   CANCELLED          CANCELLED                DISPUTED
                                                                ↓
                                                         COMPLETED or CANCELLED
```

**Purpose**: Track the progress of a buyer-farmer transaction

**Key States**:
- **PENDING**: Buyer initiated, waiting for farmer
- **ACCEPTED**: Farmer accepted, escrow created
- **PAYMENT_LOCKED**: Buyer paid, funds in escrow
- **DISPATCHED/IN_TRANSIT**: Goods shipped
- **DELIVERED**: Buyer confirmed receipt
- **COMPLETED**: Funds released to farmer
- **REJECTED**: Farmer rejected the order
- **CANCELLED**: Either party cancelled
- **DISPUTED**: Issue raised during delivery

---

### 3. Escrow States (Already Implemented)

```
CREATED → FUNDED → LOCKED → RELEASED
                    ↓         ↓
                 DISPUTED → REFUNDED
```

**Purpose**: Track payment security and fund flow

**Key States**:
- **CREATED**: Escrow account created (when transaction ACCEPTED)
- **FUNDED**: Buyer deposited payment
- **LOCKED**: Funds secured, cannot be withdrawn
- **RELEASED**: Funds transferred to farmer (transaction complete)
- **REFUNDED**: Funds returned to buyer (transaction cancelled/disputed)
- **DISPUTED**: Issue under review

---

## How They Relate: State Synchronization Rules

### Rule 1: Transaction COMPLETED → Listing SOLD

**When**: Transaction reaches COMPLETED state (funds released to farmer)

**What Happens**:
```
Transaction: DELIVERED → COMPLETED
Escrow: LOCKED → RELEASED
Listing: ACTIVE → SOLD
```

**Implementation** (Requirement 5):
- StatusSynchronizer listens for transaction COMPLETED event
- Checks listing is ACTIVE
- Transitions listing to SOLD
- Records sold_at timestamp and transaction_id

**Code Flow**:
```typescript
onTransactionCompleted(transaction) {
  listing = getListing(transaction.listingId)
  if (listing.status === 'ACTIVE') {
    transitionStatus(listing.id, 'SOLD', {
      transactionId: transaction.id,
      soldAt: now()
    })
  }
}
```

---

### Rule 2: Transaction CANCELLED/REJECTED → Listing ACTIVE

**When**: Transaction is cancelled before payment or rejected by farmer

**What Happens**:
```
Scenario A: Farmer Rejects
Transaction: PENDING → REJECTED
Listing: ACTIVE (stays ACTIVE, no change)

Scenario B: Cancelled Before Payment
Transaction: PENDING/ACCEPTED → CANCELLED
Listing: ACTIVE (stays ACTIVE, no change)

Scenario C: Cancelled After Payment (Mutual)
Transaction: PAYMENT_LOCKED → CANCELLED
Escrow: LOCKED → REFUNDED
Listing: ACTIVE (stays ACTIVE, no change)
```

**Implementation** (Requirement 7):
- StatusSynchronizer listens for CANCELLED/REJECTED events
- If transaction was PENDING or ACCEPTED, listing stays ACTIVE
- If transaction was PAYMENT_LOCKED or later, listing returns to ACTIVE
- Clears transaction_id from listing

**Important**: Check if expiry_date has passed. If yes, transition to EXPIRED instead of ACTIVE.

---

### Rule 3: Escrow REFUNDED (after dispute) → Listing ACTIVE

**When**: Dispute resolved in buyer's favor, funds refunded

**What Happens**:
```
Transaction: IN_TRANSIT → DISPUTED → CANCELLED
Escrow: LOCKED → DISPUTED → REFUNDED
Listing: ACTIVE (reserved) → ACTIVE (available again)
```

**Implementation** (Requirement 7.3):
- StatusSynchronizer listens for escrow REFUNDED event
- Transitions listing back to ACTIVE (if not expired)
- Clears transaction_id
- Listing becomes available for other buyers

---

### Rule 4: Expiry Date Passed → Listing EXPIRED

**When**: Current time exceeds expiry_date (harvest_date + category_expiry_period)

**What Happens**:
```
Listing: ACTIVE → EXPIRED
Transaction: No impact (independent)
Escrow: No impact (independent)
```

**Implementation** (Requirement 4):
- ExpirationService runs hourly cron job
- Queries: `WHERE status='ACTIVE' AND expiry_date < NOW()`
- Transitions matching listings to EXPIRED
- Records expired_at timestamp

**Important**: This happens **independently** of transactions. A listing can expire even if there's an active transaction.

---

### Rule 5: Farmer Cancels → Listing CANCELLED

**When**: Farmer manually cancels the listing

**What Happens**:
```
Listing: ACTIVE → CANCELLED
Transaction: Must NOT have active transaction (PAYMENT_LOCKED or later)
```

**Implementation** (Requirement 8):
- Check if listing has transaction with status >= PAYMENT_LOCKED
- If yes, reject cancellation (funds are locked, transaction must complete)
- If no, allow cancellation
- Records cancelled_at timestamp and cancelled_by user_id

---

## Complete Lifecycle Example

### Scenario 1: Successful Sale

```
Day 1, 10:00 AM - Farmer creates listing
├─ Listing: [*] → ACTIVE
├─ Listing Type: POST_HARVEST
├─ Harvest Date: Day 1, 8:00 AM (2 hours ago)
├─ Category: Fruits (48 hours expiry)
└─ Expiry Date: Day 3, 8:00 AM (harvest + 48h)

Day 1, 2:00 PM - Buyer initiates purchase
├─ Transaction: [*] → PENDING
├─ Listing: ACTIVE (reserved for this buyer)
└─ Escrow: Not created yet

Day 1, 3:00 PM - Farmer accepts
├─ Transaction: PENDING → ACCEPTED
├─ Escrow: [*] → CREATED
└─ Listing: ACTIVE (still reserved)

Day 1, 4:00 PM - Buyer locks payment
├─ Transaction: ACCEPTED → PAYMENT_LOCKED
├─ Escrow: CREATED → FUNDED → LOCKED
└─ Listing: ACTIVE (reserved, cannot be cancelled now)

Day 1, 5:00 PM - Farmer dispatches
├─ Transaction: PAYMENT_LOCKED → DISPATCHED → IN_TRANSIT
├─ Escrow: LOCKED (no change)
└─ Listing: ACTIVE (reserved)

Day 2, 10:00 AM - Buyer confirms delivery
├─ Transaction: IN_TRANSIT → DELIVERED
├─ Escrow: LOCKED (no change)
└─ Listing: ACTIVE (reserved)

Day 2, 10:05 AM - System releases funds
├─ Transaction: DELIVERED → COMPLETED ✅
├─ Escrow: LOCKED → RELEASED ✅
└─ Listing: ACTIVE → SOLD ✅ (synchronized!)

Result: Listing is SOLD, transaction complete, farmer paid
```

---

### Scenario 2: Listing Expires Before Sale

```
Day 1, 10:00 AM - Farmer creates listing
├─ Listing: [*] → ACTIVE
├─ Listing Type: POST_HARVEST
├─ Harvest Date: Day 1, 8:00 AM
├─ Category: Leafy Greens (24 hours expiry)
└─ Expiry Date: Day 2, 8:00 AM (harvest + 24h)

Day 2, 9:00 AM - Expiration cron job runs
├─ Check: expiry_date (Day 2, 8:00 AM) < now (Day 2, 9:00 AM)? YES
├─ Listing: ACTIVE → EXPIRED ✅
└─ Notification sent to farmer

Result: Listing expired, no transaction occurred
```

---

### Scenario 3: Transaction Cancelled, Listing Returns to Active

```
Day 1, 10:00 AM - Farmer creates listing
├─ Listing: [*] → ACTIVE
└─ Expiry Date: Day 3, 10:00 AM

Day 1, 2:00 PM - Buyer initiates purchase
├─ Transaction: [*] → PENDING
└─ Listing: ACTIVE (reserved)

Day 1, 3:00 PM - Farmer accepts
├─ Transaction: PENDING → ACCEPTED
├─ Escrow: [*] → CREATED
└─ Listing: ACTIVE (reserved)

Day 1, 4:00 PM - Buyer changes mind, cancels
├─ Transaction: ACCEPTED → CANCELLED ✅
├─ Escrow: CREATED → (deleted or marked inactive)
└─ Listing: ACTIVE (available again!) ✅

Result: Listing returns to marketplace, available for other buyers
```

---

### Scenario 4: Dispute Resolved with Refund

```
Day 1 - Transaction progresses normally
├─ Listing: ACTIVE
├─ Transaction: PENDING → ACCEPTED → PAYMENT_LOCKED → DISPATCHED → IN_TRANSIT
└─ Escrow: CREATED → FUNDED → LOCKED

Day 2 - Buyer reports issue (produce damaged)
├─ Transaction: IN_TRANSIT → DISPUTED
├─ Escrow: LOCKED → DISPUTED
└─ Listing: ACTIVE (reserved, waiting for resolution)

Day 3 - Admin resolves dispute in buyer's favor
├─ Transaction: DISPUTED → CANCELLED ✅
├─ Escrow: DISPUTED → REFUNDED ✅ (money back to buyer)
└─ Listing: ACTIVE (available again!) ✅

Result: Buyer refunded, listing available for other buyers
```

---

## Synchronization Points Summary

| Event | Listing State Change | Transaction State | Escrow State |
|-------|---------------------|-------------------|--------------|
| Farmer creates listing | [*] → ACTIVE | - | - |
| Buyer initiates purchase | ACTIVE (reserved) | [*] → PENDING | - |
| Farmer accepts | ACTIVE (reserved) | PENDING → ACCEPTED | [*] → CREATED |
| Buyer locks payment | ACTIVE (reserved) | ACCEPTED → PAYMENT_LOCKED | CREATED → FUNDED → LOCKED |
| Farmer dispatches | ACTIVE (reserved) | PAYMENT_LOCKED → DISPATCHED | LOCKED |
| Buyer confirms delivery | ACTIVE (reserved) | IN_TRANSIT → DELIVERED | LOCKED |
| **Funds released** | **ACTIVE → SOLD** ✅ | **DELIVERED → COMPLETED** | **LOCKED → RELEASED** |
| **Transaction cancelled** | **ACTIVE (available)** ✅ | **→ CANCELLED** | **→ REFUNDED** |
| **Transaction rejected** | **ACTIVE (available)** ✅ | **PENDING → REJECTED** | - |
| **Expiry date passed** | **ACTIVE → EXPIRED** ✅ | - | - |
| **Farmer cancels** | **ACTIVE → CANCELLED** ✅ | Must not exist | - |

---

## Key Insights

### 1. **Listing State is Dependent on Transaction State**
- Listing transitions to SOLD only when transaction COMPLETES
- Listing returns to ACTIVE when transaction CANCELLED/REJECTED/REFUNDED
- This is **event-driven synchronization**

### 2. **Listing Expiration is Independent**
- Listing can expire even if there's an active transaction
- Expiration is time-based, not transaction-based
- This is **scheduled/cron-based**

### 3. **Escrow State Drives Transaction State**
- Escrow RELEASED → Transaction COMPLETED
- Escrow REFUNDED → Transaction CANCELLED
- Escrow and Transaction are tightly coupled

### 4. **Listing "Reserved" is Not a State**
- When transaction is PENDING/ACCEPTED/PAYMENT_LOCKED, listing is still ACTIVE
- But it's "reserved" for that buyer (business logic, not a state)
- Other buyers should not be able to purchase (enforced in business logic)

---

## Comparison with state-diagrams.md

### ✅ What's Aligned:

1. **Listing States**: ACTIVE, SOLD, EXPIRED, CANCELLED - ✅ Matches
2. **Transaction States**: All 10 states match - ✅ Matches
3. **Escrow States**: All 6 states match - ✅ Matches
4. **Synchronization Rules**: 
   - Transaction COMPLETED → Listing SOLD ✅
   - Transaction CANCELLED → Listing ACTIVE ✅
   - Expiry date passed → Listing EXPIRED ✅

### ⚠️ What Needs Update in state-diagrams.md:

The state-diagrams.md says:
> "Harvest date passed (automatic)"

But the spec now says:
> "Expiry date passed (harvest_date + category_expiry_period)"

**Action**: Update state-diagrams.md to reflect the new perishability-based expiration model.

---

## Recommendation

The spec is **correctly designed** and follows the right behavior:

1. ✅ Three independent state machines
2. ✅ Event-driven synchronization at specific points
3. ✅ Listing state depends on transaction completion
4. ✅ Expiration is time-based and independent
5. ✅ Proper handling of cancellations and refunds

**Next Step**: Update docs/state-diagrams.md to reflect the perishability-based expiration model (harvest_date + category_expiry_period instead of just harvest_date).
