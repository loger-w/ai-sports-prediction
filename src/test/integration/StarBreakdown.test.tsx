import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { AccuracyBucket } from '@/services/predictions/api'
import { StarBreakdown } from '@/components/accuracy/StarBreakdown'

vi.mock('@tanstack/react-router', () => ({
  useParams: () => ({ lang: 'zh' }),
}))

const empty = (): AccuracyBucket => ({ total: 0, wins: 0, losses: 0, pushes: 0, voids: 0, pct: 0 })

describe('StarBreakdown', () => {
  it('renders 5 rows for ★1..★5', () => {
    const byStars = {
      1: { ...empty(), total: 2, wins: 1, losses: 1, pct: 50 },
      2: { ...empty(), total: 3, wins: 2, losses: 1, pct: 66.7 },
      3: { ...empty(), total: 4, wins: 3, losses: 1, pct: 75 },
      4: { ...empty(), total: 5, wins: 4, losses: 1, pct: 80 },
      5: { ...empty(), total: 6, wins: 6, losses: 0, pct: 100 },
    }
    render(<StarBreakdown byStars={byStars} />)
    expect(screen.getByText('★1')).toBeInTheDocument()
    expect(screen.getByText('★5')).toBeInTheDocument()
    expect(screen.getByText('100%')).toBeInTheDocument()
    expect(screen.getByText('50%')).toBeInTheDocument()
  })

  it('renders — when star tier has no decided games', () => {
    const byStars = {
      1: empty(), 2: empty(), 3: empty(), 4: empty(), 5: empty(),
    }
    render(<StarBreakdown byStars={byStars} />)
    expect(screen.getAllByText('—').length).toBe(5)
  })
})
