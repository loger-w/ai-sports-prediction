import { useState, type FormEvent } from 'react'
import { Link } from '@tanstack/react-router'
import { toast } from 'sonner'
import { authClient } from '@/lib/auth/authClient'
import { Button } from '@/components/ui/button'

const FONT = { fontFamily: 'var(--font-barlow-condensed)' as const }

export function SignupForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [verificationSent, setVerificationSent] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const { error } = await authClient.signUpWithEmail(email, password)
    setSubmitting(false)
    if (error) {
      toast.error(error.message)
      return
    }
    setVerificationSent(true)
  }

  async function handleGoogle() {
    const { error } = await authClient.signInWithGoogle()
    if (error) toast.error(error.message)
  }

  if (verificationSent) {
    return (
      <div className="max-w-md mx-auto py-12 px-4 text-center">
        <h1
          className="text-3xl font-black text-[#00e5a0] mb-4"
          style={FONT}
        >
          驗證信已寄出
        </h1>
        <p className="text-[#94a3b8] mb-2" style={FONT}>
          請至 <span className="text-[#e2e8f0] font-bold">{email}</span> 收信，
        </p>
        <p className="text-[#94a3b8] mb-8" style={FONT}>
          點擊驗證連結後即可登入。
        </p>
        <Link
          to="/login"
          className="inline-block px-4 py-2 rounded text-sm font-bold bg-[rgba(0,229,160,0.1)] text-[#00e5a0] border border-[rgba(0,229,160,0.25)] hover:brightness-110 transition-all"
          style={FONT}
        >
          回到登入頁
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <h1
        className="text-3xl font-black text-[#e2e8f0] mb-8 text-center"
        style={FONT}
      >
        註冊
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
          minLength={6}
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
          {submitting ? '處理中…' : '註冊'}
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
        用 Google 註冊
      </Button>

      <p
        className="text-center mt-6 text-sm text-[#94a3b8]"
        style={FONT}
      >
        已有帳號？{' '}
        <Link
          to="/login"
          className="text-[#00e5a0] hover:underline font-bold"
        >
          登入
        </Link>
      </p>
    </div>
  )
}
