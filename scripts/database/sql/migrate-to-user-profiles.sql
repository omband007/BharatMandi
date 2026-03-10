-- Migration: Replace users table references with user_profiles
-- This script updates all foreign key constraints to point to user_profiles instead of users

BEGIN;

-- Step 1: Drop existing foreign key constraints on listings table
ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_farmer_id_fkey;
ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_cancelled_by_fkey;

-- Step 2: Add new foreign key constraints pointing to user_profiles
ALTER TABLE listings 
  ADD CONSTRAINT listings_farmer_id_fkey 
  FOREIGN KEY (farmer_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE;

ALTER TABLE listings 
  ADD CONSTRAINT listings_cancelled_by_fkey 
  FOREIGN KEY (cancelled_by) REFERENCES user_profiles(user_id);

-- Step 3: Check if transactions table has user references
-- Drop and recreate foreign keys for transactions if they exist
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_buyer_id_fkey;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_farmer_id_fkey;

ALTER TABLE transactions 
  ADD CONSTRAINT transactions_buyer_id_fkey 
  FOREIGN KEY (buyer_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE;

ALTER TABLE transactions 
  ADD CONSTRAINT transactions_farmer_id_fkey 
  FOREIGN KEY (farmer_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE;

-- Step 4: Verify the changes
SELECT 
  tc.table_name, 
  tc.constraint_name, 
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND (tc.table_name = 'listings' OR tc.table_name = 'transactions')
  AND (ccu.table_name = 'users' OR ccu.table_name = 'user_profiles')
ORDER BY tc.table_name, tc.constraint_name;

COMMIT;
