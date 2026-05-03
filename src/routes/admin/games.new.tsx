import { createFileRoute } from '@tanstack/react-router'
import { NewGamePage } from '@/components/admin/NewGamePage'

export const Route = createFileRoute('/admin/games/new')({
  component: NewGamePage,
})
