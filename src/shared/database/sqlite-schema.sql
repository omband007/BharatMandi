-- ============================================================================
-- Bharat Mandi Platform - SQLite Offline Storage Schema
-- ============================================================================
-- This database is used for offline functionality in the mobile app
-- Data syncs to PostgreSQL/MongoDB when connectivity is restored
-- ============================================================================

-- ============================================================================
-- LISTINGS TABLE (Marketplace listings with offline sync)
-- ============================================================================
CREATE TABLE IF NOT EXISTS listings (
  id TEXT PRIMARY KEY,
  farmer_id TEXT NOT NULL,
  produce_type TEXT NOT NULL,
  quantity REAL NOT NULL,
  price_per_kg REAL NOT NULL,
  certificate_id TEXT NOT NULL,
  expected_harvest_date TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  
  -- Status tracking fields
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SOLD', 'EXPIRED', 'CANCELLED')),
  sold_at TEXT,
  transaction_id TEXT,
  expired_at TEXT,
  cancelled_at TEXT,
  cancelled_by TEXT,
  
  -- Perishability-based expiration fields
  listing_type TEXT NOT NULL DEFAULT 'POST_HARVEST' CHECK (listing_type IN ('PRE_HARVEST', 'POST_HARVEST')),
  produce_category_id TEXT NOT NULL,
  expiry_date TEXT NOT NULL,
  
  -- Manual sale confirmation fields
  payment_method_preference TEXT NOT NULL DEFAULT 'BOTH' CHECK (payment_method_preference IN ('PLATFORM_ONLY', 'DIRECT_ONLY', 'BOTH')),
  sale_channel TEXT CHECK (sale_channel IN ('PLATFORM_ESCROW', 'PLATFORM_DIRECT', 'EXTERNAL')),
  sale_price REAL,
  sale_notes TEXT,
  
  -- Foreign keys
  FOREIGN KEY (farmer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (produce_category_id) REFERENCES produce_categories(id),
  FOREIGN KEY (transaction_id) REFERENCES transactions(id),
  FOREIGN KEY (cancelled_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_listings_farmer ON listings(farmer_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_expiry_date_status ON listings(expiry_date, status) WHERE status = 'ACTIVE';
CREATE INDEX IF NOT EXISTS idx_listings_category ON listings(produce_category_id);
CREATE INDEX IF NOT EXISTS idx_listings_created_at ON listings(created_at);

-- ============================================================================
-- PENDING SYNC QUEUE TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS pending_sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  operation_type TEXT NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE'
  entity_type TEXT NOT NULL, -- 'listing', 'photo_log', 'transaction', etc.
  entity_id TEXT NOT NULL,
  data TEXT NOT NULL, -- JSON string of the data
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  retry_count INTEGER DEFAULT 0,
  last_retry_at TEXT,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_sync_queue_created_at ON pending_sync_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_sync_queue_entity_type ON pending_sync_queue(entity_type);

-- ============================================================================
-- LOCAL PHOTO LOGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS local_photo_logs (
  id TEXT PRIMARY KEY,
  farmer_id TEXT NOT NULL,
  image_path TEXT NOT NULL, -- Local file path
  category TEXT NOT NULL, -- TILLING, SOWING, SPRAYING, FERTIGATION, HARVEST, OTHER
  location_lat REAL NOT NULL,
  location_lng REAL NOT NULL,
  timestamp TEXT NOT NULL,
  notes TEXT,
  transaction_id TEXT,
  synced INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_local_photo_logs_farmer_id ON local_photo_logs(farmer_id);
CREATE INDEX IF NOT EXISTS idx_local_photo_logs_synced ON local_photo_logs(synced);
CREATE INDEX IF NOT EXISTS idx_local_photo_logs_timestamp ON local_photo_logs(timestamp DESC);

-- ============================================================================
-- USERS TABLE (Primary user storage with authentication)
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  phone_number TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  user_type TEXT NOT NULL, -- FARMER, BUYER, etc.
  location TEXT NOT NULL, -- JSON string: {address, city, state, pincode, coordinates}
  bank_account TEXT, -- JSON string: {accountNumber, ifscCode, bankName, accountHolderName}
  pin_hash TEXT, -- Hashed PIN for authentication
  failed_attempts INTEGER DEFAULT 0,
  locked_until TEXT, -- ISO timestamp when account lock expires
  language_preference TEXT DEFAULT 'en', -- User preferred UI language (ISO 639-1 code)
  voice_language_preference TEXT DEFAULT 'en', -- User preferred voice interface language
  recent_languages TEXT, -- JSON array of recently used language codes
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_phone_number ON users(phone_number);
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);
CREATE INDEX IF NOT EXISTS idx_users_language_preference ON users(language_preference);

-- ============================================================================
-- OTP SESSIONS TABLE (For phone verification)
-- ============================================================================
CREATE TABLE IF NOT EXISTS otp_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone_number TEXT NOT NULL,
  otp TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  attempts INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_otp_sessions_phone_number ON otp_sessions(phone_number);
CREATE INDEX IF NOT EXISTS idx_otp_sessions_expires_at ON otp_sessions(expires_at);

-- ============================================================================
-- USER PROFILE TABLE (Cached - for offline sync)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_profile (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL, -- FARMER, BUYER, etc.
  location TEXT NOT NULL,
  bank_account_number TEXT,
  bank_ifsc_code TEXT,
  bank_name TEXT,
  bank_account_holder_name TEXT,
  credibility_score INTEGER DEFAULT 500,
  rating REAL DEFAULT 0.00,
  last_synced_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- AI MODELS METADATA TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_models_metadata (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  model_name TEXT UNIQUE NOT NULL,
  model_version TEXT NOT NULL,
  model_path TEXT NOT NULL, -- Local file path
  model_size INTEGER NOT NULL, -- Size in bytes
  downloaded_at TEXT DEFAULT CURRENT_TIMESTAMP,
  last_used_at TEXT,
  is_active INTEGER DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_ai_models_is_active ON ai_models_metadata(is_active);

-- ============================================================================
-- CACHED CERTIFICATES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS cached_certificates (
  id TEXT PRIMARY KEY,
  certificate_id TEXT UNIQUE NOT NULL,
  farmer_id TEXT NOT NULL,
  produce_type TEXT NOT NULL,
  grade TEXT NOT NULL, -- A, B, C
  timestamp TEXT NOT NULL,
  location_lat REAL NOT NULL,
  location_lng REAL NOT NULL,
  image_hash TEXT NOT NULL,
  image_path TEXT, -- Local cached image path
  analysis_details TEXT, -- JSON string
  cached_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cached_certificates_farmer_id ON cached_certificates(farmer_id);
CREATE INDEX IF NOT EXISTS idx_cached_certificates_produce_type ON cached_certificates(produce_type);

-- ============================================================================
-- OFFLINE ACTIVITIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS offline_activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  activity_type TEXT NOT NULL, -- 'GRADING', 'LISTING_CREATE', 'PHOTO_LOG', etc.
  user_id TEXT NOT NULL,
  data TEXT NOT NULL, -- JSON string of activity data
  status TEXT DEFAULT 'PENDING', -- PENDING, SYNCED, FAILED
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  synced_at TEXT,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_offline_activities_status ON offline_activities(status);
CREATE INDEX IF NOT EXISTS idx_offline_activities_user_id ON offline_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_offline_activities_created_at ON offline_activities(created_at DESC);

-- ============================================================================
-- TRANSACTIONS TABLE (Purchase transactions with offline sync)
-- ============================================================================
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL,
  farmer_id TEXT NOT NULL,
  buyer_id TEXT NOT NULL,
  amount REAL NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  dispatched_at TEXT,
  delivered_at TEXT,
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_transactions_listing ON transactions(listing_id);
CREATE INDEX IF NOT EXISTS idx_transactions_farmer ON transactions(farmer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_buyer ON transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);

-- ============================================================================
-- ESCROW ACCOUNTS TABLE (Payment escrow with offline sync)
-- ============================================================================
CREATE TABLE IF NOT EXISTS escrow_accounts (
  id TEXT PRIMARY KEY,
  transaction_id TEXT UNIQUE NOT NULL,
  amount REAL NOT NULL,
  status TEXT NOT NULL,
  is_locked INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  released_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_escrow_transaction ON escrow_accounts(transaction_id);
CREATE INDEX IF NOT EXISTS idx_escrow_status ON escrow_accounts(status);

-- ============================================================================
-- SYNC STATUS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS sync_status (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT UNIQUE NOT NULL,
  last_sync_at TEXT,
  last_sync_status TEXT, -- SUCCESS, FAILED, IN_PROGRESS
  records_synced INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  error_message TEXT
);

-- Insert default sync status records
INSERT OR IGNORE INTO sync_status (entity_type, last_sync_status) VALUES
  ('users', 'SUCCESS'),
  ('listings', 'SUCCESS'),
  ('transactions', 'SUCCESS'),
  ('escrow_accounts', 'SUCCESS'),
  ('photo_logs', 'SUCCESS'),
  ('certificates', 'SUCCESS'),
  ('user_profile', 'SUCCESS');

-- ============================================================================
-- APP SETTINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Insert default settings
INSERT OR IGNORE INTO app_settings (key, value) VALUES
  ('offline_mode', 'false'),
  ('auto_sync', 'true'),
  ('last_online_at', CURRENT_TIMESTAMP),
  ('app_version', '0.1.0');

-- ============================================================================
-- LISTING MEDIA TABLES (Media caching and offline support)
-- ============================================================================

-- Cached media metadata
CREATE TABLE IF NOT EXISTS listing_media_cache (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('photo', 'video', 'document')),
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  storage_url TEXT NOT NULL,
  thumbnail_url TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_primary INTEGER DEFAULT 0,
  uploaded_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
);

-- Pending media operations queue
CREATE TABLE IF NOT EXISTS pending_media_ops (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  operation_type TEXT NOT NULL CHECK (operation_type IN ('upload', 'delete', 'reorder', 'set_primary')),
  listing_id TEXT NOT NULL,
  media_id TEXT,
  file_path TEXT,
  metadata TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Local file storage for offline uploads
CREATE TABLE IF NOT EXISTS local_media_files (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL,
  local_file_path TEXT NOT NULL,
  media_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  upload_status TEXT DEFAULT 'pending' CHECK (upload_status IN ('pending', 'uploading', 'completed', 'failed')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for media tables
CREATE INDEX IF NOT EXISTS idx_media_cache_listing ON listing_media_cache(listing_id);
CREATE INDEX IF NOT EXISTS idx_pending_media_ops_listing ON pending_media_ops(listing_id);
CREATE INDEX IF NOT EXISTS idx_local_media_listing ON local_media_files(listing_id);
CREATE INDEX IF NOT EXISTS idx_local_media_status ON local_media_files(upload_status);

-- Add listing_media to sync status
INSERT OR IGNORE INTO sync_status (entity_type, last_sync_status) VALUES
  ('listing_media', 'SUCCESS');

-- ============================================================================
-- PRODUCE CATEGORIES TABLE (Perishability-based expiration)
-- ============================================================================

CREATE TABLE IF NOT EXISTS produce_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    expiry_period_hours INTEGER NOT NULL CHECK (expiry_period_hours > 0 AND expiry_period_hours <= 8760),
    description TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create index for name lookups
CREATE INDEX IF NOT EXISTS idx_produce_categories_name ON produce_categories(name);

-- Add produce_categories to sync status
INSERT OR IGNORE INTO sync_status (entity_type, last_sync_status) VALUES
  ('produce_categories', 'SUCCESS');

-- ============================================================================
-- LISTING STATUS HISTORY TABLE (Audit trail)
-- ============================================================================

CREATE TABLE IF NOT EXISTS listing_status_history (
    id TEXT PRIMARY KEY,
    listing_id TEXT NOT NULL,
    previous_status TEXT CHECK (previous_status IN ('ACTIVE', 'SOLD', 'EXPIRED', 'CANCELLED') OR previous_status IS NULL),
    new_status TEXT NOT NULL CHECK (new_status IN ('ACTIVE', 'SOLD', 'EXPIRED', 'CANCELLED')),
    changed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    triggered_by TEXT NOT NULL, -- user_id or 'SYSTEM'
    trigger_type TEXT NOT NULL CHECK (trigger_type IN ('USER', 'SYSTEM', 'TRANSACTION')),
    metadata TEXT, -- Additional context as JSON string
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_status_history_listing ON listing_status_history(listing_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_status_history_changed_at ON listing_status_history(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_status_history_trigger_type ON listing_status_history(trigger_type);

-- Add listing_status_history to sync status
INSERT OR IGNORE INTO sync_status (entity_type, last_sync_status) VALUES
  ('listing_status_history', 'SUCCESS');


