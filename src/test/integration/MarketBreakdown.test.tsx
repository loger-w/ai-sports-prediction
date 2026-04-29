import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { AccuracyBucket } from '@/services/predictions/api'
import { MarketBreakdown } from '@/components/accuracy/MarketBreakdown'

vi.mock('@tanstack/react-router', () => ({
  useParams: () => ({ lang: 'zh' }),
}))

const empty = (): AccuracyBucket => ({ total: 0, wins: 0, losses: 0, pushes: 0, voids: 0, pct: 0 })

describe('MarketBreakdown', () => {
  it('renders three rows: 獨贏 / 讓分 / 大小分', () => {
    const data = {
      ml: { ...empty(), total: 4, wins: 3, losses: 1, pct: 75 },
      spread: { ...empty(), total: 5, wins: 3, losses: 2, pct: 60 },
      ou: { ...empty(), total: 6, wins: 5, losses: 1, pct: 83.3 },
    }
    render(<MarketBreakdown byMarket={data} />)
    expect(screen.getByText('獨贏')).toBeInTheDocument()
    expect(screen.getByText('讓分')).toBeInTheDocument()
    expect(screen.getByText('大小分')).toBeInTheDocument()
    expect(screen.getByText('75%')).toBeInTheDocument()
    expect(screen.getByText('60%')).toBeInTheDocument()
    expect(screen.getByText('83.3%')).toBeInTheDocument()
  })

  it('renders dash for empty market', () => {
    const data = { ml: empty(), spread: empty(), ou: empty() }
    render(<MarketBreakdown byMarket={data} />)
    expect(screen.getAllByText('—').length).toBe(3)
  })
})
