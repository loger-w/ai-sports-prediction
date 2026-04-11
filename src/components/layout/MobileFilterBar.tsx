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
type Direction = PredictionFilters['direction']
type ConfLevel = 'high' | 'medium' | 'low'

export function MobileFilterBar() {
  const { t } = useTranslation()
  const {
    sport,
    dateRange,
    confidence,
    direction,
    setSport,
    setDateRange,
    toggleConfidence,
    setDirection,
  } = usePredictionStore()

  const sports: { id: Sport; label: string }[] = [
    { id: 'all', label: t.filter.allSports },
    { id: 'nba', label: 'NBA' },
    { id: 'mlb', label: 'MLB' },
  ]

  const dateOptions: { id: string; label: string }[] = [
    { id: 'today', label: t.filter.today },
    { id: 'tomorrow', label: t.filter.tomorrow },
    { id: 'week', label: t.filter.thisWeek },
  ]

  const confOptions: { id: ConfLevel; label: string; color: string; activeBg: string }[] = [
    { id: 'high', label: t.filter.high, color: '#00e5a0', activeBg: 'rgba(0,229,160,0.15)' },
    { id: 'medium', label: t.filter.medium, color: '#fbbf24', activeBg: 'rgba(251,191,36,0.15)' },
    { id: 'low', label: t.filter.low, color: '#6b7280', activeBg: 'rgba(107,114,128,0.15)' },
  ]

  const dirOptions: { id: Direction; label: string }[] = [
    { id: 'all', label: t.filter.all },
    { id: 'home', label: t.filter.home },
    { id: 'away', label: t.filter.away },
  ]

  const PILL =
    'px-3 py-1.5 rounded-full text-[12px] font-bold tracking-wide transition-colors border shrink-0'

  const activeFiltersCount =
    (sport !== 'all' ? 1 : 0) +
    (confidence.length > 0 ? 1 : 0) +
    (direction !== 'all' ? 1 : 0)

  return (
    <div className="md:hidden border-b border-[#1e2733] bg-[#0d1117] px-3 py-2 space-y-2">
      {/* Sport pills */}
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

        {/* Date pills */}
        {dateOptions.map((d) => (
          <button
            key={d.id}
            onClick={() => setDateRange(d.id)}
            className={cn(
              PILL,
              dateRange === d.id
                ? 'bg-[rgba(0,229,160,0.12)] text-[#00e5a0] border-[rgba(0,229,160,0.3)]'
                : 'text-[#4a5568] border-[#1e2733] hover:text-[#a0aec0]',
            )}
            style={{ fontFamily: 'var(--font-barlow-condensed)' }}
          >
            {d.label}
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

            {/* Confidence */}
            <div className="mb-6">
              <div
                className="text-[9px] font-bold tracking-[0.2em] uppercase text-[#3a4a5a] mb-3"
                style={{ fontFamily: 'var(--font-barlow-condensed)' }}
              >
                {t.filter.confidence}
              </div>
              <div className="flex gap-2 flex-wrap">
                {confOptions.map((c) => {
                  const isActive = confidence.includes(c.id)
                  return (
                    <button
                      key={c.id}
                      onClick={() => toggleConfidence(c.id)}
                      className="px-4 py-2 rounded-full text-[12px] font-bold tracking-wide transition-all"
                      style={{
                        fontFamily: 'var(--font-barlow-condensed)',
                        color: c.color,
                        background: isActive ? c.activeBg : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${isActive ? c.color : 'rgba(255,255,255,0.08)'}`,
                      }}
                    >
                      {c.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Direction */}
            <div>
              <div
                className="text-[9px] font-bold tracking-[0.2em] uppercase text-[#3a4a5a] mb-3"
                style={{ fontFamily: 'var(--font-barlow-condensed)' }}
              >
                {t.filter.direction}
              </div>
              <div className="flex gap-2 flex-wrap">
                {dirOptions.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setDirection(d.id)}
                    className={cn(
                      'px-4 py-2 rounded-full text-[12px] font-bold tracking-wide transition-colors border',
                      direction === d.id
                        ? 'bg-[rgba(0,229,160,0.12)] text-[#00e5a0] border-[rgba(0,229,160,0.3)]'
                        : 'text-[#4a5568] border-[rgba(255,255,255,0.08)] hover:text-[#a0aec0]',
                    )}
                    style={{ fontFamily: 'var(--font-barlow-condensed)' }}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  )
}
