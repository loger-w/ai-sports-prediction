import type { SupabaseClient } from '@supabase/supabase-js'
import type { GameStatus } from '@/types/predictions/recommendation'

export interface CreateGameInput {
  sport_id: string
  home_team_id: string
  away_team_id: string
  game_date: string                 // YYYY-MM-DD
  game_time: string                 // YYYY-MM-DD HH:mm:ss (Taiwan local, no TZ)
  status: GameStatus
}

export type UpdateGamePatch = Partial<CreateGameInput>

export interface AdminGamesApi {
  createGame: (input: CreateGameInput) => Promise<{
    id: string | null
    error: { message: string } | null
  }>
  createGames: (inputs: CreateGameInput[]) => Promise<{
    ids: string[]
    error: { message: string } | null
  }>
  updateGame: (id: string, patch: UpdateGamePatch) => Promise<{
    error: { message: string } | null
  }>
  deleteGame: (id: string) => Promise<{
    error: { message: string } | null
  }>
  deleteGames: (ids: string[]) => Promise<{
    error: { message: string } | null
  }>
}

export function makeAdminGamesApi(supabase: SupabaseClient): AdminGamesApi {
  return {
    createGame: async (input) => {
      const { data, error } = await supabase
        .from('games')
        .insert(input)
        .select('id')
        .single()
      const id = (data?.id as string | undefined) ?? null
      return { id, error }
    },
    createGames: async (inputs) => {
      const { data, error } = await supabase
        .from('games')
        .insert(inputs)
        .select('id')
      const ids = ((data ?? []) as { id: string }[]).map((r) => r.id)
      return { ids, error }
    },
    updateGame: async (id, patch) => {
      const { error } = await supabase
        .from('games')
        .update(patch)
        .eq('id', id)
      return { error }
    },
    deleteGame: async (id) => {
      const { error } = await supabase
        .from('games')
        .delete()
        .eq('id', id)
      return { error }
    },
    deleteGames: async (ids) => {
      const { error } = await supabase.from('games').delete().in('id', ids)
      return { error }
    },
  }
}
