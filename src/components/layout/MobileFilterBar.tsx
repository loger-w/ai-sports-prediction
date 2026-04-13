import { SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import {
  usePredictionStore,
  type PredictionFilters,
} from '@/stores/predictions/predictionStore'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

type Sport = PredictionFilters['sport']

export function MobileFilterBar() {
  const { t } = useTranslation()
  const { sport, minStars, setSport, setMinStars } = usePredictionStore()

  const sports: { id: Sport; label: string }[] = [
    { id: 'all', label: t.filter.allSports },
    { id: 'nba', label: t.filter.basketball },
    { id: 'mlb', label: t.filter.baseball },
  ]

  const PILL =
    'px-3 py-1.5 rounded-full text-[12px] font-bold tracking-wide transition-colors border shrink-0'

  const activeFiltersCount = (sport !== 'all' ? 1 : 0) + (minStars > 1 ? 1 : 0)

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
                : 'text-[#4a5568] border-[#1e2733] hover:text-[#a0aec0]',
            )}
            style={{ fontFamily: 'var(--font-barlow-condensed)' }}
          >
            {s.label}
          </button>
        ))}

        {/* Advanced filters trigger */}
        <Sheet>
          <SheetTrigger asChild>
            <button
              className={cn(
                PILL,
                'flex items-center gap-1.5',
                activeFiltersCount > 0
                  ? 'bg-[rgba(0,229,160,0.12)] text-[#00e5a0] border-[rgba(0,229,160,0.3)]'
                  : 'text-[#4a5568] border-[#1e2733] hover:text-[#a0aec0]',
              )}
              style={{ fontFamily: 'var(--font-barlow-condensed)' }}
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
                style={{ fontFamily: 'var(--font-barlow-condensed)', letterSpacing: '0.1em' }}
              >
                {t.filter.filterButton}
              </SheetTitle>
            </SheetHeader>

            {/* Min Stars */}
            <div>
              <div
                className="text-[9px] font-bold tracking-[0.2em] uppercase text-[#3a4a5a] mb-3"
                style={{ fontFamily: 'var(--font-barlow-condensed)' }}
              >
                {t.filter.minStars}
              </div>
              <div className="flex gap-2 flex-wrap">
                {[1, 2, 3, 4, 5].map((n) => {
                  const isActive = minStars === n
                  return (
                    <button
                      key={n}
                      onClick={() => setMinStars(n)}
                      className="px-4 py-2 rounded-full text-[12px] font-bold tracking-wide transition-all"
                      style={{
                        fontFamily: 'var(--font-barlow-condensed)',
                        color: isActive ? '#fbbf24' : '#4a5568',
                        background: isActive ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${isActive ? '#fbbf24' : 'rgba(255,255,255,0.08)'}`,
                      }}
                    >
                      {n === 1 ? 'All' : `${n}+ ★`}
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
