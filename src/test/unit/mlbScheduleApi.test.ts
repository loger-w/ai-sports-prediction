import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchMlbScheduleByTaiwanDate } from '@/services/mlb/scheduleApi'

// Two ET dates' worth of fixture games, covering the typical TW-day boundary cases.
const FIXTURE = {
  dates: [
    {
      date: '2026-05-04',
      games: [
        // ET 5/4 19:05 = UTC 5/4 23:05 = TW 5/5 07:05  → in scope when twDate=2026-05-05
        {
          gamePk: 1001,
          gameDate: '2026-05-04T23:05:00Z',
          status: { detailedState: 'Scheduled' },
          teams: {
            home: { team: { id: 147, name: 'New York Yankees' } },
            away: { team: { id: 111, name: 'Boston Red Sox' } },
          },
        },
        // ET 5/4 13:05 = UTC 5/4 17:05 = TW 5/5 01:05  → in scope when twDate=2026-05-05
        {
          gamePk: 1002,
          gameDate: '2026-05-04T17:05:00Z',
          status: { detailedState: 'Scheduled' },
          teams: {
            home: { team: { id: 119, name: 'Los Angeles Dodgers' } },
            away: { team: { id: 135, name: 'San Diego Padres' } },
          },
        },
      ],
    },
    {
      date: '2026-05-05',
      games: [
        // ET 5/5 13:05 = UTC 5/5 17:05 = TW 5/6 01:05  → out of scope when twDate=2026-05-05
        {
          gamePk: 1003,
          gameDate: '2026-05-05T17:05:00Z',
          status: { detailedState: 'Scheduled' },
          teams: {
            home: { team: { id: 144, name: 'Atlanta Braves' } },
            away: { team: { id: 121, name: 'New York Mets' } },
          },
        },
      ],
    },
  ],
}

describe('fetchMlbScheduleByTaiwanDate', () => {
  const realFetch = globalThis.fetch
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => FIXTURE,
    } as unknown as Response)
    globalThis.fetch = mockFetch as unknown as typeof globalThis.fetch
  })

  afterEach(() => {
    globalThis.fetch = realFetch
  })

  it('queries the MLB API with startDate=TW-1 day and endDate=TW day', async () => {
    await fetchMlbScheduleByTaiwanDate('2026-05-05')
    expect(mockFetch).toHaveBeenCalledTimes(1)
    const url = mockFetch.mock.calls[0][0] as string
    expect(url).toContain('startDate=2026-05-04')
    expect(url).toContain('endDate=2026-05-05')
    expect(url).toContain('sportId=1')
  })

  it('keeps games whose TW date matches and drops games that fall on the next TW day', async () => {
    const games = await fetchMlbScheduleByTaiwanDate('2026-05-05')
    const ids = games.map((g) => g.external_game_id).sort()
    expect(ids).toEqual([1001, 1002])
  })

  it('converts UTC gameDate to "YYYY-MM-DD HH:mm:ss" Taiwan-local string', async () => {
    const games = await fetchMlbScheduleByTaiwanDate('2026-05-05')
    const yankees = games.find((g) => g.external_game_id === 1001)!
    expect(yankees.game_time_tw).toBe('2026-05-05 07:05:00')
    expect(yankees.game_date_tw).toBe('2026-05-05')
  })

  it('throws on HTTP error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => ({}),
    } as unknown as Response)
    await expect(fetchMlbScheduleByTaiwanDate('2026-05-05')).rejects.toThrow(/500/)
  })

  it('sorts results by game time ascending', async () => {
    const games = await fetchMlbScheduleByTaiwanDate('2026-05-05')
    expect(games[0].external_game_id).toBe(1002) // earlier (UTC 17:05)
    expect(games[1].external_game_id).toBe(1001) // later (UTC 23:05)
  })
})
