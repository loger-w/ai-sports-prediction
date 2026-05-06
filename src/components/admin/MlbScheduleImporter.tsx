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
