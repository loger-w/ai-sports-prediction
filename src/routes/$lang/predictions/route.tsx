// src/routes/$lang/predictions/route.tsx
import { createFileRoute } from '@tanstack/react-router'
import { DateScrollBar } from '@/components/predictions/DateScrollBar'
import { SortToggle } from '@/components/predictions/SortToggle'
import { RecommendationGrid } from '@/components/predictions/RecommendationGrid'
import { useDailyRecommendations } from '@/hooks/predictions/useDailyRecommendations'

export const Route = createFileRoute('/$lang/predictions')({
  component: PredictionsPage,
})

function PredictionsPage() {
  const query = useDailyRecommendations()
  return (
    <div className="space-y-4">
      <DateScrollBar />
      <div className="flex items-center justify-end">
        <SortToggle />
      </div>
      <RecommendationGrid {...query} />
    </div>
  )
}
