/// <reference types="node" />
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  gameKey,
  validateSchedulePayload,
} from '../../src/lib/predictions/ingest-helpers.js'
import type { IngestItemResult } from '../../src/types/predictions/index.js'

let cachedSupabase: SupabaseClient | null = null

function getSupabase(): SupabaseClient {
  if (cachedSupabase) return cachedSupabase
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  cachedSupabase = createClient(url, key)
  return cachedSupabase
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

  const { data: teams, error: teamsErr } = await supabase
    .from('teams')
    .select('id, abbreviation')
    .eq('sport_id', 'mlb')

  if (teamsErr) {
    return res.status(500).json({ error: 'Failed to load teams' })
  }

  const teamByAbbr = new Map(teams.map((t) => [t.abbreviation.toUpperCase(), t.id as string]))

  const results: IngestItemResult[] = await Promise.all(
    payload.games.map(async (game): Promise<IngestItemResult> => {
      const key = gameKey(game.home_team, game.away_team, game.game_time)
      const homeId = teamByAbbr.get(game.home_team.toUpperCase())
      const awayId = teamByAbbr.get(game.away_team.toUpperCase())

      if (!homeId || !awayId) {
        return { game: key, status: 'error', error: `Unknown team(s): ${game.home_team}/${game.away_team}` }
      }

      const { error: dbErr } = await supabase
        .from('games')
        .upsert(
          {
            sport_id: 'mlb',
            home_team_id: homeId,
            away_team_id: awayId,
            game_date: payload.date,
            game_time: game.game_time,
            status: 'scheduled',
          },
          { onConflict: 'game_date,home_team_id,away_team_id,game_time' },
        )

      if (dbErr) {
        return { game: key, status: 'error', error: dbErr.message }
      }

      return { game: key, status: 'upserted' }
    }),
  )

  let upserted = 0
  let errors = 0
  for (const r of results) {
    if (r.status === 'upserted') upserted++
    else errors++
  }

  const total = payload.games.length
  const status = errors === 0 ? 200 : upserted === 0 ? 500 : 207
  return res.status(status).json({ total, upserted, errors, results })
}
