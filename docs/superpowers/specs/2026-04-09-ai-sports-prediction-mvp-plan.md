# AI Sports Prediction Website - MVP Implementation Plan

## Context

Based on the Discovery Plan (`2026-04-09-ai-sports-prediction-discovery.md`), we're building an AI sports prediction website that uses custom Claude Skills to predict NBA and MLB game winners (win probability %) and over/under scores. The site needs strong SEO (programmatic SEO - one page per game) and i18n (English + Chinese) to validate the G1 assumption (discoverability in a competitive market).

## Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Frontend | Vite + React 19 + TanStack Router + TanStack Query | User's existing expertise from tw-stock-pair-trading |
| Styling | Tailwind CSS v4 + Shadcn UI (new-york) | Same as existing project |
| State | Zustand (UI filters) + TanStack Query (server data) | Matches existing patterns |
| Charts | ApexCharts | Already in user's dependency tree |
| Database | Supabase (PostgreSQL + Auth + API) | Great for MVP, free tier sufficient |
| Deployment | Vercel | Native serverless functions + CDN |
| SEO Strategy | SPA + Vercel Serverless bot prerender | Zero framework risk, clean separation |
| i18n | Route-based (`/$lang/`) + static TypeScript translation objects | Lightweight, type-safe |

## Project Structure

```
ai-sports-prediction/
├── api/                              # Vercel Serverless Functions
│   ├── render/[sport]/[slug].ts      # SEO prerender for bots
│   ├── sitemap.xml.ts                # Dynamic sitemap
│   └── cron/
│       ├── ingest-predictions.ts     # Ingest Claude Skill JSON
│       └── resolve-results.ts        # Fetch scores, resolve predictions
├── src/
│   ├── routes/
│   │   ├── __root.tsx
│   │   ├── index.tsx                 # Root → redirect to /$lang/predictions
│   │   └── $lang/
│   │       ├── route.tsx             # Language layout (validates $lang)
│   │       ├── predictions/
│   │       │   └── route.tsx         # Daily predictions feed
│   │       ├── accuracy/
│   │       │   └── route.tsx         # Historical accuracy dashboard
│   │       └── $sport/
│   │           └── $slug/
│   │               └── route.tsx     # Game detail (programmatic SEO)
│   ├── components/
│   │   ├── layout/                   # AppHeader, AppFooter, NavTabs, LangSwitcher
│   │   ├── predictions/             # GameCard, GameList, WinProbabilityBar, OverUnderDisplay, SportFilter, DatePicker
│   │   ├── game-detail/             # GameDetailHeader, PredictionBreakdown, SchemaMarkup
│   │   ├── accuracy/               # AccuracyOverview, AccuracyBySport, AccuracyTrend
│   │   └── ui/                      # Shadcn UI components
│   ├── hooks/predictions/           # useDailyPredictions, useGameDetail, useAccuracyStats
│   ├── services/predictions/        # Supabase query functions + types
│   ├── stores/predictions/          # Zustand store (date/sport filters)
│   ├── lib/
│   │   ├── utils.ts                 # cn() utility
│   │   ├── supabase.ts             # Supabase client
│   │   ├── queryClient.ts
│   │   ├── i18n/                    # en.ts, zh.ts, index.ts
│   │   └── predictions/            # constants.ts, seo.ts (schema generators)
│   └── types/predictions/           # TypeScript types
├── supabase/migrations/             # SQL migration files
├── vercel.json
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## Database Schema

### Tables

**sports**
| Column | Type | Note |
|--------|------|------|
| id | TEXT PK | 'nba', 'mlb' |
| name_en | TEXT | 'NBA', 'MLB' |
| name_zh | TEXT | 'NBA', 'MLB' |
| is_active | BOOLEAN | default true |

**teams**
| Column | Type | Note |
|--------|------|------|
| id | TEXT PK | 'lakers', 'celtics' |
| sport_id | TEXT FK | → sports.id |
| name_en | TEXT | 'Los Angeles Lakers' |
| name_zh | TEXT | '洛杉磯湖人' |
| abbreviation | TEXT | 'LAL', 'BOS' |
| logo_url | TEXT | optional |

**games**
| Column | Type | Note |
|--------|------|------|
| id | UUID PK | auto-generated |
| sport_id | TEXT FK | → sports.id |
| home_team_id | TEXT FK | → teams.id |
| away_team_id | TEXT FK | → teams.id |
| game_date | DATE | |
| game_time | TIMESTAMPTZ | scheduled start |
| slug | TEXT UNIQUE | 'lakers-vs-celtics-2026-04-10' |
| status | TEXT | 'scheduled' / 'final' |
| home_score | INTEGER | filled after game ends |
| away_score | INTEGER | filled after game ends |

**predictions**
| Column | Type | Note |
|--------|------|------|
| id | UUID PK | |
| game_id | UUID FK | → games.id |
| home_win_pct | DECIMAL(5,2) | e.g., 62.50 |
| away_win_pct | DECIMAL(5,2) | e.g., 37.50 |
| predicted_winner | TEXT | 'home' / 'away' |
| confidence_level | TEXT | 'high' / 'medium' / 'low' |
| over_under_line | DECIMAL(5,1) | e.g., 215.5 |
| over_pct | DECIMAL(5,2) | |
| under_pct | DECIMAL(5,2) | |
| explanation_en | TEXT | AI explanation (English) |
| explanation_zh | TEXT | AI explanation (Chinese) |

**prediction_results**
| Column | Type | Note |
|--------|------|------|
| id | UUID PK | |
| prediction_id | UUID FK | → predictions.id |
| game_id | UUID FK | → games.id |
| winner_correct | BOOLEAN | |
| over_under_correct | BOOLEAN | |

### Views
- **accuracy_stats** — aggregates daily hit rates by sport (winner_pct, ou_pct)

### RLS
- Public read access on all tables (no auth required for MVP)

## Data Pipeline

```
Claude Skill (JSON output)
  → POST to /api/cron/ingest-predictions (authenticated)
  → Upsert games + predictions in Supabase
  → Generate slug per game (e.g., lakers-vs-celtics-2026-04-10)

Next morning:
  /api/cron/resolve-results (Vercel Cron)
  → Fetch final scores from ESPN public API
  → Update games.status + scores
  → Insert prediction_results (winner_correct, over_under_correct)
```

### Claude Skill JSON Output Schema

```json
{
  "date": "2026-04-10",
  "sport": "nba",
  "predictions": [
    {
      "home_team": "LAL",
      "away_team": "BOS",
      "game_time": "2026-04-10T02:30:00Z",
      "home_win_pct": 62.5,
      "away_win_pct": 37.5,
      "over_under_line": 215.5,
      "over_pct": 55.0,
      "under_pct": 45.0,
      "explanation_en": "Lakers have won 8 of last 10 home games...",
      "explanation_zh": "湖人最近10場主場贏了8場..."
    }
  ]
}
```

### Sports Data Source for Scores
ESPN public API (free, no auth):
- NBA: `site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard`
- MLB: `site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard`

## SEO Architecture

```
Human user → Vercel CDN → SPA (index.html)
Googlebot  → Vercel rewrite (User-Agent detection) → /api/render/:sport/:slug
             → Queries Supabase → Returns full HTML with:
               - <title>, <meta description>, OG tags
               - SportsEvent JSON-LD schema
               - Visible prediction content
```

### vercel.json

```json
{
  "rewrites": [
    {
      "source": "/:lang(en|zh)/:sport(nba|mlb)/:slug",
      "has": [
        { "type": "header", "key": "user-agent", "value": ".*(Googlebot|Bingbot|Slurp|DuckDuckBot|Baiduspider|YandexBot|facebookexternalhit|Twitterbot|LinkedInBot).*" }
      ],
      "destination": "/api/render/:sport/:slug?lang=:lang"
    },
    {
      "source": "/((?!api/).*)",
      "destination": "/index.html"
    }
  ],
  "crons": [
    { "path": "/api/cron/resolve-results", "schedule": "0 12 * * *" }
  ]
}
```

### Programmatic SEO
- Each game auto-generates URL: `/{lang}/{sport}/{slug}`
- SportsEvent JSON-LD schema per game page
- Dynamic sitemap at `/api/sitemap.xml`
- `robots.txt` referencing sitemap
- Niche keyword targeting: "AI NBA predictions today", "NBA over under predictions", "MLB AI picks free"

## i18n Approach

- Route-based: `/$lang/predictions`, `/$lang/nba/lakers-vs-celtics-2026-04-10`
- Static TypeScript translation objects (`en.ts`, `zh.ts`) — type-safe, no runtime library
- `useTranslation()` hook reads `$lang` route param
- Team names bilingual from DB; slugs always English
- Language auto-detection via Accept-Language header → redirect

## Development Phases

### ✅ Phase 0: Project Bootstrap (completed 2026-04-09)
1. ✅ Init Vite + React + TS project
2. ✅ Install deps: @tanstack/react-router, @tanstack/react-query, @supabase/supabase-js, tailwindcss, zustand
3. ✅ Set up Shadcn UI (new-york style)
4. ✅ Configure vite.config.ts (TanStack Router plugin, Tailwind plugin)
5. ✅ Set up ESLint (@tanstack/eslint-config)
6. ✅ Create Supabase project, run DB migrations
7. ✅ Seed sports + teams tables (NBA 30 teams, MLB 30 teams)
8. ✅ Deploy skeleton to Vercel

### ✅ Phase 1: Data Pipeline (completed 2026-04-11)
1. ✅ Define Claude Skill JSON output schema (`src/types/predictions/index.ts`)
2. ✅ Build `api/cron/ingest-predictions.ts` — validates + upserts predictions
3. ✅ Build `src/lib/supabase.ts` — client init
4. ⏭ Test ingestion end-to-end (deferred — requires live Claude Skill output)
5. ✅ Build `api/cron/resolve-results.ts` — ESPN API scores + resolve predictions
6. ⏭ Test full pipeline: ingest → game ends → resolve (deferred — requires live data)

### ✅ Phase 2: Daily Predictions Feed (Core Page) (completed 2026-04-11)
1. ✅ Route structure: `__root.tsx`, `$lang/route.tsx`, `$lang/predictions/route.tsx`
2. ✅ `src/services/predictions/api.ts` — Supabase queries
3. ✅ `src/hooks/predictions/useDailyPredictions.ts` — useQuery wrapper
4. ✅ Components: GameCard, GameGrid, WinProbabilityBar, OverUnderDisplay, SportFilter, DatePicker (integrated into AppSidebar / MobileFilterBar)
5. ✅ `src/stores/predictions/predictionStore.ts` — date/sport filter
6. ✅ Layout: AppHeader, AppFooter, AppSidebar, MobileFilterBar, LanguageSwitcher
7. ✅ i18n: useTranslation hook, en.ts, zh.ts

### ✅ Phase 3: Game Detail Pages (completed 2026-04-11)
1. ✅ Route: `$lang/$sport/$slug/route.tsx`
2. ✅ `useGameDetail.ts` hook
3. ✅ Components: GameDetailHeader, PredictionBreakdown, SchemaMarkup
4. ✅ Inject SportsEvent JSON-LD schema
5. ✅ OG meta tags + document.title via useEffect

### ✅ Phase 4: SEO Infrastructure (completed 2026-04-11)
1. ✅ `api/render/[sport]/[slug].ts` — bot prerender function
2. ✅ `api/sitemap.xml.ts` — dynamic sitemap
3. ✅ `vercel.json` — bot User-Agent rewrite rules + cron config (completed Phase 0)
4. ✅ `robots.txt` (completed Phase 0)
5. ⏭ Test: `curl -A "Googlebot"` returns full HTML (requires live deploy)
6. ⏭ Test: Google Rich Results Test validates schema (requires live deploy)

### ✅ Phase 5: Accuracy Dashboard (completed 2026-04-11)
1. ✅ Route: `$lang/accuracy/route.tsx`
2. ✅ `useAccuracyStats.ts` hook
3. ✅ Components: AccuracyOverview, AccuracyBySport, AccuracyTrend (ApexCharts, lazy-loaded)

### ✅ Phase 6: Polish & Deploy (completed 2026-04-11)
1. ✅ Mobile responsive pass (no-scrollbar utility, GameCard team name truncation)
2. ✅ Loading states + error boundaries (RootErrorComponent + RootNotFoundComponent in __root.tsx)
3. ✅ 404 page (notFoundComponent on createRootRoute)
4. ✅ Language auto-detection (navigator.language in index.tsx beforeLoad)
5. ✅ Favicon, OG images (og-image.svg, apple-touch-icon, full OG/Twitter meta tags)
6. ✅ Vercel Analytics (@vercel/analytics <Analytics /> in __root.tsx)
7. ⏭ Final deploy + smoke test (requires live deploy)

## Reference Files (Reuse Patterns From)
- `tw-stock-pair-trading/frontend/vite.config.ts` — Vite + TanStack Router + Tailwind config
- `tw-stock-pair-trading/frontend/src/routes/__root.tsx` — Root layout with QueryClientProvider
- `tw-stock-pair-trading/frontend/src/hooks/` — useQuery wrapper patterns
- `tw-stock-pair-trading/frontend/src/stores/` — Zustand store patterns
- `tw-stock-pair-trading/frontend/src/lib/utils.ts` — cn() utility
- `tw-stock-pair-trading/frontend/components.json` — Shadcn config

## Verification

### Unit Tests (Vitest)
- Slug generation, i18n functions, SportsEvent schema generator, accuracy calculations

### Integration Tests
- GameCard renders with mock data, GameList filters by sport, LanguageSwitcher toggles route

### SEO Verification
- `curl -A "Googlebot" https://domain/en/nba/slug` returns full HTML with schema
- Google Rich Results Test validates SportsEvent
- Sitemap lists all game pages
- Lighthouse Core Web Vitals pass

### E2E Manual
- Full pipeline: ingest prediction → display on site → game ends → resolve → accuracy updates
- i18n: all text switches between en/zh
- Mobile: test on iPhone/Android viewports
