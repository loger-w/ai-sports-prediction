import { SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import type { PredictionFilters } from '@/stores/predictions/predictionStore'
import { usePredictionStore } from '@/stores/predictions/predictionStore'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet'
import { MarketChips } from '@/components/predictions/MarketChips'

const FONT = { fontFamily: 'var(--font-barlow-condensed)' as const }

const PILL =
  'px-3 py-1.5 rounded-full text-[12px] font-bold tracking-wide transition-colors border shrink-0'

type Sport = PredictionFilters['sport']

const STAR_LEVELS = [1, 2, 3, 4, 5] as const

export function MobileFilterBar() {
  const { t } = useTranslation()
  const { sport, minStars, markets, setSport, setMinStars } = usePredictionStore()

  const sports: { id: Sport; label: string }[] = [
    { id: 'all', label: t.filter.allSports },
    { id: 'mlb', label: t.filter.baseball },
  ]

  const activeFiltersCount =
    (sport !== 'all' ? 1 : 0) +
    (minStars > 1 ? 1 : 0) +
    (markets.size < 3 ? 1 : 0)

  return (
    <div className="md:hidden border-b border-[#1e2733] bg-[#0d1117] px-3 py-2 space-y-2">
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {sports.map((s) => (
          <button
            key={s.id}
            onClick={() => setSport(s.id)}
            className={cn(
              PILL,
              sport === s.id
                ? 'bg-[rgba(0,229,160,0.12)] text-[#00e5a0] border-[rgba(0,229,160,0.3)]'
                : 'text-[#94a3b8] border-[#1e2733] hover:text-[#e2e8f0]',
            )}
            style={FONT}
          >
            {s.label}
          </button>
        ))}

        <Sheet>
          <SheetTrigger asChild>
            <button
              className={cn(
                PILL,
                'flex items-center gap-1.5',
                activeFiltersCount > 0
                  ? 'bg-[rgba(0,229,160,0.12)] text-[#00e5a0] border-[rgba(0,229,160,0.3)]'
                  : 'text-[#94a3b8] border-[#1e2733] hover:text-[#e2e8f0]',
              )}
              style={FONT}
            >
              <SlidersHorizontal size={12} />
              {t.filter.filterButton}
              {activeFiltersCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-[#00e5a0] text-black text-[9px] font-black flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </SheetTrigger>
          <SheetContent
            side="bottom"
            className="bg-[#0f1419] border-[#1e2733] rounded-t-xl max-h-[70vh]"
          >
            <SheetHeader className="pb-4">
              <SheetTitle
                className="text-left text-[#a0aec0]"
                style={{ ...FONT, letterSpacing: '0.1em' }}
              >
                {t.filter.filterButton}
              </SheetTitle>
            </SheetHeader>

            {/* Markets */}
            <div className="mb-6">
              <div
                className="text-[14px] font-bold tracking-[0.2em] uppercase text-[#94a3b8] mb-3"
                style={FONT}
              >
                {t.filter.markets}
              </div>
              <MarketChips />
            </div>

            {/* Min Stars */}
            <div>
              <div
                className="text-[14px] font-bold tracking-[0.2em] uppercase text-[#94a3b8] mb-3"
                style={FONT}
              >
                {t.filter.minStars}
              </div>
              <div className="flex gap-2 flex-wrap">
                {STAR_LEVELS.map((n) => {
                  const isActive = minStars === n
                  const label = n === 1 ? t.filter.starsAll : n === 5 ? '5' : `${n}+`
                  return (
                    <button
                      key={n}
                      onClick={() => setMinStars(n)}
                      className="px-4 py-2 rounded-full text-[12px] font-bold tracking-wide transition-all"
                      style={{
                        ...FONT,
                        color: isActive ? '#fbbf24' : '#94a3b8',
                        background: isActive ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${isActive ? '#fbbf24' : 'rgba(255,255,255,0.08)'}`,
                      }}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  )
}
