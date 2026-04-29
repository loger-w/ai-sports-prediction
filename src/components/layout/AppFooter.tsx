export function AppFooter() {
  const year = new Date().getFullYear()

  const disclaimer = '本站預測由 AI 模型生成，僅供參考，不構成博彩建議。'

  return (
    <footer className="border-t border-[#1e2733] bg-[#0d1117] px-6 py-4">
      <div className="flex flex-col md:flex-row items-center justify-between gap-2">
        <span
          className="text-[11px] font-bold tracking-wide"
          style={{ fontFamily: 'var(--font-barlow-condensed)', color: '#00e5a0' }}
        >
          AI<span style={{ color: '#4a7a6a' }}>Sports</span>
          <span className="ml-2 text-[#3a4a5a] font-normal">© {year}</span>
        </span>
        <p
          className="text-[10px] text-[#3a4a5a] text-center md:text-right max-w-md"
          style={{ fontFamily: 'var(--font-barlow-condensed)' }}
        >
          {disclaimer}
        </p>
      </div>
    </footer>
  )
}
