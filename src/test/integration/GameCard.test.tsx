import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { GameWithPrediction } from '@/services/predictions/api'

vi.mock('@tanstack/react-router', () => ({
  useParams: () => ({ lang: 'en' }),
  useNavigate: () => vi.fn(),
  Link: ({ children, to, params, ...props }: Record<string, unknown>) => (
    <a
      href={`/${(params as Record<string, string>)?.lang}/${(params as Record<string, string>)?.sport}/${(params as Record<string, string>)?.slug}`}
      {...props}
    >
      {children as React.ReactNode}
    </a>
  ),
}))

vi.mock('@/lib/timezone', () => ({
  toLocalTimeString: () => '19:30',
  toLocalDateString: () => '2026-04-12',
}))

import { GameCard } from '@/components/predictions/GameCard'

function makeGame(overrides?: Partial<GameWithPrediction['predictions'][0]>): GameWithPrediction {
  return {
    id: '1',
    sport_id: 'nba',
    game_date: '2026-04-12',
    game_time: '2026-04-12T23:30:00Z',
    slug: 'lakers-vs-celtics-2026-04-12',
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
      id: 'p1',
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
      explanation_en: 'Lakers favored',
      explanation_zh: '湖人被看好',
      ...overrides,
    }],
  }
}

describe('GameCard', () => {
  it('renders team abbreviations', () => {
    render(<GameCard game={makeGame()} />)
    expect(screen.getAllByText('LAL').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('BOS').length).toBeGreaterThanOrEqual(1)
  })

  it('shows moneyline confidence when stars >= 2', () => {
    render(<GameCard game={makeGame()} />)
    expect(screen.getByText('62.3%')).toBeInTheDocument()
  })

  it('shows PASS for over_under when stars === 1', () => {
    render(<GameCard game={makeGame()} />)
    expect(screen.getByText('PASS')).toBeInTheDocument()
    expect(screen.getByText('218.5')).toBeInTheDocument()
  })

  it('shows spread pick with line', () => {
    render(<GameCard game={makeGame()} />)
    expect(screen.getByText('LAL -3.5')).toBeInTheDocument()
  })

  it('links to the detail page with correct path', () => {
    render(<GameCard game={makeGame()} />)
    const link = screen.getByText('Details →').closest('a')
    expect(link).toHaveAttribute('href', '/en/nba/lakers-vs-celtics-2026-04-12')
  })

  it('returns null when no predictions', () => {
    const game = makeGame()
    game.predictions = []
    const { container } = render(<GameCard game={{ ...game } as GameWithPrediction} />)
    expect(container.innerHTML).toBe('')
  })
})
