import { useTranslation } from '@/lib/i18n'
import { PredictionColumn } from '@/components/predictions/PredictionColumn'
import type { GameWithPrediction } from '@/services/predictions/api'

interface PredictionBreakdownProps {
  game: GameWithPrediction
}

const FONT = { fontFamily: 'var(--font-barlow-condensed)' }

export function PredictionBreakdown({ game }: PredictionBreakdownProps) {
  const { t, lang } = useTranslation()
  const prediction = game.predictions[0]

  if (!prediction) return null

  const homeTeam = game.home_team
  const awayTeam = game.away_team

  // Moneyline pick text
  const moneylinePick =
    prediction.moneyline_pick === 'home'
      ? homeTeam.abbreviation
      : awayTeam.abbreviation

  // Spread pick text
  let spreadPick = ''
  if (prediction.spread_line !== null && prediction.spread_pick !== null) {
    const abbr =
      prediction.spread_pick === 'home' ? homeTeam.abbreviation : awayTeam.abbreviation
    const line = prediction.spread_line
    spreadPick = `${abbr} ${line > 0 ? '+' : ''}${line}`
  }

  // O/U pick text
  let ouPick = ''
  let ouLineRef: string | null = null
  if (prediction.over_under_line !== null) {
    ouLineRef = String(prediction.over_under_line)
    const isOver = (prediction.over_pct ?? 0) >= (prediction.under_pct ?? 0)
    ouPick = `${isOver ? 'O' : 'U'} ${prediction.over_under_line}`
  }

  const explanation = lang === 'zh' ? prediction.explanation_zh : prediction.explanation_en

  return (
    <div className="space-y-4">
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
          <p className="text-[13px] text-[#a0aec0] leading-relaxed" style={FONT}>
            {explanation}
          </p>
        </div>
      ) : null}

      {/* Three prediction dimensions */}
      <div className="rounded-[10px] border border-[#1e2733] bg-[#161b22] overflow-hidden">
        <div className="px-5 py-3 border-b border-[#1e2733]">
          <span
            className="text-[9px] font-bold tracking-[0.2em] uppercase text-[#3a4a5a]"
            style={FONT}
          >
            {t.gameDetail.aiPick}
          </span>
        </div>
        <div className="grid grid-cols-3">
          <PredictionColumn
            label={t.predictions.moneyline}
            stars={prediction.moneyline_stars}
            pick={moneylinePick}
            pct={
              prediction.moneyline_home_pct > prediction.moneyline_away_pct
                ? prediction.moneyline_home_pct
                : prediction.moneyline_away_pct
            }
            lineRef={null}
          />
          <PredictionColumn
            label={t.predictions.spread}
            stars={prediction.spread_stars}
            pick={spreadPick}
            pct={prediction.spread_pct}
            lineRef={
              prediction.spread_line !== null ? String(prediction.spread_line) : null
            }
          />
          <PredictionColumn
            label={t.predictions.overUnder}
            stars={prediction.over_under_stars}
            pick={ouPick}
            pct={
              (prediction.over_pct ?? 0) >= (prediction.under_pct ?? 0)
                ? prediction.over_pct
                : prediction.under_pct
            }
            lineRef={ouLineRef}
            isLast
          />
        </div>
      </div>
    </div>
  )
}
