import type {
  MarketResult,
  SchedulePayload,
  PredictionsPayload,
  ResultsPayload,
} from '@/types/predictions/index.js'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const VALID_RESULTS = new Set<string>(['WIN', 'LOSS', 'PUSH', 'PASS'])

export function generateSlug(homeTeamId: string, awayTeamId: string, date: string): string {
  return `${homeTeamId}-vs-${awayTeamId}-${date}`
}

export function mapResultToBool(result: MarketResult | null): boolean | null {
  if (result === 'WIN') return true
  if (result === 'LOSS' || result === 'PUSH') return false
  return null // PASS or null
}

// ── Schedule payload ─────────────────────────────────────────────────────────

export function validateSchedulePayload(body: unknown): SchedulePayload {
  if (!body || typeof body !== 'object') throw new Error('Request body must be a JSON object')
  const b = body as Record<string, unknown>

  if (typeof b.date !== 'string' || !DATE_RE.test(b.date))
    throw new Error('date must be YYYY-MM-DD')
  if (!Array.isArray(b.games) || b.games.length === 0)
    throw new Error('games must be a non-empty array')

  for (const [i, g] of b.games.entries()) {
    if (!g || typeof g !== 'object') throw new Error(`games[${i}] must be an object`)
    const game = g as Record<string, unknown>
    for (const field of ['home_team', 'away_team', 'game_time']) {
      if (typeof game[field] !== 'string' || !game[field])
        throw new Error(`games[${i}].${field} is required`)
    }
  }

  return b as unknown as SchedulePayload
}

// ── Predictions payload ──────────────────────────────────────────────────────

export function validatePredictionsPayload(body: unknown): PredictionsPayload {
  if (!body || typeof body !== 'object') throw new Error('Request body must be a JSON object')
  const b = body as Record<string, unknown>

  if (typeof b.date !== 'string' || !DATE_RE.test(b.date))
    throw new Error('date must be YYYY-MM-DD')
  if (!Array.isArray(b.predictions) || b.predictions.length === 0)
    throw new Error('predictions must be a non-empty array')

  for (const [i, p] of b.predictions.entries()) {
    if (!p || typeof p !== 'object') throw new Error(`predictions[${i}] must be an object`)
    const pred = p as Record<string, unknown>

    for (const field of ['home_team', 'away_team', 'game_time']) {
      if (typeof pred[field] !== 'string' || !pred[field])
        throw new Error(`predictions[${i}].${field} is required`)
    }

    const hasML  = pred.predicted_winner !== null && pred.predicted_winner !== undefined
    const hasOU  = pred.ou_rec !== null && pred.ou_rec !== undefined
    const hasRL  = pred.run_line_rec !== null && pred.run_line_rec !== undefined
    if (!hasML && !hasOU && !hasRL)
      throw new Error(`predictions[${i}]: at least one market must be non-null`)

    if (hasML) {
      if (pred.predicted_winner !== 'home' && pred.predicted_winner !== 'away')
        throw new Error(`predictions[${i}].predicted_winner must be 'home' or 'away'`)
      if (typeof pred.predicted_home_pct !== 'number' || pred.predicted_home_pct < 0 || pred.predicted_home_pct > 100)
        throw new Error(`predictions[${i}].predicted_home_pct must be 0–100`)
      if (!isStars(pred.ml_stars))
        throw new Error(`predictions[${i}].ml_stars must be integer 1–5`)
    }

    if (hasOU) {
      if (pred.ou_rec !== 'over' && pred.ou_rec !== 'under')
        throw new Error(`predictions[${i}].ou_rec must be 'over' or 'under'`)
      if (typeof pred.ou_line !== 'number')
        throw new Error(`predictions[${i}].ou_line must be a number`)
      if (!isStars(pred.ou_stars))
        throw new Error(`predictions[${i}].ou_stars must be integer 1–5`)
    }

    if (hasRL) {
      if (pred.run_line_rec !== 'home' && pred.run_line_rec !== 'away')
        throw new Error(`predictions[${i}].run_line_rec must be 'home' or 'away'`)
      if (typeof pred.run_line !== 'number')
        throw new Error(`predictions[${i}].run_line must be a number`)
      if (!isStars(pred.run_line_stars))
        throw new Error(`predictions[${i}].run_line_stars must be integer 1–5`)
    }

    // Optional analysis validation (lightweight — deep validation is done by assemble_analysis.py)
    if (pred.analysis !== undefined && pred.analysis !== null) {
      const a = pred.analysis as Record<string, unknown>
      if (a.schema_version !== '1.0')
        throw new Error(`predictions[${i}].analysis.schema_version must be '1.0'`)
      const requiredKeys = [
        'meta', 'recent_form', 'pitching_matchup', 'lineup_analysis',
        'bullpen_and_injuries', 'environment', 'signal_adjustments',
        'win_probability', 'score_prediction', 'betting_recommendations',
      ]
      for (const key of requiredKeys) {
        if (!(key in a))
          throw new Error(`predictions[${i}].analysis.${key} is required`)
      }
    }
  }

  return b as unknown as PredictionsPayload
}

// ── Results payload ──────────────────────────────────────────────────────────

export function validateResultsPayload(body: unknown): ResultsPayload {
  if (!body || typeof body !== 'object') throw new Error('Request body must be a JSON object')
  const b = body as Record<string, unknown>

  if (typeof b.date !== 'string' || !DATE_RE.test(b.date))
    throw new Error('date must be YYYY-MM-DD')
  if (!Array.isArray(b.results) || b.results.length === 0)
    throw new Error('results must be a non-empty array')

  for (const [i, r] of b.results.entries()) {
    if (!r || typeof r !== 'object') throw new Error(`results[${i}] must be an object`)
    const res = r as Record<string, unknown>

    for (const field of ['home_team', 'away_team', 'game_time']) {
      if (typeof res[field] !== 'string' || !res[field])
        throw new Error(`results[${i}].${field} is required`)
    }

    for (const field of ['actual_home_score', 'actual_away_score']) {
      if (!Number.isInteger(res[field]) || (res[field] as number) < 0)
        throw new Error(`results[${i}].${field} must be a non-negative integer`)
    }

    for (const field of ['ml_result', 'ou_result', 'run_line_result']) {
      const val = res[field]
      if (val !== null && val !== undefined && !VALID_RESULTS.has(val as string))
        throw new Error(`results[${i}].${field} must be WIN | LOSS | PUSH | PASS | null`)
    }
  }

  return b as unknown as ResultsPayload
}

// ── Internal helpers ─────────────────────────────────────────────────────────

function isStars(val: unknown): boolean {
  return Number.isInteger(val) && (val as number) >= 1 && (val as number) <= 5
}
