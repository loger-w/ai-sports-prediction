import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
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

describe('adminGamesApi.createGames (batch)', () => {
  it('inserts an array and returns the new ids in order', async () => {
    const inserted = [{ id: 'g1' }, { id: 'g2' }]
    const select = vi.fn().mockResolvedValue({ data: inserted, error: null })
    const insert = vi.fn(() => ({ select }))
    const supabase = { from: vi.fn(() => ({ insert })) } as unknown as SupabaseClient
    const api = makeAdminGamesApi(supabase)

    const result = await api.createGames([
      { sport_id: 'mlb', home_team_id: 'a', away_team_id: 'b', game_date: '2026-05-06', game_time: '2026-05-06 09:00:00', status: 'scheduled' },
      { sport_id: 'mlb', home_team_id: 'c', away_team_id: 'd', game_date: '2026-05-06', game_time: '2026-05-06 13:00:00', status: 'scheduled' },
    ])

    expect(supabase.from).toHaveBeenCalledWith('games')
    expect(insert).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ home_team_id: 'a' }),
      expect.objectContaining({ home_team_id: 'c' }),
    ]))
    expect(select).toHaveBeenCalledWith('id')
    expect(result).toEqual({ ids: ['g1', 'g2'], error: null })
  })

  it('returns an empty ids array and the error when supabase rejects', async () => {
    const err = { message: 'unique violation' }
    const select = vi.fn().mockResolvedValue({ data: null, error: err })
    const insert = vi.fn(() => ({ select }))
    const supabase = { from: vi.fn(() => ({ insert })) } as unknown as SupabaseClient
    const api = makeAdminGamesApi(supabase)

    const result = await api.createGames([
      { sport_id: 'mlb', home_team_id: 'a', away_team_id: 'b', game_date: '2026-05-06', game_time: '2026-05-06 09:00:00', status: 'scheduled' },
    ])

    expect(result).toEqual({ ids: [], error: err })
  })

  it('returns immediately without calling supabase when inputs is empty', async () => {
    const insert = vi.fn()
    const supabase = { from: vi.fn(() => ({ insert })) } as unknown as SupabaseClient
    const api = makeAdminGamesApi(supabase)

    const result = await api.createGames([])

    expect(supabase.from).not.toHaveBeenCalled()
    expect(insert).not.toHaveBeenCalled()
    expect(result).toEqual({ ids: [], error: null })
  })
})

describe('adminGamesApi.deleteGames (batch)', () => {
  it('deletes by id IN (...) and returns null error on success', async () => {
    const inFn = vi.fn().mockResolvedValue({ error: null })
    const del = vi.fn(() => ({ in: inFn }))
    const supabase = { from: vi.fn(() => ({ delete: del })) } as unknown as SupabaseClient
    const api = makeAdminGamesApi(supabase)

    const result = await api.deleteGames(['g1', 'g2'])

    expect(supabase.from).toHaveBeenCalledWith('games')
    expect(inFn).toHaveBeenCalledWith('id', ['g1', 'g2'])
    expect(result).toEqual({ error: null })
  })

  it('forwards supabase errors', async () => {
    const err = { message: 'forbidden' }
    const inFn = vi.fn().mockResolvedValue({ error: err })
    const del = vi.fn(() => ({ in: inFn }))
    const supabase = { from: vi.fn(() => ({ delete: del })) } as unknown as SupabaseClient
    const api = makeAdminGamesApi(supabase)

    expect(await api.deleteGames(['g1'])).toEqual({ error: err })
  })

  it('returns immediately without calling supabase when ids is empty', async () => {
    const del = vi.fn()
    const supabase = { from: vi.fn(() => ({ delete: del })) } as unknown as SupabaseClient
    const api = makeAdminGamesApi(supabase)

    const result = await api.deleteGames([])

    expect(supabase.from).not.toHaveBeenCalled()
    expect(del).not.toHaveBeenCalled()
    expect(result).toEqual({ error: null })
  })
})
