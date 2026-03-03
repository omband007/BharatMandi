# Database Schema Consolidation - Bugfix Design

## Overview

This bugfix completes the PostgreSQL migration by consolidating all user references to the `user_profiles` table. The system is currently in a transitional state where user registration creates entries in `user_profiles` (via Sequelize), but legacy tables still reference the old `users` table via foreign key constraints. This causes foreign key violations when users create listings, transactions, or other operations.

The fix updates all foreign key constraints to reference `user_profiles(user_id)` instead of `users(id)`, then drops the legacy `users` table. This is a clean architectural solution that eliminates dual-table complexity and completes the migration started in the user-profile-management spec.

## Glossary

- **user_profiles**: The new, comprehensive user table managed by Sequelize with 30+ fields (gamification, privacy, trust scores, etc.)
- **users**: The legacy user table with basic fields (id, name, phone, type, location) - TO BE REMOVED
- **Foreign Key Migration**: Updating all foreign key constraints to reference `user_profiles(user_id)` instead of `users(id)`
- **Schema Consolidation**: Eliminating the dual-table architecture by migrating to a single source of truth
- **user_id**: The primary key in `user_profiles` table (UUID format)
- **farmer_id/buyer_id**: Foreign key columns in other tables that currently reference `users(id)` - will be updated to reference `user_profiles(user_id)`

## Bug Details

### Fault Condition

The bug manifests when a user completes registration through the profile registration flow. The `createInitialProfile()` method creates an entry in the `user_profiles` table using Sequelize's `UserProfileModel.create()`, but does not create a corresponding entry in the legacy `users` table. When the user later attempts to create a listing, PostgreSQL rejects the insert operation because `listings.farmer_id` references `users(id)`, and no matching user exists in the `users` table.

**Affected Tables with Foreign Keys to `users(id)`:**
- `listings` - farmer_id references users(id)
- `transactions` - farmer_id, buyer_id reference users(id)
- `credibility_scores` - farmer_id references users(id)
- `storage_bookings` - farmer_id references users(id)
- `auction_listings` - farmer_id, current_highest_bidder reference users(id)
- `bids` - bidder_id references users(id)
- `scheme_applications` - farmer_id references users(id)
- `ratings` - from_user_id, to_user_id reference users(id)
- `disputes` - initiated_by references users(id)
- `dispute_evidence` - user_id references users(id)

### Root Cause

The system is in an incomplete migration state:
1. **New registration flow** uses `user_profiles` table (Sequelize)
2. **Legacy schema** still has `users` table with foreign key constraints
3. **No bridge** exists between the two tables during registration
4. **Foreign keys** in other tables still point to the old `users` table

This was an incomplete migration from the user-profile-management spec where the new `user_profiles` table was created but the foreign key migration was not completed.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- User registration flow must continue to collect mobile number, name, userType, and location data exactly as before
- UserProfile object creation must continue to include all fields: gamification data, privacy settings, authentication fields, and metadata
- Profile completionPercentage calculation must remain at 40% for mandatory fields
- OTP verification flow must remain unchanged
- All existing profile service methods must continue to work without modification

**Scope:**
All registration inputs and profile operations should be completely unaffected by this fix. The only changes are to the database schema (foreign key constraints) and the removal of the unused `users` table.

## Hypothesized Root Cause

The root cause is an incomplete database migration:

1. **Partial Migration**: The user-profile-management spec created the new `user_profiles` table and migrated registration to use it, but did not update foreign key constraints in other tables

2. **Legacy References**: All marketplace, transaction, and other feature tables still reference the old `users(id)` column via foreign keys

3. **No Cleanup**: The legacy `users` table was never dropped after the migration, leaving the system in a dual-table state

4. **Missing Migration Script**: No database migration script was created to update foreign key constraints from `users(id)` to `user_profiles(user_id)`

## Correctness Properties

Property 1: Fault Condition - Single Table User References

_For any_ user registration where a user completes registration with valid mobile number, name, userType, and location data, the system SHALL create an entry in the `user_profiles` table, and all subsequent operations (listings, transactions, etc.) SHALL successfully reference that user via `user_profiles(user_id)` without foreign key constraint violations.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

Property 2: Preservation - Existing Registration Data Structure

_For any_ registration input, the system SHALL produce exactly the same UserProfile object structure as before the fix, preserving all fields including gamification data, privacy settings, authentication fields, and metadata with identical values and completionPercentage calculation.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

## Fix Implementation

### Changes Required

The fix requires updating the PostgreSQL schema to consolidate on `user_profiles` as the single source of truth.

**Files to Modify:**
1. `src/shared/database/schema.sql` - Update foreign key constraints
2. Create migration script: `src/shared/database/migrations/005_consolidate_user_tables.sql`

**Migration Steps:**

1. **Update Foreign Key Constraints** - Modify all tables to reference `user_profiles(user_id)` instead of `users(id)`:

```sql
-- Drop existing foreign key constraints
ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_farmer_id_fkey;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_farmer_id_fkey;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_buyer_id_fkey;
ALTER TABLE credibility_scores DROP CONSTRAINT IF EXISTS credibility_scores_farmer_id_fkey;
ALTER TABLE storage_bookings DROP CONSTRAINT IF EXISTS storage_bookings_farmer_id_fkey;
ALTER TABLE auction_listings DROP CONSTRAINT IF EXISTS auction_listings_farmer_id_fkey;
ALTER TABLE auction_listings DROP CONSTRAINT IF EXISTS auction_listings_current_highest_bidder_fkey;
ALTER TABLE bids DROP CONSTRAINT IF EXISTS bids_bidder_id_fkey;
ALTER TABLE scheme_applications DROP CONSTRAINT IF EXISTS scheme_applications_farmer_id_fkey;
ALTER TABLE ratings DROP CONSTRAINT IF EXISTS ratings_from_user_id_fkey;
ALTER TABLE ratings DROP CONSTRAINT IF EXISTS ratings_to_user_id_fkey;
ALTER TABLE disputes DROP CONSTRAINT IF EXISTS disputes_initiated_by_fkey;
ALTER TABLE dispute_evidence DROP CONSTRAINT IF EXISTS dispute_evidence_user_id_fkey;

-- Add new foreign key constraints referencing user_profiles
ALTER TABLE listings 
  ADD CONSTRAINT listings_farmer_id_fkey 
  FOREIGN KEY (farmer_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE;

ALTER TABLE transactions 
  ADD CONSTRAINT transactions_farmer_id_fkey 
  FOREIGN KEY (farmer_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE;

ALTER TABLE transactions 
  ADD CONSTRAINT transactions_buyer_id_fkey 
  FOREIGN KEY (buyer_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE;

ALTER TABLE credibility_scores 
  ADD CONSTRAINT credibility_scores_farmer_id_fkey 
  FOREIGN KEY (farmer_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE;

ALTER TABLE storage_bookings 
  ADD CONSTRAINT storage_bookings_farmer_id_fkey 
  FOREIGN KEY (farmer_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE;

ALTER TABLE auction_listings 
  ADD CONSTRAINT auction_listings_farmer_id_fkey 
  FOREIGN KEY (farmer_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE;

ALTER TABLE auction_listings 
  ADD CONSTRAINT auction_listings_current_highest_bidder_fkey 
  FOREIGN KEY (current_highest_bidder) REFERENCES user_profiles(user_id) ON DELETE SET NULL;

ALTER TABLE bids 
  ADD CONSTRAINT bids_bidder_id_fkey 
  FOREIGN KEY (bidder_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE;

ALTER TABLE scheme_applications 
  ADD CONSTRAINT scheme_applications_farmer_id_fkey 
  FOREIGN KEY (farmer_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE;

ALTER TABLE ratings 
  ADD CONSTRAINT ratings_from_user_id_fkey 
  FOREIGN KEY (from_user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE;

ALTER TABLE ratings 
  ADD CONSTRAINT ratings_to_user_id_fkey 
  FOREIGN KEY (to_user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE;

ALTER TABLE disputes 
  ADD CONSTRAINT disputes_initiated_by_fkey 
  FOREIGN KEY (initiated_by) REFERENCES user_profiles(user_id) ON DELETE CASCADE;

ALTER TABLE dispute_evidence 
  ADD CONSTRAINT dispute_evidence_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE;
```

2. **Drop Legacy Users Table** - Remove the unused `users` table:

```sql
-- Drop the legacy users table (no longer needed)
DROP TABLE IF EXISTS users CASCADE;
```

3. **Update schema.sql** - Remove the `users` table definition and update all foreign key references in the schema file

### Implementation Pseudocode

```
MIGRATION SCRIPT: 005_consolidate_user_tables.sql

BEGIN TRANSACTION;

-- Step 1: Drop all foreign key constraints referencing users(id)
FOR EACH table WITH foreign_key TO users(id) DO
  DROP CONSTRAINT foreign_key_name
END FOR

-- Step 2: Add new foreign key constraints referencing user_profiles(user_id)
FOR EACH table THAT referenced users(id) DO
  ADD CONSTRAINT new_foreign_key_name 
  FOREIGN KEY (column_name) REFERENCES user_profiles(user_id) ON DELETE CASCADE
END FOR

-- Step 3: Drop the legacy users table
DROP TABLE users CASCADE;

COMMIT;
```

## Testing Strategy

### Validation Approach

The testing strategy verifies that: (1) user registration creates entries only in `user_profiles`, (2) listing creation succeeds with foreign key references to `user_profiles(user_id)`, and (3) all existing profile operations continue to work unchanged.

### Exploratory Fault Condition Checking

**Goal**: Verify that after the migration, user registration creates entries only in `user_profiles` and listing creation succeeds without foreign key violations.

**Test Plan**: 
1. Run the migration script on a test database
2. Register a new user
3. Verify entry exists in `user_profiles` table
4. Verify `users` table no longer exists
5. Create a listing for the new user
6. Verify listing creation succeeds without foreign key errors

**Test Cases**:
1. **User Registration**: Register a new user, verify entry in `user_profiles`, verify no `users` table
2. **Listing Creation**: Create a listing, verify `farmer_id` references `user_profiles(user_id)` successfully
3. **Transaction Creation**: Create a transaction, verify `farmer_id` and `buyer_id` reference `user_profiles(user_id)` successfully
4. **Foreign Key Validation**: Attempt to create a listing with invalid `farmer_id`, verify foreign key constraint error

**Expected Outcomes**:
- User registration creates entry in `user_profiles` only
- Listing creation succeeds with `farmer_id` referencing `user_profiles(user_id)`
- All foreign key constraints enforce referential integrity to `user_profiles`
- No foreign key violations occur during normal operations

### Preservation Checking

**Goal**: Verify that user registration produces the same UserProfile object structure as before the migration.

**Pseudocode:**
```
FOR ALL registrationData WHERE isValidRegistration(registrationData) DO
  // Run registration after migration
  actualProfile := createInitialProfile(registrationData)
  
  // Verify all UserProfile fields match expected structure
  ASSERT actualProfile.userId IS UUID
  ASSERT actualProfile.mobileNumber IS E164_FORMAT
  ASSERT actualProfile.name = registrationData.name
  ASSERT actualProfile.userType = registrationData.userType
  ASSERT actualProfile.location = registrationData.location
  ASSERT actualProfile.completionPercentage = 40
  ASSERT actualProfile.points.current = 0
  ASSERT actualProfile.membershipTier = 'bronze'
  ASSERT actualProfile.trustScore = 500
  ASSERT actualProfile.referralCode IS NOT NULL
  ASSERT actualProfile.privacySettings = DEFAULT_PRIVACY_SETTINGS
END FOR
```

### Unit Tests

- Test migration script runs without errors
- Test foreign key constraints are correctly updated
- Test `users` table is dropped
- Test listing creation with valid `farmer_id`
- Test transaction creation with valid `farmer_id` and `buyer_id`
- Test foreign key constraint violations with invalid user IDs

### Integration Tests

- Test full user registration flow after migration
- Test listing creation immediately after registration
- Test transaction creation with registered users
- Test all operations that reference user data (credibility scores, storage bookings, auctions, etc.)
- Test data consistency across all tables after migration
