import { useTranslation } from '@/lib/i18n'
import type { Translations } from '@/lib/i18n/en'
import type { ScorePrediction, MatchMeta, ScenarioType } from '@/types/predictions/analysis'

const FONT = { fontFamily: 'var(--font-barlow-condensed)' }

const SC_LABELS: Record<ScenarioType, keyof Translations['analysis']> = {
  BLOWOUT_FAV: 'scBlowoutFav',
  COMFORTABLE_FAV: 'scComfyFav',
  CLOSE_FAV: 'scCloseFav',
  CLOSE_DOG: 'scCloseDog',
  COMFORTABLE_DOG: 'scComfyDog',
  BLOWOUT_DOG: 'scBlowoutDog',
}
const SC_COLORS: Record<ScenarioType, string> = {
  BLOWOUT_FAV: '#00e5a0',
  COMFORTABLE_FAV: '#34d399',
  CLOSE_FAV: '#6ee7b7',
  CLOSE_DOG: '#fca5a5',
  COMFORTABLE_DOG: '#f87171',
  BLOWOUT_DOG: '#ef4444',
}

interface ScorePredictionCardProps {
  data: ScorePrediction
  meta: MatchMeta
}

export function ScorePredictionCard({ data, meta }: ScorePredictionCardProps) {
  const { t } = useTranslation()

  return (
    <div className="rounded-[10px] border border-[#1e2733] bg-[#161b22] overflow-hidden">
      <div className="px-5 py-3 border-b border-[#1e2733]">
        <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-[#3a4a5a]" style={FONT}>
          {t.analysis.scorePrediction}
        </span>
      </div>
      <div className="px-5 py-4">
        {/* Predicted score */}
        <div className="flex items-center justify-center gap-6 mb-4">
          <div className="text-center">
            <div className="text-[11px] text-[#4a5568] uppercase tracking-wide mb-1" style={FONT}>
              {meta.away_team}
            </div>
            <div className="text-[36px] font-black text-[#e2e8f0]" style={FONT}>
              {data.away_score}
            </div>
            <div className="text-[10px] text-[#4a5568]" style={FONT}>
              {data.away_range[0]}–{data.away_range[1]}
            </div>
          </div>
          <div className="text-[15px] font-bold text-[#2d3748]" style={FONT}>—</div>
          <div className="text-center">
            <div className="text-[11px] text-[#4a5568] uppercase tracking-wide mb-1" style={FONT}>
              {meta.home_team}
            </div>
            <div className="text-[36px] font-black text-[#e2e8f0]" style={FONT}>
              {data.home_score}
            </div>
            <div className="text-[10px] text-[#4a5568]" style={FONT}>
              {data.home_range[0]}–{data.home_range[1]}
            </div>
          </div>
        </div>
        <div className="text-center text-[12px] text-[#4a5568] mb-4" style={FONT}>
          Total: <span className="text-[#e2e8f0] font-bold">{data.total}</span>
        </div>

        {/* Scenario distribution */}
        {data.scenarios.length > 0 && (
          <>
            <div className="text-[9px] font-bold tracking-[0.2em] uppercase text-[#3a4a5a] mb-2" style={FONT}>
              {t.analysis.scenarios}
            </div>
            {/* Stacked bar */}
            <div className="h-5 rounded-full overflow-hidden flex mb-3">
              {data.scenarios.map((s) => (
                <div
                  key={s.type}
                  className="h-full"
                  style={{
                    width: `${s.pct}%`,
                    backgroundColor: SC_COLORS[s.type],
                    opacity: 0.8,
                  }}
                  title={`${t.analysis[SC_LABELS[s.type]]}: ${s.pct}%`}
                />
              ))}
            </div>
            {/* Legend */}
            <div className="grid grid-cols-3 gap-1">
              {data.scenarios.map((s) => (
                <div key={s.type} className="flex items-center gap-1.5">
                  <div
                    className="w-2 h-2 rounded-sm shrink-0"
                    style={{ backgroundColor: SC_COLORS[s.type] }}
                  />
                  <span className="text-[10px] text-[#4a5568] truncate" style={FONT}>
                    {t.analysis[SC_LABELS[s.type]]} {s.pct}%
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
