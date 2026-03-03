# Database Schema Consolidation - Implementation Ready

## Summary

The database schema consolidation is ready for implementation. All migration scripts and schema updates have been created to consolidate user references from the legacy `users` table to the new `user_profiles` table.

## What Was Done

### 1. Migration Script Created ✅
**File**: `src/shared/database/migrations/005_consolidate_user_tables.sql`

This script:
- Drops all foreign key constraints that reference `users(id)`
- Adds new foreign key constraints that reference `user_profiles(user_id)`
- Drops the legacy `users` table
- All operations wrapped in a transaction for atomicity

**Tables Updated:**
- listings
- transactions
- credibility_scores
- storage_bookings
- auction_listings
- bids
- scheme_applications
- ratings
- disputes
- dispute_evidence

### 2. Schema.sql Updated ✅
**File**: `src/shared/database/schema.sql`

Changes:
- Removed the `users` table definition entirely
- Updated all foreign key references to point to `user_profiles(user_id)`
- Removed the `update_users_updated_at` trigger (no longer needed)
- Added comment explaining the consolidated design

## Next Steps - Execute the Migration

### Step 1: Backup Your Database
```bash
# Backup PostgreSQL database
pg_dump -U your_username -d bharat_mandi > backup_before_migration.sql
```

### Step 2: Run the Migration
```bash
# Connect to PostgreSQL
psql -U your_username -d bharat_mandi

# Run the migration script
\i src/shared/database/migrations/005_consolidate_user_tables.sql
```

### Step 3: Verify the Migration
```sql
-- Verify users table is dropped
SELECT table_name FROM information_schema.tables WHERE table_name = 'users';
-- Should return 0 rows

-- Verify foreign key constraints reference user_profiles
SELECT 
  tc.table_name, 
  tc.constraint_name, 
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND ccu.table_name = 'user_profiles';
-- Should show all the foreign keys we created
```

### Step 4: Test User Registration
```bash
# Register a new user
curl -X POST http://localhost:3000/api/v1/profiles/register \
  -H "Content-Type: application/json" \
  -d '{"mobileNumber": "+919876543210"}'

# Verify OTP with mandatory fields
curl -X POST http://localhost:3000/api/v1/profiles/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "+919876543210",
    "otp": "123456",
    "name": "Test User",
    "userType": "farmer",
    "location": {
      "type": "gps",
      "latitude": 28.6139,
      "longitude": 77.2090
    }
  }'
```

### Step 5: Test Listing Creation
```bash
# Create a listing (use the token from registration)
curl -X POST http://localhost:3000/api/v1/marketplace/listings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "produceType": "Tomatoes",
    "quantity": 100,
    "pricePerKg": 25,
    "certificateId": ""
  }'
```

### Step 6: Verify in Database
```sql
-- Check user_profiles table
SELECT user_id, name, mobile_number, user_type FROM user_profiles;

-- Check listings table
SELECT id, farmer_id, produce_type, quantity FROM listings;

-- Verify foreign key relationship
SELECT 
  l.id as listing_id,
  l.produce_type,
  up.name as farmer_name,
  up.mobile_number
FROM listings l
JOIN user_profiles up ON l.farmer_id = up.user_id;
```

## Expected Results

After successful migration:

1. ✅ `users` table no longer exists
2. ✅ All foreign keys reference `user_profiles(user_id)`
3. ✅ User registration creates entries only in `user_profiles`
4. ✅ Listing creation succeeds without foreign key errors
5. ✅ Listings are stored in PostgreSQL (not falling back to SQLite)
6. ✅ All existing profile operations continue to work

## Rollback Plan

If something goes wrong:

```bash
# Restore from backup
psql -U your_username -d bharat_mandi < backup_before_migration.sql
```

## Tasks Remaining

The following tasks in `tasks.md` need to be executed:

- [ ] 3. Test migration on development database
- [ ] 4. Test user registration after migration
- [ ] 5. Test listing creation after migration
- [ ] 6. Test other operations with foreign key references
- [ ] 7. Test foreign key constraint enforcement
- [ ] 8. Test preservation of existing functionality
- [ ] 9. Update documentation
- [ ] 10. Checkpoint - Ensure all tests pass

## Notes

- Since you mentioned test data isn't important, we can do a clean migration without data preservation
- The migration is atomic (wrapped in a transaction), so it either fully succeeds or fully rolls back
- All foreign key constraints use `ON DELETE CASCADE` to maintain referential integrity
- The `user_profiles` table is managed by Sequelize and already exists with all necessary fields

## Date
March 3, 2026
