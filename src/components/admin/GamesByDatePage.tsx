import { Link, useNavigate } from '@tanstack/react-router'
import { useGamesForDate } from '@/hooks/admin/useGamesForDate'
import { AdminDateScrollBar } from './AdminDateScrollBar'

const FONT = { fontFamily: 'var(--font-barlow-condensed)' as const }

interface Props {
  date: string
}

export function GamesByDatePage({ date }: Props) {
  const navigate = useNavigate()
  const { data = [], isLoading, error } = useGamesForDate(date)

  function handleDateChange(d: string) {
    void navigate({ to: '/admin/games/by-date', search: { date: d } })
  }

  const totalGames = data.length
  const withRecsCount = data.filter((g) => g.recommendations.length > 0).length
  const noRecsCount = totalGames - withRecsCount

  return (
    <div className="py-8 px-4" style={FONT}>
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-[#e2e8f0]">Admin · 按日期管理</h1>
          {totalGames > 0 ? (
            <p className="text-sm text-[#94a3b8] mt-1">
              {date} · 共 {totalGames} 場 · {withRecsCount} 場有推薦 · {noRecsCount} 場待設定
            </p>
          ) : null}
        </div>
        <Link
          to="/admin/games/new"
          className="px-4 py-2 rounded text-sm font-bold bg-[rgba(0,229,160,0.15)] text-[#00e5a0] border border-[rgba(0,229,160,0.40)] hover:bg-[rgba(0,229,160,0.25)]"
        >
          + 新增比賽
        </Link>
      </header>

      <AdminDateScrollBar value={date} onChange={handleDateChange} />

      <div className="mt-6">
        {isLoading ? (
          <p className="text-[#94a3b8]">載入中…</p>
        ) : error ? (
          <p className="text-[#fc8181]">載入失敗:{error.message}</p>
        ) : data.length === 0 ? (
          <div className="text-center py-12 text-[#94a3b8]">
            該天無比賽。
            <Link to="/admin/games/new" className="text-[#00e5a0] hover:underline ml-2">
              → 批次匯入
            </Link>
          </div>
        ) : (
          <div className="rounded-[10px] border border-[#1e2733] overflow-hidden">
            <table className="w-full">
              <thead className="bg-[#0d1117] border-b border-[#1e2733]">
                <tr className="text-left text-xs text-[#94a3b8] uppercase tracking-wider">
                  <th className="px-4 py-3">時間</th>
                  <th className="px-4 py-3">客 @ 主</th>
                  <th className="px-4 py-3">狀態</th>
                  <th className="px-4 py-3">推薦</th>
                  <th className="px-4 py-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="bg-[#161b22]">
                {data.map((g) => {
                  const recCount = g.recommendations.length
                  const cron = g.recommendations.filter((r) => r.source === 'cron').length
                  const manual = g.recommendations.filter((r) => r.source === 'manual').length
                  const allCnt = g.recommendations.filter((r) => r.audience === 'all').length
                  const premCnt = g.recommendations.filter((r) => r.audience === 'premium').length
                  return (
                    <tr
                      key={g.id}
                      className="border-b border-[#1e2733] last:border-0 text-[#e2e8f0]"
                    >
                      <td className="px-4 py-3 text-sm text-[#94a3b8]">
                        {g.game_time.slice(11, 16)}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold">
                        {g.away_team.abbreviation} @ {g.home_team.abbreviation}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#94a3b8]">{g.status}</td>
                      <td className="px-4 py-3 text-sm">
                        {recCount === 0 ? (
                          <span className="text-[#6b7280]">—</span>
                        ) : (
                          <>
                            <span className="text-[#00e5a0]">{cron}</span>
                            <span className="text-[#6b7280]"> / </span>
                            <span className="text-[#fbbf24]">{manual}</span>
                            <span className="text-xs text-[#6b7280] ml-1">
                              ({allCnt} 公開 · {premCnt} Premium)
                            </span>
                          </>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        {recCount === 0 ? (
                          <Link
                            to="/admin/games/$gameId"
                            params={{ gameId: g.id }}
                            className="text-[#fbbf24] hover:underline font-bold"
                          >
                            + 新增推薦
                          </Link>
                        ) : (
                          <Link
                            to="/admin/games/$gameId"
                            params={{ gameId: g.id }}
                            className="text-[#00e5a0] hover:underline font-bold"
                          >
                            編輯 →
                          </Link>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
