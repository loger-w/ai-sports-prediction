-- 004_phase3_schema.sql

-- 1. Add per-dimension star columns (before dropping confidence_level)
ALTER TABLE predictions
  ADD COLUMN IF NOT EXISTS moneyline_stars INTEGER NOT NULL DEFAULT 3
    CHECK (moneyline_stars BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS spread_stars INTEGER NOT NULL DEFAULT 3
    CHECK (spread_stars BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS over_under_stars INTEGER NOT NULL DEFAULT 3
    CHECK (over_under_stars BETWEEN 1 AND 5);

-- 2. Drop old confidence column
ALTER TABLE predictions DROP COLUMN IF EXISTS confidence_level;

-- 3. Rename moneyline columns for clarity
ALTER TABLE predictions RENAME COLUMN predicted_winner TO moneyline_pick;
ALTER TABLE predictions RENAME COLUMN home_win_pct TO moneyline_home_pct;
ALTER TABLE predictions RENAME COLUMN away_win_pct TO moneyline_away_pct;

-- 4. Add spread columns
ALTER TABLE predictions
  ADD COLUMN IF NOT EXISTS spread_line DECIMAL(5,1),
  ADD COLUMN IF NOT EXISTS spread_pick TEXT,
  ADD COLUMN IF NOT EXISTS spread_pct DECIMAL(5,2);

-- 5. Add spread resolution to prediction_results
ALTER TABLE prediction_results
  ADD COLUMN IF NOT EXISTS spread_correct BOOLEAN;
