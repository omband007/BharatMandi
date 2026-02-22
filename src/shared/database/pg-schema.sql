-- PostgreSQL Schema for Bharat Mandi Application
-- Dual Database Architecture: PostgreSQL as Primary Database

-- Users table
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
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- OTP sessions table
CREATE TABLE IF NOT EXISTS otp_sessions (
  id SERIAL PRIMARY KEY,
  phone_number VARCHAR(15) NOT NULL,
  otp VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_sessions(phone_number);
CREATE INDEX IF NOT EXISTS idx_otp_expires ON otp_sessions(expires_at);

-- Sync status tracking
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

-- Initialize sync status for users
INSERT INTO sync_status (entity_type, last_sync_status)
VALUES ('users', 'SUCCESS')
ON CONFLICT (entity_type) DO NOTHING;

-- ============================================================================
-- Marketplace Tables
-- ============================================================================

-- Listings table
CREATE TABLE IF NOT EXISTS listings (
  id VARCHAR(36) PRIMARY KEY,
  farmer_id VARCHAR(36) NOT NULL,
  produce_type VARCHAR(255) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  price_per_kg DECIMAL(10,2) NOT NULL,
  certificate_id VARCHAR(36) NOT NULL,
  expected_harvest_date TIMESTAMP,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (farmer_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for listings
CREATE INDEX IF NOT EXISTS idx_listings_farmer ON listings(farmer_id);
CREATE INDEX IF NOT EXISTS idx_listings_active ON listings(is_active);
CREATE INDEX IF NOT EXISTS idx_listings_created_at ON listings(created_at);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id VARCHAR(36) PRIMARY KEY,
  listing_id VARCHAR(36) NOT NULL,
  farmer_id VARCHAR(36) NOT NULL,
  buyer_id VARCHAR(36) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  dispatched_at TIMESTAMP,
  delivered_at TIMESTAMP,
  completed_at TIMESTAMP,
  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
  FOREIGN KEY (farmer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for transactions
CREATE INDEX IF NOT EXISTS idx_transactions_listing ON transactions(listing_id);
CREATE INDEX IF NOT EXISTS idx_transactions_farmer ON transactions(farmer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_buyer ON transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);

-- Escrow accounts table
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

-- Indexes for escrow accounts
CREATE INDEX IF NOT EXISTS idx_escrow_transaction ON escrow_accounts(transaction_id);
CREATE INDEX IF NOT EXISTS idx_escrow_status ON escrow_accounts(status);

-- Initialize sync status for marketplace entities
INSERT INTO sync_status (entity_type, last_sync_status)
VALUES 
  ('listings', 'SUCCESS'),
  ('transactions', 'SUCCESS'),
  ('escrow_accounts', 'SUCCESS')
ON CONFLICT (entity_type) DO NOTHING;

-- ============================================================================
-- Listing Media Tables
-- ============================================================================

-- Media table for listing attachments
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_listing_media_listing_id ON listing_media(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_media_type ON listing_media(media_type);
CREATE INDEX IF NOT EXISTS idx_listing_media_primary ON listing_media(listing_id, is_primary) WHERE is_primary = TRUE;
CREATE INDEX IF NOT EXISTS idx_listing_media_order ON listing_media(listing_id, display_order);

-- Ensure only one primary media per listing
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_primary_per_listing ON listing_media(listing_id) WHERE is_primary = TRUE;

-- Trigger to update listing's updated_at when media changes
CREATE OR REPLACE FUNCTION update_listing_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE listings SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.listing_id;
    RETURN OLD;
  ELSE
    UPDATE listings SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.listing_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS trigger_update_listing_on_media_change
AFTER INSERT OR UPDATE OR DELETE ON listing_media
FOR EACH ROW
EXECUTE FUNCTION update_listing_timestamp();

-- Initialize sync status for listing_media
INSERT INTO sync_status (entity_type, last_sync_status)
VALUES ('listing_media', 'SUCCESS')
ON CONFLICT (entity_type) DO NOTHING;
