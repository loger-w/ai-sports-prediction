import { useTranslation } from '@/lib/i18n'
import type { Translations } from '@/lib/i18n/en'
import type { LineupAnalysis, TeamLineupSummary, LineupTier, HeatLevel } from '@/types/predictions/analysis'

const FONT = { fontFamily: 'var(--font-barlow-condensed)' }

const LT_LABELS: Record<LineupTier, keyof Translations['analysis']> = {
  ELITE: 'ltElite',
  STRONG: 'ltStrong',
  AVERAGE: 'ltAverage',
  BELOW_AVERAGE: 'ltBelow',
  WEAK: 'ltWeak',
}
const LT_COLORS: Record<LineupTier, string> = {
  ELITE: '#00e5a0',
  STRONG: '#3b82f6',
  AVERAGE: '#a0aec0',
  BELOW_AVERAGE: '#f59e0b',
  WEAK: '#ef4444',
}
const HEAT_LABELS: Record<HeatLevel, keyof Translations['analysis']> = {
  ON_FIRE: 'heatOnFire',
  HOT: 'heatHot',
  NORMAL: 'heatNormal',
  COLD: 'heatCold',
  ICE_COLD: 'heatIceCold',
}
const HEAT_COLORS: Record<HeatLevel, string> = {
  ON_FIRE: '#ef4444',
  HOT: '#f59e0b',
  NORMAL: '#a0aec0',
  COLD: '#3b82f6',
  ICE_COLD: '#6366f1',
}

function TeamLineup({ data }: { data: TeamLineupSummary }) {
  const { t } = useTranslation()

  return (
    <div>
      {/* Team header with badges */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[13px] font-black text-[#e2e8f0] uppercase" style={FONT}>
          {data.team}
        </span>
        <span
          className="text-[9px] font-bold px-1.5 py-0.5 rounded"
          style={{
            ...FONT,
            color: LT_COLORS[data.tier],
            backgroundColor: `${LT_COLORS[data.tier]}15`,
          }}
        >
          {t.analysis[LT_LABELS[data.tier]]}
        </span>
        <span
          className="text-[9px] font-bold px-1.5 py-0.5 rounded"
          style={{
            ...FONT,
            color: HEAT_COLORS[data.recent_heat],
            backgroundColor: `${HEAT_COLORS[data.recent_heat]}15`,
          }}
        >
          {t.analysis[HEAT_LABELS[data.recent_heat]]}
        </span>
      </div>

      {/* Team averages */}
      <div className="grid grid-cols-4 gap-2 mb-3 text-center">
        {([
          ['OPS', data.avg_ops.toFixed(3)],
          ['xwOBA', data.avg_xwoba?.toFixed(3) ?? '—'],
          ['K%', data.avg_k_pct.toFixed(1)],
          ['BB%', data.avg_bb_pct.toFixed(1)],
        ] as const).map(([label, value]) => (
          <div key={label}>
            <div className="text-[13px] font-bold text-[#e2e8f0]" style={FONT}>{value}</div>
            <div className="text-[9px] text-[#4a5568] uppercase" style={FONT}>{label}</div>
          </div>
        ))}
      </div>

      {/* Lineup table */}
      <div className="overflow-x-auto -mx-5 px-5">
        <table className="w-full text-[11px]" style={FONT}>
          <thead>
            <tr className="text-[9px] text-[#4a5568] uppercase">
              <th className="text-left py-1 pr-2">#</th>
              <th className="text-left py-1 pr-2">Name</th>
              <th className="text-left py-1 pr-2">Pos</th>
              <th className="text-right py-1 pr-2">OPS</th>
              <th className="text-right py-1 pr-2">xwOBA</th>
              <th className="text-right py-1">L7 OPS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e2733]">
            {data.lineup.map((h, i) => {
              const l7ops = parseFloat(h.last_7.ops)
              const l7Color = l7ops >= 0.800 ? '#00e5a0' : l7ops <= 0.500 ? '#ef4444' : '#a0aec0'
              return (
                <tr key={h.mlbam_id}>
                  <td className="py-1.5 pr-2 text-[#4a5568]">{i + 1}</td>
                  <td className="py-1.5 pr-2 text-[#a0aec0] font-bold truncate max-w-[100px]">
                    {h.name}
                  </td>
                  <td className="py-1.5 pr-2 text-[#4a5568]">{h.position}</td>
                  <td className="py-1.5 pr-2 text-right text-[#e2e8f0] tabular-nums">
                    {h.ops.toFixed(3)}
                  </td>
                  <td className="py-1.5 pr-2 text-right text-[#a0aec0] tabular-nums">
                    {h.xwoba?.toFixed(3) ?? '—'}
                  </td>
                  <td className="py-1.5 text-right tabular-nums" style={{ color: l7Color }}>
                    {h.last_7.ops}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

interface LineupCardProps {
  data: LineupAnalysis
}

export function LineupCard({ data }: LineupCardProps) {
  const { t } = useTranslation()

  return (
    <div className="rounded-[10px] border border-[#1e2733] bg-[#161b22] overflow-hidden">
      <div className="px-5 py-3 border-b border-[#1e2733] flex items-center justify-between">
        <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-[#3a4a5a]" style={FONT}>
          {t.analysis.lineupAnalysis}
        </span>
        {data.advantage !== 'even' && (
          <span className="text-[10px] font-bold text-[#00e5a0]" style={FONT}>
            {t.analysis.advantage}: {data.advantage === 'home' ? data.home.team : data.away.team}
          </span>
        )}
      </div>
      <div className="px-5 py-4 space-y-6">
        <TeamLineup data={data.away} />
        <div className="border-t border-[#1e2733]" />
        <TeamLineup data={data.home} />
      </div>
    </div>
  )
}
