import dayjs from 'dayjs'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import {
  usePredictionStore,
  type PredictionFilters,
} from '@/stores/predictions/predictionStore'
import { useSportCounts } from '@/hooks/predictions/useDailyPredictions'

const SECTION_TITLE =
  'text-[9px] font-bold tracking-[0.2em] uppercase text-[#3a4a5a] mb-2 px-2'

const SIDEBAR_ITEM =
  'flex items-center gap-2 w-full px-2 py-1.5 rounded text-[13px] font-semibold tracking-wide transition-colors cursor-pointer text-[#4a5568] hover:text-[#a0aec0]'

const SIDEBAR_ITEM_ACTIVE = 'bg-[rgba(0,229,160,0.1)] text-[#00e5a0]'

type Sport = PredictionFilters['sport']
type Direction = PredictionFilters['direction']
type ConfLevel = 'high' | 'medium' | 'low'

function CountBadge({ count }: { count: number }) {
  return (
    <span className="ml-auto text-[10px] bg-[#1e2733] text-[#2d3748] rounded px-1.5 py-0.5 font-bold">
      {count}
    </span>
  )
}

function SectionDivider() {
  return <div className="border-t border-[#1a2030] my-1" />
}

export function AppSidebar() {
  const { t } = useTranslation()
  const { sport, dateRange, confidence, direction, setSport, setDateRange, toggleConfidence, setDirection } =
    usePredictionStore()
  const { data: counts = {} } = useSportCounts()
  const totalCount = Object.values(counts).reduce((a, b) => a + b, 0)

  // Month navigation for date display
  const currentDate = dayjs()
  const displayMonth =
    dateRange === 'today' || dateRange === 'tomorrow' || dateRange === 'week'
      ? currentDate
      : dayjs(dateRange)

  const sports: { id: Sport; label: string; emoji: string }[] = [
    { id: 'all', label: t.filter.allSports, emoji: '🏆' },
    { id: 'nba', label: 'NBA', emoji: '🏀' },
    { id: 'mlb', label: 'MLB', emoji: '⚾' },
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

  return (
    <aside
      className="hidden md:flex flex-col w-[200px] fixed left-0 top-[52px] bottom-0 overflow-y-auto border-r border-[#1e2733]"
      style={{ background: '#0f1419' }}
    >
      {/* Sport */}
      <div className="px-2 pt-4 pb-2">
        <div className={SECTION_TITLE} style={{ fontFamily: 'var(--font-barlow-condensed)' }}>
          {t.filter.sport}
        </div>
        {sports.map((s) => (
          <button
            key={s.id}
            onClick={() => setSport(s.id)}
            className={cn(SIDEBAR_ITEM, sport === s.id && SIDEBAR_ITEM_ACTIVE)}
            style={{ fontFamily: 'var(--font-barlow-condensed)' }}
          >
            <span>{s.emoji}</span>
            {s.label}
            {s.id !== 'all' && counts[s.id] !== undefined && (
              <CountBadge count={counts[s.id]} />
            )}
            {s.id === 'all' && totalCount > 0 && (
              <CountBadge count={totalCount} />
            )}
          </button>
        ))}
      </div>

      <SectionDivider />

      {/* Date range */}
      <div className="px-2 py-3">
        <div className={SECTION_TITLE} style={{ fontFamily: 'var(--font-barlow-condensed)' }}>
          {t.filter.thisWeek.replace('This ', '')}
        </div>
        {/* Month display */}
        <div className="flex items-center justify-between px-2 mb-2">
          <button
            className="w-6 h-6 rounded flex items-center justify-center bg-[#1e2733] text-[#4a5568] hover:text-[#a0aec0] transition-colors"
            aria-label={t.month.prev}
          >
            <ChevronLeft size={12} />
          </button>
          <span
            className="text-[12px] font-bold text-[#a0aec0]"
            style={{ fontFamily: 'var(--font-barlow-condensed)' }}
          >
            {displayMonth.format('MMM YYYY')}
          </span>
          <button
            className="w-6 h-6 rounded flex items-center justify-center bg-[#1e2733] text-[#4a5568] hover:text-[#a0aec0] transition-colors"
            aria-label={t.month.next}
          >
            <ChevronRight size={12} />
          </button>
        </div>
        {dateOptions.map((d) => (
          <button
            key={d.id}
            onClick={() => setDateRange(d.id)}
            className={cn(SIDEBAR_ITEM, dateRange === d.id && SIDEBAR_ITEM_ACTIVE)}
            style={{ fontFamily: 'var(--font-barlow-condensed)' }}
          >
            {d.label}
          </button>
        ))}
      </div>

      <SectionDivider />

      {/* Confidence */}
      <div className="px-2 py-3">
        <div className={SECTION_TITLE} style={{ fontFamily: 'var(--font-barlow-condensed)' }}>
          {t.filter.confidence}
        </div>
        <div className="flex flex-wrap gap-1.5 px-2">
          {confOptions.map((c) => {
            const isActive = confidence.includes(c.id)
            return (
              <button
                key={c.id}
                onClick={() => toggleConfidence(c.id)}
                className="px-2 py-1 rounded text-[11px] font-bold tracking-wide transition-all"
                style={{
                  fontFamily: 'var(--font-barlow-condensed)',
                  color: c.color,
                  background: isActive ? c.activeBg : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${isActive ? c.color : 'transparent'}`,
                }}
              >
                {c.label}
              </button>
            )
          })}
        </div>
      </div>

      <SectionDivider />

      {/* Direction */}
      <div className="px-2 py-3">
        <div className={SECTION_TITLE} style={{ fontFamily: 'var(--font-barlow-condensed)' }}>
          {t.filter.direction}
        </div>
        {dirOptions.map((d) => (
          <button
            key={d.id}
            onClick={() => setDirection(d.id)}
            className={cn(
              SIDEBAR_ITEM,
              direction === d.id && SIDEBAR_ITEM_ACTIVE,
              d.id === 'home' && direction === d.id && '!text-[#60a5fa] !bg-[rgba(96,165,250,0.08)]',
            )}
            style={{ fontFamily: 'var(--font-barlow-condensed)' }}
          >
            {d.label}
          </button>
        ))}
      </div>
    </aside>
  )
}
