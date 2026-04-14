# /ingest-schedule

Upload today's MLB game schedule to the backend without predictions.

Use this when you want the frontend to show all games for a date — including ones you haven't predicted — before predictions are ready.

---

## Data format

Provide the schedule as JSON in your message (or I'll ask):

```json
{
  "date": "2026-04-15",
  "games": [
    {
      "home_team": "LAD",
      "away_team": "SF",
      "game_time": "2026-04-15T22:10:00Z"
    },
    {
      "home_team": "NYY",
      "away_team": "BOS",
      "game_time": "2026-04-15T23:05:00Z"
    }
  ]
}
```

**Field rules:**
- `date` — `YYYY-MM-DD` (required)
- `home_team` / `away_team` — MLB abbreviation, e.g. `LAD`, `NYY`, `SF`, `BOS` (required)
- `game_time` — ISO 8601 UTC (required — needed to disambiguate doubleheaders)

---

## Steps

### Step 1: Extract schedule JSON

Look in the conversation for a JSON object with `date` and `games[]`.

If not found, ask: "請提供今日賽程 JSON（包含 date 和 games 陣列）"

### Step 2: Show summary for confirmation

Display:
- Date
- Number of games
- Each matchup: `HOME vs AWAY  game_time`

Example:
```
日期: 2026-04-15
場次: 3 場

  LAD vs SF   2026-04-15T22:10:00Z
  NYY vs BOS  2026-04-15T23:05:00Z
  CHC vs MIL  2026-04-16T00:10:00Z
```

Ask: "確認上傳嗎？(y/n)"

Stop and wait for user confirmation.

### Step 3: Validate environment variables

Read `API_BASE_URL` and `CRON_SECRET` from the environment.

If either is missing, tell the user:
- "請設定環境變數 API_BASE_URL 和 CRON_SECRET 後再試"

Stop if missing.

### Step 4: POST to /api/ingest/schedule

```bash
curl -s -w "\n%{http_code}" -X POST "${API_BASE_URL}/api/ingest/schedule" \
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
上傳完成: 3 場成功, 0 錯誤
```

Example partial:
```
部分成功: 2 場成功, 1 錯誤
  - 錯誤: Unknown home team: XYZ
```
