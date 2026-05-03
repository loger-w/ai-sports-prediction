import { createFileRoute } from '@tanstack/react-router'
import { SimpleLayout } from '@/components/layout/SimpleLayout'
import { CallbackHandler } from '@/components/auth/CallbackHandler'

export const Route = createFileRoute('/auth/callback')({
  component: AuthCallbackPage,
})

function AuthCallbackPage() {
  return (
    <SimpleLayout>
      <CallbackHandler />
    </SimpleLayout>
  )
}
