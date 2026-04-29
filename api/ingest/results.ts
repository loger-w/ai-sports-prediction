/// <reference types="node" />
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import {
  gameKey,
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

  if (teamsErr) {
    return res.status(500).json({ error: 'Failed to load teams' })
  }

  const teamByAbbr = new Map(teams.map((t) => [t.abbreviation.toUpperCase(), t.id as string]))

  const results: IngestItemResult[] = []
  let upserted = 0
  let errors = 0

  for (const item of payload.results) {
    const key = gameKey(item.home_team, item.away_team, item.game_time)
    const homeId = teamByAbbr.get(item.home_team.toUpperCase())
    const awayId = teamByAbbr.get(item.away_team.toUpperCase())

    if (!homeId || !awayId) {
      results.push({ game: key, status: 'error', error: `Unknown team(s): ${item.home_team}/${item.away_team}` })
      errors++
      continue
    }

    // Find game
    const { data: gameRows, error: gameFindErr } = await supabase
      .from('games')
      .select('id')
      .eq('sport_id', 'mlb')
      .eq('home_team_id', homeId)
      .eq('away_team_id', awayId)
      .eq('game_date', payload.date)
      .eq('game_time', item.game_time)
      .limit(1)

    if (gameFindErr || !gameRows.length) {
      results.push({ game: key, status: 'no_game', error: 'Game not found; ingest schedule/predictions first' })
      errors++
      continue
    }

    const gameId = gameRows[0].id as string

    // Mark game as final (scores no longer stored)
    const { error: gameUpdateErr } = await supabase
      .from('games')
      .update({ status: 'final' })
      .eq('id', gameId)

    if (gameUpdateErr) {
      results.push({ game: key, status: 'error', error: gameUpdateErr.message })
      errors++
      continue
    }

    // Apply per-market results
    let recsWritten = 0
    let perGameErrors = 0
    for (const r of item.recommendations) {
      const { data: updRows, error: updErr } = await supabase
        .from('recommendations')
        .update({ result: r.result })
        .eq('game_id', gameId)
        .eq('market', r.market)
        .select('market')
      if (updErr) {
        results.push({ game: `${key}:${r.market}`, status: 'error', error: updErr.message })
        errors++
        perGameErrors++
        continue
      }
      if (updRows.length === 0) {
        results.push({ game: `${key}:${r.market}`, status: 'no_game', error: 'No matching recommendation row' })
        errors++
        perGameErrors++
        continue
      }
      recsWritten++
    }

    if (perGameErrors === 0) {
      results.push({ game: key, status: 'upserted', recs_written: recsWritten })
      upserted++
    } else {
      results.push({ game: key, status: 'upserted', recs_written: recsWritten, error: `${perGameErrors} market(s) failed` })
      // game-level partial: errors already counted at per-market level; do not bump upserted
    }
  }

  const total = payload.results.length
  const status = errors === 0 ? 200 : upserted === 0 ? 500 : 207
  return res.status(status).json({ total, upserted, errors, results })
}
