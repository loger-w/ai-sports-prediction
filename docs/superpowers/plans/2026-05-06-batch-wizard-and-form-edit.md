# Batch Wizard + Form-Mode Edit + Required Recs — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the spec at `docs/superpowers/specs/2026-05-06-batch-wizard-and-form-edit-design.md` — a 2-step batch import wizard, form-mode `EditGamePage`, redesigned `RecommendationFormRow` (layout B), and a custom `ConfirmDialog` replacing every `window.confirm()` / `window.alert()`.

**Architecture:** Frontend-only React refactor. No DB schema changes, no new RLS, no new RPC. Atomic-ish batch create uses client-side compensating delete (insert games → insert recs → if recs fail, delete games via ON DELETE CASCADE on `recommendations.game_id`). `EditGamePage` becomes a controlled form: all field edits accumulate in local state; the master Save button commits via the existing service layer.

**Tech Stack:** React 19, TanStack Router, TanStack Query, `radix-ui` umbrella (already in `package.json`), Vitest + `@testing-library/react`, Tailwind v4, `sonner` for toasts.

---

## File Structure

```
NEW
├── src/components/ui/alert-dialog.tsx               # Radix AlertDialog wrapper, shadcn-style
├── src/components/admin/ConfirmDialog.tsx           # Theme-matched controlled wrapper used by admin UI
├── src/components/admin/BatchImportWizard.tsx       # Step 1 (selection) + Step 2 (rec entry) + atomic submit
└── src/test/integration/
    ├── ConfirmDialog.test.tsx
    └── BatchImportWizard.test.tsx

MODIFIED
├── src/components/admin/RecommendationFormRow.tsx       # Rewrite to layout B (segmented + visual stars)
├── src/components/admin/MlbScheduleImporter.tsx         # Expose onSelectionConfirmed; remove self-submit
├── src/components/admin/NewGamePage.tsx                 # Manual mode starts empty; import mode wraps wizard
├── src/components/admin/EditGamePage.tsx                # Form-mode refactor
├── src/services/admin/games.ts                          # Add createGames + deleteGames batch methods
├── src/services/admin/adminApi.ts                       # Re-export new methods (factory wiring)
├── src/test/integration/RecommendationFormRow.test.tsx  # Rewrite for layout B
├── src/test/integration/EditGamePage.test.tsx           # Rewrite for form-mode behavior
└── src/test/unit/adminGamesApi.test.ts                  # Add tests for batch methods

UNTOUCHED
├── src/components/admin/AudienceToggle.tsx          # Reused inside the new RecommendationFormRow
├── src/services/admin/recommendations.ts            # createRecommendations is already batch-capable
├── supabase/migrations/*                            # No schema work
└── Public predictions UI
```

---

## Task 1: RecommendationFormRow — layout B

**Files:**
- Modify: `src/components/admin/RecommendationFormRow.tsx`
- Modify: `src/test/integration/RecommendationFormRow.test.tsx`

The current row uses three `<select>` elements + a number input + a `<select>` for stars + an audience `<select>` + remove button — all squeezed into one row. We replace it with two rows of segmented controls + visual stars + the existing `AudienceToggle` pill, with **away (客) on the LEFT, home (主) on the RIGHT** for `ml` / `spread`. Adds a new optional `marketsTaken` prop so consumers (wizard, edit page) can disable already-used markets.

- [ ] **Step 1: Rewrite the test file**

Replace the entire contents of `src/test/integration/RecommendationFormRow.test.tsx` with:

```tsx
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { RecommendationFormRow, type RecFormValue } from '@/components/admin/RecommendationFormRow'

const ML: RecFormValue = { market: 'ml', pick: 'home', line: null, stars: 3, audience: 'all' }
const SPREAD: RecFormValue = { market: 'spread', pick: 'home', line: -1.5, stars: 2, audience: 'all' }
const OU: RecFormValue = { market: 'ou', pick: 'over', line: 8.5, stars: 4, audience: 'all' }

describe('RecommendationFormRow (layout B)', () => {
  it('renders 3 market segments with the current market active', () => {
    render(<RecommendationFormRow value={ML} onChange={vi.fn()} onRemove={vi.fn()} />)
    const group = screen.getByRole('radiogroup', { name: '盤口' })
    const segs = within(group).getAllByRole('radio')
    expect(segs.map((s) => s.textContent)).toEqual(['ML', '讓分', '大小分'])
    expect(segs[0]).toHaveAttribute('aria-checked', 'true')
    expect(segs[1]).toHaveAttribute('aria-checked', 'false')
    expect(segs[2]).toHaveAttribute('aria-checked', 'false')
  })

  it('clicking an inactive market segment changes market and resets pick + line', () => {
    const onChange = vi.fn()
    render(<RecommendationFormRow value={ML} onChange={onChange} onRemove={vi.fn()} />)
    const group = screen.getByRole('radiogroup', { name: '盤口' })
    fireEvent.click(within(group).getByRole('radio', { name: '大小分' }))
    expect(onChange).toHaveBeenCalledWith({
      market: 'ou',
      pick: 'over',
      line: 0,
      stars: 3,
      audience: 'all',
    })
  })

  it('clicking the already-active market segment does not call onChange', () => {
    const onChange = vi.fn()
    render(<RecommendationFormRow value={ML} onChange={onChange} onRemove={vi.fn()} />)
    const group = screen.getByRole('radiogroup', { name: '盤口' })
    fireEvent.click(within(group).getByRole('radio', { name: 'ML' }))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('marketsTaken disables those segments (and ignores clicks)', () => {
    const onChange = vi.fn()
    render(
      <RecommendationFormRow
        value={ML}
        onChange={onChange}
        onRemove={vi.fn()}
        marketsTaken={['spread', 'ou']}
      />,
    )
    const group = screen.getByRole('radiogroup', { name: '盤口' })
    expect(within(group).getByRole('radio', { name: '讓分' })).toHaveAttribute('aria-disabled', 'true')
    expect(within(group).getByRole('radio', { name: '大小分' })).toHaveAttribute('aria-disabled', 'true')
    fireEvent.click(within(group).getByRole('radio', { name: '讓分' }))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('pick segments for ml are 客 (away) on the LEFT, 主 (home) on the RIGHT', () => {
    render(<RecommendationFormRow value={ML} onChange={vi.fn()} onRemove={vi.fn()} />)
    const group = screen.getByRole('radiogroup', { name: '選邊' })
    const segs = within(group).getAllByRole('radio')
    expect(segs.map((s) => s.textContent)).toEqual(['客', '主'])
    // pick === 'home' → 主 segment active
    expect(segs[1]).toHaveAttribute('aria-checked', 'true')
  })

  it('pick segments for spread match ml order (客 / 主)', () => {
    render(<RecommendationFormRow value={SPREAD} onChange={vi.fn()} onRemove={vi.fn()} />)
    const group = screen.getByRole('radiogroup', { name: '選邊' })
    const segs = within(group).getAllByRole('radio')
    expect(segs.map((s) => s.textContent)).toEqual(['客', '主'])
  })

  it('pick segments for ou are 大 / 小', () => {
    render(<RecommendationFormRow value={OU} onChange={vi.fn()} onRemove={vi.fn()} />)
    const group = screen.getByRole('radiogroup', { name: '選邊' })
    const segs = within(group).getAllByRole('radio')
    expect(segs.map((s) => s.textContent)).toEqual(['大', '小'])
  })

  it('clicking a pick segment fires onChange with new pick (other fields unchanged)', () => {
    const onChange = vi.fn()
    render(<RecommendationFormRow value={ML} onChange={onChange} onRemove={vi.fn()} />)
    const group = screen.getByRole('radiogroup', { name: '選邊' })
    fireEvent.click(within(group).getByRole('radio', { name: '客' }))
    expect(onChange).toHaveBeenCalledWith({ ...ML, pick: 'away' })
  })

  it('line input hidden for ml market', () => {
    render(<RecommendationFormRow value={ML} onChange={vi.fn()} onRemove={vi.fn()} />)
    expect(screen.queryByLabelText('讓分')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('盤線')).not.toBeInTheDocument()
  })

  it('line input is labeled "讓分" for spread', () => {
    render(<RecommendationFormRow value={SPREAD} onChange={vi.fn()} onRemove={vi.fn()} />)
    expect(screen.getByLabelText('讓分')).toHaveValue(-1.5)
  })

  it('line input is labeled "盤線" for ou', () => {
    render(<RecommendationFormRow value={OU} onChange={vi.fn()} onRemove={vi.fn()} />)
    expect(screen.getByLabelText('盤線')).toHaveValue(8.5)
  })

  it('star rating renders 5 buttons', () => {
    render(<RecommendationFormRow value={ML} onChange={vi.fn()} onRemove={vi.fn()} />)
    const group = screen.getByRole('radiogroup', { name: '星等' })
    const stars = within(group).getAllByRole('radio')
    expect(stars).toHaveLength(5)
  })

  it('clicking the 4th star fires onChange with stars=4', () => {
    const onChange = vi.fn()
    render(<RecommendationFormRow value={ML} onChange={onChange} onRemove={vi.fn()} />)
    const group = screen.getByRole('radiogroup', { name: '星等' })
    fireEvent.click(within(group).getByRole('radio', { name: '4 星' }))
    expect(onChange).toHaveBeenCalledWith({ ...ML, stars: 4 })
  })

  it('audience toggle reuses AudienceToggle and changes audience on click', () => {
    const onChange = vi.fn()
    render(<RecommendationFormRow value={ML} onChange={onChange} onRemove={vi.fn()} />)
    const group = screen.getByRole('group', { name: '受眾' })
    fireEvent.click(within(group).getByRole('button', { name: 'Premium' }))
    expect(onChange).toHaveBeenCalledWith({ ...ML, audience: 'premium' })
  })

  it('clicking remove fires onRemove', () => {
    const onRemove = vi.fn()
    render(<RecommendationFormRow value={ML} onChange={vi.fn()} onRemove={onRemove} />)
    fireEvent.click(screen.getByRole('button', { name: /移除/ }))
    expect(onRemove).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2: Run tests to confirm failure**

Run: `npm run test -- src/test/integration/RecommendationFormRow.test.tsx`

Expected: many failures — the existing component uses `<select>` elements, so `getByRole('radiogroup', ...)` won't find anything. The test file may also fail to type-check until `marketsTaken` is added to the component's props.

- [ ] **Step 3: Rewrite the component**

Replace the entire contents of `src/components/admin/RecommendationFormRow.tsx` with:

```tsx
import type { Audience, Market, Pick as RecPick } from '@/types/predictions/recommendation'
import { AudienceToggle } from './AudienceToggle'

const FONT = { fontFamily: 'var(--font-barlow-condensed)' as const }
const LABEL = 'block text-xs text-[#94a3b8] font-bold tracking-wide uppercase mb-1.5'

const MARKET_LABEL: Record<Market, string> = {
  ml: 'ML',
  spread: '讓分',
  ou: '大小分',
}

const PICK_LABEL: Record<RecPick, string> = {
  home: '主',
  away: '客',
  over: '大',
  under: '小',
}

// 客 (away) on the LEFT, 主 (home) on the RIGHT — matches commit 48b0c1d.
const MARKET_PICKS: Record<Market, RecPick[]> = {
  ml: ['away', 'home'],
  spread: ['away', 'home'],
  ou: ['over', 'under'],
}

const LINE_LABEL: Record<Market, string> = {
  ml: '',
  spread: '讓分',
  ou: '盤線',
}

export interface RecFormValue {
  market: Market
  pick: RecPick
  line: number | null
  stars: number
  audience: Audience
}

interface Props {
  value: RecFormValue
  onChange: (next: RecFormValue) => void
  onRemove: () => void
  marketsTaken?: Market[]
}

function defaultsForMarket(market: Market): Pick<RecFormValue, 'pick' | 'line'> {
  if (market === 'ml') return { pick: 'home', line: null }
  if (market === 'spread') return { pick: 'home', line: 0 }
  return { pick: 'over', line: 0 }
}

interface SegOption<T extends string> {
  value: T
  label: string
}

function Segmented<T extends string>({
  groupLabel,
  options,
  value,
  onChange,
  disabledValues = [],
}: {
  groupLabel: string
  options: SegOption<T>[]
  value: T
  onChange: (next: T) => void
  disabledValues?: T[]
}) {
  return (
    <div
      role="radiogroup"
      aria-label={groupLabel}
      className="inline-flex gap-1 bg-[#0a0a0f] border border-[#1e2733] rounded p-0.5"
    >
      {options.map((opt) => {
        const active = value === opt.value
        const disabled = disabledValues.includes(opt.value) && !active
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-disabled={disabled || undefined}
            disabled={disabled}
            onClick={() => {
              if (disabled || active) return
              onChange(opt.value)
            }}
            className={
              active
                ? 'px-3 py-1.5 rounded text-sm font-bold bg-[rgba(0,229,160,0.12)] text-[#00e5a0]'
                : disabled
                  ? 'px-3 py-1.5 rounded text-sm font-bold text-[#475569] cursor-not-allowed opacity-60'
                  : 'px-3 py-1.5 rounded text-sm font-bold text-[#94a3b8] hover:text-[#e2e8f0]'
            }
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

function StarRating({ value, onChange }: { value: number; onChange: (next: number) => void }) {
  return (
    <div role="radiogroup" aria-label="星等" className="inline-flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => {
        const lit = n <= value
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={n === value}
            aria-label={`${n} 星`}
            onClick={() => onChange(n)}
            className={
              lit
                ? 'text-2xl text-[#00e5a0] cursor-pointer leading-none'
                : 'text-2xl text-[#1e2733] cursor-pointer leading-none hover:text-[#475569]'
            }
          >
            ★
          </button>
        )
      })}
    </div>
  )
}

export function RecommendationFormRow({ value, onChange, onRemove, marketsTaken = [] }: Props) {
  function patch(p: Partial<RecFormValue>) {
    onChange({ ...value, ...p })
  }

  function handleMarket(m: Market) {
    if (m === value.market) return
    const d = defaultsForMarket(m)
    onChange({
      market: m,
      pick: d.pick,
      line: d.line,
      stars: value.stars,
      audience: value.audience,
    })
  }

  const lineLabel = LINE_LABEL[value.market]

  return (
    <div className="rounded border border-[#1e2733] bg-[#0d1117] p-4 space-y-3" style={FONT}>
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <div>
          <span className={LABEL}>盤口</span>
          <Segmented<Market>
            groupLabel="盤口"
            options={(['ml', 'spread', 'ou'] as Market[]).map((m) => ({
              value: m,
              label: MARKET_LABEL[m],
            }))}
            value={value.market}
            onChange={handleMarket}
            disabledValues={marketsTaken}
          />
        </div>
        <div>
          <span className={LABEL}>選邊</span>
          <Segmented<RecPick>
            groupLabel="選邊"
            options={MARKET_PICKS[value.market].map((p) => ({
              value: p,
              label: PICK_LABEL[p],
            }))}
            value={value.pick}
            onChange={(p) => patch({ pick: p })}
          />
        </div>
        {lineLabel ? (
          <div>
            <label className={LABEL} htmlFor={`rec-line-${value.market}`}>{lineLabel}</label>
            <input
              id={`rec-line-${value.market}`}
              aria-label={lineLabel}
              type="number"
              step="0.5"
              className="w-24 px-3 py-2 rounded bg-[#0a0a0f] border border-[#1e2733] text-[#e2e8f0] focus:outline-none focus:border-[#00e5a0]"
              value={value.line ?? 0}
              onChange={(e) => patch({ line: parseFloat(e.target.value) })}
            />
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <div>
          <span className={LABEL}>星等</span>
          <StarRating value={value.stars} onChange={(n) => patch({ stars: n })} />
        </div>
        <div>
          <span className={LABEL}>受眾</span>
          <AudienceToggle value={value.audience} onChange={(a) => patch({ audience: a })} />
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="ml-auto px-3 py-2 rounded text-xs font-bold bg-[rgba(252,129,129,0.10)] text-[#fc8181] border border-[rgba(252,129,129,0.25)] hover:bg-[rgba(252,129,129,0.18)]"
          aria-label="移除這條推薦"
        >
          移除
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to confirm pass**

Run: `npm run test -- src/test/integration/RecommendationFormRow.test.tsx`

Expected: PASS (15 tests).

- [ ] **Step 5: Run the full test suite to catch any consumer breakage**

Run: `npm run test`

Expected: PASS — `EditGamePage.test.tsx` may now break because the existing-rec list still uses the old field shapes. Note any failures; they will be fixed in Tasks 8–9. **If only `EditGamePage` and `NewGamePage`-type integration tests fail, proceed.** Stop and investigate any unrelated failures.

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/RecommendationFormRow.tsx src/test/integration/RecommendationFormRow.test.tsx
git commit -m "$(cat <<'EOF'
refactor(admin): rebuild RecommendationFormRow as layout B

Replaces dense single-row dropdowns with two-row segmented controls,
visual star rating, and the existing AudienceToggle. Pick order is now
客 (away) on the left, 主 (home) on the right for ml/spread (over/under
unchanged for ou). Adds marketsTaken prop so callers can disable already-
used markets.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: NewGamePage manual mode — start empty + min-1 validation

**Files:**
- Modify: `src/components/admin/NewGamePage.tsx`

The current manual mode initialises `recs` to `[EMPTY_REC]`, so a default rec is always present. The user explicitly chose intentional rec entry — the form should start empty and the Save button should be disabled until the user clicks `+ 加推薦`.

- [ ] **Step 1: Update NewGamePage manual mode**

In `src/components/admin/NewGamePage.tsx`:

Change the `recs` initial state from `[EMPTY_REC]` to `[]`:

```diff
- const [recs, setRecs] = useState<RecFormValue[]>([EMPTY_REC])
+ const [recs, setRecs] = useState<RecFormValue[]>([])
```

Update `addRec` to default the next rec's market to the first one not yet used:

```diff
  function addRec() {
-   setRecs((rs) => [...rs, EMPTY_REC])
+   setRecs((rs) => {
+     const taken = new Set(rs.map((r) => r.market))
+     const nextMarket = (['ml', 'spread', 'ou'] as const).find((m) => !taken.has(m)) ?? 'ml'
+     const next: RecFormValue = {
+       ...EMPTY_REC,
+       market: nextMarket,
+       pick: nextMarket === 'ou' ? 'over' : 'home',
+       line: nextMarket === 'ml' ? null : 0,
+     }
+     return [...rs, next]
+   })
  }
```

Disable the Save button until at least one rec exists, and ensure the rec list passes `marketsTaken` so the segmented control disables already-used markets:

```diff
  <div className="flex gap-3 justify-end">
    <button ... 取消 .../>
    <button
      type="button"
-     disabled={submitting}
+     disabled={submitting || recs.length === 0}
      onClick={handleSubmit}
      className="..."
    >
-     {submitting ? '儲存中…' : '儲存'}
+     {submitting ? '儲存中…' : recs.length === 0 ? '請先加推薦' : '儲存'}
    </button>
  </div>
```

And in the rec list rendering:

```diff
  {recs.map((r, i) => (
    <RecommendationFormRow
      key={i}
      value={r}
      onChange={(next) => updateRec(i, next)}
      onRemove={() => removeRec(i)}
+     marketsTaken={recs.filter((_, j) => j !== i).map((rr) => rr.market)}
    />
  ))}
- {recs.length === 0 ? (
-   <p className="text-sm text-[#94a3b8]">尚未新增推薦。</p>
- ) : null}
+ {recs.length === 0 ? (
+   <p className="text-sm text-[#fc8181]">⚠ 請至少加 1 條推薦,才能建立比賽。</p>
+ ) : null}
```

Also: disable `+ 新增推薦` when 3 markets are all taken:

```diff
  <button
    type="button"
    onClick={addRec}
+   disabled={recs.length >= 3}
    className="px-3 py-1.5 rounded text-xs font-bold bg-[rgba(0,229,160,0.10)] text-[#00e5a0] border border-[rgba(0,229,160,0.30)] hover:bg-[rgba(0,229,160,0.20)] disabled:opacity-40 disabled:cursor-not-allowed"
  >
    + 新增推薦
  </button>
```

- [ ] **Step 2: Manually verify in dev**

Run: `npm run dev`

Open `/admin/games/new`, switch to **手動建立** tab. Confirm:
- The 推薦 section starts empty with a red `⚠ 請至少加 1 條推薦,才能建立比賽。` message.
- The 儲存 button reads `請先加推薦` and is disabled.
- Clicking `+ 新增推薦` adds an ML row (or the next available market). The button's label flips to `儲存`.
- After three recs (one per market), `+ 新增推薦` is disabled.
- Removing all recs returns the page to the disabled state.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/NewGamePage.tsx
git commit -m "$(cat <<'EOF'
refactor(admin): NewGamePage manual mode starts with zero recs

Manual single-game mode now requires the admin to explicitly add at least
one recommendation before Save is enabled. The next-rec default cycles
through unused markets so duplicate-market rows are not pre-populated.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Add batch insert/delete to adminGamesApi

**Files:**
- Modify: `src/services/admin/games.ts`
- Modify: `src/test/unit/adminGamesApi.test.ts`

The wizard needs a single batch insert (`INSERT ... VALUES (...), (...), ...`) returning N IDs, plus a batch delete keyed on `id IN (...)` for the compensating cleanup. Existing `createGame` is single-row only.

- [ ] **Step 1: Read the existing test file to match conventions**

Read `src/test/unit/adminGamesApi.test.ts` and note the mocking pattern used for `supabase`.

- [ ] **Step 2: Add failing tests for the new batch methods**

Append the following describe blocks to `src/test/unit/adminGamesApi.test.ts` (do not remove existing tests):

```ts
describe('adminGamesApi.createGames (batch)', () => {
  it('inserts an array and returns the new ids in order', async () => {
    const inserted = [{ id: 'g1' }, { id: 'g2' }]
    const select = vi.fn().mockResolvedValue({ data: inserted, error: null })
    const insert = vi.fn(() => ({ select }))
    const supabase = { from: vi.fn(() => ({ insert })) } as unknown as SupabaseClient
    const api = makeAdminGamesApi(supabase)

    const result = await api.createGames([
      { sport_id: 'mlb', home_team_id: 'a', away_team_id: 'b', game_date: '2026-05-06', game_time: '2026-05-06 09:00:00', status: 'scheduled' },
      { sport_id: 'mlb', home_team_id: 'c', away_team_id: 'd', game_date: '2026-05-06', game_time: '2026-05-06 13:00:00', status: 'scheduled' },
    ])

    expect(supabase.from).toHaveBeenCalledWith('games')
    expect(insert).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ home_team_id: 'a' }),
      expect.objectContaining({ home_team_id: 'c' }),
    ]))
    expect(select).toHaveBeenCalledWith('id')
    expect(result).toEqual({ ids: ['g1', 'g2'], error: null })
  })

  it('returns an empty ids array and the error when supabase rejects', async () => {
    const err = { message: 'unique violation' }
    const select = vi.fn().mockResolvedValue({ data: null, error: err })
    const insert = vi.fn(() => ({ select }))
    const supabase = { from: vi.fn(() => ({ insert })) } as unknown as SupabaseClient
    const api = makeAdminGamesApi(supabase)

    const result = await api.createGames([])

    expect(result).toEqual({ ids: [], error: err })
  })
})

describe('adminGamesApi.deleteGames (batch)', () => {
  it('deletes by id IN (...) and returns null error on success', async () => {
    const inFn = vi.fn().mockResolvedValue({ error: null })
    const del = vi.fn(() => ({ in: inFn }))
    const supabase = { from: vi.fn(() => ({ delete: del })) } as unknown as SupabaseClient
    const api = makeAdminGamesApi(supabase)

    const result = await api.deleteGames(['g1', 'g2'])

    expect(supabase.from).toHaveBeenCalledWith('games')
    expect(inFn).toHaveBeenCalledWith('id', ['g1', 'g2'])
    expect(result).toEqual({ error: null })
  })

  it('forwards supabase errors', async () => {
    const err = { message: 'forbidden' }
    const inFn = vi.fn().mockResolvedValue({ error: err })
    const del = vi.fn(() => ({ in: inFn }))
    const supabase = { from: vi.fn(() => ({ delete: del })) } as unknown as SupabaseClient
    const api = makeAdminGamesApi(supabase)

    expect(await api.deleteGames(['g1'])).toEqual({ error: err })
  })
})
```

If the imports (`SupabaseClient`, `makeAdminGamesApi`) aren't already at the top of the file, add them. Also `import { describe, expect, it, vi } from 'vitest'`.

- [ ] **Step 3: Run tests to confirm failure**

Run: `npm run test -- src/test/unit/adminGamesApi.test.ts`

Expected: failures referencing `api.createGames is not a function` and `api.deleteGames is not a function`.

- [ ] **Step 4: Implement the new methods**

In `src/services/admin/games.ts`, extend `AdminGamesApi` and `makeAdminGamesApi`:

```diff
 export interface AdminGamesApi {
   createGame: (input: CreateGameInput) => Promise<{
     id: string | null
     error: { message: string } | null
   }>
+  createGames: (inputs: CreateGameInput[]) => Promise<{
+    ids: string[]
+    error: { message: string } | null
+  }>
   updateGame: (id: string, patch: UpdateGamePatch) => Promise<{
     error: { message: string } | null
   }>
   deleteGame: (id: string) => Promise<{
     error: { message: string } | null
   }>
+  deleteGames: (ids: string[]) => Promise<{
+    error: { message: string } | null
+  }>
 }

 export function makeAdminGamesApi(supabase: SupabaseClient): AdminGamesApi {
   return {
     createGame: async (input) => {
       const { data, error } = await supabase
         .from('games')
         .insert(input)
         .select('id')
         .single()
       const id = (data?.id as string | undefined) ?? null
       return { id, error }
     },
+    createGames: async (inputs) => {
+      const { data, error } = await supabase
+        .from('games')
+        .insert(inputs)
+        .select('id')
+      const ids = ((data ?? []) as { id: string }[]).map((r) => r.id)
+      return { ids, error }
+    },
     updateGame: async (id, patch) => {
       const { error } = await supabase.from('games').update(patch).eq('id', id)
       return { error }
     },
     deleteGame: async (id) => {
       const { error } = await supabase.from('games').delete().eq('id', id)
       return { error }
     },
+    deleteGames: async (ids) => {
+      const { error } = await supabase.from('games').delete().in('id', ids)
+      return { error }
+    },
   }
 }
```

- [ ] **Step 5: Run tests to confirm pass**

Run: `npm run test -- src/test/unit/adminGamesApi.test.ts`

Expected: PASS (existing + 4 new tests).

- [ ] **Step 6: Commit**

```bash
git add src/services/admin/games.ts src/test/unit/adminGamesApi.test.ts
git commit -m "$(cat <<'EOF'
feat(admin/api): batch createGames + deleteGames

Adds two thin batch wrappers to adminGamesApi for use by the upcoming
batch-import wizard: createGames (single INSERT, returns generated IDs)
and deleteGames (DELETE WHERE id IN (...)). The latter is the compensating
cleanup path on rec-insert failure during batch submit.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: MlbScheduleImporter — expose `onSelectionConfirmed`

**Files:**
- Modify: `src/components/admin/MlbScheduleImporter.tsx`

Currently the component owns the submit and calls `adminGamesApi.createGame` itself. We strip that submit out and lift the selection up via a callback prop. The wizard parent will own the submit pipeline.

- [ ] **Step 1: Update component to be controlled-output**

Replace the contents of `src/components/admin/MlbScheduleImporter.tsx` with:

```tsx
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchMlbScheduleByTaiwanDate, type MlbScheduleGame } from '@/services/mlb/scheduleApi'
import { useTeams } from '@/hooks/useTeams'
import { localToday } from '@/lib/timezone'
import type { TeamRow } from '@/types/predictions/recommendation'

const FONT = { fontFamily: 'var(--font-barlow-condensed)' as const }

export interface ResolvedScheduleGame {
  external_game_id: number
  home_team: TeamRow
  away_team: TeamRow
  game_date_tw: string
  game_time_tw: string
}

interface Props {
  onSelectionConfirmed: (games: ResolvedScheduleGame[]) => void
}

export function MlbScheduleImporter({ onSelectionConfirmed }: Props) {
  const teamsQuery = useTeams('mlb')
  const [date, setDate] = useState(() => localToday())
  const [selected, setSelected] = useState<Set<number>>(new Set())

  const scheduleQuery = useQuery({
    queryKey: ['mlb-schedule', date],
    queryFn: () => fetchMlbScheduleByTaiwanDate(date),
    enabled: Boolean(date),
  })

  const teamByExternalId = useMemo(() => {
    const map = new Map<number, TeamRow>()
    for (const t of teamsQuery.data ?? []) {
      if (t.external_id !== null) map.set(t.external_id, t)
    }
    return map
  }, [teamsQuery.data])

  const games = scheduleQuery.data ?? []

  function toggle(gamePk: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(gamePk)) next.delete(gamePk)
      else next.add(gamePk)
      return next
    })
  }

  function isImportable(g: MlbScheduleGame): boolean {
    return (
      teamByExternalId.has(g.home_team_external_id) &&
      teamByExternalId.has(g.away_team_external_id)
    )
  }

  function handleNext() {
    const resolved: ResolvedScheduleGame[] = games
      .filter((g) => selected.has(g.external_game_id) && isImportable(g))
      .map((g) => ({
        external_game_id: g.external_game_id,
        home_team: teamByExternalId.get(g.home_team_external_id)!,
        away_team: teamByExternalId.get(g.away_team_external_id)!,
        game_date_tw: g.game_date_tw,
        game_time_tw: g.game_time_tw,
      }))
    onSelectionConfirmed(resolved)
  }

  const importableSelected = games.filter(
    (g) => selected.has(g.external_game_id) && isImportable(g),
  ).length

  return (
    <div className="space-y-4" style={FONT}>
      <div className="flex items-end gap-3">
        <div>
          <label className="block text-xs text-[#94a3b8] mb-1">日期(台灣)</label>
          <input
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value)
              setSelected(new Set())
            }}
            className="px-3 py-1.5 rounded bg-[#0d1117] border border-[#1e2733] text-[#e2e8f0] text-sm"
          />
        </div>
        <div className="text-xs text-[#94a3b8]">
          {scheduleQuery.isLoading
            ? '載入賽程…'
            : scheduleQuery.error
              ? `錯誤：${(scheduleQuery.error as Error).message}`
              : `${games.length} 場`}
        </div>
      </div>

      {teamsQuery.isLoading ? (
        <p className="text-[#94a3b8]">載入隊伍…</p>
      ) : games.length === 0 && !scheduleQuery.isLoading ? (
        <p className="text-[#94a3b8] text-sm">當日無 MLB 賽程。</p>
      ) : (
        <div className="rounded-[10px] border border-[#1e2733] overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#0d1117] border-b border-[#1e2733]">
              <tr className="text-left text-xs text-[#94a3b8] uppercase tracking-wider">
                <th className="px-3 py-2 w-8" />
                <th className="px-3 py-2">時間 (TW)</th>
                <th className="px-3 py-2">客 @ 主</th>
                <th className="px-3 py-2">狀態</th>
              </tr>
            </thead>
            <tbody className="bg-[#161b22]">
              {games.map((g) => {
                const importable = isImportable(g)
                const home = teamByExternalId.get(g.home_team_external_id)
                const away = teamByExternalId.get(g.away_team_external_id)
                const checked = selected.has(g.external_game_id)
                return (
                  <tr
                    key={g.external_game_id}
                    className="border-b border-[#1e2733] last:border-0 text-[#e2e8f0]"
                  >
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        disabled={!importable}
                        checked={checked}
                        onChange={() => toggle(g.external_game_id)}
                      />
                    </td>
                    <td className="px-3 py-2 text-sm">{g.game_time_tw.slice(11, 16)}</td>
                    <td className="px-3 py-2 text-sm font-bold">
                      {importable ? (
                        <>
                          {away!.abbreviation} @ {home!.abbreviation}{' '}
                          <span className="text-xs text-[#94a3b8] font-normal">
                            ({away!.name_zh} @ {home!.name_zh})
                          </span>
                        </>
                      ) : (
                        <span className="text-[#fc8181]">
                          {g.away_team_name} @ {g.home_team_name}
                          <span className="text-xs ml-2">
                            (無對應球隊:external_id={g.away_team_external_id}/{g.home_team_external_id})
                          </span>
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-[#94a3b8]">{g.status}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          disabled={importableSelected === 0}
          onClick={handleNext}
          className="px-5 py-2 rounded text-sm font-bold bg-[#00e5a0] text-[#0a0a0f] hover:bg-[#00c98a] disabled:opacity-50"
        >
          {importableSelected === 0
            ? '請先勾選比賽'
            : `下一步:設定推薦 → (${importableSelected} 場)`}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run lint and typecheck via build**

Run: `npm run lint`

Expected: PASS or only existing warnings unrelated to this file. Any TypeScript errors mean a typo above.

Then: `npm run test`

Expected: existing tests still pass. (Tests for the wizard come in Task 5; we're temporarily without an importer caller — that gets fixed in Task 6.)

> **Note:** between this task and Task 6 the import-mode tab in `NewGamePage` is broken because it still imports the old, no-prop `MlbScheduleImporter`. That is fixed in Task 6. Do not run the dev server in import-mode until then.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/MlbScheduleImporter.tsx
git commit -m "$(cat <<'EOF'
refactor(admin): MlbScheduleImporter is now controlled-output

Removes the inline batch-create call and lifts the selection up via
onSelectionConfirmed. The submit pipeline moves to BatchImportWizard
(next commit) so the schedule picker and the rec form can share a
single transaction.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: BatchImportWizard component

**Files:**
- Create: `src/components/admin/BatchImportWizard.tsx`
- Create: `src/test/integration/BatchImportWizard.test.tsx`

The wizard owns step state, per-game rec state, and the atomic submit pipeline.

- [ ] **Step 1: Write the integration tests**

Create `src/test/integration/BatchImportWizard.test.tsx`:

```tsx
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { BatchImportWizard } from '@/components/admin/BatchImportWizard'

const stubTeams = [
  { id: 'lad', sport_id: 'mlb', name_zh: '道奇', abbreviation: 'LAD', logo_url: null, external_id: 1 },
  { id: 'nyy', sport_id: 'mlb', name_zh: '洋基', abbreviation: 'NYY', logo_url: null, external_id: 2 },
  { id: 'sf',  sport_id: 'mlb', name_zh: '巨人', abbreviation: 'SF',  logo_url: null, external_id: 3 },
  { id: 'bos', sport_id: 'mlb', name_zh: '紅襪', abbreviation: 'BOS', logo_url: null, external_id: 4 },
]

const stubSchedule = [
  { external_game_id: 11, home_team_external_id: 2, away_team_external_id: 1, home_team_name: 'Yankees', away_team_name: 'Dodgers', game_date_tw: '2026-05-06', game_time_tw: '2026-05-06 09:00:00', status: 'scheduled' },
  { external_game_id: 12, home_team_external_id: 4, away_team_external_id: 3, home_team_name: 'Red Sox', away_team_name: 'Giants', game_date_tw: '2026-05-06', game_time_tw: '2026-05-06 13:00:00', status: 'scheduled' },
]

const mocks = vi.hoisted(() => ({
  createGames: vi.fn(),
  deleteGames: vi.fn(),
  createRecommendations: vi.fn(),
  navigate: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  fetchSchedule: vi.fn(),
}))

vi.mock('@/lib/supabase', () => {
  const teamsSelect = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn(() => Promise.resolve({ data: stubTeams, error: null })),
  }
  return {
    supabase: {
      from: (table: string) => {
        if (table === 'teams') return teamsSelect
        throw new Error(`unmocked from(${table})`)
      },
    },
  }
})

vi.mock('@/services/mlb/scheduleApi', () => ({
  fetchMlbScheduleByTaiwanDate: (...args: unknown[]) => mocks.fetchSchedule(...args),
}))

vi.mock('@/services/admin/adminApi', () => ({
  adminGamesApi: {
    createGames: (...args: unknown[]) => mocks.createGames(...args),
    deleteGames: (...args: unknown[]) => mocks.deleteGames(...args),
  },
  adminRecommendationsApi: {
    createRecommendations: (...args: unknown[]) => mocks.createRecommendations(...args),
  },
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, ...rest }: Record<string, unknown>) => (
    <a {...rest}>{children as React.ReactNode}</a>
  ),
  useNavigate: () => mocks.navigate,
}))

vi.mock('sonner', () => ({
  toast: {
    success: (msg: string) => mocks.toastSuccess(msg),
    error: (msg: string) => mocks.toastError(msg),
    info: vi.fn(),
  },
}))

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return { Wrapper, client }
}

async function renderWizard() {
  mocks.fetchSchedule.mockResolvedValue(stubSchedule)
  const { Wrapper } = makeWrapper()
  const utils = render(<BatchImportWizard />, { wrapper: Wrapper })
  // Wait for the schedule + teams query to resolve and rows to appear
  await waitFor(() => {
    expect(screen.getByText(/LAD @ NYY/)).toBeInTheDocument()
  })
  return utils
}

async function selectAndAdvance(rowsToCheck: number[]) {
  const allCheckboxes = screen.getAllByRole('checkbox')
  for (const idx of rowsToCheck) fireEvent.click(allCheckboxes[idx])
  fireEvent.click(screen.getByRole('button', { name: /下一步/ }))
  await waitFor(() => {
    expect(screen.getByText(/Step 2/i)).toBeInTheDocument()
  })
}

describe('BatchImportWizard', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((m) => 'mockReset' in m && m.mockReset())
    mocks.createGames.mockResolvedValue({ ids: ['g11', 'g12'], error: null })
    mocks.createRecommendations.mockResolvedValue({ error: null })
    mocks.deleteGames.mockResolvedValue({ error: null })
  })

  it('Step 1 → 下一步 advances to Step 2 with one card per selected game', async () => {
    await renderWizard()
    await selectAndAdvance([0, 1])

    expect(screen.getByText(/LAD @ NYY/)).toBeInTheDocument()
    expect(screen.getByText(/SF @ BOS/)).toBeInTheDocument()
  })

  it('Step 2 starts with empty cards (warning visible, submit disabled)', async () => {
    await renderWizard()
    await selectAndAdvance([0])

    expect(screen.getByText(/請至少加 1 條推薦/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /建立/ })).toBeDisabled()
  })

  it('clicking + 加推薦 adds a default ML rec and clears the warning for that card', async () => {
    await renderWizard()
    await selectAndAdvance([0])

    fireEvent.click(screen.getByRole('button', { name: /\+ 加推薦/ }))
    expect(screen.queryByText(/請至少加 1 條推薦/)).not.toBeInTheDocument()
    expect(screen.getByRole('radiogroup', { name: '盤口' })).toBeInTheDocument()
  })

  it('submit is disabled while ANY card has zero recs', async () => {
    await renderWizard()
    await selectAndAdvance([0, 1])

    // Add a rec to only the first card
    fireEvent.click(screen.getAllByRole('button', { name: /\+ 加推薦/ })[0])

    expect(screen.getByRole('button', { name: /建立/ })).toBeDisabled()
  })

  it('submit is enabled once every card has at least one rec', async () => {
    await renderWizard()
    await selectAndAdvance([0, 1])

    fireEvent.click(screen.getAllByRole('button', { name: /\+ 加推薦/ })[0])
    fireEvent.click(screen.getAllByRole('button', { name: /\+ 加推薦/ })[0])
    // Now both cards have one rec each (the second + 加推薦 button is on card 2 after card 1 already has a rec)

    expect(screen.getByRole('button', { name: /建立/ })).toBeEnabled()
  })

  it('successful submit calls createGames + createRecommendations and navigates', async () => {
    await renderWizard()
    await selectAndAdvance([0, 1])

    fireEvent.click(screen.getAllByRole('button', { name: /\+ 加推薦/ })[0])
    fireEvent.click(screen.getAllByRole('button', { name: /\+ 加推薦/ })[0])
    fireEvent.click(screen.getByRole('button', { name: /建立/ }))

    await waitFor(() => {
      expect(mocks.createGames).toHaveBeenCalledTimes(1)
    })
    expect(mocks.createGames).toHaveBeenCalledWith([
      expect.objectContaining({ home_team_id: 'nyy', away_team_id: 'lad' }),
      expect.objectContaining({ home_team_id: 'bos', away_team_id: 'sf' }),
    ])
    await waitFor(() => {
      expect(mocks.createRecommendations).toHaveBeenCalledTimes(1)
    })
    const recsArg = mocks.createRecommendations.mock.calls[0][0] as Array<{ game_id: string }>
    expect(recsArg.map((r) => r.game_id)).toEqual(['g11', 'g12'])
    expect(mocks.deleteGames).not.toHaveBeenCalled()
    expect(mocks.toastSuccess).toHaveBeenCalled()
    expect(mocks.navigate).toHaveBeenCalledWith({ to: '/admin' })
  })

  it('rec-insert failure triggers compensating deleteGames and surfaces an error toast', async () => {
    mocks.createRecommendations.mockResolvedValueOnce({ error: { message: 'unique violation' } })
    await renderWizard()
    await selectAndAdvance([0, 1])

    fireEvent.click(screen.getAllByRole('button', { name: /\+ 加推薦/ })[0])
    fireEvent.click(screen.getAllByRole('button', { name: /\+ 加推薦/ })[0])
    fireEvent.click(screen.getByRole('button', { name: /建立/ }))

    await waitFor(() => {
      expect(mocks.deleteGames).toHaveBeenCalledWith(['g11', 'g12'])
    })
    expect(mocks.toastError).toHaveBeenCalledWith(expect.stringContaining('unique violation'))
    expect(mocks.navigate).not.toHaveBeenCalled()
  })

  it('← 回去改選擇 returns to Step 1 with selection preserved', async () => {
    await renderWizard()
    await selectAndAdvance([0])
    fireEvent.click(screen.getAllByRole('button', { name: /\+ 加推薦/ })[0])

    fireEvent.click(screen.getByRole('button', { name: /回去改選擇/ }))

    expect(screen.queryByText(/Step 2/i)).not.toBeInTheDocument()
    const checkboxes = screen.getAllByRole('checkbox')
    expect((checkboxes[0] as HTMLInputElement).checked).toBe(true)
  })

  it('deselecting a game in Step 1 then re-advancing drops its rec data', async () => {
    await renderWizard()
    await selectAndAdvance([0, 1])
    fireEvent.click(screen.getAllByRole('button', { name: /\+ 加推薦/ })[0])
    fireEvent.click(screen.getAllByRole('button', { name: /\+ 加推薦/ })[0])

    fireEvent.click(screen.getByRole('button', { name: /回去改選擇/ }))
    fireEvent.click(screen.getAllByRole('checkbox')[0])  // deselect first
    fireEvent.click(screen.getByRole('button', { name: /下一步/ }))

    await waitFor(() => {
      expect(screen.getByText(/SF @ BOS/)).toBeInTheDocument()
    })
    expect(screen.queryByText(/LAD @ NYY/)).not.toBeInTheDocument()
    // The remaining card was the one we'd already filled — rec is still there
    expect(screen.getByRole('radiogroup', { name: '盤口' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to confirm failure (component does not exist yet)**

Run: `npm run test -- src/test/integration/BatchImportWizard.test.tsx`

Expected: failures because `BatchImportWizard` is not exported.

- [ ] **Step 3: Implement the wizard**

Create `src/components/admin/BatchImportWizard.tsx`:

```tsx
import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { MlbScheduleImporter, type ResolvedScheduleGame } from './MlbScheduleImporter'
import { RecommendationFormRow, type RecFormValue } from './RecommendationFormRow'
import { adminGamesApi, adminRecommendationsApi } from '@/services/admin/adminApi'
import type { CreateGameInput } from '@/services/admin/games'
import type { CreateRecommendationInput } from '@/services/admin/recommendations'

const FONT = { fontFamily: 'var(--font-barlow-condensed)' as const }

interface SelectionEntry {
  game: ResolvedScheduleGame
  recs: RecFormValue[]
}

const ALL_MARKETS = ['ml', 'spread', 'ou'] as const

function nextDefaultRec(taken: Set<string>): RecFormValue {
  const m = ALL_MARKETS.find((x) => !taken.has(x)) ?? 'ml'
  return {
    market: m,
    pick: m === 'ou' ? 'over' : 'home',
    line: m === 'ml' ? null : 0,
    stars: 3,
    audience: 'all',
  }
}

export function BatchImportWizard() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [step, setStep] = useState<1 | 2>(1)
  // Map keyed by external_game_id so deselect-then-reselect doesn't drop unrelated cards.
  const [entries, setEntries] = useState<Map<number, SelectionEntry>>(new Map())
  const [submitting, setSubmitting] = useState(false)

  function handleSelectionConfirmed(games: ResolvedScheduleGame[]) {
    setEntries((prev) => {
      const keep = new Set(games.map((g) => g.external_game_id))
      const next = new Map<number, SelectionEntry>()
      for (const g of games) {
        const existing = prev.get(g.external_game_id)
        next.set(g.external_game_id, existing ?? { game: g, recs: [] })
      }
      // Drop entries no longer selected
      for (const k of prev.keys()) if (!keep.has(k)) next.delete(k)
      return next
    })
    setStep(2)
  }

  function patchRec(gid: number, idx: number, value: RecFormValue) {
    setEntries((prev) => {
      const e = prev.get(gid)
      if (!e) return prev
      const next = new Map(prev)
      next.set(gid, { ...e, recs: e.recs.map((r, i) => (i === idx ? value : r)) })
      return next
    })
  }
  function removeRec(gid: number, idx: number) {
    setEntries((prev) => {
      const e = prev.get(gid)
      if (!e) return prev
      const next = new Map(prev)
      next.set(gid, { ...e, recs: e.recs.filter((_, i) => i !== idx) })
      return next
    })
  }
  function addRec(gid: number) {
    setEntries((prev) => {
      const e = prev.get(gid)
      if (!e) return prev
      const taken = new Set(e.recs.map((r) => r.market))
      const next = new Map(prev)
      next.set(gid, { ...e, recs: [...e.recs, nextDefaultRec(taken)] })
      return next
    })
  }

  function cardHasDuplicateMarkets(entry: SelectionEntry): boolean {
    const seen = new Set<string>()
    for (const r of entry.recs) {
      if (seen.has(r.market)) return true
      seen.add(r.market)
    }
    return false
  }

  const allEntries = Array.from(entries.values())
  const allCardsValid =
    allEntries.length > 0 &&
    allEntries.every((e) => e.recs.length >= 1 && !cardHasDuplicateMarkets(e))

  async function submit() {
    setSubmitting(true)
    const games: CreateGameInput[] = allEntries.map((e) => ({
      sport_id: 'mlb',
      home_team_id: e.game.home_team.id,
      away_team_id: e.game.away_team.id,
      game_date: e.game.game_date_tw,
      game_time: e.game.game_time_tw,
      status: 'scheduled',
    }))

    const { ids, error: gErr } = await adminGamesApi.createGames(games)
    if (gErr || ids.length !== allEntries.length) {
      setSubmitting(false)
      toast.error(`建立比賽失敗:${gErr?.message ?? '未知錯誤'}`)
      return
    }

    const recs: CreateRecommendationInput[] = allEntries.flatMap((e, i) =>
      e.recs.map((r) => ({
        ...r,
        game_id: ids[i],
      })),
    )

    const { error: rErr } = await adminRecommendationsApi.createRecommendations(recs)
    if (rErr) {
      // Compensating cleanup — ON DELETE CASCADE removes any partial recs too
      await adminGamesApi.deleteGames(ids)
      setSubmitting(false)
      toast.error(`推薦寫入失敗,已回滾:${rErr.message}`)
      return
    }

    setSubmitting(false)
    toast.success(`已建立 ${ids.length} 場 + ${recs.length} 條推薦`)
    void queryClient.invalidateQueries({ queryKey: ['admin'] })
    void queryClient.invalidateQueries({ queryKey: ['recommendations'] })
    navigate({ to: '/admin' })
  }

  if (step === 1) {
    return <MlbScheduleImporter onSelectionConfirmed={handleSelectionConfirmed} />
  }

  return (
    <div className="space-y-4" style={FONT}>
      <div className="flex items-center gap-2 text-sm text-[#94a3b8]">
        <span>① 選比賽</span>
        <span className="text-[#1e2733]">───</span>
        <span className="text-[#00e5a0] font-bold">● ② 填推薦</span>
        <span className="ml-auto text-xs">Step 2 — 已選 {allEntries.length} 場</span>
      </div>

      {allEntries.map((e) => {
        const taken = new Set(e.recs.map((r) => r.market))
        return (
          <section
            key={e.game.external_game_id}
            className="rounded-[10px] border border-[#1e2733] bg-[#161b22] p-4 space-y-3"
          >
            <header className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#e2e8f0]">
                {e.game.away_team.abbreviation} @ {e.game.home_team.abbreviation}{' '}
                <span className="text-xs text-[#94a3b8] font-normal">
                  · {e.game.game_time_tw.slice(11, 16)}
                </span>
              </h3>
              <button
                type="button"
                disabled={taken.size >= 3}
                onClick={() => addRec(e.game.external_game_id)}
                className="px-3 py-1.5 rounded text-xs font-bold bg-[rgba(0,229,160,0.10)] text-[#00e5a0] border border-[rgba(0,229,160,0.30)] hover:bg-[rgba(0,229,160,0.20)] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                + 加推薦
              </button>
            </header>

            {e.recs.length === 0 ? (
              <p className="text-sm text-[#fc8181]">⚠ 請至少加 1 條推薦</p>
            ) : (
              <div className="space-y-3">
                {e.recs.map((r, i) => (
                  <RecommendationFormRow
                    key={i}
                    value={r}
                    onChange={(next) => patchRec(e.game.external_game_id, i, next)}
                    onRemove={() => removeRec(e.game.external_game_id, i)}
                    marketsTaken={e.recs.filter((_, j) => j !== i).map((rr) => rr.market)}
                  />
                ))}
              </div>
            )}
            {cardHasDuplicateMarkets(e) ? (
              <p className="text-sm text-[#fc8181]">⚠ 同一場有重複盤口</p>
            ) : null}
          </section>
        )
      })}

      <div className="flex gap-3 justify-between">
        <button
          type="button"
          onClick={() => setStep(1)}
          disabled={submitting}
          className="px-4 py-2 rounded text-sm font-bold bg-transparent text-[#94a3b8] border border-[#1e2733] hover:bg-[#161b22] disabled:opacity-50"
        >
          ← 回去改選擇
        </button>
        <button
          type="button"
          disabled={submitting || !allCardsValid}
          onClick={submit}
          className="px-6 py-2 rounded text-sm font-bold bg-[#00e5a0] text-[#0a0a0f] hover:bg-[#00c98a] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting
            ? '建立中…'
            : `建立 ${allEntries.length} 場 + ${allEntries.reduce((n, e) => n + e.recs.length, 0)} 條推薦`}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to confirm pass**

Run: `npm run test -- src/test/integration/BatchImportWizard.test.tsx`

Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/BatchImportWizard.tsx src/test/integration/BatchImportWizard.test.tsx
git commit -m "$(cat <<'EOF'
feat(admin): two-step batch-import wizard with required recs

Step 1 wraps the schedule picker; Step 2 renders one card per selected
game and requires at least one recommendation before the submit button
unlocks. Submit posts a single batch INSERT for games, then a single
batch INSERT for recs; on rec failure it deletes the just-created games
(ON DELETE CASCADE clears any partial recs).

Wizard state lives in a Map keyed by external_game_id so deselect-then-
reselect a game does not lose unrelated cards' rec data.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: NewGamePage — wire import-mode tab to BatchImportWizard

**Files:**
- Modify: `src/components/admin/NewGamePage.tsx`

The import-mode tab still embeds the bare `MlbScheduleImporter` (which now expects a prop and is broken without it). Replace it with `BatchImportWizard`, which owns the selection-to-submit pipeline.

- [ ] **Step 1: Swap the import-mode panel**

In `src/components/admin/NewGamePage.tsx`:

```diff
- import { MlbScheduleImporter } from './MlbScheduleImporter'
+ import { BatchImportWizard } from './BatchImportWizard'
```

```diff
  {mode === 'import' ? (
    <section className="rounded-[10px] border border-[#1e2733] bg-[#161b22] p-6">
-     <MlbScheduleImporter />
+     <BatchImportWizard />
    </section>
  ) : (
```

- [ ] **Step 2: Manually verify in dev**

Run: `npm run dev`

Open `/admin/games/new`, default tab is **MLB 賽程匯入**. Confirm:
- Date picker, schedule table render as before.
- Selecting at least one importable row enables `下一步:設定推薦 →`.
- Clicking advances to Step 2 with one card per selected game.
- Each card starts empty with `⚠ 請至少加 1 條推薦`.
- Submit button stays disabled until every card has ≥1 rec.
- Successful submit shows the toast and routes back to `/admin`.
- Switch to **手動建立** tab — single-game form still works (Task 2 already verified).

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/NewGamePage.tsx
git commit -m "$(cat <<'EOF'
feat(admin): NewGamePage import tab uses BatchImportWizard

Replaces the bare MlbScheduleImporter (which is now controlled-output
only) with the wizard that owns step state and atomic submit.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: AlertDialog primitive

**Files:**
- Create: `src/components/ui/alert-dialog.tsx`

shadcn-style wrapper over `radix-ui`'s AlertDialog primitive. Same import pattern as `sheet.tsx` (which uses `Dialog as SheetPrimitive` from the umbrella package).

- [ ] **Step 1: Create the wrapper**

Create `src/components/ui/alert-dialog.tsx`:

```tsx
import * as React from "react"
import { AlertDialog as AlertDialogPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function AlertDialog({
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Root>) {
  return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />
}

function AlertDialogTrigger({
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Trigger>) {
  return <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />
}

function AlertDialogPortal({
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Portal>) {
  return <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />
}

function AlertDialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Overlay>) {
  return (
    <AlertDialogPrimitive.Overlay
      data-slot="alert-dialog-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/60 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0",
        className,
      )}
      {...props}
    />
  )
}

function AlertDialogContent({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Content>) {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        data-slot="alert-dialog-content"
        className={cn(
          "fixed left-1/2 top-1/2 z-50 w-full max-w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-[10px] border border-[#1e2733] bg-[#161b22] p-6 shadow-lg data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          className,
        )}
        {...props}
      />
    </AlertDialogPortal>
  )
}

function AlertDialogHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="alert-dialog-header"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

function AlertDialogFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn("flex flex-row justify-end gap-2 mt-6", className)}
      {...props}
    />
  )
}

function AlertDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return (
    <AlertDialogPrimitive.Title
      data-slot="alert-dialog-title"
      className={cn("text-lg font-bold text-[#e2e8f0]", className)}
      {...props}
    />
  )
}

function AlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return (
    <AlertDialogPrimitive.Description
      data-slot="alert-dialog-description"
      className={cn("text-sm leading-relaxed text-[#94a3b8]", className)}
      {...props}
    />
  )
}

function AlertDialogAction({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Action>) {
  return (
    <AlertDialogPrimitive.Action
      data-slot="alert-dialog-action"
      className={cn(
        "px-4 py-2 rounded text-sm font-bold bg-[#00e5a0] text-[#0a0a0f] hover:bg-[#00c98a]",
        className,
      )}
      {...props}
    />
  )
}

function AlertDialogCancel({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Cancel>) {
  return (
    <AlertDialogPrimitive.Cancel
      data-slot="alert-dialog-cancel"
      className={cn(
        "px-4 py-2 rounded text-sm font-bold bg-transparent text-[#94a3b8] border border-[#1e2733] hover:bg-[#0d1117]",
        className,
      )}
      {...props}
    />
  )
}

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
}
```

- [ ] **Step 2: Run typecheck via test**

Run: `npm run test`

Expected: PASS — the new file isn't yet imported anywhere; this just confirms it compiles. Any TypeScript error means a typo.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/alert-dialog.tsx
git commit -m "$(cat <<'EOF'
feat(ui): add shadcn-style AlertDialog wrapper

Thin Radix wrapper following the same pattern as components/ui/sheet.tsx
(import via the radix-ui umbrella). Theme-matched to the dark dashboard
palette so consumers do not have to override classNames.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: ConfirmDialog wrapper

**Files:**
- Create: `src/components/admin/ConfirmDialog.tsx`
- Create: `src/test/integration/ConfirmDialog.test.tsx`

A controlled dialog the rest of admin uses. Caller owns `open` state.

- [ ] **Step 1: Write the integration tests**

Create `src/test/integration/ConfirmDialog.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'

describe('ConfirmDialog', () => {
  it('renders nothing when closed', () => {
    render(
      <ConfirmDialog
        open={false}
        title="Delete?"
        description="Are you sure?"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(screen.queryByText('Delete?')).not.toBeInTheDocument()
  })

  it('renders title, description, and 2 action buttons when open', () => {
    render(
      <ConfirmDialog
        open
        title="Delete this game?"
        description="It cannot be undone."
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(screen.getByText('Delete this game?')).toBeInTheDocument()
    expect(screen.getByText('It cannot be undone.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '確認' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '取消' })).toBeInTheDocument()
  })

  it('clicking confirm fires onConfirm', () => {
    const onConfirm = vi.fn()
    render(
      <ConfirmDialog
        open
        title="t"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: '確認' }))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('clicking cancel fires onCancel', () => {
    const onCancel = vi.fn()
    render(
      <ConfirmDialog
        open
        title="t"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: '取消' }))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('uses custom labels when provided', () => {
    render(
      <ConfirmDialog
        open
        title="t"
        confirmLabel="離開"
        cancelLabel="留在這"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: '離開' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '留在這' })).toBeInTheDocument()
  })

  it('destructive variant applies a destructive class to the confirm button', () => {
    render(
      <ConfirmDialog
        open
        title="t"
        destructive
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    // The destructive class includes the red-ish #fc8181 token
    const confirm = screen.getByRole('button', { name: '確認' })
    expect(confirm.className).toMatch(/fc8181/)
  })
})
```

- [ ] **Step 2: Run tests to confirm failure**

Run: `npm run test -- src/test/integration/ConfirmDialog.test.tsx`

Expected: failures because `ConfirmDialog` is not exported.

- [ ] **Step 3: Implement the wrapper**

Create `src/components/admin/ConfirmDialog.tsx`:

```tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

const FONT = { fontFamily: 'var(--font-barlow-condensed)' as const }

interface Props {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

const DESTRUCTIVE_CLASS =
  'bg-[#fc8181] text-[#0a0a0f] hover:bg-[#fb6e6e]'

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = '確認',
  cancelLabel = '取消',
  destructive = false,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel()
      }}
    >
      <AlertDialogContent style={FONT}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={destructive ? DESTRUCTIVE_CLASS : undefined}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

- [ ] **Step 4: Run tests to confirm pass**

Run: `npm run test -- src/test/integration/ConfirmDialog.test.tsx`

Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/ConfirmDialog.tsx src/test/integration/ConfirmDialog.test.tsx
git commit -m "$(cat <<'EOF'
feat(admin): controlled ConfirmDialog wrapper

Theme-matched controlled dialog the rest of admin will use to replace
window.confirm calls. Caller owns open/close state. Destructive prop
swaps the confirm button to the red palette for delete confirmations.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: EditGamePage — form-mode refactor

**Files:**
- Modify: `src/components/admin/EditGamePage.tsx`
- Modify: `src/test/integration/EditGamePage.test.tsx`

Largest task. The page becomes a controlled form: every interaction mutates local `EditState`, and the master Save button commits via the existing service layer. Existing per-rec instant-action tests are removed; new tests cover the form-mode flow.

- [ ] **Step 1: Rewrite the test file**

Replace the entire contents of `src/test/integration/EditGamePage.test.tsx` with:

```tsx
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { EditGamePage } from '@/components/admin/EditGamePage'

const stubGame = {
  id: 'g1',
  sport_id: 'mlb',
  home_team_id: 'lad',
  away_team_id: 'sd',
  game_date: '2026-04-29',
  game_time: '2026-04-29 22:10:00',
  status: 'scheduled',
  recommendations: [
    {
      market: 'ml',
      pick: 'home',
      line: null,
      stars: 3,
      result: null,
      source: 'manual',
      audience: 'all',
    },
    {
      market: 'spread',
      pick: 'away',
      line: -1.5,
      stars: 4,
      result: null,
      source: 'manual',
      audience: 'premium',
    },
  ],
}

const stubTeams = [
  { id: 'lad', sport_id: 'mlb', name_zh: '道奇', abbreviation: 'LAD', logo_url: null, external_id: 1 },
  { id: 'sd',  sport_id: 'mlb', name_zh: '教士', abbreviation: 'SD',  logo_url: null, external_id: 2 },
]

const mocks = vi.hoisted(() => ({
  updateGame: vi.fn(),
  deleteGame: vi.fn(),
  createRecommendations: vi.fn(),
  updateRecommendation: vi.fn(),
  deleteRecommendation: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  navigate: vi.fn(),
}))

vi.mock('@/lib/supabase', () => {
  const gamesSelect = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(() => Promise.resolve({ data: stubGame, error: null })),
  }
  const teamsSelect = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn(() => Promise.resolve({ data: stubTeams, error: null })),
  }
  return {
    supabase: {
      from: (table: string) => {
        if (table === 'games') return gamesSelect
        if (table === 'teams') return teamsSelect
        throw new Error(`unmocked from(${table})`)
      },
    },
  }
})

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, onClick, to, ...rest }: Record<string, unknown>) => (
    <a
      href={typeof to === 'string' ? to : '#'}
      onClick={onClick as React.MouseEventHandler}
      {...rest}
    >
      {children as React.ReactNode}
    </a>
  ),
  useNavigate: () => mocks.navigate,
}))

vi.mock('@/services/admin/adminApi', () => ({
  adminGamesApi: {
    updateGame: (...args: unknown[]) => mocks.updateGame(...args),
    deleteGame: (...args: unknown[]) => mocks.deleteGame(...args),
  },
  adminRecommendationsApi: {
    createRecommendations: (...args: unknown[]) => mocks.createRecommendations(...args),
    updateRecommendation: (...args: unknown[]) => mocks.updateRecommendation(...args),
    deleteRecommendation: (...args: unknown[]) => mocks.deleteRecommendation(...args),
  },
}))

vi.mock('sonner', () => ({
  toast: {
    success: (msg: string) => mocks.toastSuccess(msg),
    error: (msg: string) => mocks.toastError(msg),
    info: vi.fn(),
  },
}))

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return { Wrapper, client }
}

async function renderPage() {
  const { Wrapper, client } = makeWrapper()
  const utils = render(<EditGamePage gameId="g1" />, { wrapper: Wrapper })
  await waitFor(() => {
    expect(screen.getAllByRole('group', { name: '受眾' }).length).toBeGreaterThanOrEqual(2)
  })
  return { ...utils, client }
}

describe('EditGamePage — form mode', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((m) => 'mockReset' in m && m.mockReset())
    mocks.updateGame.mockResolvedValue({ error: null })
    mocks.deleteGame.mockResolvedValue({ error: null })
    mocks.createRecommendations.mockResolvedValue({ error: null })
    mocks.updateRecommendation.mockResolvedValue({ error: null })
    mocks.deleteRecommendation.mockResolvedValue({ error: null })
  })

  it('hydrates with both existing recs and a disabled (clean) Save button', async () => {
    await renderPage()
    expect(screen.getAllByRole('radiogroup', { name: '盤口' })).toHaveLength(2)
    expect(screen.getByRole('button', { name: /^儲存變更$/ })).toBeDisabled()
  })

  it('changing a pick on an existing rec marks the page dirty (Save enables)', async () => {
    await renderPage()
    const pickGroups = screen.getAllByRole('radiogroup', { name: '選邊' })
    fireEvent.click(within(pickGroups[0]).getByRole('radio', { name: '客' }))
    expect(screen.getByRole('button', { name: /^儲存變更$/ })).toBeEnabled()
  })

  it('clicking 移除 on a rec marks it for deletion (replaces with 取消刪除)', async () => {
    await renderPage()
    const removeBtns = screen.getAllByRole('button', { name: /移除/ })
    fireEvent.click(removeBtns[0])
    // The "取消刪除" button replaces it on that row
    expect(screen.getByRole('button', { name: /取消刪除/ })).toBeInTheDocument()
  })

  it('clicking 取消刪除 reverts the soft-delete', async () => {
    await renderPage()
    fireEvent.click(screen.getAllByRole('button', { name: /移除/ })[0])
    fireEvent.click(screen.getByRole('button', { name: /取消刪除/ }))
    // Back to two active rows; no "取消刪除" button remains
    expect(screen.queryByRole('button', { name: /取消刪除/ })).not.toBeInTheDocument()
  })

  it('Save is disabled if all recs are marked deleted (and no new recs added)', async () => {
    await renderPage()
    const removeBtns = screen.getAllByRole('button', { name: /移除/ })
    fireEvent.click(removeBtns[0])
    fireEvent.click(removeBtns[1])
    expect(screen.getByRole('button', { name: /^儲存變更$/ })).toBeDisabled()
    expect(screen.getByText(/比賽必須至少保留 1 條推薦/)).toBeInTheDocument()
  })

  it('+ 加推薦 adds a new rec defaulting to an unused market', async () => {
    await renderPage()
    fireEvent.click(screen.getByRole('button', { name: /\+ 加推薦/ }))
    const allMarketGroups = screen.getAllByRole('radiogroup', { name: '盤口' })
    expect(allMarketGroups).toHaveLength(3)
    // Existing recs use ml + spread; new default is ou
    const newRow = allMarketGroups[2]
    expect(within(newRow).getByRole('radio', { name: '大小分' })).toHaveAttribute('aria-checked', 'true')
  })

  it('Save success calls update + create + delete in order then re-hydrates', async () => {
    await renderPage()
    // Edit one rec, soft-delete the other, and add a new one
    fireEvent.click(within(screen.getAllByRole('radiogroup', { name: '選邊' })[0]).getByRole('radio', { name: '客' }))
    fireEvent.click(screen.getAllByRole('button', { name: /移除/ })[1])
    fireEvent.click(screen.getByRole('button', { name: /\+ 加推薦/ }))

    fireEvent.click(screen.getByRole('button', { name: /^儲存變更$/ }))

    await waitFor(() => {
      expect(mocks.toastSuccess).toHaveBeenCalled()
    })
    // Edited rec → updateRecommendation (patch includes result)
    expect(mocks.updateRecommendation).toHaveBeenCalledWith(
      'g1',
      'ml',
      expect.objectContaining({ pick: 'away', result: null }),
    )
    // New rec → createRecommendations
    expect(mocks.createRecommendations).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ game_id: 'g1', market: 'ou' })]),
    )
    // Deleted rec → deleteRecommendation
    expect(mocks.deleteRecommendation).toHaveBeenCalledWith('g1', 'spread')
  })

  it('clicking a result button on an existing rec stages the result and Save commits it', async () => {
    await renderPage()
    // Each existing rec has a ResultEntry block with 贏/輸/和/退 buttons
    const winButtons = screen.getAllByRole('button', { name: '贏' })
    expect(winButtons.length).toBeGreaterThanOrEqual(2)
    fireEvent.click(winButtons[0])

    // Save now enabled
    expect(screen.getByRole('button', { name: /^儲存變更$/ })).toBeEnabled()

    fireEvent.click(screen.getByRole('button', { name: /^儲存變更$/ }))

    await waitFor(() => {
      expect(mocks.updateRecommendation).toHaveBeenCalledWith(
        'g1',
        'ml',
        expect.objectContaining({ result: 'win' }),
      )
    })
    expect(mocks.toastSuccess).toHaveBeenCalled()
  })

  it('Save failure surfaces toast and keeps the page on edit', async () => {
    mocks.updateRecommendation.mockResolvedValueOnce({ error: { message: 'denied' } })
    await renderPage()
    fireEvent.click(within(screen.getAllByRole('radiogroup', { name: '選邊' })[0]).getByRole('radio', { name: '客' }))
    fireEvent.click(screen.getByRole('button', { name: /^儲存變更$/ }))

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith(expect.stringContaining('denied'))
    })
    expect(mocks.toastSuccess).not.toHaveBeenCalled()
  })

  it('捨棄變更 opens a ConfirmDialog and resets state on confirm', async () => {
    await renderPage()
    fireEvent.click(within(screen.getAllByRole('radiogroup', { name: '選邊' })[0]).getByRole('radio', { name: '客' }))
    expect(screen.getByRole('button', { name: /^儲存變更$/ })).toBeEnabled()

    fireEvent.click(screen.getByRole('button', { name: /^捨棄變更$/ }))
    expect(screen.getByText(/捨棄所有未儲存的變更/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '確認' }))

    await waitFor(() => {
      expect(screen.queryByText(/捨棄所有未儲存的變更/)).not.toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /^儲存變更$/ })).toBeDisabled()
  })

  it('clicking the ← back link while dirty opens the leave dialog', async () => {
    await renderPage()
    fireEvent.click(within(screen.getAllByRole('radiogroup', { name: '選邊' })[0]).getByRole('radio', { name: '客' }))

    fireEvent.click(screen.getByRole('link', { name: /返回比賽管理/ }))

    expect(screen.getByText(/有未儲存的變更/)).toBeInTheDocument()
  })

  it('刪除整場 opens a destructive ConfirmDialog and calls deleteGame on confirm', async () => {
    await renderPage()
    fireEvent.click(screen.getByRole('button', { name: /^刪除整場$/ }))
    expect(screen.getByText(/刪除整場比賽/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '確認' }))

    await waitFor(() => {
      expect(mocks.deleteGame).toHaveBeenCalledWith('g1')
    })
    expect(mocks.navigate).toHaveBeenCalledWith({ to: '/admin' })
  })
})
```

- [ ] **Step 2: Run tests to confirm failure (component still uses the old shape)**

Run: `npm run test -- src/test/integration/EditGamePage.test.tsx`

Expected: failures — the existing page does not have `儲存變更` / `捨棄變更` buttons, soft-delete, or ConfirmDialog calls.

- [ ] **Step 3: Rewrite the component**

Replace the entire contents of `src/components/admin/EditGamePage.tsx` with:

```tsx
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GameForm, type GameFormValue } from './GameForm'
import { RecommendationFormRow, type RecFormValue } from './RecommendationFormRow'
import { ResultEntry } from './ResultEntry'
import { ConfirmDialog } from './ConfirmDialog'
import { useTeams } from '@/hooks/useTeams'
import { adminGamesApi, adminRecommendationsApi } from '@/services/admin/adminApi'
import { supabase } from '@/lib/supabase'
import type {
  Audience,
  GameStatus,
  Market,
  Pick as RecPick,
  RecResult,
} from '@/types/predictions/recommendation'

const FONT = { fontFamily: 'var(--font-barlow-condensed)' as const }
const ALL_MARKETS = ['ml', 'spread', 'ou'] as const

interface ExistingRec {
  market: Market
  pick: RecPick
  line: number | null
  stars: number
  result: RecResult | null
  source: 'cron' | 'manual'
  audience: Audience
}

interface ExistingGame {
  id: string
  sport_id: string
  home_team_id: string
  away_team_id: string
  game_date: string
  game_time: string
  status: GameStatus
  recommendations: ExistingRec[]
}

type RecState = 'existing' | 'edited' | 'new' | 'deleted'

interface EditRec extends RecFormValue {
  origMarket: Market | null   // null for 'new' rows; non-null for 'existing' / 'edited' / 'deleted'
  result: RecResult | null    // existing result snapshot; user can edit, commits on Save
  state: RecState
}

interface EditState {
  game: GameFormValue
  gameDirty: boolean
  recs: EditRec[]
}

function nextDefaultRec(taken: Set<string>): RecFormValue {
  const m = ALL_MARKETS.find((x) => !taken.has(x)) ?? 'ml'
  return {
    market: m,
    pick: m === 'ou' ? 'over' : 'home',
    line: m === 'ml' ? null : 0,
    stars: 3,
    audience: 'all',
  }
}

function hydrate(g: ExistingGame): EditState {
  return {
    game: {
      sport_id: g.sport_id,
      home_team_id: g.home_team_id,
      away_team_id: g.away_team_id,
      game_date: g.game_date,
      game_time: g.game_time,
      status: g.status,
    },
    gameDirty: false,
    recs: g.recommendations.map((r) => ({
      market: r.market,
      pick: r.pick,
      line: r.line,
      stars: r.stars,
      audience: r.audience,
      result: r.result,
      origMarket: r.market,
      state: 'existing',
    })),
  }
}

export function EditGamePage({ gameId }: { gameId: string }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const teamsQuery = useTeams('mlb')

  const gameQuery = useQuery({
    queryKey: ['admin', 'game', gameId],
    queryFn: async (): Promise<ExistingGame> => {
      const { data, error } = await supabase
        .from('games')
        .select(`
          id, sport_id, home_team_id, away_team_id, game_date, game_time, status,
          recommendations(market, pick, line, stars, result, source, audience)
        `)
        .eq('id', gameId)
        .single()
      if (error) throw error
      return data as unknown as ExistingGame
    },
  })

  const [state, setState] = useState<EditState | null>(null)
  const [saving, setSaving] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [deleteGameOpen, setDeleteGameOpen] = useState(false)

  useEffect(() => {
    if (gameQuery.data && !state) setState(hydrate(gameQuery.data))
    // Only hydrate once; subsequent updates do not clobber user edits
  }, [gameQuery.data, state])

  if (gameQuery.isLoading || !state) {
    return <p className="text-[#94a3b8] py-8" style={FONT}>載入中…</p>
  }
  if (gameQuery.error) {
    return (
      <p className="text-[#fc8181] py-8" style={FONT}>
        載入失敗：{(gameQuery.error as Error).message}
      </p>
    )
  }

  const activeRecs = state.recs.filter((r) => r.state !== 'deleted')
  const activeMarkets = activeRecs.map((r) => r.market)
  const hasDuplicateMarket = new Set(activeMarkets).size !== activeMarkets.length
  const hasNoActive = activeRecs.length === 0
  const isDirty =
    state.gameDirty ||
    state.recs.some((r) => r.state !== 'existing')

  const validationMsg = hasNoActive
    ? '比賽必須至少保留 1 條推薦'
    : hasDuplicateMarket
      ? '盤口重複,請調整為三種不同盤口'
      : null

  function patchGame(next: GameFormValue) {
    setState((s) => (s ? { ...s, game: next, gameDirty: true } : s))
  }

  function patchRec(idx: number, value: RecFormValue) {
    setState((s) => {
      if (!s) return s
      const recs = s.recs.map((r, i) => {
        if (i !== idx) return r
        const nextState: RecState =
          r.state === 'new' ? 'new' : r.state === 'deleted' ? r.state : 'edited'
        return { ...r, ...value, state: nextState }
      })
      return { ...s, recs }
    })
  }

  function setResult(idx: number, result: RecResult | null) {
    setState((s) => {
      if (!s) return s
      const recs = s.recs.map((r, i) => {
        if (i !== idx) return r
        const nextState: RecState =
          r.state === 'new' ? 'new' : r.state === 'deleted' ? r.state : 'edited'
        return { ...r, result, state: nextState }
      })
      return { ...s, recs }
    })
  }

  function softRemoveRec(idx: number) {
    setState((s) => {
      if (!s) return s
      const recs = s.recs.flatMap((r, i) => {
        if (i !== idx) return [r]
        if (r.state === 'new') return []  // unsubmitted new rec — drop entirely
        return [{ ...r, state: 'deleted' as RecState }]
      })
      return { ...s, recs }
    })
  }

  function undoRemoveRec(idx: number) {
    setState((s) => {
      if (!s) return s
      const recs = s.recs.map((r, i) => {
        if (i !== idx) return r
        if (r.state !== 'deleted') return r
        // If pick/line/stars/audience were unchanged from origMarket version, mark 'existing'.
        // We approximate by marking 'edited' — the save pipeline still does an UPDATE which is
        // a no-op when nothing changed. Cheap and correct.
        return { ...r, state: 'edited' as RecState }
      })
      return { ...s, recs }
    })
  }

  function addRec() {
    setState((s) => {
      if (!s) return s
      const taken = new Set(s.recs.filter((r) => r.state !== 'deleted').map((r) => r.market))
      const def = nextDefaultRec(taken)
      const newRow: EditRec = { ...def, origMarket: null, result: null, state: 'new' }
      return { ...s, recs: [...s.recs, newRow] }
    })
  }

  async function save() {
    if (!state || hasNoActive || hasDuplicateMarket) return
    setSaving(true)
    try {
      // 1. Game info
      if (state.gameDirty) {
        const { error } = await adminGamesApi.updateGame(gameId, state.game)
        if (error) throw new Error(`比賽資訊:${error.message}`)
      }
      // 2. New recs (single batch)
      const newRecs = state.recs.filter((r) => r.state === 'new')
      if (newRecs.length > 0) {
        const { error } = await adminRecommendationsApi.createRecommendations(
          newRecs.map((r) => ({
            game_id: gameId,
            market: r.market,
            pick: r.pick,
            line: r.line,
            stars: r.stars,
            audience: r.audience,
          })),
        )
        if (error) throw new Error(`新增推薦:${error.message}`)
      }
      // 3. Edited recs (loop — typically 1–3). Includes result so result-only edits also commit.
      const edited = state.recs.filter((r) => r.state === 'edited' && r.origMarket !== null)
      for (const r of edited) {
        const { error } = await adminRecommendationsApi.updateRecommendation(
          gameId,
          r.origMarket!,
          {
            pick: r.pick,
            line: r.line,
            stars: r.stars,
            audience: r.audience,
            result: r.result,
          },
        )
        if (error) throw new Error(`更新推薦 ${r.origMarket}:${error.message}`)
      }
      // 4. Deleted recs (loop)
      const deleted = state.recs.filter((r) => r.state === 'deleted' && r.origMarket !== null)
      for (const r of deleted) {
        const { error } = await adminRecommendationsApi.deleteRecommendation(
          gameId,
          r.origMarket!,
        )
        if (error) throw new Error(`刪除推薦 ${r.origMarket}:${error.message}`)
      }

      toast.success('已儲存')
      void queryClient.invalidateQueries({ queryKey: ['admin', 'game', gameId] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'games', 'recent'] })
      void queryClient.invalidateQueries({ queryKey: ['recommendations'] })
      // Re-hydrate from fresh query data after invalidation completes
      setState(null)
    } catch (e) {
      const msg = e instanceof Error ? e.message : '未知錯誤'
      toast.error(`儲存失敗:${msg}`)
    } finally {
      setSaving(false)
    }
  }

  function discardChanges() {
    if (!gameQuery.data) return
    setState(hydrate(gameQuery.data))
    setDiscardOpen(false)
  }

  function handleBackClick(e: React.MouseEvent) {
    if (!isDirty) return // allow native nav
    e.preventDefault()
    setLeaveOpen(true)
  }

  async function confirmDeleteGame() {
    setDeleteGameOpen(false)
    const { error } = await adminGamesApi.deleteGame(gameId)
    if (error) {
      toast.error(`刪除失敗:${error.message}`)
      return
    }
    toast.success('比賽已刪除')
    void queryClient.invalidateQueries({ queryKey: ['admin'] })
    navigate({ to: '/admin' })
  }

  return (
    <div className="py-8 px-4 space-y-6" style={FONT}>
      <Link
        to="/admin"
        onClick={handleBackClick}
        className="inline-flex items-center gap-1 text-sm text-[#00e5a0] hover:underline"
      >
        ← 返回比賽管理
      </Link>

      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#e2e8f0]">編輯比賽</h1>
          <p className="text-sm text-[#94a3b8] mt-1">id: {gameId}</p>
        </div>
        <div className="flex gap-2">
          {isDirty ? (
            <button
              type="button"
              onClick={() => setDiscardOpen(true)}
              className="px-4 py-2 rounded text-sm font-bold bg-transparent text-[#94a3b8] border border-[#1e2733] hover:bg-[#0d1117]"
            >
              捨棄變更
            </button>
          ) : null}
          <button
            type="button"
            disabled={saving || !isDirty || hasNoActive || hasDuplicateMarket}
            onClick={save}
            className="px-4 py-2 rounded text-sm font-bold bg-[#00e5a0] text-[#0a0a0f] hover:bg-[#00c98a] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? '儲存中…' : '儲存變更'}
          </button>
          <button
            type="button"
            onClick={() => setDeleteGameOpen(true)}
            className="px-4 py-2 rounded text-sm font-bold bg-[rgba(252,129,129,0.10)] text-[#fc8181] border border-[rgba(252,129,129,0.30)] hover:bg-[rgba(252,129,129,0.20)]"
          >
            刪除整場
          </button>
        </div>
      </header>

      <section className="rounded-[10px] border border-[#1e2733] bg-[#161b22] p-6 space-y-4">
        <h2 className="text-base font-bold text-[#e2e8f0]">比賽資訊</h2>
        {teamsQuery.isLoading ? (
          <p className="text-[#94a3b8]">載入隊伍…</p>
        ) : (
          <GameForm value={state.game} onChange={patchGame} teams={teamsQuery.data ?? []} />
        )}
      </section>

      <section className="rounded-[10px] border border-[#1e2733] bg-[#161b22] p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[#e2e8f0]">推薦</h2>
          <button
            type="button"
            disabled={activeMarkets.length >= 3}
            onClick={addRec}
            className="px-3 py-1.5 rounded text-xs font-bold bg-[rgba(0,229,160,0.10)] text-[#00e5a0] border border-[rgba(0,229,160,0.30)] hover:bg-[rgba(0,229,160,0.20)] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            + 加推薦
          </button>
        </div>

        {state.recs.length === 0 ? (
          <p className="text-sm text-[#fc8181]">⚠ 比賽必須至少保留 1 條推薦</p>
        ) : (
          <div className="space-y-3">
            {state.recs.map((r, i) => {
              const isDeleted = r.state === 'deleted'
              const otherMarkets = state.recs
                .filter((_, j) => j !== i && state.recs[j].state !== 'deleted')
                .map((rr) => rr.market)
              return (
                <div
                  key={i}
                  className={isDeleted ? 'opacity-40 line-through pointer-events-none relative' : ''}
                >
                  {isDeleted ? (
                    <div className="absolute right-2 top-2 z-10 pointer-events-auto">
                      <button
                        type="button"
                        onClick={() => undoRemoveRec(i)}
                        className="px-3 py-1 rounded text-xs font-bold bg-transparent text-[#00e5a0] border border-[rgba(0,229,160,0.30)] hover:bg-[rgba(0,229,160,0.10)]"
                      >
                        ↩ 取消刪除
                      </button>
                    </div>
                  ) : null}
                  <RecommendationFormRow
                    value={{
                      market: r.market,
                      pick: r.pick,
                      line: r.line,
                      stars: r.stars,
                      audience: r.audience,
                    }}
                    onChange={(next) => patchRec(i, next)}
                    onRemove={() => softRemoveRec(i)}
                    marketsTaken={otherMarkets}
                  />
                  {r.state !== 'new' ? (
                    <div className="mt-2 pl-1 flex items-center gap-3">
                      <span className="text-xs text-[#94a3b8] font-bold tracking-wide uppercase">結果</span>
                      <ResultEntry
                        market={r.market}
                        value={r.result}
                        onChange={(next) => setResult(i, next)}
                      />
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}

        {validationMsg ? (
          <p className="text-sm text-[#fc8181]">⚠ {validationMsg}</p>
        ) : null}
      </section>

      <ConfirmDialog
        open={discardOpen}
        title="捨棄所有未儲存的變更?"
        description="所有本次的修改都會回到上次儲存的狀態。"
        onConfirm={discardChanges}
        onCancel={() => setDiscardOpen(false)}
      />

      <ConfirmDialog
        open={leaveOpen}
        title="離開頁面?"
        description="你有未儲存的變更,離開後會遺失。"
        confirmLabel="離開"
        cancelLabel="留在這"
        onConfirm={() => {
          setLeaveOpen(false)
          navigate({ to: '/admin' })
        }}
        onCancel={() => setLeaveOpen(false)}
      />

      <ConfirmDialog
        open={deleteGameOpen}
        title="刪除整場比賽?"
        description="這場的推薦與投票也會一併移除。"
        confirmLabel="刪除"
        destructive
        onConfirm={confirmDeleteGame}
        onCancel={() => setDeleteGameOpen(false)}
      />
    </div>
  )
}
```

- [ ] **Step 4: Run tests to confirm pass**

Run: `npm run test -- src/test/integration/EditGamePage.test.tsx`

Expected: PASS (12 tests).

- [ ] **Step 5: Manually verify in dev**

Run: `npm run dev`

From `/admin`, click any existing game's edit link. Confirm:
- Existing recs render in layout B (segmented + visual stars + AudienceToggle) plus a 結果 row of 贏/輸/和/退 buttons.
- Editing any field — including clicking a result button — enables 儲存變更 + shows 捨棄變更 button.
- Clicking 移除 strikes through the row and shows ↩ 取消刪除.
- + 加推薦 defaults to the first unused market; disabled at 3. New recs do NOT show the 結果 row.
- 捨棄變更 opens the dialog — confirm resets all edits (including result).
- ← 返回比賽管理 while dirty opens the leave dialog.
- 刪除整場 opens a destructive (red) dialog — confirm deletes and routes to /admin.
- Save success toast + page re-hydrates with the new server state.

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/EditGamePage.tsx src/test/integration/EditGamePage.test.tsx
git commit -m "$(cat <<'EOF'
refactor(admin): EditGamePage form-mode with deferred Save

Every interaction (rec edit, soft-delete, audience toggle, result entry,
add new rec, game info patch) now mutates local state. The master 儲存變更
button commits the diff in order: game UPDATE, new recs INSERT, edited
recs UPDATE, deleted recs DELETE. Hard re-hydrate after success.

Replaces the 5-second audience undo toast with a soft-delete + ↩ 取消刪除
affordance and a 捨棄變更 button. ← back link is intercepted while dirty.
All native window.confirm calls are replaced by the new ConfirmDialog
(destructive variant for 刪除整場).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Final verification

- [ ] **Step 1: Full test suite**

Run: `npm run test`

Expected: ALL PASS. Investigate any failure before proceeding.

- [ ] **Step 2: Lint**

Run: `npm run lint`

Expected: PASS with no new warnings beyond the baseline.

- [ ] **Step 3: Production build**

Run: `npm run build`

Expected: type-check + vite build both succeed. The build script runs `vitest run && vite build && tsc` so this exercises everything.

- [ ] **Step 4: Manual smoke test in dev**

Run: `npm run dev`

Walk through:
1. `/admin/games/new` → MLB 賽程匯入 tab → pick a date with games → select 2 → 下一步 → fill 1 rec on each card → 建立 → toast + redirect.
2. `/admin/games/new` → 手動建立 tab → confirm starts with zero recs and Save is disabled until + 新增推薦.
3. `/admin/games/<id>` (edit any game) → toggle audience on an existing rec → no instant API call, the new save button enables → 儲存變更 → success.
4. Same edit page → 移除 a rec → 取消刪除 → discard via 捨棄變更 dialog.
5. Same edit page → make any change → click ← 返回比賽管理 → leave dialog → 留在這 keeps you put.
6. Same edit page → 刪除整場 → red destructive dialog → 刪除 deletes + routes to /admin.

- [ ] **Step 5: Push branch**

Run:

```bash
git push -u origin feat/batch-wizard-form-edit
```

Then surface the URL of the new branch to the user. Do **not** open a PR yet; the user opens PRs separately per their preference.

---

## Self-review notes

**Spec coverage:**

| Spec section | Covered by task |
|---|---|
| 4.1 RecommendationFormRow layout B | Task 1 |
| 4.2 BatchImportWizard | Tasks 3, 4, 5, 6 |
| 4.3 EditGamePage form mode | Task 9 |
| 4.4 ConfirmDialog (alert-dialog wrapper + admin wrapper) | Tasks 7, 8 |
| Min-1-rec validation (NewGamePage manual + wizard + edit) | Tasks 2, 5, 9 |
| Market-uniqueness per game | Tasks 1 (marketsTaken), 2, 5, 9 |
| Atomic-ish batch create with cleanup | Task 5 (uses Task 3's createGames + deleteGames) |
| Replace window.confirm with ConfirmDialog | Task 9 (the only existing call sites) |
| beforeunload skipped intentionally | Task 9 (no listener added) |

**Type/method consistency check:** `RecFormValue` is unchanged and exported from Task 1's `RecommendationFormRow.tsx` and reused everywhere. `CreateGameInput` is the existing type — Task 3's `createGames` accepts `CreateGameInput[]`. Wizard uses `adminGamesApi.createGames` + `deleteGames` (Task 3) and `adminRecommendationsApi.createRecommendations` (already batch-capable).

**Placeholder scan:** none. Every step has actual code or an exact command.
