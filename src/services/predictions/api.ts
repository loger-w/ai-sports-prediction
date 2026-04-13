import { supabase } from '@/lib/supabase'
import type { PredictionFilters } from '@/stores/predictions/predictionStore'

export interface GameWithPrediction {
  id: string
  sport_id: string
  game_date: string
  game_time: string | null
  slug: string
  status: 'scheduled' | 'final'
  home_score: number | null
  away_score: number | null
  home_team: {
    id: string
    name_en: string
    name_zh: string
    abbreviation: string
    logo_url: string | null
  }
  away_team: {
    id: string
    name_en: string
    name_zh: string
    abbreviation: string
    logo_url: string | null
  }
  predictions: Array<{
    id: string
    moneyline_home_pct: number
    moneyline_away_pct: number
    moneyline_pick: 'home' | 'away'
    moneyline_stars: number
    spread_line: number | null
    spread_pick: 'home' | 'away' | null
    spread_pct: number | null
    spread_stars: number
    over_under_line: number | null
    over_pct: number | null
    under_pct: number | null
    over_under_stars: number
    explanation_en: string | null
    explanation_zh: string | null
  }>
}

export function resolveDateRange(dateRange: string): { from: string; to: string } {
  return { from: dateRange, to: dateRange }
}

export async function fetchDailyPredictions(
  filters: { sport: PredictionFilters['sport']; dateRange: string; minStars: number },
): Promise<GameWithPrediction[]> {
  const { from, to } = resolveDateRange(filters.dateRange)

  let query = supabase
    .from('games')
    .select(
      `
      id, sport_id, game_date, game_time, slug, status, home_score, away_score,
      home_team:teams!games_home_team_id_fkey(id, name_en, name_zh, abbreviation, logo_url),
      away_team:teams!games_away_team_id_fkey(id, name_en, name_zh, abbreviation, logo_url),
      predictions(id, moneyline_home_pct, moneyline_away_pct, moneyline_pick, moneyline_stars,
        spread_line, spread_pick, spread_pct, spread_stars,
        over_under_line, over_pct, under_pct, over_under_stars,
        explanation_en, explanation_zh)
    `,
    )
    .gte('game_date', from)
    .lte('game_date', to)
    .order('game_time', { ascending: true, nullsFirst: false })

  if (filters.sport !== 'all') {
    query = query.eq('sport_id', filters.sport)
  }

  const { data, error } = await query

  if (error) throw new Error(error.message)
  if (!data) return []

  let results = data as unknown as GameWithPrediction[]

  // Only show games that have predictions
  results = results.filter((g) => g.predictions && g.predictions.length > 0)

  // minStars filter: show games where at least one dimension has stars >= minStars
  if (filters.minStars > 1) {
    results = results.filter((g) =>
      g.predictions.some(
        (p) =>
          p.moneyline_stars >= filters.minStars ||
          p.spread_stars >= filters.minStars ||
          p.over_under_stars >= filters.minStars,
      ),
    )
  }

  return results
}

// ── Accuracy ─────────────────────────────────────────────────────────────────

export interface AccuracyStat {
  total: number
  winnerCorrect: number
  ouCorrect: number
  ouTotal: number
  winnerPct: number
  ouPct: number
}

export interface DailyPoint {
  date: string
  winnerPct: number
  ouPct: number
}

export interface AccuracyData {
  overall: AccuracyStat
  bySport: Record<string, AccuracyStat>
  daily: DailyPoint[]
}

export function pct(correct: number, total: number): number {
  if (total === 0) return 0
  return Math.round((correct / total) * 1000) / 10
}

export async function fetchAccuracyData(): Promise<AccuracyData> {
  const { data, error } = await supabase
    .from('prediction_results')
    .select(
      `winner_correct, over_under_correct,
       game:games!prediction_results_game_id_fkey(game_date, sport_id)`,
    )

  if (error || !data) throw new Error(error?.message ?? 'Failed to load accuracy data')

  // Supabase may type the FK join as an array; normalise to a single object
  type RawRow = {
    winner_correct: boolean
    over_under_correct: boolean | null
    game: { game_date: string; sport_id: string } | Array<{ game_date: string; sport_id: string }>
  }

  // Single-pass aggregation using Maps (js-combine-iterations + js-index-maps)
  type Bucket = { wTotal: number; wCorrect: number; ouTotal: number; ouCorrect: number }
  const newBucket = (): Bucket => ({ wTotal: 0, wCorrect: 0, ouTotal: 0, ouCorrect: 0 })

  const overall = newBucket()
  const bySportMap = new Map<string, Bucket>()
  const byDateMap = new Map<string, Bucket>()

  for (const raw of data as unknown as RawRow[]) {
    const game = Array.isArray(raw.game) ? raw.game[0] : raw.game
    if (!game) continue
    const { game_date, sport_id } = game
    const row = { winner_correct: raw.winner_correct, over_under_correct: raw.over_under_correct }

    // Overall
    overall.wTotal++
    if (row.winner_correct) overall.wCorrect++
    if (row.over_under_correct !== null) {
      overall.ouTotal++
      if (row.over_under_correct) overall.ouCorrect++
    }

    // By sport
    if (!bySportMap.has(sport_id)) bySportMap.set(sport_id, newBucket())
    const s = bySportMap.get(sport_id)!
    s.wTotal++
    if (row.winner_correct) s.wCorrect++
    if (row.over_under_correct !== null) {
      s.ouTotal++
      if (row.over_under_correct) s.ouCorrect++
    }

    // By date
    if (!byDateMap.has(game_date)) byDateMap.set(game_date, newBucket())
    const d = byDateMap.get(game_date)!
    d.wTotal++
    if (row.winner_correct) d.wCorrect++
    if (row.over_under_correct !== null) {
      d.ouTotal++
      if (row.over_under_correct) d.ouCorrect++
    }
  }

  const toBucket = (b: Bucket): AccuracyStat => ({
    total: b.wTotal,
    winnerCorrect: b.wCorrect,
    ouCorrect: b.ouCorrect,
    ouTotal: b.ouTotal,
    winnerPct: pct(b.wCorrect, b.wTotal),
    ouPct: pct(b.ouCorrect, b.ouTotal),
  })

  const bySport: Record<string, AccuracyStat> = {}
  for (const [sport, bucket] of bySportMap) {
    bySport[sport] = toBucket(bucket)
  }

  // Sort dates ascending for chart (ES2022-safe immutable sort)
  const daily: DailyPoint[] = [...byDateMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, b]) => ({
      date,
      winnerPct: pct(b.wCorrect, b.wTotal),
      ouPct: pct(b.ouCorrect, b.ouTotal),
    }))

  return { overall: toBucket(overall), bySport, daily }
}

// ── Game detail ───────────────────────────────────────────────────────────────

export async function fetchGameDetail(slug: string): Promise<GameWithPrediction | null> {
  const { data, error } = await supabase
    .from('games')
    .select(
      `
      id, sport_id, game_date, game_time, slug, status, home_score, away_score,
      home_team:teams!games_home_team_id_fkey(id, name_en, name_zh, abbreviation, logo_url),
      away_team:teams!games_away_team_id_fkey(id, name_en, name_zh, abbreviation, logo_url),
      predictions(id, moneyline_home_pct, moneyline_away_pct, moneyline_pick, moneyline_stars,
        spread_line, spread_pick, spread_pct, spread_stars,
        over_under_line, over_pct, under_pct, over_under_stars,
        explanation_en, explanation_zh)
    `,
    )
    .eq('slug', slug)
    .single()

  if (error || !data) return null
  return data as unknown as GameWithPrediction
}

export async function fetchSportCounts(
  dateRange: string,
): Promise<Record<string, number>> {
  const { from, to } = resolveDateRange(dateRange)

  const { data, error } = await supabase
    .from('games')
    .select('sport_id')
    .gte('game_date', from)
    .lte('game_date', to)

  if (error || !data) return {}

  const counts: Record<string, number> = {}
  for (const row of data) {
    counts[row.sport_id] = (counts[row.sport_id] ?? 0) + 1
  }
  return counts
}

/**
 * Returns an array of YYYY-MM-DD date strings in [from, to] that have
 * at least one game with a prediction.
 */
export async function fetchDatesWithGames(from: string, to: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('games')
    .select('game_date, predictions(id)')
    .gte('game_date', from)
    .lte('game_date', to)

  if (error || !data) return []

  const dates = new Set<string>()
  for (const row of data as unknown as Array<{ game_date: string; predictions: Array<{ id: string }> }>) {
    if (row.predictions && row.predictions.length > 0) {
      dates.add(row.game_date)
    }
  }
  return [...dates]
}
