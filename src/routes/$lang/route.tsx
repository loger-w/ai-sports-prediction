import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { PredictionsLayout } from '@/components/layout/PredictionsLayout'

export const Route = createFileRoute('/$lang')({
  beforeLoad: ({ params }) => {
    if (params.lang !== 'en' && params.lang !== 'zh') {
      throw redirect({ to: '/$lang/predictions', params: { lang: 'en' } })
    }
  },
  component: () => (
    <PredictionsLayout>
      <Outlet />
    </PredictionsLayout>
  ),
})
