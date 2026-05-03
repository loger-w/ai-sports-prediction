/// <reference types="node" />
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  gameKey,
  validatePredictionsPayload,
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

interface GameOutcome {
  result: IngestItemResult
  recsWritten: number
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

  if (teamsErr) {
    return res.status(500).json({ error: 'Failed to load teams' })
  }

  const teamByAbbr = new Map(teams.map((t) => [t.abbreviation.toUpperCase(), t.id as string]))

  const outcomes: GameOutcome[] = await Promise.all(
    payload.games.map(async (g): Promise<GameOutcome> => {
      const key = gameKey(g.home_team, g.away_team, g.game_time)
      const homeId = teamByAbbr.get(g.home_team.toUpperCase())
      const awayId = teamByAbbr.get(g.away_team.toUpperCase())

      if (!homeId || !awayId) {
        return {
          result: { game: key, status: 'error', error: `Unknown team(s): ${g.home_team}/${g.away_team}` },
          recsWritten: 0,
        }
      }

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

      if (gameErr || !gameRows.length) {
        return {
          result: { game: key, status: 'error', error: gameErr?.message ?? 'Game upsert returned no id' },
          recsWritten: 0,
        }
      }

      const gameId = gameRows[0].id as string

      // Cron is source-of-truth ONLY for source='cron' rows. Admin-manual
      // entries (source='manual') survive subsequent ingests.
      const { error: delErr } = await supabase
        .from('recommendations')
        .delete()
        .eq('game_id', gameId)
        .eq('source', 'cron')

      if (delErr) {
        return {
          result: { game: key, status: 'error', error: `Failed to clear recs: ${delErr.message}` },
          recsWritten: 0,
        }
      }

      if (g.recommendations.length > 0) {
        const insertRows = g.recommendations.map((r) => ({
          game_id: gameId,
          market: r.market,
          pick: r.pick,
          line: r.line,
          stars: r.stars,
          source: 'cron' as const,
        }))
        const { error: insErr } = await supabase.from('recommendations').insert(insertRows)
        if (insErr) {
          return {
            result: { game: key, status: 'error', error: insErr.message },
            recsWritten: 0,
          }
        }
      }

      return {
        result: { game: key, status: 'upserted', recs_written: g.recommendations.length },
        recsWritten: g.recommendations.length,
      }
    }),
  )

  let upserted = 0
  let totalRecs = 0
  let errors = 0
  const results: IngestItemResult[] = []
  for (const o of outcomes) {
    results.push(o.result)
    if (o.result.status === 'upserted') upserted++
    else errors++
    totalRecs += o.recsWritten
  }

  const total = payload.games.length
  const status = errors === 0 ? 200 : upserted === 0 ? 500 : 207
  return res.status(status).json({ total, upserted, total_recs: totalRecs, errors, results })
}
