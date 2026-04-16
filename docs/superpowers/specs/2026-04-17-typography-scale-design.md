# Typography Scale — Full App Fix

**Date:** 2026-04-17
**Status:** Approved

## Problem

The app has a systemic small-text issue. Font sizes range from 8px to 13px across the UI, using the condensed Barlow Condensed typeface. Condensed fonts at these sizes are unreadable in practice, especially for key information like prediction labels, star ratings, and confidence percentages.

Affected locations:
- `PredictionColumn` — dimension labels at 8px, stars/% at 9px
- `AppSidebar` — section titles at 9px, count badges at 10px, star filter buttons at 11px
- `GameCard` — header metadata (sport, time, date) at 10px, team full names at 10px, footer link at 10px
- `AppHeader` — nav links at 12px (`text-xs`), language toggle at 11px
- `GameDetailHeader` — back link at 11px, sport badge at 10px, team names at 11px
- `BettingCard` and other game-detail cards — labels at 11px

## Solution

**Full app fix** using direct surgical replacement. Apply a unified type scale ("Bold" level) across all components. No new abstraction layers; each component updated in place.

## Type Scale

| Level | Size | Usage |
|---|---|---|
| `micro` | **12px** | Column dimension labels (MONEYLINE, SPREAD, O/U); sidebar section titles |
| `xs` | **13px** | Stars, confidence %, header metadata (sport/time/date), team full names, footer links, count badges, language toggle, back links |
| `sm` | **14px** | Nav links, star filter buttons, back link |
| `base` | **15px** | Sidebar items, VS text |
| `pick` | **16px** | PredictionColumn pick values (LAL, O 224.5, PASS) |

**Unchanged:** Team abbreviations (32px in cards, 52px in detail header) — these anchors maintain the visual hierarchy contrast.

## Implementation: Direct Replacement Map

### `src/components/predictions/PredictionColumn.tsx`
All sizes are inline style objects:
- Dimension label: `8px` → `12px`
- StarRating `size` prop: `9` → `12`
- PASS text: `12px` → `16px`
- Pick text: `13px` → `16px`
- Percentage / lineRef: `9px` → `13px`

### `src/components/predictions/GameCard.tsx`
Tailwind classes:
- Header sport badge / time / date: `text-[10px]` → `text-[13px]`
- Team full names: `text-[10px]` → `text-[13px]`
- VS text: `text-[13px]` → `text-[15px]`
- Footer "View Detail": `text-[10px]` → `text-[13px]`

### `src/components/layout/AppSidebar.tsx`
- `SECTION_TITLE` class: `text-[9px]` → `text-[12px]`
- `SIDEBAR_ITEM` class: `text-[13px]` → `text-[15px]`
- `CountBadge`: `text-[10px]` → `text-[13px]`
- Star filter buttons: `text-[11px]` → `text-[14px]`

### `src/components/layout/AppHeader.tsx`
- Nav links: `text-xs` → `text-sm` (12px → 14px)
- Language toggle buttons: `text-[11px]` → `text-[13px]`

### `src/components/game-detail/GameDetailHeader.tsx`
- Back link: `text-[11px]` → `text-[14px]`
- Sport badge: `text-[10px]` → `text-[13px]`
- Status / game time: `text-[10px]` / `text-[11px]` → `text-[13px]`
- Team full names: `text-[11px]` → `text-[13px]`
- VS text: `text-[15px]` → keep (already acceptable)

### `src/components/game-detail/BettingCard.tsx` (and other detail cards)
- Market labels: `text-[11px]` → `text-[13px]`
- Any body text at 11px or below: raise to 13px minimum

### `src/components/predictions/StarRating.tsx`
- The `size` prop controls the px size of each star. All call sites pass `size={9}` — update to `size={12}`.

## Constraints

- **No layout breakage**: Team abbreviation sizes (32px / 52px) stay unchanged.
- **Barlow Condensed preserved**: Font family stays the same throughout.
- **Color tokens unchanged**: Only sizes change, no color adjustments in this pass.
- **Spacing**: No padding/margin changes in this pass — the text size increase alone is sufficient for readability.

## Out of Scope

- Game detail analysis cards (BullpenCard, LineupCard, etc.) — these use larger text already and can be addressed separately if needed.
- Mobile-specific sizing or responsive breakpoints.
- Color contrast improvements (separate concern).
