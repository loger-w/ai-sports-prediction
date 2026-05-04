import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { AdminDashboard } from '@/components/admin/AdminDashboard'

const stubGames = [
  {
    id: 'g1',
    game_date: '2026-04-29',
    game_time: '2026-04-29 22:10:00',
    status: 'scheduled',
    home_team: { name_zh: '道奇', abbreviation: 'LAD' },
    away_team: { name_zh: '教士', abbreviation: 'SD' },
    recommendations: [
      { market: 'ml',     source: 'cron',   audience: 'all' },
      { market: 'spread', source: 'manual', audience: 'premium' },
      { market: 'ou',     source: 'manual', audience: 'premium' },
    ],
  },
  {
    id: 'g2',
    game_date: '2026-04-29',
    game_time: '2026-04-29 19:00:00',
    status: 'scheduled',
    home_team: { name_zh: '洋基', abbreviation: 'NYY' },
    away_team: { name_zh: '紅襪', abbreviation: 'BOS' },
    recommendations: [
      { market: 'ml', source: 'cron', audience: 'all' },
    ],
  },
  {
    id: 'g3',
    game_date: '2026-04-28',
    game_time: '2026-04-28 22:00:00',
    status: 'final',
    home_team: { name_zh: '巨人', abbreviation: 'SF' },
    away_team: { name_zh: '小熊', abbreviation: 'CHC' },
    recommendations: [],
  },
]

vi.mock('@/lib/supabase', () => {
  const gamesQuery = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn(() => Promise.resolve({ data: stubGames, error: null })),
  }
  return {
    supabase: {
      from: () => gamesQuery,
    },
  }
})

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, ...rest }: Record<string, unknown>) => (
    <a {...rest}>{children as React.ReactNode}</a>
  ),
}))

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

describe('AdminDashboard — 受眾 column', () => {
  it('renders the 受眾 column header', async () => {
    render(<AdminDashboard />, { wrapper: makeWrapper() })
    await waitFor(() => expect(screen.getByText('受眾')).toBeInTheDocument())
  })

  it('counts audience=all and audience=premium per game', async () => {
    render(<AdminDashboard />, { wrapper: makeWrapper() })

    // g1 = 1 公開 (ml=all) · 2 Premium (spread, ou)
    // g2 = 1 公開 · 0 Premium
    // g3 = 0 公開 · 0 Premium (no recs)
    await waitFor(() => {
      const rows = screen.getAllByRole('row')
      // header row + 3 data rows
      expect(rows).toHaveLength(4)
    })

    const rows = screen.getAllByRole('row').slice(1) // drop header

    expect(within(rows[0]).getByText('1 公開')).toBeInTheDocument()
    expect(within(rows[0]).getByText('2 Premium')).toBeInTheDocument()

    expect(within(rows[1]).getByText('1 公開')).toBeInTheDocument()
    expect(within(rows[1]).getByText('0 Premium')).toBeInTheDocument()

    expect(within(rows[2]).getByText('0 公開')).toBeInTheDocument()
    expect(within(rows[2]).getByText('0 Premium')).toBeInTheDocument()
  })

  it('still renders the existing 推薦 (cron / manual) cell unchanged', async () => {
    render(<AdminDashboard />, { wrapper: makeWrapper() })
    await waitFor(() => {
      expect(screen.getAllByText(/cron \/ manual/)).toHaveLength(3)
    })
  })
})
