import type { GameStatus, TeamRow } from '@/types/predictions/recommendation'

const FONT = { fontFamily: 'var(--font-barlow-condensed)' as const }

const FIELD =
  'w-full px-3 py-2 rounded bg-[#0d1117] border border-[#1e2733] text-[#e2e8f0] focus:outline-none focus:border-[#00e5a0]'
const LABEL = 'block text-sm text-[#94a3b8] font-bold tracking-wide mb-1'

export interface GameFormValue {
  sport_id: string
  home_team_id: string
  away_team_id: string
  game_date: string
  game_time: string                 // YYYY-MM-DD HH:mm:ss
  status: GameStatus
}

interface Props {
  value: GameFormValue
  onChange: (next: GameFormValue) => void
  teams: TeamRow[]
}

function timePart(gt: string): string {
  return gt.length >= 16 ? gt.slice(11, 16) : ''
}

export function GameForm({ value, onChange, teams }: Props) {
  function patch(p: Partial<GameFormValue>) {
    onChange({ ...value, ...p })
  }

  function handleDate(date: string) {
    const time = timePart(value.game_time) || '00:00'
    patch({ game_date: date, game_time: `${date} ${time}:00` })
  }

  function handleTime(t: string) {
    patch({ game_time: `${value.game_date} ${t}:00` })
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={FONT}>
      <div>
        <label className={LABEL} htmlFor="game-home">主隊</label>
        <select
          id="game-home"
          aria-label="主隊"
          className={FIELD}
          value={value.home_team_id}
          onChange={(e) => patch({ home_team_id: e.target.value })}
        >
          {teams.map((t) => (
            <option key={t.id} value={t.id}>{t.name_zh} ({t.abbreviation})</option>
          ))}
        </select>
      </div>
      <div>
        <label className={LABEL} htmlFor="game-away">客隊</label>
        <select
          id="game-away"
          aria-label="客隊"
          className={FIELD}
          value={value.away_team_id}
          onChange={(e) => patch({ away_team_id: e.target.value })}
        >
          {teams.map((t) => (
            <option key={t.id} value={t.id}>{t.name_zh} ({t.abbreviation})</option>
          ))}
        </select>
      </div>
      <div>
        <label className={LABEL} htmlFor="game-date">日期</label>
        <input
          id="game-date"
          aria-label="日期"
          type="date"
          className={FIELD}
          value={value.game_date}
          onChange={(e) => handleDate(e.target.value)}
        />
      </div>
      <div>
        <label className={LABEL} htmlFor="game-time">時間</label>
        <input
          id="game-time"
          aria-label="時間"
          type="time"
          className={FIELD}
          value={timePart(value.game_time)}
          onChange={(e) => handleTime(e.target.value)}
        />
      </div>
      <div className="md:col-span-2">
        <label className={LABEL} htmlFor="game-status">狀態</label>
        <select
          id="game-status"
          aria-label="狀態"
          className={FIELD}
          value={value.status}
          onChange={(e) => patch({ status: e.target.value as GameStatus })}
        >
          <option value="scheduled">scheduled</option>
          <option value="final">final</option>
          <option value="void">void</option>
        </select>
      </div>
    </div>
  )
}
