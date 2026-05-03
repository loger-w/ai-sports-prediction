import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { VoteValue } from '@/types/predictions/vote'

const mocks = vi.hoisted(() => ({
  useUser: vi.fn(),
  useUserVotes: vi.fn(),
  upsertVote: vi.fn(),
  deleteVote: vi.fn(),
  navigate: vi.fn(),
  toastInfo: vi.fn(),
  toastError: vi.fn(),
}))

vi.mock('@/lib/auth/useUser', () => ({
  useUser: () => mocks.useUser(),
}))

vi.mock('@/hooks/useUserVotes', () => ({
  useUserVotes: () => mocks.useUserVotes(),
}))

vi.mock('@/services/votes/votesApi', () => ({
  votesApi: {
    upsertVote: (args: unknown) => mocks.upsertVote(args),
    deleteVote: (args: unknown) => mocks.deleteVote(args),
    fetchUserVotes: vi.fn(),
  },
}))

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mocks.navigate,
}))

vi.mock('sonner', () => ({
  toast: {
    info: (msg: string) => mocks.toastInfo(msg),
    error: (msg: string) => mocks.toastError(msg),
    success: vi.fn(),
  },
}))

import { VoteButtons } from '@/components/predictions/VoteButtons'

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

function renderButtons(props: { upCount?: number; downCount?: number } = {}) {
  return render(
    <VoteButtons
      gameId="g1"
      market="ml"
      upCount={props.upCount ?? 0}
      downCount={props.downCount ?? 0}
    />,
    { wrapper: makeWrapper() },
  )
}

const SIGNED_IN_USER = {
  user: { id: 'u1', email: 'a@b.com', app_metadata: {} },
  isAdmin: false,
  loading: false,
}
const SIGNED_OUT = { user: null, isAdmin: false, loading: false }

function votes(value: VoteValue | null = null): Map<string, VoteValue> {
  const m = new Map<string, VoteValue>()
  if (value !== null) m.set('g1:ml', value)
  return m
}

describe('VoteButtons', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((m) => m.mockReset())
    mocks.upsertVote.mockResolvedValue({ error: null })
    mocks.deleteVote.mockResolvedValue({ error: null })
  })

  it('renders both buttons with given counts', () => {
    mocks.useUser.mockReturnValue(SIGNED_OUT)
    mocks.useUserVotes.mockReturnValue({ votes: votes(), isLoading: false })
    renderButtons({ upCount: 5, downCount: 2 })
    expect(screen.getByRole('button', { name: /^▲ 同意 5/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^▼ 不同意 2/ })).toBeInTheDocument()
  })

  it('unsigned click shows "請先登入" toast and navigates to /login', () => {
    mocks.useUser.mockReturnValue(SIGNED_OUT)
    mocks.useUserVotes.mockReturnValue({ votes: votes(), isLoading: false })
    renderButtons()
    fireEvent.click(screen.getByRole('button', { name: /^▲ 同意/ }))
    expect(mocks.toastInfo).toHaveBeenCalledWith('請先登入')
    expect(mocks.navigate).toHaveBeenCalledWith({ to: '/login' })
    expect(mocks.upsertVote).not.toHaveBeenCalled()
  })

  it('signed-in click on empty calls upsertVote with value=1 and bumps up count', async () => {
    mocks.useUser.mockReturnValue(SIGNED_IN_USER)
    mocks.useUserVotes.mockReturnValue({ votes: votes(), isLoading: false })
    renderButtons({ upCount: 0, downCount: 0 })

    fireEvent.click(screen.getByRole('button', { name: /^▲ 同意/ }))

    await waitFor(() => {
      expect(mocks.upsertVote).toHaveBeenCalledWith({
        user_id: 'u1',
        game_id: 'g1',
        market: 'ml',
        value: 1,
      })
    })
    // optimistic local count went up
    expect(screen.getByRole('button', { name: /^▲ 同意 1/ })).toBeInTheDocument()
  })

  it('signed-in click on already up-voted calls deleteVote and decrements up count', async () => {
    mocks.useUser.mockReturnValue(SIGNED_IN_USER)
    mocks.useUserVotes.mockReturnValue({ votes: votes(1), isLoading: false })
    renderButtons({ upCount: 1, downCount: 0 })

    fireEvent.click(screen.getByRole('button', { name: /^▲ 同意/ }))

    await waitFor(() => {
      expect(mocks.deleteVote).toHaveBeenCalledWith({
        user_id: 'u1',
        game_id: 'g1',
        market: 'ml',
      })
    })
    expect(screen.getByRole('button', { name: /^▲ 同意 0/ })).toBeInTheDocument()
  })

  it('signed-in click ▼ when up-voted switches sides (upsert value=-1)', async () => {
    mocks.useUser.mockReturnValue(SIGNED_IN_USER)
    mocks.useUserVotes.mockReturnValue({ votes: votes(1), isLoading: false })
    renderButtons({ upCount: 1, downCount: 0 })

    fireEvent.click(screen.getByRole('button', { name: /^▼ 不同意/ }))

    await waitFor(() => {
      expect(mocks.upsertVote).toHaveBeenCalledWith({
        user_id: 'u1',
        game_id: 'g1',
        market: 'ml',
        value: -1,
      })
    })
    // up=1→0, down=0→1
    expect(screen.getByRole('button', { name: /^▲ 同意 0/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^▼ 不同意 1/ })).toBeInTheDocument()
  })

  it('marks the up button as pressed (aria-pressed) when user has up-voted', () => {
    mocks.useUser.mockReturnValue(SIGNED_IN_USER)
    mocks.useUserVotes.mockReturnValue({ votes: votes(1), isLoading: false })
    renderButtons({ upCount: 1, downCount: 0 })
    expect(screen.getByRole('button', { name: /^▲ 同意/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: /^▼ 不同意/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })
})
