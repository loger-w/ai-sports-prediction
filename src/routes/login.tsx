import { createFileRoute } from '@tanstack/react-router'
import { SimpleLayout } from '@/components/layout/SimpleLayout'
import { LoginForm } from '@/components/auth/LoginForm'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  return (
    <SimpleLayout>
      <LoginForm />
    </SimpleLayout>
  )
}
