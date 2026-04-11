import { useTranslation } from '@/lib/i18n'
import { WinProbabilityBar } from '@/components/predictions/WinProbabilityBar'
import { OverUnderDisplay } from '@/components/predictions/OverUnderDisplay'
import type { GameWithPrediction } from '@/services/predictions/api'

interface PredictionBreakdownProps {
  game: GameWithPrediction
}

const CONF_COLOR: Record<string, string> = {
  high: '#00e5a0',
  medium: '#fbbf24',
  low: '#6b7280',
}

const CONF_BG: Record<string, string> = {
  high: 'rgba(0,229,160,0.12)',
  medium: 'rgba(251,191,36,0.10)',
  low: 'rgba(107,114,128,0.12)',
}

const FONT = { fontFamily: 'var(--font-barlow-condensed)' }

export function PredictionBreakdown({ game }: PredictionBreakdownProps) {
  const { t, lang } = useTranslation()
  const prediction = game.predictions[0]

  if (!prediction) return null

  const confLabel =
    prediction.confidence_level === 'high'
      ? t.predictions.confidence.high
      : prediction.confidence_level === 'medium'
        ? t.predictions.confidence.medium
        : t.predictions.confidence.low

  const explanation = lang === 'zh' ? prediction.explanation_zh : prediction.explanation_en

  return (
    <div className="space-y-4">
      {/* Win probability */}
      <div className="rounded-[10px] border border-[#1e2733] bg-[#161b22] px-5 py-4">
        <div className="flex items-center justify-between mb-4">
          <span
            className="text-[9px] font-bold tracking-[0.2em] uppercase text-[#3a4a5a]"
            style={FONT}
          >
            {t.gameDetail.winProbability}
          </span>
          <span
            className="text-[10px] font-bold tracking-[0.12em] px-2 py-0.5 rounded"
            style={{
              ...FONT,
              color: CONF_COLOR[prediction.confidence_level] ?? CONF_COLOR.low,
              background: CONF_BG[prediction.confidence_level] ?? CONF_BG.low,
            }}
          >
            {confLabel}
          </span>
        </div>
        <WinProbabilityBar
          homeWinPct={prediction.home_win_pct}
          awayWinPct={prediction.away_win_pct}
          homeLabel={t.predictions.homeWinPct}
          awayLabel={t.predictions.awayWinPct}
        />
      </div>

      {/* Over / Under */}
      <div className="rounded-[10px] border border-[#1e2733] bg-[#161b22] px-5 py-4">
        <div className="mb-4">
          <span
            className="text-[9px] font-bold tracking-[0.2em] uppercase text-[#3a4a5a]"
            style={FONT}
          >
            {t.gameDetail.overUnder}
          </span>
        </div>
        <OverUnderDisplay
          overUnderLine={prediction.over_under_line}
          overPct={prediction.over_pct}
          underPct={prediction.under_pct}
          predictedWinner={prediction.predicted_winner}
          homeAbbr={game.home_team.abbreviation}
          awayAbbr={game.away_team.abbreviation}
        />
      </div>

      {/* AI Explanation */}
      {explanation ? (
        <div className="rounded-[10px] border border-[#1e2733] bg-[#161b22] px-5 py-4">
          <div className="mb-3">
            <span
              className="text-[9px] font-bold tracking-[0.2em] uppercase text-[#3a4a5a]"
              style={FONT}
            >
              {t.gameDetail.explanation}
            </span>
          </div>
          <p
            className="text-[13px] text-[#a0aec0] leading-relaxed"
            style={FONT}
          >
            {explanation}
          </p>
        </div>
      ) : null}
    </div>
  )
}
