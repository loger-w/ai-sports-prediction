// src/types/predictions/index.ts
// Public types for the prediction domain. Old detail-page types removed.

export type {
  Market,
  Pick,
  RecResult,
  GameStatus,
  TeamRow,
  GameRow,
  RecommendationRow,
  RecommendationWithGame,
} from './recommendation'

import type { Market, Pick, RecResult } from './recommendation'

// ── Sports / Teams (preserved schema) ────────────────────────────────────────

export interface Sport {
  id: string
  name_zh: string
  is_active: boolean
}

// ── Manual ingest payload types ──────────────────────────────────────────────

export interface RecommendationInput {
  market: Market
  pick: Pick
  line: number | null
  stars: number   // 1-5
}

export interface GameInput {
  home_team: string                 // MLB abbreviation, e.g. "LAD"
  away_team: string
  game_time: string                 // Taiwan local "YYYY-MM-DD HH:mm:ss"
  recommendations: RecommendationInput[]
}

export interface PredictionsPayload {
  date: string                      // YYYY-MM-DD (Taiwan)
  games: GameInput[]
}

export interface RecommendationResultInput {
  market: Market
  result: RecResult
}

export interface GameResultInput {
  home_team: string
  away_team: string
  game_time: string
  home_score: number
  away_score: number
  recommendations: RecommendationResultInput[]
}

export interface ResultsPayload {
  date: string
  results: GameResultInput[]
}

export interface ScheduleGame {
  home_team: string
  away_team: string
  game_time: string                 // Taiwan local
}

export interface SchedulePayload {
  date: string
  games: ScheduleGame[]
}

// ── Ingest API response ──────────────────────────────────────────────────────

export interface IngestItemResult {
  game: string                      // "{home}-vs-{away}@{time}" for diagnostics
  status: 'upserted' | 'error' | 'no_game'
  error?: string
  recs_written?: number
}

export interface IngestResponse {
  total: number
  upserted: number
  errors: number
  results: IngestItemResult[]
}
