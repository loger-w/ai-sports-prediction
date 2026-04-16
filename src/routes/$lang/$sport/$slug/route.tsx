import { useMemo, useEffect } from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useTranslation } from '@/lib/i18n'
import { useGameDetail } from '@/hooks/predictions/useGameDetail'
import { buildSportsEventSchema, buildPageTitle } from '@/lib/predictions/seo'
import { GameDetailHeader } from '@/components/game-detail/GameDetailHeader'
import { PredictionBreakdown } from '@/components/game-detail/PredictionBreakdown'
import { AnalysisSection } from '@/components/game-detail/AnalysisSection'
import { SchemaMarkup } from '@/components/game-detail/SchemaMarkup'
import { Skeleton } from '@/components/ui/skeleton'

export const Route = createFileRoute('/$lang/$sport/$slug')({
  beforeLoad: ({ params }) => {
    if (params.sport !== 'nba' && params.sport !== 'mlb') {
      throw redirect({ to: '/$lang/predictions', params: { lang: params.lang } })
    }
  },
  component: GameDetailPage,
})

// Loading skeleton — defined outside component (rerender-no-inline-components)
function GameDetailSkeleton() {
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="rounded-[10px] border border-[#1e2733] bg-[#0d1117] overflow-hidden">
        <div className="px-4 py-2.5 border-b border-[#1e2733]">
          <Skeleton className="h-4 w-24 bg-[#1e2733]" />
        </div>
        <div className="px-6 py-6 grid grid-cols-[1fr_auto_1fr] gap-6 items-center">
          <div className="space-y-2">
            <Skeleton className="h-3 w-20 bg-[#1e2733]" />
            <Skeleton className="h-12 w-16 bg-[#1e2733]" />
          </div>
          <Skeleton className="h-4 w-8 bg-[#1e2733]" />
          <div className="space-y-2 flex flex-col items-end">
            <Skeleton className="h-3 w-20 bg-[#1e2733]" />
            <Skeleton className="h-12 w-16 bg-[#1e2733]" />
          </div>
        </div>
      </div>
      <Skeleton className="h-32 w-full rounded-[10px] bg-[#1e2733]" />
      <Skeleton className="h-24 w-full rounded-[10px] bg-[#1e2733]" />
    </div>
  )
}

function GameDetailPage() {
  const { slug } = Route.useParams()
  const { t, lang } = useTranslation()
  const { data: game, isLoading, isError } = useGameDetail(slug)

  // Memoize schema to give SchemaMarkup a stable string dep (rerender-dependencies)
  const schema = useMemo(
    () => (game ? buildSportsEventSchema(game) : null),
    [game],
  )

  // Set document title
  useEffect(() => {
    if (!game) return
    const prev = document.title
    document.title = buildPageTitle(game, lang)
    return () => { document.title = prev }
  }, [game, lang])

  if (isLoading) return <GameDetailSkeleton />

  if (isError || !game) {
    return (
      <div className="flex items-center justify-center py-24">
        <p
          className="text-[#4a5568] text-sm"
          style={{ fontFamily: 'var(--font-barlow-condensed)' }}
        >
          {t.gameDetail.notFound}
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {schema ? <SchemaMarkup schema={schema} /> : null}
      <GameDetailHeader game={game} />
      <PredictionBreakdown game={game} />
      <AnalysisSection analysis={game.predictions[0]?.analysis ?? null} />
    </div>
  )
}
