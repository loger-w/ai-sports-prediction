// ── Database row types ──────────────────────────────────────────────────────

export interface Sport {
  id: string
  name_en: string
  name_zh: string
  is_active: boolean
}

export interface Team {
  id: string
  sport_id: string
  name_en: string
  name_zh: string
  abbreviation: string
  logo_url: string | null
}

export interface Game {
  id: string
  sport_id: string
  home_team_id: string
  away_team_id: string
  game_date: string
  game_time: string | null
  slug: string
  status: 'scheduled' | 'final'
  home_score: number | null
  away_score: number | null
  created_at: string
}

export interface Prediction {
  id: string
  game_id: string
  model_version: string
  moneyline_home_pct: number
  moneyline_away_pct: number
  moneyline_pick: 'home' | 'away'
  moneyline_stars: number
  spread_line: number | null
  spread_pick: 'home' | 'away' | null
  spread_pct: number | null
  spread_stars: number
  over_under_line: number | null
  over_pct: number | null
  under_pct: number | null
  over_under_stars: number
  explanation_en: string | null
  explanation_zh: string | null
  created_at: string
}

export interface PredictionResult {
  id: string
  prediction_id: string
  game_id: string
  winner_correct: boolean | null
  spread_correct: boolean | null
  over_under_correct: boolean | null
  resolved_at: string
}

// ── Claude Skill JSON input schema ──────────────────────────────────────────

export interface SkillPrediction {
  home_team: string
  away_team: string
  game_time: string
  moneyline_home_pct: number
  moneyline_away_pct: number
  moneyline_stars: number
  spread_line: number | null
  spread_pick: 'home' | 'away' | null
  spread_pct: number | null
  spread_stars: number
  over_under_line: number | null
  over_pct: number | null
  under_pct: number | null
  over_under_stars: number
  explanation_en: string
  explanation_zh: string
}

export interface ClaudeSkillInput {
  /** 'YYYY-MM-DD' */
  date: string
  sport: 'nba' | 'mlb'
  predictions: SkillPrediction[]
}

// ── ESPN API response types ─────────────────────────────────────────────────

export interface ESPNCompetitor {
  homeAway: 'home' | 'away'
  score: string
  team: {
    abbreviation: string
  }
}

export interface ESPNEvent {
  competitions: Array<{
    competitors: ESPNCompetitor[]
    status: {
      type: {
        completed: boolean
      }
    }
  }>
}

export interface ESPNScoreboard {
  events: ESPNEvent[]
}

// ── Accuracy stats (from DB view) ───────────────────────────────────────────

export interface AccuracyStats {
  sport_id: string
  game_date: string
  total_predictions: number
  winner_correct_count: number
  ou_correct_count: number
  winner_pct: number
  ou_pct: number
}
