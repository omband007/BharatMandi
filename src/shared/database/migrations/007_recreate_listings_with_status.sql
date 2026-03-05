-- Migration: 007_recreate_listings_with_status.sql
-- Description: Recreate listings table with status enum and enhanced fields
-- Requirements: 2.1, 2.2, 2.3, 2.4, 15.1, 15.2, 15.3, 15.4, 15.7, 18.1, 18.2, 18.3, 18.4, 19.6, 19.7
-- Development Phase: Using DROP TABLE IF EXISTS + CREATE TABLE (no data preservation)

-- ============================================================================
-- PostgreSQL Schema
-- ============================================================================

-- Drop existing tables (CASCADE to handle foreign keys)
DROP TABLE IF EXISTS listing_media CASCADE;
DROP TABLE IF EXISTS listings CASCADE;

-- Drop existing enum types if present
DROP TYPE IF EXISTS listing_status CASCADE;
DROP TYPE IF EXISTS listing_type CASCADE;
DROP TYPE IF EXISTS payment_method_preference CASCADE;
DROP TYPE IF EXISTS sale_channel CASCADE;

-- Create enum types
CREATE TYPE listing_status AS ENUM ('ACTIVE', 'SOLD', 'EXPIRED', 'CANCELLED');
CREATE TYPE listing_type AS ENUM ('PRE_HARVEST', 'POST_HARVEST');
CREATE TYPE payment_method_preference AS ENUM ('PLATFORM_ONLY', 'DIRECT_ONLY', 'BOTH');
CREATE TYPE sale_channel AS ENUM ('PLATFORM_ESCROW', 'PLATFORM_DIRECT', 'EXTERNAL');

-- Create listings table with new schema
CREATE TABLE listings (
    id VARCHAR(36) PRIMARY KEY,
    farmer_id VARCHAR(36) NOT NULL,
    produce_type VARCHAR(255) NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    price_per_kg DECIMAL(10,2) NOT NULL,
    certificate_id VARCHAR(36) NOT NULL,
    expected_harvest_date TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Status tracking fields
    status listing_status NOT NULL DEFAULT 'ACTIVE',
    sold_at TIMESTAMP,
    transaction_id VARCHAR(36),
    expired_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    cancelled_by VARCHAR(36),
    
    -- Perishability-based expiration fields
    listing_type listing_type NOT NULL DEFAULT 'POST_HARVEST',
    produce_category_id VARCHAR(36) NOT NULL,
    expiry_date TIMESTAMP NOT NULL,
    
    -- Manual sale confirmation fields
    payment_method_preference payment_method_preference NOT NULL DEFAULT 'BOTH',
    sale_channel sale_channel,
    sale_price DECIMAL(10,2),
    sale_notes TEXT,
    
    -- Foreign keys
    FOREIGN KEY (farmer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (produce_category_id) REFERENCES produce_categories(id),
    FOREIGN KEY (transaction_id) REFERENCES transactions(id),
    FOREIGN KEY (cancelled_by) REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT chk_sold_at_when_sold 
        CHECK ((status = 'SOLD' AND sold_at IS NOT NULL) OR status != 'SOLD'),
    CONSTRAINT chk_expired_at_when_expired 
        CHECK ((status = 'EXPIRED' AND expired_at IS NOT NULL) OR status != 'EXPIRED'),
    CONSTRAINT chk_cancelled_at_when_cancelled 
        CHECK ((status = 'CANCELLED' AND cancelled_at IS NOT NULL) OR status != 'CANCELLED')
);

-- Create indexes
CREATE INDEX idx_listings_farmer ON listings(farmer_id);
CREATE INDEX idx_listings_status ON listings(status);
CREATE INDEX idx_listings_expiry_date_status ON listings(expiry_date, status) WHERE status = 'ACTIVE';
CREATE INDEX idx_listings_category ON listings(produce_category_id);
CREATE INDEX idx_listings_created_at ON listings(created_at);

-- Recreate listing_media table with foreign key to new listings table
CREATE TABLE listing_media (
  id VARCHAR(36) PRIMARY KEY,
  listing_id VARCHAR(36) NOT NULL,
  media_type VARCHAR(20) NOT NULL CHECK (media_type IN ('photo', 'video', 'document')),
  file_name VARCHAR(255) NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  storage_url TEXT NOT NULL,
  thumbnail_url TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_primary BOOLEAN DEFAULT FALSE,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
);

-- Indexes for listing_media
CREATE INDEX idx_listing_media_listing_id ON listing_media(listing_id);
CREATE INDEX idx_listing_media_type ON listing_media(media_type);
CREATE INDEX idx_listing_media_primary ON listing_media(listing_id, is_primary) WHERE is_primary = TRUE;
CREATE INDEX idx_listing_media_order ON listing_media(listing_id, display_order);
CREATE UNIQUE INDEX idx_one_primary_per_listing ON listing_media(listing_id) WHERE is_primary = TRUE;

-- Recreate trigger for listing_media
CREATE OR REPLACE FUNCTION update_listing_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE listings SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.listing_id;
    RETURN OLD;
  ELSE
    UPDATE listings SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.listing_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_listing_on_media_change
AFTER INSERT OR UPDATE OR DELETE ON listing_media
FOR EACH ROW
EXECUTE FUNCTION update_listing_timestamp();

-- Add comments for documentation
COMMENT ON TABLE listings IS 'Marketplace listings with status tracking and perishability-based expiration';
COMMENT ON COLUMN listings.status IS 'Current listing status: ACTIVE, SOLD, EXPIRED, or CANCELLED';
COMMENT ON COLUMN listings.listing_type IS 'PRE_HARVEST (before harvest) or POST_HARVEST (after harvest)';
COMMENT ON COLUMN listings.expiry_date IS 'Calculated as harvest_date + category.expiry_period_hours';
COMMENT ON COLUMN listings.payment_method_preference IS 'Farmer preference: PLATFORM_ONLY, DIRECT_ONLY, or BOTH';
COMMENT ON COLUMN listings.sale_channel IS 'How listing was sold: PLATFORM_ESCROW, PLATFORM_DIRECT, or EXTERNAL';
