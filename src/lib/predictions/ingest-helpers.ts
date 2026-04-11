import type { ClaudeSkillInput } from '@/types/predictions/index.js'

export function deriveConfidence(homeWinPct: number): 'high' | 'medium' | 'low' {
  const edge = Math.abs(homeWinPct - 50)
  if (edge > 20) return 'high'
  if (edge > 10) return 'medium'
  return 'low'
}

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
    const required = ['home_team', 'away_team', 'game_time', 'home_win_pct', 'away_win_pct',
      'over_under_line', 'over_pct', 'under_pct', 'explanation_en', 'explanation_zh']
    for (const field of required) {
      if (pred[field] === undefined) throw new Error(`predictions[${i}].${field} is required`)
    }
    if (typeof pred.home_win_pct !== 'number' || typeof pred.away_win_pct !== 'number')
      throw new Error(`predictions[${i}] win percentages must be numbers`)
    const sum = (pred.home_win_pct as number) + (pred.away_win_pct as number)
    if (Math.abs(sum - 100) > 0.01)
      throw new Error(`predictions[${i}] home_win_pct + away_win_pct must equal 100`)
  }

  return b as unknown as ClaudeSkillInput
}
