-- Migration: Create translation_feedback table
-- Purpose: Store user feedback on translation quality
-- Requirements: 16.1, 16.2, 16.3, 16.5

CREATE TABLE IF NOT EXISTS translation_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  original_text TEXT NOT NULL,
  translated_text TEXT NOT NULL,
  source_language VARCHAR(10) NOT NULL,
  target_language VARCHAR(10) NOT NULL,
  suggested_translation TEXT,
  feedback_type VARCHAR(50) NOT NULL CHECK (feedback_type IN ('incorrect', 'poor_quality', 'suggestion', 'offensive')),
  context TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'rejected')),
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_translation_feedback_user_id ON translation_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_translation_feedback_status ON translation_feedback(status);
CREATE INDEX IF NOT EXISTS idx_translation_feedback_target_language ON translation_feedback(target_language);
CREATE INDEX IF NOT EXISTS idx_translation_feedback_created_at ON translation_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_translation_feedback_feedback_type ON translation_feedback(feedback_type);

-- Composite index for quality metrics per language
CREATE INDEX IF NOT EXISTS idx_translation_feedback_language_status 
  ON translation_feedback(target_language, status, created_at DESC);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_translation_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER translation_feedback_updated_at
  BEFORE UPDATE ON translation_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_translation_feedback_updated_at();

-- Comments for documentation
COMMENT ON TABLE translation_feedback IS 'Stores user feedback on translation quality for continuous improvement';
COMMENT ON COLUMN translation_feedback.feedback_type IS 'Type of feedback: incorrect, poor_quality, suggestion, offensive';
COMMENT ON COLUMN translation_feedback.status IS 'Review status: pending, reviewed, resolved, rejected';
COMMENT ON COLUMN translation_feedback.suggested_translation IS 'User-provided alternative translation';
