import { useEffect, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth/authStore'

const FONT = { fontFamily: 'var(--font-barlow-condensed)' as const }

function parseAuthError(): { message: string } | null {
  if (typeof window === 'undefined') return null

  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : ''
  const hashParams = new URLSearchParams(hash)
  const queryParams = new URLSearchParams(window.location.search)

  const error = hashParams.get('error') ?? queryParams.get('error')
  if (!error) return null

  const description =
    hashParams.get('error_description') ??
    queryParams.get('error_description') ??
    error

  return { message: description.replace(/\+/g, ' ') }
}

export function CallbackHandler() {
  const navigate = useNavigate()
  const session = useAuthStore((s) => s.session)
  const loading = useAuthStore((s) => s.loading)
  const handled = useRef(false)

  useEffect(() => {
    if (handled.current) return

    const err = parseAuthError()
    if (err) {
      handled.current = true
      toast.error(err.message)
      navigate({ to: '/login' })
      return
    }

    if (!loading && session) {
      handled.current = true
      toast.success('驗證成功')
      navigate({ to: '/' })
      return
    }

    const timer = window.setTimeout(() => {
      if (handled.current) return
      handled.current = true
      toast.error('驗證逾時，請重試')
      navigate({ to: '/login' })
    }, 5000)

    return () => window.clearTimeout(timer)
  }, [loading, session, navigate])

  return (
    <div className="text-center py-20" style={FONT}>
      <p className="text-[#94a3b8]">處理中…</p>
    </div>
  )
}
