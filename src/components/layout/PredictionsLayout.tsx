import type { ReactNode } from 'react'
import { AppHeader } from './AppHeader'
import { AppSidebar } from './AppSidebar'
import { AppFooter } from './AppFooter'
import { MobileFilterBar } from './MobileFilterBar'

interface PredictionsLayoutProps {
  children: ReactNode
}

export function PredictionsLayout({ children }: PredictionsLayoutProps) {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
      <AppHeader />
      <AppSidebar />
      <div className="pt-[52px] md:ml-[200px] flex flex-col flex-1">
        <MobileFilterBar />
        <main className="p-4 md:p-6 flex-1">{children}</main>
        <AppFooter />
      </div>
    </div>
  )
}
