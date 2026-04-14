/// <reference types="node" />
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import {
  generateSlug,
  validateSchedulePayload,
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
    payload = validateSchedulePayload(req.body)
  } catch (err) {
    return res.status(400).json({ error: (err as Error).message })
  }

  const supabase = getSupabase()

  // Load MLB team abbr → id map
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

  for (const game of payload.games) {
    const homeId = teamByAbbr.get(game.home_team.toUpperCase())
    const awayId = teamByAbbr.get(game.away_team.toUpperCase())

    if (!homeId) {
      results.push({ slug: '', status: 'error', error: `Unknown home team: ${game.home_team}` })
      errors++
      continue
    }
    if (!awayId) {
      results.push({ slug: '', status: 'error', error: `Unknown away team: ${game.away_team}` })
      errors++
      continue
    }

    const slug = generateSlug(homeId, awayId, payload.date)

    const { error: dbErr } = await supabase
      .from('games')
      .upsert(
        {
          sport_id: 'mlb',
          home_team_id: homeId,
          away_team_id: awayId,
          game_date: payload.date,
          game_time: game.game_time,
          slug,
          status: 'scheduled',
        },
        { onConflict: 'sport_id,slug' },
      )

    if (dbErr) {
      results.push({ slug, status: 'error', error: dbErr.message })
      errors++
      continue
    }

    results.push({ slug, status: 'upserted' })
    upserted++
  }

  const total = payload.games.length
  const status = errors === 0 ? 200 : upserted === 0 ? 500 : 207

  return res.status(status).json({ total, upserted, errors, results })
}
