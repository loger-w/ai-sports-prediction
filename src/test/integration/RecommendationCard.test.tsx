import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { RecommendationWithGame } from '@/types/predictions/recommendation'
import { RecommendationCard } from '@/components/predictions/RecommendationCard'

vi.mock('@tanstack/react-router', () => ({
  useParams: () => ({ lang: 'zh' }),
  useNavigate: () => vi.fn(),
  Link: ({ children, ...rest }: Record<string, unknown>) => <a {...rest}>{children as React.ReactNode}</a>,
}))

function makeRec(overrides: Partial<RecommendationWithGame> = {}): RecommendationWithGame {
  const base: RecommendationWithGame = {
    game_id: 'g1',
    market: 'spread',
    pick: 'home',
    line: -1.5,
    stars: 4,
    result: null,
    game: {
      id: 'g1',
      sport_id: 'mlb',
      home_team_id: 'lad',
      away_team_id: 'sd',
      game_date: '2026-04-29',
      game_time: '2026-04-29 22:10:00',
      status: 'scheduled',
      home_team: {
        id: 'lad', sport_id: 'mlb', name_zh: '道奇', abbreviation: 'LAD', logo_url: null,
      },
      away_team: {
        id: 'sd', sport_id: 'mlb', name_zh: '教士', abbreviation: 'SD', logo_url: null,
      },
    },
  }
  return { ...base, ...overrides, game: { ...base.game, ...(overrides.game ?? {}) } }
}

describe('RecommendationCard', () => {
  it('renders sport label and market label in header', () => {
    render(<RecommendationCard rec={makeRec()} />)
    expect(screen.getByText(/MLB/)).toBeInTheDocument()
    expect(screen.getByText(/讓分/)).toBeInTheDocument()
  })

  it('shows team abbreviations with picked side highlighted', () => {
    render(<RecommendationCard rec={makeRec()} />)
    const lad = screen.getByText('LAD')
    const sd = screen.getByText('SD')
    expect(lad).toHaveAttribute('data-picked', 'true')
    expect(sd).toHaveAttribute('data-picked', 'false')
  })

  it('shows pick text "LAD -1.5" for spread home', () => {
    render(<RecommendationCard rec={makeRec()} />)
    expect(screen.getByText('LAD -1.5')).toBeInTheDocument()
  })

  it('shows pick text "大 8.5" for over', () => {
    const rec = makeRec({ market: 'ou', pick: 'over', line: 8.5 })
    render(<RecommendationCard rec={rec} />)
    expect(screen.getByText('大 8.5')).toBeInTheDocument()
  })

  it('shows pick text "小 8.5" for under', () => {
    const rec = makeRec({ market: 'ou', pick: 'under', line: 8.5 })
    render(<RecommendationCard rec={rec} />)
    expect(screen.getByText('小 8.5')).toBeInTheDocument()
  })

  it('shows pick text equal to abbreviation for ml home', () => {
    const rec = makeRec({ market: 'ml', pick: 'home', line: null })
    render(<RecommendationCard rec={rec} />)
    // LAD shows in both the team header AND as pick text
    expect(screen.getAllByText('LAD').length).toBeGreaterThanOrEqual(2)
  })

  it('shows star count', () => {
    render(<RecommendationCard rec={makeRec({ stars: 5 })} />)
    expect(screen.getByTestId('rec-stars').textContent).toMatch(/5/)
  })

  it('renders WIN badge when result is "win"', () => {
    render(<RecommendationCard rec={makeRec({ result: 'win' })} />)
    expect(screen.getByText('贏')).toBeInTheDocument()
  })

  it('renders VOID badge when result is "void"', () => {
    render(<RecommendationCard rec={makeRec({ result: 'void' })} />)
    expect(screen.getByText('無效')).toBeInTheDocument()
  })

  it('does not render result badge when pending', () => {
    render(<RecommendationCard rec={makeRec({ result: null })} />)
    expect(screen.queryByText('贏')).not.toBeInTheDocument()
    expect(screen.queryByText('輸')).not.toBeInTheDocument()
  })

  it('renders local time HH:mm portion of game_time', () => {
    render(<RecommendationCard rec={makeRec()} />)
    expect(screen.getByText('22:10')).toBeInTheDocument()
  })
})
