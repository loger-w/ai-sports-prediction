import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// Mock TanStack Router's useParams used by useTranslation
vi.mock('@tanstack/react-router', () => ({
  useParams: () => ({ lang: 'en' }),
  useNavigate: () => vi.fn(),
  Link: ({ children, ...props }: Record<string, unknown>) => <a {...props}>{children as React.ReactNode}</a>,
}))

import { OverUnderDisplay } from '@/components/predictions/OverUnderDisplay'

describe('OverUnderDisplay', () => {
  it('shows winner pick only when overUnderLine is null', () => {
    render(
      <OverUnderDisplay
        overUnderLine={null}
        overPct={null}
        underPct={null}
        predictedWinner="home"
        homeAbbr="LAL"
        awayAbbr="BOS"
      />,
    )
    expect(screen.getByText(/LAL/)).toBeInTheDocument()
    expect(screen.queryByText(/O\/U/)).not.toBeInTheDocument()
  })

  it('shows Over pick with ▲ when overPct > underPct', () => {
    render(
      <OverUnderDisplay
        overUnderLine={215.5}
        overPct={55}
        underPct={45}
        predictedWinner="home"
        homeAbbr="LAL"
        awayAbbr="BOS"
      />,
    )
    expect(screen.getByText('▲')).toBeInTheDocument()
    expect(screen.getByText(/Over/)).toBeInTheDocument()
  })

  it('shows Under pick with ▼ when underPct > overPct', () => {
    render(
      <OverUnderDisplay
        overUnderLine={215.5}
        overPct={40}
        underPct={60}
        predictedWinner="away"
        homeAbbr="LAL"
        awayAbbr="BOS"
      />,
    )
    expect(screen.getByText('▼')).toBeInTheDocument()
    expect(screen.getByText(/Under/)).toBeInTheDocument()
  })
})
