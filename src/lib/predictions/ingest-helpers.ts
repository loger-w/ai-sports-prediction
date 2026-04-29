// src/lib/predictions/ingest-helpers.ts
import type {
  PredictionsPayload,
  ResultsPayload,
  SchedulePayload,
} from '@/types/predictions/index.js'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/   // Taiwan local, no TZ
const VALID_MARKETS = new Set(['ml', 'spread', 'ou'])
const VALID_PICKS = new Set(['home', 'away', 'over', 'under'])
const VALID_RESULTS = new Set(['win', 'loss', 'push', 'void'])

function isStars(v: unknown): boolean {
  return Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 5
}

function isFiniteNum(v: unknown): boolean {
  return typeof v === 'number' && Number.isFinite(v)
}

function checkGameTime(prefix: string, val: unknown): void {
  if (typeof val !== 'string' || !TIME_RE.test(val))
    throw new Error(`${prefix}.game_time must be "YYYY-MM-DD HH:mm:ss" Taiwan local`)
}

// ── Predictions payload ─────────────────────────────────────────────────────

export function validatePredictionsPayload(body: unknown): PredictionsPayload {
  if (!body || typeof body !== 'object') throw new Error('Request body must be a JSON object')
  const b = body as Record<string, unknown>

  if (typeof b.date !== 'string' || !DATE_RE.test(b.date))
    throw new Error('date must be YYYY-MM-DD')
  if (!Array.isArray(b.games) || b.games.length === 0)
    throw new Error('games must be a non-empty array')

  for (const [i, g] of b.games.entries()) {
    const prefix = `games[${i}]`
    if (!g || typeof g !== 'object') throw new Error(`${prefix} must be an object`)
    const game = g as Record<string, unknown>

    for (const f of ['home_team', 'away_team']) {
      if (typeof game[f] !== 'string' || !game[f])
        throw new Error(`${prefix}.${f} is required`)
    }
    checkGameTime(prefix, game.game_time)

    if (!Array.isArray(game.recommendations))
      throw new Error(`${prefix}.recommendations must be an array (use [] for no recs)`)

    for (const [j, r] of (game.recommendations as unknown[]).entries()) {
      const rprefix = `${prefix}.recommendations[${j}]`
      if (!r || typeof r !== 'object') throw new Error(`${rprefix} must be an object`)
      const rec = r as Record<string, unknown>

      if (typeof rec.market !== 'string' || !VALID_MARKETS.has(rec.market))
        throw new Error(`${rprefix}.market must be ml | spread | ou`)
      if (typeof rec.pick !== 'string' || !VALID_PICKS.has(rec.pick))
        throw new Error(`${rprefix}.pick must be home | away | over | under`)

      if (rec.market === 'ml') {
        if (rec.line !== null) throw new Error(`${rprefix}: ml must have line=null`)
        if (rec.pick !== 'home' && rec.pick !== 'away')
          throw new Error(`${rprefix}.pick must be home or away for ml`)
      } else if (rec.market === 'spread') {
        if (!isFiniteNum(rec.line)) throw new Error(`${rprefix}.line must be a number for spread`)
        if (rec.pick !== 'home' && rec.pick !== 'away')
          throw new Error(`${rprefix}.pick must be home or away for spread`)
      } else {
        // ou
        if (!isFiniteNum(rec.line)) throw new Error(`${rprefix}.line must be a number for ou`)
        if (rec.pick !== 'over' && rec.pick !== 'under')
          throw new Error(`${rprefix}.pick must be over or under for ou`)
      }

      if (!isStars(rec.stars))
        throw new Error(`${rprefix}.stars must be an integer 1-5`)
    }
  }

  return b as unknown as PredictionsPayload
}

// ── Results payload ─────────────────────────────────────────────────────────

export function validateResultsPayload(body: unknown): ResultsPayload {
  if (!body || typeof body !== 'object') throw new Error('Request body must be a JSON object')
  const b = body as Record<string, unknown>

  if (typeof b.date !== 'string' || !DATE_RE.test(b.date))
    throw new Error('date must be YYYY-MM-DD')
  if (!Array.isArray(b.results) || b.results.length === 0)
    throw new Error('results must be a non-empty array')

  for (const [i, r] of b.results.entries()) {
    const prefix = `results[${i}]`
    if (!r || typeof r !== 'object') throw new Error(`${prefix} must be an object`)
    const item = r as Record<string, unknown>

    for (const f of ['home_team', 'away_team']) {
      if (typeof item[f] !== 'string' || !item[f])
        throw new Error(`${prefix}.${f} is required`)
    }
    checkGameTime(prefix, item.game_time)

    if (!Array.isArray(item.recommendations))
      throw new Error(`${prefix}.recommendations must be an array`)

    for (const [j, rec] of (item.recommendations as unknown[]).entries()) {
      const rprefix = `${prefix}.recommendations[${j}]`
      if (!rec || typeof rec !== 'object') throw new Error(`${rprefix} must be an object`)
      const rr = rec as Record<string, unknown>

      if (typeof rr.market !== 'string' || !VALID_MARKETS.has(rr.market))
        throw new Error(`${rprefix}.market must be ml | spread | ou`)
      if (typeof rr.result !== 'string' || !VALID_RESULTS.has(rr.result))
        throw new Error(`${rprefix}.result must be win | loss | push | void`)
    }
  }

  return b as unknown as ResultsPayload
}

// ── Schedule payload ────────────────────────────────────────────────────────

export function validateSchedulePayload(body: unknown): SchedulePayload {
  if (!body || typeof body !== 'object') throw new Error('Request body must be a JSON object')
  const b = body as Record<string, unknown>

  if (typeof b.date !== 'string' || !DATE_RE.test(b.date))
    throw new Error('date must be YYYY-MM-DD')
  if (!Array.isArray(b.games) || b.games.length === 0)
    throw new Error('games must be a non-empty array')

  for (const [i, g] of b.games.entries()) {
    const prefix = `games[${i}]`
    if (!g || typeof g !== 'object') throw new Error(`${prefix} must be an object`)
    const game = g as Record<string, unknown>
    for (const f of ['home_team', 'away_team']) {
      if (typeof game[f] !== 'string' || !game[f])
        throw new Error(`${prefix}.${f} is required`)
    }
    checkGameTime(prefix, game.game_time)
  }

  return b as unknown as SchedulePayload
}

export function gameKey(home_team: string, away_team: string, game_time: string): string {
  return `${home_team}-vs-${away_team}@${game_time}`
}
