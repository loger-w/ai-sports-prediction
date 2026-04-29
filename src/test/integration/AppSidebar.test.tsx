import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { usePredictionStore } from '@/stores/predictions/predictionStore'

vi.mock('@tanstack/react-router', () => ({
  useParams: () => ({ lang: 'zh' }),
  useNavigate: () => vi.fn(),
  Link: ({ children, ...rest }: Record<string, unknown>) => <a {...rest}>{children as React.ReactNode}</a>,
}))

vi.mock('@/hooks/predictions/useDailyRecommendations', () => ({
  useRecommendationCounts: () => ({ data: { mlb: 8 } }),
}))

describe('AppSidebar', () => {
  beforeEach(() => {
    usePredictionStore.getState().resetFilters()
  })

  it('shows "全部" and "棒球" categories', () => {
    render(<AppSidebar />)
    expect(screen.getByText('全部')).toBeInTheDocument()
    expect(screen.getByText('棒球')).toBeInTheDocument()
  })

  it('does NOT show 籃球 category', () => {
    render(<AppSidebar />)
    expect(screen.queryByText('籃球')).not.toBeInTheDocument()
  })

  it('shows MLB league', () => {
    render(<AppSidebar />)
    expect(screen.getByText('MLB')).toBeInTheDocument()
  })

  it('does NOT show NBA league', () => {
    render(<AppSidebar />)
    expect(screen.queryByText('NBA')).not.toBeInTheDocument()
  })

  it('clicking 棒球 sets sport=mlb', async () => {
    const user = userEvent.setup()
    render(<AppSidebar />)
    await user.click(screen.getByText('棒球'))
    expect(usePredictionStore.getState().sport).toBe('mlb')
  })

  it('renders MARKETS section with three chips', () => {
    render(<AppSidebar />)
    expect(screen.getByText('獨贏')).toBeInTheDocument()
    expect(screen.getByText('讓分')).toBeInTheDocument()
    expect(screen.getByText('大小分')).toBeInTheDocument()
  })

  it('clicking a market chip toggles store', async () => {
    const user = userEvent.setup()
    render(<AppSidebar />)
    await user.click(screen.getByText('讓分'))
    expect(usePredictionStore.getState().markets.has('spread')).toBe(false)
  })

  it('renders min-star buttons (不限 / 2+ / 3+ / 4+ / 5)', () => {
    render(<AppSidebar />)
    expect(screen.getByText('不限')).toBeInTheDocument()
    expect(screen.getByText('2+')).toBeInTheDocument()
    expect(screen.getByText('3+')).toBeInTheDocument()
    expect(screen.getByText('4+')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('clicking 不限 sets minStars=1', async () => {
    const user = userEvent.setup()
    usePredictionStore.getState().setMinStars(4)
    render(<AppSidebar />)
    await user.click(screen.getByText('不限'))
    expect(usePredictionStore.getState().minStars).toBe(1)
  })

  it('clicking 4+ sets minStars=4', async () => {
    const user = userEvent.setup()
    render(<AppSidebar />)
    await user.click(screen.getByText('4+'))
    expect(usePredictionStore.getState().minStars).toBe(4)
  })
})
