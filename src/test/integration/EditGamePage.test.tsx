import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { EditGamePage } from '@/components/admin/EditGamePage'

const stubGame = {
  id: 'g1',
  sport_id: 'mlb',
  home_team_id: 'lad',
  away_team_id: 'sd',
  game_date: '2026-04-29',
  game_time: '2026-04-29 22:10:00',
  status: 'scheduled',
  recommendations: [
    {
      market: 'ml',
      pick: 'home',
      line: null,
      stars: 3,
      result: null,
      source: 'manual',
      audience: 'all',
    },
    {
      market: 'spread',
      pick: 'away',
      line: -1.5,
      stars: 4,
      result: null,
      source: 'manual',
      audience: 'premium',
    },
  ],
}

const stubTeams = [
  { id: 'lad', sport_id: 'mlb', name_zh: '道奇', abbreviation: 'LAD', logo_url: null, external_id: 1 },
  { id: 'sd',  sport_id: 'mlb', name_zh: '教士', abbreviation: 'SD',  logo_url: null, external_id: 2 },
]

const mocks = vi.hoisted(() => ({
  updateGame: vi.fn(),
  deleteGame: vi.fn(),
  createRecommendations: vi.fn(),
  updateRecommendation: vi.fn(),
  deleteRecommendation: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  navigate: vi.fn(),
}))

vi.mock('@/lib/supabase', () => {
  const gamesSelect = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(() => Promise.resolve({ data: stubGame, error: null })),
  }
  const teamsSelect = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn(() => Promise.resolve({ data: stubTeams, error: null })),
  }
  return {
    supabase: {
      from: (table: string) => {
        if (table === 'games') return gamesSelect
        if (table === 'teams') return teamsSelect
        throw new Error(`unmocked from(${table})`)
      },
    },
  }
})

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, onClick, to, ...rest }: Record<string, unknown>) => (
    <a
      href={typeof to === 'string' ? to : '#'}
      onClick={onClick as React.MouseEventHandler}
      {...rest}
    >
      {children as React.ReactNode}
    </a>
  ),
  useNavigate: () => mocks.navigate,
}))

vi.mock('@/services/admin/adminApi', () => ({
  adminGamesApi: {
    updateGame: (...args: unknown[]) => mocks.updateGame(...args),
    deleteGame: (...args: unknown[]) => mocks.deleteGame(...args),
  },
  adminRecommendationsApi: {
    createRecommendations: (...args: unknown[]) => mocks.createRecommendations(...args),
    updateRecommendation: (...args: unknown[]) => mocks.updateRecommendation(...args),
    deleteRecommendation: (...args: unknown[]) => mocks.deleteRecommendation(...args),
  },
}))

vi.mock('sonner', () => ({
  toast: {
    success: (msg: string) => mocks.toastSuccess(msg),
    error: (msg: string) => mocks.toastError(msg),
    info: vi.fn(),
  },
}))

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return { Wrapper, client }
}

async function renderPage() {
  const { Wrapper, client } = makeWrapper()
  const utils = render(<EditGamePage gameId="g1" />, { wrapper: Wrapper })
  await waitFor(() => {
    expect(screen.getAllByRole('group', { name: '受眾' }).length).toBeGreaterThanOrEqual(2)
  })
  return { ...utils, client }
}

describe('EditGamePage — form mode', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((m) => 'mockReset' in m && m.mockReset())
    mocks.updateGame.mockResolvedValue({ error: null })
    mocks.deleteGame.mockResolvedValue({ error: null })
    mocks.createRecommendations.mockResolvedValue({ error: null })
    mocks.updateRecommendation.mockResolvedValue({ error: null })
    mocks.deleteRecommendation.mockResolvedValue({ error: null })
  })

  it('hydrates with both existing recs and a disabled (clean) Save button', async () => {
    await renderPage()
    expect(screen.getAllByRole('radiogroup', { name: '盤口' })).toHaveLength(2)
    expect(screen.getByRole('button', { name: /^儲存變更$/ })).toBeDisabled()
  })

  it('changing a pick on an existing rec marks the page dirty (Save enables)', async () => {
    await renderPage()
    const pickGroups = screen.getAllByRole('radiogroup', { name: '選邊' })
    fireEvent.click(within(pickGroups[0]).getByRole('radio', { name: '客' }))
    expect(screen.getByRole('button', { name: /^儲存變更$/ })).toBeEnabled()
  })

  it('clicking 移除 on a rec marks it for deletion (replaces with 取消刪除)', async () => {
    await renderPage()
    const removeBtns = screen.getAllByRole('button', { name: /移除/ })
    fireEvent.click(removeBtns[0])
    expect(screen.getByRole('button', { name: /取消刪除/ })).toBeInTheDocument()
  })

  it('clicking 取消刪除 reverts the soft-delete', async () => {
    await renderPage()
    fireEvent.click(screen.getAllByRole('button', { name: /移除/ })[0])
    fireEvent.click(screen.getByRole('button', { name: /取消刪除/ }))
    expect(screen.queryByRole('button', { name: /取消刪除/ })).not.toBeInTheDocument()
  })

  it('clicking 移除 then 取消刪除 on a clean existing rec leaves the page non-dirty', async () => {
    await renderPage()
    fireEvent.click(screen.getAllByRole('button', { name: /移除/ })[0])
    fireEvent.click(screen.getByRole('button', { name: /取消刪除/ }))

    expect(screen.getByRole('button', { name: /^儲存變更$/ })).toBeDisabled()
    expect(screen.queryByRole('button', { name: /^捨棄變更$/ })).not.toBeInTheDocument()
  })

  it('Save is disabled if all recs are marked deleted (and no new recs added)', async () => {
    await renderPage()
    const removeBtns = screen.getAllByRole('button', { name: /移除/ })
    fireEvent.click(removeBtns[0])
    fireEvent.click(removeBtns[1])
    expect(screen.getByRole('button', { name: /^儲存變更$/ })).toBeDisabled()
    expect(screen.getByText(/比賽必須至少保留 1 條推薦/)).toBeInTheDocument()
  })

  it('+ 加推薦 adds a new rec defaulting to an unused market', async () => {
    await renderPage()
    fireEvent.click(screen.getByRole('button', { name: /\+ 加推薦/ }))
    const allMarketGroups = screen.getAllByRole('radiogroup', { name: '盤口' })
    expect(allMarketGroups).toHaveLength(3)
    const newRow = allMarketGroups[2]
    expect(within(newRow).getByRole('radio', { name: '大小分' })).toHaveAttribute('aria-checked', 'true')
  })

  it('Save success calls update + create + delete in order then re-hydrates', async () => {
    await renderPage()
    fireEvent.click(within(screen.getAllByRole('radiogroup', { name: '選邊' })[0]).getByRole('radio', { name: '客' }))
    fireEvent.click(screen.getAllByRole('button', { name: /移除/ })[1])
    fireEvent.click(screen.getByRole('button', { name: /\+ 加推薦/ }))

    fireEvent.click(screen.getByRole('button', { name: /^儲存變更$/ }))

    await waitFor(() => {
      expect(mocks.toastSuccess).toHaveBeenCalled()
    })
    expect(mocks.updateRecommendation).toHaveBeenCalledWith(
      'g1',
      'ml',
      expect.objectContaining({ pick: 'away', result: null }),
    )
    expect(mocks.createRecommendations).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ game_id: 'g1', market: 'ou' })]),
    )
    expect(mocks.deleteRecommendation).toHaveBeenCalledWith('g1', 'spread')
  })

  it('clicking a result button on an existing rec stages the result and Save commits it', async () => {
    await renderPage()
    const winButtons = screen.getAllByRole('button', { name: '贏' })
    expect(winButtons.length).toBeGreaterThanOrEqual(2)
    fireEvent.click(winButtons[0])

    expect(screen.getByRole('button', { name: /^儲存變更$/ })).toBeEnabled()

    fireEvent.click(screen.getByRole('button', { name: /^儲存變更$/ }))

    await waitFor(() => {
      expect(mocks.updateRecommendation).toHaveBeenCalledWith(
        'g1',
        'ml',
        expect.objectContaining({ result: 'win' }),
      )
    })
    expect(mocks.toastSuccess).toHaveBeenCalled()
  })

  it('Save failure surfaces toast and keeps the page on edit', async () => {
    mocks.updateRecommendation.mockResolvedValueOnce({ error: { message: 'denied' } })
    await renderPage()
    fireEvent.click(within(screen.getAllByRole('radiogroup', { name: '選邊' })[0]).getByRole('radio', { name: '客' }))
    fireEvent.click(screen.getByRole('button', { name: /^儲存變更$/ }))

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith(expect.stringContaining('denied'))
    })
    expect(mocks.toastSuccess).not.toHaveBeenCalled()
  })

  it('捨棄變更 opens a ConfirmDialog and resets state on confirm', async () => {
    await renderPage()
    fireEvent.click(within(screen.getAllByRole('radiogroup', { name: '選邊' })[0]).getByRole('radio', { name: '客' }))
    expect(screen.getByRole('button', { name: /^儲存變更$/ })).toBeEnabled()

    fireEvent.click(screen.getByRole('button', { name: /^捨棄變更$/ }))
    expect(screen.getByText(/捨棄所有未儲存的變更/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '確認' }))

    await waitFor(() => {
      expect(screen.queryByText(/捨棄所有未儲存的變更/)).not.toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /^儲存變更$/ })).toBeDisabled()
  })

  it('clicking the ← back link while dirty opens the leave dialog', async () => {
    await renderPage()
    fireEvent.click(within(screen.getAllByRole('radiogroup', { name: '選邊' })[0]).getByRole('radio', { name: '客' }))

    fireEvent.click(screen.getByRole('link', { name: /返回比賽管理/ }))

    expect(screen.getByText(/有未儲存的變更/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '離開' }))

    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith({ to: '/admin' })
    })
  })

  it('刪除整場 opens a destructive ConfirmDialog and calls deleteGame on confirm', async () => {
    await renderPage()
    fireEvent.click(screen.getByRole('button', { name: /^刪除整場$/ }))
    expect(screen.getByText(/刪除整場比賽/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '確認' }))

    await waitFor(() => {
      expect(mocks.deleteGame).toHaveBeenCalledWith('g1')
    })
    expect(mocks.navigate).toHaveBeenCalledWith({ to: '/admin' })
  })
})
