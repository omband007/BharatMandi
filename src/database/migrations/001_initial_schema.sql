-- Migration: 001_initial_schema
-- Description: Initial database schema for Bharat Mandi Platform
-- Date: 2024-01-01

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(15) UNIQUE NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('FARMER', 'BUYER', 'LOGISTICS_PROVIDER', 'COLD_STORAGE_PROVIDER', 'SUPPLIER')),
  location VARCHAR(255) NOT NULL,
  bank_account_number VARCHAR(50),
  bank_ifsc_code VARCHAR(20),
  bank_name VARCHAR(255),
  bank_account_holder_name VARCHAR(255),
  credibility_score INTEGER DEFAULT 500,
  rating DECIMAL(3, 2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_type ON users(type);
CREATE INDEX IF NOT EXISTS idx_users_location ON users(location);

-- ============================================================================
-- LISTINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farmer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  produce_type VARCHAR(100) NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL,
  price_per_kg DECIMAL(10, 2) NOT NULL,
  certificate_id UUID,
  expected_harvest_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_listings_farmer_id ON listings(farmer_id);
CREATE INDEX IF NOT EXISTS idx_listings_produce_type ON listings(produce_type);
CREATE INDEX IF NOT EXISTS idx_listings_is_active ON listings(is_active);
CREATE INDEX IF NOT EXISTS idx_listings_created_at ON listings(created_at DESC);

-- ============================================================================
-- TRANSACTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  farmer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'PAYMENT_LOCKED', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED', 'DISPUTED', 'REJECTED')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  dispatched_at TIMESTAMP,
  delivered_at TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transactions_listing_id ON transactions(listing_id);
CREATE INDEX IF NOT EXISTS idx_transactions_farmer_id ON transactions(farmer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_buyer_id ON transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);

-- ============================================================================
-- ESCROW ACCOUNTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS escrow_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID UNIQUE NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  is_locked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  released_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_escrow_transaction_id ON escrow_accounts(transaction_id);
CREATE INDEX IF NOT EXISTS idx_escrow_is_locked ON escrow_accounts(is_locked);

-- ============================================================================
-- RATINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating DECIMAL(3, 2) NOT NULL CHECK (rating >= 0 AND rating <= 5),
  feedback TEXT,
  implicit_rating DECIMAL(3, 2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ratings_transaction_id ON ratings(transaction_id);
CREATE INDEX IF NOT EXISTS idx_ratings_to_user_id ON ratings(to_user_id);
CREATE INDEX IF NOT EXISTS idx_ratings_created_at ON ratings(created_at DESC);

-- ============================================================================
-- CREDIBILITY SCORES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS credibility_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farmer_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 500 CHECK (score >= 300 AND score <= 900),
  transaction_history DECIMAL(5, 2) DEFAULT 0.00,
  payment_reliability DECIMAL(5, 2) DEFAULT 0.00,
  farming_consistency DECIMAL(5, 2) DEFAULT 0.00,
  produce_quality DECIMAL(5, 2) DEFAULT 0.00,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_credibility_farmer_id ON credibility_scores(farmer_id);
CREATE INDEX IF NOT EXISTS idx_credibility_score ON credibility_scores(score DESC);

-- ============================================================================
-- CREDIBILITY SCORE HISTORY TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS credibility_score_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  credibility_score_id UUID NOT NULL REFERENCES credibility_scores(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  reason TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_credibility_history_score_id ON credibility_score_history(credibility_score_id);
CREATE INDEX IF NOT EXISTS idx_credibility_history_timestamp ON credibility_score_history(timestamp DESC);

-- ============================================================================
-- SERVICE PROVIDERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS service_providers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('LOGISTICS_PROVIDER', 'COLD_STORAGE_PROVIDER', 'SUPPLIER')),
  services TEXT[],
  location VARCHAR(255) NOT NULL,
  rating DECIMAL(3, 2) DEFAULT 0.00,
  contact_phone VARCHAR(15) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_service_providers_type ON service_providers(type);
CREATE INDEX IF NOT EXISTS idx_service_providers_location ON service_providers(location);
CREATE INDEX IF NOT EXISTS idx_service_providers_rating ON service_providers(rating DESC);

-- ============================================================================
-- LOGISTICS ORDERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS logistics_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  pickup_lat DECIMAL(10, 8) NOT NULL,
  pickup_lng DECIMAL(11, 8) NOT NULL,
  delivery_lat DECIMAL(10, 8) NOT NULL,
  delivery_lng DECIMAL(11, 8) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED')),
  vehicle_id VARCHAR(50),
  estimated_delivery_time TIMESTAMP,
  actual_delivery_time TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_logistics_transaction_id ON logistics_orders(transaction_id);
CREATE INDEX IF NOT EXISTS idx_logistics_provider_id ON logistics_orders(provider_id);
CREATE INDEX IF NOT EXISTS idx_logistics_status ON logistics_orders(status);

-- ============================================================================
-- STORAGE BOOKINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS storage_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farmer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  produce_type VARCHAR(100) NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  cost_per_day DECIMAL(10, 2) NOT NULL,
  total_cost DECIMAL(12, 2) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED', 'CANCELLED')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_storage_farmer_id ON storage_bookings(farmer_id);
CREATE INDEX IF NOT EXISTS idx_storage_provider_id ON storage_bookings(provider_id);
CREATE INDEX IF NOT EXISTS idx_storage_status ON storage_bookings(status);

-- ============================================================================
-- AUCTION LISTINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS auction_listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID UNIQUE NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  farmer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  minimum_bid_price DECIMAL(10, 2) NOT NULL,
  current_highest_bid DECIMAL(10, 2),
  current_highest_bidder UUID REFERENCES users(id) ON DELETE SET NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED', 'CANCELLED')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_auction_listing_id ON auction_listings(listing_id);
CREATE INDEX IF NOT EXISTS idx_auction_farmer_id ON auction_listings(farmer_id);
CREATE INDEX IF NOT EXISTS idx_auction_status ON auction_listings(status);
CREATE INDEX IF NOT EXISTS idx_auction_end_time ON auction_listings(end_time);

-- ============================================================================
-- BIDS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS bids (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auction_id UUID NOT NULL REFERENCES auction_listings(id) ON DELETE CASCADE,
  bidder_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bids_auction_id ON bids(auction_id);
CREATE INDEX IF NOT EXISTS idx_bids_bidder_id ON bids(bidder_id);
CREATE INDEX IF NOT EXISTS idx_bids_timestamp ON bids(timestamp DESC);

-- ============================================================================
-- GOVERNMENT SCHEMES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS government_schemes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  benefits TEXT NOT NULL,
  min_land_size DECIMAL(10, 2),
  max_land_size DECIMAL(10, 2),
  crop_types TEXT[],
  locations TEXT[],
  farmer_categories TEXT[],
  application_deadline DATE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_schemes_is_active ON government_schemes(is_active);
CREATE INDEX IF NOT EXISTS idx_schemes_deadline ON government_schemes(application_deadline);

-- ============================================================================
-- SCHEME APPLICATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS scheme_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scheme_id UUID NOT NULL REFERENCES government_schemes(id) ON DELETE CASCADE,
  farmer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  documents TEXT[],
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_scheme_apps_scheme_id ON scheme_applications(scheme_id);
CREATE INDEX IF NOT EXISTS idx_scheme_apps_farmer_id ON scheme_applications(farmer_id);
CREATE INDEX IF NOT EXISTS idx_scheme_apps_status ON scheme_applications(status);

-- ============================================================================
-- ROUTE OPTIMIZATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS route_optimizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  pickup_points JSONB NOT NULL,
  delivery_lat DECIMAL(10, 8) NOT NULL,
  delivery_lng DECIMAL(11, 8) NOT NULL,
  optimized_route JSONB NOT NULL,
  total_distance DECIMAL(10, 2) NOT NULL,
  estimated_time INTEGER NOT NULL,
  cost_savings DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_route_provider_id ON route_optimizations(provider_id);
CREATE INDEX IF NOT EXISTS idx_route_created_at ON route_optimizations(created_at DESC);

-- ============================================================================
-- VEHICLE TRACKING TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS vehicle_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  logistics_order_id UUID NOT NULL REFERENCES logistics_orders(id) ON DELETE CASCADE,
  vehicle_id VARCHAR(50) NOT NULL,
  current_lat DECIMAL(10, 8) NOT NULL,
  current_lng DECIMAL(11, 8) NOT NULL,
  speed DECIMAL(5, 2) NOT NULL,
  estimated_arrival TIMESTAMP NOT NULL,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vehicle_tracking_order_id ON vehicle_tracking(logistics_order_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_tracking_vehicle_id ON vehicle_tracking(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_tracking_last_updated ON vehicle_tracking(last_updated DESC);

-- ============================================================================
-- DISPUTES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS disputes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  initiated_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'INITIATED' CHECK (status IN ('INITIATED', 'UNDER_REVIEW', 'RESOLVED', 'ESCALATED')),
  resolution TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_disputes_transaction_id ON disputes(transaction_id);
CREATE INDEX IF NOT EXISTS idx_disputes_initiated_by ON disputes(initiated_by);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);

-- ============================================================================
-- DISPUTE EVIDENCE TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS dispute_evidence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dispute_id UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('PHOTO', 'MESSAGE', 'DOCUMENT')),
  content TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_dispute_evidence_dispute_id ON dispute_evidence(dispute_id);
CREATE INDEX IF NOT EXISTS idx_dispute_evidence_timestamp ON dispute_evidence(timestamp DESC);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_listings_updated_at ON listings;
CREATE TRIGGER update_listings_updated_at BEFORE UPDATE ON listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_credibility_scores_updated_at ON credibility_scores;
CREATE TRIGGER update_credibility_scores_updated_at BEFORE UPDATE ON credibility_scores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
