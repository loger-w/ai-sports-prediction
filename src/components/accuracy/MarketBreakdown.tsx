import { useTranslation } from '@/lib/i18n'
import type { AccuracyBucket } from '@/services/predictions/api'
import type { Market } from '@/types/predictions/recommendation'

const FONT = { fontFamily: 'var(--font-barlow-condensed)' as const }
const ORDER: Market[] = ['ml', 'spread', 'ou']

interface Props {
  byMarket: Record<Market, AccuracyBucket>
}

function PctBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-1.5 bg-[#1e2733] rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-700"
           style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

export function MarketBreakdown({ byMarket }: Props) {
  const { t } = useTranslation()
  return (
    <div>
      <h2 className="text-[9px] font-bold tracking-[0.2em] uppercase text-[#3a4a5a] mb-3" style={FONT}>
        {t.accuracy.byMarket}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {ORDER.map((m) => {
          const b = byMarket[m]
          const decided = b.wins + b.losses
          return (
            <div key={m} className="rounded-[10px] border border-[#1e2733] bg-[#161b22] px-5 py-4 space-y-3">
              <span className="text-[11px] font-black tracking-[0.2em] uppercase text-[#00e5a0]" style={FONT}>
                {t.market[m]}
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-[28px] font-black text-[#00e5a0]" style={FONT}>
                  {decided > 0 ? `${b.pct}%` : '—'}
                </span>
                <span className="text-[10px] text-[#3a4a5a]" style={FONT}>
                  {b.wins}-{b.losses}
                  {b.pushes > 0 ? ` · ${b.pushes}和` : ''}
                </span>
              </div>
              <PctBar pct={b.pct} color="#00e5a0" />
            </div>
          )
        })}
      </div>
    </div>
  )
}
