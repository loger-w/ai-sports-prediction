import { cn } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import { usePredictionStore, type SortBy } from '@/stores/predictions/predictionStore'

const FONT = { fontFamily: 'var(--font-barlow-condensed)' as const }

const OPTIONS: Array<{ id: SortBy; key: 'sortByStars' | 'sortByTime' }> = [
  { id: 'stars', key: 'sortByStars' },
  { id: 'time', key: 'sortByTime' },
]

export function SortToggle() {
  const { t } = useTranslation()
  const sortBy = usePredictionStore((s) => s.sortBy)
  const setSortBy = usePredictionStore((s) => s.setSortBy)

  return (
    <div className="inline-flex items-center bg-[#161b22] border border-[#1e2733] rounded overflow-hidden">
      {OPTIONS.map((opt) => {
        const active = sortBy === opt.id
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => setSortBy(opt.id)}
            data-active={active}
            className={cn(
              'px-3 py-1 text-[12px] font-bold tracking-wide transition-colors',
              active ? 'bg-[#1e2733] text-[#00e5a0]' : 'text-[#4a5568]',
            )}
            style={FONT}
          >
            {t.predictions[opt.key]}
          </button>
        )
      })}
    </div>
  )
}
