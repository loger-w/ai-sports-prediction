// src/test/unit/ingestValidators.test.ts
import { describe, expect, it } from 'vitest'
import {
  validatePredictionsPayload,
  validateResultsPayload,
  validateSchedulePayload,
} from '@/lib/predictions/ingest-helpers'

describe('validatePredictionsPayload', () => {
  const validPayload = {
    date: '2026-04-29',
    games: [
      {
        home_team: 'LAD',
        away_team: 'SD',
        game_time: '2026-04-29 22:10:00',
        recommendations: [
          { market: 'ml', pick: 'home', line: null, stars: 4 },
          { market: 'spread', pick: 'home', line: -1.5, stars: 4 },
          { market: 'ou', pick: 'over', line: 8.5, stars: 3 },
        ],
      },
    ],
  }

  it('accepts a valid payload', () => {
    expect(() => validatePredictionsPayload(validPayload)).not.toThrow()
  })

  it('accepts empty recommendations array', () => {
    const p = { ...validPayload, games: [{ ...validPayload.games[0], recommendations: [] }] }
    expect(() => validatePredictionsPayload(p)).not.toThrow()
  })

  it('rejects bad date', () => {
    expect(() => validatePredictionsPayload({ ...validPayload, date: '2026/04/29' })).toThrow(/date/)
  })

  it('rejects empty games array', () => {
    expect(() => validatePredictionsPayload({ ...validPayload, games: [] })).toThrow(/games/)
  })

  it('rejects ml with non-null line', () => {
    const p = JSON.parse(JSON.stringify(validPayload))
    p.games[0].recommendations[0].line = 1.5
    expect(() => validatePredictionsPayload(p)).toThrow(/ml.*line/)
  })

  it('rejects spread without line', () => {
    const p = JSON.parse(JSON.stringify(validPayload))
    p.games[0].recommendations[1].line = null
    expect(() => validatePredictionsPayload(p)).toThrow(/line/)
  })

  it('rejects stars out of range', () => {
    const p = JSON.parse(JSON.stringify(validPayload))
    p.games[0].recommendations[0].stars = 6
    expect(() => validatePredictionsPayload(p)).toThrow(/stars/)
  })

  it('rejects ou with home/away pick', () => {
    const p = JSON.parse(JSON.stringify(validPayload))
    p.games[0].recommendations[2].pick = 'home'
    expect(() => validatePredictionsPayload(p)).toThrow(/pick/)
  })

  it('rejects ml with over/under pick', () => {
    const p = JSON.parse(JSON.stringify(validPayload))
    p.games[0].recommendations[0].pick = 'over'
    expect(() => validatePredictionsPayload(p)).toThrow(/pick/)
  })

  it('rejects bad game_time format', () => {
    const p = JSON.parse(JSON.stringify(validPayload))
    p.games[0].game_time = '2026-04-29T22:10:00Z'
    expect(() => validatePredictionsPayload(p)).toThrow(/game_time/)
  })
})

describe('validateResultsPayload', () => {
  const validPayload = {
    date: '2026-04-29',
    results: [
      {
        home_team: 'LAD',
        away_team: 'SD',
        game_time: '2026-04-29 22:10:00',
        home_score: 5,
        away_score: 3,
        recommendations: [
          { market: 'ml', result: 'win' },
          { market: 'spread', result: 'loss' },
          { market: 'ou', result: 'win' },
        ],
      },
    ],
  }

  it('accepts a valid payload', () => {
    expect(() => validateResultsPayload(validPayload)).not.toThrow()
  })

  it('rejects negative score', () => {
    const p = JSON.parse(JSON.stringify(validPayload))
    p.results[0].home_score = -1
    expect(() => validateResultsPayload(p)).toThrow(/home_score/)
  })

  it('rejects bad result enum', () => {
    const p = JSON.parse(JSON.stringify(validPayload))
    p.results[0].recommendations[0].result = 'WIN' // uppercase invalid
    expect(() => validateResultsPayload(p)).toThrow(/result/)
  })

  it('accepts void result', () => {
    const p = JSON.parse(JSON.stringify(validPayload))
    p.results[0].recommendations[0].result = 'void'
    expect(() => validateResultsPayload(p)).not.toThrow()
  })
})

describe('validateSchedulePayload', () => {
  it('accepts valid schedule', () => {
    const payload = {
      date: '2026-04-29',
      games: [{ home_team: 'LAD', away_team: 'SD', game_time: '2026-04-29 22:10:00' }],
    }
    expect(() => validateSchedulePayload(payload)).not.toThrow()
  })

  it('rejects bad game_time format', () => {
    const payload = {
      date: '2026-04-29',
      games: [{ home_team: 'LAD', away_team: 'SD', game_time: '2026/04/29 22:10' }],
    }
    expect(() => validateSchedulePayload(payload)).toThrow(/game_time/)
  })
})
