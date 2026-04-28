import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { MarketChips } from '@/components/predictions/MarketChips'
import { usePredictionStore } from '@/stores/predictions/predictionStore'

describe('MarketChips', () => {
  beforeEach(() => {
    usePredictionStore.getState().resetFilters()
  })

  it('renders one chip per market', () => {
    render(<MarketChips />)
    expect(screen.getByText('獨贏')).toBeInTheDocument()
    expect(screen.getByText('讓分')).toBeInTheDocument()
    expect(screen.getByText('大小分')).toBeInTheDocument()
  })

  it('renders all chips as active when defaults', () => {
    render(<MarketChips />)
    expect(screen.getByText('獨贏').closest('button')).toHaveAttribute('data-active', 'true')
    expect(screen.getByText('讓分').closest('button')).toHaveAttribute('data-active', 'true')
    expect(screen.getByText('大小分').closest('button')).toHaveAttribute('data-active', 'true')
  })

  it('clicking a chip toggles store state', async () => {
    const user = userEvent.setup()
    render(<MarketChips />)
    await user.click(screen.getByText('獨贏'))
    expect(usePredictionStore.getState().markets.has('ml')).toBe(false)
    await user.click(screen.getByText('獨贏'))
    expect(usePredictionStore.getState().markets.has('ml')).toBe(true)
  })

  it('shows chips as inactive when store says so', () => {
    usePredictionStore.getState().toggleMarket('ml')
    render(<MarketChips />)
    expect(screen.getByText('獨贏').closest('button')).toHaveAttribute('data-active', 'false')
  })
})
