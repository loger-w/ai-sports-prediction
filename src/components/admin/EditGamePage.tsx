import { useState, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GameForm, type GameFormValue } from './GameForm'
import { RecommendationFormRow, type RecFormValue } from './RecommendationFormRow'
import { ResultEntry } from './ResultEntry'
import { useTeams } from '@/hooks/useTeams'
import { adminGamesApi, adminRecommendationsApi } from '@/services/admin/adminApi'
import { supabase } from '@/lib/supabase'
import type {
  GameStatus,
  Market,
  Pick as RecPick,
  RecResult,
} from '@/types/predictions/recommendation'

const FONT = { fontFamily: 'var(--font-barlow-condensed)' as const }

interface ExistingRec {
  market: Market
  pick: RecPick
  line: number | null
  stars: number
  result: RecResult | null
  source: 'cron' | 'manual'
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
          recommendations(market, pick, line, stars, result, source)
        `)
        .eq('id', gameId)
        .single()
      if (error) throw error
      return data as unknown as ExistingGame
    },
  })

  const [game, setGame] = useState<GameFormValue | null>(null)
  const [newRecs, setNewRecs] = useState<RecFormValue[]>([])
  const [savingGame, setSavingGame] = useState(false)

  useEffect(() => {
    if (!gameQuery.data) return
    const g = gameQuery.data
    setGame({
      sport_id: g.sport_id,
      home_team_id: g.home_team_id,
      away_team_id: g.away_team_id,
      game_date: g.game_date,
      game_time: g.game_time,
      status: g.status,
    })
  }, [gameQuery.data])

  if (gameQuery.isLoading || !game) {
    return <p className="text-[#94a3b8] py-8" style={FONT}>載入中…</p>
  }
  if (gameQuery.error) {
    return (
      <p className="text-[#fc8181] py-8" style={FONT}>
        載入失敗：{(gameQuery.error as Error).message}
      </p>
    )
  }

  const existingRecs = gameQuery.data?.recommendations ?? []

  async function saveGame() {
    if (!game) return
    setSavingGame(true)
    const { error } = await adminGamesApi.updateGame(gameId, game)
    setSavingGame(false)
    if (error) {
      toast.error(`儲存失敗：${error.message}`)
      return
    }
    toast.success('比賽已更新')
    void queryClient.invalidateQueries({ queryKey: ['admin'] })
    void queryClient.invalidateQueries({ queryKey: ['recommendations'] })
  }

  async function deleteGame() {
    if (!confirm('確定要刪除這場比賽？相關推薦與投票也會一併移除。')) return
    const { error } = await adminGamesApi.deleteGame(gameId)
    if (error) {
      toast.error(`刪除失敗：${error.message}`)
      return
    }
    toast.success('比賽已刪除')
    void queryClient.invalidateQueries({ queryKey: ['admin'] })
    navigate({ to: '/admin' })
  }

  async function setResult(market: Market, result: RecResult | null) {
    const { error } = await adminRecommendationsApi.setRecommendationResult(
      gameId,
      market,
      result,
    )
    if (error) {
      toast.error(`寫入結果失敗：${error.message}`)
      return
    }
    toast.success('結果已更新')
    void queryClient.invalidateQueries({ queryKey: ['admin', 'game', gameId] })
    void queryClient.invalidateQueries({ queryKey: ['recommendations'] })
  }

  async function deleteExisting(market: Market) {
    if (!confirm(`刪除 ${market} 推薦？`)) return
    const { error } = await adminRecommendationsApi.deleteRecommendation(gameId, market)
    if (error) {
      toast.error(`刪除失敗：${error.message}`)
      return
    }
    toast.success('已刪除')
    void queryClient.invalidateQueries({ queryKey: ['admin', 'game', gameId] })
  }

  async function saveNewRecs() {
    if (newRecs.length === 0) return
    const { error } = await adminRecommendationsApi.createRecommendations(
      newRecs.map((r) => ({ ...r, game_id: gameId })),
    )
    if (error) {
      toast.error(`新增失敗：${error.message}`)
      return
    }
    setNewRecs([])
    toast.success('已新增')
    void queryClient.invalidateQueries({ queryKey: ['admin', 'game', gameId] })
  }

  return (
    <div className="py-8 px-4 space-y-6" style={FONT}>
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#e2e8f0]">編輯比賽</h1>
          <p className="text-sm text-[#94a3b8] mt-1">id: {gameId}</p>
        </div>
        <button
          type="button"
          onClick={deleteGame}
          className="px-4 py-2 rounded text-sm font-bold bg-[rgba(252,129,129,0.10)] text-[#fc8181] border border-[rgba(252,129,129,0.30)] hover:bg-[rgba(252,129,129,0.20)]"
        >
          刪除整場
        </button>
      </header>

      <section className="rounded-[10px] border border-[#1e2733] bg-[#161b22] p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-[#e2e8f0]">比賽資訊</h2>
          <button
            type="button"
            disabled={savingGame}
            onClick={saveGame}
            className="px-4 py-1.5 rounded text-xs font-bold bg-[#00e5a0] text-[#0a0a0f] hover:bg-[#00c98a] disabled:opacity-60"
          >
            {savingGame ? '儲存中…' : '儲存比賽'}
          </button>
        </div>
        {teamsQuery.isLoading ? (
          <p className="text-[#94a3b8]">載入隊伍…</p>
        ) : (
          <GameForm value={game} onChange={setGame} teams={teamsQuery.data ?? []} />
        )}
      </section>

      <section className="rounded-[10px] border border-[#1e2733] bg-[#161b22] p-6 space-y-3">
        <h2 className="text-base font-bold text-[#e2e8f0]">既有推薦</h2>
        {existingRecs.length === 0 ? (
          <p className="text-sm text-[#94a3b8]">沒有推薦。</p>
        ) : (
          <div className="space-y-3">
            {existingRecs.map((r) => (
              <div
                key={r.market}
                className="flex items-center justify-between gap-4 p-3 bg-[#0d1117] border border-[#1e2733] rounded"
              >
                <div className="text-sm flex-1">
                  <span className="text-[#e2e8f0] font-bold">{r.market}</span>{' '}
                  <span className="text-[#94a3b8]">
                    {r.pick} {r.line ?? ''} · {r.stars}★ · {r.source}
                  </span>
                </div>
                <ResultEntry
                  market={r.market}
                  value={r.result}
                  onChange={(next) => setResult(r.market, next)}
                />
                <button
                  type="button"
                  onClick={() => deleteExisting(r.market)}
                  className="px-3 py-1 rounded text-xs font-bold bg-[rgba(252,129,129,0.10)] text-[#fc8181] border border-[rgba(252,129,129,0.25)] hover:bg-[rgba(252,129,129,0.20)]"
                >
                  刪
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-[10px] border border-[#1e2733] bg-[#161b22] p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[#e2e8f0]">新增推薦</h2>
          <button
            type="button"
            onClick={() => setNewRecs((rs) => [...rs, { market: 'ml', pick: 'home', line: null, stars: 3 }])}
            className="px-3 py-1.5 rounded text-xs font-bold bg-[rgba(0,229,160,0.10)] text-[#00e5a0] border border-[rgba(0,229,160,0.30)] hover:bg-[rgba(0,229,160,0.20)]"
          >
            + 加一條
          </button>
        </div>
        {newRecs.length > 0 && (
          <>
            <div className="space-y-3">
              {newRecs.map((r, i) => (
                <RecommendationFormRow
                  key={i}
                  value={r}
                  onChange={(next) => setNewRecs((rs) => rs.map((x, j) => (j === i ? next : x)))}
                  onRemove={() => setNewRecs((rs) => rs.filter((_, j) => j !== i))}
                />
              ))}
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={saveNewRecs}
                className="px-4 py-1.5 rounded text-xs font-bold bg-[#00e5a0] text-[#0a0a0f] hover:bg-[#00c98a]"
              >
                儲存新推薦
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
