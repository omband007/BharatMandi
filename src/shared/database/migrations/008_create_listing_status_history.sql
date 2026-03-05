-- Migration: 008_create_listing_status_history.sql
-- Description: Create listing_status_history table for audit trail
-- Requirements: 12.1, 12.2, 12.3, 12.4

-- ============================================================================
-- PostgreSQL Schema
-- ============================================================================

-- Drop existing table if present
DROP TABLE IF EXISTS listing_status_history CASCADE;

-- Create listing_status_history table
CREATE TABLE listing_status_history (
    id VARCHAR(36) PRIMARY KEY,
    listing_id VARCHAR(36) NOT NULL,
    previous_status listing_status,
    new_status listing_status NOT NULL,
    changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    triggered_by VARCHAR(255) NOT NULL, -- user_id or 'SYSTEM'
    trigger_type VARCHAR(50) NOT NULL CHECK (trigger_type IN ('USER', 'SYSTEM', 'TRANSACTION')),
    metadata JSONB, -- Additional context (e.g., transaction_id, reason)
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX idx_status_history_listing ON listing_status_history(listing_id, changed_at DESC);
CREATE INDEX idx_status_history_changed_at ON listing_status_history(changed_at DESC);
CREATE INDEX idx_status_history_trigger_type ON listing_status_history(trigger_type);

-- Add comments for documentation
COMMENT ON TABLE listing_status_history IS 'Audit trail for listing status changes. Retain for at least 2 years.';
COMMENT ON COLUMN listing_status_history.triggered_by IS 'User ID who triggered the change, or SYSTEM for automated changes';
COMMENT ON COLUMN listing_status_history.trigger_type IS 'USER (manual), SYSTEM (automated), or TRANSACTION (transaction-driven)';
COMMENT ON COLUMN listing_status_history.metadata IS 'Additional context as JSON (e.g., transaction_id, cancellation_reason)';

-- Initialize sync status for listing_status_history
INSERT INTO sync_status (entity_type, last_sync_status)
VALUES ('listing_status_history', 'SUCCESS')
ON CONFLICT (entity_type) DO NOTHING;
