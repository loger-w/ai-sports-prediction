/// <reference types="node" />
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import {
  gameKey,
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
  let totalRecs = 0
  let errors = 0

  for (const g of payload.games) {
    const key = gameKey(g.home_team, g.away_team, g.game_time)
    const homeId = teamByAbbr.get(g.home_team.toUpperCase())
    const awayId = teamByAbbr.get(g.away_team.toUpperCase())

    if (!homeId || !awayId) {
      results.push({ game: key, status: 'error', error: `Unknown team(s): ${g.home_team}/${g.away_team}` })
      errors++
      continue
    }

    // Upsert game by natural key
    const { data: gameRows, error: gameErr } = await supabase
      .from('games')
      .upsert(
        {
          sport_id: 'mlb',
          home_team_id: homeId,
          away_team_id: awayId,
          game_date: payload.date,
          game_time: g.game_time,
          status: 'scheduled',
        },
        { onConflict: 'game_date,home_team_id,away_team_id,game_time' },
      )
      .select('id')

    if (gameErr || !gameRows?.length) {
      results.push({ game: key, status: 'error', error: gameErr?.message ?? 'Game upsert returned no id' })
      errors++
      continue
    }

    const gameId = gameRows[0].id as string

    // Source-of-truth: delete all existing recs for this game, then insert new ones
    const { error: delErr } = await supabase
      .from('recommendations')
      .delete()
      .eq('game_id', gameId)

    if (delErr) {
      results.push({ game: key, status: 'error', error: `Failed to clear recs: ${delErr.message}` })
      errors++
      continue
    }

    if (g.recommendations.length > 0) {
      const insertRows = g.recommendations.map((r) => ({
        game_id: gameId,
        market: r.market,
        pick: r.pick,
        line: r.line,
        stars: r.stars,
      }))
      const { error: insErr } = await supabase.from('recommendations').insert(insertRows)
      if (insErr) {
        results.push({ game: key, status: 'error', error: insErr.message })
        errors++
        continue
      }
      totalRecs += g.recommendations.length
    }

    results.push({ game: key, status: 'upserted', recs_written: g.recommendations.length })
    upserted++
  }

  const total = payload.games.length
  const status = errors === 0 ? 200 : upserted === 0 ? 500 : 207
  return res.status(status).json({ total, upserted, total_recs: totalRecs, errors, results })
}
