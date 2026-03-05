-- Migration: 008_create_listing_status_history_sqlite.sql
-- Description: Create listing_status_history table for audit trail (SQLite)
-- Requirements: 12.1, 12.2, 12.3, 12.4

-- ============================================================================
-- SQLite Schema
-- ============================================================================

-- Drop existing table if present
DROP TABLE IF EXISTS listing_status_history;

-- Create listing_status_history table
CREATE TABLE listing_status_history (
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
CREATE INDEX idx_status_history_listing ON listing_status_history(listing_id, changed_at DESC);
CREATE INDEX idx_status_history_changed_at ON listing_status_history(changed_at DESC);
CREATE INDEX idx_status_history_trigger_type ON listing_status_history(trigger_type);

-- Add listing_status_history to sync status
INSERT OR IGNORE INTO sync_status (entity_type, last_sync_status) VALUES
  ('listing_status_history', 'SUCCESS');
