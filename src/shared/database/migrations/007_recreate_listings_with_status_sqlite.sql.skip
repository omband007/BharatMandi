-- Migration: 007_recreate_listings_with_status_sqlite.sql
-- Description: Recreate listings table with status enum and enhanced fields (SQLite)
-- Requirements: 2.1, 2.2, 2.3, 2.4, 15.1, 15.2, 15.3, 15.4, 15.7, 18.1, 18.2, 18.3, 18.4, 19.6, 19.7
-- Development Phase: Using DROP TABLE IF EXISTS + CREATE TABLE (no data preservation)

-- ============================================================================
-- SQLite Schema
-- ============================================================================

-- Drop existing tables
DROP TABLE IF EXISTS listing_media_cache;
DROP TABLE IF EXISTS pending_media_ops;
DROP TABLE IF EXISTS local_media_files;
DROP TABLE IF EXISTS listings;

-- Create listings table with new schema
CREATE TABLE listings (
    id TEXT PRIMARY KEY,
    farmer_id TEXT NOT NULL,
    produce_type TEXT NOT NULL,
    quantity REAL NOT NULL,
    price_per_kg REAL NOT NULL,
    certificate_id TEXT NOT NULL,
    expected_harvest_date TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
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
    sale_channel TEXT CHECK (sale_channel IN ('PLATFORM', 'EXTERNAL')),
    sale_price REAL,
    sale_notes TEXT,
    
    -- Foreign keys
    FOREIGN KEY (farmer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (produce_category_id) REFERENCES produce_categories(id),
    FOREIGN KEY (transaction_id) REFERENCES transactions(id),
    FOREIGN KEY (cancelled_by) REFERENCES users(id)
);

-- Create indexes
CREATE INDEX idx_listings_farmer ON listings(farmer_id);
CREATE INDEX idx_listings_status ON listings(status);
CREATE INDEX idx_listings_expiry_date_status ON listings(expiry_date, status) WHERE status = 'ACTIVE';
CREATE INDEX idx_listings_category ON listings(produce_category_id);
CREATE INDEX idx_listings_created_at ON listings(created_at);

-- Recreate listing media tables
CREATE TABLE listing_media_cache (
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

CREATE TABLE pending_media_ops (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  operation_type TEXT NOT NULL CHECK (operation_type IN ('upload', 'delete', 'reorder', 'set_primary')),
  listing_id TEXT NOT NULL,
  media_id TEXT,
  file_path TEXT,
  metadata TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE local_media_files (
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
CREATE INDEX idx_media_cache_listing ON listing_media_cache(listing_id);
CREATE INDEX idx_pending_media_ops_listing ON pending_media_ops(listing_id);
CREATE INDEX idx_local_media_listing ON local_media_files(listing_id);
CREATE INDEX idx_local_media_status ON local_media_files(upload_status);
