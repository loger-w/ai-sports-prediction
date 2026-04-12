import { createFileRoute } from '@tanstack/react-router'
import { DateScrollBar } from '@/components/predictions/DateScrollBar'
import { GameGrid } from '@/components/predictions/GameGrid'
import { useDailyPredictions } from '@/hooks/predictions/useDailyPredictions'

export const Route = createFileRoute('/$lang/predictions')({
  component: PredictionsPage,
})

function PredictionsPage() {
  const query = useDailyPredictions()
  return (
    <div className="space-y-4">
      <DateScrollBar />
      <GameGrid {...query} />
    </div>
  )
}
