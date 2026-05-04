import { createFileRoute, Link } from '@tanstack/react-router'
import { SimpleLayout } from '@/components/layout/SimpleLayout'

const FONT = { fontFamily: 'var(--font-barlow-condensed)' as const }

export const Route = createFileRoute('/upgrade')({
  component: UpgradePage,
})

function UpgradePage() {
  return (
    <SimpleLayout>
      <div className="max-w-xl mx-auto pt-16 px-4" style={FONT}>
        <div className="rounded-[10px] border border-[#1e2733] bg-[#161b22] p-8 space-y-5">
          <div className="flex items-center gap-3">
            <span aria-hidden className="text-3xl">🔒</span>
            <h1 className="text-2xl font-black text-[#e2e8f0]">升級為 Premium</h1>
          </div>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed">
            部分高星等推薦為 Premium 訂閱使用者專屬。升級後可解鎖所有讓分、大小分等進階盤口的選邊與星等。
          </p>
          <div className="border-t border-[#1e2733] pt-5 space-y-2">
            <p className="text-[13px] uppercase tracking-widest text-[#94a3b8]">如何升級</p>
            <p className="text-[15px] text-[#e2e8f0]">
              目前 Premium 等級採人工審核。請寄信至{' '}
              <a
                href="mailto:winston7474@gmail.com?subject=Premium%20%E5%8D%87%E7%B4%9A%E7%94%B3%E8%AB%8B"
                className="text-[#00e5a0] font-bold hover:underline"
              >
                winston7474@gmail.com
              </a>{' '}
              並附上你註冊的帳號 email，我們收到後會手動將帳號切換為 Premium。
            </p>
          </div>
          <div className="pt-2">
            <Link
              to="/"
              className="inline-flex items-center gap-1 text-sm font-bold text-[#00e5a0] hover:underline"
            >
              ← 返回首頁
            </Link>
          </div>
        </div>
      </div>
    </SimpleLayout>
  )
}
