# Manual Sale Confirmation - Feature Addition

## Overview

This document describes the addition of manual sale confirmation functionality to the enhanced listing status management spec. This feature allows farmers to manually mark listings as SOLD when they sell produce outside the Bharat Mandi platform or through direct payment arrangements.

## Business Context

Bharat Mandi is not the only platform where farmers sell their produce. After listing on Bharat Mandi, farmers may:
- Sell through other platforms
- Sell directly to buyers (outside any platform)
- Sell through Bharat Mandi with direct payment (no escrow)
- Sell through Bharat Mandi with platform escrow

The platform needs to track all sales to understand:
- How many transactions happen outside the platform
- Which payment methods farmers prefer
- Platform adoption and usage metrics

## New Concepts

### 1. Payment Method Preference (Listing Level)

When creating a listing, farmers specify their payment preference:

- **PLATFORM_ONLY** - Only accept transactions through Bharat Mandi escrow
- **DIRECT_ONLY** - Only accept direct payments (outside platform)
- **BOTH** - Accept either platform escrow or direct payment

### 2. Sale Channel (Transaction/Listing Level)

When a sale is completed, track where it happened:

- **PLATFORM_ESCROW** - Completed through Bharat Mandi escrow system
- **PLATFORM_DIRECT** - Completed through Bharat Mandi but with direct payment
- **EXTERNAL** - Sold outside Bharat Mandi (other platform or offline)

### 3. Manual Sale Confirmation

Farmers can manually mark a listing as SOLD by:
1. Selecting "Mark as Sold"
2. Choosing sale channel: "Via Bharat Mandi" or "Outside Bharat Mandi"
3. Optionally providing sale details (price, buyer info, notes)

## State Machine Changes

### Updated Listing States

```
ACTIVE → SOLD (3 paths):
  1. Transaction COMPLETED (platform escrow) - automatic
  2. Farmer marks "Sold via Bharat Mandi" (direct payment) - manual
  3. Farmer marks "Sold outside Bharat Mandi" (external) - manual

ACTIVE → EXPIRED (time-based, automatic)
ACTIVE → CANCELLED (farmer cancels, manual)
```

### New Transaction State

Add **COMPLETED_DIRECT** state for direct payment transactions:

```
PENDING → ACCEPTED → COMPLETED_DIRECT (farmer confirms direct payment)
```

This is separate from the escrow flow:
```
PENDING → ACCEPTED → PAYMENT_LOCKED → ... → COMPLETED (escrow)
```

## Database Schema Changes

### Listings Table - New Fields

```sql
-- Payment method preference
ALTER TABLE listings 
ADD COLUMN payment_method_preference ENUM('PLATFORM_ONLY', 'DIRECT_ONLY', 'BOTH') 
NOT NULL DEFAULT 'BOTH';

-- Sale channel (when sold)
ALTER TABLE listings 
ADD COLUMN sale_channel ENUM('PLATFORM_ESCROW', 'PLATFORM_DIRECT', 'EXTERNAL');

-- Sale details for manual confirmations
ALTER TABLE listings 
ADD COLUMN sale_price DECIMAL(10, 2); -- Actual sale price
ADD COLUMN sale_notes TEXT; -- Optional notes from farmer
```

### Transactions Table - New State

```sql
-- Add COMPLETED_DIRECT to transaction status enum
ALTER TYPE transaction_status ADD VALUE 'COMPLETED_DIRECT';
```

## Requirements Changes

### New Requirement 18: Payment Method Preference

**User Story:** As a farmer, I want to specify my payment preference when creating a listing, so that buyers know how I accept payments.

#### Acceptance Criteria

1. WHEN a farmer creates a listing, THE Listing_Status_Manager SHALL require selection of a payment_method_preference
2. THE Listing_Status_Manager SHALL support three values: PLATFORM_ONLY, DIRECT_ONLY, BOTH
3. THE Listing_Status_Manager SHALL validate that payment_method_preference is one of the three allowed values
4. THE Listing_Status_Manager SHALL store the payment_method_preference in the database
5. THE Listing_Status_Manager SHALL display the payment_method_preference in the listing details
6. WHERE payment_method_preference is PLATFORM_ONLY, THE system SHALL only allow escrow-based transactions
7. WHERE payment_method_preference is DIRECT_ONLY, THE system SHALL only allow direct payment transactions

### New Requirement 19: Manual Sale Confirmation

**User Story:** As a farmer, I want to manually mark my listing as sold when I sell produce outside the platform or through direct payment, so that the listing is removed from the marketplace and I can track all my sales.

#### Acceptance Criteria

1. WHEN a farmer requests to mark a listing as SOLD, THE Listing_Status_Manager SHALL require selection of a sale_channel
2. THE Listing_Status_Manager SHALL support three sale channels: PLATFORM_ESCROW, PLATFORM_DIRECT, EXTERNAL
3. WHERE sale_channel is PLATFORM_DIRECT, THE Listing_Status_Manager SHALL require an associated transaction_id
4. WHERE sale_channel is EXTERNAL, THE Listing_Status_Manager SHALL allow optional sale_price and sale_notes
5. THE Listing_Status_Manager SHALL transition the listing status from ACTIVE to SOLD
6. THE Listing_Status_Manager SHALL record the sold_at timestamp
7. THE Listing_Status_Manager SHALL record the sale_channel in the listing record
8. THE Listing_Status_Manager SHALL create an audit trail entry with trigger_type='USER' and metadata containing sale details
9. IF the listing has an active transaction with status PAYMENT_LOCKED or later, THEN THE Listing_Status_Manager SHALL reject the manual sale confirmation

### New Requirement 20: Direct Payment Transaction Flow

**User Story:** As a farmer, I want to complete a transaction with direct payment (outside escrow), so that I can use Bharat Mandi for discovery while handling payment directly with the buyer.

#### Acceptance Criteria

1. WHEN a farmer accepts a transaction for a listing with payment_method_preference of DIRECT_ONLY or BOTH, THE Transaction_Service SHALL allow marking the transaction as COMPLETED_DIRECT
2. THE Transaction_Service SHALL skip the PAYMENT_LOCKED, DISPATCHED, IN_TRANSIT, DELIVERED states for direct payment transactions
3. THE Transaction_Service SHALL transition directly from ACCEPTED to COMPLETED_DIRECT
4. WHEN a transaction reaches COMPLETED_DIRECT state, THE Status_Synchronizer SHALL transition the listing to SOLD with sale_channel='PLATFORM_DIRECT'
5. THE Transaction_Service SHALL record the transaction_id in the listing record
6. THE Transaction_Service SHALL record the completed_at timestamp

### Updated Requirement 5: Transaction Completion Synchronization

**Modified Acceptance Criteria:**

1. WHEN a Transaction_State transitions to COMPLETED **or COMPLETED_DIRECT**, THE Status_Synchronizer SHALL transition the associated listing status from ACTIVE to SOLD
2. WHERE Transaction_State is COMPLETED, THE Status_Synchronizer SHALL set sale_channel to 'PLATFORM_ESCROW'
3. WHERE Transaction_State is COMPLETED_DIRECT, THE Status_Synchronizer SHALL set sale_channel to 'PLATFORM_DIRECT'
4. THE Status_Synchronizer SHALL update the listing status within 5 seconds of transaction completion
5. THE Status_Synchronizer SHALL record the transaction ID in the listing record
6. THE Status_Synchronizer SHALL record the sold timestamp in the listing record
7. IF the listing status is not ACTIVE when the transaction completes, THEN THE Status_Synchronizer SHALL log a warning and not change the status

### New Requirement 21: Sales Analytics by Channel

**User Story:** As a marketplace analyst, I want to track sales by channel, so that I can understand platform adoption and identify opportunities for growth.

#### Acceptance Criteria

1. THE Listing_Status_Manager SHALL provide a count of SOLD listings grouped by sale_channel
2. THE Listing_Status_Manager SHALL calculate the percentage of sales through each channel
3. THE Listing_Status_Manager SHALL provide the total revenue for PLATFORM_ESCROW sales (from transaction data)
4. THE Listing_Status_Manager SHALL provide the total reported revenue for EXTERNAL sales (from sale_price field)
5. THE Listing_Status_Manager SHALL calculate these metrics for a specified date range

## API Changes

### POST /api/marketplace/listings - Create Listing

**New Request Field:**
```typescript
{
  // ... existing fields
  payment_method_preference: 'PLATFORM_ONLY' | 'DIRECT_ONLY' | 'BOTH'
}
```

### POST /api/marketplace/listings/:id/mark-sold - New Endpoint

**Request:**
```typescript
{
  sale_channel: 'PLATFORM_DIRECT' | 'EXTERNAL',
  transaction_id?: string, // Required if sale_channel is PLATFORM_DIRECT
  sale_price?: number, // Optional for EXTERNAL
  sale_notes?: string // Optional for EXTERNAL
}
```

**Response:**
```typescript
{
  listing: {
    id: string,
    status: 'SOLD',
    sold_at: string, // ISO 8601
    sale_channel: 'PLATFORM_DIRECT' | 'EXTERNAL',
    sale_price?: number,
    sale_notes?: string,
    transaction_id?: string
  }
}
```

### PUT /api/transactions/:id/complete-direct - New Endpoint

**Request:**
```typescript
{
  // Optional confirmation details
  notes?: string
}
```

**Response:**
```typescript
{
  transaction: {
    id: string,
    status: 'COMPLETED_DIRECT',
    completed_at: string, // ISO 8601
    listing_id: string
  }
}
```

### GET /api/marketplace/analytics/sales-by-channel - New Endpoint

**Response:**
```typescript
{
  total_sales: number,
  by_channel: {
    PLATFORM_ESCROW: {
      count: number,
      percentage: number,
      total_revenue: number
    },
    PLATFORM_DIRECT: {
      count: number,
      percentage: number
    },
    EXTERNAL: {
      count: number,
      percentage: number,
      reported_revenue: number // From sale_price field
    }
  },
  date_range: {
    start: string,
    end: string
  }
}
```

## UI Changes

### Listing Creation Form

Add payment preference selector:
```
Payment Method Preference:
○ Platform Escrow Only (secure payment through Bharat Mandi)
○ Direct Payment Only (settle payment directly with buyer)
● Both (accept either method) [default]
```

### Listing Detail Page (Farmer View)

Add "Mark as Sold" button with modal:
```
Mark Listing as Sold
-------------------
Where did you sell this produce?

○ Via Bharat Mandi (direct payment with buyer)
  [Select Transaction] (dropdown of ACCEPTED transactions)

○ Outside Bharat Mandi (other platform or offline)
  Sale Price (optional): [____] ₹
  Notes (optional): [________________]

[Cancel] [Confirm Sale]
```

### Transaction Detail Page

For direct payment transactions, show:
```
Transaction Status: Accepted
Payment Method: Direct Payment

[Mark as Completed] button
```

### Analytics Dashboard

Add new chart:
```
Sales by Channel
----------------
Platform Escrow: 45% (120 sales, ₹2.4L revenue)
Platform Direct: 30% (80 sales)
External: 25% (65 sales, ₹1.1L reported)
```

## Implementation Impact

### New Tasks to Add

1. **Database Schema Updates**
   - Add payment_method_preference, sale_channel, sale_price, sale_notes to listings table
   - Add COMPLETED_DIRECT to transaction_status enum
   - Create indexes for sale_channel queries

2. **Service Layer**
   - Update ListingStatusManager.markAsSold() to accept sale_channel and details
   - Add TransactionService.completeDirectPayment() method
   - Update StatusSynchronizer to handle COMPLETED_DIRECT state
   - Add SalesAnalyticsService for channel-based reporting

3. **API Endpoints**
   - POST /api/marketplace/listings/:id/mark-sold
   - PUT /api/transactions/:id/complete-direct
   - GET /api/marketplace/analytics/sales-by-channel
   - Update POST /api/marketplace/listings to include payment_method_preference

4. **Frontend Components**
   - Payment preference selector in listing creation form
   - "Mark as Sold" modal with channel selection
   - "Complete Direct Payment" button in transaction view
   - Sales by channel analytics chart

5. **Testing**
   - Property test: Manual sale confirmation always transitions to SOLD
   - Property test: COMPLETED_DIRECT transactions always mark listing as SOLD
   - Unit tests for all new service methods
   - Integration tests for new API endpoints

## Migration Strategy

For existing listings:
- Set payment_method_preference to 'BOTH' (most permissive)
- Set sale_channel to 'PLATFORM_ESCROW' for listings with transaction_id
- Leave sale_channel NULL for other SOLD listings (unknown channel)

## Analytics Value

This feature enables tracking:
1. **Platform adoption rate** - % of sales through platform escrow
2. **Direct payment preference** - % of farmers choosing direct payment
3. **External competition** - % of sales happening outside the platform
4. **Revenue opportunity** - Potential revenue if external sales moved to platform

## Next Steps

1. Review and approve this feature addition
2. Update requirements.md with new requirements (18, 19, 20, 21)
3. Update design.md with new database schema and service methods
4. Update tasks.md with new implementation tasks
5. Update STATE-SYNCHRONIZATION.md with new flows
6. Update state-diagrams.md with manual sale confirmation paths
