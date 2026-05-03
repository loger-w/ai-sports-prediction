-- Migration 015: add external_id to teams
--
-- Adds an integer column linking local teams to upstream sports APIs
-- (initially MLB statsapi.mlb.com). Used by the admin schedule importer
-- to translate MLB API team IDs into local team rows.
--
-- The seed UPDATEs below cover all 30 MLB clubs as of 2026-05.
-- Confirm 30 row updates before merging.

ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS external_id INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS teams_sport_external_id_idx
  ON teams (sport_id, external_id)
  WHERE external_id IS NOT NULL;

-- MLB team external IDs (statsapi.mlb.com /v1/teams?sportId=1)
UPDATE teams SET external_id = 109 WHERE id = 'diamondbacks';
UPDATE teams SET external_id = 144 WHERE id = 'braves';
UPDATE teams SET external_id = 110 WHERE id = 'orioles';
UPDATE teams SET external_id = 111 WHERE id = 'redsox';
UPDATE teams SET external_id = 112 WHERE id = 'cubs';
UPDATE teams SET external_id = 145 WHERE id = 'whitesox';
UPDATE teams SET external_id = 113 WHERE id = 'reds';
UPDATE teams SET external_id = 114 WHERE id = 'guardians';
UPDATE teams SET external_id = 115 WHERE id = 'rockies';
UPDATE teams SET external_id = 116 WHERE id = 'tigers';
UPDATE teams SET external_id = 117 WHERE id = 'astros';
UPDATE teams SET external_id = 118 WHERE id = 'royals';
UPDATE teams SET external_id = 108 WHERE id = 'angels';
UPDATE teams SET external_id = 119 WHERE id = 'dodgers';
UPDATE teams SET external_id = 146 WHERE id = 'marlins';
UPDATE teams SET external_id = 158 WHERE id = 'brewers';
UPDATE teams SET external_id = 142 WHERE id = 'twins';
UPDATE teams SET external_id = 121 WHERE id = 'mets';
UPDATE teams SET external_id = 147 WHERE id = 'yankees';
UPDATE teams SET external_id = 133 WHERE id = 'athletics';
UPDATE teams SET external_id = 143 WHERE id = 'phillies';
UPDATE teams SET external_id = 134 WHERE id = 'pirates';
UPDATE teams SET external_id = 135 WHERE id = 'padres';
UPDATE teams SET external_id = 137 WHERE id = 'giants';
UPDATE teams SET external_id = 136 WHERE id = 'mariners';
UPDATE teams SET external_id = 138 WHERE id = 'cardinals';
UPDATE teams SET external_id = 139 WHERE id = 'rays';
UPDATE teams SET external_id = 140 WHERE id = 'rangers';
UPDATE teams SET external_id = 141 WHERE id = 'bluejays';
UPDATE teams SET external_id = 120 WHERE id = 'nationals';

-- Sanity check: all 30 MLB teams should now have external_id set.
-- After running this migration in dashboard, run:
--   SELECT COUNT(*) FROM teams WHERE sport_id = 'mlb' AND external_id IS NOT NULL;
-- Expected: 30
