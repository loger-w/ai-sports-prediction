import type { UseQueryResult } from '@tanstack/react-query'
import { Skeleton } from '@/components/ui/skeleton'
import { useTranslation } from '@/lib/i18n'
import { usePredictionStore } from '@/stores/predictions/predictionStore'
import type { GameWithPrediction } from '@/services/predictions/api'
import { GameCard } from './GameCard'

type GameGridProps = Pick<
  UseQueryResult<GameWithPrediction[]>,
  'data' | 'isLoading' | 'isError' | 'refetch'
>

function CardSkeleton() {
  return (
    <div className="rounded-[10px] border border-[#1e2733] bg-[#161b22] overflow-hidden">
      <div className="h-10 bg-[#0d1117] border-b border-[#1e2733]" />
      <div className="px-4 pt-3.5 pb-4 space-y-3">
        <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
          <div className="space-y-2">
            <Skeleton className="h-8 w-16 bg-[#1e2733]" />
            <Skeleton className="h-3 w-24 bg-[#1e2733]" />
          </div>
          <Skeleton className="h-4 w-6 bg-[#1e2733]" />
          <div className="space-y-2 flex flex-col items-end">
            <Skeleton className="h-8 w-16 bg-[#1e2733]" />
            <Skeleton className="h-3 w-24 bg-[#1e2733]" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <Skeleton className="h-6 w-12 bg-[#1e2733]" />
            <Skeleton className="h-6 w-12 bg-[#1e2733]" />
          </div>
          <Skeleton className="h-1.5 w-full bg-[#1e2733]" />
        </div>
        <Skeleton className="h-10 w-full bg-[#1e2733]" />
      </div>
    </div>
  )
}

export function GameGrid({ data, isLoading, isError, refetch }: GameGridProps) {
  const { t } = useTranslation()
  const { resetFilters, sport, confidence, direction, dateRange } =
    usePredictionStore()

  const hasActiveFilters =
    sport !== 'all' ||
    confidence.length > 0 ||
    direction !== 'all' ||
    dateRange !== 'today'

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
        <p
          className="text-[#4a5568] text-sm"
          style={{ fontFamily: 'var(--font-barlow-condensed)' }}
        >
          Failed to load predictions.
        </p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 rounded text-[12px] font-bold tracking-wide bg-[rgba(0,229,160,0.1)] text-[#00e5a0] border border-[rgba(0,229,160,0.25)] hover:brightness-110 transition-all"
          style={{ fontFamily: 'var(--font-barlow-condensed)' }}
        >
          {t.predictions.retry}
        </button>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
        <p
          className="text-[#4a5568] text-sm max-w-xs"
          style={{ fontFamily: 'var(--font-barlow-condensed)' }}
        >
          {hasActiveFilters ? t.predictions.noResults : t.predictions.noData}
        </p>
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="px-4 py-2 rounded text-[12px] font-bold tracking-wide bg-[rgba(0,229,160,0.1)] text-[#00e5a0] border border-[rgba(0,229,160,0.25)] hover:brightness-110 transition-all"
            style={{ fontFamily: 'var(--font-barlow-condensed)' }}
          >
            {t.predictions.resetFilters}
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {data.map((game) => (
        <GameCard key={game.id} game={game} />
      ))}
    </div>
  )
}
