// src/hooks/predictions/useAccuracyStats.ts
import { useQuery } from '@tanstack/react-query'
import { fetchAccuracyData } from '@/services/predictions/api'

export function useAccuracyData() {
  return useQuery({
    queryKey: ['accuracyData'],
    queryFn: fetchAccuracyData,
    staleTime: 5 * 60 * 1000,
  })
}
