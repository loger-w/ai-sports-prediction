// src/types/predictions/recommendation.ts

export type Market = 'ml' | 'spread' | 'ou'
export type Pick = 'home' | 'away' | 'over' | 'under'
export type RecResult = 'win' | 'loss' | 'push' | 'void'
export type GameStatus = 'scheduled' | 'final' | 'void'

export interface TeamRow {
  id: string
  sport_id: string
  name_zh: string
  abbreviation: string
  logo_url: string | null
}

export interface GameRow {
  id: string
  sport_id: string
  home_team_id: string
  away_team_id: string
  game_date: string             // YYYY-MM-DD (Taiwan)
  game_time: string             // YYYY-MM-DD HH:mm:ss (Taiwan, no TZ)
  status: GameStatus
  home_score: number | null
  away_score: number | null
}

export interface RecommendationRow {
  game_id: string
  market: Market
  pick: Pick
  line: number | null           // ml=null; spread/ou required
  stars: number                 // 1-5
  result: RecResult | null      // null = pending
}

/** Fully joined row used by the recommendation list/grid UI. */
export interface RecommendationWithGame extends RecommendationRow {
  game: GameRow & {
    home_team: TeamRow
    away_team: TeamRow
  }
}
