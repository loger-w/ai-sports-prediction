// src/types/predictions/vote.ts
import type { Market } from './recommendation'

export type VoteValue = -1 | 1

export interface VoteRow {
  user_id: string
  game_id: string
  market: Market
  value: VoteValue
  created_at: string
  updated_at: string
}

/** Stable string key for indexing votes / counts by recommendation. */
export function recKey(game_id: string, market: Market): string {
  return `${game_id}:${market}`
}
