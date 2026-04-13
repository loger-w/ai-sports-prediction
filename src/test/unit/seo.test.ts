import { describe, it, expect } from 'vitest'
import { buildSportsEventSchema, buildPageTitle } from '@/lib/predictions/seo'
import type { GameWithPrediction } from '@/services/predictions/api'

function makeGame(overrides?: Partial<GameWithPrediction>): GameWithPrediction {
  return {
    id: '1',
    sport_id: 'nba',
    game_date: '2026-04-12',
    game_time: '2026-04-12T02:30:00Z',
    slug: 'lakers-vs-celtics-2026-04-12',
    status: 'scheduled',
    home_score: null,
    away_score: null,
    home_team: {
      id: 'lakers',
      name_en: 'Los Angeles Lakers',
      name_zh: '洛杉磯湖人',
      abbreviation: 'LAL',
      logo_url: null,
    },
    away_team: {
      id: 'celtics',
      name_en: 'Boston Celtics',
      name_zh: '波士頓塞爾提克',
      abbreviation: 'BOS',
      logo_url: null,
    },
    predictions: [{
      id: 'p1',
      moneyline_home_pct: 60,
      moneyline_away_pct: 40,
      moneyline_pick: 'home',
      moneyline_stars: 3,
      spread_line: null,
      spread_pick: null,
      spread_pct: null,
      spread_stars: 0,
      over_under_line: 215.5,
      over_pct: 55,
      under_pct: 45,
      over_under_stars: 0,
      explanation_en: 'Lakers favored',
      explanation_zh: '湖人被看好',
    }],
    ...overrides,
  }
}

describe('buildSportsEventSchema', () => {
  it('returns SportsEvent schema for NBA game', () => {
    const schema = buildSportsEventSchema(makeGame())
    expect(schema['@type']).toBe('SportsEvent')
    expect(schema.sport).toBe('Basketball')
    expect(schema.eventStatus).toBeUndefined()
  })

  it('returns Baseball sport for MLB game', () => {
    const schema = buildSportsEventSchema(makeGame({ sport_id: 'mlb' }))
    expect(schema.sport).toBe('Baseball')
  })

  it('includes scores and eventStatus for final games', () => {
    const schema = buildSportsEventSchema(makeGame({
      status: 'final',
      home_score: 110,
      away_score: 105,
    }))
    expect(schema.eventStatus).toBe('https://schema.org/EventScheduled')
    expect(schema.homeTeamScore).toBe(110)
    expect(schema.awayTeamScore).toBe(105)
  })

  it('uses home team english name for location', () => {
    const schema = buildSportsEventSchema(makeGame())
    expect((schema.location as Record<string, unknown>).name).toBe('Los Angeles Lakers Home')
  })
})

describe('buildPageTitle', () => {
  it('builds english title', () => {
    const title = buildPageTitle(makeGame(), 'en')
    expect(title).toBe('Boston Celtics vs Los Angeles Lakers AI Prediction | NBA | AISports')
  })

  it('builds chinese title', () => {
    const title = buildPageTitle(makeGame(), 'zh')
    expect(title).toBe('波士頓塞爾提克 vs 洛杉磯湖人 AI 預測 | NBA | AISports')
  })
})
