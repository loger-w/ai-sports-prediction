import type { SupabaseClient } from '@supabase/supabase-js'
import type { Market } from '@/types/predictions/recommendation'
import type { VoteRow, VoteValue } from '@/types/predictions/vote'

export interface VotesApi {
  fetchUserVotes: (userId: string) => Promise<VoteRow[]>
  upsertVote: (input: {
    user_id: string
    game_id: string
    market: Market
    value: VoteValue
  }) => Promise<{ error: { message: string } | null }>
  deleteVote: (input: {
    user_id: string
    game_id: string
    market: Market
  }) => Promise<{ error: { message: string } | null }>
}

export function makeVotesApi(supabase: SupabaseClient): VotesApi {
  return {
    fetchUserVotes: async (userId) => {
      const { data, error } = await supabase
        .from('votes')
        .select('*')
        .eq('user_id', userId)
      if (error) throw error
      return (data ?? []) as VoteRow[]
    },

    upsertVote: async ({ user_id, game_id, market, value }) => {
      const { error } = await supabase
        .from('votes')
        .upsert(
          { user_id, game_id, market, value },
          { onConflict: 'user_id,game_id,market' },
        )
      return { error }
    },

    deleteVote: async ({ user_id, game_id, market }) => {
      const { error } = await supabase
        .from('votes')
        .delete()
        .eq('user_id', user_id)
        .eq('game_id', game_id)
        .eq('market', market)
      return { error }
    },
  }
}
