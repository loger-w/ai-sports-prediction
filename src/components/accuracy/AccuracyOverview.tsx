import { useTranslation } from '@/lib/i18n'
import type { AccuracyBucket } from '@/services/predictions/api'

const FONT = { fontFamily: 'var(--font-barlow-condensed)' as const }

interface Props {
  overall: AccuracyBucket
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="rounded-[10px] border border-[#1e2733] bg-[#161b22] px-5 py-4 flex flex-col gap-1">
      <span className="text-[14px] font-bold tracking-[0.2em] uppercase text-[#94a3b8]" style={FONT}>
        {label}
      </span>
      <span className="text-[42px] font-black leading-none" style={{ ...FONT, color }}>{value}</span>
      <span className="text-[15px] text-[#94a3b8]" style={FONT}>{sub}</span>
    </div>
  )
}

export function AccuracyOverview({ overall }: Props) {
  const { t } = useTranslation()
  const decided = overall.wins + overall.losses
  const record = `${overall.wins}-${overall.losses}`
  const pctText = decided > 0 ? `${overall.pct}%` : '—'

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <StatCard
        label={t.accuracy.totalRecs}
        value={String(overall.total)}
        sub={t.accuracy.record + ' ' + record}
        color="#a0aec0"
      />
      <StatCard
        label={t.accuracy.overall}
        value={pctText}
        sub={record}
        color="#00e5a0"
      />
      <StatCard
        label={t.accuracy.pushVoid}
        value={overall.pushes > 0 ? `${overall.pushes}` : '0'}
        sub={t.result.push + ' / ' + t.result.void + ': ' + overall.voids}
        color="#fbbf24"
      />
    </div>
  )
}
