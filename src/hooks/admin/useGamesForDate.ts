import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Audience, GameStatus } from '@/types/predictions/recommendation'

export interface GamesByDateRow {
  id: string
  game_date: string
  game_time: string
  status: GameStatus
  home_team: { name_zh: string; abbreviation: string }
  away_team: { name_zh: string; abbreviation: string }
  recommendations: { market: string; source: 'cron' | 'manual'; audience: Audience }[]
}

/**
 * Fetches all games scheduled for `date` (YYYY-MM-DD in TW-local), including
 * games with no recommendations. Used by the admin by-date management view.
 */
export function useGamesForDate(date: string) {
  return useQuery({
    queryKey: ['admin', 'games', 'by-date', date],
    queryFn: async (): Promise<GamesByDateRow[]> => {
      const { data, error } = await supabase
        .from('games')
        .select(`
          id, game_date, game_time, status,
          home_team:teams!games_home_team_id_fkey(name_zh, abbreviation),
          away_team:teams!games_away_team_id_fkey(name_zh, abbreviation),
          recommendations(market, source, audience)
        `)
        .eq('game_date', date)
        .order('game_time', { ascending: true })
      if (error) throw error
      return data as unknown as GamesByDateRow[]
    },
  })
}
