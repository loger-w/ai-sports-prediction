# Phase 3: UX Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul date navigation, redesign GameCard with per-dimension star ratings, add timezone auto-detection, and wire up a semi-automatic data pipeline for game schedule ingestion.

**Architecture:** DB schema migration first (rename columns, add spread fields, per-dimension stars), then TypeScript types and service layer, then UI components bottom-up (StarRating → PredictionColumn → GameCard, DateScrollBar), then sidebar/layout wiring, then backend cron for schedule ingest.

**Tech Stack:** React 19, TanStack Router, Zustand, TanStack Query, dayjs (timezone + utc plugins), Supabase, Vercel Cron, Vitest + Testing Library

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Create | `supabase/migrations/004_phase3_schema.sql` | DB schema changes |
| Modify | `src/types/predictions/index.ts` | Update Prediction, SkillPrediction types |
| Modify | `src/lib/i18n/en.ts` | Add moneyline/spread/ou/pass keys |
| Modify | `src/lib/i18n/zh.ts` | Same keys in Chinese |
| Create | `src/lib/timezone.ts` | User timezone detection + dayjs conversion |
| Modify | `src/services/predictions/api.ts` | Update GameWithPrediction, fetchDailyPredictions, add fetchDatesWithGames |
| Modify | `src/stores/predictions/predictionStore.ts` | Replace confidence array with minStars, dateRange always YYYY-MM-DD |
| Create | `src/components/predictions/StarRating.tsx` | Render 1–5 gold/dark stars |
| Create | `src/components/predictions/PredictionColumn.tsx` | Dimension column: label + stars + pick/PASS + pct |
| Modify | `src/components/predictions/GameCard.tsx` | Full rewrite with three-column layout |
| Delete | `src/components/predictions/WinProbabilityBar.tsx` | Replaced by GameCard rewrite |
| Delete | `src/components/predictions/OverUnderDisplay.tsx` | Merged into PredictionColumn |
| Create | `src/hooks/predictions/useDatesWithGames.ts` | Query hook for date dot data |
| Create | `src/components/predictions/DateScrollBar.tsx` | Horizontal date chips + 📅 calendar popup |
| Modify | `src/components/layout/AppSidebar.tsx` | Remove date section; confidence → minStars slider |
| Modify | `src/components/layout/MobileFilterBar.tsx` | Remove date pills; confidence → minStars |
| Modify | `src/routes/$lang/predictions/route.tsx` | Add DateScrollBar above GameGrid |
| Modify | `src/components/game-detail/GameDetailHeader.tsx` | Use timezone util, remove hardcoded ET |
| Modify | `src/components/game-detail/PredictionBreakdown.tsx` | Rewrite with three-dimension expanded layout |
| Create | `api/cron/ingest-schedule.ts` | Daily game schedule ingest from MLB/NBA APIs |
| Modify | `api/cron/resolve-results.ts` | Add spread_correct resolution |
| Modify | `api/cron/ingest-predictions.ts` | Update upsert for new schema fields |
| Modify | `src/lib/predictions/ingest-helpers.ts` | Remove deriveConfidence (replaced by per-dim stars) |
| Modify | `vercel.json` | Add ingest-schedule cron entry |
| Modify | `src/test/integration/GameCard.test.tsx` | Update for new GameCard interface |
| Modify | `src/test/integration/predictionStore.test.ts` | Update for minStars |
| Delete | `src/test/integration/WinProbabilityBar.test.tsx` | Component removed |
| Delete | `src/test/integration/OverUnderDisplay.test.tsx` | Component removed |
| Create | `src/test/unit/timezone.test.ts` | Test timezone utilities |
| Create | `src/test/unit/StarRating.test.tsx` | Test star rendering |
| Create | `src/test/integration/PredictionColumn.test.tsx` | Test PASS/pick states |

---

## Task 1: DB Migration

**Files:**
- Create: `supabase/migrations/004_phase3_schema.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 004_phase3_schema.sql

-- 1. Add per-dimension star columns (before dropping confidence_level)
ALTER TABLE predictions
  ADD COLUMN IF NOT EXISTS moneyline_stars INTEGER NOT NULL DEFAULT 3
    CHECK (moneyline_stars BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS spread_stars INTEGER NOT NULL DEFAULT 3
    CHECK (spread_stars BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS over_under_stars INTEGER NOT NULL DEFAULT 3
    CHECK (over_under_stars BETWEEN 1 AND 5);

-- 2. Drop old confidence column
ALTER TABLE predictions DROP COLUMN IF EXISTS confidence_level;

-- 3. Rename moneyline columns for clarity
ALTER TABLE predictions RENAME COLUMN predicted_winner TO moneyline_pick;
ALTER TABLE predictions RENAME COLUMN home_win_pct TO moneyline_home_pct;
ALTER TABLE predictions RENAME COLUMN away_win_pct TO moneyline_away_pct;

-- 4. Add spread columns
ALTER TABLE predictions
  ADD COLUMN IF NOT EXISTS spread_line DECIMAL(5,1),
  ADD COLUMN IF NOT EXISTS spread_pick TEXT,
  ADD COLUMN IF NOT EXISTS spread_pct DECIMAL(5,2);

-- 5. Add spread resolution to prediction_results
ALTER TABLE prediction_results
  ADD COLUMN IF NOT EXISTS spread_correct BOOLEAN;
```

- [ ] **Step 2: Apply via Supabase MCP**

Run this migration using the `mcp__supabase__apply_migration` tool with the SQL above. Migration name: `phase3_schema`.

- [ ] **Step 3: Verify tables updated**

Use `mcp__supabase__list_tables` and confirm `predictions` has the new columns and `prediction_results` has `spread_correct`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/004_phase3_schema.sql
git commit -m "feat: db migration - per-dimension stars, spread fields, rename moneyline columns"
```

---

## Task 2: TypeScript Types

**Files:**
- Modify: `src/types/predictions/index.ts`

- [ ] **Step 1: Update `Prediction` interface**

Replace the existing `Prediction` interface (lines 33–47) with:

```ts
export interface Prediction {
  id: string
  game_id: string
  model_version: string
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
  created_at: string
}
```

- [ ] **Step 2: Update `PredictionResult` interface**

```ts
export interface PredictionResult {
  id: string
  prediction_id: string
  game_id: string
  winner_correct: boolean | null
  spread_correct: boolean | null
  over_under_correct: boolean | null
  resolved_at: string
}
```

- [ ] **Step 3: Update `SkillPrediction` interface**

Replace the existing `SkillPrediction` (lines 60–74) with:

```ts
export interface SkillPrediction {
  home_team: string
  away_team: string
  game_time: string
  moneyline_home_pct: number
  moneyline_away_pct: number
  moneyline_stars: number
  spread_line: number | null
  spread_pick: 'home' | 'away' | null
  spread_pct: number | null
  spread_stars: number
  over_under_line: number | null
  over_pct: number | null
  under_pct: number | null
  over_under_stars: number
  explanation_en: string
  explanation_zh: string
}
```

- [ ] **Step 4: Run type check**

```bash
npx tsc --noEmit
```

Expect: errors in api.ts, GameCard, PredictionBreakdown etc. (will be fixed in later tasks). That's fine — just confirm the types file itself has no errors.

- [ ] **Step 5: Commit**

```bash
git add src/types/predictions/index.ts
git commit -m "feat: update Prediction and SkillPrediction types for phase 3 schema"
```

---

## Task 3: i18n Updates

**Files:**
- Modify: `src/lib/i18n/en.ts`
- Modify: `src/lib/i18n/zh.ts`

- [ ] **Step 1: Update `Translations` type in `en.ts`**

Replace the `predictions` block in the `Translations` type (lines 15–19) with:

```ts
predictions: {
  moneyline: string
  spread: string
  overUnder: string
  pass: string
  vs: string
  noResults: string
  noData: string
  resetFilters: string
  retry: string
}
```

Remove the `confidence` sub-object and the old `homeWinPct`, `awayWinPct`, `ouLine`, `over`, `under` keys since they're replaced.

Also update the `filter` type — remove `today`, `tomorrow`, `thisWeek`, `high`, `medium`, `low` keys; add `minStars` and `minStarsLabel`:

```ts
filter: {
  sport: string
  allSports: string
  minStars: string
  minStarsLabel: string
  confidence: string
  direction: string
  all: string
  home: string
  away: string
  filterButton: string
}
```

- [ ] **Step 2: Update `en` values**

Replace the `filter` and `predictions` values in the `en` object:

```ts
filter: {
  sport: 'Sport',
  allSports: 'All',
  minStars: 'Min Stars',
  minStarsLabel: (n: number) => `${n}+ ★`,  // Note: keep as string in Translations, use inline in component
  confidence: 'Confidence',
  direction: 'Prediction',
  all: 'All',
  home: 'Home Win',
  away: 'Away Win',
  filterButton: 'Filters',
},
predictions: {
  moneyline: 'Moneyline',
  spread: 'Spread',
  overUnder: 'O/U',
  pass: 'PASS',
  vs: 'VS',
  noResults: 'No predictions match your filters.',
  noData: 'Predictions are usually updated each morning.',
  resetFilters: 'Reset Filters',
  retry: 'Retry',
},
```

Note: `minStarsLabel` cannot be a function in the `Translations` type (it's typed as `string`). Instead, keep it as `'★'` and build the label inline in the component: `` `${minStars}+ ★` ``.

The final `filter` values:

```ts
filter: {
  sport: 'Sport',
  allSports: 'All',
  minStars: 'Min Stars',
  confidence: 'Confidence',
  direction: 'Prediction',
  all: 'All',
  home: 'Home Win',
  away: 'Away Win',
  filterButton: 'Filters',
},
```

- [ ] **Step 3: Update `zh` values**

```ts
filter: {
  sport: '運動種類',
  allSports: '全部',
  minStars: '最低星數',
  confidence: '信心度',
  direction: '預測方向',
  all: '全部',
  home: '主隊勝',
  away: '客隊勝',
  filterButton: '篩選',
},
predictions: {
  moneyline: '獨贏',
  spread: '讓分',
  overUnder: '大小分',
  pass: 'PASS',
  vs: 'VS',
  noResults: '沒有符合篩選條件的預測。',
  noData: '預測通常在每天早上更新。',
  resetFilters: '重置篩選',
  retry: '重試',
},
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/i18n/en.ts src/lib/i18n/zh.ts
git commit -m "feat: update i18n for phase 3 - add prediction dimension labels, remove old confidence keys"
```

---

## Task 4: Timezone Utility

**Files:**
- Create: `src/lib/timezone.ts`
- Create: `src/test/unit/timezone.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/test/unit/timezone.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest'

vi.mock('dayjs/plugin/timezone', () => ({
  default: () => {},
}))
vi.mock('dayjs/plugin/utc', () => ({
  default: () => {},
}))

const { getUserTimezone, toLocalTimeString, toLocalDateString, localToday } =
  await import('@/lib/timezone')

describe('timezone utilities', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('getUserTimezone returns a non-empty string', () => {
    const tz = getUserTimezone()
    expect(typeof tz).toBe('string')
    expect(tz.length).toBeGreaterThan(0)
  })

  it('localToday returns YYYY-MM-DD format', () => {
    const today = localToday()
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('toLocalTimeString formats UTC timestamp to time string', () => {
    // Fixed UTC time — we test format shape, not exact value (TZ varies per machine)
    const result = toLocalTimeString('2026-04-12T02:30:00Z')
    expect(result).toMatch(/^\d{2}:\d{2}$/)
  })

  it('toLocalTimeString returns null for null input', () => {
    expect(toLocalTimeString(null)).toBeNull()
  })

  it('toLocalDateString formats UTC timestamp to date string', () => {
    const result = toLocalDateString('2026-04-12T02:30:00Z')
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
```

- [ ] **Step 2: Run to verify fail**

```bash
npx vitest run src/test/unit/timezone.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/lib/timezone.ts
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)

/** Returns the IANA timezone string from the user's browser, e.g. "America/New_York" */
export function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

/** Returns today's date in YYYY-MM-DD in the user's local timezone */
export function localToday(): string {
  return dayjs().tz(getUserTimezone()).format('YYYY-MM-DD')
}

/**
 * Converts a UTC ISO timestamp to HH:mm in the user's local timezone.
 * Returns null if input is null/undefined.
 */
export function toLocalTimeString(utcTimestamp: string | null | undefined): string | null {
  if (!utcTimestamp) return null
  return dayjs(utcTimestamp).tz(getUserTimezone()).format('HH:mm')
}

/**
 * Converts a UTC ISO timestamp to YYYY-MM-DD in the user's local timezone.
 * Returns null if input is null/undefined.
 */
export function toLocalDateString(utcTimestamp: string | null | undefined): string | null {
  if (!utcTimestamp) return null
  return dayjs(utcTimestamp).tz(getUserTimezone()).format('YYYY-MM-DD')
}

/**
 * Formats a UTC ISO timestamp for display: "Apr 12, 2026 · 19:30"
 * Returns null if input is null.
 */
export function toLocalDisplayDateTime(utcTimestamp: string | null | undefined): string | null {
  if (!utcTimestamp) return null
  return dayjs(utcTimestamp).tz(getUserTimezone()).format('MMM D, YYYY · HH:mm')
}
```

- [ ] **Step 4: Run to verify pass**

```bash
npx vitest run src/test/unit/timezone.test.ts
```

Expected: all 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/timezone.ts src/test/unit/timezone.test.ts
git commit -m "feat: add timezone utility for user-local time display"
```

---

## Task 5: Update API Service Layer

**Files:**
- Modify: `src/services/predictions/api.ts`

- [ ] **Step 1: Update `GameWithPrediction` type**

Replace the `predictions` array type in `GameWithPrediction` (lines 28–38) with:

```ts
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
```

- [ ] **Step 2: Simplify `resolveDateRange`**

Since `dateRange` is now always a `YYYY-MM-DD` string, replace the entire function:

```ts
export function resolveDateRange(dateRange: string): { from: string; to: string } {
  return { from: dateRange, to: dateRange }
}
```

- [ ] **Step 3: Update `fetchDailyPredictions` select clause and filters**

Replace the select string to use new column names:

```ts
export async function fetchDailyPredictions(
  filters: Pick<PredictionFilters, 'sport' | 'dateRange' | 'minStars' | 'direction'>,
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

  // Direction filter
  if (filters.direction !== 'all') {
    results = results.filter((g) =>
      g.predictions.some((p) => p.moneyline_pick === filters.direction),
    )
  }

  return results
}
```

- [ ] **Step 4: Update `fetchSportCounts` to use resolved dateRange**

The function signature uses `dateRange: string` and calls `resolveDateRange`. Since `resolveDateRange` is now simpler, this function works as-is. No change needed.

- [ ] **Step 5: Add `fetchDatesWithGames`**

Append this function to the file:

```ts
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
```

- [ ] **Step 6: Delete stale `resolveDateRange` test cases for 'today'/'tomorrow'/'week'**

Open `src/test/unit/resolveDateRange.test.ts`. Remove the 'today', 'tomorrow', and 'week' test cases since those presets no longer exist. Keep only the specific-date-string test:

```ts
// src/test/unit/resolveDateRange.test.ts
import { describe, it, expect } from 'vitest'

vi.mock('@/lib/supabase', () => ({ supabase: {} }))

const { resolveDateRange } = await import('@/services/predictions/api')

describe('resolveDateRange', () => {
  it('returns the date itself for a YYYY-MM-DD string', () => {
    const result = resolveDateRange('2026-04-15')
    expect(result).toEqual({ from: '2026-04-15', to: '2026-04-15' })
  })
})
```

- [ ] **Step 7: Run updated test**

```bash
npx vitest run src/test/unit/resolveDateRange.test.ts
```

Expected: 1 test PASS.

- [ ] **Step 8: Commit**

```bash
git add src/services/predictions/api.ts src/test/unit/resolveDateRange.test.ts
git commit -m "feat: update API service for new prediction schema and add fetchDatesWithGames"
```

---

## Task 6: Update Prediction Store

**Files:**
- Modify: `src/stores/predictions/predictionStore.ts`
- Modify: `src/test/integration/predictionStore.test.ts`

- [ ] **Step 1: Write the failing test**

Replace `src/test/integration/predictionStore.test.ts` with:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { usePredictionStore } from '@/stores/predictions/predictionStore'

describe('predictionStore', () => {
  beforeEach(() => {
    usePredictionStore.getState().resetFilters()
  })

  it('has correct initial state with localToday dateRange and minStars 1', () => {
    const state = usePredictionStore.getState()
    expect(state.sport).toBe('all')
    expect(state.dateRange).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(state.minStars).toBe(1)
    expect(state.direction).toBe('all')
  })

  it('setSport updates sport', () => {
    usePredictionStore.getState().setSport('nba')
    expect(usePredictionStore.getState().sport).toBe('nba')
  })

  it('setDateRange accepts YYYY-MM-DD strings', () => {
    usePredictionStore.getState().setDateRange('2026-04-20')
    expect(usePredictionStore.getState().dateRange).toBe('2026-04-20')
  })

  it('setMinStars updates minStars', () => {
    usePredictionStore.getState().setMinStars(4)
    expect(usePredictionStore.getState().minStars).toBe(4)
  })

  it('setDirection updates direction', () => {
    usePredictionStore.getState().setDirection('home')
    expect(usePredictionStore.getState().direction).toBe('home')
  })

  it('resetFilters resets to initial state', () => {
    usePredictionStore.getState().setSport('nba')
    usePredictionStore.getState().setDateRange('2026-04-20')
    usePredictionStore.getState().setMinStars(4)
    usePredictionStore.getState().setDirection('home')
    usePredictionStore.getState().resetFilters()

    const state = usePredictionStore.getState()
    expect(state.sport).toBe('all')
    expect(state.dateRange).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(state.minStars).toBe(1)
    expect(state.direction).toBe('all')
  })
})
```

- [ ] **Step 2: Run to verify fail**

```bash
npx vitest run src/test/integration/predictionStore.test.ts
```

Expected: FAIL — `minStars` not found, `setMinStars` not found.

- [ ] **Step 3: Rewrite the store**

Replace `src/stores/predictions/predictionStore.ts`:

```ts
import { create } from 'zustand'
import { localToday } from '@/lib/timezone'

export interface PredictionFilters {
  sport: 'all' | 'nba' | 'mlb'
  dateRange: string            // always YYYY-MM-DD
  minStars: number             // 1–5, where 1 = no filter
  direction: 'all' | 'home' | 'away'
}

interface PredictionStore extends PredictionFilters {
  setSport: (sport: PredictionFilters['sport']) => void
  setDateRange: (range: string) => void
  setMinStars: (stars: number) => void
  setDirection: (dir: PredictionFilters['direction']) => void
  resetFilters: () => void
}

function getDefaultFilters(): PredictionFilters {
  return {
    sport: 'all',
    dateRange: localToday(),
    minStars: 1,
    direction: 'all',
  }
}

export const usePredictionStore = create<PredictionStore>((set) => ({
  ...getDefaultFilters(),
  setSport: (sport) => set({ sport }),
  setDateRange: (dateRange) => set({ dateRange }),
  setMinStars: (minStars) => set({ minStars }),
  setDirection: (direction) => set({ direction }),
  resetFilters: () => set(getDefaultFilters()),
}))
```

- [ ] **Step 4: Run to verify pass**

```bash
npx vitest run src/test/integration/predictionStore.test.ts
```

Expected: all 6 tests PASS.

- [ ] **Step 5: Update `useDailyPredictions` hook**

In `src/hooks/predictions/useDailyPredictions.ts`, update the destructure to use `minStars` instead of `confidence`:

```ts
import { useQuery } from '@tanstack/react-query'
import {
  fetchDailyPredictions,
  fetchSportCounts,
} from '@/services/predictions/api'
import { usePredictionStore } from '@/stores/predictions/predictionStore'

export function useDailyPredictions() {
  const { sport, dateRange, minStars, direction } = usePredictionStore()

  return useQuery({
    queryKey: ['predictions', sport, dateRange, minStars, direction],
    queryFn: () =>
      fetchDailyPredictions({ sport, dateRange, minStars, direction }),
  })
}

export function useSportCounts() {
  const dateRange = usePredictionStore((s) => s.dateRange)

  return useQuery({
    queryKey: ['sportCounts', dateRange],
    queryFn: () => fetchSportCounts(dateRange),
  })
}
```

- [ ] **Step 6: Commit**

```bash
git add src/stores/predictions/predictionStore.ts src/hooks/predictions/useDailyPredictions.ts src/test/integration/predictionStore.test.ts
git commit -m "feat: update prediction store - replace confidence array with minStars, dateRange always YYYY-MM-DD"
```

---

## Task 7: StarRating Component

**Files:**
- Create: `src/components/predictions/StarRating.tsx`
- Create: `src/test/unit/StarRating.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/test/unit/StarRating.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StarRating } from '@/components/predictions/StarRating'

describe('StarRating', () => {
  it('renders 5 star elements', () => {
    const { container } = render(<StarRating stars={3} />)
    const stars = container.querySelectorAll('[data-star]')
    expect(stars).toHaveLength(5)
  })

  it('marks first N stars as filled for stars=3', () => {
    const { container } = render(<StarRating stars={3} />)
    const filled = container.querySelectorAll('[data-star="filled"]')
    const empty = container.querySelectorAll('[data-star="empty"]')
    expect(filled).toHaveLength(3)
    expect(empty).toHaveLength(2)
  })

  it('marks all 5 as filled for stars=5', () => {
    const { container } = render(<StarRating stars={5} />)
    expect(container.querySelectorAll('[data-star="filled"]')).toHaveLength(5)
    expect(container.querySelectorAll('[data-star="empty"]')).toHaveLength(0)
  })

  it('marks all 5 as empty for stars=1', () => {
    // stars=1 means PASS — still renders stars but all dark
    const { container } = render(<StarRating stars={1} />)
    expect(container.querySelectorAll('[data-star="filled"]')).toHaveLength(1)
    expect(container.querySelectorAll('[data-star="empty"]')).toHaveLength(4)
  })
})
```

- [ ] **Step 2: Run to verify fail**

```bash
npx vitest run src/test/unit/StarRating.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```tsx
// src/components/predictions/StarRating.tsx
interface StarRatingProps {
  stars: number  // 1–5
  size?: number  // px, default 9
}

export function StarRating({ stars, size = 9 }: StarRatingProps) {
  return (
    <div style={{ display: 'flex', gap: '1px' }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          data-star={i < stars ? 'filled' : 'empty'}
          style={{
            fontSize: `${size}px`,
            color: i < stars ? '#fbbf24' : '#2d3748',
          }}
        >
          ★
        </span>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Run to verify pass**

```bash
npx vitest run src/test/unit/StarRating.test.tsx
```

Expected: all 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/predictions/StarRating.tsx src/test/unit/StarRating.test.tsx
git commit -m "feat: add StarRating component for 1-5 star display"
```

---

## Task 8: PredictionColumn Component

**Files:**
- Create: `src/components/predictions/PredictionColumn.tsx`
- Create: `src/test/integration/PredictionColumn.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/test/integration/PredictionColumn.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PredictionColumn } from '@/components/predictions/PredictionColumn'

describe('PredictionColumn', () => {
  it('shows pick and pct when stars >= 2', () => {
    render(
      <PredictionColumn
        label="Moneyline"
        stars={4}
        pick="LAL"
        pct={62.3}
        lineRef={null}
      />
    )
    expect(screen.getByText('Moneyline')).toBeInTheDocument()
    expect(screen.getByText('LAL')).toBeInTheDocument()
    expect(screen.getByText('62.3%')).toBeInTheDocument()
    expect(screen.queryByText('PASS')).toBeNull()
  })

  it('shows PASS and lineRef when stars === 1', () => {
    render(
      <PredictionColumn
        label="O/U"
        stars={1}
        pick="O 218.5"
        pct={51}
        lineRef="218.5"
      />
    )
    expect(screen.getByText('PASS')).toBeInTheDocument()
    expect(screen.getByText('218.5')).toBeInTheDocument()
    expect(screen.queryByText('O 218.5')).toBeNull()
    expect(screen.queryByText('51%')).toBeNull()
  })

  it('shows PASS without lineRef when lineRef is null', () => {
    render(
      <PredictionColumn
        label="Moneyline"
        stars={1}
        pick="LAL"
        pct={52}
        lineRef={null}
      />
    )
    expect(screen.getByText('PASS')).toBeInTheDocument()
    expect(screen.queryByText('52%')).toBeNull()
  })
})
```

- [ ] **Step 2: Run to verify fail**

```bash
npx vitest run src/test/integration/PredictionColumn.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```tsx
// src/components/predictions/PredictionColumn.tsx
import { StarRating } from './StarRating'

const FONT = { fontFamily: 'var(--font-barlow-condensed)' }

interface PredictionColumnProps {
  label: string
  stars: number        // 1–5
  pick: string         // formatted pick text, e.g. "LAL", "LAL -3.5", "O 218.5"
  pct: number | null   // confidence %, shown when stars >= 2
  lineRef: string | null  // grey reference shown in PASS state (e.g. "218.5", "-3.5")
  isLast?: boolean
}

export function PredictionColumn({
  label,
  stars,
  pick,
  pct,
  lineRef,
  isLast = false,
}: PredictionColumnProps) {
  const isPass = stars <= 1

  return (
    <div
      style={{
        padding: '10px 6px',
        textAlign: 'center',
        borderRight: isLast ? 'none' : '1px solid #1e2733',
      }}
    >
      {/* Dimension label */}
      <div
        style={{
          ...FONT,
          fontSize: '8px',
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: '#3a4a5a',
          marginBottom: '3px',
        }}
      >
        {label}
      </div>

      {/* Stars */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '4px' }}>
        <StarRating stars={stars} size={9} />
      </div>

      {/* Pick or PASS */}
      {isPass ? (
        <div
          style={{
            ...FONT,
            fontSize: '12px',
            fontWeight: 700,
            color: '#2d3748',
            letterSpacing: '0.05em',
          }}
        >
          PASS
        </div>
      ) : (
        <div
          style={{
            ...FONT,
            fontSize: '13px',
            fontWeight: 800,
            color: '#00e5a0',
          }}
        >
          {pick}
        </div>
      )}

      {/* Bottom: pct or lineRef */}
      <div
        style={{
          ...FONT,
          fontSize: '9px',
          color: '#2d3748',
          marginTop: '2px',
        }}
      >
        {isPass ? (lineRef ?? '') : pct !== null ? `${pct}%` : ''}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run to verify pass**

```bash
npx vitest run src/test/integration/PredictionColumn.test.tsx
```

Expected: all 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/predictions/PredictionColumn.tsx src/test/integration/PredictionColumn.test.tsx
git commit -m "feat: add PredictionColumn component with PASS/pick states"
```

---

## Task 9: GameCard Rewrite

**Files:**
- Modify: `src/components/predictions/GameCard.tsx`
- Modify: `src/test/integration/GameCard.test.tsx`
- Delete: `src/components/predictions/WinProbabilityBar.tsx`
- Delete: `src/components/predictions/OverUnderDisplay.tsx`
- Delete: `src/test/integration/WinProbabilityBar.test.tsx`
- Delete: `src/test/integration/OverUnderDisplay.test.tsx`

- [ ] **Step 1: Write the failing test**

Replace `src/test/integration/GameCard.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { GameWithPrediction } from '@/services/predictions/api'

vi.mock('@tanstack/react-router', () => ({
  useParams: () => ({ lang: 'en' }),
  useNavigate: () => vi.fn(),
  Link: ({ children, to, params, ...props }: Record<string, unknown>) => (
    <a
      href={`/${(params as Record<string, string>)?.lang}/${(params as Record<string, string>)?.sport}/${(params as Record<string, string>)?.slug}`}
      {...props}
    >
      {children as React.ReactNode}
    </a>
  ),
}))

vi.mock('@/lib/timezone', () => ({
  toLocalTimeString: () => '19:30',
  toLocalDateString: () => '2026-04-12',
}))

import { GameCard } from '@/components/predictions/GameCard'

function makeGame(overrides?: Partial<GameWithPrediction['predictions'][0]>): GameWithPrediction {
  return {
    id: '1',
    sport_id: 'nba',
    game_date: '2026-04-12',
    game_time: '2026-04-12T23:30:00Z',
    slug: 'lakers-vs-celtics-2026-04-12',
    status: 'scheduled',
    home_score: null,
    away_score: null,
    home_team: {
      id: 'lakers',
      name_en: 'Los Angeles Lakers',
      name_zh: '洛杉磯湖人',
      abbreviation: 'LAL',
      logo_url: null,
    },
    away_team: {
      id: 'celtics',
      name_en: 'Boston Celtics',
      name_zh: '波士頓塞爾提克',
      abbreviation: 'BOS',
      logo_url: null,
    },
    predictions: [{
      id: 'p1',
      moneyline_home_pct: 62.3,
      moneyline_away_pct: 37.7,
      moneyline_pick: 'home',
      moneyline_stars: 4,
      spread_line: -3.5,
      spread_pick: 'home',
      spread_pct: 57.8,
      spread_stars: 3,
      over_under_line: 218.5,
      over_pct: 54.2,
      under_pct: 45.8,
      over_under_stars: 1,
      explanation_en: 'Lakers favored',
      explanation_zh: '湖人被看好',
      ...overrides,
    }],
  }
}

describe('GameCard', () => {
  it('renders team abbreviations', () => {
    render(<GameCard game={makeGame()} />)
    expect(screen.getAllByText('LAL').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('BOS').length).toBeGreaterThanOrEqual(1)
  })

  it('shows moneyline pick when stars >= 2', () => {
    render(<GameCard game={makeGame()} />)
    // 62.3% confidence shown
    expect(screen.getByText('62.3%')).toBeInTheDocument()
  })

  it('shows PASS for over_under when stars === 1', () => {
    render(<GameCard game={makeGame()} />)
    expect(screen.getByText('PASS')).toBeInTheDocument()
    // lineRef still shown in grey
    expect(screen.getByText('218.5')).toBeInTheDocument()
  })

  it('shows spread pick with line', () => {
    render(<GameCard game={makeGame()} />)
    expect(screen.getByText('LAL -3.5')).toBeInTheDocument()
  })

  it('links to the detail page with correct path', () => {
    render(<GameCard game={makeGame()} />)
    const link = screen.getByText('Details →').closest('a')
    expect(link).toHaveAttribute('href', '/en/nba/lakers-vs-celtics-2026-04-12')
  })

  it('returns null when no predictions', () => {
    const game = makeGame()
    game.predictions = []
    const { container } = render(<GameCard game={{ ...game } as GameWithPrediction} />)
    expect(container.innerHTML).toBe('')
  })
})
```

- [ ] **Step 2: Run to verify fail**

```bash
npx vitest run src/test/integration/GameCard.test.tsx
```

Expected: FAIL — GameCard uses old field names.

- [ ] **Step 3: Rewrite GameCard**

Replace `src/components/predictions/GameCard.tsx`:

```tsx
import dayjs from 'dayjs'
import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import { toLocalTimeString } from '@/lib/timezone'
import type { GameWithPrediction } from '@/services/predictions/api'
import { PredictionColumn } from './PredictionColumn'

interface GameCardProps {
  game: GameWithPrediction
}

export function GameCard({ game }: GameCardProps) {
  const { t, lang } = useTranslation()
  const prediction = game.predictions[0]

  if (!prediction) return null

  const homeTeam = game.home_team
  const awayTeam = game.away_team
  const homeWins = prediction.moneyline_pick === 'home'

  const homeName = lang === 'zh' ? homeTeam.name_zh : homeTeam.name_en
  const awayName = lang === 'zh' ? awayTeam.name_zh : awayTeam.name_en

  const localTime = toLocalTimeString(game.game_time)
  const gameDate = game.game_time
    ? dayjs(game.game_time).format('MMM D')
    : game.game_date

  // Moneyline pick text
  const moneylinePick = homeWins ? homeTeam.abbreviation : awayTeam.abbreviation

  // Spread pick text: e.g. "LAL -3.5" (home favored) or "BOS +3.5" (away covering)
  let spreadPick = ''
  if (prediction.spread_line !== null && prediction.spread_pick !== null) {
    const isSpreaderHome = prediction.spread_pick === 'home'
    const abbr = isSpreaderHome ? homeTeam.abbreviation : awayTeam.abbreviation
    const line = prediction.spread_line
    spreadPick = `${abbr} ${line > 0 ? '+' : ''}${line}`
  }

  // O/U pick text: e.g. "O 218.5" or "U 218.5"
  let ouPick = ''
  let ouLineRef: string | null = null
  if (prediction.over_under_line !== null) {
    ouLineRef = String(prediction.over_under_line)
    const isOver = (prediction.over_pct ?? 0) >= (prediction.under_pct ?? 0)
    ouPick = `${isOver ? 'O' : 'U'} ${prediction.over_under_line}`
  }

  return (
    <div
      className={cn(
        'rounded-[10px] border overflow-hidden',
        'bg-[#161b22] border-[#1e2733]',
      )}
    >
      {/* Card header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#0d1117] border-b border-[#1e2733]">
        <span
          className="text-[10px] font-bold tracking-[0.18em] uppercase text-[#00e5a0]"
          style={{ fontFamily: 'var(--font-barlow-condensed)' }}
        >
          {game.sport_id.toUpperCase()}
        </span>
        {localTime && (
          <span
            className="text-[10px] text-[#3a4a5a]"
            style={{ fontFamily: 'var(--font-barlow-condensed)' }}
          >
            {localTime}
          </span>
        )}
        <span
          className="text-[10px] text-[#3a4a5a]"
          style={{ fontFamily: 'var(--font-barlow-condensed)' }}
        >
          {gameDate}
        </span>
      </div>

      {/* Teams */}
      <div className="px-4 pt-3.5 pb-2">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="min-w-0">
            <div
              className="text-[32px] font-black leading-none mb-1"
              style={{
                fontFamily: 'var(--font-barlow-condensed)',
                color: homeWins ? '#e2e8f0' : '#2d3748',
              }}
            >
              {homeTeam.abbreviation}
            </div>
            <div
              className="text-[10px] uppercase tracking-widest text-[#3a4a5a] truncate"
              style={{ fontFamily: 'var(--font-barlow-condensed)' }}
            >
              {homeName}
            </div>
          </div>

          <div
            className="text-[13px] font-bold text-[#2d3748] shrink-0"
            style={{ fontFamily: 'var(--font-barlow-condensed)' }}
          >
            {t.predictions.vs}
          </div>

          <div className="text-right min-w-0">
            <div
              className="text-[32px] font-black leading-none mb-1"
              style={{
                fontFamily: 'var(--font-barlow-condensed)',
                color: !homeWins ? '#e2e8f0' : '#2d3748',
              }}
            >
              {awayTeam.abbreviation}
            </div>
            <div
              className="text-[10px] uppercase tracking-widest text-[#3a4a5a] truncate"
              style={{ fontFamily: 'var(--font-barlow-condensed)' }}
            >
              {awayName}
            </div>
          </div>
        </div>
      </div>

      {/* Three prediction columns */}
      <div className="grid grid-cols-3 border-t border-[#1e2733]">
        <PredictionColumn
          label={t.predictions.moneyline}
          stars={prediction.moneyline_stars}
          pick={moneylinePick}
          pct={prediction.moneyline_home_pct > prediction.moneyline_away_pct
            ? prediction.moneyline_home_pct
            : prediction.moneyline_away_pct}
          lineRef={null}
        />
        <PredictionColumn
          label={t.predictions.spread}
          stars={prediction.spread_stars}
          pick={spreadPick}
          pct={prediction.spread_pct}
          lineRef={prediction.spread_line !== null ? String(prediction.spread_line) : null}
        />
        <PredictionColumn
          label={t.predictions.overUnder}
          stars={prediction.over_under_stars}
          pick={ouPick}
          pct={(prediction.over_pct ?? 0) >= (prediction.under_pct ?? 0)
            ? prediction.over_pct
            : prediction.under_pct}
          lineRef={ouLineRef}
          isLast
        />
      </div>

      {/* Card footer */}
      <Link
        to="/$lang/$sport/$slug"
        params={{ lang, sport: game.sport_id, slug: game.slug }}
        className="flex items-center justify-end px-4 py-2 border-t border-[#1e2733] text-[10px] font-bold tracking-wide text-[#3a4a5a] hover:text-[#00e5a0] transition-colors"
        style={{ fontFamily: 'var(--font-barlow-condensed)' }}
      >
        {t.gameDetail.viewDetail}
      </Link>
    </div>
  )
}
```

- [ ] **Step 4: Delete old components and tests**

```bash
rm src/components/predictions/WinProbabilityBar.tsx
rm src/components/predictions/OverUnderDisplay.tsx
rm src/test/integration/WinProbabilityBar.test.tsx
rm src/test/integration/OverUnderDisplay.test.tsx
```

- [ ] **Step 5: Run tests**

```bash
npx vitest run src/test/integration/GameCard.test.tsx
```

Expected: all 6 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/predictions/GameCard.tsx src/test/integration/GameCard.test.tsx
git rm src/components/predictions/WinProbabilityBar.tsx src/components/predictions/OverUnderDisplay.tsx
git rm src/test/integration/WinProbabilityBar.test.tsx src/test/integration/OverUnderDisplay.test.tsx
git commit -m "feat: rewrite GameCard with three-column prediction layout and per-dimension star ratings"
```

---

## Task 10: DateScrollBar Component

**Files:**
- Create: `src/hooks/predictions/useDatesWithGames.ts`
- Create: `src/components/predictions/DateScrollBar.tsx`

- [ ] **Step 1: Create the hook**

```ts
// src/hooks/predictions/useDatesWithGames.ts
import { useQuery } from '@tanstack/react-query'
import { fetchDatesWithGames } from '@/services/predictions/api'

export function useDatesWithGames(from: string, to: string) {
  return useQuery({
    queryKey: ['datesWithGames', from, to],
    queryFn: () => fetchDatesWithGames(from, to),
    staleTime: 5 * 60 * 1000,
  })
}
```

- [ ] **Step 2: Create DateScrollBar**

```tsx
// src/components/predictions/DateScrollBar.tsx
import { useRef, useEffect, useState } from 'react'
import dayjs from 'dayjs'
import { CalendarDots } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { localToday } from '@/lib/timezone'
import { usePredictionStore } from '@/stores/predictions/predictionStore'
import { useDatesWithGames } from '@/hooks/predictions/useDatesWithGames'

const FONT = { fontFamily: 'var(--font-barlow-condensed)' }

/** Build array of YYYY-MM-DD strings: 7 days ago → today → 6 days ahead */
function buildDateRange(referenceDate: string): string[] {
  const dates: string[] = []
  for (let i = -7; i <= 6; i++) {
    dates.push(dayjs(referenceDate).add(i, 'day').format('YYYY-MM-DD'))
  }
  return dates
}

/** Returns opacity 0.3–1.0 based on how far from today */
function getDateOpacity(date: string, todayStr: string): number {
  const diff = Math.abs(dayjs(date).diff(dayjs(todayStr), 'day'))
  if (diff === 0) return 1
  if (diff <= 2) return 0.85
  if (diff <= 4) return 0.55
  return 0.3
}

export function DateScrollBar() {
  const { dateRange, setDateRange } = usePredictionStore()
  const todayStr = localToday()
  const dates = buildDateRange(todayStr)
  const from = dates[0]
  const to = dates[dates.length - 1]

  const { data: datesWithGames = [] } = useDatesWithGames(from, to)
  const datesWithGamesSet = new Set(datesWithGames)

  const scrollRef = useRef<HTMLDivElement>(null)
  const todayRef = useRef<HTMLButtonElement>(null)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState(dayjs(todayStr))

  // Auto-scroll to today on mount
  useEffect(() => {
    if (todayRef.current && scrollRef.current) {
      const container = scrollRef.current
      const todayEl = todayRef.current
      const offset = todayEl.offsetLeft - container.offsetWidth / 2 + todayEl.offsetWidth / 2
      container.scrollLeft = offset
    }
  }, [])

  const displayMonth = dayjs(dateRange).format('MMMM YYYY').toUpperCase()

  // Calendar popup: build days grid for calendarMonth
  const firstDay = calendarMonth.startOf('month').day() // 0=Sun
  const daysInMonth = calendarMonth.daysInMonth()

  function handleCalendarSelect(dateStr: string) {
    setDateRange(dateStr)
    setCalendarOpen(false)
  }

  return (
    <div className="relative mb-1">
      <div className="flex items-center gap-2">
        {/* Calendar icon */}
        <button
          onClick={() => setCalendarOpen((v) => !v)}
          className="flex-shrink-0 w-[36px] h-[44px] rounded-[6px] flex items-center justify-center border border-[#1e2733] bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.07)] transition-colors"
          aria-label="Open calendar"
        >
          <CalendarDots size={16} color="#6b7280" />
        </button>

        {/* Scrollable date chips */}
        <div
          ref={scrollRef}
          className="flex gap-1 overflow-x-auto flex-1 no-scrollbar"
          style={{ scrollBehavior: 'smooth' }}
        >
          {dates.map((date) => {
            const isToday = date === todayStr
            const isSelected = date === dateRange
            const hasGames = datesWithGamesSet.has(date)
            const opacity = getDateOpacity(date, todayStr)
            const d = dayjs(date)

            return (
              <button
                key={date}
                ref={isToday ? todayRef : undefined}
                onClick={() => setDateRange(date)}
                className="flex-shrink-0 relative flex flex-col items-center justify-center rounded-[6px] min-w-[44px] h-[44px]"
                style={{
                  background: isToday
                    ? '#00e5a0'
                    : isSelected
                      ? 'rgba(255,255,255,0.1)'
                      : 'rgba(255,255,255,0.04)',
                  boxShadow: isToday ? '0 0 12px rgba(0,229,160,0.3)' : undefined,
                  opacity,
                }}
              >
                <span
                  style={{
                    ...FONT,
                    fontSize: '8px',
                    fontWeight: 700,
                    color: isToday ? '#0d1117' : '#a0aec0',
                    letterSpacing: '0.05em',
                    lineHeight: 1,
                  }}
                >
                  {isToday ? 'TODAY' : d.format('ddd').toUpperCase()}
                </span>
                <span
                  style={{
                    ...FONT,
                    fontSize: '15px',
                    fontWeight: isToday ? 900 : 700,
                    color: isToday ? '#0d1117' : '#a0aec0',
                    lineHeight: 1.2,
                  }}
                >
                  {d.date()}
                </span>
                {hasGames && !isToday && (
                  <span
                    style={{
                      position: 'absolute',
                      bottom: '2px',
                      width: '3px',
                      height: '3px',
                      borderRadius: '50%',
                      background: '#fbbf24',
                    }}
                  />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Month label */}
      <div
        style={{
          ...FONT,
          fontSize: '9px',
          fontWeight: 600,
          letterSpacing: '0.12em',
          color: '#2d3748',
          marginTop: '4px',
          paddingLeft: '44px',
        }}
      >
        {displayMonth}
      </div>

      {/* Calendar popup */}
      {calendarOpen && (
        <div
          className="absolute left-0 top-[56px] z-50 rounded-[10px] border border-[#1e2733] bg-[#0f1419] p-4 shadow-2xl"
          style={{ minWidth: '240px' }}
        >
          {/* Month nav */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setCalendarMonth((m) => m.subtract(1, 'month'))}
              className="w-6 h-6 rounded flex items-center justify-center text-[#4a5568] hover:text-[#a0aec0]"
              style={FONT}
            >
              ‹
            </button>
            <span style={{ ...FONT, fontSize: '12px', fontWeight: 700, color: '#a0aec0', letterSpacing: '0.08em' }}>
              {calendarMonth.format('MMMM YYYY').toUpperCase()}
            </span>
            <button
              onClick={() => setCalendarMonth((m) => m.add(1, 'month'))}
              className="w-6 h-6 rounded flex items-center justify-center text-[#4a5568] hover:text-[#a0aec0]"
              style={FONT}
            >
              ›
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {['S','M','T','W','T','F','S'].map((d, i) => (
              <div key={i} style={{ ...FONT, fontSize: '9px', color: '#3a4a5a', textAlign: 'center', padding: '2px 0' }}>
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-y-1">
            {/* Empty cells before first day */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1
              const dateStr = calendarMonth.date(dayNum).format('YYYY-MM-DD')
              const isSelected = dateStr === dateRange
              const isToday = dateStr === todayStr
              return (
                <button
                  key={dayNum}
                  onClick={() => handleCalendarSelect(dateStr)}
                  style={{
                    ...FONT,
                    fontSize: '11px',
                    fontWeight: isToday || isSelected ? 700 : 400,
                    color: isSelected ? '#0d1117' : isToday ? '#00e5a0' : '#6b7280',
                    background: isSelected ? '#00e5a0' : 'transparent',
                    borderRadius: '4px',
                    padding: '4px 0',
                    textAlign: 'center',
                  }}
                >
                  {dayNum}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Add `no-scrollbar` utility to styles if not present**

In `src/styles.css`, add if missing:

```css
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
```

Check `src/styles.css` first — if already present, skip.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/predictions/useDatesWithGames.ts src/components/predictions/DateScrollBar.tsx src/styles.css
git commit -m "feat: add DateScrollBar with horizontal date chips, dot indicators, and calendar popup"
```

---

## Task 11: Sidebar + MobileFilterBar Updates

**Files:**
- Modify: `src/components/layout/AppSidebar.tsx`
- Modify: `src/components/layout/MobileFilterBar.tsx`

- [ ] **Step 1: Rewrite AppSidebar**

Replace the entire `AppSidebar.tsx`:

```tsx
// src/components/layout/AppSidebar.tsx
import { cn } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import {
  usePredictionStore,
  type PredictionFilters,
} from '@/stores/predictions/predictionStore'
import { useSportCounts } from '@/hooks/predictions/useDailyPredictions'

const SECTION_TITLE =
  'text-[9px] font-bold tracking-[0.2em] uppercase text-[#3a4a5a] mb-2 px-2'

const SIDEBAR_ITEM =
  'flex items-center gap-2 w-full px-2 py-1.5 rounded text-[13px] font-semibold tracking-wide transition-colors cursor-pointer text-[#4a5568] hover:text-[#a0aec0]'

const SIDEBAR_ITEM_ACTIVE = 'bg-[rgba(0,229,160,0.1)] text-[#00e5a0]'

type Sport = PredictionFilters['sport']
type Direction = PredictionFilters['direction']

function CountBadge({ count }: { count: number }) {
  return (
    <span className="ml-auto text-[10px] bg-[#1e2733] text-[#2d3748] rounded px-1.5 py-0.5 font-bold">
      {count}
    </span>
  )
}

function SectionDivider() {
  return <div className="border-t border-[#1a2030] my-1" />
}

export function AppSidebar() {
  const { t } = useTranslation()
  const { sport, minStars, direction, setSport, setMinStars, setDirection } =
    usePredictionStore()
  const { data: counts = {} } = useSportCounts()
  const totalCount = Object.values(counts).reduce((a, b) => a + b, 0)

  const sports: { id: Sport; label: string; emoji: string }[] = [
    { id: 'all', label: t.filter.allSports, emoji: '🏆' },
    { id: 'nba', label: 'NBA', emoji: '🏀' },
    { id: 'mlb', label: 'MLB', emoji: '⚾' },
  ]

  const dirOptions: { id: Direction; label: string }[] = [
    { id: 'all', label: t.filter.all },
    { id: 'home', label: t.filter.home },
    { id: 'away', label: t.filter.away },
  ]

  return (
    <aside
      className="hidden md:flex flex-col w-[200px] fixed left-0 top-[52px] bottom-0 overflow-y-auto border-r border-[#1e2733]"
      style={{ background: '#0f1419' }}
    >
      {/* Sport */}
      <div className="px-2 pt-4 pb-2">
        <div className={SECTION_TITLE} style={{ fontFamily: 'var(--font-barlow-condensed)' }}>
          {t.filter.sport}
        </div>
        {sports.map((s) => (
          <button
            key={s.id}
            onClick={() => setSport(s.id)}
            className={cn(SIDEBAR_ITEM, sport === s.id && SIDEBAR_ITEM_ACTIVE)}
            style={{ fontFamily: 'var(--font-barlow-condensed)' }}
          >
            <span>{s.emoji}</span>
            {s.label}
            {s.id !== 'all' && counts[s.id] !== undefined && (
              <CountBadge count={counts[s.id]} />
            )}
            {s.id === 'all' && totalCount > 0 && (
              <CountBadge count={totalCount} />
            )}
          </button>
        ))}
      </div>

      <SectionDivider />

      {/* Min Stars filter */}
      <div className="px-2 py-3">
        <div className={SECTION_TITLE} style={{ fontFamily: 'var(--font-barlow-condensed)' }}>
          {t.filter.minStars}
        </div>
        <div className="flex flex-wrap gap-1.5 px-2">
          {[1, 2, 3, 4, 5].map((n) => {
            const isActive = minStars === n
            return (
              <button
                key={n}
                onClick={() => setMinStars(n)}
                className="px-2 py-1 rounded text-[11px] font-bold tracking-wide transition-all"
                style={{
                  fontFamily: 'var(--font-barlow-condensed)',
                  color: isActive ? '#fbbf24' : '#4a5568',
                  background: isActive ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${isActive ? '#fbbf24' : 'transparent'}`,
                }}
              >
                {n === 1 ? 'All' : `${n}+ ★`}
              </button>
            )
          })}
        </div>
      </div>

      <SectionDivider />

      {/* Direction */}
      <div className="px-2 py-3">
        <div className={SECTION_TITLE} style={{ fontFamily: 'var(--font-barlow-condensed)' }}>
          {t.filter.direction}
        </div>
        {dirOptions.map((d) => (
          <button
            key={d.id}
            onClick={() => setDirection(d.id)}
            className={cn(SIDEBAR_ITEM, direction === d.id && SIDEBAR_ITEM_ACTIVE)}
            style={{ fontFamily: 'var(--font-barlow-condensed)' }}
          >
            {d.label}
          </button>
        ))}
      </div>
    </aside>
  )
}
```

- [ ] **Step 2: Rewrite MobileFilterBar**

Replace `src/components/layout/MobileFilterBar.tsx`:

```tsx
// src/components/layout/MobileFilterBar.tsx
import { SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import {
  usePredictionStore,
  type PredictionFilters,
} from '@/stores/predictions/predictionStore'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

type Sport = PredictionFilters['sport']
type Direction = PredictionFilters['direction']

export function MobileFilterBar() {
  const { t } = useTranslation()
  const {
    sport,
    minStars,
    direction,
    setSport,
    setMinStars,
    setDirection,
  } = usePredictionStore()

  const sports: { id: Sport; label: string }[] = [
    { id: 'all', label: t.filter.allSports },
    { id: 'nba', label: 'NBA' },
    { id: 'mlb', label: 'MLB' },
  ]

  const dirOptions: { id: Direction; label: string }[] = [
    { id: 'all', label: t.filter.all },
    { id: 'home', label: t.filter.home },
    { id: 'away', label: t.filter.away },
  ]

  const PILL =
    'px-3 py-1.5 rounded-full text-[12px] font-bold tracking-wide transition-colors border shrink-0'

  const activeFiltersCount =
    (sport !== 'all' ? 1 : 0) +
    (minStars > 1 ? 1 : 0) +
    (direction !== 'all' ? 1 : 0)

  return (
    <div className="md:hidden border-b border-[#1e2733] bg-[#0d1117] px-3 py-2 space-y-2">
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {sports.map((s) => (
          <button
            key={s.id}
            onClick={() => setSport(s.id)}
            className={cn(
              PILL,
              sport === s.id
                ? 'bg-[rgba(0,229,160,0.12)] text-[#00e5a0] border-[rgba(0,229,160,0.3)]'
                : 'text-[#4a5568] border-[#1e2733] hover:text-[#a0aec0]',
            )}
            style={{ fontFamily: 'var(--font-barlow-condensed)' }}
          >
            {s.label}
          </button>
        ))}

        {/* Advanced filters trigger */}
        <Sheet>
          <SheetTrigger asChild>
            <button
              className={cn(
                PILL,
                'flex items-center gap-1.5',
                activeFiltersCount > 0
                  ? 'bg-[rgba(0,229,160,0.12)] text-[#00e5a0] border-[rgba(0,229,160,0.3)]'
                  : 'text-[#4a5568] border-[#1e2733] hover:text-[#a0aec0]',
              )}
              style={{ fontFamily: 'var(--font-barlow-condensed)' }}
            >
              <SlidersHorizontal size={12} />
              {t.filter.filterButton}
              {activeFiltersCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-[#00e5a0] text-black text-[9px] font-black flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </SheetTrigger>
          <SheetContent
            side="bottom"
            className="bg-[#0f1419] border-[#1e2733] rounded-t-xl max-h-[70vh]"
          >
            <SheetHeader className="pb-4">
              <SheetTitle
                className="text-left text-[#a0aec0]"
                style={{ fontFamily: 'var(--font-barlow-condensed)', letterSpacing: '0.1em' }}
              >
                {t.filter.filterButton}
              </SheetTitle>
            </SheetHeader>

            {/* Min Stars */}
            <div className="mb-6">
              <div
                className="text-[9px] font-bold tracking-[0.2em] uppercase text-[#3a4a5a] mb-3"
                style={{ fontFamily: 'var(--font-barlow-condensed)' }}
              >
                {t.filter.minStars}
              </div>
              <div className="flex gap-2 flex-wrap">
                {[1, 2, 3, 4, 5].map((n) => {
                  const isActive = minStars === n
                  return (
                    <button
                      key={n}
                      onClick={() => setMinStars(n)}
                      className="px-4 py-2 rounded-full text-[12px] font-bold tracking-wide transition-all"
                      style={{
                        fontFamily: 'var(--font-barlow-condensed)',
                        color: isActive ? '#fbbf24' : '#4a5568',
                        background: isActive ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${isActive ? '#fbbf24' : 'rgba(255,255,255,0.08)'}`,
                      }}
                    >
                      {n === 1 ? 'All' : `${n}+ ★`}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Direction */}
            <div>
              <div
                className="text-[9px] font-bold tracking-[0.2em] uppercase text-[#3a4a5a] mb-3"
                style={{ fontFamily: 'var(--font-barlow-condensed)' }}
              >
                {t.filter.direction}
              </div>
              <div className="flex gap-2 flex-wrap">
                {dirOptions.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setDirection(d.id)}
                    className={cn(
                      'px-4 py-2 rounded-full text-[12px] font-bold tracking-wide transition-colors border',
                      direction === d.id
                        ? 'bg-[rgba(0,229,160,0.12)] text-[#00e5a0] border-[rgba(0,229,160,0.3)]'
                        : 'text-[#4a5568] border-[rgba(255,255,255,0.08)] hover:text-[#a0aec0]',
                    )}
                    style={{ fontFamily: 'var(--font-barlow-condensed)' }}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Run full test suite**

```bash
npx vitest run
```

Expected: all tests PASS (the sidebar/mobile bar have no dedicated unit tests).

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/AppSidebar.tsx src/components/layout/MobileFilterBar.tsx
git commit -m "feat: update sidebar and mobile filter bar - replace confidence with minStars, remove date section"
```

---

## Task 12: Wire DateScrollBar into Predictions Page

**Files:**
- Modify: `src/routes/$lang/predictions/route.tsx`

- [ ] **Step 1: Update the predictions route**

Replace `src/routes/$lang/predictions/route.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { DateScrollBar } from '@/components/predictions/DateScrollBar'
import { GameGrid } from '@/components/predictions/GameGrid'
import { useDailyPredictions } from '@/hooks/predictions/useDailyPredictions'

export const Route = createFileRoute('/$lang/predictions')({
  component: PredictionsPage,
})

function PredictionsPage() {
  const query = useDailyPredictions()
  return (
    <div className="space-y-4">
      <DateScrollBar />
      <GameGrid {...query} />
    </div>
  )
}
```

- [ ] **Step 2: Update GameGrid's `hasActiveFilters` check**

Open `src/components/predictions/GameGrid.tsx`. The `hasActiveFilters` check currently looks for `dateRange !== 'today'` and `confidence.length > 0`. Update it:

In GameGrid.tsx, change lines 44–51:
```tsx
const { resetFilters, sport, minStars, direction, dateRange } =
  usePredictionStore()

const hasActiveFilters =
  sport !== 'all' ||
  minStars > 1 ||
  direction !== 'all'
```

Note: `dateRange` is removed from `hasActiveFilters` since users can freely navigate dates without it being an "active filter".

- [ ] **Step 3: Commit**

```bash
git add src/routes/$lang/predictions/route.tsx src/components/predictions/GameGrid.tsx
git commit -m "feat: add DateScrollBar to predictions page, update hasActiveFilters logic"
```

---

## Task 13: Detail Page Timezone Fix + PredictionBreakdown Rewrite

**Files:**
- Modify: `src/components/game-detail/GameDetailHeader.tsx`
- Modify: `src/components/game-detail/PredictionBreakdown.tsx`

- [ ] **Step 1: Fix timezone in GameDetailHeader**

Replace the `gameTime` line (line 20) in `GameDetailHeader.tsx`:

```tsx
// Remove:
const gameTime = game.game_time ? dayjs(game.game_time).format('MMM D, YYYY · HH:mm') + ' ET' : null

// Replace with:
import { toLocalDisplayDateTime } from '@/lib/timezone'
// ...inside component:
const gameTime = toLocalDisplayDateTime(game.game_time)
```

Also update `homeWins` (line 18) to use new field name:

```tsx
// Remove:
const homeWins = prediction?.predicted_winner === 'home'
// Replace:
const homeWins = prediction?.moneyline_pick === 'home'
```

Remove the `import dayjs` line if it's no longer used after this change.

- [ ] **Step 2: Rewrite PredictionBreakdown**

Replace `src/components/game-detail/PredictionBreakdown.tsx`:

```tsx
// src/components/game-detail/PredictionBreakdown.tsx
import { useTranslation } from '@/lib/i18n'
import { PredictionColumn } from '@/components/predictions/PredictionColumn'
import type { GameWithPrediction } from '@/services/predictions/api'

interface PredictionBreakdownProps {
  game: GameWithPrediction
}

const FONT = { fontFamily: 'var(--font-barlow-condensed)' }

export function PredictionBreakdown({ game }: PredictionBreakdownProps) {
  const { t, lang } = useTranslation()
  const prediction = game.predictions[0]

  if (!prediction) return null

  const homeTeam = game.home_team
  const awayTeam = game.away_team

  // Moneyline pick text
  const moneylinePick =
    prediction.moneyline_pick === 'home'
      ? homeTeam.abbreviation
      : awayTeam.abbreviation

  // Spread pick text
  let spreadPick = ''
  if (prediction.spread_line !== null && prediction.spread_pick !== null) {
    const abbr =
      prediction.spread_pick === 'home' ? homeTeam.abbreviation : awayTeam.abbreviation
    const line = prediction.spread_line
    spreadPick = `${abbr} ${line > 0 ? '+' : ''}${line}`
  }

  // O/U pick text
  let ouPick = ''
  let ouLineRef: string | null = null
  if (prediction.over_under_line !== null) {
    ouLineRef = String(prediction.over_under_line)
    const isOver = (prediction.over_pct ?? 0) >= (prediction.under_pct ?? 0)
    ouPick = `${isOver ? 'O' : 'U'} ${prediction.over_under_line}`
  }

  const explanation = lang === 'zh' ? prediction.explanation_zh : prediction.explanation_en

  return (
    <div className="space-y-4">
      {/* AI Explanation */}
      {explanation ? (
        <div className="rounded-[10px] border border-[#1e2733] bg-[#161b22] px-5 py-4">
          <div className="mb-3">
            <span
              className="text-[9px] font-bold tracking-[0.2em] uppercase text-[#3a4a5a]"
              style={FONT}
            >
              {t.gameDetail.explanation}
            </span>
          </div>
          <p className="text-[13px] text-[#a0aec0] leading-relaxed" style={FONT}>
            {explanation}
          </p>
        </div>
      ) : null}

      {/* Three prediction dimensions — expanded view */}
      <div className="rounded-[10px] border border-[#1e2733] bg-[#161b22] overflow-hidden">
        <div className="px-5 py-3 border-b border-[#1e2733]">
          <span
            className="text-[9px] font-bold tracking-[0.2em] uppercase text-[#3a4a5a]"
            style={FONT}
          >
            {t.gameDetail.aiPick}
          </span>
        </div>
        <div className="grid grid-cols-3">
          <PredictionColumn
            label={t.predictions.moneyline}
            stars={prediction.moneyline_stars}
            pick={moneylinePick}
            pct={
              prediction.moneyline_home_pct > prediction.moneyline_away_pct
                ? prediction.moneyline_home_pct
                : prediction.moneyline_away_pct
            }
            lineRef={null}
          />
          <PredictionColumn
            label={t.predictions.spread}
            stars={prediction.spread_stars}
            pick={spreadPick}
            pct={prediction.spread_pct}
            lineRef={
              prediction.spread_line !== null ? String(prediction.spread_line) : null
            }
          />
          <PredictionColumn
            label={t.predictions.overUnder}
            stars={prediction.over_under_stars}
            pick={ouPick}
            pct={
              (prediction.over_pct ?? 0) >= (prediction.under_pct ?? 0)
                ? prediction.over_pct
                : prediction.under_pct
            }
            lineRef={ouLineRef}
            isLast
          />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Run full test suite**

```bash
npx vitest run
```

Expected: all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/game-detail/GameDetailHeader.tsx src/components/game-detail/PredictionBreakdown.tsx
git commit -m "feat: fix timezone display in game detail header, rewrite PredictionBreakdown with three-dimension layout"
```

---

## Task 14: Game Schedule Ingest Cron

**Files:**
- Create: `api/cron/ingest-schedule.ts`
- Modify: `vercel.json`

- [ ] **Step 1: Create ingest-schedule handler**

```ts
// api/cron/ingest-schedule.ts
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
```

- [ ] **Step 2: Add cron entry to vercel.json**

In `vercel.json`, add to the `crons` array:

```json
{ "path": "/api/cron/ingest-schedule", "schedule": "0 9 * * *" }
```

The full `crons` array becomes:

```json
"crons": [
  { "path": "/api/cron/ingest-schedule", "schedule": "0 9 * * *" },
  { "path": "/api/cron/resolve-results", "schedule": "0 12 * * *" }
]
```

- [ ] **Step 3: Commit**

```bash
git add api/cron/ingest-schedule.ts vercel.json
git commit -m "feat: add daily game schedule ingest cron from ESPN API"
```

---

## Task 15: Update Result Resolution for Spread

**Files:**
- Modify: `api/cron/resolve-results.ts`

- [ ] **Step 1: Update the prediction fetch in resolve-results.ts**

Find the inner predictions fetch (around line 135):

```ts
const preds = dbGame.predictions as Array<{ id: string; over_under_line: number | null }>
```

Update this type annotation and the upsert that follows to include spread:

```ts
const preds = dbGame.predictions as Array<{
  id: string
  over_under_line: number | null
  spread_line: number | null
  spread_pick: 'home' | 'away' | null
}>
```

- [ ] **Step 2: Update the prediction resolution query**

Find the outer select for games (around line 60–66) — update the predictions sub-select to include spread fields:

```ts
predictions(id, over_under_line, spread_line, spread_pick)
```

- [ ] **Step 3: Add spread_correct calculation**

After the `ouCorrect` block (around line 162), add:

```ts
// Spread resolution
let spreadCorrect: boolean | null = null
if (pred.spread_line !== null && pred.spread_pick !== null) {
  const { data: predDetail } = await supabase
    .from('predictions')
    .select('spread_pick')
    .eq('id', pred.id)
    .single()
  if (predDetail) {
    const actualWinner: 'home' | 'away' = homeScore > awayScore ? 'home' : 'away'
    const homeCoversSpread = homeScore - awayScore > Math.abs(pred.spread_line)
    const awayCoversSpread = awayScore - homeScore > Math.abs(pred.spread_line)
    const actualCover: 'home' | 'away' | null =
      pred.spread_line < 0
        ? homeCoversSpread ? 'home' : 'away'
        : awayCoversSpread ? 'away' : 'home'
    spreadCorrect = (predDetail.spread_pick as string) === actualCover
  }
}
```

- [ ] **Step 4: Include spread_correct in upsert**

Find the upsert call for `prediction_results` and add `spread_correct`:

```ts
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
```

- [ ] **Step 5: Update the moneyline field name**

In the same file, find where `predicted_winner` is fetched/used and update to `moneyline_pick`:

```ts
// Old:
const { data: predRow } = await supabase
  .from('predictions')
  .select('predicted_winner')
  .eq('id', pred.id)
  .single()

const winnerCorrect = predRow ? predRow.predicted_winner === actualWinner : null

// New:
const { data: predRow } = await supabase
  .from('predictions')
  .select('moneyline_pick')
  .eq('id', pred.id)
  .single()

const winnerCorrect = predRow ? predRow.moneyline_pick === actualWinner : null
```

- [ ] **Step 6: Commit**

```bash
git add api/cron/resolve-results.ts
git commit -m "feat: add spread_correct resolution to result resolver, update to moneyline_pick field"
```

---

## Task 16: Update Ingest Handler for New Schema

**Files:**
- Modify: `api/cron/ingest-predictions.ts`
- Modify: `src/lib/predictions/ingest-helpers.ts`

- [ ] **Step 1: Remove `deriveConfidence` from ingest-helpers.ts**

Delete the `deriveConfidence` function (lines 1–8) — it's replaced by per-dimension stars supplied in the input. Keep only `generateSlug` and `validateInput`.

- [ ] **Step 2: Update `validateInput` in ingest-helpers.ts**

Update the required fields list and validation to match `SkillPrediction`'s new shape:

```ts
export function validateInput(body: unknown): ClaudeSkillInput {
  if (!body || typeof body !== 'object') throw new Error('Request body must be a JSON object')
  const b = body as Record<string, unknown>
  if (typeof b.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(b.date))
    throw new Error('date must be YYYY-MM-DD')
  if (b.sport !== 'nba' && b.sport !== 'mlb')
    throw new Error('sport must be "nba" or "mlb"')
  if (!Array.isArray(b.predictions) || b.predictions.length === 0)
    throw new Error('predictions must be a non-empty array')

  for (const [i, p] of b.predictions.entries()) {
    if (!p || typeof p !== 'object') throw new Error(`predictions[${i}] must be an object`)
    const pred = p as Record<string, unknown>
    const required = [
      'home_team', 'away_team', 'game_time',
      'moneyline_home_pct', 'moneyline_away_pct', 'moneyline_stars',
      'spread_stars', 'over_under_stars',
      'explanation_en', 'explanation_zh',
    ]
    for (const field of required) {
      if (pred[field] === undefined) throw new Error(`predictions[${i}].${field} is required`)
    }
    if (typeof pred.moneyline_home_pct !== 'number' || typeof pred.moneyline_away_pct !== 'number')
      throw new Error(`predictions[${i}] moneyline percentages must be numbers`)
    const sum = (pred.moneyline_home_pct as number) + (pred.moneyline_away_pct as number)
    if (Math.abs(sum - 100) > 0.01)
      throw new Error(`predictions[${i}] moneyline_home_pct + moneyline_away_pct must equal 100`)
    for (const starField of ['moneyline_stars', 'spread_stars', 'over_under_stars']) {
      const val = pred[starField] as number
      if (!Number.isInteger(val) || val < 1 || val > 5)
        throw new Error(`predictions[${i}].${starField} must be integer 1–5`)
    }
  }

  return b as unknown as ClaudeSkillInput
}
```

- [ ] **Step 3: Update `ingestOne` in ingest-predictions.ts**

Replace the prediction upsert block (lines 107–132) with:

```ts
const moneylinePick: 'home' | 'away' =
  pred.moneyline_home_pct >= pred.moneyline_away_pct ? 'home' : 'away'

const { error: predErr } = await supabase.from('predictions').upsert(
  {
    game_id: game.id,
    model_version: 'v1',
    moneyline_home_pct: pred.moneyline_home_pct,
    moneyline_away_pct: pred.moneyline_away_pct,
    moneyline_pick: moneylinePick,
    moneyline_stars: pred.moneyline_stars,
    spread_line: pred.spread_line ?? null,
    spread_pick: pred.spread_pick ?? null,
    spread_pct: pred.spread_pct ?? null,
    spread_stars: pred.spread_stars,
    over_under_line: pred.over_under_line ?? null,
    over_pct: pred.over_pct ?? null,
    under_pct: pred.under_pct ?? null,
    over_under_stars: pred.over_under_stars,
    explanation_en: pred.explanation_en,
    explanation_zh: pred.explanation_zh,
  },
  { onConflict: 'game_id,model_version', ignoreDuplicates: false },
)
```

Also remove the `import { deriveConfidence, ... }` from the import line and the `const confidence = deriveConfidence(...)` line.

- [ ] **Step 4: Update unit test for validateInput**

In `src/test/unit/validateInput.test.ts`, update the valid prediction object to use new field names:

```ts
// In the valid prediction fixture, replace:
//   home_win_pct: 60, away_win_pct: 40
// with:
//   moneyline_home_pct: 60, moneyline_away_pct: 40,
//   moneyline_stars: 4, spread_stars: 3, over_under_stars: 2
```

Run the test to confirm it passes.

- [ ] **Step 5: Run full test suite**

```bash
npx vitest run
```

Expected: all tests PASS.

- [ ] **Step 6: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add api/cron/ingest-predictions.ts src/lib/predictions/ingest-helpers.ts src/test/unit/validateInput.test.ts
git commit -m "feat: update prediction ingest handler for new schema - per-dimension stars and spread fields"
```

---

## Self-Review

**Spec coverage check:**

| Spec section | Covered by |
|---|---|
| §1 Timezone auto-detect + display | Task 4 (utility), Task 9 (GameCard), Task 13 (GameDetailHeader) |
| §2 Date navigation - horizontal scroll | Task 10 (DateScrollBar), Task 12 (route wiring) |
| §2 Calendar popup | Task 10 (DateScrollBar — inline calendar) |
| §2 Remove Today/Tomorrow/Week presets | Task 6 (store), Task 11 (sidebar + mobile bar) |
| §2 Date dot indicator | Task 10 (DateScrollBar uses useDatesWithGames) |
| §3 Three-column prediction layout | Task 8 (PredictionColumn), Task 9 (GameCard rewrite) |
| §3 Per-dimension stars 1–5 | Task 7 (StarRating), Task 8 (PredictionColumn) |
| §3 PASS for 1-star | Task 8 (PredictionColumn PASS logic) |
| §4 Detail page AI narrative | Task 13 (PredictionBreakdown - explanation shown first) |
| §4 Three-dimension expanded view | Task 13 (PredictionBreakdown rewrite) |
| §5 DB schema - rename columns | Task 1 (migration) |
| §5 DB schema - spread fields | Task 1 (migration) |
| §5 DB schema - per-dimension stars | Task 1 (migration) |
| §5 prediction_results.spread_correct | Task 1 (migration), Task 15 (resolver) |
| §6 Auto schedule ingest cron | Task 14 (ingest-schedule.ts) |
| §6 Semi-auto: predictions stay manual | Task 16 (ingest handler updated, not automated) |
| §6 Result resolution extended | Task 15 |
| §7 Sidebar confidence → minStars filter | Task 11 (AppSidebar) |
| §7 Direction filter retained | Task 11 (both sidebar and mobile) |

All sections covered. No gaps found.

**Placeholder scan:** No TBD, TODO, or vague steps found.

**Type consistency check:**
- `moneyline_pick` used consistently across Task 2 (types), Task 5 (API), Task 9 (GameCard), Task 13 (detail page), Task 15 (resolver), Task 16 (ingest).
- `moneyline_home_pct` / `moneyline_away_pct` used consistently.
- `minStars` used in Task 6 (store), Task 5 (API filter), Task 11 (sidebar/mobile), Task 12 (GameGrid).
- `spread_pick` type is `'home' | 'away' | null` consistently.
- `PredictionColumn` props (`label`, `stars`, `pick`, `pct`, `lineRef`, `isLast`) match between Task 8 definition and Task 9/13 usage.
