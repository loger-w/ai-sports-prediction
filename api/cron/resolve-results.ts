/// <reference types="node" />
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import type { ESPNScoreboard, ESPNCompetitor } from '../../src/types/predictions/index.js'

// ── ESPN API endpoints ──────────────────────────────────────────────────────

const ESPN_ENDPOINTS: Record<string, string> = {
  nba: 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard',
  mlb: 'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard',
}

// ── Supabase client (service role for writes) ───────────────────────────────

function getSupabase() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, key)
}

// ── ESPN fetcher ────────────────────────────────────────────────────────────

async function fetchESPNScoreboard(sport: string, dateStr: string): Promise<ESPNScoreboard> {
  const yyyymmdd = dateStr.replace(/-/g, '')
  const url = `${ESPN_ENDPOINTS[sport]}?dates=${yyyymmdd}`
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`ESPN API error ${resp.status} for ${sport} on ${dateStr}`)
  return resp.json() as Promise<ESPNScoreboard>
}

// ── Handler ─────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  // Auth: Vercel Cron sends Authorization header, or manual calls supply it
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = req.headers.authorization
    if (auth !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
  }

  const supabase = getSupabase()

  // Resolve games from yesterday (and today, for late finishes)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setUTCDate(today.getUTCDate() - 1)
  const dates = [formatDate(yesterday), formatDate(today)]

  const summary: Record<string, unknown> = {}

  for (const date of dates) {
    // Load all scheduled games for this date
    const { data: games, error: gamesErr } = await supabase
      .from('games')
      .select(
        `id, sport_id, slug, status,
         home_team:teams!games_home_team_id_fkey(abbreviation),
         away_team:teams!games_away_team_id_fkey(abbreviation),
         predictions(id, moneyline_pick, over_under_line, spread_line, spread_pick)`,
      )
      .eq('game_date', date)
      .eq('status', 'scheduled')

    if (gamesErr || !games || games.length === 0) {
      summary[date] = { skipped: true, reason: gamesErr?.message ?? 'no scheduled games' }
      continue
    }

    // Group by sport
    const bySport = new Map<string, typeof games>()
    for (const g of games) {
      const list = bySport.get(g.sport_id) ?? []
      list.push(g)
      bySport.set(g.sport_id, list)
    }

    const dateResults: Record<string, unknown> = {}

    for (const [sport, sportGames] of bySport) {
      if (!ESPN_ENDPOINTS[sport]) continue

      let scoreboard: ESPNScoreboard
      try {
        scoreboard = await fetchESPNScoreboard(sport, date)
      } catch (err) {
        dateResults[sport] = { error: (err as Error).message }
        continue
      }

      let resolved = 0
      let skipped = 0

      for (const dbGame of sportGames) {
        const homeAbbr = (dbGame.home_team as unknown as { abbreviation: string } | null)?.abbreviation
        const awayAbbr = (dbGame.away_team as unknown as { abbreviation: string } | null)?.abbreviation
        if (!homeAbbr || !awayAbbr) { skipped++; continue }

        // Match ESPN event by team abbreviations
        const event = scoreboard.events?.find((e) => {
          const comp = e.competitions?.[0]
          if (!comp) return false
          const home = comp.competitors.find((c: ESPNCompetitor) => c.homeAway === 'home')
          const away = comp.competitors.find((c: ESPNCompetitor) => c.homeAway === 'away')
          return (
            home?.team.abbreviation.toUpperCase() === homeAbbr.toUpperCase() &&
            away?.team.abbreviation.toUpperCase() === awayAbbr.toUpperCase()
          )
        })

        if (!event) { skipped++; continue }

        const competition = event.competitions[0]
        if (!competition.status.type.completed) { skipped++; continue }

        const homeComp = competition.competitors.find((c: ESPNCompetitor) => c.homeAway === 'home')
        const awayComp = competition.competitors.find((c: ESPNCompetitor) => c.homeAway === 'away')
        if (!homeComp || !awayComp) { skipped++; continue }

        const homeScore = parseInt(homeComp.score, 10)
        const awayScore = parseInt(awayComp.score, 10)
        if (isNaN(homeScore) || isNaN(awayScore)) { skipped++; continue }

        // Update game with final scores
        await supabase
          .from('games')
          .update({ status: 'final', home_score: homeScore, away_score: awayScore })
          .eq('id', dbGame.id)

        // Resolve each prediction for this game
        const preds = dbGame.predictions as Array<{
          id: string
          moneyline_pick: 'home' | 'away' | null
          over_under_line: number | null
          spread_line: number | null
          spread_pick: 'home' | 'away' | null
        }>
        for (const pred of preds ?? []) {
          // Determine actual winner
          const actualWinner: 'home' | 'away' = homeScore > awayScore ? 'home' : 'away'

          const winnerCorrect = pred.moneyline_pick !== null
            ? pred.moneyline_pick === actualWinner
            : null

          // Over/under resolution
          let ouCorrect: boolean | null = null
          if (pred.over_under_line !== null) {
            const totalScore = homeScore + awayScore
            const { data: predDetail } = await supabase
              .from('predictions')
              .select('over_pct')
              .eq('id', pred.id)
              .single()
            if (predDetail) {
              const predictedOver = (predDetail.over_pct as number) >= 50
              const actualOver = totalScore > pred.over_under_line
              ouCorrect = predictedOver === actualOver
            }
          }

          // Spread resolution
          let spreadCorrect: boolean | null = null
          if (pred.spread_line !== null && pred.spread_pick !== null) {
            const homeCoversSpread = (homeScore - awayScore) > Math.abs(pred.spread_line)
            const awayCoversSpread = (awayScore - homeScore) > Math.abs(pred.spread_line)
            const actualCover: 'home' | 'away' =
              pred.spread_line < 0
                ? (homeCoversSpread ? 'home' : 'away')
                : (awayCoversSpread ? 'away' : 'home')
            spreadCorrect = pred.spread_pick === actualCover
          }

          // Upsert prediction_result (ignore if already resolved)
          await supabase
            .from('prediction_results')
            .upsert(
              {
                prediction_id: pred.id,
                game_id: dbGame.id,
                winner_correct: winnerCorrect,
                spread_correct: spreadCorrect,
                over_under_correct: ouCorrect,
              },
              { onConflict: 'prediction_id', ignoreDuplicates: true },
            )
        }

        resolved++
      }

      dateResults[sport] = { resolved, skipped }
    }

    summary[date] = dateResults
  }

  return res.status(200).json({ ok: true, summary })
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}
