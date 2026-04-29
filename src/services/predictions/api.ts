// src/services/predictions/api.ts
import { supabase } from '@/lib/supabase'
import type { PredictionFilters } from '@/stores/predictions/predictionStore'
import type {
  Market,
  RecResult,
  RecommendationWithGame,
} from '@/types/predictions/recommendation'

const RECS_SELECT = `
  game_id, market, pick, line, stars, result,
  game:games!inner(
    id, sport_id, game_date, game_time, status,
    home_team:teams!games_home_team_id_fkey(abbreviation, name_zh),
    away_team:teams!games_away_team_id_fkey(abbreviation, name_zh)
  )
` as const

function compareForSort(
  a: RecommendationWithGame,
  b: RecommendationWithGame,
  sortBy: 'time' | 'stars',
): number {
  if (sortBy === 'stars') {
    if (b.stars !== a.stars) return b.stars - a.stars
    return a.game.game_time.localeCompare(b.game.game_time)
  }
  // time
  const t = a.game.game_time.localeCompare(b.game.game_time)
  if (t !== 0) return t
  return b.stars - a.stars
}

export interface RecommendationFilters
  extends Pick<PredictionFilters, 'sport' | 'dateRange' | 'minStars' | 'sortBy'> {
  markets: Market[]
}

export async function fetchDailyRecommendations(
  filters: RecommendationFilters,
): Promise<RecommendationWithGame[]> {
  if (filters.markets.length === 0) return []

  let q = supabase
    .from('recommendations')
    .select(RECS_SELECT)
    .gte('stars', filters.minStars)
    .in('market', filters.markets)
    .eq('game.game_date', filters.dateRange)

  if (filters.sport !== 'all') {
    q = q.eq('game.sport_id', filters.sport)
  }

  const { data, error } = await q

  if (error) throw new Error(error.message)

  const rows = data as unknown as RecommendationWithGame[]
  return rows.slice().sort((a, b) => compareForSort(a, b, filters.sortBy))
}

export async function fetchRecommendationCounts(
  dateRange: string,
): Promise<Record<string, number>> {
  // Number of recommendations per sport for the chosen date.
  const { data, error } = await supabase
    .from('recommendations')
    .select('game:games!inner(sport_id)')
    .eq('game.game_date', dateRange)

  if (error) return {}

  const counts: Record<string, number> = {}
  for (const row of data as unknown as { game: { sport_id: string } }[]) {
    const sid = row.game.sport_id
    counts[sid] = (counts[sid] ?? 0) + 1
  }
  return counts
}

/** Returns YYYY-MM-DD strings within [from, to] that have at least one recommendation. */
export async function fetchDatesWithRecommendations(from: string, to: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('recommendations')
    .select('game:games!inner(game_date)')
    .gte('game.game_date', from)
    .lte('game.game_date', to)

  if (error) return []

  const dates = new Set<string>()
  for (const row of data as unknown as { game: { game_date: string } }[]) {
    dates.add(row.game.game_date)
  }
  return [...dates]
}

// ── Accuracy ────────────────────────────────────────────────────────────────

export interface AccuracyBucket {
  total: number                     // count of all settled rows (any non-null result, including void)
  wins: number
  losses: number
  pushes: number
  voids: number
  pct: number                       // wins / (wins + losses); pushes & voids excluded
}

export interface AccuracyData {
  overall: AccuracyBucket
  byMarket: Record<Market, AccuracyBucket>
  byStars: Record<number, AccuracyBucket>           // 1..5
  daily: { date: string; pct: number; total: number }[]
}

const EMPTY_BUCKET = (): AccuracyBucket => ({
  total: 0,
  wins: 0,
  losses: 0,
  pushes: 0,
  voids: 0,
  pct: 0,
})

function add(b: AccuracyBucket, r: RecResult): void {
  b.total++
  if (r === 'win') b.wins++
  else if (r === 'loss') b.losses++
  else if (r === 'push') b.pushes++
  else b.voids++
}

function pct(b: AccuracyBucket): number {
  const decided = b.wins + b.losses
  if (decided === 0) return 0
  return Math.round((b.wins / decided) * 1000) / 10
}

function finalize(b: AccuracyBucket): AccuracyBucket {
  b.pct = pct(b)
  return b
}

export async function fetchAccuracyData(): Promise<AccuracyData> {
  const { data, error } = await supabase
    .from('recommendations')
    .select('market, stars, result, game:games!inner(game_date)')
    .not('result', 'is', null)

  if (error) {
    return {
      overall: EMPTY_BUCKET(),
      byMarket: { ml: EMPTY_BUCKET(), spread: EMPTY_BUCKET(), ou: EMPTY_BUCKET() },
      byStars: { 1: EMPTY_BUCKET(), 2: EMPTY_BUCKET(), 3: EMPTY_BUCKET(), 4: EMPTY_BUCKET(), 5: EMPTY_BUCKET() },
      daily: [],
    }
  }

  const overall = EMPTY_BUCKET()
  const byMarket: Record<Market, AccuracyBucket> = {
    ml: EMPTY_BUCKET(),
    spread: EMPTY_BUCKET(),
    ou: EMPTY_BUCKET(),
  }
  const byStars: Record<number, AccuracyBucket> = {
    1: EMPTY_BUCKET(), 2: EMPTY_BUCKET(), 3: EMPTY_BUCKET(),
    4: EMPTY_BUCKET(), 5: EMPTY_BUCKET(),
  }
  const dailyMap = new Map<string, AccuracyBucket>()

  type Row = {
    market: Market
    stars: number
    result: RecResult
    game: { game_date: string } | { game_date: string }[]
  }

  for (const raw of data as unknown as Row[]) {
    const game = Array.isArray(raw.game) ? raw.game[0] : raw.game
    if (!game.game_date) continue

    add(overall, raw.result)
    add(byMarket[raw.market], raw.result)
    add(byStars[raw.stars], raw.result)

    if (!dailyMap.has(game.game_date)) dailyMap.set(game.game_date, EMPTY_BUCKET())
    add(dailyMap.get(game.game_date)!, raw.result)
  }

  finalize(overall)
  for (const m of Object.keys(byMarket) as Market[]) finalize(byMarket[m])
  for (const s of Object.keys(byStars).map(Number)) finalize(byStars[s])

  const daily = [...dailyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, bucket]) => ({ date, pct: pct(bucket), total: bucket.total }))

  return { overall, byMarket, byStars, daily }
}
