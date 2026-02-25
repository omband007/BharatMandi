-- Migration: Add language preference columns to users table
-- Date: 2026-02-25
-- Description: Add language_preference, voice_language_preference, and recent_languages columns

-- Add language preference columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS language_preference VARCHAR(10) DEFAULT 'en';
ALTER TABLE users ADD COLUMN IF NOT EXISTS voice_language_preference VARCHAR(10) DEFAULT 'en';
ALTER TABLE users ADD COLUMN IF NOT EXISTS recent_languages TEXT; -- JSON array of recently used languages

-- Create index on language_preference for efficient querying
CREATE INDEX IF NOT EXISTS idx_users_language_preference ON users(language_preference);

-- Add comments for documentation
COMMENT ON COLUMN users.language_preference IS 'User preferred UI language (ISO 639-1 code)';
COMMENT ON COLUMN users.voice_language_preference IS 'User preferred voice interface language (ISO 639-1 code)';
COMMENT ON COLUMN users.recent_languages IS 'JSON array of recently used language codes for quick switching';
