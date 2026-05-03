import { useQuery } from '@tanstack/react-query'
import { useUser } from '@/lib/auth/useUser'
import { votesApi } from '@/services/votes/votesApi'
import { recKey, type VoteValue } from '@/types/predictions/vote'

interface UseUserVotesResult {
  votes: Map<string, VoteValue>
  isLoading: boolean
}

export function useUserVotes(): UseUserVotesResult {
  const { user } = useUser()
  const userId = user?.id ?? null

  const query = useQuery({
    queryKey: ['user-votes', userId],
    queryFn: async () => {
      if (!userId) return new Map<string, VoteValue>()
      const rows = await votesApi.fetchUserVotes(userId)
      const map = new Map<string, VoteValue>()
      for (const row of rows) {
        map.set(recKey(row.game_id, row.market), row.value)
      }
      return map
    },
    enabled: userId !== null,
    staleTime: 30_000,
  })

  return {
    votes: query.data ?? new Map<string, VoteValue>(),
    isLoading: query.isLoading,
  }
}
