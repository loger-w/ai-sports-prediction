-- 005_manual_ingest_pipeline.sql
-- Additive schema for the manual ingest pipeline.
-- No drops, no renames — safe to apply on top of 004.

-- 1. Add over/under recommendation column to predictions.
--    (moneyline/run_line picks already exist as moneyline_pick / spread_pick.)
ALTER TABLE predictions
  ADD COLUMN IF NOT EXISTS ou_rec TEXT
    CHECK (ou_rec IN ('over', 'under'));

-- 2. Add per-market result columns to prediction_results.
--    These carry the skill-calculated verdict verbatim.
--    Existing boolean columns (winner_correct, over_under_correct,
--    spread_correct) remain in place and are dual-written by the new
--    ingest API for accuracy-dashboard backward compatibility.
ALTER TABLE prediction_results
  ADD COLUMN IF NOT EXISTS ml_result TEXT
    CHECK (ml_result IN ('WIN', 'LOSS', 'PUSH', 'PASS')),
  ADD COLUMN IF NOT EXISTS ou_result TEXT
    CHECK (ou_result IN ('WIN', 'LOSS', 'PUSH', 'PASS')),
  ADD COLUMN IF NOT EXISTS run_line_result TEXT
    CHECK (run_line_result IN ('WIN', 'LOSS', 'PUSH', 'PASS'));
