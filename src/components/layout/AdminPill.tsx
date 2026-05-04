import { Link } from '@tanstack/react-router'
import { useUser } from '@/lib/auth/useUser'

const FONT = { fontFamily: 'var(--font-barlow-condensed)' as const }

export function AdminPill() {
  const { isAdmin, loading } = useUser()
  if (loading || !isAdmin) return null

  return (
    <Link
      to="/admin"
      className="px-2.5 py-1 rounded text-[11px] font-black tracking-widest uppercase bg-[rgba(0,229,160,0.15)] text-[#00e5a0] border border-[rgba(0,229,160,0.40)] hover:bg-[rgba(0,229,160,0.25)] transition-colors"
      style={FONT}
      aria-label="進入 Admin 後台"
    >
      ⚡ Admin
    </Link>
  )
}
