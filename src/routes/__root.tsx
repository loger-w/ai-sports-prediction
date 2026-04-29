import { Link, Outlet, createRootRoute } from '@tanstack/react-router'
import { Analytics } from '@vercel/analytics/react'

const FONT = { fontFamily: 'var(--font-barlow-condensed)' }

function RootErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="text-center space-y-4 px-6">
        <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-[#3a4a5a]" style={FONT}>
          Error
        </p>
        <p className="text-[28px] font-black text-[#00e5a0]" style={FONT}>
          Something went wrong
        </p>
        <p className="text-[#4a5568] text-sm max-w-sm mx-auto" style={FONT}>
          {error.message}
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 rounded text-[12px] font-bold tracking-wide bg-[rgba(0,229,160,0.1)] text-[#00e5a0] border border-[rgba(0,229,160,0.25)] hover:brightness-110 transition-all"
          style={FONT}
        >
          Try again
        </button>
      </div>
    </div>
  )
}

function RootNotFoundComponent() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="text-center space-y-4 px-6">
        <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-[#3a4a5a]" style={FONT}>
          404
        </p>
        <p className="text-[28px] font-black text-[#00e5a0]" style={FONT}>
          Page Not Found
        </p>
        <p className="text-[#4a5568] text-sm max-w-xs mx-auto" style={FONT}>
          The page you're looking for doesn't exist.
        </p>
        <Link
          to="/"
          className="inline-block px-4 py-2 rounded text-[12px] font-bold tracking-wide bg-[rgba(0,229,160,0.1)] text-[#00e5a0] border border-[rgba(0,229,160,0.25)] hover:brightness-110 transition-all"
          style={FONT}
        >
          ← Back to Home
        </Link>
      </div>
    </div>
  )
}

export const Route = createRootRoute({
  errorComponent: RootErrorComponent,
  notFoundComponent: RootNotFoundComponent,
  component: () => (
    <div className="min-h-screen bg-background text-foreground">
      <Outlet />
      <Analytics />
    </div>
  ),
})
