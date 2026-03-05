-- Migration: 006_create_produce_categories_sqlite.sql
-- Description: Create produce categories table for SQLite (offline storage)
-- Requirements: 6.1, 6.2, 6.6
-- Development Phase: Using DROP TABLE IF EXISTS + CREATE TABLE (no data preservation)

-- ============================================================================
-- SQLite Schema
-- ============================================================================

-- Drop existing table if present
DROP TABLE IF EXISTS produce_categories;

-- Create produce categories table
CREATE TABLE produce_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    expiry_period_hours INTEGER NOT NULL CHECK (expiry_period_hours > 0 AND expiry_period_hours <= 8760),
    description TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create index for name lookups
CREATE INDEX idx_produce_categories_name ON produce_categories(name);

-- Add produce_categories to sync status
INSERT OR IGNORE INTO sync_status (entity_type, last_sync_status) VALUES
  ('produce_categories', 'SUCCESS');
