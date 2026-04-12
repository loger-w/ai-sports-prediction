/// <reference types="node" />
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

// ESPN schedule endpoints (public, no key needed)
const ESPN_SCHEDULE: Record<string, string> = {
  nba: 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard',
  mlb: 'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard',
}

function getSupabase() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, key)
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

async function fetchESPNGames(
  sport: string,
  dateStr: string,
): Promise<Array<{ home: string; away: string; gameTimeUTC: string | null }>> {
  const yyyymmdd = dateStr.replace(/-/g, '')
  const url = `${ESPN_SCHEDULE[sport]}?dates=${yyyymmdd}`
  const resp = await fetch(url)
  if (!resp.ok) return []

  const body = await resp.json() as {
    events?: Array<{
      date?: string
      competitions?: Array<{
        competitors: Array<{ homeAway: 'home' | 'away'; team: { abbreviation: string } }>
      }>
    }>
  }

  const games: Array<{ home: string; away: string; gameTimeUTC: string | null }> = []
  for (const event of body.events ?? []) {
    const comp = event.competitions?.[0]
    if (!comp) continue
    const home = comp.competitors.find((c) => c.homeAway === 'home')
    const away = comp.competitors.find((c) => c.homeAway === 'away')
    if (!home || !away) continue
    games.push({
      home: home.team.abbreviation.toUpperCase(),
      away: away.team.abbreviation.toUpperCase(),
      gameTimeUTC: event.date ?? null,
    })
  }
  return games
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = req.headers.authorization
    if (auth !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
  }

  const supabase = getSupabase()
  const today = new Date()
  const summary: Record<string, unknown> = {}

  // Ingest next 7 days for each sport
  for (const sport of ['nba', 'mlb']) {
    // Load team abbr → id map for this sport
    const { data: teams } = await supabase
      .from('teams')
      .select('id, abbreviation')
      .eq('sport_id', sport)

    if (!teams) continue
    const teamByAbbr = new Map(teams.map((t) => [t.abbreviation.toUpperCase(), t.id as string]))

    let upserted = 0
    let skipped = 0

    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const d = new Date(today)
      d.setUTCDate(today.getUTCDate() + dayOffset)
      const dateStr = formatDate(d)

      const games = await fetchESPNGames(sport, dateStr)

      for (const g of games) {
        const homeId = teamByAbbr.get(g.home)
        const awayId = teamByAbbr.get(g.away)
        if (!homeId || !awayId) { skipped++; continue }

        const slug = `${homeId}-vs-${awayId}-${dateStr}`

        const { error } = await supabase
          .from('games')
          .upsert(
            {
              sport_id: sport,
              home_team_id: homeId,
              away_team_id: awayId,
              game_date: dateStr,
              game_time: g.gameTimeUTC,
              slug,
              status: 'scheduled',
            },
            { onConflict: 'sport_id,slug', ignoreDuplicates: true },
          )

        if (error) { skipped++; continue }
        upserted++
      }
    }

    summary[sport] = { upserted, skipped }
  }

  return res.status(200).json({ ok: true, summary })
}
