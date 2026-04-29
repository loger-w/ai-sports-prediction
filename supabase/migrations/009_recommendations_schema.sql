-- 009_recommendations_schema.sql
-- Introduce Recommendation-centric model.
-- games: pure game info (no embedded markets). Stores Taiwan local time as TIMESTAMP.
-- recommendations: 0..N rows per game keyed (game_id, market).

CREATE TABLE games (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sport_id      TEXT NOT NULL REFERENCES sports(id),
  home_team_id  TEXT NOT NULL REFERENCES teams(id),
  away_team_id  TEXT NOT NULL REFERENCES teams(id),
  game_date     DATE NOT NULL,
  game_time     TIMESTAMP NOT NULL,
  status        TEXT NOT NULL DEFAULT 'scheduled'
                CHECK (status IN ('scheduled', 'final', 'void')),
  home_score    INTEGER,
  away_score    INTEGER,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (game_date, home_team_id, away_team_id, game_time)
);

CREATE INDEX idx_games_date_sport ON games (game_date, sport_id);

CREATE TABLE recommendations (
  game_id     UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  market      TEXT NOT NULL CHECK (market IN ('ml', 'spread', 'ou')),
  pick        TEXT NOT NULL CHECK (pick IN ('home', 'away', 'over', 'under')),
  line        DECIMAL(5,1),
  stars       INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
  result      TEXT CHECK (result IN ('win', 'loss', 'push', 'void')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (game_id, market)
);

CREATE INDEX idx_recs_game ON recommendations (game_id);
CREATE INDEX idx_recs_market_stars ON recommendations (market, stars);

-- updated_at triggers
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_games_updated_at
  BEFORE UPDATE ON games
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_recs_updated_at
  BEFORE UPDATE ON recommendations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Row-level security: public read, no write from anon
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read games" ON games FOR SELECT USING (true);
CREATE POLICY "Public read recommendations" ON recommendations FOR SELECT USING (true);
