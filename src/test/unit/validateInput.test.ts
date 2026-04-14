import { describe, it, expect } from 'vitest'
import { validatePredictionsPayload } from '@/lib/predictions/ingest-helpers'

function validItem(overrides?: Record<string, unknown>) {
  return {
    home_team: 'LAD',
    away_team: 'SF',
    game_time: '2026-04-15T22:10:00Z',
    predicted_winner: 'home',
    predicted_home_pct: 62.0,
    ml_stars: 4,
    ou_line: 8.5,
    ou_rec: 'under',
    ou_stars: 3,
    run_line: -1.5,
    run_line_rec: 'home',
    run_line_stars: 3,
    ...overrides,
  }
}

function validPayload(overrides?: Record<string, unknown>) {
  return {
    date: '2026-04-15',
    predictions: [validItem()],
    ...overrides,
  }
}

describe('validatePredictionsPayload', () => {
  it('returns parsed payload for valid data', () => {
    const result = validatePredictionsPayload(validPayload())
    expect(result.date).toBe('2026-04-15')
    expect(result.predictions).toHaveLength(1)
    expect(result.predictions[0].home_team).toBe('LAD')
  })

  it.each([null, 'string', 123])('throws for non-object body: %s', (body) => {
    expect(() => validatePredictionsPayload(body)).toThrow('Request body must be a JSON object')
  })

  it('throws for invalid date format', () => {
    expect(() => validatePredictionsPayload(validPayload({ date: '04-15-2026' }))).toThrow('date must be YYYY-MM-DD')
  })

  it('throws for empty predictions array', () => {
    expect(() => validatePredictionsPayload(validPayload({ predictions: [] }))).toThrow('predictions must be a non-empty array')
  })

  it('throws for missing home_team', () => {
    const item = validItem()
    delete (item as Record<string, unknown>).home_team
    expect(() => validatePredictionsPayload(validPayload({ predictions: [item] }))).toThrow('predictions[0].home_team is required')
  })

  it('throws for missing game_time', () => {
    const item = validItem()
    delete (item as Record<string, unknown>).game_time
    expect(() => validatePredictionsPayload(validPayload({ predictions: [item] }))).toThrow('predictions[0].game_time is required')
  })

  it('throws when all markets are null', () => {
    const item = validItem({
      predicted_winner: null,
      predicted_home_pct: null,
      ml_stars: null,
      ou_rec: null,
      ou_line: null,
      ou_stars: null,
      run_line_rec: null,
      run_line: null,
      run_line_stars: null,
    })
    expect(() => validatePredictionsPayload(validPayload({ predictions: [item] }))).toThrow('at least one market must be non-null')
  })

  it('passes when only moneyline market is set', () => {
    const item = validItem({
      ou_rec: null,
      ou_line: null,
      ou_stars: null,
      run_line_rec: null,
      run_line: null,
      run_line_stars: null,
    })
    expect(() => validatePredictionsPayload(validPayload({ predictions: [item] }))).not.toThrow()
  })

  it('throws for invalid predicted_winner value', () => {
    const item = validItem({ predicted_winner: 'draw' })
    expect(() => validatePredictionsPayload(validPayload({ predictions: [item] }))).toThrow("predicted_winner must be 'home' or 'away'")
  })

  it('throws when predicted_home_pct is out of range', () => {
    const item = validItem({ predicted_home_pct: 110 })
    expect(() => validatePredictionsPayload(validPayload({ predictions: [item] }))).toThrow('predicted_home_pct must be 0–100')
  })

  it('throws when ml_stars is out of range', () => {
    const item = validItem({ ml_stars: 6 })
    expect(() => validatePredictionsPayload(validPayload({ predictions: [item] }))).toThrow('ml_stars must be integer 1–5')
  })

  it('throws for invalid ou_rec value', () => {
    const item = validItem({ ou_rec: 'push' })
    expect(() => validatePredictionsPayload(validPayload({ predictions: [item] }))).toThrow("ou_rec must be 'over' or 'under'")
  })

  it('throws when ou_line is not a number', () => {
    const item = validItem({ ou_line: '8.5' })
    expect(() => validatePredictionsPayload(validPayload({ predictions: [item] }))).toThrow('ou_line must be a number')
  })

  it('throws for invalid run_line_rec value', () => {
    const item = validItem({ run_line_rec: 'draw' })
    expect(() => validatePredictionsPayload(validPayload({ predictions: [item] }))).toThrow("run_line_rec must be 'home' or 'away'")
  })

  it('throws when run_line_stars is not an integer', () => {
    const item = validItem({ run_line_stars: 2.5 })
    expect(() => validatePredictionsPayload(validPayload({ predictions: [item] }))).toThrow('run_line_stars must be integer 1–5')
  })
})
