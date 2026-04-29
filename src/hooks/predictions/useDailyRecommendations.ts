// src/hooks/predictions/useDailyRecommendations.ts
import { useQuery } from '@tanstack/react-query'
import {
  fetchDailyRecommendations,
  fetchRecommendationCounts,
} from '@/services/predictions/api'
import { usePredictionStore } from '@/stores/predictions/predictionStore'

export function useDailyRecommendations() {
  const sport = usePredictionStore((s) => s.sport)
  const dateRange = usePredictionStore((s) => s.dateRange)
  const markets = usePredictionStore((s) => s.markets)
  const minStars = usePredictionStore((s) => s.minStars)
  const sortBy = usePredictionStore((s) => s.sortBy)
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
