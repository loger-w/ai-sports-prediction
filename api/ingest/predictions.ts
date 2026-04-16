/// <reference types="node" />
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import {
  generateSlug,
  validatePredictionsPayload,
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
    payload = validatePredictionsPayload(req.body)
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

  for (const item of payload.predictions) {
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

    // Upsert game row
    const { data: gameRows, error: gameErr } = await supabase
      .from('games')
      .upsert(
        {
          sport_id: 'mlb',
          home_team_id: homeId,
          away_team_id: awayId,
          game_date: payload.date,
          game_time: item.game_time,
          slug,
          status: 'scheduled',
        },
        { onConflict: 'sport_id,slug' },
      )
      .select('id')

    if (gameErr || !gameRows?.length) {
      results.push({ slug, status: 'error', error: gameErr?.message ?? 'Game upsert returned no id' })
      errors++
      continue
    }

    const gameId = gameRows[0].id as string

    // Upsert prediction row
    const { error: predErr } = await supabase
      .from('predictions')
      .upsert(
        {
          game_id: gameId,
          model_version: 'v1',
          moneyline_pick: item.predicted_winner,
          moneyline_home_pct: item.predicted_home_pct,
          moneyline_away_pct: item.predicted_home_pct != null
            ? Math.round((100 - item.predicted_home_pct) * 10) / 10
            : 50,
          moneyline_stars: item.ml_stars ?? 0,
          over_under_line: item.ou_line,
          ou_rec: item.ou_rec,
          over_under_stars: item.ou_stars ?? 0,
          spread_line: item.run_line,
          spread_pick: item.run_line_rec,
          spread_stars: item.run_line_stars ?? 0,
          ...(item.analysis ? { analysis: item.analysis } : {}),
        },
        { onConflict: 'game_id,model_version' },
      )

    if (predErr) {
      results.push({ slug, status: 'error', error: predErr.message })
      errors++
      continue
    }

    results.push({ slug, status: 'upserted' })
    upserted++
  }

  const total = payload.predictions.length
  const status = errors === 0 ? 200 : upserted === 0 ? 500 : 207

  return res.status(status).json({ total, upserted, errors, results })
}
