import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'

export function AppHeader() {
  const { t, lang } = useTranslation()
  const navigate = useNavigate()
  const params = useParams({ strict: false }) as { lang?: string }
  const currentLang = params.lang ?? 'en'

  function toggleLang() {
    const newLang = currentLang === 'en' ? 'zh' : 'en'
    navigate({ to: '/$lang/predictions', params: { lang: newLang } })
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-[52px] border-b border-[#1e2733] bg-[#0d1117] flex items-center px-4 gap-6">
      {/* Logo */}
      <span
        className="text-[17px] font-black tracking-wide shrink-0"
        style={{ fontFamily: 'var(--font-barlow-condensed)', color: '#00e5a0' }}
      >
        AI<span style={{ color: '#4a7a6a' }}>Sports</span>
      </span>

      {/* Nav */}
      <nav className="flex items-center gap-1 flex-1">
        <Link
          to="/$lang/predictions"
          params={{ lang }}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-bold tracking-widest uppercase transition-colors',
            'text-[#4a5568] hover:text-[#a0aec0]',
          )}
          activeProps={{
            className:
              'flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-bold tracking-widest uppercase bg-[rgba(0,229,160,0.12)] text-[#00e5a0]',
          }}
          style={{ fontFamily: 'var(--font-barlow-condensed)' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current" />
          {t.nav.predictions}
        </Link>
        <Link
          to="/$lang/accuracy"
          params={{ lang }}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-bold tracking-widest uppercase transition-colors',
            'text-[#4a5568] hover:text-[#a0aec0]',
          )}
          activeProps={{
            className:
              'flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-bold tracking-widest uppercase bg-[rgba(0,229,160,0.12)] text-[#00e5a0]',
          }}
          style={{ fontFamily: 'var(--font-barlow-condensed)' }}
        >
          {t.nav.accuracy}
        </Link>
      </nav>

      {/* Language switcher */}
      <button
        onClick={toggleLang}
        className="flex items-center bg-[#161b22] border border-[#1e2733] rounded overflow-hidden shrink-0"
        aria-label="Toggle language"
      >
        <span
          className={cn(
            'px-2.5 py-1 text-[13px] font-bold tracking-wide transition-colors',
            currentLang === 'en'
              ? 'bg-[#1e2733] text-[#00e5a0]'
              : 'text-[#4a5568]',
          )}
          style={{ fontFamily: 'var(--font-barlow-condensed)' }}
        >
          EN
        </span>
        <span
          className={cn(
            'px-2.5 py-1 text-[13px] font-bold tracking-wide transition-colors',
            currentLang === 'zh'
              ? 'bg-[#1e2733] text-[#00e5a0]'
              : 'text-[#4a5568]',
          )}
          style={{ fontFamily: 'var(--font-barlow-condensed)' }}
        >
          中
        </span>
      </button>
    </header>
  )
}
