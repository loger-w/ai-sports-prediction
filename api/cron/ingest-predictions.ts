/// <reference types="node" />
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { ClaudeSkillInput, SkillPrediction } from '../../src/types/predictions/index.js'

// ── Supabase client (service role for writes) ───────────────────────────────

function getSupabase() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, key)
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function deriveConfidence(homeWinPct: number): 'high' | 'medium' | 'low' {
  const edge = Math.abs(homeWinPct - 50)
  if (edge > 20) return 'high'
  if (edge > 10) return 'medium'
  return 'low'
}

function generateSlug(homeTeamId: string, awayTeamId: string, date: string): string {
  return `${homeTeamId}-vs-${awayTeamId}-${date}`
}

function validateInput(body: unknown): ClaudeSkillInput {
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

// ── Handler ─────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Auth
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = req.headers.authorization
    if (auth !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
  }

  let input: ClaudeSkillInput
  try {
    input = validateInput(req.body)
  } catch (err) {
    return res.status(400).json({ error: (err as Error).message })
  }

  const supabase = getSupabase()
  const { date, sport, predictions } = input
  const results: Array<{ slug: string; status: 'upserted' | 'error'; error?: string }> = []

  // Load all teams for this sport so we can look up by abbreviation
  const { data: teams, error: teamsErr } = await supabase
    .from('teams')
    .select('id, abbreviation')
    .eq('sport_id', sport)

  if (teamsErr || !teams) {
    return res.status(500).json({ error: 'Failed to load teams', details: teamsErr?.message })
  }

  const teamByAbbr = new Map(teams.map((t) => [t.abbreviation.toUpperCase(), t.id as string]))

  for (const pred of predictions) {
    const slug = await ingestOne(supabase, sport, date, pred, teamByAbbr)
    results.push(slug)
  }

  const errors = results.filter((r) => r.status === 'error')
  return res.status(errors.length > 0 ? 207 : 200).json({
    date,
    sport,
    total: predictions.length,
    upserted: results.filter((r) => r.status === 'upserted').length,
    errors: errors.length,
    results,
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ingestOne(
  supabase: SupabaseClient<any>,
  sport: string,
  date: string,
  pred: SkillPrediction,
  teamByAbbr: Map<string, string>,
): Promise<{ slug: string; status: 'upserted' | 'error'; error?: string }> {
  const homeId = teamByAbbr.get(pred.home_team.toUpperCase())
  const awayId = teamByAbbr.get(pred.away_team.toUpperCase())

  if (!homeId) return { slug: '', status: 'error', error: `Unknown home team: ${pred.home_team}` }
  if (!awayId) return { slug: '', status: 'error', error: `Unknown away team: ${pred.away_team}` }

  const slug = generateSlug(homeId, awayId, date)

  // Upsert game
  const { data: game, error: gameErr } = await supabase
    .from('games')
    .upsert(
      {
        sport_id: sport,
        home_team_id: homeId,
        away_team_id: awayId,
        game_date: date,
        game_time: pred.game_time,
        slug,
        status: 'scheduled',
      },
      { onConflict: 'sport_id,slug', ignoreDuplicates: false },
    )
    .select('id')
    .single()

  if (gameErr || !game) {
    return { slug, status: 'error', error: `Game upsert failed: ${gameErr?.message}` }
  }

  const predictedWinner: 'home' | 'away' = pred.home_win_pct >= pred.away_win_pct ? 'home' : 'away'
  const confidence = deriveConfidence(pred.home_win_pct)

  // Upsert prediction (one per game per model version)
  const { error: predErr } = await supabase.from('predictions').upsert(
    {
      game_id: game.id,
      model_version: 'v1',
      home_win_pct: pred.home_win_pct,
      away_win_pct: pred.away_win_pct,
      predicted_winner: predictedWinner,
      confidence_level: confidence,
      over_under_line: pred.over_under_line,
      over_pct: pred.over_pct,
      under_pct: pred.under_pct,
      explanation_en: pred.explanation_en,
      explanation_zh: pred.explanation_zh,
    },
    { onConflict: 'game_id,model_version', ignoreDuplicates: false },
  )

  if (predErr) {
    return { slug, status: 'error', error: `Prediction upsert failed: ${predErr.message}` }
  }

  return { slug, status: 'upserted' }
}
