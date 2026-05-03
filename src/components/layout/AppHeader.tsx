import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import { UserMenu } from './UserMenu'

const FONT = { fontFamily: 'var(--font-barlow-condensed)' as const }

export function AppHeader() {
  const { t, lang } = useTranslation()

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-[52px] border-b border-[#1e2733] bg-[#0d1117] flex items-center px-4 gap-6">
      <span
        className="text-[17px] font-black tracking-wide shrink-0"
        style={{ ...FONT, color: '#00e5a0' }}
      >
        AI<span style={{ color: '#4a7a6a' }}>Sports</span>
      </span>

      <nav className="flex items-center gap-1 flex-1">
        <Link
          to="/$lang/predictions"
          params={{ lang }}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-bold tracking-widest uppercase transition-colors',
            'text-[#94a3b8] hover:text-[#e2e8f0]',
          )}
          activeProps={{
            className:
              'flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-bold tracking-widest uppercase bg-[rgba(0,229,160,0.12)] text-[#00e5a0]',
          }}
          style={FONT}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current" />
          {t.nav.predictions}
        </Link>
        <Link
          to="/$lang/accuracy"
          params={{ lang }}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-bold tracking-widest uppercase transition-colors',
            'text-[#94a3b8] hover:text-[#e2e8f0]',
          )}
          activeProps={{
            className:
              'flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-bold tracking-widest uppercase bg-[rgba(0,229,160,0.12)] text-[#00e5a0]',
          }}
          style={FONT}
        >
          {t.nav.accuracy}
        </Link>
      </nav>

      <UserMenu />
    </header>
  )
}
