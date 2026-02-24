-- Migration: Add listing_media support to SQLite
-- Date: 2024
-- Description: Adds tables for listing media caching and offline support

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
