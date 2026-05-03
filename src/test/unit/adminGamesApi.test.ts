import { describe, expect, it, vi } from 'vitest'
import { makeAdminGamesApi } from '@/services/admin/games'

describe('makeAdminGamesApi', () => {
  it('createGame inserts to games and returns the new row id', async () => {
    const single = vi.fn(() =>
      Promise.resolve({ data: { id: 'g-new' }, error: null }),
    )
    const select = vi.fn(() => ({ single }))
    const insert = vi.fn(() => ({ select }))
    const fromMock = vi.fn(() => ({ insert }))
    const supabase = { from: fromMock } as never

    const api = makeAdminGamesApi(supabase)
    const result = await api.createGame({
      sport_id: 'mlb',
      home_team_id: 'lad',
      away_team_id: 'sd',
      game_date: '2026-05-04',
      game_time: '2026-05-04 19:00:00',
      status: 'scheduled',
    })

    expect(fromMock).toHaveBeenCalledWith('games')
    expect(insert).toHaveBeenCalledWith({
      sport_id: 'mlb',
      home_team_id: 'lad',
      away_team_id: 'sd',
      game_date: '2026-05-04',
      game_time: '2026-05-04 19:00:00',
      status: 'scheduled',
    })
    expect(select).toHaveBeenCalledWith('id')
    expect(result).toEqual({ id: 'g-new', error: null })
  })

  it('createGame returns error when supabase fails', async () => {
    const supabase = {
      from: () => ({
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: null, error: { message: 'fk' } }),
          }),
        }),
      }),
    } as never
    const api = makeAdminGamesApi(supabase)
    const result = await api.createGame({
      sport_id: 'mlb',
      home_team_id: 'lad',
      away_team_id: 'sd',
      game_date: '2026-05-04',
      game_time: '2026-05-04 19:00:00',
      status: 'scheduled',
    })
    expect(result.id).toBeNull()
    expect(result.error?.message).toBe('fk')
  })

  it('updateGame issues update().eq("id", X) with patch', async () => {
    const eq = vi.fn(() => Promise.resolve({ data: null, error: null }))
    const update = vi.fn(() => ({ eq }))
    const fromMock = vi.fn(() => ({ update }))
    const supabase = { from: fromMock } as never

    const api = makeAdminGamesApi(supabase)
    const result = await api.updateGame('g1', { status: 'final' })

    expect(fromMock).toHaveBeenCalledWith('games')
    expect(update).toHaveBeenCalledWith({ status: 'final' })
    expect(eq).toHaveBeenCalledWith('id', 'g1')
    expect(result).toEqual({ error: null })
  })

  it('deleteGame issues delete().eq("id", X)', async () => {
    const eq = vi.fn(() => Promise.resolve({ data: null, error: null }))
    const del = vi.fn(() => ({ eq }))
    const fromMock = vi.fn(() => ({ delete: del }))
    const supabase = { from: fromMock } as never

    const api = makeAdminGamesApi(supabase)
    const result = await api.deleteGame('g1')

    expect(fromMock).toHaveBeenCalledWith('games')
    expect(del).toHaveBeenCalledOnce()
    expect(eq).toHaveBeenCalledWith('id', 'g1')
    expect(result).toEqual({ error: null })
  })
})
