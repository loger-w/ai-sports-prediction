import { useTranslation } from '@/lib/i18n'
import type { Translations } from '@/lib/i18n/en'
import type {
  BettingRecommendations,
  MarketRecommendation,
  BetDirection,
  BetReasonCode,
  RiskLevel,
} from '@/types/predictions/analysis'

const FONT = { fontFamily: 'var(--font-barlow-condensed)' }

const DIR_LABELS: Record<BetDirection, string> = {
  HOME: 'Home', AWAY: 'Away', OVER: 'Over', UNDER: 'Under', PASS: 'PASS',
}
const RISK_LABELS: Record<RiskLevel, keyof Translations['analysis']> = {
  LOW: 'riskLow', MEDIUM: 'riskMedium', HIGH: 'riskHigh',
}
const RISK_COLORS: Record<RiskLevel, string> = {
  LOW: '#00e5a0', MEDIUM: '#f59e0b', HIGH: '#ef4444',
}
const REASON_LABELS: Record<BetReasonCode, keyof Translations['analysis']> = {
  PITCHER_MISMATCH: 'rcPitcherMismatch',
  LINEUP_ADVANTAGE: 'rcLineupAdvantage',
  BULLPEN_EDGE: 'rcBullpenEdge',
  RECENT_FORM: 'rcRecentForm',
  VALUE_ODDS: 'rcValueOdds',
  INJURY_IMPACT: 'rcInjuryImpact',
  REGRESSION_EXPECTED: 'rcRegression',
  PLATOON_EDGE: 'rcPlatoonEdge',
  BVP_ADVANTAGE: 'rcBvpAdvantage',
  CONSISTENT_MODELS: 'rcConsistentModels',
  LOW_TOTAL_PITCHING: 'rcLowTotalPitching',
  HIGH_TOTAL_OFFENSE: 'rcHighTotalOffense',
}

function Stars({ count }: { count: number }) {
  return (
    <span className="text-[12px]" style={FONT}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} style={{ color: i < count ? '#fbbf24' : '#2d3748' }}>
          ★
        </span>
      ))}
    </span>
  )
}

function MarketCard({ market, label }: { market: MarketRecommendation; label: string }) {
  const { t } = useTranslation()
  const isPass = market.direction === 'PASS'

  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[13px] font-bold uppercase tracking-wide text-[#3a4a5a]" style={FONT}>
          {label}
        </span>
        <Stars count={market.stars} />
      </div>
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-[18px] font-black"
          style={{ ...FONT, color: isPass ? '#4a5568' : '#e2e8f0' }}
        >
          {isPass ? 'PASS' : DIR_LABELS[market.direction]}
          {market.line != null && !isPass && ` ${market.line > 0 ? '+' : ''}${market.line}`}
        </span>
        <span
          className="text-[13px] font-bold px-1.5 py-0.5 rounded"
          style={{
            ...FONT,
            color: RISK_COLORS[market.risk],
            backgroundColor: `${RISK_COLORS[market.risk]}15`,
          }}
        >
          {t.analysis[RISK_LABELS[market.risk]]}
        </span>
      </div>
      {!isPass && (
        <>
          <div className="flex items-center gap-3 text-[13px] text-[#4a5568] mb-2" style={FONT}>
            <span>
              {t.analysis.modelPct}:{' '}
              <span className="text-[#e2e8f0] font-bold">{market.model_pct.toFixed(1)}%</span>
            </span>
            <span>
              {t.analysis.impliedPct}:{' '}
              <span className="text-[#a0aec0]">{market.implied_pct.toFixed(1)}%</span>
            </span>
            <span>
              {t.analysis.edge}:{' '}
              <span
                className="font-bold"
                style={{ color: market.edge > 0 ? '#00e5a0' : '#ef4444' }}
              >
                {market.edge > 0 ? '+' : ''}{market.edge.toFixed(1)}%
              </span>
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {market.reasons.map((r) => (
              <span
                key={r}
                className="text-[12px] font-bold px-1.5 py-0.5 rounded bg-[#1e2733] text-[#a0aec0]"
                style={FONT}
              >
                {t.analysis[REASON_LABELS[r]]}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

interface BettingCardProps {
  data: BettingRecommendations
}

export function BettingCard({ data }: BettingCardProps) {
  const { t } = useTranslation()

  return (
    <div className="rounded-[10px] border border-[#1e2733] bg-[#161b22] overflow-hidden">
      <div className="px-5 py-3 border-b border-[#1e2733]">
        <span className="text-[12px] font-bold tracking-[0.2em] uppercase text-[#3a4a5a]" style={FONT}>
          {t.analysis.bettingRec}
        </span>
      </div>
      <div className="divide-y divide-[#1e2733]">
        <MarketCard market={data.moneyline} label={t.predictions.moneyline} />
        <MarketCard market={data.run_line} label={t.predictions.spread} />
        <MarketCard market={data.over_under} label={t.predictions.overUnder} />
      </div>
    </div>
  )
}
