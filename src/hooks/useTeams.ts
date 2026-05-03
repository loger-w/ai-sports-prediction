import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { TeamRow } from '@/types/predictions/recommendation'

export function useTeams(sportId: string = 'mlb') {
  return useQuery({
    queryKey: ['teams', sportId],
    queryFn: async (): Promise<TeamRow[]> => {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('sport_id', sportId)
        .order('abbreviation')
      if (error) throw error
      return (data ?? []) as TeamRow[]
    },
    staleTime: 5 * 60_000,
  })
}
