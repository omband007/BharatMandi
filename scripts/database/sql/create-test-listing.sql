-- Create a test active listing for Kisan Mitra testing
INSERT INTO listings (
  id, 
  farmer_id, 
  produce_type, 
  quantity, 
  price_per_kg, 
  certificate_id, 
  expected_harvest_date, 
  created_at, 
  updated_at, 
  status, 
  listing_type, 
  expiry_date, 
  payment_method_preference
) VALUES (
  gen_random_uuid(), 
  '333400ab-ae4f-4cdd-8d1f-83aad551f015', 
  'Tomato', 
  150.00, 
  25.00, 
  gen_random_uuid(), 
  NOW(), 
  NOW(), 
  NOW(), 
  'ACTIVE', 
  'POST_HARVEST', 
  NOW() + INTERVAL '7 days', 
  'BOTH'
);

-- Verify the listing was created
SELECT id, produce_type, quantity, price_per_kg, status 
FROM listings 
WHERE status = 'ACTIVE' 
ORDER BY created_at DESC 
LIMIT 3;
