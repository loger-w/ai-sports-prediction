import { createFileRoute, useParams } from '@tanstack/react-router'
import { EditGamePage } from '@/components/admin/EditGamePage'

export const Route = createFileRoute('/admin/games/$gameId')({
  component: EditGamePageRoute,
})

function EditGamePageRoute() {
  const { gameId } = useParams({ from: '/admin/games/$gameId' })
  return <EditGamePage gameId={gameId} />
}
