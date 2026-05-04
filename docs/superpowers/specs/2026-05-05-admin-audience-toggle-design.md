# Admin Audience Toggle — Edit Existing Recommendation Visibility

**Date:** 2026-05-05
**Status:** Draft (pending user review)
**Scope:** Admin UI — frontend only. No schema, no migration, no RLS change.

---

## Background

Migration `016_recommendation_audience` (already on production) introduced
per-recommendation tier control:

- `recommendations.audience` is `'all' | 'premium'`.
- View `recommendations_public` masks `pick / line / stars / result / vote
  counts` for callers whose JWT `app_metadata.role` is not in
  `('premium','admin')`.
- Base-table public-read RLS was dropped so direct reads cannot bypass the
  mask. Admin RLS (migration 014) retained for writes.
- `RecommendationCard` renders a 🔒 Premium 專屬 placeholder with `/upgrade`
  CTA when masked.

The `audience` value can be set when **creating** a recommendation
(`NewGamePage`, `EditGamePage` "新增推薦" section) via the existing
`RecommendationFormRow` dropdown. The admin write API
`adminRecommendationsApi.updateRecommendation` already accepts an `audience`
patch — but **no UI exposes that path for existing recommendations**, so an
admin cannot change a recommendation's audience after it has been created.

## Goal

Let an admin change `audience` on existing recommendations from `EditGamePage`,
and surface the audience distribution per game on the admin list view.

## Non-goals

- Game-level audience (`games.audience`). Out of scope — the user confirmed
  the per-recommendation model is correct.
- Schema, migration, or RLS changes. Existing 014 + 016 cover everything.
- Changing the audience selector in `RecommendationFormRow` (used for
  creating new recs); it stays as a dropdown for visual consistency with
  sibling form selects.
- Predictions (public) page — no changes; it already reads through
  `recommendations_public` and renders 🔒 placeholders correctly.

## Existing-mechanism verification (confirms request "確認比賽是否真的有套用")

| Mechanism | Location | Status |
|---|---|---|
| anon viewer → masked | `recommendations_public` view, `auth.jwt()` is null | ✅ |
| regular role → masked | role not in `('premium','admin')` | ✅ |
| premium / admin → unmasked | role in `('premium','admin')` | ✅ |
| Base table cannot be read directly | Migration 016 dropped public-read RLS | ✅ |
| Frontend uses the masking view | 4 call sites in `services/predictions/api.ts` | ✅ |
| Stars filter keeps locked rows | `or(stars.gte.X,audience.eq.premium)` (`api.ts:53`) | ✅ |
| Lock placeholder UI | `RecommendationCard.tsx:127-150` | ✅ |
| Admin write allowed for `audience` | RLS policy `recommendations_admin_all` (014) | ✅ |
| Admin can set audience on **new** rec | `RecommendationFormRow` + `adminRecommendationsApi.createRecommendations` | ✅ |
| Admin can set audience on **existing** rec | — | ❌ Missing — this spec |

## UI design

### `AudienceToggle` component

Two-segment pill control (radiogroup). Both options always visible; the
active one is filled.

```
公開 active:        ┃ 公開 │ Premium ┃   ← 公開 segment filled mint #00e5a0
Premium active:     ┃ 公開 │ Premium ┃   ← Premium segment filled amber #fbbf24
disabled / loading: same as above with opacity 0.5, pointer-events:none
```

**File:** `src/components/admin/AudienceToggle.tsx`

**Props:**
```ts
interface Props {
  value: Audience              // 'all' | 'premium'
  onChange: (next: Audience) => void
  disabled?: boolean
  label?: string               // aria-label, defaults to '受眾'
}
```

**Visual tokens (reuse existing dashboard palette):**
- Container: `bg-[#0d1117] border border-[#1e2733] rounded`
- Active 公開 segment: `bg-[#00e5a0] text-[#0a0a0f] font-bold`
- Active Premium segment: `bg-[#fbbf24] text-[#0a0a0f] font-bold`
- Inactive segment: `text-[#94a3b8]`, hover `text-[#e2e8f0]`
- Focus ring: `focus-visible:ring-2 ring-[#00e5a0]`
- Font: `var(--font-barlow-condensed)` (matches sibling admin UI)

**Accessibility:**
- `role="radiogroup"`, `aria-label={label}`
- Each segment: `role="radio"`, `aria-checked`, `tabIndex` (`0` for active, `-1` for inactive — roving)
- ←/→ key shifts focus and triggers `onChange` (radio convention)
- Enter / Space triggers `onChange` on focused segment
- Min height 32px (admin desktop, ≥32 acceptable; 44 not required)

### `EditGamePage` — replace static badge

`src/components/admin/EditGamePage.tsx`, lines 200–237.

Replace the `[PREMIUM]` static span (lines 216–220) with:

```tsx
<AudienceToggle
  value={r.audience}
  onChange={(next) => setAudience(r.market, next)}
  disabled={pendingMarket === r.market}
/>
```

Add handler:

```ts
const [pendingMarket, setPendingMarket] = useState<Market | null>(null)

async function setAudience(market: Market, next: Audience) {
  const prev = existingRecs.find((r) => r.market === market)?.audience
  if (!prev || prev === next) return

  // Optimistic cache update
  queryClient.setQueryData<ExistingGame>(
    ['admin', 'game', gameId],
    (old) => old ? {
      ...old,
      recommendations: old.recommendations.map((r) =>
        r.market === market ? { ...r, audience: next } : r
      ),
    } : old
  )

  setPendingMarket(market)
  const { error } = await adminRecommendationsApi.updateRecommendation(
    gameId, market, { audience: next }
  )
  setPendingMarket(null)

  if (error) {
    // Rollback
    queryClient.setQueryData<ExistingGame>(
      ['admin', 'game', gameId],
      (old) => old ? {
        ...old,
        recommendations: old.recommendations.map((r) =>
          r.market === market ? { ...r, audience: prev } : r
        ),
      } : old
    )
    toast.error(`切換受眾失敗：${error.message}`)
    return
  }

  toast.success(
    next === 'premium' ? '已切換為 Premium 限定' : '已切換為公開',
    {
      action: {
        label: '復原',
        onClick: () => setAudience(market, prev),
      },
      duration: 5000,
    }
  )

  void queryClient.invalidateQueries({ queryKey: ['admin', 'games', 'recent'] })
  void queryClient.invalidateQueries({ queryKey: ['recommendations'] })
}
```

### `AdminDashboard` — add 受眾 column

`src/components/admin/AdminDashboard.tsx`.

**Query change** — add `audience` to the recommendations select:
```diff
- recommendations(market, source)
+ recommendations(market, source, audience)
```

**Type change:**
```diff
- recommendations: { market: string; source: 'cron' | 'manual' }[]
+ recommendations: { market: string; source: 'cron' | 'manual'; audience: 'all' | 'premium' }[]
```

**New column** between `推薦` and `操作`:

| 時間 | 客 @ 主 | 狀態 | 推薦 | **受眾** | 操作 |
|---|---|---|---|---|---|

Cell rendering:
```tsx
const allCnt = g.recommendations.filter((r) => r.audience === 'all').length
const premCnt = g.recommendations.filter((r) => r.audience === 'premium').length

<td className="px-4 py-3 text-sm">
  <span className="text-[#00e5a0]">{allCnt} 公開</span>
  <span className="text-[#6b7280]"> · </span>
  <span className="text-[#fbbf24]">{premCnt} Premium</span>
</td>
```

Read-only — no inline editing (avoid clutter and accidental toggles in a
50-row list per UX discussion).

## Data flow

```
Admin clicks segment
  ├─ AudienceToggle onChange → EditGamePage.setAudience
  ├─ Step 1: Optimistic cache write (queryClient.setQueryData)
  ├─ Step 2: adminRecommendationsApi.updateRecommendation → Supabase RLS-checked UPDATE
  ├─ Step 3a: Success → toast (with [復原] action) +
  │           invalidate ['admin','games','recent'] (so AdminDashboard counts update)
  │           invalidate ['recommendations']         (so any open public list updates)
  └─ Step 3b: Failure → revert cache → error toast
```

The undo path re-enters `setAudience(market, prev)` and follows the same
pipeline, so it benefits from the same rollback safety.

## Tests

### `src/test/unit/AudienceToggle.test.tsx` (new)
- Renders both segments with correct active state for `value='all'`
- Renders both segments with correct active state for `value='premium'`
- Click on inactive segment → calls `onChange` with that value
- Click on active segment → does NOT call `onChange`
- `disabled` → segments are non-interactive (clicks ignored)
- Keyboard: → on `公開` active → focus moves to Premium and `onChange('premium')` fires
- Keyboard: ← on `Premium` active → focus moves to 公開 and `onChange('all')` fires
- `role="radiogroup"` + `role="radio"` + `aria-checked` present

### `src/test/integration/EditGamePage.test.tsx` (new)
- Renders existing rec with the toggle reflecting `audience`
- Click Premium segment → optimistic update visible immediately
- Mocked API success → success toast renders with `復原` action
- Click `復原` → calls `updateRecommendation` with the original audience
- Mocked API failure → cache reverts to original audience + error toast
- Toggle is disabled while a pending update is in flight (prevent double-submit on the same row)

### `src/test/integration/AdminDashboard.test.tsx` (new)
- Renders 受眾 column header
- Counts `audience='all'` and `audience='premium'` correctly per row
- Empty recommendations → renders `0 公開 · 0 Premium`

## Files touched

**New:**
- `src/components/admin/AudienceToggle.tsx`
- `src/test/unit/AudienceToggle.test.tsx`
- `src/test/integration/EditGamePage.test.tsx`
- `src/test/integration/AdminDashboard.test.tsx`

**Modified:**
- `src/components/admin/EditGamePage.tsx` — replace static badge with toggle, add handler, add `pendingMarket` state
- `src/components/admin/AdminDashboard.tsx` — extend query + type, add new column

**Untouched (verified working — no change needed):**
- `supabase/migrations/016_recommendation_audience.sql`
- `supabase/migrations/014_admin_rls.sql`
- `src/services/admin/recommendations.ts` (already supports `audience` patch)
- `src/services/predictions/api.ts` (already reads through `recommendations_public`)
- `src/components/predictions/RecommendationCard.tsx` (already renders 🔒 placeholder)
- `src/components/admin/RecommendationFormRow.tsx` (audience dropdown stays for new-rec context)
- `src/components/admin/NewGamePage.tsx`

## Risk and rollback

- **Schema risk:** None. No DB writes in this change.
- **RLS risk:** None. Migration 014 already grants admin write on `audience`;
  this PR only exercises an existing path.
- **Optimistic-update risk:** If RLS rejects the write (e.g. user lost admin
  role), the rollback path reverts the cache before user notices.
- **Rollback:** Revert the PR — admin loses the in-place audience editing
  and dashboard column, but creating new recs with audience still works.

## Open questions

None at spec time.
