# Phase 3: UX Improvements — Timezone, Date Navigation, Prediction Display & Data Pipeline

**Date:** 2026-04-12
**Status:** Approved
**Scope:** Frontend UX overhaul + database schema expansion + data ingest automation

---

## 1. Timezone Handling

### Problem
All game times are currently displayed as ET (US Eastern). For a global audience this is confusing — users must mentally convert to their local time.

### Solution
- Store all timestamps in **UTC** in the database (already the case with `TIMESTAMPTZ`).
- On the frontend, detect the user's timezone via `Intl.DateTimeFormat().resolvedOptions().timeZone`.
- Convert all displayed times (game time, date labels) to the user's local timezone using `dayjs` with the `timezone` and `utc` plugins.
- The "today" concept in date navigation must also be based on the user's local date, not server date.

### Implementation Notes
- Remove hardcoded `ET` suffix from `GameCard.tsx`.
- Add a timezone utility in `src/lib/timezone.ts` that wraps dayjs conversion.
- Date range resolution in `services/predictions/api.ts` (`resolveDateRange`) should accept the user's local date as reference, not `dayjs()` which uses the browser's local time (this already works correctly once the frontend passes the right "today").

---

## 2. Date Navigation — Horizontal Scroll + Calendar Picker

### Problem
The current sidebar has Today / Tomorrow / This Week buttons with a non-functional month navigator. Users cannot browse specific dates or see which days have games.

### Solution
Replace the sidebar date section with a **horizontal date scroll bar** in the main content area (above the game grid), combined with a **calendar popup** for jumping to arbitrary dates.

### Design

**Layout:** A single row at the top of the predictions page content area.
- Left: 📅 calendar icon button (opens a month calendar popup).
- Right: Horizontally scrollable date chips showing ~14 days (7 past, today, 6 future).

**Date Chip States:**
| State | Visual |
|---|---|
| Today | Green (#00e5a0) background, bold text, glow shadow (`box-shadow: 0 0 12px rgba(0,229,160,0.3)`) |
| Selected (not today) | Lighter background, bright text |
| Has games | Small yellow (#fbbf24) dot at bottom of chip |
| No games | No dot |
| Far from today | Text color fades progressively (closer = brighter, farther = dimmer) |

**Behavior:**
- On page load, auto-scroll to center today's chip.
- Clicking a date chip selects that date and fetches predictions for it.
- Clicking 📅 opens a month calendar popover. Selecting a date scrolls the bar to that position and selects it.
- Below the scroll bar, display the current month label (e.g., "APRIL 2026").

**Month label:** Shown below the scroll bar, left-aligned after the calendar button width offset.

### What to Remove
- Sidebar date section: Remove the Today / Tomorrow / This Week buttons and the month navigator from `AppSidebar.tsx`.
- Remove `'today' | 'tomorrow' | 'week'` presets from `PredictionFilters.dateRange`. The dateRange will now always be a specific date string (`YYYY-MM-DD`).

### Store Changes
- `predictionStore.ts`: Change `dateRange` default from `'today'` to the user's local today date string.
- Add a helper to resolve "today" based on user timezone.

---

## 3. GameCard Redesign — Three-Column Prediction Summary with Per-Dimension Stars

### Problem
Current GameCard shows win probability bar and O/U display, but lacks spread (handicap) and moneyline clarity. The confidence level (high/medium/low) is too coarse and applies to the whole game rather than individual prediction dimensions.

### Solution
Redesign the card's prediction section as a **three-column layout**, each dimension with its own star rating.

### Card Structure

```
┌─────────────────────────────────────────┐
│ NBA              19:30          APR 12   │  ← header: sport, local time, date
├─────────────────────────────────────────┤
│                                         │
│   LAL           VS           BOS        │  ← teams: winner bold/bright
│   LOS ANGELES              BOSTON        │
│                                         │
├──────────┬──────────┬───────────────────┤
│  獨贏     │  讓分     │  大小分            │  ← dimension label
│  ★★★☆☆  │  ★★★★☆  │  ★☆☆☆☆           │  ← per-dimension stars (1-5)
│  LAL     │  LAL -3.5│  PASS             │  ← pick or PASS
│  62.3%   │  57.8%   │  218.5            │  ← confidence % or line (grey)
├─────────────────────────────────────────┤
│                    查看詳細分析 →          │  ← detail link
└─────────────────────────────────────────┘
```

### Star Rating Rules

| Stars | Meaning | Visual |
|---|---|---|
| 1 ★ | Not recommended | Grey PASS label, all stars dark (#2d3748), line value shown in grey |
| 2 ★★ | Low confidence | Green pick, 2 gold stars |
| 3 ★★★ | Medium confidence | Green pick, 3 gold stars |
| 4 ★★★★ | High confidence | Green pick, 4 gold stars |
| 5 ★★★★★ | Very high confidence | Green pick, 5 gold stars |

**PASS display:** When stars = 1, show "PASS" in grey (#2d3748) instead of the pick direction. The line value (e.g., 218.5 for O/U, -3.5 for spread) is still shown but in grey for reference.

### Dimension Labels (i18n)
| Dimension | EN | ZH |
|---|---|---|
| Moneyline | Moneyline | 獨贏 |
| Spread | Spread | 讓分 |
| Over/Under | O/U | 大小分 |

### Components to Change
- Remove `WinProbabilityBar.tsx` — replaced by three-column layout.
- Remove `OverUnderDisplay.tsx` — merged into three-column layout.
- Rewrite `GameCard.tsx` with new layout.
- Create `StarRating.tsx` component (receives 1-5, renders gold/dark stars).
- Create `PredictionColumn.tsx` component (label, stars, pick/PASS, confidence).

---

## 4. Game Detail Page — AI Deep Analysis

### Current State
The detail page (`/$lang/$sport/$slug`) already has `GameDetailHeader` and `PredictionBreakdown` components.

### Enhancements
- Add **AI narrative analysis** section: A text block where the AI explains how the game is expected to unfold (stored as `explanation_en` / `explanation_zh` in the predictions table — already exists).
- Show the **three prediction dimensions** in expanded form with more detail than the card.
- Each dimension card can include supporting context (e.g., recent team stats, trends) if available in the explanation text.

### No New Database Fields Needed
The `explanation_en` / `explanation_zh` fields already exist. The detail page just needs better presentation of existing data plus the new spread/moneyline fields.

---

## 5. Database Schema Changes

### predictions table — Modified/New Columns

```sql
-- Replace confidence_level TEXT with per-dimension star ratings
ALTER TABLE predictions DROP COLUMN confidence_level;
ALTER TABLE predictions ADD COLUMN moneyline_stars INTEGER NOT NULL DEFAULT 3 CHECK (moneyline_stars BETWEEN 1 AND 5);
ALTER TABLE predictions ADD COLUMN spread_stars INTEGER NOT NULL DEFAULT 3 CHECK (spread_stars BETWEEN 1 AND 5);
ALTER TABLE predictions ADD COLUMN over_under_stars INTEGER NOT NULL DEFAULT 3 CHECK (over_under_stars BETWEEN 1 AND 5);

-- Rename for clarity
ALTER TABLE predictions RENAME COLUMN predicted_winner TO moneyline_pick;
ALTER TABLE predictions RENAME COLUMN home_win_pct TO moneyline_home_pct;
ALTER TABLE predictions RENAME COLUMN away_win_pct TO moneyline_away_pct;

-- Add spread fields
ALTER TABLE predictions ADD COLUMN spread_line DECIMAL(5,1);
ALTER TABLE predictions ADD COLUMN spread_pick TEXT; -- 'home' or 'away'
ALTER TABLE predictions ADD COLUMN spread_pct DECIMAL(5,2);
```

### Final predictions Column List

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `game_id` | UUID | FK to games |
| `model_version` | TEXT | Model version tag |
| `moneyline_pick` | TEXT | 'home' or 'away' (renamed from predicted_winner) |
| `moneyline_home_pct` | DECIMAL(5,2) | Home win probability (renamed from home_win_pct) |
| `moneyline_away_pct` | DECIMAL(5,2) | Away win probability (renamed from away_win_pct) |
| `moneyline_stars` | INTEGER | 1-5 star confidence for moneyline |
| `spread_line` | DECIMAL(5,1) | Spread line (e.g., -3.5) |
| `spread_pick` | TEXT | 'home' or 'away' |
| `spread_pct` | DECIMAL(5,2) | Spread pick confidence % |
| `spread_stars` | INTEGER | 1-5 star confidence for spread |
| `over_under_line` | DECIMAL(5,1) | O/U line (existing) |
| `over_pct` | DECIMAL(5,2) | Over probability (existing) |
| `under_pct` | DECIMAL(5,2) | Under probability (existing) |
| `over_under_stars` | INTEGER | 1-5 star confidence for O/U |
| `explanation_en` | TEXT | AI analysis in English (existing) |
| `explanation_zh` | TEXT | AI analysis in Chinese (existing) |
| `created_at` | TIMESTAMPTZ | Timestamp (existing) |

### prediction_results table — Additions

```sql
ALTER TABLE prediction_results ADD COLUMN spread_correct BOOLEAN;
```

This enables accuracy tracking per dimension: `winner_correct` (moneyline), `spread_correct` (spread), `over_under_correct` (O/U).

---

## 6. Data Pipeline — Semi-Automatic

### Architecture

```
MLB/NBA API ──(auto cron)──→ games table
                                  ↓
You upload predictions ──(manual)──→ predictions table
                                  ↓
Game ends ──(auto cron)──→ prediction_results table
```

### Auto: Game Schedule Ingest
- **Source APIs:**
  - MLB: `statsapi.mlb.com/api/v1/schedule?sportId=1&date=YYYY-MM-DD`
  - NBA: `cdn.nba.com` scoreboard endpoints or `balldontlie.io`
- **Trigger:** Daily cron job (Vercel Cron or Supabase Edge Function), runs once per day.
- **Logic:** Fetch next 3-7 days of scheduled games. Upsert into `games` table. Generate slug from teams + date. Store game_time in UTC.
- **Idempotent:** Use `UNIQUE(sport_id, slug)` constraint to avoid duplicates.

### Manual: Prediction Upload
- You upload prediction data to the `predictions` table.
- Method: Direct SQL, script, or a future admin API — left flexible for now.
- Predictions reference `game_id` from auto-ingested games.

### Auto: Result Resolution
- **Trigger:** Daily cron job, runs after typical game end times.
- **Logic:** Fetch final scores from MLB/NBA API. Update `games.status` to 'final', fill `home_score`/`away_score`. Compute `winner_correct`, `spread_correct`, `over_under_correct` and insert into `prediction_results`.
- The existing `api/ingest` module already has resolution logic that can be extended.

---

## 7. Sidebar Impact

With the date section moving out of the sidebar into the main content area, the sidebar retains:
- **Sport filter** (All / NBA / MLB with counts)
- **Confidence filter** — needs redesign: currently filters by high/medium/low. With per-dimension stars, the filter should allow filtering by minimum star count (e.g., "show games with at least one 4+ star pick").
- **Direction filter** (All / Home / Away) — still relevant for moneyline_pick.

---

## Out of Scope
- Admin UI for uploading predictions (future consideration).
- Additional sports beyond NBA/MLB.
- User accounts or personalization.
- Push notifications for high-confidence picks.
