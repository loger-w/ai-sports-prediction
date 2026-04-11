import { describe, it, expect } from 'vitest'
import { validateInput } from '@/lib/predictions/ingest-helpers'

function validPrediction(overrides?: Record<string, unknown>) {
  return {
    home_team: 'LAL',
    away_team: 'BOS',
    game_time: '2026-04-12T02:30:00Z',
    home_win_pct: 60,
    away_win_pct: 40,
    over_under_line: 215.5,
    over_pct: 55,
    under_pct: 45,
    explanation_en: 'Lakers favored',
    explanation_zh: '湖人被看好',
    ...overrides,
  }
}

function validInput(overrides?: Record<string, unknown>) {
  return {
    date: '2026-04-12',
    sport: 'nba' as const,
    predictions: [validPrediction()],
    ...overrides,
  }
}

describe('validateInput', () => {
  it('returns parsed input for valid data', () => {
    const input = validInput()
    const result = validateInput(input)
    expect(result.date).toBe('2026-04-12')
    expect(result.sport).toBe('nba')
    expect(result.predictions).toHaveLength(1)
  })

  it.each([null, 'string', 123])('throws for non-object body: %s', (body) => {
    expect(() => validateInput(body)).toThrow('Request body must be a JSON object')
  })

  it('throws for invalid date format', () => {
    expect(() => validateInput(validInput({ date: '04-12-2026' }))).toThrow('date must be YYYY-MM-DD')
  })

  it('throws for invalid sport', () => {
    expect(() => validateInput(validInput({ sport: 'nfl' }))).toThrow('sport must be "nba" or "mlb"')
  })

  it('throws for empty predictions array', () => {
    expect(() => validateInput(validInput({ predictions: [] }))).toThrow('predictions must be a non-empty array')
  })

  it('throws for missing required field', () => {
    const pred = validPrediction()
    delete (pred as Record<string, unknown>).home_team
    expect(() => validateInput(validInput({ predictions: [pred] }))).toThrow('predictions[0].home_team is required')
  })

  it('throws when win percentages are not numbers', () => {
    const pred = validPrediction({ home_win_pct: '60' })
    expect(() => validateInput(validInput({ predictions: [pred] }))).toThrow('win percentages must be numbers')
  })

  it('throws when win percentages do not sum to 100', () => {
    const pred = validPrediction({ home_win_pct: 60, away_win_pct: 30 })
    expect(() => validateInput(validInput({ predictions: [pred] }))).toThrow('must equal 100')
  })

  it('passes when win percentages sum is within ±0.01 of 100', () => {
    const pred = validPrediction({ home_win_pct: 60.005, away_win_pct: 39.999 })
    expect(() => validateInput(validInput({ predictions: [pred] }))).not.toThrow()
  })
})
