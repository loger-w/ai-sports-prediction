// src/hooks/predictions/useDatesWithRecommendations.ts
import { useQuery } from '@tanstack/react-query'
import { fetchDatesWithRecommendations } from '@/services/predictions/api'

export function useDatesWithRecommendations(from: string, to: string) {
  return useQuery({
    queryKey: ['datesWithRecommendations', from, to],
    queryFn: () => fetchDatesWithRecommendations(from, to),
    staleTime: 5 * 60 * 1000,
  })
}
