import { useQuery } from '@tanstack/react-query'
import { fetchAccuracyData } from '@/services/predictions/api'

export function useAccuracyStats() {
  return useQuery({
    queryKey: ['accuracyStats'],
    queryFn: fetchAccuracyData,
    staleTime: 5 * 60 * 1000, // accuracy data changes slowly
  })
}
