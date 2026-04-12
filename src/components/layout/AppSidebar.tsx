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
  const { sport, minStars, direction, setSport, setMinStars, setDirection } =
    usePredictionStore()
  const { data: counts = {} } = useSportCounts()
  const totalCount = Object.values(counts).reduce((a, b) => a + b, 0)

  const sports: { id: Sport; label: string; emoji: string }[] = [
    { id: 'all', label: t.filter.allSports, emoji: '🏆' },
    { id: 'nba', label: 'NBA', emoji: '🏀' },
    { id: 'mlb', label: 'MLB', emoji: '⚾' },
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

      {/* Min Stars filter */}
      <div className="px-2 py-3">
        <div className={SECTION_TITLE} style={{ fontFamily: 'var(--font-barlow-condensed)' }}>
          {t.filter.minStars}
        </div>
        <div className="flex flex-wrap gap-1.5 px-2">
          {[1, 2, 3, 4, 5].map((n) => {
            const isActive = minStars === n
            return (
              <button
                key={n}
                onClick={() => setMinStars(n)}
                className="px-2 py-1 rounded text-[11px] font-bold tracking-wide transition-all"
                style={{
                  fontFamily: 'var(--font-barlow-condensed)',
                  color: isActive ? '#fbbf24' : '#4a5568',
                  background: isActive ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${isActive ? '#fbbf24' : 'transparent'}`,
                }}
              >
                {n === 1 ? 'All' : `${n}+ ★`}
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
            className={cn(SIDEBAR_ITEM, direction === d.id && SIDEBAR_ITEM_ACTIVE)}
            style={{ fontFamily: 'var(--font-barlow-condensed)' }}
          >
            {d.label}
          </button>
        ))}
      </div>
    </aside>
  )
}
