import { describe, it, expect, beforeEach } from 'vitest'
import { usePredictionStore } from '@/stores/predictions/predictionStore'

describe('predictionStore', () => {
  beforeEach(() => {
    usePredictionStore.getState().resetFilters()
  })

  it('has correct initial state', () => {
    const state = usePredictionStore.getState()
    expect(state.sport).toBe('all')
    expect(state.dateRange).toBe('today')
    expect(state.confidence).toEqual([])
    expect(state.direction).toBe('all')
  })

  it('setSport updates sport', () => {
    usePredictionStore.getState().setSport('nba')
    expect(usePredictionStore.getState().sport).toBe('nba')
  })

  it('setDateRange updates dateRange', () => {
    usePredictionStore.getState().setDateRange('week')
    expect(usePredictionStore.getState().dateRange).toBe('week')
  })

  it('toggleConfidence adds a level', () => {
    usePredictionStore.getState().toggleConfidence('high')
    expect(usePredictionStore.getState().confidence).toEqual(['high'])
  })

  it('toggleConfidence removes a level when toggled again', () => {
    usePredictionStore.getState().toggleConfidence('high')
    usePredictionStore.getState().toggleConfidence('high')
    expect(usePredictionStore.getState().confidence).toEqual([])
  })

  it('toggleConfidence accumulates multiple levels', () => {
    usePredictionStore.getState().toggleConfidence('high')
    usePredictionStore.getState().toggleConfidence('medium')
    expect(usePredictionStore.getState().confidence).toEqual(['high', 'medium'])
  })

  it('setDirection updates direction', () => {
    usePredictionStore.getState().setDirection('home')
    expect(usePredictionStore.getState().direction).toBe('home')
  })

  it('resetFilters resets to initial state', () => {
    usePredictionStore.getState().setSport('nba')
    usePredictionStore.getState().setDateRange('week')
    usePredictionStore.getState().toggleConfidence('high')
    usePredictionStore.getState().setDirection('home')
    usePredictionStore.getState().resetFilters()

    const state = usePredictionStore.getState()
    expect(state.sport).toBe('all')
    expect(state.dateRange).toBe('today')
    expect(state.confidence).toEqual([])
    expect(state.direction).toBe('all')
  })
})
