INSERT INTO users (id, phone_number, name, user_type, location, created_at, updated_at) 
VALUES ('333400ab-ae4f-4cdd-8d1f-83aad551f015', '+919876598765', 'Mahesh Babu', 'FARMER', 
'{"text": "Agra, Uttar Pradesh"}', NOW(), NOW()) 
ON CONFLICT (id) DO NOTHING;
