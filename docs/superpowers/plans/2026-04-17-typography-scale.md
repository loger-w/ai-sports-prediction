# Typography Scale Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Raise all sub-readable font sizes across the full app to the "Bold" type scale (12px minimum for labels, 13px for metadata, 15px for navigation/sidebar items, 16px for pick values).

**Architecture:** Pure styling change — direct replacement of hardcoded pixel values in 6 components and 1 shared primitive. No logic changes, no new abstractions. Existing tests validate that components still render correct content after each change.

**Tech Stack:** React, TypeScript, Tailwind CSS v4, inline style objects (mixed usage throughout)

---

## File Map

| File | What changes |
|---|---|
| `src/components/predictions/StarRating.tsx` | Default `size` prop: 9 → 12 |
| `src/components/predictions/PredictionColumn.tsx` | 5 inline style `fontSize` values |
| `src/components/predictions/GameCard.tsx` | 7 Tailwind `text-[Npx]` classes |
| `src/components/layout/AppSidebar.tsx` | 4 class constants / inline sizes |
| `src/components/layout/AppHeader.tsx` | 4 Tailwind classes across 2 elements |
| `src/components/game-detail/GameDetailHeader.tsx` | 5 Tailwind `text-[Npx]` classes |
| `src/components/game-detail/BettingCard.tsx` | 5 Tailwind `text-[Npx]` classes |

---

## Task 1: StarRating + PredictionColumn

These two files are tightly coupled (PredictionColumn renders StarRating). Fix them together.

**Files:**
- Modify: `src/components/predictions/StarRating.tsx`
- Modify: `src/components/predictions/PredictionColumn.tsx`
- Test: `src/test/integration/PredictionColumn.test.tsx` (existing — run to verify)

- [ ] **Step 1: Update StarRating default size**

In `src/components/predictions/StarRating.tsx`, change the default value of the `size` prop from `9` to `12`:

```tsx
export function StarRating({ stars, size = 12 }: StarRatingProps) {
```

- [ ] **Step 2: Update PredictionColumn font sizes**

In `src/components/predictions/PredictionColumn.tsx`, replace all five inline fontSize values:

Dimension label (currently `fontSize: '8px'`):
```tsx
      style={{
        ...FONT,
        fontSize: '12px',
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: '#3a4a5a',
        marginBottom: '3px',
      }}
```

StarRating call (currently `size={9}`):
```tsx
        <StarRating stars={stars} size={12} />
```

PASS text (currently `fontSize: '12px'`):
```tsx
          style={{
            ...FONT,
            fontSize: '16px',
            fontWeight: 700,
            color: '#2d3748',
            letterSpacing: '0.05em',
          }}
```

Pick text (currently `fontSize: '13px'`):
```tsx
          style={{
            ...FONT,
            fontSize: '16px',
            fontWeight: 800,
            color: '#00e5a0',
          }}
```

Bottom pct/lineRef (currently `fontSize: '9px'`):
```tsx
      style={{
        ...FONT,
        fontSize: '13px',
        color: '#2d3748',
        marginTop: '2px',
      }}
```

- [ ] **Step 3: Run existing tests**

```bash
npx vitest run src/test/integration/PredictionColumn.test.tsx
```

Expected: all 4 tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/predictions/StarRating.tsx src/components/predictions/PredictionColumn.tsx
git commit -m "style: raise PredictionColumn + StarRating font sizes to bold scale"
```

---

## Task 2: GameCard

**Files:**
- Modify: `src/components/predictions/GameCard.tsx`
- Test: `src/test/integration/GameCard.test.tsx` (existing — run to verify)

- [ ] **Step 1: Update header metadata sizes**

In `src/components/predictions/GameCard.tsx`, three `text-[10px]` spans in the card header section — sport badge, time, and date. Change all three from `text-[10px]` to `text-[13px]`:

```tsx
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#0d1117] border-b border-[#1e2733]">
        <span
          className="text-[13px] font-bold tracking-[0.18em] uppercase text-[#00e5a0]"
          style={{ fontFamily: 'var(--font-barlow-condensed)' }}
        >
          {game.sport_id.toUpperCase()}
        </span>
        {localTime && (
          <span
            className="text-[13px] text-[#3a4a5a]"
            style={{ fontFamily: 'var(--font-barlow-condensed)' }}
          >
            {localTime}
          </span>
        )}
        <span
          className="text-[13px] text-[#3a4a5a]"
          style={{ fontFamily: 'var(--font-barlow-condensed)' }}
        >
          {gameDate}
        </span>
      </div>
```

- [ ] **Step 2: Update team full names and VS text**

Two `text-[10px]` team name spans → `text-[13px]`, and the VS `text-[13px]` → `text-[15px]`:

```tsx
          <div className="min-w-0">
            <div
              className="text-[32px] font-black leading-none mb-1"
              style={{
                fontFamily: 'var(--font-barlow-condensed)',
                color: homeWins ? '#e2e8f0' : '#2d3748',
              }}
            >
              {homeTeam.abbreviation}
            </div>
            <div
              className="text-[13px] uppercase tracking-widest text-[#3a4a5a] truncate"
              style={{ fontFamily: 'var(--font-barlow-condensed)' }}
            >
              {homeName}
            </div>
          </div>

          <div
            className="text-[15px] font-bold text-[#2d3748] shrink-0"
            style={{ fontFamily: 'var(--font-barlow-condensed)' }}
          >
            {t.predictions.vs}
          </div>

          <div className="text-right min-w-0">
            <div
              className="text-[32px] font-black leading-none mb-1"
              style={{
                fontFamily: 'var(--font-barlow-condensed)',
                color: !homeWins ? '#e2e8f0' : '#2d3748',
              }}
            >
              {awayTeam.abbreviation}
            </div>
            <div
              className="text-[13px] uppercase tracking-widest text-[#3a4a5a] truncate"
              style={{ fontFamily: 'var(--font-barlow-condensed)' }}
            >
              {awayName}
            </div>
          </div>
```

- [ ] **Step 3: Update footer link**

Change `text-[10px]` → `text-[13px]` on the footer Link:

```tsx
      <Link
        to="/$lang/$sport/$slug"
        params={{ lang, sport: game.sport_id, slug: game.slug }}
        className="flex items-center justify-end px-4 py-2 border-t border-[#1e2733] text-[13px] font-bold tracking-wide text-[#3a4a5a] hover:text-[#00e5a0] transition-colors"
        style={{ fontFamily: 'var(--font-barlow-condensed)' }}
      >
        {t.gameDetail.viewDetail}
      </Link>
```

- [ ] **Step 4: Run existing tests**

```bash
npx vitest run src/test/integration/GameCard.test.tsx
```

Expected: all 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/predictions/GameCard.tsx
git commit -m "style: raise GameCard font sizes to bold scale"
```

---

## Task 3: AppSidebar

**Files:**
- Modify: `src/components/layout/AppSidebar.tsx`

No dedicated test file. Run the full test suite at the end of this task.

- [ ] **Step 1: Update SECTION_TITLE and SIDEBAR_ITEM constants**

At the top of `src/components/layout/AppSidebar.tsx`, replace both class constants:

```tsx
const SECTION_TITLE =
  'text-[12px] font-bold tracking-[0.2em] uppercase text-[#3a4a5a] mb-2 px-2'

const SIDEBAR_ITEM =
  'flex items-center gap-2 w-full px-2 py-1.5 rounded text-[15px] font-semibold tracking-wide transition-colors cursor-pointer text-[#4a5568] hover:text-[#a0aec0]'
```

- [ ] **Step 2: Update CountBadge**

Change `text-[10px]` → `text-[13px]` in the `CountBadge` component:

```tsx
function CountBadge({ count }: { count: number }) {
  return (
    <span className="ml-auto text-[13px] bg-[#1e2733] text-[#2d3748] rounded px-1.5 py-0.5 font-bold">
      {count}
    </span>
  )
}
```

- [ ] **Step 3: Update star filter buttons**

Change `text-[11px]` → `text-[14px]` on the star filter buttons:

```tsx
              <button
                key={n}
                onClick={() => setMinStars(n)}
                className="px-2 py-1 rounded text-[14px] font-bold tracking-wide transition-all"
                style={{
                  fontFamily: 'var(--font-barlow-condensed)',
                  color: isActive ? '#fbbf24' : '#4a5568',
                  background: isActive ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${isActive ? '#fbbf24' : 'transparent'}`,
                }}
              >
```

- [ ] **Step 4: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/AppSidebar.tsx
git commit -m "style: raise AppSidebar font sizes to bold scale"
```

---

## Task 4: AppHeader

**Files:**
- Modify: `src/components/layout/AppHeader.tsx`

- [ ] **Step 1: Update nav links**

Each nav `<Link>` has two className strings — the default and the `activeProps.className`. In both, replace `text-xs` with `text-sm`. There are two Link components (Predictions and Accuracy). Apply the same change to both:

```tsx
        <Link
          to="/$lang/predictions"
          params={{ lang }}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-bold tracking-widest uppercase transition-colors',
            'text-[#4a5568] hover:text-[#a0aec0]',
          )}
          activeProps={{
            className:
              'flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-bold tracking-widest uppercase bg-[rgba(0,229,160,0.12)] text-[#00e5a0]',
          }}
          style={{ fontFamily: 'var(--font-barlow-condensed)' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current" />
          {t.nav.predictions}
        </Link>
        <Link
          to="/$lang/accuracy"
          params={{ lang }}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-bold tracking-widest uppercase transition-colors',
            'text-[#4a5568] hover:text-[#a0aec0]',
          )}
          activeProps={{
            className:
              'flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-bold tracking-widest uppercase bg-[rgba(0,229,160,0.12)] text-[#00e5a0]',
          }}
          style={{ fontFamily: 'var(--font-barlow-condensed)' }}
        >
          {t.nav.accuracy}
        </Link>
```

- [ ] **Step 2: Update language toggle**

Change both lang button spans from `text-[11px]` → `text-[13px]`:

```tsx
        <span
          className={cn(
            'px-2.5 py-1 text-[13px] font-bold tracking-wide transition-colors',
            currentLang === 'en'
              ? 'bg-[#1e2733] text-[#00e5a0]'
              : 'text-[#4a5568]',
          )}
          style={{ fontFamily: 'var(--font-barlow-condensed)' }}
        >
          EN
        </span>
        <span
          className={cn(
            'px-2.5 py-1 text-[13px] font-bold tracking-wide transition-colors',
            currentLang === 'zh'
              ? 'bg-[#1e2733] text-[#00e5a0]'
              : 'text-[#4a5568]',
          )}
          style={{ fontFamily: 'var(--font-barlow-condensed)' }}
        >
          中
        </span>
```

- [ ] **Step 3: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/AppHeader.tsx
git commit -m "style: raise AppHeader nav and language toggle font sizes to bold scale"
```

---

## Task 5: GameDetailHeader

**Files:**
- Modify: `src/components/game-detail/GameDetailHeader.tsx`

- [ ] **Step 1: Update top bar sizes**

In the top bar `<div>` (the row with back link + sport/status/time), apply these changes:

Back link: `text-[11px]` → `text-[14px]`
Sport badge: `text-[10px]` → `text-[13px]`
Status: `text-[10px]` → `text-[13px]`
Game time: `text-[11px]` → `text-[13px]`

```tsx
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#1e2733]">
        <Link
          to="/$lang/predictions"
          params={{ lang }}
          className="text-[14px] font-bold tracking-wide text-[#4a5568] hover:text-[#a0aec0] transition-colors"
          style={FONT}
        >
          {t.gameDetail.back}
        </Link>

        <div className="flex items-center gap-2">
          <span
            className="text-[13px] font-bold tracking-[0.18em] uppercase text-[#00e5a0]"
            style={FONT}
          >
            {game.sport_id.toUpperCase()}
          </span>
          <span className="text-[#1e2733]">·</span>
          <span
            className="text-[13px] font-bold tracking-wide uppercase"
            style={{
              ...FONT,
              color: isFinal ? '#fbbf24' : '#3a4a5a',
            }}
          >
            {isFinal ? t.gameDetail.finalScore : t.gameDetail.scheduled}
          </span>
          {gameTime && (
            <>
              <span className="text-[#1e2733]">·</span>
              <span className="text-[13px] text-[#3a4a5a]" style={FONT}>
                {gameTime}
              </span>
            </>
          )}
        </div>
      </div>
```

- [ ] **Step 2: Update team full names**

Both team name labels (away and home) are `text-[11px]` → `text-[13px]`:

```tsx
          <div
            className="text-[13px] uppercase tracking-widest text-[#3a4a5a] mb-1"
            style={FONT}
          >
            {awayName}
          </div>
```

```tsx
          <div
            className="text-[13px] uppercase tracking-widest text-[#3a4a5a] mb-1"
            style={FONT}
          >
            {homeName}
          </div>
```

- [ ] **Step 3: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/game-detail/GameDetailHeader.tsx
git commit -m "style: raise GameDetailHeader font sizes to bold scale"
```

---

## Task 6: BettingCard

**Files:**
- Modify: `src/components/game-detail/BettingCard.tsx`

- [ ] **Step 1: Update BettingCard section title**

Card title in `BettingCard` component: `text-[9px]` → `text-[12px]`:

```tsx
      <div className="px-5 py-3 border-b border-[#1e2733]">
        <span className="text-[12px] font-bold tracking-[0.2em] uppercase text-[#3a4a5a]" style={FONT}>
          {t.analysis.bettingRec}
        </span>
      </div>
```

- [ ] **Step 2: Update MarketCard label and risk badge**

Market label: `text-[11px]` → `text-[13px]`
Risk badge: `text-[10px]` → `text-[13px]`

```tsx
      <div className="flex items-center justify-between mb-2">
        <span className="text-[13px] font-bold uppercase tracking-wide text-[#3a4a5a]" style={FONT}>
          {label}
        </span>
        <Stars count={market.stars} />
      </div>
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-[18px] font-black"
          style={{ ...FONT, color: isPass ? '#4a5568' : '#e2e8f0' }}
        >
          {isPass ? 'PASS' : DIR_LABELS[market.direction]}
          {market.line != null && !isPass && ` ${market.line > 0 ? '+' : ''}${market.line}`}
        </span>
        <span
          className="text-[13px] font-bold px-1.5 py-0.5 rounded"
          style={{
            ...FONT,
            color: RISK_COLORS[market.risk],
            backgroundColor: `${RISK_COLORS[market.risk]}15`,
          }}
        >
          {t.analysis[RISK_LABELS[market.risk]]}
        </span>
      </div>
```

- [ ] **Step 3: Update model/implied/edge row and reason tags**

Model/implied/edge row: `text-[11px]` → `text-[13px]`
Reason tags: `text-[9px]` → `text-[12px]`

```tsx
          <div className="flex items-center gap-3 text-[13px] text-[#4a5568] mb-2" style={FONT}>
            <span>
              {t.analysis.modelPct}:{' '}
              <span className="text-[#e2e8f0] font-bold">{market.model_pct.toFixed(1)}%</span>
            </span>
            <span>
              {t.analysis.impliedPct}:{' '}
              <span className="text-[#a0aec0]">{market.implied_pct.toFixed(1)}%</span>
            </span>
            <span>
              {t.analysis.edge}:{' '}
              <span
                className="font-bold"
                style={{ color: market.edge > 0 ? '#00e5a0' : '#ef4444' }}
              >
                {market.edge > 0 ? '+' : ''}{market.edge.toFixed(1)}%
              </span>
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {market.reasons.map((r) => (
              <span
                key={r}
                className="text-[12px] font-bold px-1.5 py-0.5 rounded bg-[#1e2733] text-[#a0aec0]"
                style={FONT}
              >
                {t.analysis[REASON_LABELS[r]]}
              </span>
            ))}
          </div>
```

- [ ] **Step 4: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/game-detail/BettingCard.tsx
git commit -m "style: raise BettingCard font sizes to bold scale"
```

---

## Task 7: Final verification

- [ ] **Step 1: Run full test suite one last time**

```bash
npx vitest run
```

Expected: all tests pass with no failures.

- [ ] **Step 2: Start dev server and visual spot-check**

```bash
npm run dev
```

Open http://localhost:3001 and verify:
- GameCard: MONEYLINE/SPREAD/O/U labels readable at 12px
- Pick values (LAL, O 224.5, PASS) large and clear at 16px
- Sidebar section titles (SPORT, LEAGUES, MIN STARS) visible at 12px
- Header nav links comfortable at 14px
- No layout overflow or line-wrapping issues

- [ ] **Step 3: Confirm no regressions on game detail page**

Navigate to any game detail page and verify BettingCard market labels, risk badges, and reason tags are all readable.
