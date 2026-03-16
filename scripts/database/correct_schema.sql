-- ============================================================================
-- CORRECT DATABASE SCHEMA - Matches AWS RDS exactly
-- Source of truth for local development database recreation
--
-- Usage:
--   psql -h localhost -p 5433 -U postgres -d postgres -c "DROP DATABASE IF EXISTS bharat_mandi;"
--   psql -h localhost -p 5433 -U postgres -d postgres -c "CREATE DATABASE bharat_mandi;"
--   psql -h localhost -p 5433 -U postgres -d bharat_mandi -f correct_schema.sql
--
-- Notes:
--   - No 'users' table - Sequelize auto-creates 'user_profiles' on startup
--   - All IDs use VARCHAR(36) to match AWS (except rag_documents.id which is UUID)
--   - otp_sessions uses SERIAL integer id (matches AWS)
--   - rag_documents has both id (UUID PK) and document_id (VARCHAR UNIQUE)
-- ============================================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- OTP SESSIONS TABLE
-- AWS uses SERIAL integer id (not UUID)
-- ============================================================================
CREATE TABLE IF NOT EXISTS otp_sessions (
  id SERIAL PRIMARY KEY,
  phone_number VARCHAR(20) NOT NULL,
  otp VARCHAR(10) NOT NULL,
  attempts INTEGER DEFAULT 0,
  expires_at TIMESTAMP NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_otp_sessions_phone ON otp_sessions(phone_number);

-- ============================================================================
-- ENUM TYPES
-- ============================================================================
DO $$ BEGIN
  CREATE TYPE listing_status AS ENUM ('ACTIVE', 'SOLD', 'EXPIRED', 'CANCELLED', 'IN_TRANSACTION');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE listing_type AS ENUM ('POST_HARVEST', 'PRE_HARVEST');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_method_preference AS ENUM ('CASH', 'UPI', 'BOTH');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE sale_channel AS ENUM ('MARKETPLACE', 'DIRECT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- LISTINGS TABLE
-- farmer_id is VARCHAR(36) to match user_profiles.user_id (set by Sequelize)
-- ============================================================================
CREATE TABLE IF NOT EXISTS listings (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  farmer_id VARCHAR(36) NOT NULL,
  produce_type VARCHAR(255) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  price_per_kg DECIMAL(10,2) NOT NULL,
  certificate_id VARCHAR(36),
  expected_harvest_date TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Status tracking
  status listing_status NOT NULL DEFAULT 'ACTIVE',
  sold_at TIMESTAMP,
  transaction_id VARCHAR(36),
  expired_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  cancelled_by VARCHAR(255),

  -- Perishability-based expiration
  listing_type listing_type NOT NULL DEFAULT 'POST_HARVEST',
  produce_category_id VARCHAR(36),
  expiry_date TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days'),

  -- Manual sale confirmation
  payment_method_preference payment_method_preference NOT NULL DEFAULT 'BOTH',
  sale_channel sale_channel,
  sale_price DECIMAL(10,2),
  sale_notes TEXT,

  CONSTRAINT chk_quantity_positive CHECK (quantity > 0),
  CONSTRAINT chk_price_positive CHECK (price_per_kg > 0)
);

CREATE INDEX IF NOT EXISTS idx_listings_farmer_id ON listings(farmer_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_expiry_date_status ON listings(expiry_date, status) WHERE status = 'ACTIVE';
CREATE INDEX IF NOT EXISTS idx_listings_produce_type ON listings(produce_type);
CREATE INDEX IF NOT EXISTS idx_listings_created_at ON listings(created_at DESC);

-- ============================================================================
-- LISTING MEDIA TABLE
-- listing_id is VARCHAR(36) to match listings.id
-- ============================================================================
CREATE TABLE IF NOT EXISTS listing_media (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
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
CREATE INDEX IF NOT EXISTS idx_listing_media_type ON listing_media(media_type);
CREATE INDEX IF NOT EXISTS idx_listing_media_primary ON listing_media(listing_id, is_primary) WHERE is_primary = TRUE;
CREATE INDEX IF NOT EXISTS idx_listing_media_order ON listing_media(listing_id, display_order);
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_primary_per_listing ON listing_media(listing_id) WHERE is_primary = TRUE;

-- ============================================================================
-- TRANSACTIONS TABLE
-- All IDs are VARCHAR(36) to match AWS
-- ============================================================================
CREATE TABLE IF NOT EXISTS transactions (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  listing_id VARCHAR(36) NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  farmer_id VARCHAR(36) NOT NULL,
  buyer_id VARCHAR(36) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  dispatched_at TIMESTAMP,
  delivered_at TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transactions_listing_id ON transactions(listing_id);
CREATE INDEX IF NOT EXISTS idx_transactions_farmer_id ON transactions(farmer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_buyer_id ON transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);

-- ============================================================================
-- ESCROW ACCOUNTS TABLE
-- transaction_id is VARCHAR(36) to match transactions.id
-- ============================================================================
CREATE TABLE IF NOT EXISTS escrow_accounts (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  transaction_id VARCHAR(36) UNIQUE NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  is_locked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  released_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_escrow_transaction_id ON escrow_accounts(transaction_id);
CREATE INDEX IF NOT EXISTS idx_escrow_is_locked ON escrow_accounts(is_locked);

-- ============================================================================
-- LISTING STATUS HISTORY TABLE
-- Matches AWS schema exactly: previous_status, changed_at, triggered_by, trigger_type
-- ============================================================================
CREATE TABLE IF NOT EXISTS listing_status_history (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  listing_id VARCHAR(36) NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  previous_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  triggered_by VARCHAR(255) NOT NULL,
  trigger_type VARCHAR(50) NOT NULL CHECK (trigger_type IN ('USER', 'SYSTEM', 'EXPIRY', 'ADMIN'))
);

CREATE INDEX IF NOT EXISTS idx_listing_status_history_listing_id ON listing_status_history(listing_id);

-- ============================================================================
-- PRODUCE CATEGORIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS produce_categories (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  expiry_period_hours INTEGER NOT NULL CHECK (expiry_period_hours > 0 AND expiry_period_hours <= 8760),
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_produce_categories_name ON produce_categories(name);

-- ============================================================================
-- NOTIFICATION TEMPLATES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS notification_templates (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  type VARCHAR(50) NOT NULL,
  language VARCHAR(10) NOT NULL,
  template TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(type, language)
);

CREATE INDEX IF NOT EXISTS idx_notification_templates_type_lang ON notification_templates(type, language);

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  user_id VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- ============================================================================
-- RAG DOCUMENTS TABLE
-- Matches AWS exactly: id UUID PK + document_id VARCHAR(255) UNIQUE (separate columns)
-- embedding is vector(1536) NOT NULL, metadata is jsonb NOT NULL
-- ============================================================================
CREATE TABLE IF NOT EXISTS rag_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id VARCHAR(255) UNIQUE NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536) NOT NULL,
  metadata JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS rag_documents_embedding_idx
  ON rag_documents USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS rag_documents_metadata_idx
  ON rag_documents USING gin (metadata);

-- ============================================================================
-- SYNC STATUS TABLE (exists on AWS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS sync_status (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(36) NOT NULL,
  sync_state VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  last_synced_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_sync_status_entity ON sync_status(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_sync_status_state ON sync_status(sync_state);

-- ============================================================================
-- MIGRATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS migrations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER update_listings_updated_at
  BEFORE UPDATE ON listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_rag_documents_updated_at
  BEFORE UPDATE ON rag_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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

CREATE OR REPLACE TRIGGER trigger_update_listing_on_media_change
  AFTER INSERT OR UPDATE OR DELETE ON listing_media
  FOR EACH ROW EXECUTE FUNCTION update_listing_timestamp();
