-- Migration: Add IN_TRANSACTION status to listing_status enum
-- This allows listings to be marked as reserved during active transactions

-- Add IN_TRANSACTION to the listing_status enum
ALTER TYPE listing_status ADD VALUE IF NOT EXISTS 'IN_TRANSACTION';

-- Note: The new value will be added after existing values
-- Enum order will be: ACTIVE, SOLD, EXPIRED, CANCELLED, IN_TRANSACTION
