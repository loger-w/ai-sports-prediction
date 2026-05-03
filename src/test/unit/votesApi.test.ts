import { describe, expect, it, vi } from 'vitest'
import { makeVotesApi } from '@/services/votes/api'
import type { VoteRow } from '@/types/predictions/vote'

describe('makeVotesApi', () => {
  it('fetchUserVotes selects votes filtered by user_id', async () => {
    const rows: VoteRow[] = [
      {
        user_id: 'u1',
        game_id: 'g1',
        market: 'ml',
        value: 1,
        created_at: '2026-05-03T00:00:00Z',
        updated_at: '2026-05-03T00:00:00Z',
      },
    ]
    const eqMock = vi.fn(() => Promise.resolve({ data: rows, error: null }))
    const selectMock = vi.fn(() => ({ eq: eqMock }))
    const fromMock = vi.fn(() => ({ select: selectMock }))
    const supabase = { from: fromMock } as never

    const api = makeVotesApi(supabase)
    const result = await api.fetchUserVotes('u1')

    expect(fromMock).toHaveBeenCalledWith('votes')
    expect(selectMock).toHaveBeenCalledWith('*')
    expect(eqMock).toHaveBeenCalledWith('user_id', 'u1')
    expect(result).toEqual(rows)
  })

  it('fetchUserVotes throws on error', async () => {
    const eqMock = vi.fn(() =>
      Promise.resolve({ data: null, error: { message: 'boom' } }),
    )
    const supabase = {
      from: () => ({ select: () => ({ eq: eqMock }) }),
    } as never

    const api = makeVotesApi(supabase)
    await expect(api.fetchUserVotes('u1')).rejects.toMatchObject({ message: 'boom' })
  })

  it('upsertVote calls supabase.from("votes").upsert with full row + onConflict key', async () => {
    const upsertMock = vi.fn(() => Promise.resolve({ data: null, error: null }))
    const fromMock = vi.fn(() => ({ upsert: upsertMock }))
    const supabase = { from: fromMock } as never

    const api = makeVotesApi(supabase)
    const result = await api.upsertVote({
      user_id: 'u1',
      game_id: 'g1',
      market: 'ml',
      value: 1,
    })

    expect(fromMock).toHaveBeenCalledWith('votes')
    expect(upsertMock).toHaveBeenCalledWith(
      { user_id: 'u1', game_id: 'g1', market: 'ml', value: 1 },
      { onConflict: 'user_id,game_id,market' },
    )
    expect(result).toEqual({ error: null })
  })

  it('upsertVote returns supabase error if any', async () => {
    const supabase = {
      from: () => ({
        upsert: () => Promise.resolve({ data: null, error: { message: 'rls' } }),
      }),
    } as never
    const api = makeVotesApi(supabase)
    const result = await api.upsertVote({
      user_id: 'u1',
      game_id: 'g1',
      market: 'ml',
      value: -1,
    })
    expect(result.error).toMatchObject({ message: 'rls' })
  })

  it('deleteVote chains .eq for user_id, game_id, market', async () => {
    const eq3 = vi.fn(() => Promise.resolve({ data: null, error: null }))
    const eq2 = vi.fn(() => ({ eq: eq3 }))
    const eq1 = vi.fn(() => ({ eq: eq2 }))
    const deleteMock = vi.fn(() => ({ eq: eq1 }))
    const fromMock = vi.fn(() => ({ delete: deleteMock }))
    const supabase = { from: fromMock } as never

    const api = makeVotesApi(supabase)
    const result = await api.deleteVote({
      user_id: 'u1',
      game_id: 'g1',
      market: 'ou',
    })

    expect(fromMock).toHaveBeenCalledWith('votes')
    expect(deleteMock).toHaveBeenCalledOnce()
    expect(eq1).toHaveBeenCalledWith('user_id', 'u1')
    expect(eq2).toHaveBeenCalledWith('game_id', 'g1')
    expect(eq3).toHaveBeenCalledWith('market', 'ou')
    expect(result).toEqual({ error: null })
  })
})
