---
parent_spec: bharat-mandi-main
implements_requirements: [7]
depends_on: [shared/database, features/marketplace]
status: complete
type: feature
code_location: src/features/transactions/
---

# Design Document: Transaction Management

**Parent Spec:** [Bharat Mandi Main Design](../../bharat-mandi-main/design.md)  
**Related Requirements:** [Transaction Requirements](./requirements.md)  
**Depends On:** [Dual Database Design](../../shared/database/design.md), [Marketplace Design](../marketplace/design.md)  
**Code Location:** `src/features/transactions/`  
**Status:** ✅ Complete

## Overview

Transaction management handles the complete purchase lifecycle from request to completion, including escrow account management and payment security.

## Architecture

```
Transaction Controller
    ↓
Transaction Service
    ↓
Database Manager
    ↓
PostgreSQL ←→ SQLite (sync)
```

## Transaction States

1. **pending** - Created, awaiting payment
2. **paid** - Payment deposited in escrow
3. **dispatched** - Produce shipped
4. **delivered** - Produce received
5. **completed** - Transaction finalized

## Escrow States

1. **pending** - Created, awaiting deposit
2. **locked** - Funds deposited and locked
3. **released** - Funds released to farmer
4. **refunded** - Funds returned to buyer

## Data Models

```typescript
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

## Implementation Files

- `transaction.service.ts` - Business logic
- `transaction.controller.ts` - API endpoints
- `transaction.types.ts` - TypeScript interfaces
- `index.ts` - Module exports
