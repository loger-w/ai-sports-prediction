import { describe, expect, it, vi } from 'vitest'
import { makeAdminRecommendationsApi } from '@/services/admin/recommendations'

describe('makeAdminRecommendationsApi', () => {
  it('createRecommendations inserts rows with source="manual"', async () => {
    const insert = vi.fn(() => Promise.resolve({ data: null, error: null }))
    const fromMock = vi.fn(() => ({ insert }))
    const supabase = { from: fromMock } as never

    const api = makeAdminRecommendationsApi(supabase)
    const result = await api.createRecommendations([
      { game_id: 'g1', market: 'ml', pick: 'home', line: null, stars: 3 },
      { game_id: 'g1', market: 'spread', pick: 'home', line: -1.5, stars: 2 },
    ])

    expect(fromMock).toHaveBeenCalledWith('recommendations')
    expect(insert).toHaveBeenCalledWith([
      { game_id: 'g1', market: 'ml', pick: 'home', line: null, stars: 3, source: 'manual' },
      { game_id: 'g1', market: 'spread', pick: 'home', line: -1.5, stars: 2, source: 'manual' },
    ])
    expect(result).toEqual({ error: null })
  })

  it('updateRecommendation chains .eq for game_id and market with patch', async () => {
    const eq2 = vi.fn(() => Promise.resolve({ data: null, error: null }))
    const eq1 = vi.fn(() => ({ eq: eq2 }))
    const update = vi.fn(() => ({ eq: eq1 }))
    const fromMock = vi.fn(() => ({ update }))
    const supabase = { from: fromMock } as never

    const api = makeAdminRecommendationsApi(supabase)
    const result = await api.updateRecommendation('g1', 'ou', { stars: 5 })

    expect(fromMock).toHaveBeenCalledWith('recommendations')
    expect(update).toHaveBeenCalledWith({ stars: 5 })
    expect(eq1).toHaveBeenCalledWith('game_id', 'g1')
    expect(eq2).toHaveBeenCalledWith('market', 'ou')
    expect(result).toEqual({ error: null })
  })

  it('deleteRecommendation issues delete().eq().eq()', async () => {
    const eq2 = vi.fn(() => Promise.resolve({ data: null, error: null }))
    const eq1 = vi.fn(() => ({ eq: eq2 }))
    const del = vi.fn(() => ({ eq: eq1 }))
    const fromMock = vi.fn(() => ({ delete: del }))
    const supabase = { from: fromMock } as never

    const api = makeAdminRecommendationsApi(supabase)
    const result = await api.deleteRecommendation('g1', 'spread')

    expect(fromMock).toHaveBeenCalledWith('recommendations')
    expect(del).toHaveBeenCalledOnce()
    expect(eq1).toHaveBeenCalledWith('game_id', 'g1')
    expect(eq2).toHaveBeenCalledWith('market', 'spread')
    expect(result).toEqual({ error: null })
  })

  it('setRecommendationResult updates {result} for given game_id+market', async () => {
    const eq2 = vi.fn(() => Promise.resolve({ data: null, error: null }))
    const eq1 = vi.fn(() => ({ eq: eq2 }))
    const update = vi.fn(() => ({ eq: eq1 }))
    const fromMock = vi.fn(() => ({ update }))
    const supabase = { from: fromMock } as never

    const api = makeAdminRecommendationsApi(supabase)
    const result = await api.setRecommendationResult('g1', 'ml', 'win')

    expect(fromMock).toHaveBeenCalledWith('recommendations')
    expect(update).toHaveBeenCalledWith({ result: 'win' })
    expect(eq1).toHaveBeenCalledWith('game_id', 'g1')
    expect(eq2).toHaveBeenCalledWith('market', 'ml')
    expect(result).toEqual({ error: null })
  })

  it('setRecommendationResult accepts null to clear result', async () => {
    const eq2 = vi.fn(() => Promise.resolve({ data: null, error: null }))
    const eq1 = vi.fn(() => ({ eq: eq2 }))
    const update = vi.fn(() => ({ eq: eq1 }))
    const supabase = { from: () => ({ update }) } as never

    const api = makeAdminRecommendationsApi(supabase)
    await api.setRecommendationResult('g1', 'ml', null)
    expect(update).toHaveBeenCalledWith({ result: null })
  })
})
