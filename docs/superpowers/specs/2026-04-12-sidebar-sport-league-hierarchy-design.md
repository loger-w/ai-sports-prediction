# Sidebar: Replace Direction Filter with Sport → League Hierarchy

**Date**: 2026-04-12
**Branch**: `feat/phase2-ui-and-pages`
**Status**: Draft

## Problem

The current `AppSidebar` and `MobileFilterBar` expose a `direction` filter (All / Home / Away) that lets users narrow predictions by whether the AI's moneyline pick is the home or away team. This filter:

1. **Does not match any real user intent** — nobody browses predictions looking for "only AI home picks". It is not a meaningful discovery dimension like sport or confidence (star rating).
2. **Cuts results roughly in half without adding signal** — picks split ~50/50 between home and away; filtering strips content without improving quality.
3. **Is already visible on each `GameCard`** — the pick direction is shown per game, so filtering adds clicks but saves no work.
4. **Occupies prime sidebar space** — a whole section on the desktop sidebar and a section inside the mobile filter sheet.

At the same time, the current Sport selector uses league codes directly (`NBA`, `MLB`), which does not extend cleanly as more leagues are added (NPB, CPBL, CBA, KBO, etc.). A flat list conflates the "sport type" and the "league" taxonomy levels.

## Goal

Remove the `direction` filter and reorganize the Sport selector into a two-level hierarchy — **Sport → League** — that (a) reflects how sports are naturally categorized, (b) frees the space previously occupied by `direction`, and (c) is extensible as new leagues come online.

## Non-Goals

- No changes to the `minStars` filter.
- No changes to prediction ingestion, ranking, or data schema.
- No backend / API schema change; filtering logic in `services/predictions/api.ts` only loses the `direction` branch.
- No attempt to support multi-league-per-sport selection at the state level today. State stays flat (`sport: 'all' | 'nba' | 'mlb'`); the hierarchy is UI-derived. This is revisited only when a second league exists within a sport.

## Design Overview

### Visual Structure (Desktop Sidebar)

The sidebar keeps its existing sections — Sport, Min Stars — and replaces the Direction block with a **League** block that sits below the Min Stars block.

```
SPORT
  🏆 All              24
  🏀 Basketball       12
  ⚾ Baseball         12
─────────────
MIN STARS
  [All] [2+ ★] [3+ ★] [4+ ★] [5+ ★]
─────────────
LEAGUES                ← contextual label (see below)
  NBA                 12
  MLB                 12
```

### Contextual League Block

The League block's label and contents depend on the current Sport selection:

| Sport state    | Label              | Contents                                                                                   |
| -------------- | ------------------ | ------------------------------------------------------------------------------------------ |
| `all`          | `LEAGUES`          | All available leagues listed (NBA, MLB). None active. Clicking one narrows to that league. |
| `nba`          | `BASKETBALL LEAGUES` | Only basketball leagues listed (NBA). NBA shown as active.                                |
| `mlb`          | `BASEBALL LEAGUES`  | Only baseball leagues listed (MLB). MLB shown as active.                                  |

The block is **always rendered**, even when the current sport has only one league. Rationale: layout stability matters more than a tiny space saving, and showing a single league makes the two-level taxonomy visible (users immediately understand that new leagues will appear here).

### Visual Treatment

League items use the same base style as Sport items (font size, weight, active state, count badge), with two differences:

- **No emoji** on league items (emojis live only at the sport-category level, creating visual distinction between parent and child).
- **Count badges retained** on league items (consistent with sport items).

### Interaction Rules

- Clicking a Sport category sets the underlying `sport` store value:
  - `All` → `sport = 'all'`
  - `Basketball` → `sport = 'nba'` (the default / most popular league in that category)
  - `Baseball` → `sport = 'mlb'`
- Clicking a league item sets `sport` to that league directly. This also causes the Sport category highlight to jump to the matching parent (purely derived).
- There is no "Basketball but no league selected" state. Selecting Basketball always resolves to a concrete league, because the store has only one field.

### Mobile (`MobileFilterBar`)

The mobile pill bar keeps the horizontal single-row layout but changes its content to show **Sport categories only**:

```
[🏆 All] [🏀 Basketball] [⚾ Baseball] [⚙ Filter]
```

Clicking `Basketball` or `Baseball` sets `sport` to the default league (`nba` / `mlb`) — identical to the desktop behavior.

The mobile filter sheet loses its Direction block. It does **not** gain a League block in this change; mobile users cannot switch between leagues within a sport from the pill bar today. This is an intentional deferral — with one league per sport, there is nothing to switch to. When a second league is added to any sport, a follow-up change adds a League block to the mobile sheet (matching the desktop two-level structure).

## State & Data Model

The `predictionStore` keeps a single flat field:

```ts
sport: 'all' | 'nba' | 'mlb'
```

The `direction` field is removed entirely. The Sport category used for highlighting the sidebar is a pure derivation:

```ts
function sportCategory(sport: Sport): 'all' | 'basketball' | 'baseball' {
  if (sport === 'all') return 'all'
  if (sport === 'nba') return 'basketball'
  if (sport === 'mlb') return 'baseball'
}
```

This keeps state changes minimal and avoids introducing a new field that currently carries no additional information. Future work (second league in a sport) will likely split state into `category` + `league` — called out as a follow-up, not part of this change.

## Files Touched

### Removed / Simplified
- `src/stores/predictions/predictionStore.ts` — remove `direction`, `setDirection`, its default value.
- `src/services/predictions/api.ts` — remove the `direction` branch from `fetchDailyPredictions` filtering and its parameter type.
- `src/hooks/predictions/useDailyPredictions.ts` — remove `direction` from query key and args.
- `src/lib/i18n/zh.ts` and `src/lib/i18n/en.ts` — remove `filter.direction`, `filter.home`, `filter.away`.
- `src/components/predictions/GameGrid.tsx` — remove `direction` from `activeFiltersCount` and `resetFilters` wiring.

### Updated
- `src/components/layout/AppSidebar.tsx`:
  - Rename/rework the Sport section so Sport labels become `All` / `Basketball` / `Baseball` while the underlying `sport` values remain `'all' | 'nba' | 'mlb'`.
  - Replace the Direction section with a new League section implementing the contextual-label rules above.
  - Derive the highlighted Sport category from the current `sport` store value.
- `src/components/layout/MobileFilterBar.tsx`:
  - Change pill labels to `All` / `Basketball` / `Baseball`.
  - Remove the Direction block from the filter sheet (keep Min Stars).

### i18n (added)
- `filter.basketball` → `籃球` / `Basketball`
- `filter.baseball` → `棒球` / `Baseball`
- `filter.leagues` → `聯盟` / `Leagues`
- `filter.basketballLeagues` → `籃球聯盟` / `Basketball Leagues`
- `filter.baseballLeagues` → `棒球聯盟` / `Baseball Leagues`

The existing `filter.allSports` label is reused for the `All` sport option.

### Tests
- `src/test/integration/predictionStore.test.ts` — remove `direction` default-state assertion and `setDirection` test.
- Add a small unit/component test for `AppSidebar` verifying the three League-block states (All / Basketball / Baseball) render the correct label and correct set of league items, with the correct active state.
- Update any `GameGrid` or layout tests that reference `direction` in `activeFiltersCount` / `resetFilters` behavior.

## Error Handling

No new error paths. All changes are UI-level and pure state reshuffling.

## Rollout

Single PR, single commit cluster. No feature flag needed — the filter removal and the new layout should ship together to avoid a broken intermediate state.

## Open Questions / Deferred

- **Mobile filter sheet League block** — deferred until at least one sport has ≥2 leagues.
- **State model split into `category` + `league`** — deferred, same trigger.
- **League emoji / icons** — not adding any today; revisit when visual differentiation between sibling leagues (e.g. NBA vs CBA) would help scannability.
