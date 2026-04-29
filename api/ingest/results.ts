/// <reference types="node" />
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  gameKey,
  validateResultsPayload,
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

interface ItemOutcome {
  results: IngestItemResult[]
  upserted: number
  errors: number
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

  if (teamsErr) {
    return res.status(500).json({ error: 'Failed to load teams' })
  }

  const teamByAbbr = new Map(teams.map((t) => [t.abbreviation.toUpperCase(), t.id as string]))

  const outcomes: ItemOutcome[] = await Promise.all(
    payload.results.map(async (item): Promise<ItemOutcome> => {
      const key = gameKey(item.home_team, item.away_team, item.game_time)
      const homeId = teamByAbbr.get(item.home_team.toUpperCase())
      const awayId = teamByAbbr.get(item.away_team.toUpperCase())

      if (!homeId || !awayId) {
        return {
          results: [{ game: key, status: 'error', error: `Unknown team(s): ${item.home_team}/${item.away_team}` }],
          upserted: 0,
          errors: 1,
        }
      }

      // Combined find + mark-final by composite natural key (one round trip)
      const { data: gameRows, error: gameUpdateErr } = await supabase
        .from('games')
        .update({ status: 'final' })
        .eq('sport_id', 'mlb')
        .eq('home_team_id', homeId)
        .eq('away_team_id', awayId)
        .eq('game_date', payload.date)
        .eq('game_time', item.game_time)
        .select('id')

      if (gameUpdateErr) {
        return {
          results: [{ game: key, status: 'error', error: gameUpdateErr.message }],
          upserted: 0,
          errors: 1,
        }
      }
      if (!gameRows.length) {
        return {
          results: [{ game: key, status: 'no_game', error: 'Game not found; ingest schedule/predictions first' }],
          upserted: 0,
          errors: 1,
        }
      }

      const gameId = gameRows[0].id as string

      const recOutcomes = await Promise.all(
        item.recommendations.map(async (r) => {
          const { data: updRows, error: updErr } = await supabase
            .from('recommendations')
            .update({ result: r.result })
            .eq('game_id', gameId)
            .eq('market', r.market)
            .select('market')
          if (updErr) return { kind: 'error' as const, market: r.market, message: updErr.message }
          if (!updRows.length) return { kind: 'no_game' as const, market: r.market }
          return { kind: 'success' as const }
        }),
      )

      let recsWritten = 0
      let perGameErrors = 0
      const itemResults: IngestItemResult[] = []
      for (const r of recOutcomes) {
        if (r.kind === 'success') {
          recsWritten++
        } else if (r.kind === 'error') {
          itemResults.push({ game: `${key}:${r.market}`, status: 'error', error: r.message })
          perGameErrors++
        } else {
          itemResults.push({ game: `${key}:${r.market}`, status: 'no_game', error: 'No matching recommendation row' })
          perGameErrors++
        }
      }

      if (perGameErrors === 0) {
        itemResults.push({ game: key, status: 'upserted', recs_written: recsWritten })
        return { results: itemResults, upserted: 1, errors: 0 }
      }
      itemResults.push({ game: key, status: 'upserted', recs_written: recsWritten, error: `${perGameErrors} market(s) failed` })
      return { results: itemResults, upserted: 0, errors: perGameErrors }
    }),
  )

  let upserted = 0
  let errors = 0
  const results: IngestItemResult[] = []
  for (const o of outcomes) {
    for (const r of o.results) results.push(r)
    upserted += o.upserted
    errors += o.errors
  }

  const total = payload.results.length
  const status = errors === 0 ? 200 : upserted === 0 ? 500 : 207
  return res.status(status).json({ total, upserted, errors, results })
}
