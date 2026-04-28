import { describe, it, expect, beforeEach } from 'vitest'
import { usePredictionStore } from '@/stores/predictions/predictionStore'

describe('predictionStore', () => {
  beforeEach(() => {
    usePredictionStore.getState().resetFilters()
  })

  it('default sport is "all"', () => {
    expect(usePredictionStore.getState().sport).toBe('all')
  })

  it('default markets contain ml, spread, ou', () => {
    const m = usePredictionStore.getState().markets
    expect(m.has('ml')).toBe(true)
    expect(m.has('spread')).toBe(true)
    expect(m.has('ou')).toBe(true)
    expect(m.size).toBe(3)
  })

  it('default minStars is 1', () => {
    expect(usePredictionStore.getState().minStars).toBe(1)
  })

  it('default sortBy is "stars"', () => {
    expect(usePredictionStore.getState().sortBy).toBe('stars')
  })

  it('toggleMarket removes a present market', () => {
    usePredictionStore.getState().toggleMarket('ml')
    expect(usePredictionStore.getState().markets.has('ml')).toBe(false)
  })

  it('toggleMarket adds an absent market', () => {
    usePredictionStore.getState().toggleMarket('ml')
    usePredictionStore.getState().toggleMarket('ml')
    expect(usePredictionStore.getState().markets.has('ml')).toBe(true)
  })

  it('setMinStars clamps to 1-5', () => {
    usePredictionStore.getState().setMinStars(0)
    expect(usePredictionStore.getState().minStars).toBe(1)
    usePredictionStore.getState().setMinStars(7)
    expect(usePredictionStore.getState().minStars).toBe(5)
    usePredictionStore.getState().setMinStars(3)
    expect(usePredictionStore.getState().minStars).toBe(3)
  })

  it('setSortBy switches between time and stars', () => {
    usePredictionStore.getState().setSortBy('time')
    expect(usePredictionStore.getState().sortBy).toBe('time')
    usePredictionStore.getState().setSortBy('stars')
    expect(usePredictionStore.getState().sortBy).toBe('stars')
  })

  it('resetFilters returns to defaults', () => {
    const s = usePredictionStore.getState()
    s.setSport('mlb')
    s.setMinStars(4)
    s.toggleMarket('ml')
    s.setSortBy('time')
    s.resetFilters()

    const after = usePredictionStore.getState()
    expect(after.sport).toBe('all')
    expect(after.minStars).toBe(1)
    expect(after.markets.size).toBe(3)
    expect(after.sortBy).toBe('stars')
  })
})
