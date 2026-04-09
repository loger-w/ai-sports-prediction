-- Sports supported by the platform
CREATE TABLE IF NOT EXISTS sports (
  id TEXT PRIMARY KEY,
  name_en TEXT NOT NULL,
  name_zh TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true
);

-- Teams
CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  sport_id TEXT NOT NULL REFERENCES sports(id),
  name_en TEXT NOT NULL,
  name_zh TEXT NOT NULL,
  abbreviation TEXT NOT NULL,
  logo_url TEXT
);

-- Individual games
CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sport_id TEXT NOT NULL REFERENCES sports(id),
  home_team_id TEXT NOT NULL REFERENCES teams(id),
  away_team_id TEXT NOT NULL REFERENCES teams(id),
  game_date DATE NOT NULL,
  game_time TIMESTAMPTZ,
  slug TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  home_score INTEGER,
  away_score INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(sport_id, slug)
);

-- AI predictions
CREATE TABLE IF NOT EXISTS predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id),
  model_version TEXT NOT NULL DEFAULT 'v1',
  home_win_pct DECIMAL(5,2) NOT NULL,
  away_win_pct DECIMAL(5,2) NOT NULL,
  predicted_winner TEXT NOT NULL,
  confidence_level TEXT NOT NULL,
  over_under_line DECIMAL(5,1),
  over_pct DECIMAL(5,2),
  under_pct DECIMAL(5,2),
  explanation_en TEXT,
  explanation_zh TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(game_id, model_version)
);

-- Prediction results
CREATE TABLE IF NOT EXISTS prediction_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_id UUID NOT NULL REFERENCES predictions(id),
  game_id UUID NOT NULL REFERENCES games(id),
  winner_correct BOOLEAN,
  over_under_correct BOOLEAN,
  resolved_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(prediction_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_games_sport_date ON games(sport_id, game_date);
CREATE INDEX IF NOT EXISTS idx_games_slug ON games(slug);
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_predictions_game ON predictions(game_id);
CREATE INDEX IF NOT EXISTS idx_results_game ON prediction_results(game_id);

-- RLS
ALTER TABLE sports ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prediction_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read sports" ON sports FOR SELECT USING (true);
CREATE POLICY "Public read teams" ON teams FOR SELECT USING (true);
CREATE POLICY "Public read games" ON games FOR SELECT USING (true);
CREATE POLICY "Public read predictions" ON predictions FOR SELECT USING (true);
CREATE POLICY "Public read results" ON prediction_results FOR SELECT USING (true);
