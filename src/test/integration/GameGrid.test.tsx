import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { GameWithPrediction } from '@/services/predictions/api'

// Mock TanStack Router
vi.mock('@tanstack/react-router', () => ({
  useParams: () => ({ lang: 'en' }),
  useNavigate: () => vi.fn(),
  Link: ({ children, ...props }: Record<string, unknown>) => <a {...props}>{children as React.ReactNode}</a>,
}))

import { GameGrid } from '@/components/predictions/GameGrid'
import { usePredictionStore } from '@/stores/predictions/predictionStore'

function makeGame(id: string): GameWithPrediction {
  return {
    id,
    sport_id: 'nba',
    game_date: '2026-04-12',
    game_time: '2026-04-12T02:30:00Z',
    slug: `game-${id}`,
    status: 'scheduled',
    home_score: null,
    away_score: null,
    home_team: {
      id: 'lakers',
      name_en: 'Los Angeles Lakers',
      name_zh: '洛杉磯湖人',
      abbreviation: 'LAL',
      logo_url: null,
    },
    away_team: {
      id: 'celtics',
      name_en: 'Boston Celtics',
      name_zh: '波士頓塞爾提克',
      abbreviation: 'BOS',
      logo_url: null,
    },
    predictions: [{
      id: `p-${id}`,
      moneyline_home_pct: 62.3,
      moneyline_away_pct: 37.7,
      moneyline_pick: 'home',
      moneyline_stars: 4,
      spread_line: -3.5,
      spread_pick: 'home',
      spread_pct: 57.8,
      spread_stars: 3,
      over_under_line: 218.5,
      over_pct: 54.2,
      under_pct: 45.8,
      over_under_stars: 1,
      explanation_en: 'Test',
      explanation_zh: '測試',
      analysis: null,
    }],
  }
}

describe('GameGrid', () => {
  it('shows 4 skeleton cards when loading', () => {
    const { container } = render(
      <GameGrid data={undefined} isLoading={true} isError={false} refetch={vi.fn()} />,
    )
    const skeletons = container.querySelectorAll('[data-slot="skeleton"]')
    expect(skeletons.length).toBeGreaterThanOrEqual(4)
  })

  it('shows error message and retry button on error', () => {
    const refetch = vi.fn()
    render(
      <GameGrid data={undefined} isLoading={false} isError={true} refetch={refetch} />,
    )
    expect(screen.getByText(/Failed to load/)).toBeInTheDocument()
    expect(screen.getByText('Retry')).toBeInTheDocument()
  })

  it('calls refetch when retry button is clicked', async () => {
    const user = userEvent.setup()
    const refetch = vi.fn()
    render(
      <GameGrid data={undefined} isLoading={false} isError={true} refetch={refetch} />,
    )
    await user.click(screen.getByText('Retry'))
    expect(refetch).toHaveBeenCalled()
  })

  it('shows noData message when empty with no filters', () => {
    usePredictionStore.getState().resetFilters()
    render(
      <GameGrid data={[]} isLoading={false} isError={false} refetch={vi.fn()} />,
    )
    expect(screen.getByText(/usually updated/)).toBeInTheDocument()
  })

  it('shows noResults message and reset button when empty with active filters', async () => {
    // Set filter before render to avoid act() warning
    usePredictionStore.setState({ sport: 'nba' })
    render(
      <GameGrid data={[]} isLoading={false} isError={false} refetch={vi.fn()} />,
    )
    expect(screen.getByText(/No predictions match/)).toBeInTheDocument()
    expect(screen.getByText('Reset Filters')).toBeInTheDocument()
    // Clean up
    usePredictionStore.getState().resetFilters()
  })

  it('renders correct number of game cards with data', () => {
    usePredictionStore.getState().resetFilters()
    const games = [makeGame('1'), makeGame('2'), makeGame('3')]
    render(
      <GameGrid data={games} isLoading={false} isError={false} refetch={vi.fn()} />,
    )
    // LAL appears twice per card (abbreviation + AI Pick), so 3 games = 6
    const abbreviations = screen.getAllByText('LAL')
    expect(abbreviations).toHaveLength(6)
  })
})
