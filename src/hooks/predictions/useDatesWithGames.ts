import { useQuery } from '@tanstack/react-query'
import { fetchDatesWithGames } from '@/services/predictions/api'

export function useDatesWithGames(from: string, to: string) {
  return useQuery({
    queryKey: ['datesWithGames', from, to],
    queryFn: () => fetchDatesWithGames(from, to),
    staleTime: 5 * 60 * 1000,
  })
}
