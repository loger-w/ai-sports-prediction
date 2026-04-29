---
date: 2026-04-18
topic: Game Detail — Typography Polish & RecentForm Divider
branch: feat/game-detail-typography-polish
---

# Game Detail — Typography Polish & RecentForm Divider

## Overview

Follow-up polish pass for the game detail page. The prior layout redesign (2026-04-18-game-detail-layout-design) set the main typography scale but left several small-text tiers untouched:

- The AI prediction card's market labels (獨贏/讓分/大小分) are rendered through `PredictionColumn`, which uses hard-coded inline `px` font sizes that were missed by the earlier pass.
- Stat micro-labels (OPS, ERA, K%, run diff caption, etc.) across analysis cards are still `text-[10px] md:text-xs`.
- `LineupCard` table body (player names, stats) is still `text-xs md:text-sm`.
- `RecentFormCard` shows two teams in a 2-column grid with only `gap-6` spacing — the user wants a visible vertical divider between them.

This spec defines a second typography pass targeting these remaining tiers, plus the RecentForm divider.

## Scope

- Only files under `src/components/game-detail/**` plus `src/components/predictions/PredictionColumn.tsx`.
- Do not change colors, font family (`--font-barlow-condensed`), border radius, dark palette, or container layout.
- Do not modify any card not listed under "Files to Change".

## New typography tiers

These add to (do not replace) the tiers already defined in the prior spec.

| New tier | Purpose | Mobile | Desktop (md+) |
|---|---|---|---|
| Micro label | Stat labels under values (OPS, ERA, K%, RUNS, RUN DIFF caption, pitch types caption, Platoon Splits subtitle, Scenarios subtitle) | `text-xs` (12px) | `text-sm` (14px) |
| Table header | LineupCard thead cells | `text-xs` (12px) | `text-sm` (14px) |
| Table body | LineupCard tbody (player name, stat values) | `text-sm` (14px) | `text-base` (16px) |
| Secondary body | Platoon splits rows, IL pitcher/player rows | `text-sm` (14px) | `text-base` (16px) |
| Emphasized stat | RecentForm `run_diff` value | `text-lg` (18px) | `text-xl` (20px) |

## Per-file changes

### `src/components/predictions/PredictionColumn.tsx`

This file currently uses inline `style={{ fontSize: '12px' }}` throughout. Convert every size-bearing inline style to Tailwind classes so the component is responsive, and bump each element to the new scale.

| Element | Old | New |
|---|---|---|
| Dimension label (獨贏 / 讓分 / 大小分) | `fontSize: 12px` | `text-base md:text-xl` (16 / 20px) |
| StarRating `size` prop | `12` | `16` |
| Pick text (e.g. "LAL +3.5") | `fontSize: 16px` | `text-xl md:text-2xl` (20 / 24px) |
| PASS text | `fontSize: 16px` | `text-xl md:text-2xl` |
| Pct / lineRef footer | `fontSize: 13px` | `text-sm md:text-base` (14 / 16px) |
| Column padding | `padding: 10px 6px` | `py-3 md:py-4 px-2` |
| Label margin-bottom | `3px` | `mb-1.5` |
| Stars container margin-bottom | `4px` | `mb-2` |
| Pick → footer margin-top | `2px` | `mt-1` |

Inline color values (`#e2e8f0`, `#00e5a0`, `#2d3748`, `#3a4a5a`) are preserved — only sizing/spacing moves to Tailwind. `FONT` inline `style` and `borderRight` logic for non-last column stay as-is.

### `src/components/game-detail/PredictionBreakdown.tsx`

Single change: the "AI 預測" section title is still `text-[9px]` (outlier from the earlier pass). Align it with other card section titles.

| Line (approx.) | Old | New |
|---|---|---|
| 69 — `aiPick` label className | `text-[9px] font-bold tracking-[0.2em] uppercase text-[#3a4a5a]` | `text-xs md:text-sm font-bold tracking-[0.2em] uppercase text-[#3a4a5a]` |

### `src/components/game-detail/RecentFormCard.tsx`

Two changes:

**1. Add vertical divider between teams.**

Change the team grid from:

```tsx
<div className="px-5 py-4 grid grid-cols-2 gap-6">
  <TeamForm form={data.away} team={meta.away_team} align="left" />
  <TeamForm form={data.home} team={meta.home_team} align="right" />
</div>
```

to:

```tsx
<div className="px-5 py-4 grid grid-cols-[1fr_1px_1fr] gap-6">
  <TeamForm form={data.away} team={meta.away_team} align="left" />
  <div className="bg-[#1e2733]" />
  <TeamForm form={data.home} team={meta.home_team} align="right" />
</div>
```

The 1px middle column uses the same `#1e2733` as the card border; the grid stretches it to full row height automatically.

**2. Bump micro labels and `run_diff` value.**

| Element | Old | New |
|---|---|---|
| Stat micro labels (`runsScored`, `runsAllowed`, `runDiff`) — 3 occurrences | `text-[10px] md:text-xs` | `text-xs md:text-sm` |
| `run_diff` value | `text-[16px]` (hard-coded, not responsive) | `text-lg md:text-xl` |

### `src/components/game-detail/LineupCard.tsx`

| Element | Old | New |
|---|---|---|
| Team averages stat labels (OPS, xwOBA, K%, BB%) | `text-[10px] md:text-xs` | `text-xs md:text-sm` |
| Table base `<table>` font size | `text-xs md:text-sm` | `text-sm md:text-base` |
| Table `<thead>` row | `text-[10px] md:text-xs` | `text-xs md:text-sm` |
| Player name `<td>` `max-w-[100px]` | `max-w-[100px]` | `max-w-[140px]` |

### `src/components/game-detail/PitchingMatchupCard.tsx`

| Element | Old | New |
|---|---|---|
| Season stats label row | `text-[10px] md:text-xs` | `text-xs md:text-sm` |
| Expected stats label row | `text-[10px] md:text-xs` | `text-xs md:text-sm` |
| Pitch types caption | `text-[10px] md:text-xs` | `text-xs md:text-sm` |
| Pitch-mix legend chips | `text-[10px] md:text-xs` | `text-xs md:text-sm` |
| Platoon splits subtitle | `text-[9px]` | `text-xs md:text-sm` |
| Platoon splits body (`vs LHB` / `vs RHB`) | `text-xs md:text-sm` | `text-sm md:text-base` |

### `src/components/game-detail/BullpenCard.tsx`

| Element | Old | New |
|---|---|---|
| IL pitcher/player row | `text-xs md:text-sm` | `text-sm md:text-base` |

(`bullpenEra` row stays `text-xs md:text-sm` — it's a secondary metadata row, not the emphasized "IL names" that the user flagged.)

### `src/components/game-detail/ScorePredictionCard.tsx`

| Element | Old | New |
|---|---|---|
| "Scenarios" subtitle | `text-[10px] md:text-xs` | `text-xs md:text-sm` |

Other text in this card (score, team caps, range, total) was covered by the prior pass; leave unchanged.

### Files NOT changed

The following game-detail cards are already at the target scale for their content and require no edits in this pass:

- `GameDetailHeader.tsx`
- `BettingCard.tsx`
- `WinProbabilityCard.tsx`
- `EnvironmentCard.tsx`
- `SignalTable.tsx`
- `AnalysisSection.tsx`
- `route.tsx`

## Visual / UX checks

After implementation, verify by eye on desktop (`md:` and above):

- The three market labels (獨贏/讓分/大小分) read as prominent subsection titles, not as tiny caps.
- The RecentForm divider is a clean 1px vertical line flush with the top and bottom of the team block, spanning the full height of both team cells.
- In LineupCard, player names have enough room (no truncation on 9-character names) and sit on the same rhythm as the stat columns.
- Stat micro-labels (OPS, ERA, etc.) are readable without squinting — 14px uppercase with tracking.

## Constraints

- No changes to data structures, translations, or routing.
- No changes to any component outside the listed files.
- No new dependencies.
- Preserve all existing colors, spacing (except where explicitly changed), and the `barlow-condensed` font family.
