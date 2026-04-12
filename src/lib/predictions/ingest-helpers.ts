import type { ClaudeSkillInput } from '@/types/predictions/index.js'

export function generateSlug(homeTeamId: string, awayTeamId: string, date: string): string {
  return `${homeTeamId}-vs-${awayTeamId}-${date}`
}

export function validateInput(body: unknown): ClaudeSkillInput {
  if (!body || typeof body !== 'object') throw new Error('Request body must be a JSON object')
  const b = body as Record<string, unknown>
  if (typeof b.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(b.date))
    throw new Error('date must be YYYY-MM-DD')
  if (b.sport !== 'nba' && b.sport !== 'mlb')
    throw new Error('sport must be "nba" or "mlb"')
  if (!Array.isArray(b.predictions) || b.predictions.length === 0)
    throw new Error('predictions must be a non-empty array')

  for (const [i, p] of b.predictions.entries()) {
    if (!p || typeof p !== 'object') throw new Error(`predictions[${i}] must be an object`)
    const pred = p as Record<string, unknown>
    const required = [
      'home_team', 'away_team', 'game_time',
      'moneyline_home_pct', 'moneyline_away_pct', 'moneyline_stars',
      'spread_stars', 'over_under_stars',
      'explanation_en', 'explanation_zh',
    ]
    for (const field of required) {
      if (pred[field] === undefined) throw new Error(`predictions[${i}].${field} is required`)
    }
    if (typeof pred.moneyline_home_pct !== 'number' || typeof pred.moneyline_away_pct !== 'number')
      throw new Error(`predictions[${i}] moneyline percentages must be numbers`)
    const sum = (pred.moneyline_home_pct as number) + (pred.moneyline_away_pct as number)
    if (Math.abs(sum - 100) > 0.01)
      throw new Error(`predictions[${i}] moneyline_home_pct + moneyline_away_pct must equal 100`)
    for (const starField of ['moneyline_stars', 'spread_stars', 'over_under_stars']) {
      const val = pred[starField] as number
      if (!Number.isInteger(val) || val < 1 || val > 5)
        throw new Error(`predictions[${i}].${starField} must be integer 1–5`)
    }
  }

  return b as unknown as ClaudeSkillInput
}
