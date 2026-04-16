import { cn } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import {
  usePredictionStore,
  type PredictionFilters,
} from '@/stores/predictions/predictionStore'
import { useSportCounts } from '@/hooks/predictions/useDailyPredictions'

const SECTION_TITLE =
  'text-[12px] font-bold tracking-[0.2em] uppercase text-[#3a4a5a] mb-2 px-2'

const SIDEBAR_ITEM =
  'flex items-center gap-2 w-full px-2 py-1.5 rounded text-[15px] font-semibold tracking-wide transition-colors cursor-pointer text-[#4a5568] hover:text-[#a0aec0]'

const SIDEBAR_ITEM_ACTIVE = 'bg-[rgba(0,229,160,0.1)] text-[#00e5a0]'

type Sport = PredictionFilters['sport']
type SportCategory = 'all' | 'basketball' | 'baseball'

function sportCategory(sport: Sport): SportCategory {
  if (sport === 'nba') return 'basketball'
  if (sport === 'mlb') return 'baseball'
  return 'all'
}

function CountBadge({ count }: { count: number }) {
  return (
    <span className="ml-auto text-[13px] bg-[#1e2733] text-[#2d3748] rounded px-1.5 py-0.5 font-bold">
      {count}
    </span>
  )
}

function SectionDivider() {
  return <div className="border-t border-[#1a2030] my-1" />
}

export function AppSidebar() {
  const { t } = useTranslation()
  const { sport, minStars, setSport, setMinStars } = usePredictionStore()
  const { data: counts = {} } = useSportCounts()
  const totalCount = Object.values(counts).reduce((a, b) => a + b, 0)
  const category = sportCategory(sport)

  const categories: { id: SportCategory; label: string; emoji: string; onSelect: () => void }[] = [
    { id: 'all', label: t.filter.allSports, emoji: '🏆', onSelect: () => setSport('all') },
    { id: 'basketball', label: t.filter.basketball, emoji: '🏀', onSelect: () => setSport('nba') },
    { id: 'baseball', label: t.filter.baseball, emoji: '⚾', onSelect: () => setSport('mlb') },
  ]

  const allLeagues: { id: Sport; label: string; category: SportCategory }[] = [
    { id: 'nba', label: 'NBA', category: 'basketball' },
    { id: 'mlb', label: 'MLB', category: 'baseball' },
  ]

  const visibleLeagues =
    category === 'all' ? allLeagues : allLeagues.filter((l) => l.category === category)

  const leagueSectionLabel =
    category === 'basketball'
      ? t.filter.basketballLeagues
      : category === 'baseball'
        ? t.filter.baseballLeagues
        : t.filter.leagues

  const categoryCount = (cat: SportCategory): number | undefined => {
    if (cat === 'all') return totalCount > 0 ? totalCount : undefined
    if (cat === 'basketball') return counts['nba']
    if (cat === 'baseball') return counts['mlb']
  }

  return (
    <aside
      className="hidden md:flex flex-col w-[200px] fixed left-0 top-[52px] bottom-0 overflow-y-auto border-r border-[#1e2733]"
      style={{ background: '#0f1419' }}
    >
      {/* Sport Categories */}
      <div className="px-2 pt-4 pb-2">
        <div className={SECTION_TITLE} style={{ fontFamily: 'var(--font-barlow-condensed)' }}>
          {t.filter.sport}
        </div>
        {categories.map((c) => {
          const count = categoryCount(c.id)
          return (
            <button
              key={c.id}
              onClick={c.onSelect}
              className={cn(SIDEBAR_ITEM, category === c.id && SIDEBAR_ITEM_ACTIVE)}
              style={{ fontFamily: 'var(--font-barlow-condensed)' }}
            >
              <span>{c.emoji}</span>
              {c.label}
              {count !== undefined && <CountBadge count={count} />}
            </button>
          )
        })}
      </div>

      <SectionDivider />

      {/* Leagues */}
      <div className="px-2 py-3">
        <div className={SECTION_TITLE} style={{ fontFamily: 'var(--font-barlow-condensed)' }}>
          {leagueSectionLabel}
        </div>
        {visibleLeagues.map((l) => (
          <button
            key={l.id}
            onClick={() => setSport(l.id)}
            className={cn(SIDEBAR_ITEM, sport === l.id && SIDEBAR_ITEM_ACTIVE)}
            style={{ fontFamily: 'var(--font-barlow-condensed)' }}
          >
            {l.label}
            {counts[l.id] !== undefined && <CountBadge count={counts[l.id]} />}
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
                className="px-2 py-1 rounded text-[14px] font-bold tracking-wide transition-all"
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
    </aside>
  )
}
