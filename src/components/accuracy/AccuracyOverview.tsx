import { useTranslation } from '@/lib/i18n'
import type { AccuracyStat } from '@/services/predictions/api'

interface AccuracyOverviewProps {
  overall: AccuracyStat
}

const FONT = { fontFamily: 'var(--font-barlow-condensed)' }

// Defined outside component (rerender-no-inline-components)
function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string
  value: string
  sub: string
  color: string
}) {
  return (
    <div className="rounded-[10px] border border-[#1e2733] bg-[#161b22] px-5 py-4 flex flex-col gap-1">
      <span
        className="text-[9px] font-bold tracking-[0.2em] uppercase text-[#3a4a5a]"
        style={FONT}
      >
        {label}
      </span>
      <span
        className="text-[42px] font-black leading-none"
        style={{ ...FONT, color }}
      >
        {value}
      </span>
      <span className="text-[11px] text-[#4a5568]" style={FONT}>
        {sub}
      </span>
    </div>
  )
}

export function AccuracyOverview({ overall }: AccuracyOverviewProps) {
  const { t } = useTranslation()

  const winRecord = `${overall.winnerCorrect}–${overall.total - overall.winnerCorrect}`
  const ouRecord =
    overall.ouTotal > 0
      ? `${overall.ouCorrect}–${overall.ouTotal - overall.ouCorrect}`
      : '—'

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <StatCard
        label={t.accuracy.totalGames}
        value={String(overall.total)}
        sub={t.accuracy.record + ' ' + winRecord}
        color="#a0aec0"
      />
      <StatCard
        label={t.accuracy.winnerAccuracy}
        value={`${overall.winnerPct}%`}
        sub={winRecord}
        color="#00e5a0"
      />
      <StatCard
        label={t.accuracy.ouAccuracy}
        value={overall.ouTotal > 0 ? `${overall.ouPct}%` : '—'}
        sub={ouRecord}
        color="#fbbf24"
      />
    </div>
  )
}
