import { useTranslation } from '@/lib/i18n'
import type { Translations } from '@/lib/i18n/en'
import type { BullpenAndInjuries, TeamBullpenAndInjuries, InjuryImpact } from '@/types/predictions/analysis'

const FONT = { fontFamily: 'var(--font-barlow-condensed)' }

const INJ_LABELS: Record<InjuryImpact, keyof Translations['analysis']> = {
  CRITICAL: 'injCritical',
  SIGNIFICANT: 'injSignificant',
  MINOR: 'injMinor',
  NONE: 'injNone',
}
const INJ_COLORS: Record<InjuryImpact, string> = {
  CRITICAL: '#ef4444',
  SIGNIFICANT: '#f59e0b',
  MINOR: '#a0aec0',
  NONE: '#00e5a0',
}

function TeamBullpen({ data, label }: { data: TeamBullpenAndInjuries; label: string }) {
  const { t } = useTranslation()
  const ilAll = [...data.il_pitchers, ...data.il_position_players]

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-bold uppercase tracking-widest text-[#3a4a5a]" style={FONT}>
          {label}
        </span>
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded"
          style={{
            ...FONT,
            color: INJ_COLORS[data.injury_impact_summary],
            backgroundColor: `${INJ_COLORS[data.injury_impact_summary]}15`,
          }}
        >
          {t.analysis[INJ_LABELS[data.injury_impact_summary]]}
        </span>
      </div>
      {data.bullpen_era != null && (
        <div className="text-[11px] text-[#4a5568] mb-2" style={FONT}>
          {t.analysis.bullpenEra}:{' '}
          <span className="text-[#e2e8f0] font-bold">{data.bullpen_era.toFixed(2)}</span>
        </div>
      )}
      {ilAll.length > 0 && (
        <div className="space-y-1">
          {ilAll.map((p) => (
            <div key={p.name} className="flex items-center justify-between text-[11px]" style={FONT}>
              <span className="text-[#a0aec0]">
                {p.name} <span className="text-[#4a5568]">({p.position})</span>
              </span>
              <span className="font-bold" style={{ color: INJ_COLORS[p.impact] }}>
                {p.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

interface BullpenCardProps {
  data: BullpenAndInjuries
}

export function BullpenCard({ data }: BullpenCardProps) {
  const { t } = useTranslation()

  return (
    <div className="rounded-[10px] border border-[#1e2733] bg-[#161b22] overflow-hidden">
      <div className="px-5 py-3 border-b border-[#1e2733]">
        <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-[#3a4a5a]" style={FONT}>
          {t.analysis.bullpenInjuries}
        </span>
      </div>
      <div className="px-5 py-4 grid grid-cols-2 gap-6">
        <TeamBullpen data={data.away} label={data.away.team} />
        <TeamBullpen data={data.home} label={data.home.team} />
      </div>
    </div>
  )
}
