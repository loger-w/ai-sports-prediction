import { lazy, Suspense } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from '@/lib/i18n'
import { useAccuracyStats } from '@/hooks/predictions/useAccuracyStats'
import { AccuracyOverview } from '@/components/accuracy/AccuracyOverview'
import { AccuracyBySport } from '@/components/accuracy/AccuracyBySport'
import { Skeleton } from '@/components/ui/skeleton'

// Lazy-load ApexCharts — ~200KB, only needed on this page (bundle-dynamic-imports)
const AccuracyTrend = lazy(() =>
  import('@/components/accuracy/AccuracyTrend').then((m) => ({ default: m.AccuracyTrend })),
)

export const Route = createFileRoute('/$lang/accuracy')({
  component: AccuracyPage,
})

// Defined outside component (rerender-no-inline-components)
function TrendSkeleton() {
  return (
    <div>
      <Skeleton className="h-3 w-24 bg-[#1e2733] mb-3" />
      <Skeleton className="h-[252px] w-full rounded-[10px] bg-[#1e2733]" />
    </div>
  )
}

function PageSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-28 rounded-[10px] bg-[#1e2733]" />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[0, 1].map((i) => (
          <Skeleton key={i} className="h-40 rounded-[10px] bg-[#1e2733]" />
        ))}
      </div>
      <TrendSkeleton />
    </div>
  )
}

function AccuracyPage() {
  const { t } = useTranslation()
  const { data, isLoading, isError } = useAccuracyStats()

  if (isLoading) return <PageSkeleton />

  if (isError || !data) {
    return (
      <div className="flex items-center justify-center py-24">
        <p
          className="text-[#4a5568] text-sm"
          style={{ fontFamily: 'var(--font-barlow-condensed)' }}
        >
          {t.accuracy.noData}
        </p>
      </div>
    )
  }

  if (data.overall.total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-2">
        <p
          className="text-[14px] font-bold text-[#00e5a0]"
          style={{ fontFamily: 'var(--font-barlow-condensed)' }}
        >
          {t.accuracy.title}
        </p>
        <p
          className="text-[#4a5568] text-sm max-w-xs"
          style={{ fontFamily: 'var(--font-barlow-condensed)' }}
        >
          {t.accuracy.noData}
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1
        className="text-[13px] font-black tracking-[0.2em] uppercase text-[#00e5a0]"
        style={{ fontFamily: 'var(--font-barlow-condensed)' }}
      >
        {t.accuracy.title}
      </h1>

      <AccuracyOverview overall={data.overall} />
      <AccuracyBySport bySport={data.bySport} />

      {/* Chart only rendered if we have multi-day data */}
      {data.daily.length > 1 ? (
        <Suspense fallback={<TrendSkeleton />}>
          <AccuracyTrend daily={data.daily} />
        </Suspense>
      ) : null}
    </div>
  )
}
