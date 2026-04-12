/// <reference types="node" />
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { ClaudeSkillInput, SkillPrediction } from '../../src/types/predictions/index.js'
import { generateSlug, validateInput } from '../../src/lib/predictions/ingest-helpers.js'

// ── Supabase client (service role for writes) ───────────────────────────────

function getSupabase() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, key)
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

  const moneylinePick: 'home' | 'away' =
    pred.moneyline_home_pct >= pred.moneyline_away_pct ? 'home' : 'away'

  // Upsert prediction (one per game per model version)
  const { error: predErr } = await supabase.from('predictions').upsert(
    {
      game_id: game.id,
      model_version: 'v1',
      moneyline_home_pct: pred.moneyline_home_pct,
      moneyline_away_pct: pred.moneyline_away_pct,
      moneyline_pick: moneylinePick,
      moneyline_stars: pred.moneyline_stars,
      spread_line: pred.spread_line ?? null,
      spread_pick: pred.spread_pick ?? null,
      spread_pct: pred.spread_pct ?? null,
      spread_stars: pred.spread_stars,
      over_under_line: pred.over_under_line ?? null,
      over_pct: pred.over_pct ?? null,
      under_pct: pred.under_pct ?? null,
      over_under_stars: pred.over_under_stars,
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
