import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { EditGamePage } from '@/components/admin/EditGamePage'

const stubGame = {
  id: 'g1',
  sport_id: 'mlb',
  home_team_id: 'lad',
  away_team_id: 'sd',
  game_date: '2026-04-29',
  game_time: '2026-04-29 22:10:00',
  status: 'scheduled',
  recommendations: [
    {
      market: 'ml',
      pick: 'home',
      line: null,
      stars: 3,
      result: null,
      source: 'manual',
      audience: 'all',
    },
    {
      market: 'spread',
      pick: 'away',
      line: -1.5,
      stars: 4,
      result: null,
      source: 'manual',
      audience: 'premium',
    },
  ],
}

const stubTeams = [
  { id: 'lad', sport_id: 'mlb', name_zh: '道奇', abbreviation: 'LAD', logo_url: null, external_id: 1 },
  { id: 'sd',  sport_id: 'mlb', name_zh: '教士', abbreviation: 'SD',  logo_url: null, external_id: 2 },
]

const mocks = vi.hoisted(() => {
  const updateRecommendation = vi.fn()
  const setRecommendationResult = vi.fn()
  const deleteRecommendation = vi.fn()
  const createRecommendations = vi.fn()
  const updateGame = vi.fn()
  const deleteGame = vi.fn()

  const toastSuccess = vi.fn()
  const toastError = vi.fn()

  return {
    updateRecommendation,
    setRecommendationResult,
    deleteRecommendation,
    createRecommendations,
    updateGame,
    deleteGame,
    toastSuccess,
    toastError,
  }
})

vi.mock('@/lib/supabase', () => {
  const gamesSelect = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(() => Promise.resolve({ data: stubGame, error: null })),
  }
  const teamsSelect = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn(() => Promise.resolve({ data: stubTeams, error: null })),
  }
  return {
    supabase: {
      from: (table: string) => {
        if (table === 'games') return gamesSelect
        if (table === 'teams') return teamsSelect
        throw new Error(`unmocked from(${table})`)
      },
    },
  }
})

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, ...rest }: Record<string, unknown>) => (
    <a {...rest}>{children as React.ReactNode}</a>
  ),
  useNavigate: () => vi.fn(),
}))

vi.mock('@/services/admin/adminApi', () => ({
  adminGamesApi: {
    updateGame: (...args: unknown[]) => mocks.updateGame(...args),
    deleteGame: (...args: unknown[]) => mocks.deleteGame(...args),
  },
  adminRecommendationsApi: {
    updateRecommendation: (...args: unknown[]) => mocks.updateRecommendation(...args),
    setRecommendationResult: (...args: unknown[]) => mocks.setRecommendationResult(...args),
    deleteRecommendation: (...args: unknown[]) => mocks.deleteRecommendation(...args),
    createRecommendations: (...args: unknown[]) => mocks.createRecommendations(...args),
  },
}))

vi.mock('sonner', () => ({
  toast: {
    success: (msg: string, opts?: unknown) => mocks.toastSuccess(msg, opts),
    error: (msg: string) => mocks.toastError(msg),
    info: vi.fn(),
  },
}))

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return { Wrapper, client }
}

async function renderPage() {
  const { Wrapper, client } = makeWrapper()
  const utils = render(<EditGamePage gameId="g1" />, { wrapper: Wrapper })
  // Wait for the gameQuery to resolve and the page to render its rec rows.
  await waitFor(() => {
    expect(screen.getAllByRole('group', { name: '受眾' })).toHaveLength(2)
  })
  return { ...utils, client }
}

describe('EditGamePage — audience toggle', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((m) => m.mockReset())
    mocks.updateRecommendation.mockResolvedValue({ error: null })
  })

  it('renders the AudienceToggle for each existing recommendation', async () => {
    await renderPage()
    const groups = screen.getAllByRole('group', { name: '受眾' })
    expect(groups).toHaveLength(2)
    // First rec is 'all', second is 'premium'
    const allBtns = screen.getAllByRole('button', { name: '公開' })
    const premBtns = screen.getAllByRole('button', { name: 'Premium' })
    expect(allBtns[0]).toHaveAttribute('aria-pressed', 'true')
    expect(premBtns[0]).toHaveAttribute('aria-pressed', 'false')
    expect(allBtns[1]).toHaveAttribute('aria-pressed', 'false')
    expect(premBtns[1]).toHaveAttribute('aria-pressed', 'true')
  })

  it('clicking Premium on an all-row calls updateRecommendation and flips optimistically', async () => {
    await renderPage()
    const premBtns = screen.getAllByRole('button', { name: 'Premium' })
    fireEvent.click(premBtns[0]) // first row was 'all' → toggle to premium

    // optimistic flip
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'Premium' })[0]).toHaveAttribute(
        'aria-pressed',
        'true',
      )
    })

    await waitFor(() => {
      expect(mocks.updateRecommendation).toHaveBeenCalledWith('g1', 'ml', { audience: 'premium' })
    })

    // success toast called with action that has '復原' label
    await waitFor(() => {
      expect(mocks.toastSuccess).toHaveBeenCalled()
    })
    const [msg, opts] = mocks.toastSuccess.mock.calls[0]
    expect(msg).toContain('Premium')
    expect((opts as { action: { label: string } }).action.label).toBe('復原')
  })

  it('invoking the toast undo action toggles back to the previous audience', async () => {
    await renderPage()
    fireEvent.click(screen.getAllByRole('button', { name: 'Premium' })[0])

    await waitFor(() => {
      expect(mocks.toastSuccess).toHaveBeenCalled()
    })

    const [, opts] = mocks.toastSuccess.mock.calls[0]
    const action = (opts as { action: { onClick: () => void } }).action

    mocks.updateRecommendation.mockClear()
    action.onClick()

    await waitFor(() => {
      expect(mocks.updateRecommendation).toHaveBeenCalledWith('g1', 'ml', { audience: 'all' })
    })
  })

  it('on update failure the cache reverts and toast.error fires', async () => {
    mocks.updateRecommendation.mockResolvedValueOnce({ error: { message: 'denied' } })
    await renderPage()

    fireEvent.click(screen.getAllByRole('button', { name: 'Premium' })[0])

    // optimistic flip first
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'Premium' })[0]).toHaveAttribute(
        'aria-pressed',
        'true',
      )
    })

    // then revert after the error
    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith(expect.stringContaining('denied'))
    })
    expect(screen.getAllByRole('button', { name: '公開' })[0]).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(mocks.toastSuccess).not.toHaveBeenCalled()
  })

  it('clicking the already-active segment does NOT call the API', async () => {
    await renderPage()
    fireEvent.click(screen.getAllByRole('button', { name: '公開' })[0]) // already active
    // Give any pending microtasks a chance
    await Promise.resolve()
    expect(mocks.updateRecommendation).not.toHaveBeenCalled()
  })
})
