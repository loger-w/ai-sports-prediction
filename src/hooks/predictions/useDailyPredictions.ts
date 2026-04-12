import { useQuery } from '@tanstack/react-query'
import {
  fetchDailyPredictions,
  fetchSportCounts,
} from '@/services/predictions/api'
import { usePredictionStore } from '@/stores/predictions/predictionStore'

export function useDailyPredictions() {
  const { sport, dateRange, minStars, direction } = usePredictionStore()

  return useQuery({
    queryKey: ['predictions', sport, dateRange, minStars, direction],
    queryFn: () =>
      fetchDailyPredictions({ sport, dateRange, minStars, direction }),
  })
}

export function useSportCounts() {
  const dateRange = usePredictionStore((s) => s.dateRange)

  return useQuery({
    queryKey: ['sportCounts', dateRange],
    queryFn: () => fetchSportCounts(dateRange),
  })
}
