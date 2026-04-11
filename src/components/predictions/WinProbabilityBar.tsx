interface WinProbabilityBarProps {
  homeWinPct: number
  awayWinPct: number
  homeLabel: string
  awayLabel: string
}

export function WinProbabilityBar({
  homeWinPct,
  awayWinPct,
  homeLabel,
  awayLabel,
}: WinProbabilityBarProps) {
  return (
    <div>
      <div className="flex justify-between items-end mb-1.5">
        <div>
          <div
            className="text-[9px] font-bold tracking-[0.12em] uppercase text-[#3a4a5a] mb-1"
            style={{ fontFamily: 'var(--font-barlow-condensed)' }}
          >
            {homeLabel}
          </div>
          <div
            className="text-[22px] font-black leading-none text-[#00e5a0]"
            style={{ fontFamily: 'var(--font-barlow-condensed)' }}
          >
            {homeWinPct}%
          </div>
        </div>
        <div className="text-right">
          <div
            className="text-[9px] font-bold tracking-[0.12em] uppercase text-[#3a4a5a] mb-1"
            style={{ fontFamily: 'var(--font-barlow-condensed)' }}
          >
            {awayLabel}
          </div>
          <div
            className="text-[22px] font-black leading-none text-[#2d3748]"
            style={{ fontFamily: 'var(--font-barlow-condensed)' }}
          >
            {awayWinPct}%
          </div>
        </div>
      </div>
      <div className="h-1.5 bg-[#1e2733] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${homeWinPct}%`,
            background: 'linear-gradient(90deg, #00e5a0, #00b37a)',
          }}
        />
      </div>
    </div>
  )
}
