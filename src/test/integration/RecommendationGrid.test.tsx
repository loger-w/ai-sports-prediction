import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { UseQueryResult } from '@tanstack/react-query'

vi.mock('@tanstack/react-router', () => ({
  useParams: () => ({ lang: 'zh' }),
  useNavigate: () => vi.fn(),
  Link: ({ children, ...rest }: Record<string, unknown>) => <a {...rest}>{children as React.ReactNode}</a>,
}))

import { RecommendationGrid } from '@/components/predictions/RecommendationGrid'
import { usePredictionStore } from '@/stores/predictions/predictionStore'
import type { RecommendationWithGame } from '@/types/predictions/recommendation'

function rec(overrides: Partial<RecommendationWithGame> = {}): RecommendationWithGame {
  return {
    game_id: 'g1', market: 'ml', pick: 'home', line: null, stars: 4, result: null,
    game: {
      id: 'g1', sport_id: 'mlb',
      home_team_id: 'lad', away_team_id: 'sd',
      game_date: '2026-04-29', game_time: '2026-04-29 22:10:00',
      status: 'scheduled', home_score: null, away_score: null,
      home_team: { id: 'lad', sport_id: 'mlb', name_zh: '道奇', abbreviation: 'LAD', logo_url: null },
      away_team: { id: 'sd', sport_id: 'mlb', name_zh: '教士', abbreviation: 'SD', logo_url: null },
    },
    ...overrides,
  } as RecommendationWithGame
}

type Q = Pick<UseQueryResult<RecommendationWithGame[]>, 'data' | 'isLoading' | 'isError' | 'refetch'>

const noopQuery = (data: RecommendationWithGame[] | undefined): Q => ({
  data,
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
})

describe('RecommendationGrid', () => {
  beforeEach(() => {
    usePredictionStore.getState().resetFilters()
  })

  it('renders skeleton when loading', () => {
    render(<RecommendationGrid {...({ data: undefined, isLoading: true, isError: false, refetch: vi.fn() })} />)
    expect(screen.getAllByTestId('rec-skeleton').length).toBeGreaterThan(0)
  })

  it('renders empty state when no data', () => {
    render(<RecommendationGrid {...noopQuery([])} />)
    expect(screen.getByText(/沒有符合篩選條件的推薦|推薦通常在每天早上更新/)).toBeInTheDocument()
  })

  it('shows "pick at least one market" when markets are empty', () => {
    usePredictionStore.getState().setMarkets(new Set())
    render(<RecommendationGrid {...noopQuery([])} />)
    expect(screen.getByText('請至少勾選一個市場')).toBeInTheDocument()
  })

  it('renders one card per recommendation', () => {
    const recs = [
      rec({ market: 'ml', pick: 'home', stars: 4 }),
      rec({ market: 'spread', pick: 'home', line: -1.5, stars: 3 }),
    ]
    render(<RecommendationGrid {...noopQuery(recs)} />)
    // two cards rendered → two stars test ids
    expect(screen.getAllByTestId('rec-stars')).toHaveLength(2)
  })

  it('shows error state with retry button on error', async () => {
    const refetch = vi.fn()
    const user = userEvent.setup()
    render(<RecommendationGrid {...({ data: undefined, isLoading: false, isError: true, refetch })} />)
    await user.click(screen.getByText('重試'))
    expect(refetch).toHaveBeenCalled()
  })
})
