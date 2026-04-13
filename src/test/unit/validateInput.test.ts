import { describe, it, expect } from 'vitest'
import { validateInput } from '@/lib/predictions/ingest-helpers'

function validPrediction(overrides?: Record<string, unknown>) {
  return {
    home_team: 'LAL',
    away_team: 'BOS',
    game_time: '2026-04-12T02:30:00Z',
    moneyline_home_pct: 60,
    moneyline_away_pct: 40,
    moneyline_stars: 4,
    spread_stars: 3,
    over_under_stars: 2,
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

  it('throws when moneyline percentages are not numbers', () => {
    const pred = validPrediction({ moneyline_home_pct: '60' })
    expect(() => validateInput(validInput({ predictions: [pred] }))).toThrow('moneyline percentages must be numbers')
  })

  it('throws when moneyline percentages do not sum to 100', () => {
    const pred = validPrediction({ moneyline_home_pct: 60, moneyline_away_pct: 30 })
    expect(() => validateInput(validInput({ predictions: [pred] }))).toThrow('must equal 100')
  })

  it('passes when moneyline percentages sum is within ±0.01 of 100', () => {
    const pred = validPrediction({ moneyline_home_pct: 60.005, moneyline_away_pct: 39.999 })
    expect(() => validateInput(validInput({ predictions: [pred] }))).not.toThrow()
  })

  it('throws when moneyline_stars is out of range', () => {
    const pred = validPrediction({ moneyline_stars: 6 })
    expect(() => validateInput(validInput({ predictions: [pred] }))).toThrow('moneyline_stars must be integer 1–5')
  })

  it('throws when spread_stars is not an integer', () => {
    const pred = validPrediction({ spread_stars: 2.5 })
    expect(() => validateInput(validInput({ predictions: [pred] }))).toThrow('spread_stars must be integer 1–5')
  })

  it('throws when over_under_stars is zero', () => {
    const pred = validPrediction({ over_under_stars: 0 })
    expect(() => validateInput(validInput({ predictions: [pred] }))).toThrow('over_under_stars must be integer 1–5')
  })

  it('throws for missing moneyline_stars', () => {
    const pred = validPrediction()
    delete (pred as Record<string, unknown>).moneyline_stars
    expect(() => validateInput(validInput({ predictions: [pred] }))).toThrow('predictions[0].moneyline_stars is required')
  })
})
