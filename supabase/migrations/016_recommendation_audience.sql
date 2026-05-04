-- 016_recommendation_audience.sql
-- Per-recommendation audience tier ('all' | 'premium').
-- Non-premium viewers (anon, regular) get sensitive fields masked via
-- recommendations_public view; base table SELECT is closed off so direct
-- reads can't bypass the mask.

ALTER TABLE recommendations
  ADD COLUMN audience TEXT NOT NULL DEFAULT 'all'
    CHECK (audience IN ('all', 'premium'));

CREATE INDEX recommendations_audience_idx ON recommendations (audience);

-- Public read view: masks pick / line / stars / result / vote counts when the
-- viewer is not entitled (audience='premium' AND role NOT IN premium/admin).
-- SECURITY INVOKER (default) so auth.jwt() reflects the caller's session.
CREATE OR REPLACE VIEW recommendations_public AS
SELECT
  r.game_id,
  r.market,
  r.audience,
  r.source,
  r.created_at,
  r.updated_at,
  CASE WHEN r.audience = 'all'
        OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('premium','admin')
       THEN r.pick   ELSE NULL END AS pick,
  CASE WHEN r.audience = 'all'
        OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('premium','admin')
       THEN r.line   ELSE NULL END AS line,
  CASE WHEN r.audience = 'all'
        OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('premium','admin')
       THEN r.stars  ELSE NULL END AS stars,
  CASE WHEN r.audience = 'all'
        OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('premium','admin')
       THEN r.result ELSE NULL END AS result,
  CASE WHEN r.audience = 'all'
        OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('premium','admin')
       THEN r.vote_up_count   ELSE 0 END AS vote_up_count,
  CASE WHEN r.audience = 'all'
        OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('premium','admin')
       THEN r.vote_down_count ELSE 0 END AS vote_down_count
FROM recommendations r;

GRANT SELECT ON recommendations_public TO anon, authenticated;

-- Tighten the base table: drop the public-read RLS (migration 009).
-- Reads now go via recommendations_public; admin write policy (014) stays.
DROP POLICY IF EXISTS "Public read recommendations" ON recommendations;
