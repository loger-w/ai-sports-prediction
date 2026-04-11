import { useTranslation } from '@/lib/i18n'
import type { AccuracyStat } from '@/services/predictions/api'

interface AccuracyBySportProps {
  bySport: Record<string, AccuracyStat>
}

const FONT = { fontFamily: 'var(--font-barlow-condensed)' }
const SPORTS = ['nba', 'mlb'] as const

// Defined outside component (rerender-no-inline-components)
function PctBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-1.5 bg-[#1e2733] rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  )
}

function SportRow({
  sportLabel,
  stat,
  winnerLabel,
  ouLabel,
}: {
  sportLabel: string
  stat: AccuracyStat | undefined
  winnerLabel: string
  ouLabel: string
}) {
  if (!stat || stat.total === 0) return null

  return (
    <div className="rounded-[10px] border border-[#1e2733] bg-[#161b22] px-5 py-4 space-y-4">
      <span
        className="text-[11px] font-black tracking-[0.2em] uppercase text-[#00e5a0]"
        style={FONT}
      >
        {sportLabel}
      </span>

      {/* Winner row */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold tracking-widest uppercase text-[#3a4a5a]" style={FONT}>
            {winnerLabel}
          </span>
          <span className="text-[20px] font-black text-[#00e5a0]" style={FONT}>
            {stat.winnerPct}%
          </span>
        </div>
        <PctBar pct={stat.winnerPct} color="#00e5a0" />
        <span className="text-[10px] text-[#3a4a5a]" style={FONT}>
          {stat.winnerCorrect}–{stat.total - stat.winnerCorrect}
        </span>
      </div>

      {/* O/U row */}
      {stat.ouTotal > 0 ? (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-widest uppercase text-[#3a4a5a]" style={FONT}>
              {ouLabel}
            </span>
            <span className="text-[20px] font-black text-[#fbbf24]" style={FONT}>
              {stat.ouPct}%
            </span>
          </div>
          <PctBar pct={stat.ouPct} color="#fbbf24" />
          <span className="text-[10px] text-[#3a4a5a]" style={FONT}>
            {stat.ouCorrect}–{stat.ouTotal - stat.ouCorrect}
          </span>
        </div>
      ) : null}
    </div>
  )
}

export function AccuracyBySport({ bySport }: AccuracyBySportProps) {
  const { t } = useTranslation()

  return (
    <div>
      <h2
        className="text-[9px] font-bold tracking-[0.2em] uppercase text-[#3a4a5a] mb-3"
        style={FONT}
      >
        {t.accuracy.bySport}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {SPORTS.map((sport) => (
          <SportRow
            key={sport}
            sportLabel={sport.toUpperCase()}
            stat={bySport[sport]}
            winnerLabel={t.accuracy.winner}
            ouLabel={t.accuracy.overUnder}
          />
        ))}
      </div>
    </div>
  )
}
