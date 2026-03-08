-- Create test listings for various crops
INSERT INTO listings (id, farmer_id, produce_type, quantity, price_per_kg, certificate_id, expected_harvest_date, created_at, updated_at, status, listing_type, expiry_date, payment_method_preference) VALUES
(gen_random_uuid(), '333400ab-ae4f-4cdd-8d1f-83aad551f015', 'Potato', 200.00, 18.00, gen_random_uuid(), NOW(), NOW(), NOW(), 'ACTIVE', 'POST_HARVEST', NOW() + INTERVAL '7 days', 'BOTH'),
(gen_random_uuid(), '333400ab-ae4f-4cdd-8d1f-83aad551f015', 'Onion', 150.00, 22.00, gen_random_uuid(), NOW(), NOW(), NOW(), 'ACTIVE', 'POST_HARVEST', NOW() + INTERVAL '7 days', 'BOTH'),
(gen_random_uuid(), '333400ab-ae4f-4cdd-8d1f-83aad551f015', 'Wheat', 500.00, 25.00, gen_random_uuid(), NOW(), NOW(), NOW(), 'ACTIVE', 'POST_HARVEST', NOW() + INTERVAL '7 days', 'BOTH'),
(gen_random_uuid(), '333400ab-ae4f-4cdd-8d1f-83aad551f015', 'Rice', 300.00, 35.00, gen_random_uuid(), NOW(), NOW(), NOW(), 'ACTIVE', 'POST_HARVEST', NOW() + INTERVAL '7 days', 'BOTH');

SELECT produce_type, quantity, price_per_kg, status FROM listings WHERE status = 'ACTIVE' ORDER BY produce_type;
