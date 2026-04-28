import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { SortToggle } from '@/components/predictions/SortToggle'
import { usePredictionStore } from '@/stores/predictions/predictionStore'

describe('SortToggle', () => {
  beforeEach(() => {
    usePredictionStore.getState().resetFilters()
  })

  it('renders both sort options', () => {
    render(<SortToggle />)
    expect(screen.getByText('依星數')).toBeInTheDocument()
    expect(screen.getByText('依時間')).toBeInTheDocument()
  })

  it('marks default (stars) as active', () => {
    render(<SortToggle />)
    expect(screen.getByText('依星數').closest('button')).toHaveAttribute('data-active', 'true')
    expect(screen.getByText('依時間').closest('button')).toHaveAttribute('data-active', 'false')
  })

  it('clicking time switches sortBy in store', async () => {
    const user = userEvent.setup()
    render(<SortToggle />)
    await user.click(screen.getByText('依時間'))
    expect(usePredictionStore.getState().sortBy).toBe('time')
  })
})
