-- Migration: Add listing_media support to PostgreSQL
-- Date: 2024
-- Description: Adds tables and triggers for listing media (photos, videos, PDFs)

-- Media table for listing attachments
CREATE TABLE IF NOT EXISTS listing_media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID NOT NULL,
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_listing_media_listing_id ON listing_media(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_media_type ON listing_media(media_type);
CREATE INDEX IF NOT EXISTS idx_listing_media_primary ON listing_media(listing_id, is_primary) WHERE is_primary = TRUE;
CREATE INDEX IF NOT EXISTS idx_listing_media_order ON listing_media(listing_id, display_order);

-- Ensure only one primary media per listing
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_primary_per_listing ON listing_media(listing_id) WHERE is_primary = TRUE;

-- Trigger to update listing's updated_at when media changes
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

DROP TRIGGER IF EXISTS trigger_update_listing_on_media_change ON listing_media;
CREATE TRIGGER trigger_update_listing_on_media_change
AFTER INSERT OR UPDATE OR DELETE ON listing_media
FOR EACH ROW
EXECUTE FUNCTION update_listing_timestamp();

-- Note: sync_status table initialization removed - not needed for core functionality
