-- 011_drop_game_scores.sql
-- Remove home_score / away_score from games. The product no longer surfaces
-- final scores; recommendation result is the only outcome we record.

ALTER TABLE games
  DROP COLUMN IF EXISTS home_score,
  DROP COLUMN IF EXISTS away_score;
