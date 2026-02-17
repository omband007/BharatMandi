-- Migration: Add PIN column to users table for authentication
-- Date: 2026-02-17

ALTER TABLE users ADD COLUMN pin_hash VARCHAR(255);
ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP;
ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN account_locked_until TIMESTAMP;

-- Add index for faster lookups
CREATE INDEX idx_users_account_locked ON users(account_locked_until) WHERE account_locked_until IS NOT NULL;

