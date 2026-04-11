import { useQuery } from '@tanstack/react-query'
import { fetchGameDetail } from '@/services/predictions/api'

export function useGameDetail(slug: string) {
  return useQuery({
    queryKey: ['gameDetail', slug],
    queryFn: () => fetchGameDetail(slug),
    enabled: !!slug,
  })
}
