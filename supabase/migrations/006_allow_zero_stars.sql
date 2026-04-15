-- 006_allow_zero_stars.sql
-- Allow stars = 0 to represent PASS (evaluated but no recommendation).
-- Existing values (1-5) remain valid; 0 is the new PASS sentinel.

ALTER TABLE predictions DROP CONSTRAINT IF EXISTS predictions_moneyline_stars_check;
ALTER TABLE predictions ADD CONSTRAINT predictions_moneyline_stars_check
  CHECK (moneyline_stars BETWEEN 0 AND 5);

ALTER TABLE predictions DROP CONSTRAINT IF EXISTS predictions_spread_stars_check;
ALTER TABLE predictions ADD CONSTRAINT predictions_spread_stars_check
  CHECK (spread_stars BETWEEN 0 AND 5);

ALTER TABLE predictions DROP CONSTRAINT IF EXISTS predictions_over_under_stars_check;
ALTER TABLE predictions ADD CONSTRAINT predictions_over_under_stars_check
  CHECK (over_under_stars BETWEEN 0 AND 5);
