# Q1: E2E API Tests Design

## Overview

Two post-deployment end-to-end tests that verify the complete data pipeline: prediction ingestion and result resolution. Both require a deployed API + Supabase environment.

## Prerequisites

- App deployed to Vercel (API endpoints accessible)
- Supabase project running with migrations applied
- Environment variables set: `CRON_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- Teams table seeded with NBA/MLB teams

## Test A: Ingest Predictions E2E

**Purpose**: Verify Claude Skill JSON → Supabase write pipeline works end-to-end.

### Steps

1. **POST to ingest API** with a known test payload:

```bash
curl -s -X POST "${API_BASE_URL}/api/cron/ingest-predictions" \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-04-12",
    "sport": "nba",
    "predictions": [{
      "home_team": "LAL",
      "away_team": "BOS",
      "game_time": "2026-04-12T02:30:00Z",
      "home_win_pct": 62.5,
      "away_win_pct": 37.5,
      "over_under_line": 215.5,
      "over_pct": 55.0,
      "under_pct": 45.0,
      "explanation_en": "Test prediction for e2e validation",
      "explanation_zh": "端到端驗證用測試預測"
    }]
  }'
```

2. **Verify API response**:
   - HTTP 200
   - `total: 1`, `upserted: 1`, `errors: 0`
   - `results[0].status === "upserted"`
   - `results[0].slug` matches pattern `{homeTeamId}-vs-{awayTeamId}-2026-04-12`

3. **Verify Supabase `games` table**:
   - Query: `SELECT * FROM games WHERE game_date = '2026-04-12' AND sport_id = 'nba'`
   - Expect: 1 row with `status = 'scheduled'`, correct `home_team_id`, `away_team_id`, `game_time`

4. **Verify Supabase `predictions` table**:
   - Query: `SELECT * FROM predictions WHERE game_id = '<game_id from step 3>'`
   - Expect: 1 row with:
     - `home_win_pct = 62.5`, `away_win_pct = 37.5`
     - `predicted_winner = 'home'`
     - `confidence_level = 'medium'` (edge = |62.5 - 50| = 12.5, > 10 but ≤ 20)
     - `over_under_line = 215.5`, `over_pct = 55.0`, `under_pct = 45.0`
     - `model_version = 'v1'`

5. **Test idempotency** — POST the same payload again:
   - Expect: HTTP 200, `upserted: 1` (upsert, not duplicate error)
   - Supabase: still only 1 game row, 1 prediction row (updated, not duplicated)

### Failure Scenarios to Test

| Test Case | Expected |
|-----------|----------|
| Missing auth header | 401 Unauthorized |
| Wrong CRON_SECRET | 401 Unauthorized |
| Invalid date format `"04-12-2026"` | 400 with error message |
| Unknown team abbreviation `"XXX"` | 207 with error in results |
| `home_win_pct + away_win_pct = 99` | 400 validation error |
| Empty predictions array | 400 validation error |

## Test B: Full Pipeline (Ingest → Resolve)

**Purpose**: Verify complete lifecycle — prediction written → game ends → ESPN scores fetched → `prediction_results` correctly calculated.

### Steps

1. **Ingest a prediction for a game that has already finished**:
   - Pick a real past NBA game (check ESPN for a game from yesterday with final scores)
   - Use the correct team abbreviations and actual game date
   - Example (adjust to a real finished game):

```bash
curl -s -X POST "${API_BASE_URL}/api/cron/ingest-predictions" \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "<YESTERDAY_DATE>",
    "sport": "nba",
    "predictions": [{
      "home_team": "<HOME_ABBR>",
      "away_team": "<AWAY_ABBR>",
      "game_time": "<ACTUAL_GAME_TIME>",
      "home_win_pct": 60.0,
      "away_win_pct": 40.0,
      "over_under_line": 220.0,
      "over_pct": 55.0,
      "under_pct": 45.0,
      "explanation_en": "Pipeline test prediction",
      "explanation_zh": "完整流程測試預測"
    }]
  }'
```

2. **Trigger resolve-results**:

```bash
curl -s "${API_BASE_URL}/api/cron/resolve-results" \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

3. **Verify API response**:
   - `ok: true`
   - `summary[<date>].nba.resolved >= 1`

4. **Verify `games` table**:
   - `status = 'final'`
   - `home_score` and `away_score` populated with ESPN scores

5. **Verify `prediction_results` table**:
   - Query: `SELECT * FROM prediction_results WHERE game_id = '<game_id>'`
   - Expect: 1 row with:
     - `winner_correct`: boolean (compare `predicted_winner` with actual score winner)
     - `over_under_correct`: boolean (compare predicted over/under with actual total vs line)
     - `resolved_at`: populated timestamp

6. **Manual cross-check**:
   - Look up the actual score on ESPN
   - Verify `winner_correct` matches reality:
     - We predicted `home` (60% > 40%). If home won → `true`, else → `false`
   - Verify `over_under_correct` matches reality:
     - We predicted over (`over_pct` 55 ≥ 50). If actual total > 220.0 → `true`, else → `false`

### Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Game not yet finished on ESPN | `skipped`, game stays `scheduled` |
| Game has no matching ESPN event | `skipped`, no changes |
| Prediction already resolved | Upsert with `ignoreDuplicates: true`, no overwrite |
| Tied total score = line (e.g., total = 220.0, line = 220.0) | `over_under_correct = false` (totalScore > line is false, predicted over) |

## Cleanup

After testing, optionally delete test data from Supabase:
```sql
DELETE FROM prediction_results WHERE game_id IN (SELECT id FROM games WHERE game_date = '2026-04-12');
DELETE FROM predictions WHERE game_id IN (SELECT id FROM games WHERE game_date = '2026-04-12');
DELETE FROM games WHERE game_date = '2026-04-12';
```

## When to Run

- After first deployment to Vercel
- After any changes to `api/cron/ingest-predictions.ts` or `api/cron/resolve-results.ts`
- After Supabase migration changes to `games`, `predictions`, or `prediction_results` tables
