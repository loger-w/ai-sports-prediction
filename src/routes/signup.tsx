import { createFileRoute } from '@tanstack/react-router'
import { SimpleLayout } from '@/components/layout/SimpleLayout'
import { SignupForm } from '@/components/auth/SignupForm'

export const Route = createFileRoute('/signup')({
  component: SignupPage,
})

function SignupPage() {
  return (
    <SimpleLayout>
      <SignupForm />
    </SimpleLayout>
  )
}
