# State Synchronization: Listings, Transactions, and Escrow

> **Related Documentation**: See [State Diagrams](../../shared/state-diagrams.md) for visual state machine diagrams and complete marketplace flow.

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
ACTIVE → SOLD (3 paths):
  1. Transaction COMPLETED (platform escrow) - automatic
  2. Transaction COMPLETED_DIRECT (platform direct payment) - automatic
  3. Farmer marks "Sold" manually (platform direct or external) - manual

ACTIVE → EXPIRED (when expiry date passes)
ACTIVE → CANCELLED (when farmer cancels)
CANCELLED → ACTIVE (when transaction is rejected/refunded)
```

**Purpose**: Track whether produce is available for purchase

**Triggers**:
- **ACTIVE → SOLD (Path 1)**: Transaction reaches COMPLETED state (escrow released)
- **ACTIVE → SOLD (Path 2)**: Transaction reaches COMPLETED_DIRECT state (direct payment confirmed)
- **ACTIVE → SOLD (Path 3)**: Farmer manually marks as sold (external sale or direct payment without transaction)
- **ACTIVE → EXPIRED**: Expiry date (harvest_date + category_expiry_period) passes
- **ACTIVE → CANCELLED**: Farmer manually cancels
- **CANCELLED → ACTIVE**: Transaction is REJECTED or REFUNDED

---

### 2. Transaction States (Already Implemented + New COMPLETED_DIRECT)

```
PENDING → ACCEPTED → PAYMENT_LOCKED → DISPATCHED → IN_TRANSIT → DELIVERED → COMPLETED
         ↓           ↓                  ↓                        ↓
      REJECTED   CANCELLED          CANCELLED                DISPUTED
                     ↓                                           ↓
              COMPLETED_DIRECT                          COMPLETED or CANCELLED
```

**Purpose**: Track the progress of a buyer-farmer transaction

**Key States**:
- **PENDING**: Buyer initiated, waiting for farmer
- **ACCEPTED**: Farmer accepted, escrow created (or direct payment agreed)
- **PAYMENT_LOCKED**: Buyer paid, funds in escrow (escrow flow only)
- **DISPATCHED/IN_TRANSIT**: Goods shipped (escrow flow only)
- **DELIVERED**: Buyer confirmed receipt (escrow flow only)
- **COMPLETED**: Funds released to farmer (escrow flow)
- **COMPLETED_DIRECT**: Direct payment confirmed by farmer (NEW - direct payment flow)
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

### Rule 1A: Transaction COMPLETED_DIRECT → Listing SOLD

**When**: Transaction reaches COMPLETED_DIRECT state (direct payment confirmed by farmer)

**What Happens**:
```
Transaction: ACCEPTED → COMPLETED_DIRECT
Listing: ACTIVE → SOLD (sale_channel = PLATFORM_DIRECT)
```

**Implementation** (Requirement 5, 20):
- StatusSynchronizer listens for transaction COMPLETED_DIRECT event
- Checks listing is ACTIVE
- Transitions listing to SOLD
- Sets sale_channel to 'PLATFORM_DIRECT'
- Records sold_at timestamp and transaction_id

**Code Flow**:
```typescript
onTransactionCompletedDirect(transaction) {
  listing = getListing(transaction.listingId)
  if (listing.status === 'ACTIVE') {
    transitionStatus(listing.id, 'SOLD', {
      transactionId: transaction.id,
      saleChannel: 'PLATFORM_DIRECT',
      soldAt: now()
    })
  }
}
```

---

### Rule 1B: Manual Sale Confirmation → Listing SOLD

**When**: Farmer manually marks listing as sold (external sale or direct payment without transaction)

**What Happens**:
```
Scenario A: Sold via Bharat Mandi (direct payment)
Listing: ACTIVE → SOLD (sale_channel = PLATFORM_DIRECT, transaction_id set)

Scenario B: Sold outside Bharat Mandi
Listing: ACTIVE → SOLD (sale_channel = EXTERNAL, sale_price and sale_notes optional)
```

**Implementation** (Requirement 19):
- Farmer calls markAsSold() API endpoint
- Validates listing is ACTIVE
- Validates no active transaction with PAYMENT_LOCKED or later
- Transitions listing to SOLD
- Records sale_channel, sold_at, and optional details

**Code Flow**:
```typescript
markAsSold(listingId, saleChannel, details) {
  listing = getListing(listingId)
  
  // Validate status
  if (listing.status !== 'ACTIVE') {
    throw Error('Listing must be ACTIVE')
  }
  
  // Check for active transaction
  if (hasActiveTransaction(listingId, 'PAYMENT_LOCKED+')) {
    throw Error('Cannot mark as sold - active transaction exists')
  }
  
  // Transition to SOLD
  transitionStatus(listingId, 'SOLD', {
    saleChannel: saleChannel,
    transactionId: details.transactionId, // if PLATFORM_DIRECT
    salePrice: details.salePrice, // if EXTERNAL
    saleNotes: details.saleNotes, // if EXTERNAL
    soldAt: now(),
    triggeredBy: farmerId,
    triggerType: 'USER'
  })
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

### Scenario 5: Direct Payment Transaction (No Escrow)

```
Day 1, 10:00 AM - Farmer creates listing
├─ Listing: [*] → ACTIVE
├─ Payment Preference: BOTH (accepts escrow or direct)
└─ Expiry Date: Day 3, 10:00 AM

Day 1, 2:00 PM - Buyer initiates purchase
├─ Transaction: [*] → PENDING
└─ Listing: ACTIVE (reserved for this buyer)

Day 1, 3:00 PM - Farmer accepts (direct payment agreed)
├─ Transaction: PENDING → ACCEPTED
├─ Escrow: NOT CREATED (direct payment)
└─ Listing: ACTIVE (reserved)

Day 1, 5:00 PM - Farmer confirms direct payment received
├─ Transaction: ACCEPTED → COMPLETED_DIRECT ✅
└─ Listing: ACTIVE → SOLD (sale_channel = PLATFORM_DIRECT) ✅

Result: Transaction completed with direct payment, no escrow involved
```

---

### Scenario 6: Manual Sale Confirmation (External Sale)

```
Day 1, 10:00 AM - Farmer creates listing on Bharat Mandi
├─ Listing: [*] → ACTIVE
├─ Payment Preference: BOTH
└─ Expiry Date: Day 3, 10:00 AM

Day 1, 2:00 PM - Farmer also lists on another platform

Day 1, 4:00 PM - Buyer purchases on other platform (outside Bharat Mandi)
├─ Sale happens outside the platform
└─ Listing on Bharat Mandi: Still ACTIVE

Day 1, 5:00 PM - Farmer manually marks as sold on Bharat Mandi
├─ Farmer selects "Sold outside Bharat Mandi"
├─ Enters sale price: ₹5000
├─ Enters notes: "Sold on XYZ platform"
└─ Listing: ACTIVE → SOLD (sale_channel = EXTERNAL) ✅

Result: Listing removed from marketplace, platform tracks external sale for analytics
```

---

### Scenario 7: Manual Sale Confirmation Blocked (Active Transaction)

```
Day 1, 10:00 AM - Farmer creates listing
├─ Listing: [*] → ACTIVE
└─ Expiry Date: Day 3, 10:00 AM

Day 1, 2:00 PM - Buyer initiates purchase on Bharat Mandi
├─ Transaction: [*] → PENDING
└─ Listing: ACTIVE (reserved)

Day 1, 3:00 PM - Farmer accepts
├─ Transaction: PENDING → ACCEPTED
├─ Escrow: [*] → CREATED
└─ Listing: ACTIVE (reserved)

Day 1, 4:00 PM - Buyer locks payment
├─ Transaction: ACCEPTED → PAYMENT_LOCKED
├─ Escrow: CREATED → FUNDED → LOCKED
└─ Listing: ACTIVE (reserved, funds locked)

Day 1, 5:00 PM - Farmer tries to mark as sold externally
├─ Farmer: "I sold this elsewhere, let me mark it"
├─ System checks: Active transaction with PAYMENT_LOCKED status
└─ System: ❌ REJECTED - "Cannot mark as sold. Active transaction with locked payment exists."

Result: Manual sale confirmation blocked to protect buyer with locked funds
```


---

## Synchronization Points Summary

| Event | Listing State Change | Transaction State | Escrow State | Sale Channel |
|-------|---------------------|-------------------|--------------|--------------|
| Farmer creates listing | [*] → ACTIVE | - | - | - |
| Buyer initiates purchase | ACTIVE (reserved) | [*] → PENDING | - | - |
| Farmer accepts (escrow) | ACTIVE (reserved) | PENDING → ACCEPTED | [*] → CREATED | - |
| Farmer accepts (direct) | ACTIVE (reserved) | PENDING → ACCEPTED | - | - |
| Buyer locks payment | ACTIVE (reserved) | ACCEPTED → PAYMENT_LOCKED | CREATED → FUNDED → LOCKED | - |
| Farmer dispatches | ACTIVE (reserved) | PAYMENT_LOCKED → DISPATCHED | LOCKED | - |
| Buyer confirms delivery | ACTIVE (reserved) | IN_TRANSIT → DELIVERED | LOCKED | - |
| **Funds released (escrow)** | **ACTIVE → SOLD** ✅ | **DELIVERED → COMPLETED** | **LOCKED → RELEASED** | **PLATFORM_ESCROW** |
| **Direct payment confirmed** | **ACTIVE → SOLD** ✅ | **ACCEPTED → COMPLETED_DIRECT** | - | **PLATFORM_DIRECT** |
| **Farmer marks sold (external)** | **ACTIVE → SOLD** ✅ | - | - | **EXTERNAL** |
| **Transaction cancelled** | **ACTIVE (available)** ✅ | **→ CANCELLED** | **→ REFUNDED** | - |
| **Transaction rejected** | **ACTIVE (available)** ✅ | **PENDING → REJECTED** | - | - |
| **Expiry date passed** | **ACTIVE → EXPIRED** ✅ | - | - | - |
| **Farmer cancels** | **ACTIVE → CANCELLED** ✅ | Must not exist | - | - |

---

## Key Insights

### 1. **Listing State is Dependent on Transaction State (or Manual Confirmation)**
- Listing transitions to SOLD when:
  * Transaction COMPLETES (escrow flow) → sale_channel = PLATFORM_ESCROW
  * Transaction COMPLETED_DIRECT (direct payment) → sale_channel = PLATFORM_DIRECT
  * Farmer manually confirms (external sale) → sale_channel = EXTERNAL
- Listing returns to ACTIVE when transaction CANCELLED/REJECTED/REFUNDED
- This is **event-driven synchronization** (automatic) or **user-driven** (manual)

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
