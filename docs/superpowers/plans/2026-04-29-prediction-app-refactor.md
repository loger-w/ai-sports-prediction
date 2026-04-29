# Prediction App Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-architect the app from "Game-centric with detail page" to "Recommendation-centric list with optional accuracy stats", drop the old `predictions` / `prediction_results` tables, and remove all detail-page surfaces.

**Architecture:** Two-table design (`games` + `recommendations`). Each recommendation = one card in the UI. Sidebar filters by market (multi-select) and minimum stars. Sort toggle (time / stars). No detail page, no English locale. Time stored as Taiwan local (`TIMESTAMP` without timezone). Accuracy page deeply rewritten to break down by market & star tier.

**Tech Stack:** React 19, TanStack Router + Query, Zustand, Supabase (Postgres + RLS), Vite, Vitest + React Testing Library, Tailwind 4, dayjs, Vercel serverless API routes.

**Spec:** `docs/superpowers/specs/2026-04-29-prediction-app-refactor-design.md`

---

## File Structure

### Files to delete

```
src/components/game-detail/                      (entire folder, 13 files)
src/routes/$lang/$sport/                         (entire folder)
src/hooks/predictions/useGameDetail.ts
src/lib/predictions/seo.ts
src/types/predictions/analysis.ts
src/lib/i18n/en.ts
src/components/predictions/GameCard.tsx          (replaced by RecommendationCard)
src/components/predictions/PredictionColumn.tsx
api/render/[sport]/[slug].ts
src/test/unit/seo.test.ts
src/test/unit/generateSlug.test.ts
src/test/integration/GameCard.test.tsx
src/test/integration/PredictionColumn.test.tsx
```

### Files to create

```
supabase/migrations/008_drop_old_tables.sql
supabase/migrations/009_recommendations_schema.sql
src/types/predictions/recommendation.ts
src/components/predictions/RecommendationCard.tsx
src/components/predictions/RecommendationGrid.tsx
src/components/predictions/MarketChips.tsx
src/components/predictions/SortToggle.tsx
src/components/accuracy/MarketBreakdown.tsx
src/components/accuracy/StarBreakdown.tsx
src/hooks/predictions/useDailyRecommendations.ts
src/hooks/predictions/useDatesWithRecommendations.ts
src/test/integration/RecommendationCard.test.tsx
src/test/integration/RecommendationGrid.test.tsx
src/test/integration/MarketChips.test.tsx
src/test/integration/SortToggle.test.tsx
src/test/integration/MarketBreakdown.test.tsx
src/test/integration/StarBreakdown.test.tsx
src/test/unit/ingestValidators.test.ts
```

### Files to rewrite

```
src/components/layout/AppHeader.tsx              (drop lang switch)
src/components/layout/AppSidebar.tsx             (hide basketball, market chips, min-stars)
src/components/layout/MobileFilterBar.tsx        (mirror sidebar)
src/stores/predictions/predictionStore.ts        (markets Set, sortBy)
src/services/predictions/api.ts                  (fetchDailyRecommendations etc)
src/types/predictions/index.ts                   (drop old types, new ingest types)
src/lib/i18n/index.ts                            (zh-only)
src/lib/i18n/zh.ts                               (drop game-detail/analysis keys)
src/lib/predictions/ingest-helpers.ts            (new validators)
src/routes/$lang/route.tsx                       (lang fixed to 'zh')
src/routes/$lang/predictions/route.tsx           (RecommendationGrid)
src/routes/$lang/accuracy/route.tsx              (rewrite)
src/routes/index.tsx                             (always redirect /zh/predictions)
src/components/accuracy/AccuracyOverview.tsx     (overall by all markets)
src/components/accuracy/AccuracyTrend.tsx        (recompute daily)
src/hooks/predictions/useAccuracyStats.ts        (rename to useAccuracyData)
src/hooks/predictions/useDailyPredictions.ts     (replace with useDailyRecommendations re-export, then delete)
src/hooks/predictions/useDatesWithGames.ts       (replace with useDatesWithRecommendations re-export, then delete)
api/ingest/predictions.ts
api/ingest/results.ts
api/ingest/schedule.ts
api/sitemap.xml.ts
src/test/integration/AppHeader.test.tsx
src/test/integration/AppSidebar.test.tsx
src/test/integration/predictionStore.test.ts
src/test/integration/GameGrid.test.tsx           (rename to RecommendationGrid.test)
src/test/unit/resolveDateRange.test.ts           (fix imports if needed)
src/test/unit/timezone.test.ts                   (still applies)
src/test/unit/pct.test.ts                        (still applies)
src/test/unit/validateInput.test.ts              (rename / rewrite for new validators)
src/components/accuracy/AccuracyBySport.tsx      (delete — replaced by MarketBreakdown)
```

### Files unchanged

```
src/components/ui/*                              (shadcn primitives)
src/components/predictions/StarRating.tsx
src/components/predictions/DateScrollBar.tsx     (uses zh date format already; fine)
src/components/layout/PredictionsLayout.tsx
src/components/layout/AppFooter.tsx
src/lib/utils.ts
src/lib/queryClient.ts
src/lib/supabase.ts
src/lib/timezone.ts                              (helpers still useful for display)
src/main.tsx
src/test/setup.ts
src/routes/__root.tsx
src/routeTree.gen.ts                             (auto-regenerated by Vite plugin)
supabase/migrations/001-007                      (history; not modified)
```

---

## Phase 0 — Branch setup

### Task 0.1: Create feature branch

**Files:** none (git only)

- [ ] **Step 1: Create and switch to branch**

```bash
git checkout -b feat/refactor-recommendations
```

- [ ] **Step 2: Verify clean state**

```bash
git status
```

Expected: `On branch feat/refactor-recommendations` with the existing uncommitted typography work still pending. Leave that working tree untouched — the refactor commits will only touch refactor-related files.

- [ ] **Step 3: Stash unrelated WIP**

The user's prior typography polish modifies game-detail components that this plan deletes. Stash them so they don't conflict.

```bash
git stash push -m "wip: pre-refactor typography polish" -- \
  src/components/game-detail/ \
  src/components/predictions/PredictionColumn.tsx
```

Expected: `Saved working directory and index state On feat/refactor-recommendations: wip: pre-refactor typography polish`

---

## Phase 1 — Database migrations

### Task 1.1: Drop old tables migration

**Files:**
- Create: `supabase/migrations/008_drop_old_tables.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 008_drop_old_tables.sql
-- Drop legacy schema before introducing recommendations-centric model.
-- All historical prediction data is intentionally discarded; teams/sports preserved.

DROP VIEW IF EXISTS accuracy_stats;
DROP TABLE IF EXISTS prediction_results;
DROP TABLE IF EXISTS predictions;
DROP TABLE IF EXISTS games;
```

- [ ] **Step 2: Apply migration locally and verify**

If the user has Supabase CLI:

```bash
supabase db push
```

Otherwise paste the SQL into the Supabase dashboard SQL editor and run.

Expected: no errors. Tables `games`, `predictions`, `prediction_results` and view `accuracy_stats` gone. `sports`, `teams` untouched.

Verify in Supabase SQL editor:

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

Expected output: `sports`, `teams` (no others).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/008_drop_old_tables.sql
git commit -m "feat(db): drop legacy predictions/results tables and games"
```

### Task 1.2: New schema migration

**Files:**
- Create: `supabase/migrations/009_recommendations_schema.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 009_recommendations_schema.sql
-- Introduce Recommendation-centric model.
-- games: pure game info (no embedded markets). Stores Taiwan local time as TIMESTAMP.
-- recommendations: 0..N rows per game keyed (game_id, market).

CREATE TABLE games (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sport_id      TEXT NOT NULL REFERENCES sports(id),
  home_team_id  TEXT NOT NULL REFERENCES teams(id),
  away_team_id  TEXT NOT NULL REFERENCES teams(id),
  game_date     DATE NOT NULL,
  game_time     TIMESTAMP NOT NULL,
  status        TEXT NOT NULL DEFAULT 'scheduled'
                CHECK (status IN ('scheduled', 'final', 'void')),
  home_score    INTEGER,
  away_score    INTEGER,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (game_date, home_team_id, away_team_id, game_time)
);

CREATE INDEX idx_games_date_sport ON games (game_date, sport_id);

CREATE TABLE recommendations (
  game_id     UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  market      TEXT NOT NULL CHECK (market IN ('ml', 'spread', 'ou')),
  pick        TEXT NOT NULL CHECK (pick IN ('home', 'away', 'over', 'under')),
  line        DECIMAL(5,1),
  stars       INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
  result      TEXT CHECK (result IN ('win', 'loss', 'push', 'void')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (game_id, market)
);

CREATE INDEX idx_recs_game ON recommendations (game_id);
CREATE INDEX idx_recs_market_stars ON recommendations (market, stars);

-- updated_at triggers
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_games_updated_at
  BEFORE UPDATE ON games
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_recs_updated_at
  BEFORE UPDATE ON recommendations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Row-level security: public read, no write from anon
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read games" ON games FOR SELECT USING (true);
CREATE POLICY "Public read recommendations" ON recommendations FOR SELECT USING (true);
```

- [ ] **Step 2: Apply migration**

```bash
supabase db push
```

(or paste in dashboard).

- [ ] **Step 3: Verify schema**

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'recommendations'
ORDER BY ordinal_position;
```

Expected columns: `game_id, market, pick, line, stars, result, created_at, updated_at`.

Also verify with a quick smoke insert:

```sql
INSERT INTO games (sport_id, home_team_id, away_team_id, game_date, game_time)
VALUES ('mlb',
  (SELECT id FROM teams WHERE sport_id='mlb' LIMIT 1),
  (SELECT id FROM teams WHERE sport_id='mlb' OFFSET 1 LIMIT 1),
  '2026-04-29', '2026-04-29 22:10:00');

DELETE FROM games WHERE game_date = '2026-04-29';
```

Expected: insert succeeds, delete succeeds.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/009_recommendations_schema.sql
git commit -m "feat(db): create games + recommendations tables and triggers"
```

---

## Phase 2 — Types and helpers

### Task 2.1: New Recommendation types

**Files:**
- Create: `src/types/predictions/recommendation.ts`

- [ ] **Step 1: Write the types**

```ts
// src/types/predictions/recommendation.ts

export type Market = 'ml' | 'spread' | 'ou'
export type Pick = 'home' | 'away' | 'over' | 'under'
export type RecResult = 'win' | 'loss' | 'push' | 'void'
export type GameStatus = 'scheduled' | 'final' | 'void'

export interface TeamRow {
  id: string
  sport_id: string
  name_zh: string
  abbreviation: string
  logo_url: string | null
}

export interface GameRow {
  id: string
  sport_id: string
  home_team_id: string
  away_team_id: string
  game_date: string             // YYYY-MM-DD (Taiwan)
  game_time: string             // YYYY-MM-DD HH:mm:ss (Taiwan, no TZ)
  status: GameStatus
  home_score: number | null
  away_score: number | null
}

export interface RecommendationRow {
  game_id: string
  market: Market
  pick: Pick
  line: number | null           // ml=null; spread/ou required
  stars: number                 // 1-5
  result: RecResult | null      // null = pending
}

/** Fully joined row used by the recommendation list/grid UI. */
export interface RecommendationWithGame extends RecommendationRow {
  game: GameRow & {
    home_team: TeamRow
    away_team: TeamRow
  }
}
```

- [ ] **Step 2: Commit (no test yet — exported types validated by consumers)**

```bash
git add src/types/predictions/recommendation.ts
git commit -m "feat(types): add Recommendation/Game/Team row types"
```

### Task 2.2: Rewrite `src/types/predictions/index.ts`

**Files:**
- Modify: `src/types/predictions/index.ts`

- [ ] **Step 1: Replace with new content**

```ts
// src/types/predictions/index.ts
// Public types for the prediction domain. Old detail-page types removed.

export type {
  Market,
  Pick,
  RecResult,
  GameStatus,
  TeamRow,
  GameRow,
  RecommendationRow,
  RecommendationWithGame,
} from './recommendation'

import type { Market, Pick, RecResult } from './recommendation'

// ── Sports / Teams (preserved schema) ────────────────────────────────────────

export interface Sport {
  id: string
  name_zh: string
  is_active: boolean
}

// ── Manual ingest payload types ──────────────────────────────────────────────

export interface RecommendationInput {
  market: Market
  pick: Pick
  line: number | null
  stars: number   // 1-5
}

export interface GameInput {
  home_team: string                 // MLB abbreviation, e.g. "LAD"
  away_team: string
  game_time: string                 // Taiwan local "YYYY-MM-DD HH:mm:ss"
  recommendations: RecommendationInput[]
}

export interface PredictionsPayload {
  date: string                      // YYYY-MM-DD (Taiwan)
  games: GameInput[]
}

export interface RecommendationResultInput {
  market: Market
  result: RecResult
}

export interface GameResultInput {
  home_team: string
  away_team: string
  game_time: string
  home_score: number
  away_score: number
  recommendations: RecommendationResultInput[]
}

export interface ResultsPayload {
  date: string
  results: GameResultInput[]
}

export interface ScheduleGame {
  home_team: string
  away_team: string
  game_time: string                 // Taiwan local
}

export interface SchedulePayload {
  date: string
  games: ScheduleGame[]
}

// ── Ingest API response ──────────────────────────────────────────────────────

export interface IngestItemResult {
  game: string                      // "{home}-vs-{away}@{time}" for diagnostics
  status: 'upserted' | 'error' | 'no_game'
  error?: string
  recs_written?: number
}

export interface IngestResponse {
  total: number
  upserted: number
  errors: number
  results: IngestItemResult[]
}
```

- [ ] **Step 2: Run typecheck**

```bash
npm run lint
```

Expect many errors elsewhere (still referencing old types). Don't fix them yet — those files get rewritten/deleted in later tasks.

- [ ] **Step 3: Commit**

```bash
git add src/types/predictions/index.ts
git commit -m "feat(types): rewrite predictions/index for new schema"
```

### Task 2.3: Rewrite ingest validators (TDD)

**Files:**
- Modify: `src/lib/predictions/ingest-helpers.ts`
- Create: `src/test/unit/ingestValidators.test.ts`
- Delete: `src/test/unit/validateInput.test.ts`
- Delete: `src/test/unit/generateSlug.test.ts`

- [ ] **Step 1: Delete old tests**

```bash
git rm src/test/unit/validateInput.test.ts src/test/unit/generateSlug.test.ts
```

- [ ] **Step 2: Write failing tests for new validators**

```ts
// src/test/unit/ingestValidators.test.ts
import { describe, it, expect } from 'vitest'
import {
  validatePredictionsPayload,
  validateResultsPayload,
  validateSchedulePayload,
} from '@/lib/predictions/ingest-helpers'

describe('validatePredictionsPayload', () => {
  const validPayload = {
    date: '2026-04-29',
    games: [
      {
        home_team: 'LAD',
        away_team: 'SD',
        game_time: '2026-04-29 22:10:00',
        recommendations: [
          { market: 'ml', pick: 'home', line: null, stars: 4 },
          { market: 'spread', pick: 'home', line: -1.5, stars: 4 },
          { market: 'ou', pick: 'over', line: 8.5, stars: 3 },
        ],
      },
    ],
  }

  it('accepts a valid payload', () => {
    expect(() => validatePredictionsPayload(validPayload)).not.toThrow()
  })

  it('accepts empty recommendations array', () => {
    const p = { ...validPayload, games: [{ ...validPayload.games[0], recommendations: [] }] }
    expect(() => validatePredictionsPayload(p)).not.toThrow()
  })

  it('rejects bad date', () => {
    expect(() => validatePredictionsPayload({ ...validPayload, date: '2026/04/29' })).toThrow(/date/)
  })

  it('rejects empty games array', () => {
    expect(() => validatePredictionsPayload({ ...validPayload, games: [] })).toThrow(/games/)
  })

  it('rejects ml with non-null line', () => {
    const p = JSON.parse(JSON.stringify(validPayload))
    p.games[0].recommendations[0].line = 1.5
    expect(() => validatePredictionsPayload(p)).toThrow(/ml.*line/)
  })

  it('rejects spread without line', () => {
    const p = JSON.parse(JSON.stringify(validPayload))
    p.games[0].recommendations[1].line = null
    expect(() => validatePredictionsPayload(p)).toThrow(/line/)
  })

  it('rejects stars out of range', () => {
    const p = JSON.parse(JSON.stringify(validPayload))
    p.games[0].recommendations[0].stars = 6
    expect(() => validatePredictionsPayload(p)).toThrow(/stars/)
  })

  it('rejects ou with home/away pick', () => {
    const p = JSON.parse(JSON.stringify(validPayload))
    p.games[0].recommendations[2].pick = 'home'
    expect(() => validatePredictionsPayload(p)).toThrow(/pick/)
  })

  it('rejects ml with over/under pick', () => {
    const p = JSON.parse(JSON.stringify(validPayload))
    p.games[0].recommendations[0].pick = 'over'
    expect(() => validatePredictionsPayload(p)).toThrow(/pick/)
  })

  it('rejects bad game_time format', () => {
    const p = JSON.parse(JSON.stringify(validPayload))
    p.games[0].game_time = '2026-04-29T22:10:00Z'
    expect(() => validatePredictionsPayload(p)).toThrow(/game_time/)
  })
})

describe('validateResultsPayload', () => {
  const validPayload = {
    date: '2026-04-29',
    results: [
      {
        home_team: 'LAD',
        away_team: 'SD',
        game_time: '2026-04-29 22:10:00',
        home_score: 5,
        away_score: 3,
        recommendations: [
          { market: 'ml', result: 'win' },
          { market: 'spread', result: 'loss' },
          { market: 'ou', result: 'win' },
        ],
      },
    ],
  }

  it('accepts a valid payload', () => {
    expect(() => validateResultsPayload(validPayload)).not.toThrow()
  })

  it('rejects negative score', () => {
    const p = JSON.parse(JSON.stringify(validPayload))
    p.results[0].home_score = -1
    expect(() => validateResultsPayload(p)).toThrow(/home_score/)
  })

  it('rejects bad result enum', () => {
    const p = JSON.parse(JSON.stringify(validPayload))
    p.results[0].recommendations[0].result = 'WIN' // uppercase invalid
    expect(() => validateResultsPayload(p)).toThrow(/result/)
  })

  it('accepts void result', () => {
    const p = JSON.parse(JSON.stringify(validPayload))
    p.results[0].recommendations[0].result = 'void'
    expect(() => validateResultsPayload(p)).not.toThrow()
  })
})

describe('validateSchedulePayload', () => {
  it('accepts valid schedule', () => {
    const payload = {
      date: '2026-04-29',
      games: [{ home_team: 'LAD', away_team: 'SD', game_time: '2026-04-29 22:10:00' }],
    }
    expect(() => validateSchedulePayload(payload)).not.toThrow()
  })

  it('rejects bad game_time format', () => {
    const payload = {
      date: '2026-04-29',
      games: [{ home_team: 'LAD', away_team: 'SD', game_time: '2026/04/29 22:10' }],
    }
    expect(() => validateSchedulePayload(payload)).toThrow(/game_time/)
  })
})
```

- [ ] **Step 3: Run tests, expect failure**

```bash
npm run test -- src/test/unit/ingestValidators.test.ts
```

Expected: tests fail (current `ingest-helpers.ts` exports old validators with different signatures).

- [ ] **Step 4: Rewrite `src/lib/predictions/ingest-helpers.ts`**

```ts
// src/lib/predictions/ingest-helpers.ts
import type {
  PredictionsPayload,
  ResultsPayload,
  SchedulePayload,
} from '@/types/predictions/index.js'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/   // Taiwan local, no TZ
const VALID_MARKETS = new Set(['ml', 'spread', 'ou'])
const VALID_PICKS = new Set(['home', 'away', 'over', 'under'])
const VALID_RESULTS = new Set(['win', 'loss', 'push', 'void'])

function isStars(v: unknown): boolean {
  return Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 5
}

function isFiniteNum(v: unknown): boolean {
  return typeof v === 'number' && Number.isFinite(v)
}

function checkGameTime(prefix: string, val: unknown): void {
  if (typeof val !== 'string' || !TIME_RE.test(val))
    throw new Error(`${prefix}.game_time must be "YYYY-MM-DD HH:mm:ss" Taiwan local`)
}

// ── Predictions payload ─────────────────────────────────────────────────────

export function validatePredictionsPayload(body: unknown): PredictionsPayload {
  if (!body || typeof body !== 'object') throw new Error('Request body must be a JSON object')
  const b = body as Record<string, unknown>

  if (typeof b.date !== 'string' || !DATE_RE.test(b.date))
    throw new Error('date must be YYYY-MM-DD')
  if (!Array.isArray(b.games) || b.games.length === 0)
    throw new Error('games must be a non-empty array')

  for (const [i, g] of b.games.entries()) {
    const prefix = `games[${i}]`
    if (!g || typeof g !== 'object') throw new Error(`${prefix} must be an object`)
    const game = g as Record<string, unknown>

    for (const f of ['home_team', 'away_team']) {
      if (typeof game[f] !== 'string' || !game[f])
        throw new Error(`${prefix}.${f} is required`)
    }
    checkGameTime(prefix, game.game_time)

    if (!Array.isArray(game.recommendations))
      throw new Error(`${prefix}.recommendations must be an array (use [] for no recs)`)

    for (const [j, r] of (game.recommendations as unknown[]).entries()) {
      const rprefix = `${prefix}.recommendations[${j}]`
      if (!r || typeof r !== 'object') throw new Error(`${rprefix} must be an object`)
      const rec = r as Record<string, unknown>

      if (typeof rec.market !== 'string' || !VALID_MARKETS.has(rec.market))
        throw new Error(`${rprefix}.market must be ml | spread | ou`)
      if (typeof rec.pick !== 'string' || !VALID_PICKS.has(rec.pick))
        throw new Error(`${rprefix}.pick must be home | away | over | under`)

      if (rec.market === 'ml') {
        if (rec.line !== null) throw new Error(`${rprefix}: ml must have line=null`)
        if (rec.pick !== 'home' && rec.pick !== 'away')
          throw new Error(`${rprefix}.pick must be home or away for ml`)
      } else if (rec.market === 'spread') {
        if (!isFiniteNum(rec.line)) throw new Error(`${rprefix}.line must be a number for spread`)
        if (rec.pick !== 'home' && rec.pick !== 'away')
          throw new Error(`${rprefix}.pick must be home or away for spread`)
      } else {
        // ou
        if (!isFiniteNum(rec.line)) throw new Error(`${rprefix}.line must be a number for ou`)
        if (rec.pick !== 'over' && rec.pick !== 'under')
          throw new Error(`${rprefix}.pick must be over or under for ou`)
      }

      if (!isStars(rec.stars))
        throw new Error(`${rprefix}.stars must be an integer 1-5`)
    }
  }

  return b as unknown as PredictionsPayload
}

// ── Results payload ─────────────────────────────────────────────────────────

export function validateResultsPayload(body: unknown): ResultsPayload {
  if (!body || typeof body !== 'object') throw new Error('Request body must be a JSON object')
  const b = body as Record<string, unknown>

  if (typeof b.date !== 'string' || !DATE_RE.test(b.date))
    throw new Error('date must be YYYY-MM-DD')
  if (!Array.isArray(b.results) || b.results.length === 0)
    throw new Error('results must be a non-empty array')

  for (const [i, r] of b.results.entries()) {
    const prefix = `results[${i}]`
    if (!r || typeof r !== 'object') throw new Error(`${prefix} must be an object`)
    const item = r as Record<string, unknown>

    for (const f of ['home_team', 'away_team']) {
      if (typeof item[f] !== 'string' || !item[f])
        throw new Error(`${prefix}.${f} is required`)
    }
    checkGameTime(prefix, item.game_time)

    for (const f of ['home_score', 'away_score']) {
      if (!Number.isInteger(item[f]) || (item[f] as number) < 0)
        throw new Error(`${prefix}.${f} must be a non-negative integer`)
    }

    if (!Array.isArray(item.recommendations))
      throw new Error(`${prefix}.recommendations must be an array`)

    for (const [j, rec] of (item.recommendations as unknown[]).entries()) {
      const rprefix = `${prefix}.recommendations[${j}]`
      if (!rec || typeof rec !== 'object') throw new Error(`${rprefix} must be an object`)
      const rr = rec as Record<string, unknown>

      if (typeof rr.market !== 'string' || !VALID_MARKETS.has(rr.market))
        throw new Error(`${rprefix}.market must be ml | spread | ou`)
      if (typeof rr.result !== 'string' || !VALID_RESULTS.has(rr.result))
        throw new Error(`${rprefix}.result must be win | loss | push | void`)
    }
  }

  return b as unknown as ResultsPayload
}

// ── Schedule payload ────────────────────────────────────────────────────────

export function validateSchedulePayload(body: unknown): SchedulePayload {
  if (!body || typeof body !== 'object') throw new Error('Request body must be a JSON object')
  const b = body as Record<string, unknown>

  if (typeof b.date !== 'string' || !DATE_RE.test(b.date))
    throw new Error('date must be YYYY-MM-DD')
  if (!Array.isArray(b.games) || b.games.length === 0)
    throw new Error('games must be a non-empty array')

  for (const [i, g] of b.games.entries()) {
    const prefix = `games[${i}]`
    if (!g || typeof g !== 'object') throw new Error(`${prefix} must be an object`)
    const game = g as Record<string, unknown>
    for (const f of ['home_team', 'away_team']) {
      if (typeof game[f] !== 'string' || !game[f])
        throw new Error(`${prefix}.${f} is required`)
    }
    checkGameTime(prefix, game.game_time)
  }

  return b as unknown as SchedulePayload
}
```

- [ ] **Step 5: Run tests, expect pass**

```bash
npm run test -- src/test/unit/ingestValidators.test.ts
```

Expected: all 17+ tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/predictions/ingest-helpers.ts \
        src/test/unit/ingestValidators.test.ts \
        src/test/unit/validateInput.test.ts \
        src/test/unit/generateSlug.test.ts
git commit -m "feat(ingest): rewrite payload validators for recommendations schema"
```

---

## Phase 3 — Frontend deletions (clean slate)

### Task 3.1: Delete detail-page surfaces

**Files:**
- Delete: `src/components/game-detail/` (folder, 13 files)
- Delete: `src/routes/$lang/$sport/` (folder)
- Delete: `src/hooks/predictions/useGameDetail.ts`
- Delete: `src/lib/predictions/seo.ts`
- Delete: `src/types/predictions/analysis.ts`
- Delete: `api/render/[sport]/[slug].ts`
- Delete: `src/test/unit/seo.test.ts`
- Delete: `src/test/integration/GameCard.test.tsx`
- Delete: `src/test/integration/PredictionColumn.test.tsx`
- Delete: `src/components/predictions/GameCard.tsx`
- Delete: `src/components/predictions/PredictionColumn.tsx`
- Delete: `src/components/accuracy/AccuracyBySport.tsx`
- Delete: `src/lib/i18n/en.ts`

- [ ] **Step 1: Remove detail-page components folder**

```bash
git rm -r src/components/game-detail/
```

- [ ] **Step 2: Remove detail route**

```bash
git rm -r 'src/routes/$lang/$sport/'
```

- [ ] **Step 3: Remove related hooks/lib/types**

```bash
git rm src/hooks/predictions/useGameDetail.ts \
       src/lib/predictions/seo.ts \
       src/types/predictions/analysis.ts
```

- [ ] **Step 4: Remove SSR endpoint**

```bash
git rm 'api/render/[sport]/[slug].ts'
rmdir 'api/render/[sport]' 2>/dev/null
rmdir api/render 2>/dev/null
```

- [ ] **Step 5: Remove related tests**

```bash
git rm src/test/unit/seo.test.ts \
       src/test/integration/GameCard.test.tsx \
       src/test/integration/PredictionColumn.test.tsx
```

- [ ] **Step 6: Remove old card + accuracy-by-sport**

```bash
git rm src/components/predictions/GameCard.tsx \
       src/components/predictions/PredictionColumn.tsx \
       src/components/accuracy/AccuracyBySport.tsx
```

- [ ] **Step 7: Remove EN locale**

```bash
git rm src/lib/i18n/en.ts
```

- [ ] **Step 8: Verify**

```bash
git status
```

Expected: many deletions staged, no untracked detritus.

- [ ] **Step 9: Commit**

Build is now broken (lots of dangling imports). Subsequent phases fix it.

```bash
git commit -m "refactor: delete detail page, EN locale, and dependent surfaces"
```

---

## Phase 4 — i18n simplification

### Task 4.1: zh-only translations + drop game-detail/analysis keys

**Files:**
- Modify: `src/lib/i18n/index.ts`
- Modify: `src/lib/i18n/zh.ts`

- [ ] **Step 1: Rewrite `src/lib/i18n/zh.ts`**

```ts
// src/lib/i18n/zh.ts
// Single-locale (zh-TW) translations for the recommendations app.

export const zh = {
  nav: {
    predictions: '今日推薦',
    accuracy: '準確率',
  },
  filter: {
    sport: '運動種類',
    allSports: '全部',
    minStars: '最低星數',
    starsAll: '全部',
    filterButton: '篩選',
    baseball: '棒球',
    leagues: '聯盟',
    markets: '市場',
  },
  market: {
    ml: '獨贏',
    spread: '讓分',
    ou: '大小分',
    over: '大',
    under: '小',
  },
  predictions: {
    vs: 'VS',
    noResults: '沒有符合篩選條件的推薦。',
    noData: '推薦通常在每天早上更新。',
    resetFilters: '重置篩選',
    retry: '重試',
    sortByTime: '依時間',
    sortByStars: '依星數',
    pickAtLeastMarket: '請至少勾選一個市場',
  },
  accuracy: {
    title: '預測準確率',
    overall: '整體',
    byMarket: '依市場',
    byStars: '依星數',
    trend: '準確率趨勢',
    record: '戰績',
    totalRecs: '已結算推薦',
    noData: '尚無已結算推薦。比賽結束後再來查看。',
  },
  result: {
    win: '贏',
    loss: '輸',
    push: '和',
    void: '無效',
  },
} as const

export type Translations = typeof zh
```

- [ ] **Step 2: Rewrite `src/lib/i18n/index.ts`**

```ts
// src/lib/i18n/index.ts
// Single-locale entry point. `useTranslation` keeps the same API for callers,
// returning the zh translation object plus a fixed lang='zh'.

import { zh, type Translations } from './zh'

export type Lang = 'zh'
export type { Translations }

export function useTranslation(): { t: Translations; lang: Lang } {
  return { t: zh, lang: 'zh' }
}
```

- [ ] **Step 3: Run typecheck**

```bash
npm run lint
```

Expected: errors pinpoint files still using removed keys (e.g. `t.gameDetail.*`, `t.analysis.*`, `t.filter.basketball`). Don't fix yet — those files get rewritten next.

- [ ] **Step 4: Commit**

```bash
git add src/lib/i18n/
git commit -m "refactor(i18n): collapse to zh-only and drop detail/analysis keys"
```

---

## Phase 5 — Store, service, hooks foundation

### Task 5.1: Rewrite `predictionStore`

**Files:**
- Modify: `src/stores/predictions/predictionStore.ts`
- Modify: `src/test/integration/predictionStore.test.ts`

- [ ] **Step 1: Write failing tests first**

```ts
// src/test/integration/predictionStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { usePredictionStore } from '@/stores/predictions/predictionStore'

describe('predictionStore', () => {
  beforeEach(() => {
    usePredictionStore.getState().resetFilters()
  })

  it('default sport is "all"', () => {
    expect(usePredictionStore.getState().sport).toBe('all')
  })

  it('default markets contain ml, spread, ou', () => {
    const m = usePredictionStore.getState().markets
    expect(m.has('ml')).toBe(true)
    expect(m.has('spread')).toBe(true)
    expect(m.has('ou')).toBe(true)
    expect(m.size).toBe(3)
  })

  it('default minStars is 1', () => {
    expect(usePredictionStore.getState().minStars).toBe(1)
  })

  it('default sortBy is "stars"', () => {
    expect(usePredictionStore.getState().sortBy).toBe('stars')
  })

  it('toggleMarket removes a present market', () => {
    usePredictionStore.getState().toggleMarket('ml')
    expect(usePredictionStore.getState().markets.has('ml')).toBe(false)
  })

  it('toggleMarket adds an absent market', () => {
    usePredictionStore.getState().toggleMarket('ml')
    usePredictionStore.getState().toggleMarket('ml')
    expect(usePredictionStore.getState().markets.has('ml')).toBe(true)
  })

  it('setMinStars clamps to 1-5', () => {
    usePredictionStore.getState().setMinStars(0)
    expect(usePredictionStore.getState().minStars).toBe(1)
    usePredictionStore.getState().setMinStars(7)
    expect(usePredictionStore.getState().minStars).toBe(5)
    usePredictionStore.getState().setMinStars(3)
    expect(usePredictionStore.getState().minStars).toBe(3)
  })

  it('setSortBy switches between time and stars', () => {
    usePredictionStore.getState().setSortBy('time')
    expect(usePredictionStore.getState().sortBy).toBe('time')
    usePredictionStore.getState().setSortBy('stars')
    expect(usePredictionStore.getState().sortBy).toBe('stars')
  })

  it('resetFilters returns to defaults', () => {
    const s = usePredictionStore.getState()
    s.setSport('mlb')
    s.setMinStars(4)
    s.toggleMarket('ml')
    s.setSortBy('time')
    s.resetFilters()

    const after = usePredictionStore.getState()
    expect(after.sport).toBe('all')
    expect(after.minStars).toBe(1)
    expect(after.markets.size).toBe(3)
    expect(after.sortBy).toBe('stars')
  })
})
```

- [ ] **Step 2: Run tests — fail**

```bash
npm run test -- src/test/integration/predictionStore.test.ts
```

Expected: fail (`toggleMarket`, `setSortBy`, etc not defined).

- [ ] **Step 3: Rewrite `src/stores/predictions/predictionStore.ts`**

```ts
// src/stores/predictions/predictionStore.ts
import { create } from 'zustand'
import { localToday } from '@/lib/timezone'
import type { Market } from '@/types/predictions/recommendation'

export type Sport = 'all' | 'nba' | 'mlb'
export type SortBy = 'time' | 'stars'

export interface PredictionFilters {
  sport: Sport
  dateRange: string                 // YYYY-MM-DD
  markets: Set<Market>              // multi-select; empty = "no markets selected"
  minStars: number                  // 1..5; 1 = no filter
  sortBy: SortBy
}

interface PredictionStore extends PredictionFilters {
  setSport: (s: Sport) => void
  setDateRange: (d: string) => void
  toggleMarket: (m: Market) => void
  setMarkets: (m: Set<Market>) => void
  setMinStars: (n: number) => void
  setSortBy: (s: SortBy) => void
  resetFilters: () => void
}

const ALL_MARKETS: Market[] = ['ml', 'spread', 'ou']

function defaults(): PredictionFilters {
  return {
    sport: 'all',
    dateRange: localToday(),
    markets: new Set<Market>(ALL_MARKETS),
    minStars: 1,
    sortBy: 'stars',
  }
}

function clampStars(n: number): number {
  if (n < 1) return 1
  if (n > 5) return 5
  return Math.floor(n)
}

export const usePredictionStore = create<PredictionStore>((set) => ({
  ...defaults(),
  setSport: (sport) => set({ sport }),
  setDateRange: (dateRange) => set({ dateRange }),
  toggleMarket: (m) =>
    set((state) => {
      const next = new Set(state.markets)
      if (next.has(m)) next.delete(m)
      else next.add(m)
      return { markets: next }
    }),
  setMarkets: (markets) => set({ markets }),
  setMinStars: (n) => set({ minStars: clampStars(n) }),
  setSortBy: (sortBy) => set({ sortBy }),
  resetFilters: () => set(defaults()),
}))
```

- [ ] **Step 4: Run tests — pass**

```bash
npm run test -- src/test/integration/predictionStore.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/stores/predictions/predictionStore.ts \
        src/test/integration/predictionStore.test.ts
git commit -m "feat(store): rewrite predictionStore for markets/sortBy"
```

### Task 5.2: Rewrite `services/predictions/api.ts`

**Files:**
- Modify: `src/services/predictions/api.ts`

- [ ] **Step 1: Rewrite the file end-to-end**

```ts
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
    id, sport_id, game_date, game_time, status, home_score, away_score,
    home_team:teams!games_home_team_id_fkey(id, sport_id, name_zh, abbreviation, logo_url),
    away_team:teams!games_away_team_id_fkey(id, sport_id, name_zh, abbreviation, logo_url)
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
  if (!data) return []

  const rows = data as unknown as RecommendationWithGame[]
  return rows.slice().sort((a, b) => compareForSort(a, b, filters.sortBy))
}

export async function fetchRecommendationCounts(
  dateRange: string,
): Promise<Record<string, number>> {
  // Number of recommendations per sport for the chosen date.
  const { data, error } = await supabase
    .from('recommendations')
    .select('market, game:games!inner(sport_id, game_date)')
    .eq('game.game_date', dateRange)

  if (error || !data) return {}

  const counts: Record<string, number> = {}
  for (const row of data as unknown as Array<{
    market: string
    game: { sport_id: string }
  }>) {
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

  if (error || !data) return []

  const dates = new Set<string>()
  for (const row of data as unknown as Array<{ game: { game_date: string } }>) {
    if (row.game?.game_date) dates.add(row.game.game_date)
  }
  return [...dates]
}

// ── Accuracy ────────────────────────────────────────────────────────────────

export interface AccuracyBucket {
  total: number                     // resolved (result IS NOT NULL and != 'void')
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
  daily: Array<{ date: string; pct: number; total: number }>
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
  else if (r === 'void') b.voids++
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

  if (error || !data) {
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
    game: { game_date: string } | Array<{ game_date: string }>
  }

  for (const raw of data as unknown as Row[]) {
    const game = Array.isArray(raw.game) ? raw.game[0] : raw.game
    if (!game) continue

    add(overall, raw.result)
    add(byMarket[raw.market], raw.result)
    add(byStars[raw.stars] ?? (byStars[raw.stars] = EMPTY_BUCKET()), raw.result)

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
```

- [ ] **Step 2: Run typecheck**

```bash
npm run lint
```

Expected: errors only in files that import the OLD service exports (`fetchDailyPredictions`, `fetchSportCounts`, `fetchDatesWithGames`, `fetchGameDetail`, etc.). They get rewritten next.

- [ ] **Step 3: Commit**

```bash
git add src/services/predictions/api.ts
git commit -m "feat(service): rewrite api for recommendations + accuracy"
```

### Task 5.3: Rewrite hooks

**Files:**
- Modify: `src/hooks/predictions/useDailyPredictions.ts` → renamed by writing new file
- Create: `src/hooks/predictions/useDailyRecommendations.ts`
- Create: `src/hooks/predictions/useDatesWithRecommendations.ts`
- Modify: `src/hooks/predictions/useAccuracyStats.ts`
- Delete: `src/hooks/predictions/useDatesWithGames.ts`
- Delete: `src/hooks/predictions/useGameDetail.ts` (already deleted in Phase 3 — verify)

- [ ] **Step 1: Create `useDailyRecommendations`**

```ts
// src/hooks/predictions/useDailyRecommendations.ts
import { useQuery } from '@tanstack/react-query'
import {
  fetchDailyRecommendations,
  fetchRecommendationCounts,
} from '@/services/predictions/api'
import { usePredictionStore } from '@/stores/predictions/predictionStore'

export function useDailyRecommendations() {
  const { sport, dateRange, markets, minStars, sortBy } = usePredictionStore()
  const marketArr = [...markets]

  return useQuery({
    queryKey: ['recommendations', sport, dateRange, marketArr.sort().join(','), minStars, sortBy],
    queryFn: () =>
      fetchDailyRecommendations({ sport, dateRange, markets: marketArr, minStars, sortBy }),
  })
}

export function useRecommendationCounts() {
  const dateRange = usePredictionStore((s) => s.dateRange)
  return useQuery({
    queryKey: ['recommendationCounts', dateRange],
    queryFn: () => fetchRecommendationCounts(dateRange),
    staleTime: 60_000,
  })
}
```

- [ ] **Step 2: Create `useDatesWithRecommendations`**

```ts
// src/hooks/predictions/useDatesWithRecommendations.ts
import { useQuery } from '@tanstack/react-query'
import { fetchDatesWithRecommendations } from '@/services/predictions/api'

export function useDatesWithRecommendations(from: string, to: string) {
  return useQuery({
    queryKey: ['datesWithRecommendations', from, to],
    queryFn: () => fetchDatesWithRecommendations(from, to),
    staleTime: 5 * 60 * 1000,
  })
}
```

- [ ] **Step 3: Rewrite `useAccuracyStats` (rename to keep backwards-compat naming OR rename)**

Keep filename `useAccuracyStats.ts` for stability, but update to call the new fetcher.

```ts
// src/hooks/predictions/useAccuracyStats.ts
import { useQuery } from '@tanstack/react-query'
import { fetchAccuracyData } from '@/services/predictions/api'

export function useAccuracyData() {
  return useQuery({
    queryKey: ['accuracyData'],
    queryFn: fetchAccuracyData,
    staleTime: 5 * 60 * 1000,
  })
}
```

- [ ] **Step 4: Delete obsolete hooks**

```bash
git rm src/hooks/predictions/useDailyPredictions.ts \
       src/hooks/predictions/useDatesWithGames.ts
```

- [ ] **Step 5: Update DateScrollBar to use the renamed hook**

File: `src/components/predictions/DateScrollBar.tsx`

Find the import line (currently around L6):

```ts
import { useDatesWithGames } from '@/hooks/predictions/useDatesWithGames'
```

Replace with:

```ts
import { useDatesWithRecommendations } from '@/hooks/predictions/useDatesWithRecommendations'
```

Find the call (around L35):

```ts
const { data: datesWithGames = [] } = useDatesWithGames(from, to)
const datesWithGamesSet = new Set(datesWithGames)
```

Replace with:

```ts
const { data: datesWithRecs = [] } = useDatesWithRecommendations(from, to)
const datesWithGamesSet = new Set(datesWithRecs)
```

(Variable name `datesWithGamesSet` kept for minimal further diff; only the source changes.)

- [ ] **Step 6: Commit**

```bash
git add src/hooks/predictions/ src/components/predictions/DateScrollBar.tsx
git commit -m "feat(hooks): replace prediction hooks with recommendation hooks"
```

---

## Phase 6 — New presentation components (TDD)

### Task 6.1: `MarketChips` component

**Files:**
- Create: `src/components/predictions/MarketChips.tsx`
- Create: `src/test/integration/MarketChips.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/test/integration/MarketChips.test.tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { MarketChips } from '@/components/predictions/MarketChips'
import { usePredictionStore } from '@/stores/predictions/predictionStore'

describe('MarketChips', () => {
  beforeEach(() => {
    usePredictionStore.getState().resetFilters()
  })

  it('renders one chip per market', () => {
    render(<MarketChips />)
    expect(screen.getByText('獨贏')).toBeInTheDocument()
    expect(screen.getByText('讓分')).toBeInTheDocument()
    expect(screen.getByText('大小分')).toBeInTheDocument()
  })

  it('renders all chips as active when defaults', () => {
    render(<MarketChips />)
    expect(screen.getByText('獨贏').closest('button')).toHaveAttribute('data-active', 'true')
    expect(screen.getByText('讓分').closest('button')).toHaveAttribute('data-active', 'true')
    expect(screen.getByText('大小分').closest('button')).toHaveAttribute('data-active', 'true')
  })

  it('clicking a chip toggles store state', async () => {
    const user = userEvent.setup()
    render(<MarketChips />)
    await user.click(screen.getByText('獨贏'))
    expect(usePredictionStore.getState().markets.has('ml')).toBe(false)
    await user.click(screen.getByText('獨贏'))
    expect(usePredictionStore.getState().markets.has('ml')).toBe(true)
  })

  it('shows chips as inactive when store says so', () => {
    usePredictionStore.getState().toggleMarket('ml')
    render(<MarketChips />)
    expect(screen.getByText('獨贏').closest('button')).toHaveAttribute('data-active', 'false')
  })
})
```

- [ ] **Step 2: Run — fail**

```bash
npm run test -- src/test/integration/MarketChips.test.tsx
```

Expected: fail (component does not exist).

- [ ] **Step 3: Write the component**

```tsx
// src/components/predictions/MarketChips.tsx
import { cn } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import { usePredictionStore } from '@/stores/predictions/predictionStore'
import type { Market } from '@/types/predictions/recommendation'

const FONT = { fontFamily: 'var(--font-barlow-condensed)' as const }
const ORDER: Market[] = ['ml', 'spread', 'ou']

export function MarketChips() {
  const { t } = useTranslation()
  const markets = usePredictionStore((s) => s.markets)
  const toggleMarket = usePredictionStore((s) => s.toggleMarket)

  return (
    <div className="flex flex-wrap gap-1.5 px-2">
      {ORDER.map((m) => {
        const active = markets.has(m)
        return (
          <button
            key={m}
            type="button"
            onClick={() => toggleMarket(m)}
            data-active={active}
            className={cn(
              'px-2.5 py-1 rounded-full text-[12px] font-bold tracking-wide border transition-colors',
              active
                ? 'bg-[rgba(0,229,160,0.15)] text-[#00e5a0] border-[rgba(0,229,160,0.3)]'
                : 'text-[#4a5568] border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] hover:text-[#a0aec0]',
            )}
            style={FONT}
          >
            {t.market[m]}
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: Run — pass**

```bash
npm run test -- src/test/integration/MarketChips.test.tsx
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/predictions/MarketChips.tsx src/test/integration/MarketChips.test.tsx
git commit -m "feat(ui): add MarketChips component"
```

### Task 6.2: `SortToggle` component

**Files:**
- Create: `src/components/predictions/SortToggle.tsx`
- Create: `src/test/integration/SortToggle.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// src/test/integration/SortToggle.test.tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { SortToggle } from '@/components/predictions/SortToggle'
import { usePredictionStore } from '@/stores/predictions/predictionStore'

describe('SortToggle', () => {
  beforeEach(() => {
    usePredictionStore.getState().resetFilters()
  })

  it('renders both sort options', () => {
    render(<SortToggle />)
    expect(screen.getByText('依星數')).toBeInTheDocument()
    expect(screen.getByText('依時間')).toBeInTheDocument()
  })

  it('marks default (stars) as active', () => {
    render(<SortToggle />)
    expect(screen.getByText('依星數').closest('button')).toHaveAttribute('data-active', 'true')
    expect(screen.getByText('依時間').closest('button')).toHaveAttribute('data-active', 'false')
  })

  it('clicking time switches sortBy in store', async () => {
    const user = userEvent.setup()
    render(<SortToggle />)
    await user.click(screen.getByText('依時間'))
    expect(usePredictionStore.getState().sortBy).toBe('time')
  })
})
```

- [ ] **Step 2: Run — fail**

```bash
npm run test -- src/test/integration/SortToggle.test.tsx
```

- [ ] **Step 3: Write the component**

```tsx
// src/components/predictions/SortToggle.tsx
import { cn } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import { usePredictionStore, type SortBy } from '@/stores/predictions/predictionStore'

const FONT = { fontFamily: 'var(--font-barlow-condensed)' as const }

const OPTIONS: Array<{ id: SortBy; key: 'sortByStars' | 'sortByTime' }> = [
  { id: 'stars', key: 'sortByStars' },
  { id: 'time', key: 'sortByTime' },
]

export function SortToggle() {
  const { t } = useTranslation()
  const sortBy = usePredictionStore((s) => s.sortBy)
  const setSortBy = usePredictionStore((s) => s.setSortBy)

  return (
    <div className="inline-flex items-center bg-[#161b22] border border-[#1e2733] rounded overflow-hidden">
      {OPTIONS.map((opt) => {
        const active = sortBy === opt.id
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => setSortBy(opt.id)}
            data-active={active}
            className={cn(
              'px-3 py-1 text-[12px] font-bold tracking-wide transition-colors',
              active ? 'bg-[#1e2733] text-[#00e5a0]' : 'text-[#4a5568]',
            )}
            style={FONT}
          >
            {t.predictions[opt.key]}
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: Run — pass**

```bash
npm run test -- src/test/integration/SortToggle.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/components/predictions/SortToggle.tsx src/test/integration/SortToggle.test.tsx
git commit -m "feat(ui): add SortToggle component"
```

### Task 6.3: `RecommendationCard` component

**Files:**
- Create: `src/components/predictions/RecommendationCard.tsx`
- Create: `src/test/integration/RecommendationCard.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// src/test/integration/RecommendationCard.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@tanstack/react-router', () => ({
  useParams: () => ({ lang: 'zh' }),
  useNavigate: () => vi.fn(),
  Link: ({ children, ...rest }: Record<string, unknown>) => <a {...rest}>{children as React.ReactNode}</a>,
}))

import { RecommendationCard } from '@/components/predictions/RecommendationCard'
import type { RecommendationWithGame } from '@/types/predictions/recommendation'

function makeRec(overrides: Partial<RecommendationWithGame> = {}): RecommendationWithGame {
  const base: RecommendationWithGame = {
    game_id: 'g1',
    market: 'spread',
    pick: 'home',
    line: -1.5,
    stars: 4,
    result: null,
    game: {
      id: 'g1',
      sport_id: 'mlb',
      home_team_id: 'lad',
      away_team_id: 'sd',
      game_date: '2026-04-29',
      game_time: '2026-04-29 22:10:00',
      status: 'scheduled',
      home_score: null,
      away_score: null,
      home_team: {
        id: 'lad', sport_id: 'mlb', name_zh: '道奇', abbreviation: 'LAD', logo_url: null,
      },
      away_team: {
        id: 'sd', sport_id: 'mlb', name_zh: '教士', abbreviation: 'SD', logo_url: null,
      },
    },
  }
  return { ...base, ...overrides, game: { ...base.game, ...(overrides.game ?? {}) } }
}

describe('RecommendationCard', () => {
  it('renders sport label and market label in header', () => {
    render(<RecommendationCard rec={makeRec()} />)
    expect(screen.getByText(/MLB/)).toBeInTheDocument()
    expect(screen.getByText(/讓分/)).toBeInTheDocument()
  })

  it('shows team abbreviations with picked side highlighted', () => {
    render(<RecommendationCard rec={makeRec()} />)
    const lad = screen.getByText('LAD')
    const sd = screen.getByText('SD')
    expect(lad).toHaveAttribute('data-picked', 'true')
    expect(sd).toHaveAttribute('data-picked', 'false')
  })

  it('shows pick text "LAD -1.5" for spread home', () => {
    render(<RecommendationCard rec={makeRec()} />)
    expect(screen.getByText('LAD -1.5')).toBeInTheDocument()
  })

  it('shows pick text "O 8.5" for over', () => {
    const rec = makeRec({ market: 'ou', pick: 'over', line: 8.5 })
    render(<RecommendationCard rec={rec} />)
    expect(screen.getByText('大 8.5')).toBeInTheDocument()
  })

  it('shows pick text "U 8.5" for under', () => {
    const rec = makeRec({ market: 'ou', pick: 'under', line: 8.5 })
    render(<RecommendationCard rec={rec} />)
    expect(screen.getByText('小 8.5')).toBeInTheDocument()
  })

  it('shows pick text "LAD" for ml home', () => {
    const rec = makeRec({ market: 'ml', pick: 'home', line: null })
    render(<RecommendationCard rec={rec} />)
    expect(screen.getByText('LAD')).toBeInTheDocument()
  })

  it('shows star count', () => {
    render(<RecommendationCard rec={makeRec({ stars: 5 })} />)
    expect(screen.getByTestId('rec-stars').textContent).toMatch(/5/)
  })

  it('renders WIN badge when result is "win"', () => {
    render(<RecommendationCard rec={makeRec({ result: 'win' })} />)
    expect(screen.getByText('贏')).toBeInTheDocument()
  })

  it('renders VOID badge when result is "void"', () => {
    render(<RecommendationCard rec={makeRec({ result: 'void' })} />)
    expect(screen.getByText('無效')).toBeInTheDocument()
  })

  it('does not render result badge when pending', () => {
    render(<RecommendationCard rec={makeRec({ result: null })} />)
    expect(screen.queryByText('贏')).not.toBeInTheDocument()
    expect(screen.queryByText('輸')).not.toBeInTheDocument()
  })

  it('renders local time HH:mm portion of game_time', () => {
    render(<RecommendationCard rec={makeRec()} />)
    expect(screen.getByText('22:10')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run — fail**

```bash
npm run test -- src/test/integration/RecommendationCard.test.tsx
```

- [ ] **Step 3: Write the component**

```tsx
// src/components/predictions/RecommendationCard.tsx
import { cn } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import type { RecommendationWithGame } from '@/types/predictions/recommendation'
import { StarRating } from './StarRating'

const FONT = { fontFamily: 'var(--font-barlow-condensed)' as const }

interface Props {
  rec: RecommendationWithGame
}

function timePart(gameTime: string): string {
  // Stored as Taiwan-local "YYYY-MM-DD HH:mm:ss" — extract HH:mm.
  return gameTime.slice(11, 16)
}

function formatPick(rec: RecommendationWithGame, t: ReturnType<typeof useTranslation>['t']): string {
  if (rec.market === 'ml') {
    return rec.pick === 'home' ? rec.game.home_team.abbreviation : rec.game.away_team.abbreviation
  }
  if (rec.market === 'spread') {
    const abbr =
      rec.pick === 'home' ? rec.game.home_team.abbreviation : rec.game.away_team.abbreviation
    const sign = rec.line! >= 0 ? '+' : ''
    return `${abbr} ${sign}${rec.line}`
  }
  // ou
  const label = rec.pick === 'over' ? t.market.over : t.market.under
  return `${label} ${rec.line}`
}

function ResultBadge({ result }: { result: 'win' | 'loss' | 'push' | 'void' }) {
  const { t } = useTranslation()
  const map: Record<typeof result, string> = {
    win: '#00e5a0', loss: '#fc8181', push: '#a0aec0', void: '#4a5568',
  }
  const bgMap: Record<typeof result, string> = {
    win: 'rgba(0,229,160,0.15)',
    loss: 'rgba(252,129,129,0.15)',
    push: 'rgba(160,174,192,0.15)',
    void: 'rgba(74,85,104,0.15)',
  }
  return (
    <span
      className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide"
      style={{ ...FONT, color: map[result], background: bgMap[result] }}
    >
      {t.result[result]}
    </span>
  )
}

export function RecommendationCard({ rec }: Props) {
  const { t } = useTranslation()
  const home = rec.game.home_team
  const away = rec.game.away_team
  const homePicked = rec.pick === 'home' || (rec.market === 'ou')
  const awayPicked = rec.pick === 'away' || (rec.market === 'ou')

  const sportLabel = rec.game.sport_id.toUpperCase()
  const marketLabel = t.market[rec.market]
  const time = timePart(rec.game.game_time)
  const pickText = formatPick(rec, t)

  return (
    <div className="rounded-[10px] border border-[#1e2733] bg-[#161b22] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-[#0d1117] border-b border-[#1e2733]">
        <span
          className="text-[11px] font-bold tracking-[0.18em] uppercase text-[#00e5a0]"
          style={FONT}
        >
          {sportLabel} · {marketLabel}
        </span>
        <div className="flex items-center gap-2">
          {rec.result ? <ResultBadge result={rec.result} /> : null}
          <span className="text-[11px] text-[#3a4a5a]" style={FONT}>{time}</span>
        </div>
      </div>

      {/* Teams */}
      <div className="px-3.5 py-2.5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="min-w-0">
          <div
            data-picked={homePicked}
            className="text-[22px] font-black leading-none mb-0.5"
            style={{
              ...FONT,
              color: homePicked ? '#e2e8f0' : '#2d3748',
            }}
          >
            {home.abbreviation}
          </div>
          <div className="text-[10px] uppercase tracking-widest text-[#3a4a5a] truncate" style={FONT}>
            {home.name_zh}
          </div>
        </div>

        <div className="text-[11px] font-bold text-[#2d3748]" style={FONT}>{t.predictions.vs}</div>

        <div className="text-right min-w-0">
          <div
            data-picked={awayPicked}
            className="text-[22px] font-black leading-none mb-0.5"
            style={{
              ...FONT,
              color: awayPicked ? '#e2e8f0' : '#2d3748',
            }}
          >
            {away.abbreviation}
          </div>
          <div className="text-[10px] uppercase tracking-widest text-[#3a4a5a] truncate" style={FONT}>
            {away.name_zh}
          </div>
        </div>
      </div>

      {/* Pick + Stars */}
      <div className="border-t border-[#1e2733] px-3.5 py-2.5 flex items-center justify-between">
        <span className="text-[14px] font-bold text-[#e2e8f0]" style={FONT}>{pickText}</span>
        <span data-testid="rec-stars" className="flex items-center gap-1">
          <StarRating stars={rec.stars} size={12} />
          <span className="text-[11px] text-[#fbbf24] font-bold" style={FONT}>{rec.stars}</span>
        </span>
      </div>
    </div>
  )
}
```

Note: `homePicked = rec.pick === 'home' || rec.market === 'ou'` — for OU markets neither side is "picked", so we highlight both team rows equally (both data-picked=true). The test expects `LAD picked` and `SD not picked` for `spread/home`, which matches.

Wait — recheck test: `it('shows team abbreviations with picked side highlighted')` uses spread/home; expects LAD picked=true, SD picked=false. With market=='spread', the OR with `rec.market==='ou'` is false, so `homePicked = (pick==='home') = true`, `awayPicked = (pick==='away') = false`. ✓

For OU test cases there's no assertion on data-picked, so it's fine to highlight both.

- [ ] **Step 4: Run — pass**

```bash
npm run test -- src/test/integration/RecommendationCard.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/components/predictions/RecommendationCard.tsx \
        src/test/integration/RecommendationCard.test.tsx
git commit -m "feat(ui): add RecommendationCard component"
```

### Task 6.4: `RecommendationGrid` component

**Files:**
- Create: `src/components/predictions/RecommendationGrid.tsx`
- Create: `src/test/integration/RecommendationGrid.test.tsx`
- Delete: `src/components/predictions/GameGrid.tsx`
- Delete: `src/test/integration/GameGrid.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// src/test/integration/RecommendationGrid.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { UseQueryResult } from '@tanstack/react-query'

vi.mock('@tanstack/react-router', () => ({
  useParams: () => ({ lang: 'zh' }),
  useNavigate: () => vi.fn(),
  Link: ({ children, ...rest }: Record<string, unknown>) => <a {...rest}>{children as React.ReactNode}</a>,
}))

import { RecommendationGrid } from '@/components/predictions/RecommendationGrid'
import { usePredictionStore } from '@/stores/predictions/predictionStore'
import type { RecommendationWithGame } from '@/types/predictions/recommendation'

function rec(overrides: Partial<RecommendationWithGame> = {}): RecommendationWithGame {
  return {
    game_id: 'g1', market: 'ml', pick: 'home', line: null, stars: 4, result: null,
    game: {
      id: 'g1', sport_id: 'mlb',
      home_team_id: 'lad', away_team_id: 'sd',
      game_date: '2026-04-29', game_time: '2026-04-29 22:10:00',
      status: 'scheduled', home_score: null, away_score: null,
      home_team: { id: 'lad', sport_id: 'mlb', name_zh: '道奇', abbreviation: 'LAD', logo_url: null },
      away_team: { id: 'sd', sport_id: 'mlb', name_zh: '教士', abbreviation: 'SD', logo_url: null },
    },
    ...overrides,
  } as RecommendationWithGame
}

type Q = Pick<UseQueryResult<RecommendationWithGame[]>, 'data' | 'isLoading' | 'isError' | 'refetch'>

const noopQuery = (data: RecommendationWithGame[] | undefined): Q => ({
  data,
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
})

describe('RecommendationGrid', () => {
  beforeEach(() => {
    usePredictionStore.getState().resetFilters()
  })

  it('renders skeleton when loading', () => {
    render(<RecommendationGrid {...({ data: undefined, isLoading: true, isError: false, refetch: vi.fn() })} />)
    expect(screen.getAllByTestId('rec-skeleton').length).toBeGreaterThan(0)
  })

  it('renders empty state when no data', () => {
    render(<RecommendationGrid {...noopQuery([])} />)
    expect(screen.getByText(/沒有符合篩選條件的推薦|推薦通常在每天早上更新/)).toBeInTheDocument()
  })

  it('shows "pick at least one market" when markets are empty', () => {
    usePredictionStore.getState().setMarkets(new Set())
    render(<RecommendationGrid {...noopQuery([])} />)
    expect(screen.getByText('請至少勾選一個市場')).toBeInTheDocument()
  })

  it('renders one card per recommendation', () => {
    const recs = [
      rec({ market: 'ml', pick: 'home', stars: 4 }),
      rec({ market: 'spread', pick: 'home', line: -1.5, stars: 3 }),
    ]
    render(<RecommendationGrid {...noopQuery(recs)} />)
    // two cards rendered → two stars test ids
    expect(screen.getAllByTestId('rec-stars')).toHaveLength(2)
  })

  it('shows error state with retry button on error', async () => {
    const refetch = vi.fn()
    const user = userEvent.setup()
    render(<RecommendationGrid {...({ data: undefined, isLoading: false, isError: true, refetch })} />)
    await user.click(screen.getByText('重試'))
    expect(refetch).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run — fail**

```bash
npm run test -- src/test/integration/RecommendationGrid.test.tsx
```

- [ ] **Step 3: Write the component**

```tsx
// src/components/predictions/RecommendationGrid.tsx
import type { UseQueryResult } from '@tanstack/react-query'
import { Skeleton } from '@/components/ui/skeleton'
import { useTranslation } from '@/lib/i18n'
import { usePredictionStore } from '@/stores/predictions/predictionStore'
import type { RecommendationWithGame } from '@/types/predictions/recommendation'
import { RecommendationCard } from './RecommendationCard'

type GridProps = Pick<
  UseQueryResult<RecommendationWithGame[]>,
  'data' | 'isLoading' | 'isError' | 'refetch'
>

const FONT = { fontFamily: 'var(--font-barlow-condensed)' as const }

function CardSkeleton() {
  return (
    <div data-testid="rec-skeleton" className="rounded-[10px] border border-[#1e2733] bg-[#161b22] overflow-hidden">
      <div className="h-9 bg-[#0d1117] border-b border-[#1e2733]" />
      <div className="px-3.5 py-2.5 grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
        <Skeleton className="h-7 w-12 bg-[#1e2733]" />
        <Skeleton className="h-3 w-4 bg-[#1e2733]" />
        <Skeleton className="h-7 w-12 bg-[#1e2733] ml-auto" />
      </div>
      <div className="border-t border-[#1e2733] px-3.5 py-2.5 flex justify-between">
        <Skeleton className="h-5 w-20 bg-[#1e2733]" />
        <Skeleton className="h-5 w-16 bg-[#1e2733]" />
      </div>
    </div>
  )
}

export function RecommendationGrid({ data, isLoading, isError, refetch }: GridProps) {
  const { t } = useTranslation()
  const markets = usePredictionStore((s) => s.markets)
  const sport = usePredictionStore((s) => s.sport)
  const minStars = usePredictionStore((s) => s.minStars)
  const resetFilters = usePredictionStore((s) => s.resetFilters)

  if (markets.size === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-2">
        <p className="text-[#a0aec0] text-sm" style={FONT}>{t.predictions.pickAtLeastMarket}</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
        <p className="text-[#4a5568] text-sm" style={FONT}>Failed to load.</p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 rounded text-[12px] font-bold tracking-wide bg-[rgba(0,229,160,0.1)] text-[#00e5a0] border border-[rgba(0,229,160,0.25)] hover:brightness-110 transition-all"
          style={FONT}
        >
          {t.predictions.retry}
        </button>
      </div>
    )
  }

  if (!data || data.length === 0) {
    const filtered = sport !== 'all' || minStars > 1 || markets.size < 3
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
        <p className="text-[#4a5568] text-sm max-w-xs" style={FONT}>
          {filtered ? t.predictions.noResults : t.predictions.noData}
        </p>
        {filtered ? (
          <button
            onClick={resetFilters}
            className="px-4 py-2 rounded text-[12px] font-bold tracking-wide bg-[rgba(0,229,160,0.1)] text-[#00e5a0] border border-[rgba(0,229,160,0.25)] hover:brightness-110 transition-all"
            style={FONT}
          >
            {t.predictions.resetFilters}
          </button>
        ) : null}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {data.map((r) => (
        <RecommendationCard key={`${r.game_id}:${r.market}`} rec={r} />
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Delete old grid + test**

```bash
git rm src/components/predictions/GameGrid.tsx \
       src/test/integration/GameGrid.test.tsx
```

- [ ] **Step 5: Run — pass**

```bash
npm run test -- src/test/integration/RecommendationGrid.test.tsx
```

- [ ] **Step 6: Commit**

```bash
git add src/components/predictions/RecommendationGrid.tsx \
        src/test/integration/RecommendationGrid.test.tsx \
        src/components/predictions/GameGrid.tsx \
        src/test/integration/GameGrid.test.tsx
git commit -m "feat(ui): add RecommendationGrid; remove legacy GameGrid"
```

---

## Phase 7 — Layout updates

### Task 7.1: `AppHeader` — drop language toggle

**Files:**
- Modify: `src/components/layout/AppHeader.tsx`
- Modify: `src/test/integration/AppHeader.test.tsx`

- [ ] **Step 1: Rewrite test for zh-only header**

```tsx
// src/test/integration/AppHeader.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@tanstack/react-router', () => ({
  useParams: () => ({ lang: 'zh' }),
  useNavigate: () => vi.fn(),
  Link: ({ children, ...rest }: Record<string, unknown>) => <a {...rest}>{children as React.ReactNode}</a>,
}))

import { AppHeader } from '@/components/layout/AppHeader'

describe('AppHeader', () => {
  it('renders nav links to predictions and accuracy', () => {
    render(<AppHeader />)
    expect(screen.getByText('今日推薦')).toBeInTheDocument()
    expect(screen.getByText('準確率')).toBeInTheDocument()
  })

  it('does NOT render language toggle', () => {
    render(<AppHeader />)
    expect(screen.queryByLabelText('Toggle language')).not.toBeInTheDocument()
    expect(screen.queryByText('EN')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run — fail (current AppHeader has lang toggle)**

```bash
npm run test -- src/test/integration/AppHeader.test.tsx
```

- [ ] **Step 3: Rewrite component**

```tsx
// src/components/layout/AppHeader.tsx
import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'

const FONT = { fontFamily: 'var(--font-barlow-condensed)' as const }

export function AppHeader() {
  const { t, lang } = useTranslation()

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-[52px] border-b border-[#1e2733] bg-[#0d1117] flex items-center px-4 gap-6">
      <span
        className="text-[17px] font-black tracking-wide shrink-0"
        style={{ ...FONT, color: '#00e5a0' }}
      >
        AI<span style={{ color: '#4a7a6a' }}>Sports</span>
      </span>

      <nav className="flex items-center gap-1 flex-1">
        <Link
          to="/$lang/predictions"
          params={{ lang }}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-bold tracking-widest uppercase transition-colors',
            'text-[#4a5568] hover:text-[#a0aec0]',
          )}
          activeProps={{
            className:
              'flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-bold tracking-widest uppercase bg-[rgba(0,229,160,0.12)] text-[#00e5a0]',
          }}
          style={FONT}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current" />
          {t.nav.predictions}
        </Link>
        <Link
          to="/$lang/accuracy"
          params={{ lang }}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-bold tracking-widest uppercase transition-colors',
            'text-[#4a5568] hover:text-[#a0aec0]',
          )}
          activeProps={{
            className:
              'flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-bold tracking-widest uppercase bg-[rgba(0,229,160,0.12)] text-[#00e5a0]',
          }}
          style={FONT}
        >
          {t.nav.accuracy}
        </Link>
      </nav>
    </header>
  )
}
```

- [ ] **Step 4: Run — pass**

```bash
npm run test -- src/test/integration/AppHeader.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/AppHeader.tsx src/test/integration/AppHeader.test.tsx
git commit -m "refactor(layout): drop language toggle from AppHeader"
```

### Task 7.2: `AppSidebar` — hide basketball, market chips, min-stars

**Files:**
- Modify: `src/components/layout/AppSidebar.tsx`
- Modify: `src/test/integration/AppSidebar.test.tsx`

- [ ] **Step 1: Rewrite test**

```tsx
// src/test/integration/AppSidebar.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('@tanstack/react-router', () => ({
  useParams: () => ({ lang: 'zh' }),
  useNavigate: () => vi.fn(),
  Link: ({ children, ...rest }: Record<string, unknown>) => <a {...rest}>{children as React.ReactNode}</a>,
}))

vi.mock('@/hooks/predictions/useDailyRecommendations', () => ({
  useRecommendationCounts: () => ({ data: { mlb: 8 } }),
}))

import { AppSidebar } from '@/components/layout/AppSidebar'
import { usePredictionStore } from '@/stores/predictions/predictionStore'

describe('AppSidebar', () => {
  beforeEach(() => {
    usePredictionStore.getState().resetFilters()
  })

  it('shows "全部" and "棒球" categories', () => {
    render(<AppSidebar />)
    expect(screen.getByText('全部')).toBeInTheDocument()
    expect(screen.getByText('棒球')).toBeInTheDocument()
  })

  it('does NOT show 籃球 category', () => {
    render(<AppSidebar />)
    expect(screen.queryByText('籃球')).not.toBeInTheDocument()
  })

  it('shows MLB league', () => {
    render(<AppSidebar />)
    expect(screen.getByText('MLB')).toBeInTheDocument()
  })

  it('does NOT show NBA league', () => {
    render(<AppSidebar />)
    expect(screen.queryByText('NBA')).not.toBeInTheDocument()
  })

  it('clicking 棒球 sets sport=mlb', async () => {
    const user = userEvent.setup()
    render(<AppSidebar />)
    await user.click(screen.getByText('棒球'))
    expect(usePredictionStore.getState().sport).toBe('mlb')
  })

  it('renders MARKETS section with three chips', () => {
    render(<AppSidebar />)
    expect(screen.getByText('獨贏')).toBeInTheDocument()
    expect(screen.getByText('讓分')).toBeInTheDocument()
    expect(screen.getByText('大小分')).toBeInTheDocument()
  })

  it('clicking a market chip toggles store', async () => {
    const user = userEvent.setup()
    render(<AppSidebar />)
    await user.click(screen.getByText('讓分'))
    expect(usePredictionStore.getState().markets.has('spread')).toBe(false)
  })

  it('renders 5 star buttons (All / 2+ / 3+ / 4+ / 5)', () => {
    render(<AppSidebar />)
    expect(screen.getByText('全部')).toBeInTheDocument()      // sport "全部" exists too — accept ≥1
    expect(screen.getByText('2+')).toBeInTheDocument()
    expect(screen.getByText('3+')).toBeInTheDocument()
    expect(screen.getByText('4+')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('clicking 4+ sets minStars=4', async () => {
    const user = userEvent.setup()
    render(<AppSidebar />)
    await user.click(screen.getByText('4+'))
    expect(usePredictionStore.getState().minStars).toBe(4)
  })
})
```

- [ ] **Step 2: Run — fail**

- [ ] **Step 3: Rewrite the component**

```tsx
// src/components/layout/AppSidebar.tsx
import { cn } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import {
  usePredictionStore,
  type PredictionFilters,
} from '@/stores/predictions/predictionStore'
import { useRecommendationCounts } from '@/hooks/predictions/useDailyRecommendations'
import { MarketChips } from '@/components/predictions/MarketChips'

const FONT = { fontFamily: 'var(--font-barlow-condensed)' as const }

const SECTION_TITLE =
  'text-[12px] font-bold tracking-[0.2em] uppercase text-[#3a4a5a] mb-2 px-2'

const SIDEBAR_ITEM =
  'flex items-center gap-2 w-full px-2 py-1.5 rounded text-[15px] font-semibold tracking-wide transition-colors cursor-pointer text-[#4a5568] hover:text-[#a0aec0]'

const SIDEBAR_ITEM_ACTIVE = 'bg-[rgba(0,229,160,0.1)] text-[#00e5a0]'

type Sport = PredictionFilters['sport']
type SportCategory = 'all' | 'baseball'

function categoryOf(sport: Sport): SportCategory {
  if (sport === 'mlb') return 'baseball'
  return 'all'
}

function CountBadge({ count }: { count: number }) {
  return (
    <span className="ml-auto text-[13px] bg-[#1e2733] text-[#e2e8f0] rounded px-1.5 py-0.5 font-bold">
      {count}
    </span>
  )
}

function SectionDivider() {
  return <div className="border-t border-[#1a2030] my-1" />
}

const STAR_LEVELS = [1, 2, 3, 4, 5] as const

export function AppSidebar() {
  const { t } = useTranslation()
  const { sport, minStars, setSport, setMinStars } = usePredictionStore()
  const { data: counts = {} } = useRecommendationCounts()
  const totalCount = Object.values(counts).reduce((a, b) => a + b, 0)
  const category = categoryOf(sport)

  const sportButtons: { id: SportCategory; label: string; emoji: string; onSelect: () => void }[] = [
    { id: 'all',      label: t.filter.allSports, emoji: '🏆', onSelect: () => setSport('all') },
    { id: 'baseball', label: t.filter.baseball,  emoji: '⚾', onSelect: () => setSport('mlb') },
  ]

  return (
    <aside
      className="hidden md:flex flex-col w-[200px] fixed left-0 top-[52px] bottom-0 overflow-y-auto border-r border-[#1e2733]"
      style={{ background: '#0f1419' }}
    >
      {/* Sport */}
      <div className="px-2 pt-4 pb-2">
        <div className={SECTION_TITLE} style={FONT}>{t.filter.sport}</div>
        {sportButtons.map((c) => {
          const count =
            c.id === 'all' ? (totalCount > 0 ? totalCount : undefined) : counts['mlb']
          return (
            <button
              key={c.id}
              onClick={c.onSelect}
              className={cn(SIDEBAR_ITEM, category === c.id && SIDEBAR_ITEM_ACTIVE)}
              style={FONT}
            >
              <span>{c.emoji}</span>
              {c.label}
              {count !== undefined && <CountBadge count={count} />}
            </button>
          )
        })}
      </div>

      <SectionDivider />

      {/* Leagues */}
      <div className="px-2 py-3">
        <div className={SECTION_TITLE} style={FONT}>{t.filter.leagues}</div>
        <button
          onClick={() => setSport('mlb')}
          className={cn(SIDEBAR_ITEM, sport === 'mlb' && SIDEBAR_ITEM_ACTIVE)}
          style={FONT}
        >
          MLB
          {counts['mlb'] !== undefined && <CountBadge count={counts['mlb']} />}
        </button>
      </div>

      <SectionDivider />

      {/* Markets */}
      <div className="px-2 py-3">
        <div className={SECTION_TITLE} style={FONT}>{t.filter.markets}</div>
        <MarketChips />
      </div>

      <SectionDivider />

      {/* Min Stars */}
      <div className="px-2 py-3">
        <div className={SECTION_TITLE} style={FONT}>{t.filter.minStars}</div>
        <div className="flex flex-wrap gap-1.5 px-2">
          {STAR_LEVELS.map((n) => {
            const isActive = minStars === n
            const label = n === 1 ? t.filter.starsAll : n === 5 ? '5' : `${n}+`
            return (
              <button
                key={n}
                onClick={() => setMinStars(n)}
                className="px-2 py-1 rounded text-[14px] font-bold tracking-wide transition-all"
                style={{
                  ...FONT,
                  color: isActive ? '#fbbf24' : '#4a5568',
                  background: isActive ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${isActive ? '#fbbf24' : 'transparent'}`,
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>
    </aside>
  )
}
```

- [ ] **Step 4: Run — pass**

```bash
npm run test -- src/test/integration/AppSidebar.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/AppSidebar.tsx src/test/integration/AppSidebar.test.tsx
git commit -m "refactor(layout): rebuild AppSidebar with markets + min-stars"
```

### Task 7.3: `MobileFilterBar` — mirror sidebar

**Files:**
- Modify: `src/components/layout/MobileFilterBar.tsx`

- [ ] **Step 1: Rewrite the component**

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
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet'
import { MarketChips } from '@/components/predictions/MarketChips'

const FONT = { fontFamily: 'var(--font-barlow-condensed)' as const }

const PILL =
  'px-3 py-1.5 rounded-full text-[12px] font-bold tracking-wide transition-colors border shrink-0'

type Sport = PredictionFilters['sport']

const STAR_LEVELS = [1, 2, 3, 4, 5] as const

export function MobileFilterBar() {
  const { t } = useTranslation()
  const { sport, minStars, markets, setSport, setMinStars } = usePredictionStore()

  const sports: { id: Sport; label: string }[] = [
    { id: 'all', label: t.filter.allSports },
    { id: 'mlb', label: t.filter.baseball },
  ]

  const activeFiltersCount =
    (sport !== 'all' ? 1 : 0) +
    (minStars > 1 ? 1 : 0) +
    (markets.size < 3 ? 1 : 0)

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
            style={FONT}
          >
            {s.label}
          </button>
        ))}

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
              style={FONT}
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
                style={{ ...FONT, letterSpacing: '0.1em' }}
              >
                {t.filter.filterButton}
              </SheetTitle>
            </SheetHeader>

            {/* Markets */}
            <div className="mb-6">
              <div
                className="text-[9px] font-bold tracking-[0.2em] uppercase text-[#3a4a5a] mb-3"
                style={FONT}
              >
                {t.filter.markets}
              </div>
              <MarketChips />
            </div>

            {/* Min Stars */}
            <div>
              <div
                className="text-[9px] font-bold tracking-[0.2em] uppercase text-[#3a4a5a] mb-3"
                style={FONT}
              >
                {t.filter.minStars}
              </div>
              <div className="flex gap-2 flex-wrap">
                {STAR_LEVELS.map((n) => {
                  const isActive = minStars === n
                  const label = n === 1 ? t.filter.starsAll : n === 5 ? '5' : `${n}+`
                  return (
                    <button
                      key={n}
                      onClick={() => setMinStars(n)}
                      className="px-4 py-2 rounded-full text-[12px] font-bold tracking-wide transition-all"
                      style={{
                        ...FONT,
                        color: isActive ? '#fbbf24' : '#4a5568',
                        background: isActive ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${isActive ? '#fbbf24' : 'rgba(255,255,255,0.08)'}`,
                      }}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Manual verify by typecheck**

```bash
npm run lint
```

Expected: errors are now down to routes (not yet rewritten) — sidebar/header/mobile compile.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/MobileFilterBar.tsx
git commit -m "refactor(layout): rewrite MobileFilterBar to mirror sidebar"
```

---

## Phase 8 — Routes

### Task 8.1: Update root index redirect

**Files:**
- Modify: `src/routes/index.tsx`

- [ ] **Step 1: Replace contents**

```tsx
// src/routes/index.tsx
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    throw redirect({ to: '/$lang/predictions', params: { lang: 'zh' } })
  },
})
```

- [ ] **Step 2: Commit**

```bash
git add src/routes/index.tsx
git commit -m "refactor(route): root always redirects to /zh/predictions"
```

### Task 8.2: Update `$lang` route

**Files:**
- Modify: `src/routes/$lang/route.tsx`

- [ ] **Step 1: Replace contents**

```tsx
// src/routes/$lang/route.tsx
import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { PredictionsLayout } from '@/components/layout/PredictionsLayout'

export const Route = createFileRoute('/$lang')({
  beforeLoad: ({ params }) => {
    if (params.lang !== 'zh') {
      throw redirect({ to: '/$lang/predictions', params: { lang: 'zh' } })
    }
  },
  component: () => (
    <PredictionsLayout>
      <Outlet />
    </PredictionsLayout>
  ),
})
```

- [ ] **Step 2: Commit**

```bash
git add 'src/routes/$lang/route.tsx'
git commit -m "refactor(route): \$lang accepts only zh"
```

### Task 8.3: Rewrite predictions route

**Files:**
- Modify: `src/routes/$lang/predictions/route.tsx`

- [ ] **Step 1: Replace contents**

```tsx
// src/routes/$lang/predictions/route.tsx
import { createFileRoute } from '@tanstack/react-router'
import { DateScrollBar } from '@/components/predictions/DateScrollBar'
import { SortToggle } from '@/components/predictions/SortToggle'
import { RecommendationGrid } from '@/components/predictions/RecommendationGrid'
import { useDailyRecommendations } from '@/hooks/predictions/useDailyRecommendations'

export const Route = createFileRoute('/$lang/predictions')({
  component: PredictionsPage,
})

function PredictionsPage() {
  const query = useDailyRecommendations()
  return (
    <div className="space-y-4">
      <DateScrollBar />
      <div className="flex items-center justify-end">
        <SortToggle />
      </div>
      <RecommendationGrid {...query} />
    </div>
  )
}
```

- [ ] **Step 2: Run dev server smoke test**

```bash
npm run dev
```

In a browser visit `http://localhost:3001/`. Expected: redirects to `/zh/predictions`. Sidebar shows 全部/棒球/MLB/markets/stars. Empty page (no DB data yet). Console has no React errors.

Stop the dev server with Ctrl+C.

- [ ] **Step 3: Commit**

```bash
git add 'src/routes/$lang/predictions/route.tsx'
git commit -m "refactor(route): predictions page uses RecommendationGrid + SortToggle"
```

---

## Phase 9 — Accuracy page rewrite

### Task 9.1: New `MarketBreakdown` component

**Files:**
- Create: `src/components/accuracy/MarketBreakdown.tsx`
- Create: `src/test/integration/MarketBreakdown.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// src/test/integration/MarketBreakdown.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@tanstack/react-router', () => ({
  useParams: () => ({ lang: 'zh' }),
}))

import { MarketBreakdown } from '@/components/accuracy/MarketBreakdown'
import type { AccuracyBucket } from '@/services/predictions/api'

const empty = (): AccuracyBucket => ({ total: 0, wins: 0, losses: 0, pushes: 0, voids: 0, pct: 0 })

describe('MarketBreakdown', () => {
  it('renders three rows: 獨贏 / 讓分 / 大小分', () => {
    const data = {
      ml: { ...empty(), total: 4, wins: 3, losses: 1, pct: 75 },
      spread: { ...empty(), total: 5, wins: 3, losses: 2, pct: 60 },
      ou: { ...empty(), total: 6, wins: 5, losses: 1, pct: 83.3 },
    }
    render(<MarketBreakdown byMarket={data} />)
    expect(screen.getByText('獨贏')).toBeInTheDocument()
    expect(screen.getByText('讓分')).toBeInTheDocument()
    expect(screen.getByText('大小分')).toBeInTheDocument()
    expect(screen.getByText('75%')).toBeInTheDocument()
    expect(screen.getByText('60%')).toBeInTheDocument()
    expect(screen.getByText('83.3%')).toBeInTheDocument()
  })

  it('renders dash for empty market', () => {
    const data = { ml: empty(), spread: empty(), ou: empty() }
    render(<MarketBreakdown byMarket={data} />)
    expect(screen.getAllByText('—').length).toBe(3)
  })
})
```

- [ ] **Step 2: Run — fail**

- [ ] **Step 3: Write the component**

```tsx
// src/components/accuracy/MarketBreakdown.tsx
import { useTranslation } from '@/lib/i18n'
import type { AccuracyBucket } from '@/services/predictions/api'
import type { Market } from '@/types/predictions/recommendation'

const FONT = { fontFamily: 'var(--font-barlow-condensed)' as const }
const ORDER: Market[] = ['ml', 'spread', 'ou']

interface Props {
  byMarket: Record<Market, AccuracyBucket>
}

function PctBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-1.5 bg-[#1e2733] rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-700"
           style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

export function MarketBreakdown({ byMarket }: Props) {
  const { t } = useTranslation()
  return (
    <div>
      <h2 className="text-[9px] font-bold tracking-[0.2em] uppercase text-[#3a4a5a] mb-3" style={FONT}>
        {t.accuracy.byMarket}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {ORDER.map((m) => {
          const b = byMarket[m]
          const decided = b.wins + b.losses
          return (
            <div key={m} className="rounded-[10px] border border-[#1e2733] bg-[#161b22] px-5 py-4 space-y-3">
              <span className="text-[11px] font-black tracking-[0.2em] uppercase text-[#00e5a0]" style={FONT}>
                {t.market[m]}
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-[28px] font-black text-[#00e5a0]" style={FONT}>
                  {decided > 0 ? `${b.pct}%` : '—'}
                </span>
                <span className="text-[10px] text-[#3a4a5a]" style={FONT}>
                  {b.wins}-{b.losses}
                  {b.pushes > 0 ? ` · ${b.pushes}和` : ''}
                </span>
              </div>
              <PctBar pct={b.pct} color="#00e5a0" />
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run — pass**

- [ ] **Step 5: Commit**

```bash
git add src/components/accuracy/MarketBreakdown.tsx \
        src/test/integration/MarketBreakdown.test.tsx
git commit -m "feat(accuracy): add MarketBreakdown component"
```

### Task 9.2: New `StarBreakdown` component

**Files:**
- Create: `src/components/accuracy/StarBreakdown.tsx`
- Create: `src/test/integration/StarBreakdown.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// src/test/integration/StarBreakdown.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@tanstack/react-router', () => ({
  useParams: () => ({ lang: 'zh' }),
}))

import { StarBreakdown } from '@/components/accuracy/StarBreakdown'
import type { AccuracyBucket } from '@/services/predictions/api'

const empty = (): AccuracyBucket => ({ total: 0, wins: 0, losses: 0, pushes: 0, voids: 0, pct: 0 })

describe('StarBreakdown', () => {
  it('renders 5 rows for ★1..★5', () => {
    const byStars = {
      1: { ...empty(), total: 2, wins: 1, losses: 1, pct: 50 },
      2: { ...empty(), total: 3, wins: 2, losses: 1, pct: 66.7 },
      3: { ...empty(), total: 4, wins: 3, losses: 1, pct: 75 },
      4: { ...empty(), total: 5, wins: 4, losses: 1, pct: 80 },
      5: { ...empty(), total: 6, wins: 6, losses: 0, pct: 100 },
    }
    render(<StarBreakdown byStars={byStars} />)
    expect(screen.getByText('★1')).toBeInTheDocument()
    expect(screen.getByText('★5')).toBeInTheDocument()
    expect(screen.getByText('100%')).toBeInTheDocument()
    expect(screen.getByText('50%')).toBeInTheDocument()
  })

  it('renders — when star tier has no decided games', () => {
    const byStars = {
      1: empty(), 2: empty(), 3: empty(), 4: empty(), 5: empty(),
    }
    render(<StarBreakdown byStars={byStars} />)
    expect(screen.getAllByText('—').length).toBe(5)
  })
})
```

- [ ] **Step 2: Run — fail**

- [ ] **Step 3: Write the component**

```tsx
// src/components/accuracy/StarBreakdown.tsx
import { useTranslation } from '@/lib/i18n'
import type { AccuracyBucket } from '@/services/predictions/api'

const FONT = { fontFamily: 'var(--font-barlow-condensed)' as const }
const STARS = [1, 2, 3, 4, 5] as const

interface Props {
  byStars: Record<number, AccuracyBucket>
}

export function StarBreakdown({ byStars }: Props) {
  const { t } = useTranslation()
  return (
    <div>
      <h2 className="text-[9px] font-bold tracking-[0.2em] uppercase text-[#3a4a5a] mb-3" style={FONT}>
        {t.accuracy.byStars}
      </h2>
      <div className="rounded-[10px] border border-[#1e2733] bg-[#161b22] divide-y divide-[#1e2733]">
        {STARS.map((s) => {
          const b = byStars[s] ?? { total: 0, wins: 0, losses: 0, pushes: 0, voids: 0, pct: 0 }
          const decided = b.wins + b.losses
          return (
            <div key={s} className="flex items-center justify-between px-5 py-3">
              <span className="text-[14px] font-bold text-[#fbbf24]" style={FONT}>★{s}</span>
              <span className="text-[20px] font-black text-[#00e5a0]" style={FONT}>
                {decided > 0 ? `${b.pct}%` : '—'}
              </span>
              <span className="text-[10px] text-[#3a4a5a]" style={FONT}>
                {b.wins}-{b.losses}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run — pass**

- [ ] **Step 5: Commit**

```bash
git add src/components/accuracy/StarBreakdown.tsx \
        src/test/integration/StarBreakdown.test.tsx
git commit -m "feat(accuracy): add StarBreakdown component"
```

### Task 9.3: Rewrite `AccuracyOverview`

**Files:**
- Modify: `src/components/accuracy/AccuracyOverview.tsx`

- [ ] **Step 1: Replace contents**

```tsx
// src/components/accuracy/AccuracyOverview.tsx
import { useTranslation } from '@/lib/i18n'
import type { AccuracyBucket } from '@/services/predictions/api'

const FONT = { fontFamily: 'var(--font-barlow-condensed)' as const }

interface Props {
  overall: AccuracyBucket
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="rounded-[10px] border border-[#1e2733] bg-[#161b22] px-5 py-4 flex flex-col gap-1">
      <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-[#3a4a5a]" style={FONT}>
        {label}
      </span>
      <span className="text-[42px] font-black leading-none" style={{ ...FONT, color }}>{value}</span>
      <span className="text-[11px] text-[#4a5568]" style={FONT}>{sub}</span>
    </div>
  )
}

export function AccuracyOverview({ overall }: Props) {
  const { t } = useTranslation()
  const decided = overall.wins + overall.losses
  const record = `${overall.wins}-${overall.losses}`
  const pctText = decided > 0 ? `${overall.pct}%` : '—'

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <StatCard
        label={t.accuracy.totalRecs}
        value={String(overall.total)}
        sub={t.accuracy.record + ' ' + record}
        color="#a0aec0"
      />
      <StatCard
        label={t.accuracy.overall}
        value={pctText}
        sub={record}
        color="#00e5a0"
      />
      <StatCard
        label={t.accuracy.byMarket}
        value={overall.pushes > 0 ? `${overall.pushes}` : '0'}
        sub={t.result.push + ' / ' + t.result.void + ': ' + overall.voids}
        color="#fbbf24"
      />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/accuracy/AccuracyOverview.tsx
git commit -m "refactor(accuracy): rebuild AccuracyOverview for new buckets"
```

### Task 9.4: Rewrite `AccuracyTrend`

**Files:**
- Modify: `src/components/accuracy/AccuracyTrend.tsx`

- [ ] **Step 1: Read existing imports** (to keep ApexCharts setup)

```bash
sed -n '1,40p' src/components/accuracy/AccuracyTrend.tsx
```

- [ ] **Step 2: Replace contents**

```tsx
// src/components/accuracy/AccuracyTrend.tsx
import ReactApexChart from 'react-apexcharts'
import { useTranslation } from '@/lib/i18n'
import type { AccuracyData } from '@/services/predictions/api'

const FONT = { fontFamily: 'var(--font-barlow-condensed)' as const }

interface Props {
  daily: AccuracyData['daily']
}

export function AccuracyTrend({ daily }: Props) {
  const { t } = useTranslation()
  const series = [
    { name: t.accuracy.overall, data: daily.map((d) => d.pct) },
  ]
  const options = {
    chart: { type: 'line' as const, toolbar: { show: false }, background: 'transparent' },
    theme: { mode: 'dark' as const },
    xaxis: {
      categories: daily.map((d) => d.date),
      labels: { style: { colors: '#4a5568', fontFamily: 'var(--font-barlow-condensed)' } },
    },
    yaxis: {
      min: 0, max: 100,
      labels: { style: { colors: '#4a5568', fontFamily: 'var(--font-barlow-condensed)' } },
    },
    colors: ['#00e5a0'],
    stroke: { width: 2, curve: 'smooth' as const },
    grid: { borderColor: '#1e2733' },
    tooltip: { theme: 'dark' },
    dataLabels: { enabled: false },
  }

  return (
    <div>
      <h2 className="text-[9px] font-bold tracking-[0.2em] uppercase text-[#3a4a5a] mb-3" style={FONT}>
        {t.accuracy.trend}
      </h2>
      <div className="rounded-[10px] border border-[#1e2733] bg-[#161b22] p-4">
        <ReactApexChart options={options} series={series} type="line" height={252} />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/accuracy/AccuracyTrend.tsx
git commit -m "refactor(accuracy): rebuild AccuracyTrend chart for daily pct"
```

### Task 9.5: Rewrite the accuracy route

**Files:**
- Modify: `src/routes/$lang/accuracy/route.tsx`

- [ ] **Step 1: Replace contents**

```tsx
// src/routes/$lang/accuracy/route.tsx
import { lazy, Suspense } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from '@/lib/i18n'
import { useAccuracyData } from '@/hooks/predictions/useAccuracyStats'
import { AccuracyOverview } from '@/components/accuracy/AccuracyOverview'
import { MarketBreakdown } from '@/components/accuracy/MarketBreakdown'
import { StarBreakdown } from '@/components/accuracy/StarBreakdown'
import { Skeleton } from '@/components/ui/skeleton'

const AccuracyTrend = lazy(() =>
  import('@/components/accuracy/AccuracyTrend').then((m) => ({ default: m.AccuracyTrend })),
)

export const Route = createFileRoute('/$lang/accuracy')({
  component: AccuracyPage,
})

const FONT = { fontFamily: 'var(--font-barlow-condensed)' as const }

function PageSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 rounded-[10px] bg-[#1e2733]" />)}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-32 rounded-[10px] bg-[#1e2733]" />)}
      </div>
      <Skeleton className="h-[260px] rounded-[10px] bg-[#1e2733]" />
    </div>
  )
}

function AccuracyPage() {
  const { t } = useTranslation()
  const { data, isLoading, isError } = useAccuracyData()

  if (isLoading) return <PageSkeleton />

  if (isError || !data) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-[#4a5568] text-sm" style={FONT}>{t.accuracy.noData}</p>
      </div>
    )
  }

  if (data.overall.total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-2">
        <p className="text-[14px] font-bold text-[#00e5a0]" style={FONT}>{t.accuracy.title}</p>
        <p className="text-[#4a5568] text-sm max-w-xs" style={FONT}>{t.accuracy.noData}</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-[13px] font-black tracking-[0.2em] uppercase text-[#00e5a0]" style={FONT}>
        {t.accuracy.title}
      </h1>

      <AccuracyOverview overall={data.overall} />
      <MarketBreakdown byMarket={data.byMarket} />
      <StarBreakdown byStars={data.byStars} />

      {data.daily.length > 1 ? (
        <Suspense fallback={<Skeleton className="h-[260px] rounded-[10px] bg-[#1e2733]" />}>
          <AccuracyTrend daily={data.daily} />
        </Suspense>
      ) : null}
    </div>
  )
}
```

- [ ] **Step 2: Verify dev**

```bash
npm run dev
```

Visit `http://localhost:3001/zh/accuracy`. Expected: empty-state message ("尚無已結算推薦").

- [ ] **Step 3: Commit**

```bash
git add 'src/routes/$lang/accuracy/route.tsx'
git commit -m "refactor(route): rebuild accuracy page with market/star breakdowns"
```

---

## Phase 10 — Backend ingest API rewrite

### Task 10.1: Look up game by natural key — shared helper

**Files:**
- Modify: `src/lib/predictions/ingest-helpers.ts` (append helper)

- [ ] **Step 1: Add a small `gameKey` helper for response diagnostics**

Append at the end of the file:

```ts
export function gameKey(home_team: string, away_team: string, game_time: string): string {
  return `${home_team}-vs-${away_team}@${game_time}`
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/predictions/ingest-helpers.ts
git commit -m "chore(ingest): add gameKey helper for diagnostics"
```

### Task 10.2: Rewrite `api/ingest/predictions.ts`

**Files:**
- Modify: `api/ingest/predictions.ts`

- [ ] **Step 1: Replace contents**

```ts
/// <reference types="node" />
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import {
  gameKey,
  validatePredictionsPayload,
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
    payload = validatePredictionsPayload(req.body)
  } catch (err) {
    return res.status(400).json({ error: (err as Error).message })
  }

  const supabase = getSupabase()

  const { data: teams, error: teamsErr } = await supabase
    .from('teams')
    .select('id, abbreviation')
    .eq('sport_id', 'mlb')

  if (teamsErr || !teams) {
    return res.status(500).json({ error: 'Failed to load teams' })
  }

  const teamByAbbr = new Map(teams.map((t) => [t.abbreviation.toUpperCase(), t.id as string]))

  const results: IngestItemResult[] = []
  let upserted = 0
  let totalRecs = 0
  let errors = 0

  for (const g of payload.games) {
    const key = gameKey(g.home_team, g.away_team, g.game_time)
    const homeId = teamByAbbr.get(g.home_team.toUpperCase())
    const awayId = teamByAbbr.get(g.away_team.toUpperCase())

    if (!homeId || !awayId) {
      results.push({ game: key, status: 'error', error: `Unknown team(s): ${g.home_team}/${g.away_team}` })
      errors++
      continue
    }

    // Upsert game by natural key
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

    if (gameErr || !gameRows?.length) {
      results.push({ game: key, status: 'error', error: gameErr?.message ?? 'Game upsert returned no id' })
      errors++
      continue
    }

    const gameId = gameRows[0].id as string

    // Source-of-truth: delete all existing recs for this game, then insert new ones
    const { error: delErr } = await supabase
      .from('recommendations')
      .delete()
      .eq('game_id', gameId)

    if (delErr) {
      results.push({ game: key, status: 'error', error: `Failed to clear recs: ${delErr.message}` })
      errors++
      continue
    }

    if (g.recommendations.length > 0) {
      const insertRows = g.recommendations.map((r) => ({
        game_id: gameId,
        market: r.market,
        pick: r.pick,
        line: r.line,
        stars: r.stars,
      }))
      const { error: insErr } = await supabase.from('recommendations').insert(insertRows)
      if (insErr) {
        results.push({ game: key, status: 'error', error: insErr.message })
        errors++
        continue
      }
      totalRecs += g.recommendations.length
    }

    results.push({ game: key, status: 'upserted', recs_written: g.recommendations.length })
    upserted++
  }

  const total = payload.games.length
  const status = errors === 0 ? 200 : upserted === 0 ? 500 : 207
  return res.status(status).json({ total, upserted, total_recs: totalRecs, errors, results })
}
```

- [ ] **Step 2: Commit**

```bash
git add api/ingest/predictions.ts
git commit -m "refactor(api): rewrite predictions ingest for new schema"
```

### Task 10.3: Rewrite `api/ingest/results.ts`

**Files:**
- Modify: `api/ingest/results.ts`

- [ ] **Step 1: Replace contents**

```ts
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

  if (teamsErr || !teams) {
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

    if (gameFindErr || !gameRows?.length) {
      results.push({ game: key, status: 'no_game', error: 'Game not found; ingest schedule/predictions first' })
      errors++
      continue
    }

    const gameId = gameRows[0].id as string

    // Update game with score + status
    const { error: gameUpdateErr } = await supabase
      .from('games')
      .update({
        home_score: item.home_score,
        away_score: item.away_score,
        status: 'final',
      })
      .eq('id', gameId)

    if (gameUpdateErr) {
      results.push({ game: key, status: 'error', error: gameUpdateErr.message })
      errors++
      continue
    }

    // Apply per-market results
    let recsWritten = 0
    for (const r of item.recommendations) {
      const { error: updErr } = await supabase
        .from('recommendations')
        .update({ result: r.result })
        .eq('game_id', gameId)
        .eq('market', r.market)
      if (updErr) {
        results.push({ game: `${key}:${r.market}`, status: 'error', error: updErr.message })
        errors++
        continue
      }
      recsWritten++
    }

    results.push({ game: key, status: 'upserted', recs_written: recsWritten })
    upserted++
  }

  const total = payload.results.length
  const status = errors === 0 ? 200 : upserted === 0 ? 500 : 207
  return res.status(status).json({ total, upserted, errors, results })
}
```

- [ ] **Step 2: Commit**

```bash
git add api/ingest/results.ts
git commit -m "refactor(api): rewrite results ingest for new schema"
```

### Task 10.4: Update `api/ingest/schedule.ts`

**Files:**
- Modify: `api/ingest/schedule.ts`

- [ ] **Step 1: Replace contents**

```ts
/// <reference types="node" />
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import {
  gameKey,
  validateSchedulePayload,
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
    payload = validateSchedulePayload(req.body)
  } catch (err) {
    return res.status(400).json({ error: (err as Error).message })
  }

  const supabase = getSupabase()

  const { data: teams, error: teamsErr } = await supabase
    .from('teams')
    .select('id, abbreviation')
    .eq('sport_id', 'mlb')

  if (teamsErr || !teams) {
    return res.status(500).json({ error: 'Failed to load teams' })
  }

  const teamByAbbr = new Map(teams.map((t) => [t.abbreviation.toUpperCase(), t.id as string]))

  const results: IngestItemResult[] = []
  let upserted = 0
  let errors = 0

  for (const game of payload.games) {
    const key = gameKey(game.home_team, game.away_team, game.game_time)
    const homeId = teamByAbbr.get(game.home_team.toUpperCase())
    const awayId = teamByAbbr.get(game.away_team.toUpperCase())

    if (!homeId || !awayId) {
      results.push({ game: key, status: 'error', error: `Unknown team(s): ${game.home_team}/${game.away_team}` })
      errors++
      continue
    }

    const { error: dbErr } = await supabase
      .from('games')
      .upsert(
        {
          sport_id: 'mlb',
          home_team_id: homeId,
          away_team_id: awayId,
          game_date: payload.date,
          game_time: game.game_time,
          status: 'scheduled',
        },
        { onConflict: 'game_date,home_team_id,away_team_id,game_time' },
      )

    if (dbErr) {
      results.push({ game: key, status: 'error', error: dbErr.message })
      errors++
      continue
    }

    results.push({ game: key, status: 'upserted' })
    upserted++
  }

  const total = payload.games.length
  const status = errors === 0 ? 200 : upserted === 0 ? 500 : 207
  return res.status(status).json({ total, upserted, errors, results })
}
```

- [ ] **Step 2: Commit**

```bash
git add api/ingest/schedule.ts
git commit -m "refactor(api): update schedule ingest for new games schema"
```

### Task 10.5: Update sitemap

**Files:**
- Modify: `api/sitemap.xml.ts`

- [ ] **Step 1: Replace contents**

```ts
/// <reference types="node" />
import type { VercelRequest, VercelResponse } from '@vercel/node'

const BASE_URL = 'https://ai-sports-prediction.vercel.app'

function escXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export default function handler(_req: VercelRequest, res: VercelResponse) {
  const urls: string[] = [
    `<url><loc>${escXml(BASE_URL + '/')}</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`,
    `<url><loc>${escXml(BASE_URL + '/zh/predictions')}</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`,
    `<url><loc>${escXml(BASE_URL + '/zh/accuracy')}</loc><changefreq>daily</changefreq><priority>0.8</priority></url>`,
  ]

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urls.join('\n  ')}
</urlset>`

  res.setHeader('Content-Type', 'text/xml; charset=utf-8')
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')
  return res.status(200).send(xml)
}
```

- [ ] **Step 2: Commit**

```bash
git add api/sitemap.xml.ts
git commit -m "refactor(api): collapse sitemap to static zh-only routes"
```

---

## Phase 11 — Test cleanup and self-check

### Task 11.1: Run the full test suite

**Files:** none

- [ ] **Step 1: Run tests**

```bash
npm run test
```

Expected: all tests pass.

If failures appear, they will most likely be:

| Failure | Fix |
|---------|-----|
| `pct.test.ts` references `pct` from old api | Update import to `@/services/predictions/api` if signature kept; otherwise delete this test |
| `resolveDateRange.test.ts` references removed export | Delete the test (function no longer exists in service) |
| `timezone.test.ts` references `toLocalTimeString` etc | Should still pass; if asserting UTC behavior that we now bypass, update or delete the assertion |

Apply minimal fixes:

```bash
# If pct/resolveDateRange tests are no longer relevant:
git rm src/test/unit/pct.test.ts src/test/unit/resolveDateRange.test.ts
```

(Skip if they pass.)

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: clean. If there are unused-import warnings from leftovers, fix in place.

- [ ] **Step 3: Build**

```bash
npm run build
```

Expected: vitest passes, vite build succeeds, tsc passes.

- [ ] **Step 4: Commit any clean-up changes**

```bash
git add -A
git diff --cached --stat
git commit -m "chore(test): drop obsolete utility tests / unused imports" || true
```

(`|| true` because there may be no changes if everything passed already.)

### Task 11.2: Regenerate routeTree

**Files:**
- Modify: `src/routeTree.gen.ts` (auto-generated)

- [ ] **Step 1: Force re-generation**

```bash
rm src/routeTree.gen.ts 2>/dev/null
npm run dev
```

Wait until you see `Generating route tree...` and the dev server starts. Stop the server.

- [ ] **Step 2: Verify**

```bash
git status
```

`src/routeTree.gen.ts` should appear modified.

- [ ] **Step 3: Verify it does not reference deleted routes**

```bash
grep -E '\$sport|\$slug' src/routeTree.gen.ts
```

Expected: no matches (or only in comments).

- [ ] **Step 4: Commit**

```bash
git add src/routeTree.gen.ts
git commit -m "chore(router): regenerate routeTree without detail page"
```

---

## Phase 12 — End-to-end manual validation

### Task 12.1: Smoke test with seeded data

**Files:** none

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Send a test predictions payload**

In another terminal (or a curl-friendly tool):

```bash
curl -X POST http://localhost:3001/api/ingest/predictions \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-04-29",
    "games": [
      {
        "home_team": "LAD", "away_team": "SD",
        "game_time": "2026-04-29 22:10:00",
        "recommendations": [
          { "market": "ml", "pick": "home", "line": null, "stars": 4 },
          { "market": "spread", "pick": "home", "line": -1.5, "stars": 4 },
          { "market": "ou", "pick": "over", "line": 8.5, "stars": 5 }
        ]
      },
      {
        "home_team": "NYY", "away_team": "BOS",
        "game_time": "2026-04-29 19:05:00",
        "recommendations": [
          { "market": "ou", "pick": "under", "line": 7.5, "stars": 3 }
        ]
      }
    ]
  }'
```

Expected: HTTP 200 with `{"total":2,"upserted":2,"total_recs":4,"errors":0,...}`.

- [ ] **Step 3: Open `http://localhost:3001/`**

Expected:
- Redirects to `/zh/predictions`
- Sidebar shows: 全部 (4)、棒球 (4)、MLB (4)、3 market chips active、★全部 active
- 4 cards rendered (one per recommendation)
- Header: AISports + 今日推薦 + 準確率 (no language toggle)

- [ ] **Step 4: Filter combinations**

Click various combinations and verify:
- Click `獨贏` chip alone → only 1 card (LAD ML 4★)
- Click `★4+` → 3 cards visible (LAD ML 4★, LAD Spread 4★, LAD OU 5★) but NOT NYY OU 3★
- Click `★5` → 1 card (LAD OU 5★)
- Click `星數` toggle to `依時間` → cards reorder by game time
- Click 棒球 then back to 全部 → counts/cards consistent
- Deselect all 3 markets → "請至少勾選一個市場" message

- [ ] **Step 5: Send a results payload**

```bash
curl -X POST http://localhost:3001/api/ingest/results \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-04-29",
    "results": [
      {
        "home_team": "LAD", "away_team": "SD",
        "game_time": "2026-04-29 22:10:00",
        "home_score": 5, "away_score": 3,
        "recommendations": [
          { "market": "ml", "result": "win" },
          { "market": "spread", "result": "win" },
          { "market": "ou", "result": "loss" }
        ]
      }
    ]
  }'
```

Expected HTTP 200 with `upserted:1`.

- [ ] **Step 6: Verify badges and accuracy**

- Refresh `/zh/predictions` for date 2026-04-29: LAD cards show 贏 / 贏 / 輸 badges; NYY card has no badge (no result)
- Open `/zh/accuracy`: Overall = 67% (2-1), Market breakdown shows 獨贏 100%, 讓分 100%, 大小分 0%, Star breakdown shows ★4 100%, ★5 0%

- [ ] **Step 7: Sitemap**

```bash
curl http://localhost:3001/api/sitemap.xml
```

Expected: 3 URLs (/, /zh/predictions, /zh/accuracy). No detail page URLs.

- [ ] **Step 8: Old detail URL should 404 cleanly**

Visit `http://localhost:3001/zh/mlb/lad-vs-sd-2026-04-29` — expected: TanStack Router renders its default not-found UI (no detail route exists). The app must not crash. If a soft-redirect is wanted later, add a `notFoundComponent` on the root route — out of scope for this refactor.

- [ ] **Step 9: Stop dev server**

`Ctrl+C`.

- [ ] **Step 10: Final build**

```bash
npm run build
```

Expected: tests pass, build succeeds.

- [ ] **Step 11: Commit**

```bash
git status
```

If any auto-formatting / artifact changes appeared, commit; otherwise no commit needed.

### Task 12.2: Cleanup and PR

**Files:** none

- [ ] **Step 1: Restore stashed typography work** (optional)

```bash
git stash list
```

If the stash from Phase 0 is still there and the user wants those typography changes preserved, re-apply them on the new files. Otherwise drop:

```bash
git stash drop
```

(Confirm with the user before dropping.)

- [ ] **Step 2: Push branch**

```bash
git push -u origin feat/refactor-recommendations
```

- [ ] **Step 3: Open PR**

Use the GitHub UI or `gh pr create`. Title: `refactor: rebuild app around recommendations`. Body should reference the spec at `docs/superpowers/specs/2026-04-29-prediction-app-refactor-design.md`.

---

## Self-Review Notes

Spec coverage check (every spec section maps to at least one task):

| Spec section | Implementing task(s) |
|---|---|
| Drop predictions/results/games | Task 1.1 |
| New games schema (Taiwan TIMESTAMP, status, scores, UNIQUE) | Task 1.2 |
| New recommendations schema (PK + checks + result) | Task 1.2 |
| RLS policies | Task 1.2 |
| Recommendation row & joined types | Task 2.1, 2.2 |
| Ingest payload types | Task 2.2 |
| Ingest validators | Task 2.3 |
| Delete detail page surfaces | Task 3.1 |
| Drop EN locale | Task 3.1 + 4.1 |
| Store: markets Set + sortBy | Task 5.1 |
| Service: fetchDailyRecommendations | Task 5.2 |
| Service: accuracy aggregation | Task 5.2 |
| Hooks: useDailyRecommendations etc | Task 5.3 |
| MarketChips | Task 6.1 |
| SortToggle | Task 6.2 |
| RecommendationCard | Task 6.3 |
| RecommendationGrid | Task 6.4 |
| AppHeader without lang switch | Task 7.1 |
| AppSidebar redesign | Task 7.2 |
| MobileFilterBar redesign | Task 7.3 |
| Root redirect | Task 8.1 |
| $lang fixed to zh | Task 8.2 |
| /predictions route | Task 8.3 |
| MarketBreakdown | Task 9.1 |
| StarBreakdown | Task 9.2 |
| AccuracyOverview rewrite | Task 9.3 |
| AccuracyTrend rewrite | Task 9.4 |
| /accuracy route | Task 9.5 |
| Predictions ingest API | Task 10.2 |
| Results ingest API | Task 10.3 |
| Schedule ingest API | Task 10.4 |
| Sitemap update | Task 10.5 |
| Test sweep | Task 11.1 |
| RouteTree regen | Task 11.2 |
| E2E validation | Task 12.1 |
| PR | Task 12.2 |
