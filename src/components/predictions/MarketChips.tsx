import { cn } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import { usePredictionStore } from '@/stores/predictions/predictionStore'
import type { Market } from '@/types/predictions/recommendation'

const FONT = { fontFamily: 'var(--font-barlow-condensed)' as const }
const ORDER: Market[] = ['ml', 'spread', 'ou']

export function MarketChips() {
  const { t } = useTranslation()
  const markets = usePredictionStore((s) => s.markets)
  const toggleMarket = usePredictionStore((s) => s.toggleMarket)

  return (
    <div className="flex flex-wrap gap-1.5 px-2">
      {ORDER.map((m) => {
        const active = markets.has(m)
        return (
          <button
            key={m}
            type="button"
            onClick={() => toggleMarket(m)}
            data-active={active}
            className={cn(
              'px-2.5 py-1 rounded-full text-[12px] font-bold tracking-wide border transition-colors',
              active
                ? 'bg-[rgba(0,229,160,0.15)] text-[#00e5a0] border-[rgba(0,229,160,0.3)]'
                : 'text-[#94a3b8] border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] hover:text-[#e2e8f0]',
            )}
            style={FONT}
          >
            {t.market[m]}
          </button>
        )
      })}
    </div>
  )
}
