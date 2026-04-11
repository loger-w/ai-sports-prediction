import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { GameWithPrediction } from '@/services/predictions/api'

// Mock TanStack Router
vi.mock('@tanstack/react-router', () => ({
  useParams: () => ({ lang: 'en' }),
  useNavigate: () => vi.fn(),
  Link: ({ children, to, params, ...props }: Record<string, unknown>) => (
    <a href={`/${(params as Record<string, string>)?.lang}/${(params as Record<string, string>)?.sport}/${(params as Record<string, string>)?.slug}`} {...props}>
      {children as React.ReactNode}
    </a>
  ),
}))

import { GameCard } from '@/components/predictions/GameCard'

function makeGame(overrides?: Partial<GameWithPrediction>): GameWithPrediction {
  return {
    id: '1',
    sport_id: 'nba',
    game_date: '2026-04-12',
    game_time: '2026-04-12T02:30:00Z',
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
      home_win_pct: 60,
      away_win_pct: 40,
      predicted_winner: 'home',
      confidence_level: 'high',
      over_under_line: 215.5,
      over_pct: 55,
      under_pct: 45,
      explanation_en: 'Lakers favored',
      explanation_zh: '湖人被看好',
    }],
    ...overrides,
  }
}

describe('GameCard', () => {
  it('renders team abbreviations and win percentages', () => {
    render(<GameCard game={makeGame()} />)
    // LAL appears in abbreviation + AI Pick section
    expect(screen.getAllByText('LAL').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('BOS')).toBeInTheDocument()
    expect(screen.getByText('60%')).toBeInTheDocument()
    expect(screen.getByText('40%')).toBeInTheDocument()
  })

  it('shows correct confidence badge text for high confidence', () => {
    render(<GameCard game={makeGame()} />)
    expect(screen.getByText('High Confidence')).toBeInTheDocument()
  })

  it('shows correct confidence badge text for medium confidence', () => {
    const game = makeGame()
    game.predictions[0].confidence_level = 'medium'
    render(<GameCard game={game} />)
    expect(screen.getByText('Med Confidence')).toBeInTheDocument()
  })

  it('links to the detail page with correct path', () => {
    render(<GameCard game={makeGame()} />)
    const link = screen.getByText('Details →').closest('a')
    expect(link).toHaveAttribute('href', '/en/nba/lakers-vs-celtics-2026-04-12')
  })

  it('returns null when no predictions', () => {
    const game = makeGame({ predictions: [] })
    const { container } = render(<GameCard game={game} />)
    expect(container.innerHTML).toBe('')
  })
})
