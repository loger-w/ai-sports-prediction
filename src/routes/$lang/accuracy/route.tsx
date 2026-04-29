import { Suspense, lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from '@/lib/i18n'
import { useAccuracyData } from '@/hooks/predictions/useAccuracyStats'
import { AccuracyOverview } from '@/components/accuracy/AccuracyOverview'
import { MarketBreakdown } from '@/components/accuracy/MarketBreakdown'
import { StarBreakdown } from '@/components/accuracy/StarBreakdown'
import { Skeleton } from '@/components/ui/skeleton'

const AccuracyTrend = lazy(() =>
  import('@/components/accuracy/AccuracyTrend').then((m) => ({ default: m.AccuracyTrend })),
)

export const Route = createFileRoute('/$lang/accuracy')({
  component: AccuracyPage,
})

const FONT = { fontFamily: 'var(--font-barlow-condensed)' as const }

const SKELETON_ROW = [0, 1, 2] as const

function PageSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {SKELETON_ROW.map((i) => <Skeleton key={i} className="h-28 rounded-[10px] bg-[#1e2733]" />)}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {SKELETON_ROW.map((i) => <Skeleton key={i} className="h-32 rounded-[10px] bg-[#1e2733]" />)}
      </div>
      <Skeleton className="h-[260px] rounded-[10px] bg-[#1e2733]" />
    </div>
  )
}

function AccuracyPage() {
  const { t } = useTranslation()
  const { data, isLoading, isError } = useAccuracyData()

  if (isLoading) return <PageSkeleton />

  if (isError || !data) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-[#94a3b8] text-sm" style={FONT}>{t.accuracy.noData}</p>
      </div>
    )
  }

  if (data.overall.total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-2">
        <p className="text-[14px] font-bold text-[#00e5a0]" style={FONT}>{t.accuracy.title}</p>
        <p className="text-[#94a3b8] text-sm max-w-xs" style={FONT}>{t.accuracy.noData}</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-[13px] font-black tracking-[0.2em] uppercase text-[#00e5a0]" style={FONT}>
        {t.accuracy.title}
      </h1>

      <AccuracyOverview overall={data.overall} />
      <MarketBreakdown byMarket={data.byMarket} />
      <StarBreakdown byStars={data.byStars} />

      {data.daily.length > 1 ? (
        <Suspense fallback={<Skeleton className="h-[260px] rounded-[10px] bg-[#1e2733]" />}>
          <AccuracyTrend daily={data.daily} />
        </Suspense>
      ) : null}
    </div>
  )
}
