# Ingest Skill Design

## Overview

A Claude Code Skill (`/ingest`) that takes prediction JSON from the conversation context and sends it to the deployed `POST /api/cron/ingest-predictions` endpoint via curl.

## Workflow

```
/predict (existing skill)
    ↓ produces JSON in conversation context
/ingest
    ↓ extracts JSON from context
    ↓ shows summary for user confirmation
    ↓ reads env vars (API_BASE_URL, CRON_SECRET)
    ↓ curl POST to ingest-predictions API
    ↓ reports results
```

## Skill Definition

- **Name**: `ingest`
- **File**: `.claude/skills/ingest.md` (Claude Code skill format)
- **Trigger**: User types `/ingest` in Claude Code

## Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `API_BASE_URL` | Deployed app URL | `https://your-app.vercel.app` |
| `CRON_SECRET` | API authentication token | `your-secret-token` |

## Behavior

### Step 1: Extract JSON from context

Search the conversation for the most recent JSON object matching the ingest-predictions input schema:

```json
{
  "date": "YYYY-MM-DD",
  "sport": "nba" | "mlb",
  "predictions": [
    {
      "home_team": "LAL",
      "away_team": "BOS",
      "game_time": "2026-04-12T02:30:00Z",
      "home_win_pct": 62.5,
      "away_win_pct": 37.5,
      "over_under_line": 215.5,
      "over_pct": 55.0,
      "under_pct": 45.0,
      "explanation_en": "...",
      "explanation_zh": "..."
    }
  ]
}
```

If not found, reply: "請先執行 /predict 產生預測資料" and stop.

### Step 2: Show summary for confirmation

Display to the user:
- Date and sport
- Number of games
- Each matchup: `home_team vs away_team`

Wait for user confirmation before proceeding.

### Step 3: Validate environment variables

Read `API_BASE_URL` and `CRON_SECRET` from environment variables. If either is missing, prompt the user to set them and stop.

### Step 4: Send to API

Execute via Bash tool:

```bash
curl -s -X POST "${API_BASE_URL}/api/cron/ingest-predictions" \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -H "Content-Type: application/json" \
  -d '<JSON>'
```

### Step 5: Report results

Parse the API response and report:
- Total games, successful upserts, errors
- For each error: slug and error message

## API Response Format

Success (200):
```json
{
  "date": "2026-04-12",
  "sport": "nba",
  "total": 10,
  "upserted": 10,
  "errors": 0,
  "results": [
    { "slug": "lakers-vs-celtics-2026-04-12", "status": "upserted" }
  ]
}
```

Partial success (207): same structure with `errors > 0` and individual error messages in `results`.

## Error Handling

| Condition | Behavior |
|-----------|----------|
| No JSON in context | Prompt user to run `/predict` first |
| Missing env vars | Tell user which variables to set |
| API 401 | `CRON_SECRET` is wrong, prompt to check |
| API 400 | Show validation error from API response |
| API 5xx | Show error, suggest retrying |
| Network failure | Show curl error, suggest checking `API_BASE_URL` |

## Input Schema Validation (pre-flight)

Before sending, verify:
- `date` matches `YYYY-MM-DD` format
- `sport` is `"nba"` or `"mlb"`
- `predictions` is a non-empty array
- Each prediction has all required fields: `home_team`, `away_team`, `game_time`, `home_win_pct`, `away_win_pct`, `over_under_line`, `over_pct`, `under_pct`, `explanation_en`, `explanation_zh`
- `home_win_pct + away_win_pct` equals 100 (±0.01)

If validation fails, show specific errors and stop.
