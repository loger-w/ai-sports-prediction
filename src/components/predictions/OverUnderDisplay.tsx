import { useTranslation } from '@/lib/i18n'

interface OverUnderDisplayProps {
  overUnderLine: number | null
  overPct: number | null
  underPct: number | null
  predictedWinner: 'home' | 'away'
  homeAbbr: string
  awayAbbr: string
}

export function OverUnderDisplay({
  overUnderLine,
  overPct,
  underPct,
  predictedWinner,
  homeAbbr,
  awayAbbr,
}: OverUnderDisplayProps) {
  const { t } = useTranslation()

  const winnerAbbr = predictedWinner === 'home' ? homeAbbr : awayAbbr

  if (!overUnderLine) {
    return (
      <div className="flex justify-between items-center pt-3 border-t border-[#1e2733]">
        <div>
          <div
            className="text-[9px] font-bold tracking-[0.12em] uppercase text-[#3a4a5a] mb-1"
            style={{ fontFamily: 'var(--font-barlow-condensed)' }}
          >
            {t.predictions.homeWinPct.replace(' %', '')}
          </div>
          <div
            className="text-[15px] font-bold text-[#00e5a0]"
            style={{ fontFamily: 'var(--font-barlow-condensed)' }}
          >
            {winnerAbbr} {t.predictions.vs === 'VS' ? 'WIN' : '勝'}
          </div>
        </div>
      </div>
    )
  }

  const isOver = (overPct ?? 0) >= (underPct ?? 0)
  const pickPct = isOver ? overPct : underPct
  const pickLabel = isOver ? t.predictions.over : t.predictions.under

  return (
    <div className="flex justify-between items-center pt-3 border-t border-[#1e2733]">
      <div>
        <div
          className="text-[9px] font-bold tracking-[0.12em] uppercase text-[#3a4a5a] mb-1"
          style={{ fontFamily: 'var(--font-barlow-condensed)' }}
        >
          {t.predictions.ouLine}
        </div>
        <div
          className="text-[15px] font-bold text-[#a0aec0]"
          style={{ fontFamily: 'var(--font-barlow-condensed)' }}
        >
          {overUnderLine}
        </div>
      </div>

      <div
        className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-bold tracking-wide bg-[rgba(0,229,160,0.1)] text-[#00e5a0]"
        style={{ fontFamily: 'var(--font-barlow-condensed)' }}
      >
        <span>{isOver ? '▲' : '▼'}</span>
        {pickLabel} {pickPct}%
      </div>

      <div>
        <div
          className="text-[9px] font-bold tracking-[0.12em] uppercase text-[#3a4a5a] mb-1 text-right"
          style={{ fontFamily: 'var(--font-barlow-condensed)' }}
        >
          AI Pick
        </div>
        <div
          className="text-[15px] font-bold text-[#00e5a0] text-right"
          style={{ fontFamily: 'var(--font-barlow-condensed)' }}
        >
          {winnerAbbr}
        </div>
      </div>
    </div>
  )
}
