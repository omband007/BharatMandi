-- ============================================================================
-- Migration 005: Consolidate User Tables
-- ============================================================================
-- Purpose: Complete PostgreSQL migration by consolidating all user references
--          to the user_profiles table and removing the legacy users table.
--
-- Changes:
-- 1. Drop all foreign key constraints that reference users(id)
-- 2. Add new foreign key constraints that reference user_profiles(user_id)
-- 3. Drop the legacy users table
--
-- NOTE: The actual database uses VARCHAR for IDs, not UUID as in schema.sql
--
-- Date: March 3, 2026
-- ============================================================================

BEGIN;

-- ============================================================================
-- Step 1: Drop Foreign Key Constraints Referencing users(id)
-- ============================================================================

-- Listings table
ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_farmer_id_fkey;

-- Transactions table
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_farmer_id_fkey;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_buyer_id_fkey;

-- Credibility scores table
ALTER TABLE credibility_scores DROP CONSTRAINT IF EXISTS credibility_scores_farmer_id_fkey;

-- Storage bookings table
ALTER TABLE storage_bookings DROP CONSTRAINT IF EXISTS storage_bookings_farmer_id_fkey;

-- Auction listings table
ALTER TABLE auction_listings DROP CONSTRAINT IF EXISTS auction_listings_farmer_id_fkey;
ALTER TABLE auction_listings DROP CONSTRAINT IF EXISTS auction_listings_current_highest_bidder_fkey;

-- Bids table
ALTER TABLE bids DROP CONSTRAINT IF EXISTS bids_bidder_id_fkey;

-- Scheme applications table
ALTER TABLE scheme_applications DROP CONSTRAINT IF EXISTS scheme_applications_farmer_id_fkey;

-- Ratings table
ALTER TABLE ratings DROP CONSTRAINT IF EXISTS ratings_from_user_id_fkey;
ALTER TABLE ratings DROP CONSTRAINT IF EXISTS ratings_to_user_id_fkey;

-- Disputes table
ALTER TABLE disputes DROP CONSTRAINT IF EXISTS disputes_initiated_by_fkey;

-- Dispute evidence table
ALTER TABLE dispute_evidence DROP CONSTRAINT IF EXISTS dispute_evidence_user_id_fkey;

-- ============================================================================
-- Step 2: Convert UUID Columns to VARCHAR to Match user_profiles.user_id
-- ============================================================================

-- Auction listings table
ALTER TABLE auction_listings ALTER COLUMN farmer_id TYPE VARCHAR(255) USING farmer_id::VARCHAR;
ALTER TABLE auction_listings ALTER COLUMN current_highest_bidder TYPE VARCHAR(255) USING current_highest_bidder::VARCHAR;

-- Bids table
ALTER TABLE bids ALTER COLUMN bidder_id TYPE VARCHAR(255) USING bidder_id::VARCHAR;

-- Credibility scores table
ALTER TABLE credibility_scores ALTER COLUMN farmer_id TYPE VARCHAR(255) USING farmer_id::VARCHAR;

-- Dispute evidence table
ALTER TABLE dispute_evidence ALTER COLUMN user_id TYPE VARCHAR(255) USING user_id::VARCHAR;

-- Disputes table
ALTER TABLE disputes ALTER COLUMN initiated_by TYPE VARCHAR(255) USING initiated_by::VARCHAR;

-- Ratings table
ALTER TABLE ratings ALTER COLUMN from_user_id TYPE VARCHAR(255) USING from_user_id::VARCHAR;
ALTER TABLE ratings ALTER COLUMN to_user_id TYPE VARCHAR(255) USING to_user_id::VARCHAR;

-- Scheme applications table
ALTER TABLE scheme_applications ALTER COLUMN farmer_id TYPE VARCHAR(255) USING farmer_id::VARCHAR;

-- Storage bookings table
ALTER TABLE storage_bookings ALTER COLUMN farmer_id TYPE VARCHAR(255) USING farmer_id::VARCHAR;

-- ============================================================================
-- Step 3: Add Foreign Key Constraints Referencing user_profiles(user_id)
-- ============================================================================

-- Listings table (farmer_id is VARCHAR, user_id is VARCHAR(255))
ALTER TABLE listings 
  ADD CONSTRAINT listings_farmer_id_fkey 
  FOREIGN KEY (farmer_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE;

-- Transactions table
ALTER TABLE transactions 
  ADD CONSTRAINT transactions_farmer_id_fkey 
  FOREIGN KEY (farmer_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE;

ALTER TABLE transactions 
  ADD CONSTRAINT transactions_buyer_id_fkey 
  FOREIGN KEY (buyer_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE;

-- Credibility scores table
ALTER TABLE credibility_scores 
  ADD CONSTRAINT credibility_scores_farmer_id_fkey 
  FOREIGN KEY (farmer_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE;

-- Storage bookings table
ALTER TABLE storage_bookings 
  ADD CONSTRAINT storage_bookings_farmer_id_fkey 
  FOREIGN KEY (farmer_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE;

-- Auction listings table
ALTER TABLE auction_listings 
  ADD CONSTRAINT auction_listings_farmer_id_fkey 
  FOREIGN KEY (farmer_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE;

ALTER TABLE auction_listings 
  ADD CONSTRAINT auction_listings_current_highest_bidder_fkey 
  FOREIGN KEY (current_highest_bidder) REFERENCES user_profiles(user_id) ON DELETE SET NULL;

-- Bids table
ALTER TABLE bids 
  ADD CONSTRAINT bids_bidder_id_fkey 
  FOREIGN KEY (bidder_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE;

-- Scheme applications table
ALTER TABLE scheme_applications 
  ADD CONSTRAINT scheme_applications_farmer_id_fkey 
  FOREIGN KEY (farmer_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE;

-- Ratings table
ALTER TABLE ratings 
  ADD CONSTRAINT ratings_from_user_id_fkey 
  FOREIGN KEY (from_user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE;

ALTER TABLE ratings 
  ADD CONSTRAINT ratings_to_user_id_fkey 
  FOREIGN KEY (to_user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE;

-- Disputes table
ALTER TABLE disputes 
  ADD CONSTRAINT disputes_initiated_by_fkey 
  FOREIGN KEY (initiated_by) REFERENCES user_profiles(user_id) ON DELETE CASCADE;

-- Dispute evidence table
ALTER TABLE dispute_evidence 
  ADD CONSTRAINT dispute_evidence_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE;

-- ============================================================================
-- Step 4: Drop Legacy users Table
-- ============================================================================

DROP TABLE IF EXISTS users CASCADE;

-- ============================================================================
-- Verification Queries (commented out - run manually to verify)
-- ============================================================================

-- Verify users table is dropped
-- SELECT table_name FROM information_schema.tables WHERE table_name = 'users';

-- Verify foreign key constraints reference user_profiles
-- SELECT 
--   tc.table_name, 
--   tc.constraint_name, 
--   kcu.column_name,
--   ccu.table_name AS foreign_table_name,
--   ccu.column_name AS foreign_column_name 
-- FROM information_schema.table_constraints AS tc 
-- JOIN information_schema.key_column_usage AS kcu
--   ON tc.constraint_name = kcu.constraint_name
-- JOIN information_schema.constraint_column_usage AS ccu
--   ON ccu.constraint_name = tc.constraint_name
-- WHERE tc.constraint_type = 'FOREIGN KEY' 
--   AND ccu.table_name = 'user_profiles';

COMMIT;
