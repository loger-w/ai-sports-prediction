import { useQuery } from '@tanstack/react-query'
import {
  fetchDailyPredictions,
  fetchSportCounts,
} from '@/services/predictions/api'
import { usePredictionStore } from '@/stores/predictions/predictionStore'

export function useDailyPredictions() {
  const { sport, dateRange, minStars } = usePredictionStore()

  return useQuery({
    queryKey: ['predictions', sport, dateRange, minStars],
    queryFn: () =>
      fetchDailyPredictions({ sport, dateRange, minStars }),
  })
}

export function useSportCounts() {
  const dateRange = usePredictionStore((s) => s.dateRange)

  return useQuery({
    queryKey: ['sportCounts', dateRange],
    queryFn: () => fetchSportCounts(dateRange),
  })
}
