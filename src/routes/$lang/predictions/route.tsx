import { createFileRoute } from '@tanstack/react-router'
import { GameGrid } from '@/components/predictions/GameGrid'
import { useDailyPredictions } from '@/hooks/predictions/useDailyPredictions'

export const Route = createFileRoute('/$lang/predictions')({
  component: PredictionsPage,
})

function PredictionsPage() {
  const query = useDailyPredictions()
  return <GameGrid {...query} />
}
