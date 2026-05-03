import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GameForm, type GameFormValue } from './GameForm'
import { RecommendationFormRow, type RecFormValue } from './RecommendationFormRow'
import { useTeams } from '@/hooks/useTeams'
import { adminGamesApi, adminRecommendationsApi } from '@/services/admin/adminApi'
import { localToday } from '@/lib/timezone'

const FONT = { fontFamily: 'var(--font-barlow-condensed)' as const }

const EMPTY_REC: RecFormValue = { market: 'ml', pick: 'home', line: null, stars: 3 }

export function NewGamePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const teamsQuery = useTeams('mlb')

  const today = localToday()
  const [game, setGame] = useState<GameFormValue>({
    sport_id: 'mlb',
    home_team_id: '',
    away_team_id: '',
    game_date: today,
    game_time: `${today} 19:00:00`,
    status: 'scheduled',
  })
  const [recs, setRecs] = useState<RecFormValue[]>([EMPTY_REC])
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
        recs.map((r) => ({ ...r, game_id: id })),
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

  function updateRec(idx: number, next: RecFormValue) {
    setRecs((rs) => rs.map((r, i) => (i === idx ? next : r)))
  }
  function removeRec(idx: number) {
    setRecs((rs) => rs.filter((_, i) => i !== idx))
  }
  function addRec() {
    setRecs((rs) => [...rs, EMPTY_REC])
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
        <p className="text-sm text-[#94a3b8]">建立一場手動比賽 + 推薦（source=manual，cron 不會洗掉）</p>
      </header>

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
            className="px-3 py-1.5 rounded text-xs font-bold bg-[rgba(0,229,160,0.10)] text-[#00e5a0] border border-[rgba(0,229,160,0.30)] hover:bg-[rgba(0,229,160,0.20)]"
          >
            + 新增推薦
          </button>
        </div>
        <div className="space-y-3">
          {recs.map((r, i) => (
            <RecommendationFormRow
              key={i}
              value={r}
              onChange={(next) => updateRec(i, next)}
              onRemove={() => removeRec(i)}
            />
          ))}
          {recs.length === 0 ? (
            <p className="text-sm text-[#94a3b8]">尚未新增推薦。</p>
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
          disabled={submitting}
          onClick={handleSubmit}
          className="px-6 py-2 rounded text-sm font-bold bg-[#00e5a0] text-[#0a0a0f] hover:bg-[#00c98a] disabled:opacity-60"
        >
          {submitting ? '儲存中…' : '儲存'}
        </button>
      </div>
    </div>
  )
}
