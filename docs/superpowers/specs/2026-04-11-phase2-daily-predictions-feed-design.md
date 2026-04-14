# Phase 2: Daily Predictions Feed — Design Spec

## Overview

Phase 2 builds the core user-facing page: a daily predictions feed showing AI-generated win probability and over/under predictions for NBA and MLB games. Users can filter by sport, date range, confidence level, and predicted winner direction.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Visual style | Dark Sportsbook (Option A) | Deep dark background (#0d1117), electric green accent (#00e5a0), Barlow Condensed font family. Data-forward, professional feel. |
| Desktop layout | Left sidebar (200px) + 2-column card grid | Sidebar always visible for filters; grid maximizes content density. Future-proof for adding sports/filters. |
| Mobile layout | Single column + top filter pills + bottom sheet | Sidebar collapses to horizontal pills; advanced filters in expandable Sheet. |
| Header content | Logo, NavTabs (今日預測 / 準確率), LangSwitcher | Navigation + brand only. No filters in header. |
| Sidebar content | Sport, Date range, Confidence, Predicted direction | All content filtering lives in sidebar. |

## Color System

```
--bg-primary:    #0a0a0f    (page background)
--bg-secondary:  #0d1117    (header, main content area)
--bg-card:       #161b22    (cards)
--bg-sidebar:    #0f1419    (sidebar)
--border:        #1e2733    (borders, dividers)
--accent:        #00e5a0    (primary green — winner, active states)
--accent-dark:   #00b37a    (gradient end)
--text-primary:  #e2e8f0    (team abbreviations, headings)
--text-secondary:#a0aec0    (secondary values)
--text-muted:    #4a5568    (labels, inactive)
--text-dim:      #2d3748    (losing team, inactive tabs)
--conf-high:     #00e5a0    (green)
--conf-medium:   #fbbf24    (amber)
--conf-low:      #6b7280    (gray)
```

## Typography

- **Display / headings**: Barlow Condensed 800 (team abbreviations, percentages, nav)
- **Labels / UI**: Barlow Condensed 600-700 (filter labels, section titles, badges)
- **Body**: Barlow 400-500 (team names, descriptions)
- **Loaded via Google Fonts**: `Barlow Condensed:wght@400;600;700;800` + `Barlow:wght@400;500;600`

## File Structure (New/Modified)

```
src/
├── routes/
│   ├── __root.tsx                    ← MODIFY: wrap with PredictionsLayout
│   └── $lang/
│       ├── route.tsx                 ← MODIFY: validate lang, provide layout
│       └── predictions/route.tsx     ← MODIFY: full page implementation
│
├── components/
│   ├── layout/
│   │   ├── AppHeader.tsx             ← NEW: Logo + NavTabs + LangSwitcher
│   │   ├── AppSidebar.tsx            ← NEW: 4 filter sections
│   │   └── PredictionsLayout.tsx     ← NEW: Header + Sidebar + main grid wrapper
│   └── predictions/
│       ├── GameCard.tsx              ← NEW: single prediction card (dark style A)
│       ├── GameGrid.tsx              ← NEW: 2-col grid, loading/empty states
│       ├── WinProbabilityBar.tsx     ← NEW: gradient bar + percentage labels
│       └── OverUnderDisplay.tsx      ← NEW: O/U line + direction + pick
│
├── stores/predictions/
│   └── predictionStore.ts            ← NEW: Zustand store for filter state
│
├── services/predictions/
│   └── api.ts                        ← NEW: Supabase query with filter params
│
├── hooks/predictions/
│   └── useDailyPredictions.ts        ← NEW: TanStack Query wrapper
│
└── lib/i18n/
    ├── en.ts                         ← NEW: English translations
    ├── zh.ts                         ← NEW: Chinese translations
    └── index.ts                      ← NEW: useTranslation() hook
```

## Component Design

### AppHeader

```
┌──────────────────────────────────────────────────────┐
│  AISports     [● 今日預測]  [準確率]         [EN|中]  │
└──────────────────────────────────────────────────────┘
```

- Fixed at top, 52px height
- Logo: Barlow Condensed 800, `#00e5a0`
- NavTabs: active tab has `rgba(0,229,160,0.12)` background + green dot
- LangSwitcher: toggle between `en` / `zh`, updates route `$lang` param
- Accuracy tab links to `/$lang/accuracy` (renders empty until Phase 5)

### AppSidebar

- Fixed left, 200px wide on desktop
- 4 sections, each with `sidebar-section-title` (uppercase 9px label)

**Section 1 — 運動種類:**
- Items: 全部 / NBA / MLB (with game count badges)
- Single select, default: 全部

**Section 2 — 時間段:**
- Month navigator (‹ Apr 2026 ›)
- Quick tabs: 今天 / 明天 / 本週
- Single select, default: 今天

**Section 3 — 信心度:**
- Pills: 高 (green) / 中 (amber) / 低 (gray)
- Multi-select toggle, default: all selected (no filter)

**Section 4 — 預測方向:**
- Items: 全部 / 主隊勝 / 客隊勝
- Single select, default: 全部

### GameCard

```
┌─────────────────────────────────┐
│ NBA · 季後賽    19:30 ET   高信心  │
├─────────────────────────────────┤
│  LAL              VS         BOS │
│  洛杉磯湖人             波士頓塞爾提克  │
│                                  │
│  主隊勝率              客隊勝率      │
│  68%                      32%   │
│  ████████████░░░░░              │
├─────────────────────────────────┤
│  大小分 215.5   ▲ 大分 55%  LAL勝  │
└─────────────────────────────────┘
```

- `bg: #161b22`, `border: #1e2733`, `border-radius: 10px`
- Header bar: sport tag (green), time (muted), confidence badge
- Team abbreviations: Barlow Condensed 32-34px, winner white, loser dim
- Team full name: 11px, uppercase, muted (uses `name_en` or `name_zh` based on lang)
- WinProbabilityBar: 6px height, green gradient fill
- Footer: O/U line, direction pick (green pill), predicted winner

### GameGrid

- Desktop: `grid-template-columns: 1fr 1fr`, gap 8-12px
- Mobile (<768px): single column
- Loading: 4 skeleton cards using Shadcn `Skeleton`
- Empty: centered message + reset filters button
- Error: error message + retry button

### Mobile Filter Bar

When viewport < 768px, sidebar hides and a top filter bar appears:

```
┌─────────────────────────────────────┐
│ [全部] [NBA] [MLB]  今天 ▼   篩選 ⚙  │
└─────────────────────────────────────┘
```

- Sport pills: horizontal scroll
- Date: dropdown or pill with current date
- "篩選 ⚙" button → opens Shadcn `Sheet` (bottom) with confidence + direction filters

## Data Flow

```
predictionStore (Zustand)
  { sport, dateRange, confidence[], direction }
         │
         ↓ store state changes
useDailyPredictions (TanStack Query)
         │  queryKey: ['predictions', sport, dateRange, confidence, direction]
         ↓
api.fetchDailyPredictions(filters) → Supabase
         │  SELECT games.*, predictions.*, home_team:teams!home_team_id(*), away_team:teams!away_team_id(*)
         │  WHERE game_date IN dateRange
         │  AND sport_id = sport (if not 'all')
         │  AND confidence_level IN confidence[] (if filtered)
         │  AND predicted_winner = direction (if not 'all')
         │  ORDER BY game_time ASC
         ↓
GameGrid → GameCard[]
```

- TanStack Query `staleTime: 5min` (already configured in queryClient)
- Filter changes update Zustand store → query key changes → automatic refetch

## Zustand Store Shape

```ts
interface PredictionFilters {
  sport: 'all' | 'nba' | 'mlb'
  dateRange: 'today' | 'tomorrow' | 'week' | string  // 'week' = today through Sunday; string = specific YYYY-MM-DD
  confidence: ('high' | 'medium' | 'low')[]           // empty = no filter (show all)
  direction: 'all' | 'home' | 'away'
}

interface PredictionStore extends PredictionFilters {
  setSport: (sport: PredictionFilters['sport']) => void
  setDateRange: (range: PredictionFilters['dateRange']) => void
  toggleConfidence: (level: 'high' | 'medium' | 'low') => void
  setDirection: (dir: PredictionFilters['direction']) => void
  resetFilters: () => void
}
```

## i18n

Static TypeScript objects, type-safe, no runtime library:

```ts
// lib/i18n/en.ts
export const en = {
  nav: { predictions: "Today's Picks", accuracy: "Accuracy" },
  filter: {
    sport: "Sport", allSports: "All", today: "Today", tomorrow: "Tomorrow",
    thisWeek: "This Week", confidence: "Confidence", direction: "Prediction",
    high: "High", medium: "Medium", low: "Low",
    all: "All", home: "Home Win", away: "Away Win",
  },
  predictions: {
    homeWinPct: "Home Win %", awayWinPct: "Away Win %",
    ouLine: "O/U Line", over: "Over", under: "Under",
    noResults: "No predictions match your filters.",
    resetFilters: "Reset Filters",
    updateHint: "Predictions are usually updated each morning.",
  },
} as const
```

- `useTranslation()` reads `$lang` from TanStack Router route params
- Team names come from DB (`name_en` / `name_zh`), not from i18n objects

## Routing

```
/                       → redirect → /en/predictions
/$lang/predictions      → Daily predictions feed (this spec)
/$lang/accuracy         → Phase 5 (route exists, shows placeholder)
/$lang/:sport/:slug     → Phase 3 (not created yet)
```

`$lang/route.tsx` responsibilities:
- Validate `$lang` is `en` or `zh`, otherwise redirect to `/en/predictions`
- Render `PredictionsLayout` wrapping `<Outlet />`

## State Handling

| State | Behavior |
|-------|----------|
| Loading | 4 skeleton cards in grid (Shadcn `Skeleton`) |
| Empty (no matches for filter) | "No predictions match your filters." + Reset Filters button |
| Empty (no data ingested today) | "Predictions are usually updated each morning." |
| API error | Error message + Retry button (TanStack Query `retry: 1`) |

## Out of Scope (Not Phase 2)

- Game detail pages (Phase 3)
- Bot prerender / SEO infrastructure (Phase 4)
- Accuracy dashboard (Phase 5)
- Language auto-detection via Accept-Language (Phase 6)
- User authentication
- Real-time updates / WebSocket
