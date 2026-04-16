import { useTranslation } from '@/lib/i18n'
import type { Translations } from '@/lib/i18n/en'
import type { WinProbability, MatchMeta, CrossValidation, Confidence } from '@/types/predictions/analysis'

const FONT = { fontFamily: 'var(--font-barlow-condensed)' }

const CV_LABELS: Record<CrossValidation, keyof Translations['analysis']> = {
  CONSISTENT: 'cvConsistent',
  DIVERGENT: 'cvDivergent',
  INSUFFICIENT_SAMPLE: 'cvInsufficient',
}
const CV_COLORS: Record<CrossValidation, string> = {
  CONSISTENT: '#00e5a0',
  DIVERGENT: '#f59e0b',
  INSUFFICIENT_SAMPLE: '#a0aec0',
}
const CONF_LABELS: Record<Confidence, keyof Translations['analysis']> = {
  HIGH: 'confHigh',
  MEDIUM: 'confMedium',
  LOW: 'confLow',
}
const CONF_COLORS: Record<Confidence, string> = {
  HIGH: '#00e5a0',
  MEDIUM: '#f59e0b',
  LOW: '#ef4444',
}

function ProbBar({ label, homePct, homeTeam, awayTeam }: {
  label: string; homePct: number; homeTeam: string; awayTeam: string
}) {
  const awayPct = 100 - homePct
  return (
    <div className="mb-3 last:mb-0">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-[#4a5568]" style={FONT}>
          {awayTeam} {awayPct.toFixed(1)}%
        </span>
        <span className="text-[10px] text-[#4a5568] uppercase tracking-wide" style={FONT}>
          {label}
        </span>
        <span className="text-[10px] text-[#4a5568]" style={FONT}>
          {homePct.toFixed(1)}% {homeTeam}
        </span>
      </div>
      <div className="h-3 rounded-full overflow-hidden flex bg-[#0d1117]">
        <div
          className="h-full rounded-l-full"
          style={{ width: `${awayPct}%`, backgroundColor: '#3b82f6' }}
        />
        <div
          className="h-full rounded-r-full"
          style={{ width: `${homePct}%`, backgroundColor: '#00e5a0' }}
        />
      </div>
    </div>
  )
}

interface WinProbabilityCardProps {
  data: WinProbability
  meta: MatchMeta
}

export function WinProbabilityCard({ data, meta }: WinProbabilityCardProps) {
  const { t } = useTranslation()

  return (
    <div className="rounded-[10px] border border-[#1e2733] bg-[#161b22] overflow-hidden">
      <div className="px-5 py-3 border-b border-[#1e2733] flex items-center justify-between">
        <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-[#3a4a5a]" style={FONT}>
          {t.analysis.winProbability}
        </span>
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded"
            style={{
              ...FONT,
              color: CV_COLORS[data.cross_validation],
              backgroundColor: `${CV_COLORS[data.cross_validation]}15`,
            }}
          >
            {t.analysis[CV_LABELS[data.cross_validation]]}
          </span>
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded"
            style={{
              ...FONT,
              color: CONF_COLORS[data.confidence],
              backgroundColor: `${CONF_COLORS[data.confidence]}15`,
            }}
          >
            {t.analysis[CONF_LABELS[data.confidence]]}
          </span>
        </div>
      </div>
      <div className="px-5 py-4">
        <ProbBar label="XGBoost" homePct={data.xgboost_home_pct} homeTeam={meta.home_team} awayTeam={meta.away_team} />
        <ProbBar label="Log5" homePct={data.log5_home_pct} homeTeam={meta.home_team} awayTeam={meta.away_team} />
        <ProbBar label="Pythag" homePct={data.pythag_home_pct} homeTeam={meta.home_team} awayTeam={meta.away_team} />
      </div>
    </div>
  )
}
