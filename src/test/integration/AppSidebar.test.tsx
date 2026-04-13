import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('@tanstack/react-router', () => ({
  useParams: () => ({ lang: 'en' }),
  useNavigate: () => vi.fn(),
  Link: ({ children, ...props }: Record<string, unknown>) => <a {...props}>{children as React.ReactNode}</a>,
}))

vi.mock('@/hooks/predictions/useDailyPredictions', () => ({
  useSportCounts: () => ({ data: { nba: 5, mlb: 3 } }),
}))

import { AppSidebar } from '@/components/layout/AppSidebar'
import { usePredictionStore } from '@/stores/predictions/predictionStore'

describe('AppSidebar — sport category section', () => {
  beforeEach(() => {
    usePredictionStore.getState().resetFilters()
  })

  it('renders All, Basketball, and Baseball buttons', () => {
    render(<AppSidebar />)
    // "All" also appears in the Min Stars row (n=1), so we assert at least two occurrences
    expect(screen.getAllByText('All').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('Basketball')).toBeInTheDocument()
    expect(screen.getByText('Baseball')).toBeInTheDocument()
  })

  it('clicking Basketball sets sport to nba', async () => {
    const user = userEvent.setup()
    render(<AppSidebar />)
    await user.click(screen.getByText('Basketball'))
    expect(usePredictionStore.getState().sport).toBe('nba')
  })

  it('clicking Baseball sets sport to mlb', async () => {
    const user = userEvent.setup()
    render(<AppSidebar />)
    await user.click(screen.getByText('Baseball'))
    expect(usePredictionStore.getState().sport).toBe('mlb')
  })

  it('clicking All sets sport to all', async () => {
    const user = userEvent.setup()
    usePredictionStore.setState({ sport: 'nba' })
    render(<AppSidebar />)
    // The sport category "All" button is first in DOM order; min stars "All" comes later
    await user.click(screen.getAllByText('All')[0])
    expect(usePredictionStore.getState().sport).toBe('all')
  })
})

describe('AppSidebar — league section', () => {
  beforeEach(() => {
    usePredictionStore.getState().resetFilters()
  })

  it('shows "Leagues" label when sport is all', () => {
    render(<AppSidebar />)
    expect(screen.getByText(/^leagues$/i)).toBeInTheDocument()
  })

  it('shows "Basketball Leagues" label when sport is nba', () => {
    usePredictionStore.setState({ sport: 'nba' })
    render(<AppSidebar />)
    expect(screen.getByText(/basketball leagues/i)).toBeInTheDocument()
  })

  it('shows "Baseball Leagues" label when sport is mlb', () => {
    usePredictionStore.setState({ sport: 'mlb' })
    render(<AppSidebar />)
    expect(screen.getByText(/baseball leagues/i)).toBeInTheDocument()
  })

  it('shows both NBA and MLB when sport is all', () => {
    render(<AppSidebar />)
    expect(screen.getByText('NBA')).toBeInTheDocument()
    expect(screen.getByText('MLB')).toBeInTheDocument()
  })

  it('shows only NBA when sport is nba', () => {
    usePredictionStore.setState({ sport: 'nba' })
    render(<AppSidebar />)
    expect(screen.getByText('NBA')).toBeInTheDocument()
    expect(screen.queryByText('MLB')).not.toBeInTheDocument()
  })

  it('shows only MLB when sport is mlb', () => {
    usePredictionStore.setState({ sport: 'mlb' })
    render(<AppSidebar />)
    expect(screen.getByText('MLB')).toBeInTheDocument()
    expect(screen.queryByText('NBA')).not.toBeInTheDocument()
  })

  it('clicking NBA sets sport to nba', async () => {
    const user = userEvent.setup()
    render(<AppSidebar />)
    await user.click(screen.getByText('NBA'))
    expect(usePredictionStore.getState().sport).toBe('nba')
  })

  it('clicking MLB sets sport to mlb', async () => {
    const user = userEvent.setup()
    render(<AppSidebar />)
    await user.click(screen.getByText('MLB'))
    expect(usePredictionStore.getState().sport).toBe('mlb')
  })
})
