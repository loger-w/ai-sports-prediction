import type { ReactNode } from 'react'
import { AppHeader } from './AppHeader'
import { AppFooter } from './AppFooter'

interface SimpleLayoutProps {
  children: ReactNode
}

export function SimpleLayout({ children }: SimpleLayoutProps) {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
      <AppHeader />
      <main className="pt-[52px] flex-1 p-4 md:p-6">{children}</main>
      <AppFooter />
    </div>
  )
}
