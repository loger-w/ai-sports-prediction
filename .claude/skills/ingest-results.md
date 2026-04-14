# /ingest-results

Upload final scores and per-market verdicts for MLB games to the backend.

Run this after games complete. You (the skill) are the single source of truth for WIN/LOSS/PUSH/PASS — the backend stores your verdicts verbatim.

---

## Data format

Provide results as JSON in your message (or I'll ask):

```json
{
  "date": "2026-04-15",
  "results": [
    {
      "home_team": "LAD",
      "away_team": "SF",
      "game_time": "2026-04-15T22:10:00Z",

      "actual_home_score": 4,
      "actual_away_score": 2,

      "ml_result": "WIN",
      "ou_result": "LOSS",
      "run_line_result": "WIN"
    }
  ]
}
```

**Field rules — natural key (all required):**
- `home_team` / `away_team` — MLB abbreviation
- `game_time` — ISO 8601 UTC

**Scores (both required):**
- `actual_home_score` — non-negative integer
- `actual_away_score` — non-negative integer

**Market verdicts** (`null` = not yet resolved):
- `ml_result` — `"WIN"` | `"LOSS"` | `"PUSH"` | `"PASS"` | `null`
- `ou_result` — `"WIN"` | `"LOSS"` | `"PUSH"` | `"PASS"` | `null`
- `run_line_result` — `"WIN"` | `"LOSS"` | `"PUSH"` | `"PASS"` | `null`

**Verdict meanings:**
- `WIN` — your pick was correct
- `LOSS` — your pick was wrong
- `PUSH` — line exactly matched (e.g. O/U landed exactly on the number)
- `PASS` — you did not make a pick for this market

---

## Steps

### Step 1: Extract results JSON

Look in the conversation for a JSON object with `date` and `results[]`.

If not found, ask: "請提供比賽結果 JSON（包含 date 和 results 陣列）"

### Step 2: Show summary for confirmation

Display:
- Date
- Number of games
- Per game: `HOME vs AWAY  final_score` — market verdicts

Example:
```
日期: 2026-04-15
結果: 2 場

  LAD vs SF   4–2
    ML: WIN  OU: LOSS  RL: WIN

  NYY vs BOS  3–5
    ML: LOSS  OU: WIN  RL: PASS
```

Ask: "確認上傳嗎？(y/n)"

Stop and wait for user confirmation.

### Step 3: Validate environment variables

Read `API_BASE_URL` and `CRON_SECRET` from the environment.

If either is missing, tell the user:
- "請設定環境變數 API_BASE_URL 和 CRON_SECRET 後再試"

Stop if missing.

### Step 4: POST to /api/ingest/results

```bash
curl -s -w "\n%{http_code}" -X POST "${API_BASE_URL}/api/ingest/results" \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -H "Content-Type: application/json" \
  -d '<JSON>'
```

### Step 5: Report result

Parse the response and show:
- Total / upserted / errors
- Mention any `no_prediction` items (game score recorded but no prediction existed)

Example success:
```
上傳完成: 2 場成功, 0 錯誤
```

Example with no_prediction:
```
上傳完成: 2 場成功, 0 錯誤
  注意: nyy-vs-bos-2026-04-15 無對應預測，僅更新比分
```
