import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

const mocks = vi.hoisted(() => ({
  useUser: vi.fn(),
  fetchUserVotes: vi.fn(),
}))

vi.mock('@/lib/auth/useUser', () => ({
  useUser: () => mocks.useUser(),
}))

vi.mock('@/services/votes/votesApi', () => ({
  votesApi: {
    fetchUserVotes: (uid: string) => mocks.fetchUserVotes(uid),
    upsertVote: vi.fn(),
    deleteVote: vi.fn(),
  },
}))

import { useUserVotes } from '@/hooks/useUserVotes'

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

describe('useUserVotes', () => {
  beforeEach(() => {
    mocks.useUser.mockReset()
    mocks.fetchUserVotes.mockReset()
  })

  it('returns an empty map and does not fetch when not signed in', () => {
    mocks.useUser.mockReturnValue({ user: null, isAdmin: false, loading: false })
    const wrapper = makeWrapper()
    const { result } = renderHook(() => useUserVotes(), { wrapper })
    expect(result.current.votes.size).toBe(0)
    expect(mocks.fetchUserVotes).not.toHaveBeenCalled()
  })

  it('fetches and returns a Map keyed by "game_id:market" when signed in', async () => {
    mocks.useUser.mockReturnValue({
      user: { id: 'u1', email: 'a@b.com', app_metadata: {} },
      isAdmin: false,
      loading: false,
    })
    mocks.fetchUserVotes.mockResolvedValue([
      {
        user_id: 'u1',
        game_id: 'g1',
        market: 'ml',
        value: 1,
        created_at: 't',
        updated_at: 't',
      },
      {
        user_id: 'u1',
        game_id: 'g2',
        market: 'ou',
        value: -1,
        created_at: 't',
        updated_at: 't',
      },
    ])

    const wrapper = makeWrapper()
    const { result } = renderHook(() => useUserVotes(), { wrapper })

    await waitFor(() => {
      expect(result.current.votes.size).toBe(2)
    })
    expect(result.current.votes.get('g1:ml')).toBe(1)
    expect(result.current.votes.get('g2:ou')).toBe(-1)
    expect(mocks.fetchUserVotes).toHaveBeenCalledWith('u1')
  })
})
