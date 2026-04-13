import { describe, it, expect, beforeEach } from 'vitest'
import { usePredictionStore } from '@/stores/predictions/predictionStore'

describe('predictionStore', () => {
  beforeEach(() => {
    usePredictionStore.getState().resetFilters()
  })

  it('has correct initial state with localToday dateRange and minStars 1', () => {
    const state = usePredictionStore.getState()
    expect(state.sport).toBe('all')
    expect(state.dateRange).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(state.minStars).toBe(1)
  })

  it('setSport updates sport', () => {
    usePredictionStore.getState().setSport('nba')
    expect(usePredictionStore.getState().sport).toBe('nba')
  })

  it('setDateRange accepts YYYY-MM-DD strings', () => {
    usePredictionStore.getState().setDateRange('2026-04-20')
    expect(usePredictionStore.getState().dateRange).toBe('2026-04-20')
  })

  it('setMinStars updates minStars', () => {
    usePredictionStore.getState().setMinStars(4)
    expect(usePredictionStore.getState().minStars).toBe(4)
  })

  it('resetFilters resets to initial state', () => {
    usePredictionStore.getState().setSport('nba')
    usePredictionStore.getState().setDateRange('2026-04-20')
    usePredictionStore.getState().setMinStars(4)
    usePredictionStore.getState().resetFilters()

    const state = usePredictionStore.getState()
    expect(state.sport).toBe('all')
    expect(state.dateRange).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(state.minStars).toBe(1)
  })
})
