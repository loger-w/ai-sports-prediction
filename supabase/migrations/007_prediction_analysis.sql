-- 007_prediction_analysis.sql
-- Add JSONB column for rich game analysis data (GameAnalysis schema v1.0).
-- Nullable: existing predictions without analysis continue to work unchanged.

ALTER TABLE predictions
  ADD COLUMN IF NOT EXISTS analysis JSONB;

-- Partial GIN index for non-null analysis (supports @> containment queries)
CREATE INDEX IF NOT EXISTS idx_predictions_analysis
  ON predictions USING GIN (analysis)
  WHERE analysis IS NOT NULL;

COMMENT ON COLUMN predictions.analysis IS
  'Structured game analysis JSON conforming to GameAnalysis schema v1.0';
