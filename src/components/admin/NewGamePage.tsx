import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GameForm, type GameFormValue } from './GameForm'
import { RecommendationFormRow, type RecFormValue } from './RecommendationFormRow'
import { BatchImportWizard } from './BatchImportWizard'
import { useTeams } from '@/hooks/useTeams'
import { adminGamesApi, adminRecommendationsApi } from '@/services/admin/adminApi'
import { localToday } from '@/lib/timezone'

const FONT = { fontFamily: 'var(--font-barlow-condensed)' as const }

const EMPTY_REC: RecFormValue = {
  market: 'ml',
  pick: 'home',
  line: null,
  stars: 3,
  audience: 'all',
}

interface RecRow {
  key: string
  value: RecFormValue
}

type Mode = 'import' | 'manual'

export function NewGamePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const teamsQuery = useTeams('mlb')

  const [mode, setMode] = useState<Mode>('import')

  const today = localToday()
  const [game, setGame] = useState<GameFormValue>({
    sport_id: 'mlb',
    home_team_id: '',
    away_team_id: '',
    game_date: today,
    game_time: `${today} 19:00:00`,
    status: 'scheduled',
  })
  const [recs, setRecs] = useState<RecRow[]>([])
  const [submitting, setSubmitting] = useState(false)

  // Initialize team ids once teams load
  if (game.home_team_id === '' && teamsQuery.data && teamsQuery.data.length >= 2) {
    setGame((g) => ({
      ...g,
      home_team_id: teamsQuery.data![0].id,
      away_team_id: teamsQuery.data![1].id,
    }))
  }

  async function handleSubmit() {
    setSubmitting(true)
    const { id, error } = await adminGamesApi.createGame(game)
    if (error || !id) {
      toast.error(error?.message ?? '建立比賽失敗')
      setSubmitting(false)
      return
    }
    if (recs.length > 0) {
      const { error: recErr } = await adminRecommendationsApi.createRecommendations(
        recs.map((r) => ({ ...r.value, game_id: id })),
      )
      if (recErr) {
        toast.error(`比賽已建立，但推薦插入失敗：${recErr.message}`)
        setSubmitting(false)
        return
      }
    }
    toast.success('比賽 + 推薦已建立')
    void queryClient.invalidateQueries({ queryKey: ['admin', 'games'] })
    void queryClient.invalidateQueries({ queryKey: ['recommendations'] })
    navigate({ to: '/admin' })
  }

  function updateRec(idx: number, value: RecFormValue) {
    setRecs((rs) => rs.map((r, i) => (i === idx ? { ...r, value } : r)))
  }
  function removeRec(idx: number) {
    setRecs((rs) => rs.filter((_, i) => i !== idx))
  }
  function addRec() {
    setRecs((rs) => {
      const taken = new Set(rs.map((r) => r.value.market))
      const m = (['ml', 'spread', 'ou'] as const).find((x) => !taken.has(x)) ?? 'ml'
      const value: RecFormValue = {
        ...EMPTY_REC,
        market: m,
        pick: m === 'ou' ? 'over' : 'home',
        line: m === 'ml' ? null : 0,
      }
      return [...rs, { key: crypto.randomUUID(), value }]
    })
  }

  return (
    <div className="py-8 px-4 space-y-6" style={FONT}>
      <Link
        to="/admin"
        className="inline-flex items-center gap-1 text-sm text-[#00e5a0] hover:underline"
      >
        ← 返回比賽管理
      </Link>
      <header>
        <h1 className="text-2xl font-black text-[#e2e8f0] mb-2">新增比賽</h1>
        <p className="text-sm text-[#94a3b8]">
          從 MLB 賽程批次匯入，或手動建立特殊場次（雙重賽、補賽等）
        </p>
      </header>

      <div className="flex gap-2 border-b border-[#1e2733]">
        <button
          type="button"
          onClick={() => setMode('import')}
          className={
            mode === 'import'
              ? 'px-4 py-2 text-sm font-bold text-[#00e5a0] border-b-2 border-[#00e5a0]'
              : 'px-4 py-2 text-sm font-bold text-[#94a3b8] hover:text-[#e2e8f0]'
          }
        >
          MLB 賽程匯入
        </button>
        <button
          type="button"
          onClick={() => setMode('manual')}
          className={
            mode === 'manual'
              ? 'px-4 py-2 text-sm font-bold text-[#00e5a0] border-b-2 border-[#00e5a0]'
              : 'px-4 py-2 text-sm font-bold text-[#94a3b8] hover:text-[#e2e8f0]'
          }
        >
          手動建立
        </button>
      </div>

      {mode === 'import' ? (
        <section className="rounded-[10px] border border-[#1e2733] bg-[#161b22] p-6">
          <BatchImportWizard />
        </section>
      ) : (
        <>
          <section className="rounded-[10px] border border-[#1e2733] bg-[#161b22] p-6">
            <h2 className="text-base font-bold text-[#e2e8f0] mb-4">比賽資訊</h2>
            {teamsQuery.isLoading ? (
              <p className="text-[#94a3b8]">載入隊伍…</p>
            ) : (
              <GameForm value={game} onChange={setGame} teams={teamsQuery.data ?? []} />
            )}
          </section>

          <section className="rounded-[10px] border border-[#1e2733] bg-[#161b22] p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#e2e8f0]">推薦</h2>
              <button
                type="button"
                onClick={addRec}
                disabled={recs.length >= 3}
                className="px-3 py-1.5 rounded text-xs font-bold bg-[rgba(0,229,160,0.10)] text-[#00e5a0] border border-[rgba(0,229,160,0.30)] hover:bg-[rgba(0,229,160,0.20)] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                + 新增推薦
              </button>
            </div>
            <div className="space-y-3">
              {recs.map((r, i) => (
                <RecommendationFormRow
                  key={r.key}
                  value={r.value}
                  onChange={(next) => updateRec(i, next)}
                  onRemove={() => removeRec(i)}
                  marketsTaken={recs.filter((_, j) => j !== i).map((rr) => rr.value.market)}
                />
              ))}
              {recs.length === 0 ? (
                <p className="text-sm text-[#fc8181]">⚠ 請至少加 1 條推薦,才能建立比賽。</p>
              ) : null}
            </div>
          </section>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => navigate({ to: '/admin' })}
              className="px-4 py-2 rounded text-sm font-bold bg-transparent text-[#94a3b8] border border-[#1e2733] hover:bg-[#161b22]"
            >
              取消
            </button>
            <button
              type="button"
              disabled={submitting || recs.length === 0}
              onClick={handleSubmit}
              className="px-6 py-2 rounded text-sm font-bold bg-[#00e5a0] text-[#0a0a0f] hover:bg-[#00c98a] disabled:opacity-60"
            >
              {submitting ? '儲存中…' : recs.length === 0 ? '請先加推薦' : '儲存'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
