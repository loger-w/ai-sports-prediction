import { createFileRoute } from '@tanstack/react-router'
import { GamesByDatePage } from '@/components/admin/GamesByDatePage'
import { localToday } from '@/lib/timezone'

interface SearchParams {
  date?: string
}

export const Route = createFileRoute('/admin/games/by-date')({
  component: GamesByDateRoute,
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    date: typeof search.date === 'string' ? search.date : undefined,
  }),
})

function GamesByDateRoute() {
  const { date: dateParam } = Route.useSearch()
  const date = dateParam ?? localToday()
  return <GamesByDatePage date={date} />
}
