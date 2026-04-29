import { useTranslation } from '@/lib/i18n'
import type { AccuracyBucket } from '@/services/predictions/api'

const FONT = { fontFamily: 'var(--font-barlow-condensed)' as const }
const STARS = [1, 2, 3, 4, 5] as const

interface Props {
  byStars: Record<number, AccuracyBucket>
}

export function StarBreakdown({ byStars }: Props) {
  const { t } = useTranslation()
  return (
    <div>
      <h2 className="text-[9px] font-bold tracking-[0.2em] uppercase text-[#3a4a5a] mb-3" style={FONT}>
        {t.accuracy.byStars}
      </h2>
      <div className="rounded-[10px] border border-[#1e2733] bg-[#161b22] divide-y divide-[#1e2733]">
        {STARS.map((s) => {
          const b = byStars[s]
          const decided = b.wins + b.losses
          return (
            <div key={s} className="flex items-center justify-between px-5 py-3">
              <span className="text-[14px] font-bold text-[#fbbf24]" style={FONT}>★{s}</span>
              <span className="text-[20px] font-black text-[#00e5a0]" style={FONT}>
                {decided > 0 ? `${b.pct}%` : '—'}
              </span>
              <span className="text-[10px] text-[#3a4a5a]" style={FONT}>
                {b.wins}-{b.losses}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
