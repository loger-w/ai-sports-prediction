import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WinProbabilityBar } from '@/components/predictions/WinProbabilityBar'

describe('WinProbabilityBar', () => {
  it('displays 60/40 split with correct percentages', () => {
    render(
      <WinProbabilityBar
        homeWinPct={60}
        awayWinPct={40}
        homeLabel="Home Win %"
        awayLabel="Away Win %"
      />,
    )
    expect(screen.getByText('60%')).toBeInTheDocument()
    expect(screen.getByText('40%')).toBeInTheDocument()
  })

  it('displays 50/50 split', () => {
    render(
      <WinProbabilityBar
        homeWinPct={50}
        awayWinPct={50}
        homeLabel="Home Win %"
        awayLabel="Away Win %"
      />,
    )
    const pcts = screen.getAllByText('50%')
    expect(pcts).toHaveLength(2)
  })

  it('displays correct labels', () => {
    render(
      <WinProbabilityBar
        homeWinPct={60}
        awayWinPct={40}
        homeLabel="Home Win %"
        awayLabel="Away Win %"
      />,
    )
    expect(screen.getByText('Home Win %')).toBeInTheDocument()
    expect(screen.getByText('Away Win %')).toBeInTheDocument()
  })
})
