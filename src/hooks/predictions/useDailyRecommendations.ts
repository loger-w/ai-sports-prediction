// src/hooks/predictions/useDailyRecommendations.ts
import { useQuery } from '@tanstack/react-query'
import {
  fetchDailyRecommendations,
  fetchRecommendationCounts,
} from '@/services/predictions/api'
import { usePredictionStore } from '@/stores/predictions/predictionStore'

export function useDailyRecommendations() {
  const { sport, dateRange, markets, minStars, sortBy } = usePredictionStore()
  const marketArr = [...markets]

  return useQuery({
    queryKey: ['recommendations', sport, dateRange, marketArr.sort().join(','), minStars, sortBy],
    queryFn: () =>
      fetchDailyRecommendations({ sport, dateRange, markets: marketArr, minStars, sortBy }),
  })
}

export function useRecommendationCounts() {
  const dateRange = usePredictionStore((s) => s.dateRange)
  return useQuery({
    queryKey: ['recommendationCounts', dateRange],
    queryFn: () => fetchRecommendationCounts(dateRange),
    staleTime: 60_000,
  })
}
