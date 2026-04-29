import { cn } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import type { PredictionFilters } from '@/stores/predictions/predictionStore'
import { usePredictionStore } from '@/stores/predictions/predictionStore'
import { useRecommendationCounts } from '@/hooks/predictions/useDailyRecommendations'
import { MarketChips } from '@/components/predictions/MarketChips'

const FONT = { fontFamily: 'var(--font-barlow-condensed)' as const }

const SECTION_TITLE =
  'text-[14px] font-bold tracking-[0.2em] uppercase text-[#94a3b8] mb-2 px-2'

const SIDEBAR_ITEM =
  'flex items-center gap-2 w-full px-2 py-1.5 rounded text-[15px] font-semibold tracking-wide transition-colors cursor-pointer text-[#94a3b8] hover:text-[#e2e8f0]'

const SIDEBAR_ITEM_ACTIVE = 'bg-[rgba(0,229,160,0.1)] text-[#00e5a0]'

type Sport = PredictionFilters['sport']
type SportCategory = 'all' | 'baseball'

function categoryOf(sport: Sport): SportCategory {
  if (sport === 'mlb') return 'baseball'
  return 'all'
}

function CountBadge({ count }: { count: number }) {
  return (
    <span className="ml-auto text-[13px] bg-[#1e2733] text-[#e2e8f0] rounded px-1.5 py-0.5 font-bold">
      {count}
    </span>
  )
}

function SectionDivider() {
  return <div className="border-t border-[#1a2030] my-1" />
}

const STAR_LEVELS = [1, 2, 3, 4, 5] as const

export function AppSidebar() {
  const { t } = useTranslation()
  const sport = usePredictionStore((s) => s.sport)
  const minStars = usePredictionStore((s) => s.minStars)
  const setSport = usePredictionStore((s) => s.setSport)
  const setMinStars = usePredictionStore((s) => s.setMinStars)
  const { data: counts = {} } = useRecommendationCounts()
  const totalCount = Object.values(counts).reduce((a, b) => a + b, 0)
  const category = categoryOf(sport)

  const sportButtons: { id: SportCategory; label: string; emoji: string; onSelect: () => void }[] = [
    { id: 'all',      label: t.filter.allSports, emoji: '🏆', onSelect: () => setSport('all') },
    { id: 'baseball', label: t.filter.baseball,  emoji: '⚾', onSelect: () => setSport('mlb') },
  ]

  return (
    <aside
      className="hidden md:flex flex-col w-[200px] fixed left-0 top-[52px] bottom-0 overflow-y-auto border-r border-[#1e2733]"
      style={{ background: '#0f1419' }}
    >
      {/* Sport */}
      <div className="px-2 pt-4 pb-2">
        <div className={SECTION_TITLE} style={FONT}>{t.filter.sport}</div>
        {sportButtons.map((c) => {
          const count =
            c.id === 'all' ? (totalCount > 0 ? totalCount : undefined) : counts['mlb']
          return (
            <button
              key={c.id}
              onClick={c.onSelect}
              className={cn(SIDEBAR_ITEM, category === c.id && SIDEBAR_ITEM_ACTIVE)}
              style={FONT}
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
        <div className={SECTION_TITLE} style={FONT}>{t.filter.leagues}</div>
        <button
          onClick={() => setSport('mlb')}
          className={cn(SIDEBAR_ITEM, sport === 'mlb' && SIDEBAR_ITEM_ACTIVE)}
          style={FONT}
        >
          MLB
          {'mlb' in counts && <CountBadge count={counts['mlb']} />}
        </button>
      </div>

      <SectionDivider />

      {/* Markets */}
      <div className="px-2 py-3">
        <div className={SECTION_TITLE} style={FONT}>{t.filter.markets}</div>
        <MarketChips />
      </div>

      <SectionDivider />

      {/* Min Stars */}
      <div className="px-2 py-3">
        <div className={SECTION_TITLE} style={FONT}>{t.filter.minStars}</div>
        <div className="flex flex-wrap gap-1.5 px-2">
          {STAR_LEVELS.map((n) => {
            const isActive = minStars === n
            const label = n === 1 ? t.filter.starsAll : n === 5 ? '5' : `${n}+`
            return (
              <button
                key={n}
                onClick={() => setMinStars(n)}
                className="px-2 py-1 rounded text-[14px] font-bold tracking-wide transition-all"
                style={{
                  ...FONT,
                  color: isActive ? '#fbbf24' : '#94a3b8',
                  background: isActive ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${isActive ? '#fbbf24' : 'transparent'}`,
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>
    </aside>
  )
}
