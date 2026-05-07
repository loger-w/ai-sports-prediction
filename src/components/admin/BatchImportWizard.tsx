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

interface RecRow {
  key: string
  value: RecFormValue
}

interface SelectionEntry {
  game: ResolvedScheduleGame
  recs: RecRow[]
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
  const [entries, setEntries] = useState<Map<number, SelectionEntry>>(new Map())
  const [submitting, setSubmitting] = useState(false)
  const [savedSelection, setSavedSelection] = useState<Set<number>>(new Set())

  function handleSelectionConfirmed(games: ResolvedScheduleGame[]) {
    const selectedIds = new Set(games.map((g) => g.external_game_id))
    setSavedSelection(selectedIds)
    setEntries((prev) => {
      const next = new Map<number, SelectionEntry>()
      for (const g of games) {
        const existing = prev.get(g.external_game_id)
        next.set(g.external_game_id, existing ?? { game: g, recs: [] })
      }
      return next
    })
    setStep(2)
  }

  function patchRec(gid: number, idx: number, value: RecFormValue) {
    setEntries((prev) => {
      const e = prev.get(gid)
      if (!e) return prev
      const next = new Map(prev)
      next.set(gid, {
        ...e,
        recs: e.recs.map((r, i) => (i === idx ? { ...r, value } : r)),
      })
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
      const taken = new Set(e.recs.map((r) => r.value.market))
      const next = new Map(prev)
      next.set(gid, {
        ...e,
        recs: [...e.recs, { key: crypto.randomUUID(), value: nextDefaultRec(taken) }],
      })
      return next
    })
  }

  function cardHasDuplicateMarkets(entry: SelectionEntry): boolean {
    const seen = new Set<string>()
    for (const r of entry.recs) {
      if (seen.has(r.value.market)) return true
      seen.add(r.value.market)
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
      const msg =
        gErr?.message ??
        `預期建立 ${allEntries.length} 場,實際只回傳 ${ids.length} 個 ID`
      toast.error(`建立比賽失敗:${msg}`)
      return
    }

    const recs: CreateRecommendationInput[] = allEntries.flatMap((e, i) =>
      e.recs.map((r) => ({
        ...r.value,
        game_id: ids[i],
      })),
    )

    const { error: rErr } = await adminRecommendationsApi.createRecommendations(recs)
    if (rErr) {
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
    return (
      <MlbScheduleImporter
        onSelectionConfirmed={handleSelectionConfirmed}
        initialSelected={savedSelection}
      />
    )
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
        const taken = new Set(e.recs.map((r) => r.value.market))
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
              {e.recs.length > 0 && taken.size < 3 && (
                <button
                  type="button"
                  aria-label="再加一條推薦"
                  onClick={() => addRec(e.game.external_game_id)}
                  className="px-3 py-1.5 rounded text-xs font-bold bg-[rgba(0,229,160,0.10)] text-[#00e5a0] border border-[rgba(0,229,160,0.30)] hover:bg-[rgba(0,229,160,0.20)]"
                >
                  + 加推薦
                </button>
              )}
            </header>

            {e.recs.length === 0 ? (
              <div className="flex items-center gap-3">
                <p className="text-sm text-[#fc8181]">⚠ 請至少加 1 條推薦</p>
                <button
                  type="button"
                  onClick={() => addRec(e.game.external_game_id)}
                  className="px-3 py-1.5 rounded text-xs font-bold bg-[rgba(0,229,160,0.10)] text-[#00e5a0] border border-[rgba(0,229,160,0.30)] hover:bg-[rgba(0,229,160,0.20)]"
                >
                  + 加推薦
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {e.recs.map((r, i) => (
                  <RecommendationFormRow
                    key={r.key}
                    value={r.value}
                    onChange={(next) => patchRec(e.game.external_game_id, i, next)}
                    onRemove={() => removeRec(e.game.external_game_id, i)}
                    marketsTaken={e.recs.filter((_, j) => j !== i).map((rr) => rr.value.market)}
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
