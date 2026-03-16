-- Migration: 006_create_produce_categories.sql
-- Description: Create produce categories table for perishability-based listing expiration
-- Requirements: 6.1, 6.2, 6.6
-- Development Phase: Using DROP TABLE IF EXISTS + CREATE TABLE (no data preservation)

-- ============================================================================
-- PostgreSQL Schema
-- ============================================================================

-- Drop existing table if present
DROP TABLE IF EXISTS produce_categories CASCADE;

-- Create produce categories table
CREATE TABLE produce_categories (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    expiry_period_hours INTEGER NOT NULL CHECK (expiry_period_hours > 0 AND expiry_period_hours <= 8760),
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create index for name lookups
CREATE INDEX idx_produce_categories_name ON produce_categories(name);

-- Add comments for documentation
COMMENT ON TABLE produce_categories IS 'Produce categories with expiry periods for automatic listing expiration';
COMMENT ON COLUMN produce_categories.expiry_period_hours IS 'Hours after harvest when produce expires (1-8760 hours = 1 hour to 1 year)';

-- Note: sync_status table initialization removed - not needed for core functionality
