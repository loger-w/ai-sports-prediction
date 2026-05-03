import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { authClient } from '@/lib/auth/authClient'
import { Button } from '@/components/ui/button'

const FONT = { fontFamily: 'var(--font-barlow-condensed)' as const }

export function LoginForm() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const { error } = await authClient.signInWithEmail(email, password)
    setSubmitting(false)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('登入成功')
    navigate({ to: '/' })
  }

  async function handleGoogle() {
    const { error } = await authClient.signInWithGoogle()
    if (error) toast.error(error.message)
  }

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <h1
        className="text-3xl font-black text-[#e2e8f0] mb-8 text-center"
        style={FONT}
      >
        登入
      </h1>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="信箱"
          className="w-full px-4 py-3 rounded bg-[#0d1117] border border-[#1e2733] text-[#e2e8f0] placeholder-[#6b7280] focus:outline-none focus:border-[#00e5a0]"
          style={FONT}
        />
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="密碼"
          className="w-full px-4 py-3 rounded bg-[#0d1117] border border-[#1e2733] text-[#e2e8f0] placeholder-[#6b7280] focus:outline-none focus:border-[#00e5a0]"
          style={FONT}
        />
        <Button
          type="submit"
          disabled={submitting}
          className="w-full bg-[#00e5a0] text-[#0a0a0f] hover:bg-[#00c98a] font-bold"
          style={FONT}
        >
          {submitting ? '處理中…' : '登入'}
        </Button>
      </form>

      <div className="my-6 flex items-center gap-4">
        <div className="flex-1 h-px bg-[#1e2733]" />
        <span className="text-xs text-[#94a3b8]" style={FONT}>
          或
        </span>
        <div className="flex-1 h-px bg-[#1e2733]" />
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={handleGoogle}
        className="w-full border-[#1e2733] bg-[#0d1117] text-[#e2e8f0] hover:bg-[#161b22]"
        style={FONT}
      >
        用 Google 登入
      </Button>

      <p
        className="text-center mt-6 text-sm text-[#94a3b8]"
        style={FONT}
      >
        還沒有帳號？{' '}
        <Link
          to="/signup"
          className="text-[#00e5a0] hover:underline font-bold"
        >
          註冊
        </Link>
      </p>
    </div>
  )
}
