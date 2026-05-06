# Batch Import Wizard + Form-Mode Edit + Required Recs

**Date:** 2026-05-06
**Status:** Draft (pending user review)
**Scope:** Admin UI — frontend only. No schema, no migration, no RLS change.

---

## Background

Two pain points in the current admin flow:

1. **Batch import builds games without recs.** `MlbScheduleImporter`
   (`src/components/admin/MlbScheduleImporter.tsx`) inserts N games in a `for`
   loop and surfaces "ok N / failed M". Admin then opens each newly-created
   game's `EditGamePage` to add recs one at a time.
2. **`EditGamePage` is a control panel, not a form.** Each action commits
   immediately:
   - audience toggle → instant API + 5s undo toast (commit `0d1275c`)
   - result entry → instant API
   - delete one rec → `confirm()` + instant API
   - add new recs → its own "儲存新推薦" button
   - delete entire game → `confirm()` + instant API
   - game-info edit → its own "儲存比賽" button

   The user wants a single Save button covering all field edits.

A nominal third issue surfaced during brainstorming: the `RecommendationFormRow`
six-column grid (`market | pick | line | stars | audience | remove`) is
visually dense — controls are dropdowns squeezed into narrow columns, and the
form is hard to scan when stacked.

## Goal

1. Add a 2-step batch wizard: select games (Step 1) → fill recs per selected
   game (Step 2) → submit all in one transaction.
2. Enforce **min 1 recommendation per game** at create-time and edit-time.
   No game may exist in the system with zero recs after either flow.
3. Convert `EditGamePage` to **form mode** — all field edits are local until
   the master Save button is pressed.
4. Redesign `RecommendationFormRow` to **layout B** (segmented controls,
   visual stars, pill toggle, away-on-left / home-on-right).
5. Replace every `window.confirm()` / `window.alert()` call with a custom
   `ConfirmDialog` component (Radix-based, theme-matched).

## Non-goals

- **No schema changes.** PRIMARY KEY `(game_id, market)` and ON DELETE CASCADE
  on `recommendations.game_id` are sufficient.
- **No new RPC.** Atomic-ish submission uses client-side compensating delete
  on rec-insert failure (acceptable race window for a single-admin app).
- **No change to cron-source recs.** This change is admin-UI only.
- **No change to public predictions feed.** It already filters games by recs
  via the `recommendations_public` view.
- **`NewGamePage` manual mode** keeps its single-game shape but inherits
  three behaviour changes from this spec for consistency: it uses the new
  `RecommendationFormRow` layout B; it starts with **zero** rec rows
  (the current `[EMPTY_REC]` initial state is removed) so the user must
  click `+ 加推薦` to add one; and the Save button is disabled while
  `recs.length === 0`.
- **No "draft" persistence.** Wizard state and edit-page dirty state live in
  memory only; refreshing the page loses unsaved work. A nav-away dialog
  warns the user before they lose work.

## UI design

### 4.1 `RecommendationFormRow` — layout B

`src/components/admin/RecommendationFormRow.tsx` is rewritten. It still owns
the same `RecFormValue` shape (`market`, `pick`, `line`, `stars`, `audience`)
and exposes the same `value / onChange / onRemove` props, plus one new prop
`marketsTaken` so it can disable already-used markets in the dropdown.

**Layout:**

```
┌────────────────────────────────────────────────────────────────┐
│ 盤口                  選邊                                      │
│ ┌─────────────────┐  ┌────────────┐                            │
│ │ ML │讓分│大小分 │  │  客  │  主  │       (盤線 if shown)        │
│ └─────────────────┘  └────────────┘                            │
│                                                                 │
│ 星等          受眾              [移除]                          │
│ ★ ★ ★ ☆ ☆    ┃公開│Premium┃                                   │
└────────────────────────────────────────────────────────────────┘
```

- **盤口** segmented control (3 segments): `ml` / `讓分` (spread) / `大小分` (ou).
  Disabled segment if its market is in `marketsTaken`.
- **選邊** segmented control (2 segments).
  Order **客 then 主** for `ml` and `spread` (matches commit `48b0c1d` rest-of-app convention);
  `大 / 小` for `ou`.
- **盤線** appears only for `spread` (label `讓分`) and `ou` (label `盤線`).
  Stays as a number input, step 0.5.
- **星等** five clickable star characters (★/☆). Clicking nth star sets stars=n.
- **受眾** pill toggle: `公開` / `Premium`. Reuses the existing
  `AudienceToggle` palette (mint for 公開, amber for Premium).
- **移除** small destructive button on the right of row 2.

**Visual tokens:**

- Container: `rounded border border-[#1e2733] bg-[#0d1117] p-3`
- Field labels: existing `text-[#94a3b8] uppercase text-xs font-bold tracking-wide`
- Active segment: `bg-[rgba(0,229,160,0.12)] text-[#00e5a0]`
- Inactive segment: `text-[#94a3b8] hover:text-[#e2e8f0]`
- Lit star: `text-[#00e5a0]`; unlit: `text-[#1e2733]`

**Accessibility:**

- Each segmented control: `role="radiogroup"` with `role="radio"` segments,
  `aria-checked`, ←/→ keyboard nav, roving `tabIndex`.
- Stars: `role="radiogroup"` with 5 `role="radio"` items, ←/→ to change, or
  click directly.
- Audience pill toggle: same as the existing `AudienceToggle.tsx`.

**Vertical footprint:** ≈ 130 px per row (vs. ≈ 70 px in the current dense
row). Acceptable because the wizard's Step 2 caps how many appear at once
(N selected games × 1–3 recs each), and `EditGamePage` rarely shows more than
3.

### 4.2 `BatchImportWizard` — replaces inline `MlbScheduleImporter` submit

**New file:** `src/components/admin/BatchImportWizard.tsx`

The wizard owns step state and per-game rec state. `MlbScheduleImporter`
becomes Step 1 — same UI, but instead of a self-contained "批次建立 N 場"
button it now exposes `onSelectionConfirmed(selectedGames)` to its parent.

#### Step 1 — Schedule selection (refactor)

Same date-picker, same checkbox table, same importable filter. Only changes:

- Bottom CTA label: `下一步: 設定推薦 →` (replaces `批次建立 N 場`).
- Disabled when zero importable rows selected.
- On click, lifts the selected `MlbScheduleGame[]` (already mapped to internal
  team IDs) up to `BatchImportWizard`.

#### Step 2 — Rec entry per selected game

For each selected game the parent renders a card:

```
┌─ LAD @ NYY · 09:00 ─────────────────────────────────┐
│  (empty state — no rec yet)                         │
│  ⚠ 請至少加 1 條推薦                                 │
│  [+ 加推薦]                                          │
└─────────────────────────────────────────────────────┘

After clicking + 加推薦:
┌─ LAD @ NYY · 09:00 ─────────────────────────────────┐
│  ┌─ Recommendation 1 ─────────────────────────────┐ │
│  │ [layout B form row, default ML / 主 / 3★ / 公開]│ │
│  └────────────────────────────────────────────────┘ │
│  [+ 加推薦]    (disabled once 3 markets all taken)   │
└─────────────────────────────────────────────────────┘
```

- Each card starts with **zero** rec rows. The user must click `+ 加推薦` for
  the first rec — this matches the user's preference for intentional rec
  creation over auto-defaulting.
- `+ 加推薦` adds a row whose market defaults to the first one not yet used
  by the game (round-robin: `ml` → `spread` → `ou`); other fields default to
  the existing `EMPTY_REC` shape (`pick: 'home'`, `stars: 3`, `audience: 'all'`).
- Per-card validation runs on every state change. The submit button at the
  bottom of the page is disabled until **every card** has ≥1 rec **and** no
  card has duplicate-market entries. Cards with zero recs show the warning
  inline.

#### Submit (Step 2 → DB)

```ts
async function submitBatch(items: { game: GameInput; recs: RecInput[] }[]) {
  // 1. Insert all games in one batch
  const { data: games, error: gErr } = await supabase
    .from('games')
    .insert(items.map((it) => it.game))
    .select('id')
  if (gErr) return { error: gErr }

  // 2. Build all recs with the matching game_id
  const allRecs = items.flatMap((it, i) =>
    it.recs.map((r) => ({ ...r, game_id: games[i].id, source: 'manual' as const })),
  )

  // 3. Insert all recs in one batch
  const { error: rErr } = await supabase.from('recommendations').insert(allRecs)
  if (rErr) {
    // Compensating cleanup — ON DELETE CASCADE removes any partially-inserted recs too
    await supabase.from('games').delete().in('id', games.map((g) => g.id))
    return { error: rErr }
  }

  return { error: null, gameIds: games.map((g) => g.id) }
}
```

If step 2 succeeds but step 3 fails, step 4 deletes the just-inserted games;
because `ON DELETE CASCADE` is set on `recommendations.game_id`, any rec that
did partially insert is also removed.

**Race window:** ~50–200 ms between step 2 and step 4 where N games exist
without recs. Other admins (none expected — single-admin app) and the public
feed are unaffected because the public feed joins on recs.

**Wizard back-nav (Step 2 → Step 1):** rec state is preserved in
`BatchImportWizard` state, keyed by `game_pk` (MLB external id). Returning to
Step 1 keeps the user's selection and rec data; deselecting a game in Step 1
also deletes its recs from the wizard state (with no warning — they
explicitly deselected).

### 4.3 `EditGamePage` — form mode

`src/components/admin/EditGamePage.tsx` is rewritten as a controlled form.

**State shape:**

```ts
interface EditState {
  game: GameFormValue
  recs: Array<{
    market: Market
    pick: RecPick
    line: number | null
    stars: number
    audience: Audience
    result: RecResult | null
    source: 'cron' | 'manual'
    _state: 'existing' | 'edited' | 'new' | 'deleted'
  }>
}
```

The page hydrates from the `useQuery(['admin', 'game', gameId])` result on
mount. Every interaction mutates `EditState`; nothing hits Supabase until
Save.

**Per-rec interactions:**

- Edit a field (pick, line, stars, audience, result) → mark `_state: 'edited'`
  if it was `'existing'`.
- Click `刪除` on a row → mark `_state: 'deleted'`. Visually: strike-through
  + faded + replaces button with `↩ 取消刪除`.
- Click `+ 加推薦` → push `{ ..._state: 'new' }`. Default market = first one
  not yet used (counting `existing | edited | new` but not `deleted`).

**Top-level actions:**

| Button | Behavior |
|---|---|
| `儲存變更` | Disabled while no diff (clean) or validation fails. Runs save pipeline. |
| `捨棄變更` | Visible only when dirty. Opens `ConfirmDialog` "捨棄所有未儲存的變更？" → resets `EditState` from query data. |
| `刪除整場` | Top-right, destructive. Opens `ConfirmDialog` "刪除這場比賽？相關推薦與投票也會一併移除。" → instant `adminGamesApi.deleteGame` (not part of save pipeline). |

**Validation rule for Save:**

`recs.filter((r) => r._state !== 'deleted').length >= 1` AND no duplicate
market across non-deleted recs. Otherwise Save is disabled and a message
appears under the rec list: `比賽必須至少保留 1 條推薦` or `盤口重複`.

**Save pipeline (sequential, surface partial failure):**

```
1. If game changed → adminGamesApi.updateGame(gameId, gamePatch)
2. If new recs exist → adminRecommendationsApi.createRecommendations(newRecs)
3. For each edited rec → adminRecommendationsApi.updateRecommendation(...)
4. For each deleted rec → adminRecommendationsApi.deleteRecommendation(...)
```

If any step errors, stop and surface `toast.error(...)` naming the step.
Don't attempt rollback — partial DB state is non-corrupting (each step is
its own valid mutation), and the next page reload re-hydrates from DB so the
user sees what actually saved. Acceptable for a single-admin app.

On full success: `toast.success('已儲存')`, invalidate queries, leave the
user on the page (do not navigate away — they may want to keep editing).

**Nav-away guard:**

When `EditState` is dirty, intercept the `<Link to="/admin">` ← back link
(and any other in-app router navigation away from this page):
`e.preventDefault()` + open `ConfirmDialog` "有未儲存的變更,確定要離開？".

Tab-close / hard-refresh is **not** intercepted. `beforeunload` would surface
a browser-native dialog the user has explicitly asked us to avoid, and it
cannot be customised. Trade-off: closing the tab while dirty silently loses
the work. Acceptable because the in-app guard catches the common case
(clicking back), and the only way to lose work via tab-close is an explicit
user action.

### 4.4 `ConfirmDialog` — replacing `window.confirm`

**New file:** `src/components/ui/alert-dialog.tsx` — shadcn-style wrapper
over `radix-ui` `AlertDialog` (already available as a peer of `Dialog` used by
`sheet.tsx`).

**Composition:**

```tsx
<AlertDialog>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>{title}</AlertDialogTitle>
      <AlertDialogDescription>{description}</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
      <AlertDialogAction>{confirmLabel}</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

**New file:** `src/components/admin/ConfirmDialog.tsx` — controlled wrapper
the rest of the admin uses:

```ts
interface Props {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string        // default '確認'
  cancelLabel?: string         // default '取消'
  destructive?: boolean        // default false → confirm button mint;
                               // true → confirm button red
  onConfirm: () => void
  onCancel: () => void
}
```

**Visual tokens (theme-matched):**

- Overlay: `bg-black/60`
- Content: `bg-[#161b22] border border-[#1e2733] rounded-[10px] p-6 max-w-[420px]`
- Title: `text-[#e2e8f0] text-lg font-bold`
- Description: `text-[#94a3b8] text-sm leading-relaxed`
- Cancel button: `bg-transparent text-[#94a3b8] border border-[#1e2733]`
- Confirm button (default): `bg-[#00e5a0] text-[#0a0a0f] font-bold`
- Confirm button (destructive): `bg-[#fc8181] text-[#0a0a0f] font-bold`
- Font: `var(--font-barlow-condensed)`

**Use-sites replacing `confirm()`:**

| Old call | New behavior |
|---|---|
| `confirm('確定要刪除這場比賽？相關推薦與投票也會一併移除。')` (`EditGamePage:110`) | `ConfirmDialog` (destructive=true), title `刪除整場比賽？`, description `這場的推薦與投票也會一併移除。` |
| `confirm(\`刪除 ${market} 推薦？\`)` (`EditGamePage:182`) | Replaced — the old per-rec instant-delete is gone in form mode. The new "↩ 取消刪除" lets users undo the soft-delete locally; no dialog needed. |

**New use-sites for new flows:**

| Trigger | Dialog content |
|---|---|
| Click `捨棄變更` in `EditGamePage` | non-destructive; title `捨棄所有未儲存的變更？`, description `所有本次的修改都會回到上次儲存的狀態。` |
| Click `← 返回比賽管理` while `EditGamePage` is dirty | non-destructive; title `離開頁面？`, description `你有未儲存的變更,離開後會遺失。`, confirm `離開`, cancel `留在這` |

## Validation summary

| Rule | Where enforced |
|---|---|
| Game must have ≥ 1 rec at create time | `BatchImportWizard` Step 2 — Submit disabled if any card has 0 active recs. `NewGamePage` manual mode — Save disabled if `recs.length === 0`. |
| Game must have ≥ 1 rec at edit time | `EditGamePage` — Save disabled if `recs.filter(r => r._state !== 'deleted').length < 1`. |
| One rec per market per game | Wizard + EditGamePage + NewGamePage — `+ 加推薦` button disabled when 3 markets all taken; market segmented control disables already-taken segments; Save disabled if duplicate detected. |
| Stars ∈ [1, 5] | Form control inherently restricts this. |
| Line required for spread / ou | Form control shows the input only for those markets, defaulting to 0. |

## Files touched

**New:**

- `src/components/ui/alert-dialog.tsx` — shadcn AlertDialog wrapper
- `src/components/admin/ConfirmDialog.tsx` — controlled dialog used by admin UI
- `src/components/admin/BatchImportWizard.tsx` — Step 1 + Step 2 container
- `src/test/unit/RecommendationFormRow.test.tsx` — layout B segmented controls, stars, market disable
- `src/test/unit/ConfirmDialog.test.tsx` — open/close, confirm/cancel callbacks, destructive variant
- `src/test/integration/BatchImportWizard.test.tsx` — step transitions, validation, atomic submit + cleanup
- `src/test/integration/EditGamePage.test.tsx` — extend existing (or add new) for form-mode behavior

`BatchImportWizard` and `EditGamePage` each compose `RecommendationFormRow`
directly (no shared per-game card component). Their per-card structures
look similar but EditGamePage adds soft-delete state, and the parent shapes
are different enough that an abstraction would be lossy.

**Modified:**

- `src/components/admin/RecommendationFormRow.tsx` — rewrite to layout B; add `marketsTaken` prop
- `src/components/admin/MlbScheduleImporter.tsx` — remove inline `handleImport`; expose `onSelectionConfirmed`; rename submit button label
- `src/components/admin/NewGamePage.tsx` — wrap import-mode in `BatchImportWizard`; manual mode keeps shape but uses min-1 validation + the new `RecommendationFormRow`
- `src/components/admin/EditGamePage.tsx` — rewrite as form-mode (state shape, per-rec soft-delete, Save pipeline, dirty guard)

**Untouched:**

- `src/services/admin/recommendations.ts`
- `src/services/admin/games.ts`
- `supabase/migrations/*` — no schema work
- Public predictions UI

## Tests

### `RecommendationFormRow.test.tsx` (new)
- Renders 3 market segments; clicking each fires `onChange` with new market and the right pick default
- `marketsTaken` containing `'ml'` → `ml` segment has `aria-disabled`
- 客 segment is on the left for `ml` / `spread`; 大 segment is on the left for `ou`
- Clicking 4th star sets stars=4
- Clicking the same star again does NOT toggle to 0 (min stars is 1)
- Audience pill click → fires `onChange({ audience: 'premium' })`
- Line input appears for `spread` and `ou`, hidden for `ml`

### `ConfirmDialog.test.tsx` (new)
- Closed → not in DOM
- Open → renders title + description + 2 buttons
- Click confirm → fires `onConfirm`; click cancel → fires `onCancel`; ESC → fires `onCancel`
- `destructive=true` → confirm button has destructive class
- Focus moves to cancel button on open (default focus on safe option)

### `BatchImportWizard.test.tsx` (new)
- Step 1 selection → click "下一步" → renders Step 2 with N cards
- Step 2 with all cards having 1 rec → Submit enabled
- Remove the only rec from one card → Submit disabled, that card shows warning
- Two recs with same market on one card → Submit disabled, that card shows duplicate warning
- Submit success → toast + navigates to `/admin`
- Submit fails on rec insert → games are deleted (verify via mock), error toast surfaces
- Step 2 → "← 回去改選擇" → returns to Step 1 with selection preserved
- Step 1 → deselect a game already filled in Step 2 → its rec data is dropped

### `EditGamePage.test.tsx` (extend)
- Hydration: query data → `EditState` has all existing recs marked `_state: 'existing'`
- Edit pick on an existing rec → `_state: 'edited'`, dirty=true
- Click delete on a rec → `_state: 'deleted'`, strike-through visible
- Click "↩ 取消刪除" → reverts to its previous `_state`
- Add a new rec → `_state: 'new'`
- Save with 0 active recs → button disabled, message visible
- Save with duplicate market → button disabled, message visible
- Save success → calls correct API methods in order; toast; queries invalidate
- Save fails on update step → error toast naming the step; user remains on page with dirty state intact
- Click "捨棄變更" → opens dialog → confirm → state resets, dialog closes
- Navigate away while dirty → opens dialog
- "刪除整場" stays instant (with the new `ConfirmDialog`, not `window.confirm`)

## Risk and rollback

- **Schema risk:** None.
- **RLS risk:** None — uses existing admin RLS from migration 014.
- **Race window during batch submit:** ~50–200 ms where games exist without
  recs. Acceptable for a single-admin app; public feed is unaffected.
- **Partial save failure on EditGamePage:** Acceptable; each API call is its
  own valid mutation, and the user sees the error + re-hydrates on reload.
- **Rollback:** Revert the PR. Admin loses the wizard, the form-mode edit,
  the layout B form, and the custom dialogs — but every old code path
  (manual single-game create, instant-action edit, native confirms) was kept
  intact in git history and would be restored.

## Open questions

None at spec time. The user explicitly confirmed the 10-point checkpoint
and the dialog requirement; the rest are routine implementation choices.
