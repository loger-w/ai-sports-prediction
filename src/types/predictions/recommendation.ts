// src/types/predictions/recommendation.ts

export type Market = 'ml' | 'spread' | 'ou'
export type Pick = 'home' | 'away' | 'over' | 'under'
export type RecResult = 'win' | 'loss' | 'push' | 'void'
export type GameStatus = 'scheduled' | 'final' | 'void'
export type Audience = 'all' | 'premium'

export interface TeamRow {
  id: string
  sport_id: string
  name_zh: string
  abbreviation: string
  logo_url: string | null
  external_id: number | null
}

/** Minimal team shape used by the recommendation list/grid UI. */
export interface TeamCard {
  abbreviation: string
  name_zh: string
}

export interface GameRow {
  id: string
  sport_id: string
  home_team_id: string
  away_team_id: string
  game_date: string             // YYYY-MM-DD (Taiwan)
  game_time: string             // YYYY-MM-DD HH:mm:ss (Taiwan, no TZ)
  status: GameStatus
}

export interface RecommendationRow {
  game_id: string
  market: Market
  audience: Audience            // 'all' = visible to anyone, 'premium' = entitled only
  // pick/line/stars/result are masked (NULL) by the recommendations_public view
  // when the viewer is not entitled to a 'premium' row.
  pick: Pick | null
  line: number | null           // ml=null; spread/ou required when entitled
  stars: number | null          // 1-5 when entitled
  result: RecResult | null      // null = pending OR masked
  vote_up_count: number         // 0 when masked
  vote_down_count: number
  source?: 'cron' | 'manual'
}

/** Fully joined row used by the recommendation list/grid UI. */
export interface RecommendationWithGame extends RecommendationRow {
  game: GameRow & {
    home_team: TeamCard
    away_team: TeamCard
  }
}
