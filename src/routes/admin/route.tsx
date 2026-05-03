import { useEffect } from 'react'
import { Outlet, createFileRoute, useNavigate } from '@tanstack/react-router'
import { SimpleLayout } from '@/components/layout/SimpleLayout'
import { useUser } from '@/lib/auth/useUser'

const FONT = { fontFamily: 'var(--font-barlow-condensed)' as const }

export function AdminLayout() {
  const navigate = useNavigate()
  const { user, isAdmin, loading } = useUser()

  useEffect(() => {
    if (loading) return
    if (!user) {
      navigate({ to: '/login' })
      return
    }
    if (!isAdmin) {
      navigate({ to: '/' })
    }
  }, [loading, user, isAdmin, navigate])

  if (loading) {
    return (
      <SimpleLayout>
        <div className="text-center py-20 text-[#94a3b8]" style={FONT}>
          載入中…
        </div>
      </SimpleLayout>
    )
  }

  if (!user || !isAdmin) {
    return (
      <SimpleLayout>
        <div className="text-center py-20 text-[#94a3b8]" style={FONT}>
          載入中…
        </div>
      </SimpleLayout>
    )
  }

  return (
    <SimpleLayout>
      <div className="max-w-5xl mx-auto" style={FONT}>
        <Outlet />
      </div>
    </SimpleLayout>
  )
}

export const Route = createFileRoute('/admin')({
  component: AdminLayout,
})
