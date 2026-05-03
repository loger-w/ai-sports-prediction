import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useUser } from '@/lib/auth/useUser'
import { useUserVotes } from '@/hooks/useUserVotes'
import { votesApi } from '@/services/votes/votesApi'
import { recKey, type VoteValue } from '@/types/predictions/vote'
import type { Market } from '@/types/predictions/recommendation'

const FONT = { fontFamily: 'var(--font-barlow-condensed)' as const }

interface Props {
  gameId: string
  market: Market
  upCount: number
  downCount: number
}

interface CountState {
  up: number
  down: number
}

function applyDelta(
  prev: CountState,
  prevVote: VoteValue | null,
  action: VoteValue | 'remove',
): CountState {
  let { up, down } = prev
  if (prevVote === 1) up--
  else if (prevVote === -1) down--
  if (action === 1) up++
  else if (action === -1) down++
  return { up, down }
}

export function VoteButtons({ gameId, market, upCount, downCount }: Props) {
  const { user } = useUser()
  const { votes } = useUserVotes()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const propUserVote = votes.get(recKey(gameId, market)) ?? null

  // Counts and userVote are tracked as TWO independent local states with TWO separate
  // re-sync effects. This decoupling fixes a flicker bug: previously a single effect
  // depended on [upCount, downCount, propUserVote], so when user-votes refetched
  // first (propUserVote updated) the effect fired and reset counts to the still-stale
  // upCount, briefly showing the pre-vote number until recommendations refetched.
  const [counts, setCounts] = useState<CountState>({ up: upCount, down: downCount })
  const [pendingVote, setPendingVote] = useState<VoteValue | null | undefined>(undefined)

  useEffect(() => {
    setCounts({ up: upCount, down: downCount })
  }, [upCount, downCount])

  useEffect(() => {
    setPendingVote(undefined)
  }, [propUserVote])

  const userVote = pendingVote === undefined ? propUserVote : pendingVote

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['user-votes'] })
    void queryClient.invalidateQueries({ queryKey: ['recommendations'] })
  }

  const upsert = useMutation({
    mutationFn: (value: VoteValue) =>
      votesApi.upsertVote({
        user_id: user!.id,
        game_id: gameId,
        market,
        value,
      }),
    onMutate: async (value) => {
      const prev = { counts, pendingVote }
      setCounts(applyDelta(counts, userVote, value))
      setPendingVote(value)
      return { prev }
    },
    onError: (_err, _value, ctx) => {
      if (ctx) {
        setCounts(ctx.prev.counts)
        setPendingVote(ctx.prev.pendingVote)
      }
      toast.error('投票失敗，請稍後再試')
    },
    onSettled: invalidate,
  })

  const remove = useMutation({
    mutationFn: () =>
      votesApi.deleteVote({
        user_id: user!.id,
        game_id: gameId,
        market,
      }),
    onMutate: async () => {
      const prev = { counts, pendingVote }
      setCounts(applyDelta(counts, userVote, 'remove'))
      setPendingVote(null)
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx) {
        setCounts(ctx.prev.counts)
        setPendingVote(ctx.prev.pendingVote)
      }
      toast.error('取消投票失敗，請稍後再試')
    },
    onSettled: invalidate,
  })

  function handleClick(direction: VoteValue) {
    if (!user) {
      toast.info('請先登入')
      navigate({ to: '/login' })
      return
    }
    if (userVote === direction) {
      remove.mutate()
    } else {
      upsert.mutate(direction)
    }
  }

  const upPressed = userVote === 1
  const downPressed = userVote === -1

  return (
    <div
      className="border-t border-[#1e2733] px-3.5 py-2 flex gap-2 bg-[#0d1117]"
      style={FONT}
    >
      <button
        type="button"
        aria-pressed={upPressed}
        onClick={() => handleClick(1)}
        className={
          upPressed
            ? 'flex-1 bg-[rgba(0,229,160,0.18)] border border-[rgba(0,229,160,0.45)] text-[#00e5a0] py-1.5 rounded text-[13px] font-bold tracking-wide'
            : 'flex-1 bg-[rgba(0,229,160,0.06)] border border-[rgba(0,229,160,0.18)] text-[#94a3b8] hover:text-[#00e5a0] hover:bg-[rgba(0,229,160,0.10)] py-1.5 rounded text-[13px] font-bold tracking-wide transition-colors'
        }
      >
        ▲ 同意 {counts.up}
      </button>
      <button
        type="button"
        aria-pressed={downPressed}
        onClick={() => handleClick(-1)}
        className={
          downPressed
            ? 'flex-1 bg-[rgba(252,129,129,0.15)] border border-[rgba(252,129,129,0.40)] text-[#fc8181] py-1.5 rounded text-[13px] font-bold tracking-wide'
            : 'flex-1 bg-[rgba(252,129,129,0.05)] border border-[rgba(252,129,129,0.15)] text-[#94a3b8] hover:text-[#fc8181] hover:bg-[rgba(252,129,129,0.08)] py-1.5 rounded text-[13px] font-bold tracking-wide transition-colors'
        }
      >
        ▼ 不同意 {counts.down}
      </button>
    </div>
  )
}
