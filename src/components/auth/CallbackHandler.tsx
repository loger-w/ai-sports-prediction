import { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth/authStore'

const FONT = { fontFamily: 'var(--font-barlow-condensed)' as const }

export function CallbackHandler() {
  const navigate = useNavigate()
  const loading = useAuthStore((s) => s.loading)

  useEffect(() => {
    if (loading) return
    navigate({ to: '/' })
  }, [loading, navigate])

  return (
    <div className="text-center py-20" style={FONT}>
      <p className="text-[#94a3b8]">處理中…</p>
    </div>
  )
}
