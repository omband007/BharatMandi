-- RDS Initial Schema Setup
-- Create tables in correct dependency order

-- 1. Users table (no dependencies)
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  phone_number VARCHAR(15) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  user_type VARCHAR(50) NOT NULL,
  location JSONB NOT NULL,
  bank_account JSONB,
  pin_hash VARCHAR(255),
  failed_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP,
  language_preference VARCHAR(10) DEFAULT 'en',
  voice_language_preference VARCHAR(10) DEFAULT 'en',
  recent_languages TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);

-- 2. Produce categories (no dependencies)
CREATE TABLE IF NOT EXISTS produce_categories (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    expiry_period_hours INTEGER NOT NULL CHECK (expiry_period_hours > 0 AND expiry_period_hours <= 8760),
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Enum types
DO $$ BEGIN
    CREATE TYPE listing_status AS ENUM ('ACTIVE', 'SOLD', 'EXPIRED', 'CANCELLED', 'IN_TRANSACTION');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE listing_type AS ENUM ('PRE_HARVEST', 'POST_HARVEST');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_method_preference AS ENUM ('PLATFORM_ONLY', 'DIRECT_ONLY', 'BOTH');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE sale_channel AS ENUM ('PLATFORM', 'EXTERNAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 4. Transactions table (depends on users, but not listings yet)
CREATE TABLE IF NOT EXISTS transactions (
  id VARCHAR(36) PRIMARY KEY,
  listing_id VARCHAR(36),
  farmer_id VARCHAR(36) NOT NULL,
  buyer_id VARCHAR(36) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  dispatched_at TIMESTAMP,
  delivered_at TIMESTAMP,
  completed_at TIMESTAMP,
  FOREIGN KEY (farmer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 5. Listings table (depends on users, produce_categories, transactions)
CREATE TABLE IF NOT EXISTS listings (
  id VARCHAR(36) PRIMARY KEY,
  farmer_id VARCHAR(36) NOT NULL,
  produce_type VARCHAR(255) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  price_per_kg DECIMAL(10,2) NOT NULL,
  certificate_id VARCHAR(36) NOT NULL,
  expected_harvest_date TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status listing_status NOT NULL DEFAULT 'ACTIVE',
  sold_at TIMESTAMP,
  transaction_id VARCHAR(36),
  expired_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  cancelled_by VARCHAR(36),
  listing_type listing_type NOT NULL DEFAULT 'POST_HARVEST',
  produce_category_id VARCHAR(36),
  expiry_date TIMESTAMP NOT NULL,
  payment_method_preference payment_method_preference NOT NULL DEFAULT 'BOTH',
  sale_channel sale_channel,
  sale_price DECIMAL(10,2),
  sale_notes TEXT,
  FOREIGN KEY (farmer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (produce_category_id) REFERENCES produce_categories(id),
  FOREIGN KEY (transaction_id) REFERENCES transactions(id),
  FOREIGN KEY (cancelled_by) REFERENCES users(id)
);

-- Add foreign key from transactions to listings
ALTER TABLE transactions ADD CONSTRAINT fk_transactions_listing 
  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_listings_farmer ON listings(farmer_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);

-- 6. Listing media
CREATE TABLE IF NOT EXISTS listing_media (
  id VARCHAR(36) PRIMARY KEY,
  listing_id VARCHAR(36) NOT NULL,
  media_type VARCHAR(20) NOT NULL CHECK (media_type IN ('photo', 'video', 'document')),
  file_name VARCHAR(255) NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  storage_url TEXT NOT NULL,
  thumbnail_url TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_primary BOOLEAN DEFAULT FALSE,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_listing_media_listing_id ON listing_media(listing_id);

-- 7. Escrow accounts
CREATE TABLE IF NOT EXISTS escrow_accounts (
  id VARCHAR(36) PRIMARY KEY,
  transaction_id VARCHAR(36) UNIQUE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) NOT NULL,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  released_at TIMESTAMP,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
);

-- 8. OTP sessions
CREATE TABLE IF NOT EXISTS otp_sessions (
  id SERIAL PRIMARY KEY,
  phone_number VARCHAR(15) NOT NULL,
  otp VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 9. Sync status
CREATE TABLE IF NOT EXISTS sync_status (
  id SERIAL PRIMARY KEY,
  entity_type VARCHAR(50) UNIQUE NOT NULL,
  last_sync_at TIMESTAMP,
  last_sync_status VARCHAR(20) NOT NULL DEFAULT 'SUCCESS',
  records_synced INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 10. Listing status history
CREATE TABLE IF NOT EXISTS listing_status_history (
    id VARCHAR(36) PRIMARY KEY,
    listing_id VARCHAR(36) NOT NULL,
    previous_status listing_status,
    new_status listing_status NOT NULL,
    changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    triggered_by VARCHAR(255) NOT NULL,
    trigger_type VARCHAR(50) NOT NULL CHECK (trigger_type IN ('USER', 'SYSTEM', 'TRANSACTION')),
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_status_history_listing ON listing_status_history(listing_id, changed_at DESC);
