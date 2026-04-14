/// <reference types="node" />
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import {
  generateSlug,
  mapResultToBool,
  validateResultsPayload,
} from '../../src/lib/predictions/ingest-helpers.js'
import type { IngestItemResult } from '../../src/types/predictions/index.js'

function getSupabase() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, key)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const auth = req.headers.authorization
  if (!auth || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  let payload
  try {
    payload = validateResultsPayload(req.body)
  } catch (err) {
    return res.status(400).json({ error: (err as Error).message })
  }

  const supabase = getSupabase()

  const { data: teams, error: teamsErr } = await supabase
    .from('teams')
    .select('id, abbreviation')
    .eq('sport_id', 'mlb')

  if (teamsErr || !teams) {
    return res.status(500).json({ error: 'Failed to load teams' })
  }

  const teamByAbbr = new Map(teams.map((t) => [t.abbreviation.toUpperCase(), t.id as string]))

  const results: IngestItemResult[] = []
  let upserted = 0
  let errors = 0

  for (const item of payload.results) {
    const homeId = teamByAbbr.get(item.home_team.toUpperCase())
    const awayId = teamByAbbr.get(item.away_team.toUpperCase())

    if (!homeId) {
      results.push({ slug: '', status: 'error', error: `Unknown home team: ${item.home_team}` })
      errors++
      continue
    }
    if (!awayId) {
      results.push({ slug: '', status: 'error', error: `Unknown away team: ${item.away_team}` })
      errors++
      continue
    }

    const slug = generateSlug(homeId, awayId, payload.date)

    // Find the game by slug
    const { data: gameRows, error: gameFindErr } = await supabase
      .from('games')
      .select('id')
      .eq('sport_id', 'mlb')
      .eq('slug', slug)
      .limit(1)

    if (gameFindErr || !gameRows?.length) {
      results.push({ slug, status: 'error', error: `Game not found for ${slug}; upload prediction or schedule first` })
      errors++
      continue
    }

    const gameId = gameRows[0].id as string

    // Update game with final score
    const { error: gameUpdateErr } = await supabase
      .from('games')
      .update({
        home_score: item.actual_home_score,
        away_score: item.actual_away_score,
        status: 'final',
      })
      .eq('id', gameId)

    if (gameUpdateErr) {
      results.push({ slug, status: 'error', error: gameUpdateErr.message })
      errors++
      continue
    }

    // Find the prediction
    const { data: predRows } = await supabase
      .from('predictions')
      .select('id')
      .eq('game_id', gameId)
      .eq('model_version', 'v1')
      .limit(1)

    if (!predRows?.length) {
      // Game score recorded but no prediction to resolve — not an error
      results.push({ slug, status: 'no_prediction' })
      upserted++
      continue
    }

    const predictionId = predRows[0].id as string

    // Upsert prediction_results with new text columns + legacy boolean dual-write
    const { error: resultErr } = await supabase
      .from('prediction_results')
      .upsert(
        {
          prediction_id: predictionId,
          game_id: gameId,
          ml_result: item.ml_result,
          ou_result: item.ou_result,
          run_line_result: item.run_line_result,
          // Legacy boolean columns — dual-written for accuracy dashboard compatibility
          winner_correct: mapResultToBool(item.ml_result),
          over_under_correct: mapResultToBool(item.ou_result),
          spread_correct: mapResultToBool(item.run_line_result),
          resolved_at: new Date().toISOString(),
        },
        { onConflict: 'prediction_id' },
      )

    if (resultErr) {
      results.push({ slug, status: 'error', error: resultErr.message })
      errors++
      continue
    }

    results.push({ slug, status: 'upserted' })
    upserted++
  }

  const total = payload.results.length
  const status = errors === 0 ? 200 : upserted === 0 ? 500 : 207

  return res.status(status).json({ total, upserted, errors, results })
}
