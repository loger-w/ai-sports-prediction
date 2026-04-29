import type { UseQueryResult } from '@tanstack/react-query'
import { Skeleton } from '@/components/ui/skeleton'
import { useTranslation } from '@/lib/i18n'
import { usePredictionStore } from '@/stores/predictions/predictionStore'
import type { RecommendationWithGame } from '@/types/predictions/recommendation'
import { RecommendationCard } from './RecommendationCard'

type GridProps = Pick<
  UseQueryResult<RecommendationWithGame[]>,
  'data' | 'isLoading' | 'isError' | 'refetch'
>

const FONT = { fontFamily: 'var(--font-barlow-condensed)' as const }

function CardSkeleton() {
  return (
    <div data-testid="rec-skeleton" className="rounded-[10px] border border-[#1e2733] bg-[#161b22] overflow-hidden">
      <div className="h-9 bg-[#0d1117] border-b border-[#1e2733]" />
      <div className="px-3.5 py-2.5 grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
        <Skeleton className="h-7 w-12 bg-[#1e2733]" />
        <Skeleton className="h-3 w-4 bg-[#1e2733]" />
        <Skeleton className="h-7 w-12 bg-[#1e2733] ml-auto" />
      </div>
      <div className="border-t border-[#1e2733] px-3.5 py-2.5 flex justify-between">
        <Skeleton className="h-5 w-20 bg-[#1e2733]" />
        <Skeleton className="h-5 w-16 bg-[#1e2733]" />
      </div>
    </div>
  )
}

export function RecommendationGrid({ data, isLoading, isError, refetch }: GridProps) {
  const { t } = useTranslation()
  const markets = usePredictionStore((s) => s.markets)
  const sport = usePredictionStore((s) => s.sport)
  const minStars = usePredictionStore((s) => s.minStars)
  const resetFilters = usePredictionStore((s) => s.resetFilters)

  if (markets.size === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-2">
        <p className="text-[#a0aec0] text-sm" style={FONT}>{t.predictions.pickAtLeastMarket}</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
        <p className="text-[#94a3b8] text-sm" style={FONT}>Failed to load.</p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 rounded text-[12px] font-bold tracking-wide bg-[rgba(0,229,160,0.1)] text-[#00e5a0] border border-[rgba(0,229,160,0.25)] hover:brightness-110 transition-all"
          style={FONT}
        >
          {t.predictions.retry}
        </button>
      </div>
    )
  }

  if (!data || data.length === 0) {
    const filtered = sport !== 'all' || minStars > 1 || markets.size < 3
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
        <p className="text-[#94a3b8] text-sm max-w-xs" style={FONT}>
          {filtered ? t.predictions.noResults : t.predictions.noData}
        </p>
        {filtered ? (
          <button
            onClick={resetFilters}
            className="px-4 py-2 rounded text-[12px] font-bold tracking-wide bg-[rgba(0,229,160,0.1)] text-[#00e5a0] border border-[rgba(0,229,160,0.25)] hover:brightness-110 transition-all"
            style={FONT}
          >
            {t.predictions.resetFilters}
          </button>
        ) : null}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {data.map((r) => (
        <RecommendationCard key={`${r.game_id}:${r.market}`} rec={r} />
      ))}
    </div>
  )
}
