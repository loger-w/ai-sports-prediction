# Manual Ingest Pipeline — Design Spec

**Date:** 2026-04-14
**Status:** Draft — pending user review
**Scope:** MLB only (NBA deferred)

## Overview

Replace the ESPN-based automated cron pipeline with a three-endpoint manual ingest API driven by a Claude Skill. The skill generates schedule, predictions, and results JSON, then POSTs each to its corresponding endpoint. The frontend reads exclusively from Supabase.

This design intentionally makes the smallest possible change to existing database schema and frontend code. All new skill-specific data lives in additive columns; no existing columns are dropped or renamed.

## Goals

1. **Decouple from ESPN** — the skill has full control over schedule, predictions, and result judgment. No runtime dependency on third-party APIs.
2. **Single source of truth for result judgment** — the skill pre-calculates `WIN / LOSS / PUSH / PASS` for each market. Backend stores verbatim, does no correctness math.
3. **Minimal schema churn** — add only the columns the skill actually populates. Leave legacy columns in place (zero impact on existing pages).
4. **Natural-key addressing** — the skill never needs to query the backend for IDs. It POSTs by `(date, home_team, away_team, game_time)` and the backend resolves.
5. **Idempotent** — re-POSTing the same payload is safe. Every upsert operation uses natural keys so retries cannot create duplicates.

## Non-Goals

- NBA support (deferred; schema remains sport-agnostic so NBA can be added later without migration).
- Multi-version predictions. One game = one prediction; `model_version` is pinned to `'v1'` forever.
- Automated ESPN cron jobs (`ingest-schedule.ts`, `resolve-results.ts` become unused; `vercel.json` cron entries are removed).
- Game detail page (`/$lang/$sport/$slug`). No `explanation_en` / `explanation_zh` will be populated, so the detail page's analysis section becomes empty. The route still exists but will not be updated in this phase.
- Backend calculation of prediction correctness. The skill is authoritative.
- Storage of MLB-specific metadata (starting pitcher, park factor, weather, umpire, analysis reasoning). These are explicitly out of scope — the skill may compute with them internally but they are not persisted.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Claude Skill (local)                                         │
│                                                               │
│  Stage 1 (optional):  schedule.json                           │
│  Stage 2 (required):  predictions.json  ── includes game info │
│  Stage 3 (required):  results.json      ── after games end    │
└──────────────────────────┬──────────────────────────────────┘
                            │  POST JSON (Bearer auth)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Vercel Serverless Functions                                  │
│                                                               │
│  POST /api/ingest/schedule     ← upsert games only            │
│  POST /api/ingest/predictions  ← upsert games + predictions   │
│  POST /api/ingest/results      ← update games + insert        │
│                                  prediction_results           │
└──────────────────────────┬──────────────────────────────────┘
                            │  service-role SQL
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Supabase (PostgreSQL)                                        │
│                                                               │
│  sports  ◄── lookup                                          │
│  teams   ◄── lookup (abbreviation → id)                      │
│  games                                                       │
│  predictions                                                 │
│  prediction_results                                          │
└──────────────────────────┬──────────────────────────────────┘
                            │  read-only (anon key)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Frontend SPA (unchanged)                                     │
│                                                               │
│  Reads predictions via existing services/predictions/api.ts  │
└─────────────────────────────────────────────────────────────┘
```

Flow is strictly one-directional: skill → API → DB → frontend. There is no communication back from backend to skill beyond the response JSON.

## Database Changes

One new migration file. **Additive only** — no drops, no renames.

### `supabase/migrations/005_manual_ingest_pipeline.sql`

```sql
-- 005_manual_ingest_pipeline.sql
-- Additive schema for the manual ingest pipeline.

-- 1. Add over/under recommendation column to predictions.
--    (moneyline/run_line picks already exist as moneyline_pick / spread_pick.)
ALTER TABLE predictions
  ADD COLUMN IF NOT EXISTS ou_rec TEXT
    CHECK (ou_rec IN ('over', 'under'));

-- 2. Add per-market result columns to prediction_results.
--    These carry the skill-calculated verdict verbatim.
--    Existing boolean columns (winner_correct, over_under_correct,
--    spread_correct) remain in place and are dual-written by the new
--    ingest API for accuracy-dashboard backward compatibility
--    (see spec §Legacy columns for the mapping).
ALTER TABLE prediction_results
  ADD COLUMN IF NOT EXISTS ml_result TEXT
    CHECK (ml_result IN ('WIN', 'LOSS', 'PUSH', 'PASS')),
  ADD COLUMN IF NOT EXISTS ou_result TEXT
    CHECK (ou_result IN ('WIN', 'LOSS', 'PUSH', 'PASS')),
  ADD COLUMN IF NOT EXISTS run_line_result TEXT
    CHECK (run_line_result IN ('WIN', 'LOSS', 'PUSH', 'PASS'));
```

### Field mapping (skill → existing column)

| Skill field | Table.column | Note |
|---|---|---|
| `home_team`, `away_team` | `games.home_team_id`, `games.away_team_id` | Resolved via `teams.abbreviation` lookup |
| `game_time` | `games.game_time` | ISO 8601 UTC |
| `game_date` | `games.game_date` | `YYYY-MM-DD` |
| `predicted_winner` | `predictions.moneyline_pick` | `'home' \| 'away'` |
| `predicted_home_pct` | `predictions.moneyline_home_pct` | 0–100. Away = 100 − home (derived, not stored) |
| `ml_stars` | `predictions.moneyline_stars` | 1–5 |
| `ou_line` | `predictions.over_under_line` | e.g. `8.5` |
| `ou_rec` | `predictions.ou_rec` | **new column** |
| `ou_stars` | `predictions.over_under_stars` | 1–5 |
| `run_line` | `predictions.spread_line` | e.g. `-1.5` |
| `run_line_rec` | `predictions.spread_pick` | `'home' \| 'away'` |
| `run_line_stars` | `predictions.spread_stars` | 1–5 |
| `actual_home_score` | `games.home_score` | Set on results ingest |
| `actual_away_score` | `games.away_score` | Set on results ingest |
| `actual_winner` | derived (`home_score > away_score ? 'home' : 'away'`) | Not stored |
| `actual_total` | derived (`home_score + away_score`) | Not stored |
| `ml_result` | `prediction_results.ml_result` | **new column**, `WIN/LOSS/PUSH/PASS` |
| `ou_result` | `prediction_results.ou_result` | **new column** |
| `run_line_result` | `prediction_results.run_line_result` | **new column** |

### Result state semantics

| Value | Meaning |
|---|---|
| `WIN` | Skill's pick was correct for this market |
| `LOSS` | Skill's pick was incorrect for this market |
| `PUSH` | Line was exactly matched (betting-industry standard: refund) |
| `PASS` | Skill did not make a pick for this market on this game (no-action) |
| `null` | Result not yet reported (game not finished or not ingested) |

`PASS` implies the corresponding recommendation column (`moneyline_pick` / `ou_rec` / `spread_pick`) may also be `null` for that row, since the skill opted out of that market. The result ingest API accepts `PASS` for any market regardless of whether the pick column was populated.

### Legacy columns — two categories

**(a) Kept and never written — truly unused.**

These remain in the schema but new writes never touch them. Frontend tolerates null (components already null-check):

- `predictions`: `moneyline_away_pct`, `over_pct`, `under_pct`, `spread_pct`, `explanation_en`, `explanation_zh`

**(b) Kept and dual-written — for accuracy dashboard compatibility.**

The existing accuracy dashboard (`src/services/predictions/api.ts::fetchAccuracyData`) queries `prediction_results.winner_correct` and `over_under_correct` as booleans. If we only wrote the new `*_result` text columns, those booleans would stay null and the dashboard would display 0%.

To keep the dashboard working without frontend changes, `/api/ingest/results` **dual-writes** the old boolean trio from the new text values:

| Text value | `winner_correct` / `over_under_correct` / `spread_correct` |
|---|---|
| `WIN` | `true` |
| `LOSS` | `false` |
| `PUSH` | `false` |
| `PASS` | `null` |
| `null` | `null` |

**Known limitation:** `PUSH` gets counted as "not correct" in the legacy boolean, so the accuracy dashboard will slightly underrepresent hit rate when pushes occur (rare for moneyline, more common for O/U when the line is an integer). This is acceptable for MVP. A follow-up migration can swap the dashboard to read the text columns directly and exclude PUSH from the denominator.

## API Specifications

All three endpoints:

- **Base URL:** `${API_BASE_URL}` (Vercel deployment)
- **Auth:** `Authorization: Bearer ${CRON_SECRET}` — returns **401** if absent or wrong
- **Content-Type:** `application/json`
- **Method:** `POST`
- **File location:** `api/ingest/*.ts` (new directory)

### Common: team resolution

All endpoints resolve teams using `sport_id='mlb'` + `teams.abbreviation`. The skill sends abbreviations (`"LAD"`, `"SF"`, etc.) which are looked up once per request and cached in a `Map<string,id>`. Unknown abbreviations return a per-item error (see Error format).

### Common: natural key

Every row-level operation uses the tuple `(sport='mlb', date, home_team, away_team, game_time)` as the natural key:

- `game_time` is **required** in payloads to disambiguate MLB doubleheaders.
- Backend builds the game `slug` as `${home_id}-vs-${away_id}-${date}`. This is stable because team IDs come from the `teams` table.
- Upsert conflict target is `(sport_id, slug)` — same as the current implementation.

### Common: error response format

```jsonc
// Per-item errors are returned in the results array, not as a 400.
// The whole batch returns 200 (all success), 207 (partial), or 500 (fatal).

{
  "total": 3,
  "upserted": 2,
  "errors": 1,
  "results": [
    { "slug": "lad-vs-sf-2026-04-15", "status": "upserted" },
    { "slug": "nyy-vs-bos-2026-04-15", "status": "upserted" },
    { "slug": "",                       "status": "error", "error": "Unknown home team: XYZ" }
  ]
}
```

Fatal errors (auth, malformed JSON, missing env vars) return the corresponding 4xx/5xx with a flat `{ "error": "..." }` body.

---

### 1. `POST /api/ingest/schedule`

**Purpose:** Bulk-upload games for a date without predictions. Used when the skill wants the frontend to show "today has 10 games, 6 predicted" instead of hiding unpredicted games. Optional — the frontend will not break if the skill never calls this endpoint.

**Request body:**

```jsonc
{
  "date": "2026-04-15",                        // YYYY-MM-DD (required)
  "games": [
    {
      "home_team": "LAD",                      // abbreviation (required)
      "away_team": "SF",                       // abbreviation (required)
      "game_time": "2026-04-15T22:10:00Z"      // ISO UTC (required)
    }
  ]
}
```

**Backend logic:**

1. Validate auth, payload shape.
2. Load `teams` where `sport_id='mlb'`, build abbr→id map.
3. For each `game`:
   - Resolve `home_id`, `away_id`. If either is unknown → per-item error.
   - Build `slug = ${home_id}-vs-${away_id}-${date}`.
   - Upsert `games` row with `sport_id='mlb'`, `status='scheduled'`, on conflict `(sport_id, slug)`.
4. Return 200 (or 207 on partial) with `results[]`.

**Notes:**

- Does not touch `predictions` or `prediction_results`.
- Safe to call multiple times for the same date; existing rows are updated to the provided `game_time` if it changes.
- If a prediction already exists for a game and the schedule call arrives later, the prediction is untouched.

---

### 2. `POST /api/ingest/predictions`

**Purpose:** Main upload endpoint. Upserts a game row (creating it if missing) and writes its prediction in a single call. This is the endpoint the skill calls most often.

**Request body:**

```jsonc
{
  "date": "2026-04-15",
  "predictions": [
    {
      // ── natural key ───────────────────────────────────
      "home_team": "LAD",                      // required
      "away_team": "SF",                       // required
      "game_time": "2026-04-15T22:10:00Z",     // required

      // ── moneyline ─────────────────────────────────────
      "predicted_winner": "home",              // 'home' | 'away' | null (null = PASS)
      "predicted_home_pct": 58.0,              // 0–100; required if predicted_winner not null
      "ml_stars": 4,                           // 1–5; required if predicted_winner not null

      // ── over/under ────────────────────────────────────
      "ou_line": 8.5,                          // null = PASS on this market
      "ou_rec": "under",                       // 'over' | 'under' | null
      "ou_stars": 3,                           // required if ou_rec not null

      // ── run line ──────────────────────────────────────
      "run_line": -1.5,                        // null = PASS on this market
      "run_line_rec": "home",                  // 'home' | 'away' | null
      "run_line_stars": 3                      // required if run_line_rec not null
    }
  ]
}
```

**Validation rules:**

- Top level: `date` matches `YYYY-MM-DD`, `predictions` is a non-empty array.
- Each prediction:
  - `home_team`, `away_team`, `game_time` — required.
  - Moneyline: `predicted_winner ∈ {'home','away',null}`. If not null: `predicted_home_pct ∈ [0,100]`, `ml_stars ∈ [1,5]`.
  - Over/under: `ou_rec ∈ {'over','under',null}`. If not null: `ou_line` is a number, `ou_stars ∈ [1,5]`.
  - Run line: `run_line_rec ∈ {'home','away',null}`. If not null: `run_line` is a number, `run_line_stars ∈ [1,5]`.
  - At least one of the three markets must be non-null (otherwise the skill is saying "no pick on anything," which is meaningless).

**Backend logic:**

1. Validate auth and payload.
2. Load `teams` abbr→id map.
3. For each prediction:
   - Resolve `home_id`, `away_id` (error on unknown).
   - Upsert `games` row — same logic as `/api/ingest/schedule`. Returns `game_id`.
   - Upsert `predictions` row keyed on `(game_id, model_version='v1')`. Columns:
     - `moneyline_pick` ← `predicted_winner`
     - `moneyline_home_pct` ← `predicted_home_pct`
     - `moneyline_stars` ← `ml_stars` (default 3 if null; table has `NOT NULL DEFAULT 3`)
     - `over_under_line` ← `ou_line`
     - `ou_rec` ← `ou_rec`
     - `over_under_stars` ← `ou_stars` (default 3)
     - `spread_line` ← `run_line`
     - `spread_pick` ← `run_line_rec`
     - `spread_stars` ← `run_line_stars` (default 3)
4. Return 200 / 207 with per-item status.

**Notes:**

- This endpoint implicitly handles the "schedule + prediction in one shot" flow. The skill does not need to call `/api/ingest/schedule` first.
- Re-POSTing updates the existing prediction row (not creating a new one). `created_at` stays at the first write.
- Passing all three markets as null is rejected at the validation step.

---

### 3. `POST /api/ingest/results`

**Purpose:** Post-game result ingest. Updates the game's final score and writes the prediction's per-market verdict.

**Request body:**

```jsonc
{
  "date": "2026-04-15",
  "results": [
    {
      "home_team": "LAD",
      "away_team": "SF",
      "game_time": "2026-04-15T22:10:00Z",

      "actual_home_score": 4,                  // required int ≥ 0
      "actual_away_score": 5,                  // required int ≥ 0

      "ml_result": "LOSS",                     // WIN | LOSS | PUSH | PASS | null
      "ou_result": "WIN",
      "run_line_result": "PUSH"
    }
  ]
}
```

**Validation rules:**

- `actual_home_score`, `actual_away_score` are required non-negative integers.
- Each `*_result` ∈ `{'WIN','LOSS','PUSH','PASS',null}`.
- `null` is allowed to explicitly mean "this market is still not resolved," though the typical post-game call sets all three.

**Backend logic:**

1. Validate auth and payload.
2. Load `teams` abbr→id map.
3. For each result:
   - Resolve `home_id`, `away_id`.
   - Find the game by natural key: `SELECT id FROM games WHERE sport_id='mlb' AND slug=${slug}`. If not found → per-item error (`Game not found; upload prediction or schedule first`).
   - Update `games`: `home_score`, `away_score`, `status='final'`.
   - Find the prediction: `SELECT id FROM predictions WHERE game_id=${id} AND model_version='v1'`.
     - If no prediction row exists, we still record the game scores — but `prediction_results` is skipped (logged as `no_prediction` in results). This covers the case where the skill uploaded a schedule game but never predicted it, and the user wants the site to show the final score anyway.
   - Upsert `prediction_results` keyed on `prediction_id`:
     - `ml_result`, `ou_result`, `run_line_result` ← payload verbatim
     - `game_id` ← resolved
     - `resolved_at` ← `now()`
     - **Dual-write** legacy booleans from text values (see Legacy columns §):
       - `winner_correct` ← `mapResultToBool(ml_result)`
       - `over_under_correct` ← `mapResultToBool(ou_result)`
       - `spread_correct` ← `mapResultToBool(run_line_result)`
       where `mapResultToBool('WIN')=true`, `mapResultToBool('LOSS'|'PUSH')=false`, `mapResultToBool('PASS'|null)=null`.
4. Return 200 / 207.

**Notes:**

- The endpoint does not compute correctness. The skill is the single source of truth.
- Re-POSTing overwrites the previous result row for that prediction — useful if the skill corrects a mis-entered score.

## Skill Workflow

The Claude skill (out of scope for this spec) should follow this sequence per day:

```
Morning:
  1. (Optional) Fetch today's MLB schedule from wherever the skill sources data.
     POST /api/ingest/schedule  — only if you want unpredicted games visible.
  2. Run the prediction model for each game the skill chooses to predict.
     POST /api/ingest/predictions  — once per batch, all predictions in one array.

After final games complete:
  3. Fetch final scores, compute ml_result / ou_result / run_line_result.
  4. POST /api/ingest/results  — all that day's results in one array.
```

All three calls are idempotent. Re-running any step is safe.

## File Structure

### New files

```
api/ingest/
├── schedule.ts        — POST handler, schedule upload
├── predictions.ts     — POST handler, main ingest
└── results.ts         — POST handler, post-game results

src/lib/predictions/
└── ingest-helpers.ts  — MODIFY: add validators for new payloads
                         (generateSlug already exists)

supabase/migrations/
└── 005_manual_ingest_pipeline.sql
```

### Modified files

- `src/types/predictions/index.ts` — add new input types (`SchedulePayload`, `PredictionsPayload`, `ResultsPayload`) and extend `Prediction` / `PredictionResult` row types with the new columns (`ou_rec`, `ml_result`, `ou_result`, `run_line_result`).
- `vercel.json` — remove the two `crons` entries. `POST` endpoints are reachable under the regular function routes; no cron wiring needed.

### Deleted files

- `api/cron/ingest-schedule.ts` — obsolete ESPN cron (replaced by `api/ingest/schedule.ts`)
- `api/cron/ingest-predictions.ts` — obsolete; logic moves to `api/ingest/predictions.ts`
- `api/cron/resolve-results.ts` — obsolete ESPN cron (replaced by `api/ingest/results.ts`)

The `api/cron/` directory will be empty and may be removed.

### Unchanged

All frontend code under `src/components/`, `src/hooks/`, `src/services/`, `src/routes/`, and `src/stores/`. They read the same columns as before; the new columns are visible in queries but not referenced by any existing component.

## Error Handling

| Condition | HTTP | Body |
|---|---|---|
| Missing/wrong `Authorization` header | 401 | `{ "error": "Unauthorized" }` |
| Malformed JSON | 400 | `{ "error": "Invalid JSON body" }` |
| Missing required top-level field | 400 | `{ "error": "Missing field: predictions[]" }` |
| Schema validation fails (per-item) | 207 | per-item `{status:"error", error:"..."}` in `results[]` |
| Unknown team abbreviation | 207 | per-item `{status:"error", error:"Unknown home team: XYZ"}` |
| Game not found (results endpoint only) | 207 | per-item `{status:"error", error:"Game not found for lad-vs-sf-2026-04-15"}` |
| Supabase env vars missing | 500 | `{ "error": "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }` |
| DB write failure | 207 | per-item `{status:"error", error:"${dbError.message}"}` |

The skill is expected to retry on 500 and surface 207 errors to the user.

## Testing Plan

1. **Unit** (Vitest):
   - Payload validators for each endpoint (valid, invalid, edge cases: null markets, missing game_time, unknown teams).
   - Slug generation already covered.
2. **Integration** (Vitest + Supabase local):
   - `POST /api/ingest/schedule` creates games.
   - `POST /api/ingest/predictions` creates games + predictions when both are new.
   - `POST /api/ingest/predictions` updates an existing prediction when re-posted.
   - `POST /api/ingest/results` updates game scores and writes `prediction_results`.
   - `POST /api/ingest/results` handles "game exists, prediction doesn't" gracefully.
3. **Manual smoke test**:
   - Deploy to Vercel.
   - Run one live skill cycle end-to-end (schedule → predictions → results).
   - Verify frontend reflects each stage.

## Out of Scope

Explicitly not part of this design:

- Claude skill updates. The skill already produces the correct JSON shape per the user; this spec is only the backend contract.
- Frontend changes. The existing `GameCard`, `GameGrid`, and accuracy pages read columns that will continue to be populated.
- NBA support. The schema is sport-agnostic via `sport_id`, so NBA adds cleanly later, but no work is done now.
- Game detail page content (no `explanation_*` populated).
- Batch size limits / pagination. Typical day is ~15 MLB games; a single POST is fine. Revisit if payloads exceed ~100 items.
- Historical backfill. The pipeline operates day-forward only.
- Auth beyond the shared `CRON_SECRET`. The skill is a trusted internal tool; no per-user auth.

## TypeScript Type Changes

All changes are in `src/types/predictions/index.ts`.

### Extend existing row types

```ts
// In Prediction — add one field:
ou_rec: 'over' | 'under' | null       // new column from 005 migration

// In PredictionResult — add three fields:
ml_result:       'WIN' | 'LOSS' | 'PUSH' | 'PASS' | null
ou_result:       'WIN' | 'LOSS' | 'PUSH' | 'PASS' | null
run_line_result: 'WIN' | 'LOSS' | 'PUSH' | 'PASS' | null
```

### New shared type

```ts
export type MarketResult = 'WIN' | 'LOSS' | 'PUSH' | 'PASS'
```

### New payload types (ingest API contracts)

```ts
// ── Manual Ingest API payload types ─────────────────────────────────────────

export interface ScheduleGame {
  home_team: string      // MLB abbreviation e.g. "LAD"
  away_team: string
  game_time: string      // ISO 8601 UTC
}

export interface SchedulePayload {
  date: string           // YYYY-MM-DD
  games: ScheduleGame[]
}

export interface PredictionItem {
  // natural key
  home_team:          string
  away_team:          string
  game_time:          string
  // moneyline (null = PASS)
  predicted_winner:   'home' | 'away' | null
  predicted_home_pct: number | null
  ml_stars:           number | null          // 1–5
  // over/under (null = PASS)
  ou_line:            number | null
  ou_rec:             'over' | 'under' | null
  ou_stars:           number | null          // 1–5
  // run line (null = PASS)
  run_line:           number | null
  run_line_rec:       'home' | 'away' | null
  run_line_stars:     number | null          // 1–5
}

export interface PredictionsPayload {
  date:        string
  predictions: PredictionItem[]
}

export interface ResultItem {
  home_team:          string
  away_team:          string
  game_time:          string
  actual_home_score:  number
  actual_away_score:  number
  ml_result:          MarketResult | null
  ou_result:          MarketResult | null
  run_line_result:    MarketResult | null
}

export interface ResultsPayload {
  date:    string
  results: ResultItem[]
}

// ── Ingest API response ──────────────────────────────────────────────────────

export interface IngestItemResult {
  slug:   string
  status: 'upserted' | 'error' | 'no_prediction'
  error?: string
}

export interface IngestResponse {
  total:    number
  upserted: number
  errors:   number
  results:  IngestItemResult[]
}
```

### Deprecate old skill types

`SkillPrediction` and `ClaudeSkillInput` are used only by the old ESPN cron handlers (`api/cron/ingest-predictions.ts`). They are deleted together with that file; no other code references them.

---

## New Helpers (`src/lib/predictions/ingest-helpers.ts`)

Add three new functions below the existing `generateSlug` / `validateInput`:

### `mapResultToBool`

```ts
export function mapResultToBool(result: MarketResult | null): boolean | null {
  if (result === 'WIN')  return true
  if (result === 'LOSS' || result === 'PUSH') return false
  return null  // PASS or null
}
```

Used by `POST /api/ingest/results` to dual-write the legacy boolean columns.

### `validateSchedulePayload`

Throws on:
- `date` not matching `YYYY-MM-DD`
- `games` empty or not an array
- Any item missing `home_team`, `away_team`, or `game_time`

### `validatePredictionsPayload`

Throws on:
- `date` not matching `YYYY-MM-DD`
- `predictions` empty or not an array
- Any item missing `home_team`, `away_team`, `game_time`
- All three markets null (at least one must be non-null)
- `predicted_winner` not in `{'home','away',null}`; if non-null: `predicted_home_pct` in `[0,100]`, `ml_stars` in `[1,5]`
- `ou_rec` not in `{'over','under',null}`; if non-null: `ou_line` is a number, `ou_stars` in `[1,5]`
- `run_line_rec` not in `{'home','away',null}`; if non-null: `run_line` is a number, `run_line_stars` in `[1,5]`

### `validateResultsPayload`

Throws on:
- `date` not matching `YYYY-MM-DD`
- `results` empty or not an array
- Any item missing `home_team`, `away_team`, `game_time`, `actual_home_score`, `actual_away_score`
- `actual_home_score` / `actual_away_score` not non-negative integers
- Any `*_result` value not in `{'WIN','LOSS','PUSH','PASS',null}`

---

## Environment Variables

| Variable | Where set | Purpose |
|---|---|---|
| `SUPABASE_URL` | Vercel env + `.env.local` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel env + `.env.local` | Service-role key (bypasses RLS) |
| `CRON_SECRET` | Vercel env + `.env.local` | Bearer token the skill sends as `Authorization` header |

All three must be present at runtime. If either Supabase variable is absent the endpoints return `500 { "error": "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }`. If `CRON_SECRET` is absent or wrong they return `401`.

---

## Implementation Sequence

Complete tasks in this order to avoid deploying code that references missing DB columns:

1. **Run migration** — apply `005_manual_ingest_pipeline.sql` to the Supabase project (production + local dev) before writing any API code.
2. **TypeScript types** — extend `src/types/predictions/index.ts` per §TypeScript Type Changes.
3. **New helpers** — add `mapResultToBool`, `validateSchedulePayload`, `validatePredictionsPayload`, `validateResultsPayload` to `src/lib/predictions/ingest-helpers.ts`.
4. **`api/ingest/schedule.ts`** — simplest endpoint (games only, no predictions).
5. **`api/ingest/predictions.ts`** — reuses game-upsert logic from step 4.
6. **`api/ingest/results.ts`** — game score update + `prediction_results` upsert with dual-write.
7. **Unit tests** — payload validators for all three endpoints.
8. **Integration tests** — full round-trip against local Supabase.
9. **Cleanup** — delete `api/cron/ingest-schedule.ts`, `ingest-predictions.ts`, `resolve-results.ts`; remove the two `crons` entries from `vercel.json`.
10. **Deploy + smoke test** — deploy to Vercel, run one manual skill cycle end-to-end.

Steps 1–8 can be done locally and reviewed before step 9 (cleanup) and step 10 (deploy).

---

## Rollout

No feature flag needed. The three new API endpoints are additive and no existing route or component is touched.

**Migration-first rule:** The `005` migration must land on the production Supabase project before the new API files are deployed to Vercel. The new columns are nullable and additive — running the migration first means there is no window where deployed API code references columns that don't exist yet.

**Cron cleanup timing:** The old `api/cron/` files remain callable until step 9. After deletion, Vercel's cron scheduler will receive a `404` on the next scheduled trigger. This is benign — the scheduler logs the failure but nothing in the frontend depends on those cron calls. To avoid noisy 404s, delete the files and redeploy before the next scheduled run time (daily 09:00 UTC for `ingest-schedule`, 12:00 UTC for `resolve-results`).

**No frontend changes.** The existing `GameCard`, `GameGrid`, and accuracy pages read the same columns they always have. The new columns (`ou_rec`, `ml_result`, `ou_result`, `run_line_result`) are selected in future queries but not rendered by any current component.

---

## Open Questions

None. All brainstorming-stage questions were resolved with the user:

- ✅ Natural key includes `game_time`
- ✅ Keep `sports`/`teams` reference tables
- ✅ Single prediction per game, `model_version='v1'`
- ✅ Backend stores skill's pre-calculated results verbatim (no correctness math)
- ✅ `PASS` = skill did not pick this market
- ✅ Legacy columns stay in schema; no renames or drops
- ✅ `explanation_*` fields are not populated (game detail page left empty)
