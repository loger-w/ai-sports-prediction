import { useEffect, useState } from 'react'
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
  key: string
  origMarket: Market | null
  result: RecResult | null
  state: RecState
  prevState?: RecState
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
      key: crypto.randomUUID(),
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

  function patchRec(key: string, value: RecFormValue) {
    setState((s) => {
      if (!s) return s
      const recs = s.recs.map((r) => {
        if (r.key !== key) return r
        const nextState: RecState =
          r.state === 'new' ? 'new' : r.state === 'deleted' ? r.state : 'edited'
        return { ...r, ...value, state: nextState }
      })
      return { ...s, recs }
    })
  }

  function setResult(key: string, result: RecResult | null) {
    setState((s) => {
      if (!s) return s
      const recs = s.recs.map((r) => {
        if (r.key !== key) return r
        const nextState: RecState =
          r.state === 'new' ? 'new' : r.state === 'deleted' ? r.state : 'edited'
        return { ...r, result, state: nextState }
      })
      return { ...s, recs }
    })
  }

  function softRemoveRec(key: string) {
    setState((s) => {
      if (!s) return s
      const recs = s.recs.flatMap((r) => {
        if (r.key !== key) return [r]
        if (r.state === 'new') return []
        return [{ ...r, prevState: r.state, state: 'deleted' as RecState }]
      })
      return { ...s, recs }
    })
  }

  function undoRemoveRec(key: string) {
    setState((s) => {
      if (!s) return s
      const recs = s.recs.map((r) => {
        if (r.key !== key) return r
        if (r.state !== 'deleted') return r
        return { ...r, state: r.prevState ?? 'existing', prevState: undefined }
      })
      return { ...s, recs }
    })
  }

  function addRec() {
    setState((s) => {
      if (!s) return s
      // Include ALL recs (even deleted) so new rec defaults to a truly fresh market
      const taken = new Set(s.recs.map((r) => r.market))
      const def = nextDefaultRec(taken)
      const newRow: EditRec = {
        ...def,
        key: crypto.randomUUID(),
        origMarket: null,
        result: null,
        state: 'new',
      }
      return { ...s, recs: [...s.recs, newRow] }
    })
  }

  async function save() {
    if (!state || hasNoActive || hasDuplicateMarket) return
    setSaving(true)
    try {
      if (state.gameDirty) {
        const { error } = await adminGamesApi.updateGame(gameId, state.game)
        if (error) throw new Error(`比賽資訊:${error.message}`)
      }
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
    if (!isDirty) return
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
            {state.recs.map((r) => {
              const isDeleted = r.state === 'deleted'
              const otherMarkets = state.recs
                .filter((rr) => rr.key !== r.key && rr.state !== 'deleted')
                .map((rr) => rr.market)
              return (
                <div
                  key={r.key}
                  className={isDeleted ? 'opacity-40 line-through pointer-events-none relative' : ''}
                >
                  {isDeleted ? (
                    <div className="absolute right-2 top-2 z-10 pointer-events-auto">
                      <button
                        type="button"
                        onClick={() => undoRemoveRec(r.key)}
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
                    onChange={(next) => patchRec(r.key, next)}
                    onRemove={() => softRemoveRec(r.key)}
                    marketsTaken={otherMarkets}
                  />
                  {r.state !== 'new' ? (
                    <div className="mt-2 pl-1 flex items-center gap-3">
                      <span className="text-xs text-[#94a3b8] font-bold tracking-wide uppercase">結果</span>
                      <ResultEntry
                        market={r.market}
                        value={r.result}
                        onChange={(next) => setResult(r.key, next)}
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
        destructive
        onConfirm={confirmDeleteGame}
        onCancel={() => setDeleteGameOpen(false)}
      />
    </div>
  )
}
