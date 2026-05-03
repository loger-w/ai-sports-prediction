import { useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useUser } from '@/lib/auth/useUser'
import { authClient } from '@/lib/auth/authClient'

const FONT = { fontFamily: 'var(--font-barlow-condensed)' as const }

export function UserMenu() {
  const { user, isAdmin, loading } = useUser()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  if (loading) {
    return <div className="w-8 h-8" aria-hidden />
  }

  if (!user) {
    return (
      <Link
        to="/login"
        className="px-3 py-1.5 rounded text-sm font-bold tracking-widest uppercase text-[#94a3b8] hover:text-[#00e5a0] transition-colors"
        style={FONT}
      >
        登入
      </Link>
    )
  }

  const initial = (user.email ?? '?').charAt(0).toUpperCase()

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-8 h-8 rounded-full bg-[rgba(0,229,160,0.15)] text-[#00e5a0] font-bold flex items-center justify-center hover:bg-[rgba(0,229,160,0.25)] transition-colors"
        style={FONT}
        aria-label="User menu"
      >
        {initial}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-[#0d1117] border border-[#1e2733] rounded shadow-lg overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-[#1e2733]">
            <p className="text-xs text-[#94a3b8] truncate" style={FONT}>
              {user.email}
            </p>
          </div>
          {isAdmin && (
            <Link
              to="/admin"
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm text-[#94a3b8] hover:bg-[rgba(0,229,160,0.08)] hover:text-[#00e5a0] transition-colors"
              style={FONT}
            >
              → Admin 後台
            </Link>
          )}
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              void authClient.signOut()
            }}
            className="w-full text-left px-4 py-2 text-sm text-[#94a3b8] hover:bg-[rgba(252,129,129,0.08)] hover:text-[#fc8181] transition-colors border-t border-[#1e2733]"
            style={FONT}
          >
            登出
          </button>
        </div>
      )}
    </div>
  )
}
