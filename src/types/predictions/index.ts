// ── Analysis schema (v1.0) ──────────────────────────────────────────────────
export type { GameAnalysis } from './analysis'
export * from './analysis'

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
  ou_rec: 'over' | 'under' | null
  over_pct: number | null
  under_pct: number | null
  over_under_stars: number
  explanation_en: string | null
  explanation_zh: string | null
  analysis: import('./analysis').GameAnalysis | null
  created_at: string
}

export interface PredictionResult {
  id: string
  prediction_id: string
  game_id: string
  winner_correct: boolean | null
  spread_correct: boolean | null
  over_under_correct: boolean | null
  ml_result: 'WIN' | 'LOSS' | 'PUSH' | 'PASS' | null
  ou_result: 'WIN' | 'LOSS' | 'PUSH' | 'PASS' | null
  run_line_result: 'WIN' | 'LOSS' | 'PUSH' | 'PASS' | null
  resolved_at: string
}

// ── Shared result type ───────────────────────────────────────────────────────

export type MarketResult = 'WIN' | 'LOSS' | 'PUSH' | 'PASS'

// ── Manual Ingest API payload types ─────────────────────────────────────────

export interface ScheduleGame {
  home_team: string      // MLB abbreviation e.g. "LAD"
  away_team: string
  game_time: string      // ISO 8601 UTC
}

export interface SchedulePayload {
  date: string           // YYYY-MM-DD
  games: ScheduleGame[]
}

export interface PredictionItem {
  // natural key
  home_team:          string
  away_team:          string
  game_time:          string
  // moneyline (null = PASS)
  predicted_winner:   'home' | 'away' | null
  predicted_home_pct: number | null
  ml_stars:           number | null       // 1–5
  // over/under (null = PASS)
  ou_line:            number | null
  ou_rec:             'over' | 'under' | null
  ou_stars:           number | null       // 1–5
  // run line (null = PASS)
  run_line:           number | null
  run_line_rec:       'home' | 'away' | null
  run_line_stars:     number | null       // 1–5
  // structured analysis (optional)
  analysis?:          import('./analysis').GameAnalysis | null
}

export interface PredictionsPayload {
  date:        string
  predictions: PredictionItem[]
}

export interface ResultItem {
  home_team:         string
  away_team:         string
  game_time:         string
  actual_home_score: number
  actual_away_score: number
  ml_result:         MarketResult | null
  ou_result:         MarketResult | null
  run_line_result:   MarketResult | null
}

export interface ResultsPayload {
  date:    string
  results: ResultItem[]
}

// ── Ingest API response ──────────────────────────────────────────────────────

export interface IngestItemResult {
  slug:   string
  status: 'upserted' | 'error' | 'no_prediction'
  error?: string
}

export interface IngestResponse {
  total:    number
  upserted: number
  errors:   number
  results:  IngestItemResult[]
}

// ── ESPN API response types (used by old cron — kept for reference) ──────────

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
