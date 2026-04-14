# Q3: Unit & Integration Tests Design

## Overview

Add unit tests for pure utility functions and integration tests for key UI components using Vitest + React Testing Library. The test runner (Vitest) is already installed and `npm run test` is configured, but no test files exist yet.

## Test Setup

### Dependencies to Install

```bash
npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

### Vitest Configuration

Create or extend `vitest.config.ts` at project root:

```ts
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

### Test Setup File

Create `src/test/setup.ts`:

```ts
import '@testing-library/jest-dom'
```

## Unit Tests (Pure Functions)

These functions have no external dependencies and can be tested directly.

### 1. `deriveConfidence` — `api/cron/ingest-predictions.ts:17-22`

**Test file**: `src/test/unit/deriveConfidence.test.ts`

Must export the function or extract to a shared module for testing.

| Input (`homeWinPct`) | Edge (`|x - 50|`) | Expected |
|----------------------|-------------------|----------|
| 75 | 25 | `'high'` |
| 25 | 25 | `'high'` |
| 62 | 12 | `'medium'` |
| 38 | 12 | `'medium'` |
| 55 | 5 | `'low'` |
| 50 | 0 | `'low'` |
| 70.01 | 20.01 | `'high'` (boundary: > 20) |
| 70 | 20 | `'medium'` (boundary: exactly 20, not > 20) |
| 60.01 | 10.01 | `'medium'` (boundary: > 10) |
| 60 | 10 | `'low'` (boundary: exactly 10, not > 10) |

### 2. `generateSlug` — `api/cron/ingest-predictions.ts:24-26`

**Test file**: `src/test/unit/generateSlug.test.ts`

| Home | Away | Date | Expected |
|------|------|------|----------|
| `"lakers"` | `"celtics"` | `"2026-04-12"` | `"lakers-vs-celtics-2026-04-12"` |
| `"warriors"` | `"heat"` | `"2026-01-01"` | `"warriors-vs-heat-2026-01-01"` |

### 3. `validateInput` — `api/cron/ingest-predictions.ts:28-54`

**Test file**: `src/test/unit/validateInput.test.ts`

| Case | Input | Expected |
|------|-------|----------|
| Valid input | Complete valid object | Returns parsed input |
| Non-object body | `null`, `"string"`, `123` | Throws "Request body must be a JSON object" |
| Invalid date | `{ date: "04-12-2026", ... }` | Throws "date must be YYYY-MM-DD" |
| Invalid sport | `{ sport: "nfl", ... }` | Throws 'sport must be "nba" or "mlb"' |
| Empty predictions | `{ predictions: [], ... }` | Throws "predictions must be a non-empty array" |
| Missing field | Prediction without `home_team` | Throws "predictions[0].home_team is required" |
| Non-number pct | `home_win_pct: "60"` | Throws "win percentages must be numbers" |
| Sum ≠ 100 | `home_win_pct: 60, away_win_pct: 30` | Throws "must equal 100" |
| Sum ≈ 100 | `home_win_pct: 60.005, away_win_pct: 39.999` | Passes (within ±0.01) |

### 4. `buildSportsEventSchema` — `src/lib/predictions/seo.ts:3-31`

**Test file**: `src/test/unit/seo.test.ts`

| Case | Expected |
|------|----------|
| NBA game, scheduled | `@type: "SportsEvent"`, `sport: "Basketball"`, no `eventStatus` |
| MLB game, final with scores | `sport: "Baseball"`, `eventStatus: "EventCompleted"`, scores in `result` |
| `location.name` | Uses home team English name |

### 5. `buildPageTitle` — `src/lib/predictions/seo.ts:33-40`

**Test file**: same as above (`src/test/unit/seo.test.ts`)

| Lang | Expected format |
|------|----------------|
| `"en"` | `"{away_name_en} vs {home_name_en} AI Prediction \| NBA \| AISports"` |
| `"zh"` | `"{away_name_zh} vs {home_name_zh} AI 預測 \| NBA \| AISports"` |

### 6. `resolveDateRange` — `src/services/predictions/api.ts:42-59`

**Test file**: `src/test/unit/resolveDateRange.test.ts`

| Input | Expected |
|-------|----------|
| `'today'` | `{ from: <today>, to: <today> }` |
| `'tomorrow'` | `{ from: <tomorrow>, to: <tomorrow> }` |
| `'week'` | `{ from: <today>, to: <end of week> }` |
| `'2026-04-15'` | `{ from: '2026-04-15', to: '2026-04-15' }` |

### 7. `pct` — `src/services/predictions/api.ts:134-137`

**Test file**: `src/test/unit/pct.test.ts`

| Correct | Total | Expected |
|---------|-------|----------|
| 1 | 3 | `33.3` |
| 2 | 3 | `66.7` |
| 0 | 5 | `0` |
| 5 | 5 | `100` |
| 0 | 0 | `0` (division by zero guard needed — verify current behavior) |

## Integration Tests (UI Components)

These require React Testing Library with mocked data. No real Supabase calls.

### 8. Prediction Store — `src/stores/predictions/predictionStore.ts`

**Test file**: `src/test/integration/predictionStore.test.ts`

| Action | Expected State |
|--------|---------------|
| Initial state | `sport: 'all'`, `dateRange: 'today'`, `confidence: []`, `direction: 'all'` |
| `setSport('nba')` | `sport: 'nba'` |
| `setDateRange('week')` | `dateRange: 'week'` |
| `toggleConfidence('high')` | `confidence: ['high']` |
| `toggleConfidence('high')` again | `confidence: []` (toggle off) |
| `toggleConfidence('high')` then `toggleConfidence('medium')` | `confidence: ['high', 'medium']` |
| `setDirection('home')` | `direction: 'home'` |
| `resetFilters()` | Back to initial state |

### 9. GameCard — `src/components/predictions/GameCard.tsx`

**Test file**: `src/test/integration/GameCard.test.tsx`

| Case | Expected |
|------|----------|
| Renders with valid game data | Shows team abbreviations, win %, O/U line |
| Confidence badge styling | `high` → green, `medium` → yellow, `low` → grey |
| Links to detail page | `href` contains `/{lang}/{sport}/{slug}` |
| No predictions array | Renders nothing |

### 10. GameGrid — `src/components/predictions/GameGrid.tsx`

**Test file**: `src/test/integration/GameGrid.test.tsx`

| Case | Expected |
|------|----------|
| Loading state | 4 skeleton cards visible |
| Error state | Error message + retry button |
| Empty data, no filters | "Predictions are usually updated..." message |
| Empty data, with filters | "No predictions match..." + reset button |
| With games | Renders correct number of GameCard components |

### 11. WinProbabilityBar — `src/components/predictions/WinProbabilityBar.tsx`

**Test file**: `src/test/integration/WinProbabilityBar.test.tsx`

| Case | Expected |
|------|----------|
| 60/40 split | Home bar width ≈ 60%, shows "60.0%" and "40.0%" |
| 50/50 split | Equal bars |
| Labels | Correct home/away labels displayed |

### 12. OverUnderDisplay — `src/components/predictions/OverUnderDisplay.tsx`

**Test file**: `src/test/integration/OverUnderDisplay.test.tsx`

| Case | Expected |
|------|----------|
| `overUnderLine = null` | Shows winner pick only, no O/U line |
| `overPct = 55, underPct = 45` | Shows "Over" pick with ▲ icon |
| `overPct = 40, underPct = 60` | Shows "Under" pick with ▼ icon |

### 13. AppHeader (Language Switcher) — `src/components/layout/AppHeader.tsx`

**Test file**: `src/test/integration/AppHeader.test.tsx`

| Case | Expected |
|------|----------|
| Default state | Shows "EN" toggle, nav links |
| Click language toggle | Navigates to `/zh/...` path |
| Active nav link | Current page link has active styling |

## Extracting Functions for Testability

The helper functions `deriveConfidence`, `generateSlug`, and `validateInput` are currently defined inside `api/cron/ingest-predictions.ts` (a Vercel serverless function). To test them without importing the full handler:

**Option A (recommended)**: Extract to `src/lib/predictions/ingest-helpers.ts` and import in both the API route and tests.

**Option B**: Test via API integration tests only (covered in Q1 spec).

The spec recommends Option A — extract pure functions into a shared module.

## File Structure

```
src/
  test/
    setup.ts                              ← Testing Library setup
    unit/
      deriveConfidence.test.ts
      generateSlug.test.ts
      validateInput.test.ts
      seo.test.ts
      resolveDateRange.test.ts
      pct.test.ts
    integration/
      predictionStore.test.ts
      GameCard.test.tsx
      GameGrid.test.tsx
      WinProbabilityBar.test.tsx
      OverUnderDisplay.test.tsx
      AppHeader.test.tsx
  lib/
    predictions/
      ingest-helpers.ts                   ← Extracted from API route
```

## Run Command

```bash
npm test                    # vitest run (CI)
npx vitest --watch          # watch mode (dev)
npx vitest run --coverage   # with coverage report
```
