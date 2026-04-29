# Game Detail Page — Layout & Typography Redesign

**Date:** 2026-04-18
**Branch:** to be created from master

## Overview

The game detail page currently uses `max-w-2xl mx-auto` (672px centered) with very small font sizes (9–13px for most text). This spec defines a full-width layout with larger typography to make the page more readable and spacious.

## Layout

### Container Width

Remove the `max-w-2xl mx-auto` constraint in `src/routes/$lang/$sport/$slug/route.tsx`. Content fills the full available area to the right of the sidebar (existing `p-4 md:p-6` padding is preserved).

The same removal applies to the loading skeleton (`GameDetailSkeleton`).

### Card Grid (desktop only, `md:` breakpoint and above)

Cards in `AnalysisSection` are reorganized into a mixed layout:

**Full-width cards** (complex content, needs space):
- `WinProbabilityCard`
- `SignalTable`
- `BettingCard`

**Two-column grid pairs** (secondary info):
- Row 1: `RecentFormCard` + `PitchingMatchupCard`
- Row 2: `LineupCard` + `BullpenCard`
- Row 3: `ScorePredictionCard` + `EnvironmentCard`

`GameDetailHeader` and `PredictionBreakdown` remain full-width (they sit above `AnalysisSection`).

On mobile, all cards revert to single-column stacking (default).

## Typography Scale

All sizes use Tailwind responsive prefixes (`md:` for desktop values).

| Element | Mobile | Desktop (md+) |
|---|---|---|
| Section label (was 9px) | `text-xs` (12px) | `text-sm` (14px) |
| Body / explanation text (was 13px) | `text-base` (16px) | `text-xl` (20px) |
| Stat values / percentages (was 10px) | `text-[13px]` | `text-base` (16px) |
| Sub-headings / pick text (was 13px) | `text-[15px]` | `text-lg` (18px) |
| Team abbreviation (was 52px) | `text-[52px]` | `text-[72px]` |
| Score (was 32px) | `text-[32px]` | `text-[48px]` |
| VS separator (was 15px) | `text-[15px]` | `text-[22px]` |

## Files to Change

| File | Change |
|---|---|
| `src/routes/$lang/$sport/$slug/route.tsx` | Remove `max-w-2xl mx-auto` from page container and skeleton |
| `src/components/game-detail/AnalysisSection.tsx` | Add mixed grid layout with `md:grid md:grid-cols-2` pairs |
| `src/components/game-detail/GameDetailHeader.tsx` | Apply new font sizes |
| `src/components/game-detail/PredictionBreakdown.tsx` | Apply new font sizes |
| `src/components/game-detail/WinProbabilityCard.tsx` | Apply new font sizes |
| `src/components/game-detail/BettingCard.tsx` | Apply new font sizes |
| `src/components/game-detail/RecentFormCard.tsx` | Apply new font sizes |
| `src/components/game-detail/PitchingMatchupCard.tsx` | Apply new font sizes |
| `src/components/game-detail/LineupCard.tsx` | Apply new font sizes |
| `src/components/game-detail/BullpenCard.tsx` | Apply new font sizes |
| `src/components/game-detail/EnvironmentCard.tsx` | Apply new font sizes |
| `src/components/game-detail/SignalTable.tsx` | Apply new font sizes |
| `src/components/game-detail/ScorePredictionCard.tsx` | Apply new font sizes |

## Constraints

- Do not change colors, fonts family (`--font-barlow-condensed`), border radius, or dark theme palette.
- Do not change any component outside `game-detail/` or the detail route file.
- The `PredictionsLayout` wrapper is not modified.
