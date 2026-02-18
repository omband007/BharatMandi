-- ============================================================================
-- Bharat Mandi Platform - SQLite Offline Storage Schema
-- ============================================================================
-- This database is used for offline functionality in the mobile app
-- Data syncs to PostgreSQL/MongoDB when connectivity is restored
-- ============================================================================

-- ============================================================================
-- CACHED LISTINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS cached_listings (
  id TEXT PRIMARY KEY,
  farmer_id TEXT NOT NULL,
  produce_type TEXT NOT NULL,
  quantity REAL NOT NULL,
  price_per_kg REAL NOT NULL,
  certificate_id TEXT,
  expected_harvest_date TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  cached_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cached_listings_produce_type ON cached_listings(produce_type);
CREATE INDEX IF NOT EXISTS idx_cached_listings_is_active ON cached_listings(is_active);

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
-- USER PROFILE TABLE (Cached)
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
-- CACHED TRANSACTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS cached_transactions (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL,
  farmer_id TEXT NOT NULL,
  buyer_id TEXT NOT NULL,
  amount REAL NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  cached_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cached_transactions_farmer_id ON cached_transactions(farmer_id);
CREATE INDEX IF NOT EXISTS idx_cached_transactions_buyer_id ON cached_transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_cached_transactions_status ON cached_transactions(status);

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
  ('listings', 'SUCCESS'),
  ('photo_logs', 'SUCCESS'),
  ('certificates', 'SUCCESS'),
  ('transactions', 'SUCCESS'),
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
