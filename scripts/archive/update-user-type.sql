-- Update user type for mobile number +919986017659 to 'both'
-- This allows the user to act as both farmer and buyer

UPDATE user_profiles 
SET user_type = 'both',
    updated_at = NOW()
WHERE mobile_number = '+919986017659';

-- Verify the update
SELECT 
    user_id,
    mobile_number,
    name,
    user_type,
    updated_at
FROM user_profiles 
WHERE mobile_number = '+919986017659';
