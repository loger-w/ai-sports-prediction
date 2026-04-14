# Sidebar Sport → League Hierarchy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the `direction` filter and restructure the sidebar Sport selector into a two-level Sport → League hierarchy with a contextual sub-section label.

**Architecture:** The `predictionStore` keeps its flat `sport: 'all' | 'nba' | 'mlb'` field — the Sport category layer is pure UI derivation. `AppSidebar` gains a new "League" block below the existing Sport and Min Stars blocks, replacing the old Direction block. The block's label and contents switch based on the current `sport` value (contextual: `LEAGUES` / `BASKETBALL LEAGUES` / `BASEBALL LEAGUES`). The mobile filter bar keeps one row of pills but relabels them to Sport categories (`All` / `Basketball` / `Baseball`).

**Tech Stack:** React 18, Zustand, TanStack Query, TanStack Router, Tailwind v4, Vitest + React Testing Library, TypeScript.

**Related Spec:** `docs/superpowers/specs/2026-04-12-sidebar-sport-league-hierarchy-design.md`

---

## File Structure Overview

**Modified files:**
- `src/stores/predictions/predictionStore.ts` — remove `direction` field, action, default
- `src/services/predictions/api.ts` — remove `direction` from `fetchDailyPredictions` signature and filter branch
- `src/hooks/predictions/useDailyPredictions.ts` — remove `direction` from destructure and query key
- `src/lib/i18n/en.ts` — drop direction keys, add sport-category / league keys, update `Translations` type
- `src/lib/i18n/zh.ts` — same key swap, Traditional Chinese values
- `src/components/predictions/GameGrid.tsx` — remove `direction` from `hasActiveFilters`
- `src/components/layout/AppSidebar.tsx` — relabel Sport section and replace Direction block with contextual League block
- `src/components/layout/MobileFilterBar.tsx` — relabel sport pills and remove Direction block from filter sheet
- `src/test/integration/predictionStore.test.ts` — drop direction assertions

**New files:**
- `src/test/integration/AppSidebar.test.tsx` — component test covering the three League-block states (All / Basketball / Baseball)

---

## Task 1: Remove `direction` from data layer

**Why first:** The store + service + hook + store test are type-linked. Changing them together keeps intermediate commits compiling. UI components still temporarily reference `direction` via the store after this task; Task 2 cleans those up.

**Files:**
- Modify: `src/stores/predictions/predictionStore.ts`
- Modify: `src/services/predictions/api.ts`
- Modify: `src/hooks/predictions/useDailyPredictions.ts`
- Modify: `src/test/integration/predictionStore.test.ts`

### Steps

- [ ] **Step 1: Update `predictionStore.test.ts` — drop direction cases first**

Replace the full contents of `src/test/integration/predictionStore.test.ts` with:

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

  it('resetFilters resets to initial state', () => {
    usePredictionStore.getState().setSport('nba')
    usePredictionStore.getState().setDateRange('2026-04-20')
    usePredictionStore.getState().setMinStars(4)
    usePredictionStore.getState().resetFilters()

    const state = usePredictionStore.getState()
    expect(state.sport).toBe('all')
    expect(state.dateRange).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(state.minStars).toBe(1)
  })
})
```

- [ ] **Step 2: Update `predictionStore.ts` to drop `direction`**

Replace the full contents of `src/stores/predictions/predictionStore.ts` with:

```ts
import { create } from 'zustand'
import { localToday } from '@/lib/timezone'

export interface PredictionFilters {
  sport: 'all' | 'nba' | 'mlb'
  dateRange: string            // always YYYY-MM-DD
  minStars: number             // 1–5, where 1 = no filter (show all)
}

interface PredictionStore extends PredictionFilters {
  setSport: (sport: PredictionFilters['sport']) => void
  setDateRange: (range: string) => void
  setMinStars: (stars: number) => void
  resetFilters: () => void
}

function getDefaultFilters(): PredictionFilters {
  return {
    sport: 'all',
    dateRange: localToday(),
    minStars: 1,
  }
}

export const usePredictionStore = create<PredictionStore>((set) => ({
  ...getDefaultFilters(),
  setSport: (sport) => set({ sport }),
  setDateRange: (dateRange) => set({ dateRange }),
  setMinStars: (minStars) => set({ minStars }),
  resetFilters: () => set(getDefaultFilters()),
}))
```

- [ ] **Step 3: Update `api.ts` — remove `direction` from `fetchDailyPredictions`**

Open `src/services/predictions/api.ts`.

Change the signature at line 50–52 from:

```ts
export async function fetchDailyPredictions(
  filters: { sport: PredictionFilters['sport']; dateRange: string; minStars: number; direction: PredictionFilters['direction'] },
): Promise<GameWithPrediction[]> {
```

to:

```ts
export async function fetchDailyPredictions(
  filters: { sport: PredictionFilters['sport']; dateRange: string; minStars: number },
): Promise<GameWithPrediction[]> {
```

Delete the direction filter block at lines 98–103:

```ts
  // Direction filter
  if (filters.direction !== 'all') {
    results = results.filter((g) =>
      g.predictions.some((p) => p.moneyline_pick === filters.direction),
    )
  }
```

- [ ] **Step 4: Update `useDailyPredictions.ts` — remove `direction`**

Replace the `useDailyPredictions` hook in `src/hooks/predictions/useDailyPredictions.ts` (lines 8–16) with:

```ts
export function useDailyPredictions() {
  const { sport, dateRange, minStars } = usePredictionStore()

  return useQuery({
    queryKey: ['predictions', sport, dateRange, minStars],
    queryFn: () =>
      fetchDailyPredictions({ sport, dateRange, minStars }),
  })
}
```

- [ ] **Step 5: Run type check and targeted tests**

Run: `npx tsc --noEmit`

Expected: failures only in files that still reference `direction` from the store — specifically `src/components/predictions/GameGrid.tsx`, `src/components/layout/AppSidebar.tsx`, and `src/components/layout/MobileFilterBar.tsx`. The store/service/hook/store-test files themselves should compile cleanly.

Run: `npx vitest run src/test/integration/predictionStore.test.ts`

Expected: PASS (5 tests).

If the store test fails or the non-UI files still complain, fix before moving on.

- [ ] **Step 6: Commit (do not push)**

```bash
git add src/stores/predictions/predictionStore.ts src/services/predictions/api.ts src/hooks/predictions/useDailyPredictions.ts src/test/integration/predictionStore.test.ts
git commit -m "refactor(predictions): drop direction filter from store, service, hook"
```

---

## Task 2: Remove Direction UI from GameGrid, AppSidebar, MobileFilterBar

**Why second:** Task 1 broke type compilation for any component that still reads `direction` from the store. This task removes those references so the project compiles cleanly again. The new League block and new labels come later.

**Files:**
- Modify: `src/components/predictions/GameGrid.tsx`
- Modify: `src/components/layout/AppSidebar.tsx`
- Modify: `src/components/layout/MobileFilterBar.tsx`

### Steps

- [ ] **Step 1: Update `GameGrid.tsx` — drop direction from store destructure and `hasActiveFilters`**

Change lines 44–50 in `src/components/predictions/GameGrid.tsx` from:

```tsx
  const { resetFilters, sport, minStars, direction } =
    usePredictionStore()

  const hasActiveFilters =
    sport !== 'all' ||
    minStars > 1 ||
    direction !== 'all'
```

to:

```tsx
  const { resetFilters, sport, minStars } = usePredictionStore()

  const hasActiveFilters = sport !== 'all' || minStars > 1
```

- [ ] **Step 2: Update `AppSidebar.tsx` — drop Direction block temporarily**

Edit `src/components/layout/AppSidebar.tsx`. Make these changes:

Remove the `Direction` type alias at line 18:

```tsx
type Direction = PredictionFilters['direction']
```

Change the destructure at lines 34–35 from:

```tsx
  const { sport, minStars, direction, setSport, setMinStars, setDirection } =
    usePredictionStore()
```

to:

```tsx
  const { sport, minStars, setSport, setMinStars } = usePredictionStore()
```

Delete the `dirOptions` block at lines 45–49:

```tsx
  const dirOptions: { id: Direction; label: string }[] = [
    { id: 'all', label: t.filter.all },
    { id: 'home', label: t.filter.home },
    { id: 'away', label: t.filter.away },
  ]
```

Delete the entire `{/* Direction */}` section at lines 109–126 (the second `SectionDivider`, the `px-2 py-3` block containing the direction section title, and its `dirOptions.map`):

```tsx
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
```

Leave the rest of the file untouched. Task 5 replaces the removed region with the new League block.

- [ ] **Step 3: Update `MobileFilterBar.tsx` — drop Direction block from sheet**

Edit `src/components/layout/MobileFilterBar.tsx`. Make these changes:

Remove the `Direction` type alias at line 17:

```tsx
type Direction = PredictionFilters['direction']
```

Change the destructure at lines 20–28 from:

```tsx
  const {
    sport,
    minStars,
    direction,
    setSport,
    setMinStars,
    setDirection,
  } = usePredictionStore()
```

to:

```tsx
  const { sport, minStars, setSport, setMinStars } = usePredictionStore()
```

Delete the `dirOptions` block at lines 36–40:

```tsx
  const dirOptions: { id: Direction; label: string }[] = [
    { id: 'all', label: t.filter.all },
    { id: 'home', label: t.filter.home },
    { id: 'away', label: t.filter.away },
  ]
```

Change the `activeFiltersCount` at lines 45–48 from:

```tsx
  const activeFiltersCount =
    (sport !== 'all' ? 1 : 0) +
    (minStars > 1 ? 1 : 0) +
    (direction !== 'all' ? 1 : 0)
```

to:

```tsx
  const activeFiltersCount =
    (sport !== 'all' ? 1 : 0) +
    (minStars > 1 ? 1 : 0)
```

Delete the entire `{/* Direction */}` block inside the SheetContent (lines 134–159):

```tsx
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
```

Also remove the `mb-6` wrapper on the Min Stars block since it is now the last block — change line 105 from `<div className="mb-6">` to `<div>`.

- [ ] **Step 4: Run type check and full test suite**

Run: `npx tsc --noEmit`

Expected: clean (0 errors). The whole project should compile now — the `direction` symbol is gone everywhere.

Run: `npx vitest run`

Expected: all existing tests pass. The store test (5 tests), AppHeader, GameGrid, GameCard, and all unit tests should be green. There is no AppSidebar test yet.

- [ ] **Step 5: Commit**

```bash
git add src/components/predictions/GameGrid.tsx src/components/layout/AppSidebar.tsx src/components/layout/MobileFilterBar.tsx
git commit -m "refactor(ui): remove direction filter from sidebar, mobile bar, and game grid"
```

---

## Task 3: Update i18n — drop direction keys, add sport/league keys

**Files:**
- Modify: `src/lib/i18n/en.ts`
- Modify: `src/lib/i18n/zh.ts`

### Steps

- [ ] **Step 1: Update `Translations` type and English values in `en.ts`**

Replace the full contents of `src/lib/i18n/en.ts` with:

```ts
// Translations type uses string (not literal) so zh can have different string values
export type Translations = {
  nav: { predictions: string; accuracy: string }
  accuracy: {
    title: string; winnerAccuracy: string; ouAccuracy: string; totalGames: string
    bySport: string; trend: string; noData: string; record: string
    nba: string; mlb: string; winner: string; overUnder: string
  }
  filter: {
    sport: string; allSports: string; minStars: string; confidence: string
    basketball: string; baseball: string
    leagues: string; basketballLeagues: string; baseballLeagues: string
    filterButton: string
  }
  predictions: {
    moneyline: string; spread: string; overUnder: string; pass: string
    vs: string
    noResults: string; noData: string; resetFilters: string; retry: string
  }
  gameDetail: {
    back: string; finalScore: string; scheduled: string
    aiPick: string; explanation: string; winProbability: string
    overUnder: string; notFound: string; viewDetail: string
  }
}

export const en: Translations = {
  nav: {
    predictions: "Today's Picks",
    accuracy: 'Accuracy',
  },
  filter: {
    sport: 'Sport',
    allSports: 'All',
    minStars: 'Min Stars',
    confidence: 'Confidence',
    basketball: 'Basketball',
    baseball: 'Baseball',
    leagues: 'Leagues',
    basketballLeagues: 'Basketball Leagues',
    baseballLeagues: 'Baseball Leagues',
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
  accuracy: {
    title: 'Prediction Accuracy',
    winnerAccuracy: 'Winner Accuracy',
    ouAccuracy: 'O/U Accuracy',
    totalGames: 'Games Resolved',
    bySport: 'By Sport',
    trend: 'Accuracy Trend',
    noData: 'No resolved games yet. Check back after games finish.',
    record: 'Record',
    nba: 'NBA',
    mlb: 'MLB',
    winner: 'Winner',
    overUnder: 'O/U',
  },
  gameDetail: {
    back: '← Back to Picks',
    finalScore: 'Final Score',
    scheduled: 'Scheduled',
    aiPick: 'AI Pick',
    explanation: 'AI Analysis',
    winProbability: 'Win Probability',
    overUnder: 'Over / Under',
    notFound: 'Game not found.',
    viewDetail: 'Details →',
  },
}
```

Note: `filter.direction`, `filter.all`, `filter.home`, and `filter.away` are all removed. `filter.all` is unused after the direction removal — no other call site references it.

- [ ] **Step 2: Update Traditional Chinese values in `zh.ts`**

Replace the `filter` block in `src/lib/i18n/zh.ts` (lines 8–18) so the file reads:

```ts
import type { Translations } from './en'

export const zh: Translations = {
  nav: {
    predictions: '今日預測',
    accuracy: '準確率',
  },
  filter: {
    sport: '運動種類',
    allSports: '全部',
    minStars: '最低星數',
    confidence: '信心度',
    basketball: '籃球',
    baseball: '棒球',
    leagues: '聯盟',
    basketballLeagues: '籃球聯盟',
    baseballLeagues: '棒球聯盟',
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
  accuracy: {
    title: '預測準確率',
    winnerAccuracy: '贏家準確率',
    ouAccuracy: '大小分準確率',
    totalGames: '已結算場次',
    bySport: '各運動種類',
    trend: '準確率趨勢',
    noData: '尚無已結算比賽。比賽結束後再來查看。',
    record: '戰績',
    nba: 'NBA',
    mlb: 'MLB',
    winner: '贏家',
    overUnder: '大小分',
  },
  gameDetail: {
    back: '← 返回預測列表',
    finalScore: '最終比分',
    scheduled: '預定時間',
    aiPick: 'AI 預測',
    explanation: 'AI 分析',
    winProbability: '勝率分析',
    overUnder: '大小分',
    notFound: '找不到比賽資料。',
    viewDetail: '詳情 →',
  },
}
```

- [ ] **Step 3: Type check**

Run: `npx tsc --noEmit`

Expected: clean (0 errors). No code references `t.filter.direction`, `t.filter.all`, `t.filter.home`, or `t.filter.away` after Task 2.

- [ ] **Step 4: Commit**

```bash
git add src/lib/i18n/en.ts src/lib/i18n/zh.ts
git commit -m "i18n: swap direction keys for sport category and league labels"
```

---

## Task 4: AppSidebar test (TDD — red phase)

**Why now:** Tests come before the new UI code so we can see them fail first, then watch them pass after Task 5. The test covers the three League-block states described in the spec.

**Files:**
- Create: `src/test/integration/AppSidebar.test.tsx`

### Steps

- [ ] **Step 1: Create the test file**

Write the full contents of `src/test/integration/AppSidebar.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock TanStack Router
vi.mock('@tanstack/react-router', () => ({
  useParams: () => ({ lang: 'en' }),
  useNavigate: () => vi.fn(),
  Link: ({ children, ...props }: Record<string, unknown>) => (
    <a {...props}>{children as React.ReactNode}</a>
  ),
}))

// Mock the sport counts hook so the sidebar renders without hitting Supabase
vi.mock('@/hooks/predictions/useDailyPredictions', () => ({
  useSportCounts: () => ({ data: { nba: 12, mlb: 12 } }),
}))

import { AppSidebar } from '@/components/layout/AppSidebar'
import { usePredictionStore } from '@/stores/predictions/predictionStore'

describe('AppSidebar', () => {
  beforeEach(() => {
    usePredictionStore.getState().resetFilters()
  })

  describe('Sport section', () => {
    it('renders All, Basketball, Baseball buttons', () => {
      render(<AppSidebar />)
      expect(screen.getByRole('button', { name: /All/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Basketball/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Baseball/ })).toBeInTheDocument()
    })

    it('clicking Basketball sets sport to nba', async () => {
      const user = userEvent.setup()
      render(<AppSidebar />)
      await user.click(screen.getByRole('button', { name: /Basketball/ }))
      expect(usePredictionStore.getState().sport).toBe('nba')
    })

    it('clicking Baseball sets sport to mlb', async () => {
      const user = userEvent.setup()
      render(<AppSidebar />)
      await user.click(screen.getByRole('button', { name: /Baseball/ }))
      expect(usePredictionStore.getState().sport).toBe('mlb')
    })

    it('clicking All sets sport to all', async () => {
      const user = userEvent.setup()
      usePredictionStore.setState({ sport: 'nba' })
      render(<AppSidebar />)
      await user.click(screen.getByRole('button', { name: /All/ }))
      expect(usePredictionStore.getState().sport).toBe('all')
    })
  })

  describe('League section — contextual label', () => {
    it('shows "LEAGUES" header when sport is all', () => {
      usePredictionStore.setState({ sport: 'all' })
      render(<AppSidebar />)
      expect(screen.getByText('Leagues')).toBeInTheDocument()
      expect(screen.queryByText('Basketball Leagues')).not.toBeInTheDocument()
    })

    it('shows "BASKETBALL LEAGUES" header when sport is nba', () => {
      usePredictionStore.setState({ sport: 'nba' })
      render(<AppSidebar />)
      expect(screen.getByText('Basketball Leagues')).toBeInTheDocument()
    })

    it('shows "BASEBALL LEAGUES" header when sport is mlb', () => {
      usePredictionStore.setState({ sport: 'mlb' })
      render(<AppSidebar />)
      expect(screen.getByText('Baseball Leagues')).toBeInTheDocument()
    })
  })

  describe('League section — items', () => {
    it('lists both NBA and MLB when sport is all', () => {
      usePredictionStore.setState({ sport: 'all' })
      render(<AppSidebar />)
      expect(screen.getByRole('button', { name: /NBA/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /MLB/ })).toBeInTheDocument()
    })

    it('lists only NBA when sport is nba', () => {
      usePredictionStore.setState({ sport: 'nba' })
      render(<AppSidebar />)
      expect(screen.getByRole('button', { name: /NBA/ })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /MLB/ })).not.toBeInTheDocument()
    })

    it('lists only MLB when sport is mlb', () => {
      usePredictionStore.setState({ sport: 'mlb' })
      render(<AppSidebar />)
      expect(screen.getByRole('button', { name: /MLB/ })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /NBA/ })).not.toBeInTheDocument()
    })

    it('clicking NBA from sport=all sets sport to nba', async () => {
      const user = userEvent.setup()
      usePredictionStore.setState({ sport: 'all' })
      render(<AppSidebar />)
      await user.click(screen.getByRole('button', { name: /NBA/ }))
      expect(usePredictionStore.getState().sport).toBe('nba')
    })

    it('clicking MLB from sport=all sets sport to mlb', async () => {
      const user = userEvent.setup()
      usePredictionStore.setState({ sport: 'all' })
      render(<AppSidebar />)
      await user.click(screen.getByRole('button', { name: /MLB/ }))
      expect(usePredictionStore.getState().sport).toBe('mlb')
    })
  })
})
```

- [ ] **Step 2: Run the new test — expect failures**

Run: `npx vitest run src/test/integration/AppSidebar.test.tsx`

Expected: most tests FAIL. Specifically:
- Sport section tests fail because the current sidebar still shows literal `NBA`/`MLB` labels and not `Basketball`/`Baseball`.
- League header tests fail because the new League block does not exist yet.
- League item tests fail because there is no NBA/MLB button in a dedicated League section.

If a test unexpectedly passes (for example the `clicking NBA from sport=all` test may incidentally work because the old sidebar still has an NBA button), note it but proceed — Task 5 will rewire everything.

- [ ] **Step 3: Commit the failing test**

```bash
git add src/test/integration/AppSidebar.test.tsx
git commit -m "test(sidebar): add failing tests for sport/league hierarchy"
```

---

## Task 5: Implement new AppSidebar layout (TDD — green phase)

**Files:**
- Modify: `src/components/layout/AppSidebar.tsx`

### Steps

- [ ] **Step 1: Rewrite `AppSidebar.tsx` with the new hierarchy**

Replace the full contents of `src/components/layout/AppSidebar.tsx` with:

```tsx
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
type SportCategory = 'all' | 'basketball' | 'baseball'

function sportCategory(sport: Sport): SportCategory {
  if (sport === 'nba') return 'basketball'
  if (sport === 'mlb') return 'baseball'
  return 'all'
}

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
  const { sport, minStars, setSport, setMinStars } = usePredictionStore()
  const { data: counts = {} } = useSportCounts()
  const totalCount = Object.values(counts).reduce((a, b) => a + b, 0)

  const category = sportCategory(sport)

  const categories: {
    id: SportCategory
    label: string
    emoji: string
    count: number
    onSelect: () => void
  }[] = [
    {
      id: 'all',
      label: t.filter.allSports,
      emoji: '🏆',
      count: totalCount,
      onSelect: () => setSport('all'),
    },
    {
      id: 'basketball',
      label: t.filter.basketball,
      emoji: '🏀',
      count: counts.nba ?? 0,
      onSelect: () => setSport('nba'),
    },
    {
      id: 'baseball',
      label: t.filter.baseball,
      emoji: '⚾',
      count: counts.mlb ?? 0,
      onSelect: () => setSport('mlb'),
    },
  ]

  const allLeagues: { id: Exclude<Sport, 'all'>; label: string; category: SportCategory }[] = [
    { id: 'nba', label: 'NBA', category: 'basketball' },
    { id: 'mlb', label: 'MLB', category: 'baseball' },
  ]

  const visibleLeagues =
    category === 'all' ? allLeagues : allLeagues.filter((l) => l.category === category)

  const leagueSectionLabel =
    category === 'basketball'
      ? t.filter.basketballLeagues
      : category === 'baseball'
        ? t.filter.baseballLeagues
        : t.filter.leagues

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
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={c.onSelect}
            className={cn(SIDEBAR_ITEM, category === c.id && SIDEBAR_ITEM_ACTIVE)}
            style={{ fontFamily: 'var(--font-barlow-condensed)' }}
          >
            <span>{c.emoji}</span>
            {c.label}
            {c.count > 0 && <CountBadge count={c.count} />}
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

      {/* Leagues */}
      <div className="px-2 py-3">
        <div className={SECTION_TITLE} style={{ fontFamily: 'var(--font-barlow-condensed)' }}>
          {leagueSectionLabel}
        </div>
        {visibleLeagues.map((l) => (
          <button
            key={l.id}
            onClick={() => setSport(l.id)}
            className={cn(SIDEBAR_ITEM, sport === l.id && SIDEBAR_ITEM_ACTIVE)}
            style={{ fontFamily: 'var(--font-barlow-condensed)' }}
          >
            {l.label}
            {counts[l.id] !== undefined && <CountBadge count={counts[l.id]} />}
          </button>
        ))}
      </div>
    </aside>
  )
}
```

Key behaviors to verify visually once everything is wired:
- Sport buttons are `All` / `Basketball` / `Baseball`, each with count (All shows sum).
- The League block label flips between `Leagues`, `Basketball Leagues`, and `Baseball Leagues`.
- When `sport=all`, both `NBA` and `MLB` appear as clickable items, neither highlighted.
- When `sport=nba`, only `NBA` appears and is highlighted.
- When `sport=mlb`, only `MLB` appears and is highlighted.
- Clicking a league from the `all` state flips Sport category to match (because `sport` becomes the league id and `sportCategory()` resolves the highlight).

- [ ] **Step 2: Run the AppSidebar test — expect PASS**

Run: `npx vitest run src/test/integration/AppSidebar.test.tsx`

Expected: all 12 tests pass.

If a test fails, read the failure message and fix the implementation (not the test). The likely offenders are accessible-name mismatches — the test uses `getByRole('button', { name: /Basketball/ })`, which matches the button text content; the emoji prefix should not interfere.

- [ ] **Step 3: Run full test suite + type check**

Run: `npx tsc --noEmit`

Expected: clean.

Run: `npx vitest run`

Expected: all tests pass across the project.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/AppSidebar.tsx
git commit -m "feat(sidebar): replace direction block with contextual league hierarchy"
```

---

## Task 6: Update MobileFilterBar sport pill labels

**Files:**
- Modify: `src/components/layout/MobileFilterBar.tsx`

### Steps

- [ ] **Step 1: Rewrite the sport pill list**

Open `src/components/layout/MobileFilterBar.tsx`.

Locate the `sports` array at lines 30–34:

```tsx
  const sports: { id: Sport; label: string }[] = [
    { id: 'all', label: t.filter.allSports },
    { id: 'nba', label: 'NBA' },
    { id: 'mlb', label: 'MLB' },
  ]
```

Replace with category-based rows (labels route to i18n, ids stay as league identifiers so the store stays untouched):

```tsx
  const sports: { id: Sport; label: string }[] = [
    { id: 'all', label: t.filter.allSports },
    { id: 'nba', label: t.filter.basketball },
    { id: 'mlb', label: t.filter.baseball },
  ]
```

No other changes are needed in this file — Task 2 already removed the Direction block and the `direction` store plumbing, and the active-state logic reuses `sport === s.id` which continues to work because clicking `Basketball` sets `sport = 'nba'` (matching `s.id`).

- [ ] **Step 2: Type check and test**

Run: `npx tsc --noEmit`

Expected: clean.

Run: `npx vitest run`

Expected: all tests pass.

- [ ] **Step 3: Manual smoke check (dev server)**

If practical, run the dev server and verify on a narrow viewport:

Run: `npm run dev`

Open the predictions page at a mobile width (≤ 768px). Verify:
- Pill bar shows `All` / `Basketball` / `Baseball` + `Filters`.
- Tapping `Basketball` highlights the pill and the feed filters to NBA.
- Opening the Filters sheet shows only Min Stars (no Direction block).
- Tapping `All` resets back to all sports.

Close the dev server when done.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/MobileFilterBar.tsx
git commit -m "feat(mobile-filter): relabel sport pills to sport categories"
```

---

## Task 7: Final verification

**Files:** none modified.

### Steps

- [ ] **Step 1: Full type check**

Run: `npx tsc --noEmit`

Expected: clean.

- [ ] **Step 2: Full test suite**

Run: `npx vitest run`

Expected: all tests pass. Count should include the new 12 AppSidebar tests on top of the existing suite.

- [ ] **Step 3: Grep sanity check for stray direction references**

Run: `git grep -nE "direction|setDirection|filter\\.(all|home|away)" src`

Expected: no output. Any match indicates a leftover reference that must be cleaned up. (The word "direction" might still appear in unrelated places — scan the results to confirm.)

- [ ] **Step 4: Desktop smoke check**

If practical, run the dev server:

Run: `npm run dev`

Open the predictions page on a wide viewport. Verify in sequence:
- Default state: `All` selected at top, `Leagues` header below, both NBA and MLB listed.
- Click `Basketball`: header becomes `Basketball Leagues`, only NBA listed and highlighted, feed filters to NBA games.
- Click `Baseball`: header becomes `Baseball Leagues`, only MLB listed and highlighted.
- Click `All`: back to `Leagues` header, both leagues listed again, neither highlighted.
- Click `NBA` while in `All` state: Sport highlight jumps to Basketball, header flips to `Basketball Leagues`, NBA becomes highlighted.

Close the dev server when done.

- [ ] **Step 5: Commit (only if verification surfaced a fix)**

If everything passed clean, no commit is needed. If Step 3 or Step 4 surfaced a fix, commit it:

```bash
git add -- src
git commit -m "fix(sidebar): address verification findings"
```
