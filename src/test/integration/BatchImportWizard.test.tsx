import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { BatchImportWizard } from '@/components/admin/BatchImportWizard'

const stubTeams = [
  { id: 'lad', sport_id: 'mlb', name_zh: '道奇', abbreviation: 'LAD', logo_url: null, external_id: 1 },
  { id: 'nyy', sport_id: 'mlb', name_zh: '洋基', abbreviation: 'NYY', logo_url: null, external_id: 2 },
  { id: 'sf',  sport_id: 'mlb', name_zh: '巨人', abbreviation: 'SF',  logo_url: null, external_id: 3 },
  { id: 'bos', sport_id: 'mlb', name_zh: '紅襪', abbreviation: 'BOS', logo_url: null, external_id: 4 },
]

const stubSchedule = [
  { external_game_id: 11, home_team_external_id: 2, away_team_external_id: 1, home_team_name: 'Yankees', away_team_name: 'Dodgers', game_date_tw: '2026-05-06', game_time_tw: '2026-05-06 09:00:00', status: 'scheduled' },
  { external_game_id: 12, home_team_external_id: 4, away_team_external_id: 3, home_team_name: 'Red Sox', away_team_name: 'Giants', game_date_tw: '2026-05-06', game_time_tw: '2026-05-06 13:00:00', status: 'scheduled' },
]

const mocks = vi.hoisted(() => ({
  createGames: vi.fn(),
  deleteGames: vi.fn(),
  createRecommendations: vi.fn(),
  navigate: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  fetchSchedule: vi.fn(),
}))

vi.mock('@/lib/supabase', () => {
  const teamsSelect = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn(() => Promise.resolve({ data: stubTeams, error: null })),
  }
  return {
    supabase: {
      from: (table: string) => {
        if (table === 'teams') return teamsSelect
        throw new Error(`unmocked from(${table})`)
      },
    },
  }
})

vi.mock('@/services/mlb/scheduleApi', () => ({
  fetchMlbScheduleByTaiwanDate: (...args: unknown[]) => mocks.fetchSchedule(...args),
}))

vi.mock('@/services/admin/adminApi', () => ({
  adminGamesApi: {
    createGames: (...args: unknown[]) => mocks.createGames(...args),
    deleteGames: (...args: unknown[]) => mocks.deleteGames(...args),
  },
  adminRecommendationsApi: {
    createRecommendations: (...args: unknown[]) => mocks.createRecommendations(...args),
  },
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, ...rest }: Record<string, unknown>) => (
    <a {...rest}>{children as React.ReactNode}</a>
  ),
  useNavigate: () => mocks.navigate,
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

async function renderWizard() {
  mocks.fetchSchedule.mockResolvedValue(stubSchedule)
  const { Wrapper } = makeWrapper()
  const utils = render(<BatchImportWizard />, { wrapper: Wrapper })
  await waitFor(() => {
    expect(screen.getByText(/LAD @ NYY/)).toBeInTheDocument()
  })
  return utils
}

async function selectAndAdvance(rowsToCheck: number[]) {
  const allCheckboxes = screen.getAllByRole('checkbox')
  for (const idx of rowsToCheck) fireEvent.click(allCheckboxes[idx])
  fireEvent.click(screen.getByRole('button', { name: /下一步/ }))
  await waitFor(() => {
    expect(screen.getByText(/Step 2/i)).toBeInTheDocument()
  })
}

describe('BatchImportWizard', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((m) => 'mockReset' in m && m.mockReset())
    mocks.createGames.mockResolvedValue({ ids: ['g11', 'g12'], error: null })
    mocks.createRecommendations.mockResolvedValue({ error: null })
    mocks.deleteGames.mockResolvedValue({ error: null })
  })

  it('Step 1 → 下一步 advances to Step 2 with one card per selected game', async () => {
    await renderWizard()
    await selectAndAdvance([0, 1])

    expect(screen.getByText(/LAD @ NYY/)).toBeInTheDocument()
    expect(screen.getByText(/SF @ BOS/)).toBeInTheDocument()
  })

  it('Step 2 pre-seeds each card with one default rec (warning hidden, submit enabled)', async () => {
    await renderWizard()
    await selectAndAdvance([0])

    // pre-seeded means no warning and the form is already visible
    expect(screen.queryByText(/請至少加 1 條推薦/)).not.toBeInTheDocument()
    expect(screen.getByRole('radiogroup', { name: '盤口' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /建立/ })).toBeEnabled()
  })

  it('section header + 加推薦 button shows the count of remaining markets', async () => {
    await renderWizard()
    await selectAndAdvance([0])

    // pre-seeded ML → 2 markets remaining (spread + ou)
    expect(screen.getByRole('button', { name: /再加一條推薦/ })).toHaveTextContent(/2 個盤口可加/)
  })

  it('clicking + 加推薦 appends a 2nd rec to that card', async () => {
    await renderWizard()
    await selectAndAdvance([0])

    expect(screen.getAllByRole('radiogroup', { name: '盤口' })).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: /再加一條推薦/ }))
    expect(screen.getAllByRole('radiogroup', { name: '盤口' })).toHaveLength(2)
  })

  it('successful submit creates one rec per game (one per card by default) and navigates', async () => {
    await renderWizard()
    await selectAndAdvance([0, 1])

    fireEvent.click(screen.getByRole('button', { name: /建立/ }))

    await waitFor(() => {
      expect(mocks.createGames).toHaveBeenCalledTimes(1)
    })
    expect(mocks.createGames).toHaveBeenCalledWith([
      expect.objectContaining({ home_team_id: 'nyy', away_team_id: 'lad' }),
      expect.objectContaining({ home_team_id: 'bos', away_team_id: 'sf' }),
    ])
    await waitFor(() => {
      expect(mocks.createRecommendations).toHaveBeenCalledTimes(1)
    })
    const recsArg = mocks.createRecommendations.mock.calls[0][0] as { game_id: string }[]
    expect(recsArg.map((r) => r.game_id)).toEqual(['g11', 'g12'])
    expect(mocks.deleteGames).not.toHaveBeenCalled()
    expect(mocks.toastSuccess).toHaveBeenCalled()
    expect(mocks.navigate).toHaveBeenCalledWith({ to: '/admin' })
  })

  it('rec-insert failure triggers compensating deleteGames and surfaces an error toast', async () => {
    mocks.createRecommendations.mockResolvedValueOnce({ error: { message: 'unique violation' } })
    await renderWizard()
    await selectAndAdvance([0, 1])

    fireEvent.click(screen.getByRole('button', { name: /建立/ }))

    await waitFor(() => {
      expect(mocks.deleteGames).toHaveBeenCalledWith(['g11', 'g12'])
    })
    expect(mocks.toastError).toHaveBeenCalledWith(expect.stringContaining('unique violation'))
    expect(mocks.navigate).not.toHaveBeenCalled()
  })

  it('← 回去改選擇 returns to Step 1 with selection preserved', async () => {
    await renderWizard()
    await selectAndAdvance([0])

    fireEvent.click(screen.getByRole('button', { name: /回去改選擇/ }))

    expect(screen.queryByText(/Step 2/i)).not.toBeInTheDocument()
    const checkboxes = screen.getAllByRole('checkbox')
    expect((checkboxes[0] as HTMLInputElement).checked).toBe(true)
  })

  it('deselecting a game in Step 1 then re-advancing drops its rec data', async () => {
    await renderWizard()
    await selectAndAdvance([0, 1])

    fireEvent.click(screen.getByRole('button', { name: /回去改選擇/ }))
    fireEvent.click(screen.getAllByRole('checkbox')[0])  // deselect first
    fireEvent.click(screen.getByRole('button', { name: /下一步/ }))

    await waitFor(() => {
      expect(screen.getByText(/SF @ BOS/)).toBeInTheDocument()
    })
    expect(screen.queryByText(/LAD @ NYY/)).not.toBeInTheDocument()
    // Surviving card still pre-seeded with 1 rec
    expect(screen.getAllByRole('radiogroup', { name: '盤口' })).toHaveLength(1)
    expect(screen.queryByText(/請至少加 1 條推薦/)).not.toBeInTheDocument()
  })
})
