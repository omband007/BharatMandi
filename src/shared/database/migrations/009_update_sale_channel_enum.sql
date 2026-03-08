-- Migration 008: Update sale_channel enum to simplified values
-- This migration updates the sale_channel enum from 3 values to 2 values

-- Step 1: Drop the constraint and convert column to TEXT temporarily
ALTER TABLE listings 
  ALTER COLUMN sale_channel TYPE TEXT;

-- Step 2: Update existing data to new values
UPDATE listings 
SET sale_channel = 'PLATFORM' 
WHERE sale_channel IN ('PLATFORM_ESCROW', 'PLATFORM_DIRECT');

-- Step 3: Drop the old enum type
DROP TYPE IF EXISTS sale_channel CASCADE;

-- Step 4: Create new enum type with simplified values
CREATE TYPE sale_channel AS ENUM ('PLATFORM', 'EXTERNAL');

-- Step 5: Convert column back to enum type
ALTER TABLE listings 
  ALTER COLUMN sale_channel TYPE sale_channel 
  USING sale_channel::sale_channel;

-- Update comment
COMMENT ON COLUMN listings.sale_channel IS 'How listing was sold: PLATFORM or EXTERNAL';
