# /ingest-predictions

Upload MLB predictions for a given date to the backend.

This is the main ingest skill. It creates the game rows (if not already present) and writes the predictions in one call.

---

## Data format

Provide predictions as JSON in your message (or I'll ask):

```json
{
  "date": "2026-04-15",
  "predictions": [
    {
      "home_team": "LAD",
      "away_team": "SF",
      "game_time": "2026-04-15T22:10:00Z",

      "predicted_winner": "home",
      "predicted_home_pct": 62.0,
      "ml_stars": 4,

      "ou_line": 8.5,
      "ou_rec": "under",
      "ou_stars": 3,

      "run_line": -1.5,
      "run_line_rec": "home",
      "run_line_stars": 3
    }
  ]
}
```

**Field rules — natural key (all required):**
- `home_team` / `away_team` — MLB abbreviation
- `game_time` — ISO 8601 UTC

**Moneyline market** (set all three, or set all to `null` to PASS):
- `predicted_winner` — `"home"` | `"away"` | `null`
- `predicted_home_pct` — 0–100 (required if `predicted_winner` is set)
- `ml_stars` — 1–5 (required if `predicted_winner` is set)

**Over/under market** (set all three, or set all to `null` to PASS):
- `ou_line` — number, e.g. `8.5`
- `ou_rec` — `"over"` | `"under"` | `null`
- `ou_stars` — 1–5 (required if `ou_rec` is set)

**Run line market** (set all three, or set all to `null` to PASS):
- `run_line` — number, e.g. `-1.5`
- `run_line_rec` — `"home"` | `"away"` | `null`
- `run_line_stars` — 1–5 (required if `run_line_rec` is set)

At least one of the three markets must be non-null per game.

---

## Steps

### Step 1: Extract predictions JSON

Look in the conversation for a JSON object with `date` and `predictions[]`.

If not found, ask: "請提供預測 JSON（包含 date 和 predictions 陣列）"

### Step 2: Show summary for confirmation

Display:
- Date
- Number of games
- Per game: `HOME vs AWAY` — which markets are set (ML / OU / RL) and the picks

Example:
```
日期: 2026-04-15
預測: 2 場

  LAD vs SF
    ML: 主隊勝 62% ★★★★
    OU: 8.5 under ★★★
    RL: 主隊 -1.5 ★★★

  NYY vs BOS
    ML: 客隊勝 55% ★★★
    OU: PASS
    RL: PASS
```

Ask: "確認上傳嗎？(y/n)"

Stop and wait for user confirmation.

### Step 3: Validate environment variables

Read `API_BASE_URL` and `CRON_SECRET` from the environment.

If either is missing, tell the user:
- "請設定環境變數 API_BASE_URL 和 CRON_SECRET 後再試"

Stop if missing.

### Step 4: POST to /api/ingest/predictions

```bash
curl -s -w "\n%{http_code}" -X POST "${API_BASE_URL}/api/ingest/predictions" \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -H "Content-Type: application/json" \
  -d '<JSON>'
```

### Step 5: Report result

Parse the response and show:
- Total / upserted / errors
- For each error: slug and error message

Example success:
```
上傳完成: 2 場成功, 0 錯誤
```

Example partial:
```
部分成功: 1 場成功, 1 錯誤
  - lad-vs-sf-2026-04-15: Unknown home team: LAD
```
