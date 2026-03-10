-- Drop the legacy users table
-- All foreign keys have been migrated to user_profiles

BEGIN;

-- Drop the users table
DROP TABLE IF EXISTS users CASCADE;

-- Verify it's gone
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'users' AND table_schema = 'public';

COMMIT;
