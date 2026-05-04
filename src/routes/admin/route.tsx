import { useEffect } from 'react'
import { Link, Outlet, createFileRoute, useNavigate } from '@tanstack/react-router'
import { SimpleLayout } from '@/components/layout/SimpleLayout'
import { useUser } from '@/lib/auth/useUser'

const FONT = { fontFamily: 'var(--font-barlow-condensed)' as const }

const TAB_BASE =
  'px-3 py-1.5 rounded text-sm font-bold tracking-widest uppercase transition-colors text-[#94a3b8] hover:text-[#e2e8f0]'
const TAB_ACTIVE =
  'px-3 py-1.5 rounded text-sm font-bold tracking-widest uppercase bg-[rgba(0,229,160,0.12)] text-[#00e5a0]'

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
        <nav className="flex items-center gap-2 px-4 pt-10">
          <Link
            to="/admin"
            className={TAB_BASE}
            activeOptions={{ exact: true }}
            activeProps={{ className: TAB_ACTIVE }}
          >
            比賽
          </Link>
          <Link
            to="/admin/users"
            className={TAB_BASE}
            activeProps={{ className: TAB_ACTIVE }}
          >
            使用者
          </Link>
        </nav>
        <Outlet />
      </div>
    </SimpleLayout>
  )
}

export const Route = createFileRoute('/admin')({
  component: AdminLayout,
})
