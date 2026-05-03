import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  Market,
  Pick as RecPick,
  RecResult,
} from '@/types/predictions/recommendation'

export interface CreateRecommendationInput {
  game_id: string
  market: Market
  pick: RecPick
  line: number | null
  stars: number
}

export type UpdateRecommendationPatch = Partial<{
  pick: RecPick
  line: number | null
  stars: number
  result: RecResult | null
}>

export interface AdminRecommendationsApi {
  createRecommendations: (rows: CreateRecommendationInput[]) => Promise<{
    error: { message: string } | null
  }>
  updateRecommendation: (
    game_id: string,
    market: Market,
    patch: UpdateRecommendationPatch,
  ) => Promise<{ error: { message: string } | null }>
  deleteRecommendation: (
    game_id: string,
    market: Market,
  ) => Promise<{ error: { message: string } | null }>
  setRecommendationResult: (
    game_id: string,
    market: Market,
    result: RecResult | null,
  ) => Promise<{ error: { message: string } | null }>
}

export function makeAdminRecommendationsApi(
  supabase: SupabaseClient,
): AdminRecommendationsApi {
  return {
    createRecommendations: async (rows) => {
      const payload = rows.map((r) => ({ ...r, source: 'manual' as const }))
      const { error } = await supabase.from('recommendations').insert(payload)
      return { error }
    },
    updateRecommendation: async (game_id, market, patch) => {
      const { error } = await supabase
        .from('recommendations')
        .update(patch)
        .eq('game_id', game_id)
        .eq('market', market)
      return { error }
    },
    deleteRecommendation: async (game_id, market) => {
      const { error } = await supabase
        .from('recommendations')
        .delete()
        .eq('game_id', game_id)
        .eq('market', market)
      return { error }
    },
    setRecommendationResult: async (game_id, market, result) => {
      const { error } = await supabase
        .from('recommendations')
        .update({ result })
        .eq('game_id', game_id)
        .eq('market', market)
      return { error }
    },
  }
}
