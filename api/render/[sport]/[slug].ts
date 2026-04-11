/// <reference types="node" />
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

// Hoist Supabase client to module level — env vars are static per deployment
// (server-hoist-static-io)
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!,
)

// ── HTML helpers ─────────────────────────────────────────────────────────────

function esc(val: string | number | null | undefined): string {
  if (val == null) return ''
  return String(val)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildHtml(params: {
  lang: string
  sport: string
  slug: string
  homeNameEn: string
  homeNameZh: string
  awayNameEn: string
  awayNameZh: string
  homeAbbr: string
  awayAbbr: string
  homeWinPct: number
  awayWinPct: number
  predictedWinner: 'home' | 'away'
  confidenceLevel: string
  overUnderLine: number | null
  overPct: number | null
  underPct: number | null
  explanationEn: string | null
  explanationZh: string | null
  gameDate: string
  gameTime: string | null
  status: string
  homeScore: number | null
  awayScore: number | null
}): string {
  const isZh = params.lang === 'zh'
  const homeName = isZh ? params.homeNameZh : params.homeNameEn
  const awayName = isZh ? params.awayNameZh : params.awayNameEn
  const sportLabel = params.sport.toUpperCase()
  const explanation = isZh ? params.explanationZh : params.explanationEn
  const winnerName = params.predictedWinner === 'home' ? homeName : awayName
  const winnerPct =
    params.predictedWinner === 'home' ? params.homeWinPct : params.awayWinPct

  const pageTitle = isZh
    ? `${awayName} vs ${homeName} AI 預測 | ${sportLabel} | AISports`
    : `${awayName} vs ${homeName} AI Prediction | ${sportLabel} | AISports`

  const description = isZh
    ? `AI 預測 ${awayName} vs ${homeName} 的${sportLabel}比賽結果。預測贏家：${winnerName}（勝率 ${winnerPct}%）。`
    : `AI prediction for ${awayName} vs ${homeName} ${sportLabel} game. Predicted winner: ${winnerName} (${winnerPct}% win probability).`

  const canonicalUrl = `https://ai-sports-prediction.vercel.app/${params.lang}/${params.sport}/${params.slug}`

  // SportsEvent JSON-LD schema
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: `${params.awayNameEn} at ${params.homeNameEn}`,
    startDate: params.gameTime ?? params.gameDate,
    sport: params.sport === 'nba' ? 'Basketball' : 'Baseball',
    location: { '@type': 'Place', name: `${params.homeNameEn} Home` },
    homeTeam: { '@type': 'SportsTeam', name: params.homeNameEn },
    awayTeam: { '@type': 'SportsTeam', name: params.awayNameEn },
    url: canonicalUrl,
  }
  if (params.status === 'final' && params.homeScore != null && params.awayScore != null) {
    schema.eventStatus = 'https://schema.org/EventScheduled'
    schema.homeTeamScore = params.homeScore
    schema.awayTeamScore = params.awayScore
  }

  const ouLine =
    params.overUnderLine != null
      ? isZh
        ? `大小分基準：${params.overUnderLine}（${params.overPct}% 大分 / ${params.underPct}% 小分）`
        : `Over/Under line: ${params.overUnderLine} (Over ${params.overPct}% / Under ${params.underPct}%)`
      : ''

  const scoreBlock =
    params.status === 'final' && params.homeScore != null && params.awayScore != null
      ? `<p><strong>${isZh ? '最終比分' : 'Final Score'}:</strong> ${esc(params.awayAbbr)} ${params.awayScore} – ${params.homeScore} ${esc(params.homeAbbr)}</p>`
      : ''

  return `<!DOCTYPE html>
<html lang="${esc(params.lang)}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(pageTitle)}</title>
  <meta name="description" content="${esc(description)}" />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="${esc(canonicalUrl)}" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${esc(pageTitle)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:url" content="${esc(canonicalUrl)}" />
  <meta property="og:site_name" content="AISports" />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="${esc(pageTitle)}" />
  <meta name="twitter:description" content="${esc(description)}" />
  <script type="application/ld+json">${JSON.stringify(schema)}</script>
</head>
<body>
  <h1>${esc(awayName)} vs ${esc(homeName)} – ${esc(sportLabel)} ${isZh ? 'AI 預測' : 'AI Prediction'}</h1>
  <p>${isZh ? '比賽日期' : 'Game Date'}: ${esc(params.gameDate)}</p>
  ${scoreBlock}
  <h2>${isZh ? 'AI 預測結果' : 'AI Prediction'}</h2>
  <p>${isZh ? '預測贏家' : 'Predicted winner'}: <strong>${esc(winnerName)}</strong> (${winnerPct}%)</p>
  <p>${isZh ? '主隊勝率' : 'Home win probability'}: ${esc(params.homeAbbr)} ${params.homeWinPct}%</p>
  <p>${isZh ? '客隊勝率' : 'Away win probability'}: ${esc(params.awayAbbr)} ${params.awayWinPct}%</p>
  ${ouLine ? `<p>${esc(ouLine)}</p>` : ''}
  ${explanation ? `<h2>${isZh ? 'AI 分析' : 'AI Analysis'}</h2><p>${esc(explanation)}</p>` : ''}
  <p><a href="${esc(`/${params.lang}/${params.sport}/${params.slug}`)}">${isZh ? '查看完整預測' : 'View full prediction'}</a></p>
</body>
</html>`
}

// ── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { sport, slug } = req.query as { sport: string; slug: string }
  const lang = (req.query.lang as string) === 'zh' ? 'zh' : 'en'

  // Validate params before hitting Supabase (async-cheap-condition-before-await)
  if (sport !== 'nba' && sport !== 'mlb') {
    return res.status(400).send('Invalid sport')
  }
  if (!slug || typeof slug !== 'string') {
    return res.status(400).send('Invalid slug')
  }

  // Start query (async-api-routes: kick off early)
  const queryPromise = supabase
    .from('games')
    .select(
      `
      id, sport_id, game_date, game_time, slug, status, home_score, away_score,
      home_team:teams!games_home_team_id_fkey(id, name_en, name_zh, abbreviation),
      away_team:teams!games_away_team_id_fkey(id, name_en, name_zh, abbreviation),
      predictions(home_win_pct, away_win_pct, predicted_winner, confidence_level,
                  over_under_line, over_pct, under_pct, explanation_en, explanation_zh)
    `,
    )
    .eq('slug', slug)
    .single()

  const { data, error } = await queryPromise

  if (error || !data) {
    return res.status(404).send('Game not found')
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const game = data as any
  const prediction = game.predictions?.[0]
  if (!prediction) {
    return res.status(404).send('Prediction not found')
  }

  const html = buildHtml({
    lang,
    sport,
    slug,
    homeNameEn: game.home_team.name_en,
    homeNameZh: game.home_team.name_zh,
    awayNameEn: game.away_team.name_en,
    awayNameZh: game.away_team.name_zh,
    homeAbbr: game.home_team.abbreviation,
    awayAbbr: game.away_team.abbreviation,
    homeWinPct: prediction.home_win_pct,
    awayWinPct: prediction.away_win_pct,
    predictedWinner: prediction.predicted_winner,
    confidenceLevel: prediction.confidence_level,
    overUnderLine: prediction.over_under_line,
    overPct: prediction.over_pct,
    underPct: prediction.under_pct,
    explanationEn: prediction.explanation_en,
    explanationZh: prediction.explanation_zh,
    gameDate: game.game_date,
    gameTime: game.game_time,
    status: game.status,
    homeScore: game.home_score,
    awayScore: game.away_score,
  })

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')
  return res.status(200).send(html)
}
