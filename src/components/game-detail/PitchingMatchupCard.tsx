import { useTranslation } from '@/lib/i18n'
import type { Translations } from '@/lib/i18n/en'
import type { PitchingMatchup, PitcherProfile, PitcherTier } from '@/types/predictions/analysis'

const FONT = { fontFamily: 'var(--font-barlow-condensed)' }

const TIER_LABELS: Record<PitcherTier, keyof Translations['analysis']> = {
  ACE: 'tierAce',
  STRONG_ACE: 'tierStrongAce',
  SOLID_STARTER: 'tierSolid',
  BACK_END: 'tierBackEnd',
  BELOW_AVERAGE: 'tierBelow',
}
const TIER_COLORS: Record<PitcherTier, string> = {
  ACE: '#00e5a0',
  STRONG_ACE: '#34d399',
  SOLID_STARTER: '#3b82f6',
  BACK_END: '#f59e0b',
  BELOW_AVERAGE: '#ef4444',
}

const PITCH_COLORS: Record<string, string> = {
  FF: '#ef4444', SI: '#f97316', SL: '#3b82f6', CH: '#8b5cf6', CU: '#06b6d4',
  FC: '#ec4899', KC: '#14b8a6', FS: '#a855f7', SV: '#6366f1', ST: '#2563eb', KN: '#64748b',
}

function PitcherCard({ pitcher }: { pitcher: PitcherProfile }) {
  const { t } = useTranslation()
  const hand = pitcher.pitch_hand === 'R' ? 'RHP' : 'LHP'

  const pitchEntries = Object.entries(pitcher.statcast.pitch_types)
    .sort(([, a], [, b]) => (b ?? 0) - (a ?? 0))

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[16px] font-black text-[#e2e8f0]" style={FONT}>
            {pitcher.name}
          </div>
          <div className="text-[11px] text-[#4a5568]" style={FONT}>
            {hand} · Age {pitcher.age}
          </div>
        </div>
        <span
          className="text-[10px] font-bold px-2 py-1 rounded"
          style={{
            ...FONT,
            color: TIER_COLORS[pitcher.tier],
            backgroundColor: `${TIER_COLORS[pitcher.tier]}15`,
          }}
        >
          {t.analysis[TIER_LABELS[pitcher.tier]]}
        </span>
      </div>

      {/* Season stats */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        {([
          ['ERA', pitcher.season.era.toFixed(2)],
          ['FIP', pitcher.season.fip.toFixed(2)],
          ['WHIP', pitcher.season.whip.toFixed(2)],
          ['K%', pitcher.season.k_pct.toFixed(1)],
        ] as const).map(([label, value]) => (
          <div key={label} className="text-center">
            <div className="text-[14px] font-bold text-[#e2e8f0]" style={FONT}>{value}</div>
            <div className="text-[9px] text-[#4a5568] uppercase" style={FONT}>{label}</div>
          </div>
        ))}
      </div>

      {/* Expected stats */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {([
          ['xERA', pitcher.expected.xera],
          ['xwOBA', pitcher.expected.xwoba],
          ['xBA', pitcher.expected.xba],
        ] as const)
          .filter(([, v]) => v != null)
          .map(([label, value]) => (
            <div key={label} className="text-center">
              <div className="text-[13px] font-bold text-[#a0aec0]" style={FONT}>
                {value!.toFixed(3)}
              </div>
              <div className="text-[9px] text-[#4a5568] uppercase" style={FONT}>{label}</div>
            </div>
          ))}
      </div>

      {/* Pitch mix bar */}
      {pitchEntries.length > 0 && (
        <div className="mb-3">
          <div className="text-[9px] text-[#4a5568] uppercase tracking-wide mb-1" style={FONT}>
            {t.analysis.pitchTypes}
          </div>
          <div className="h-3 rounded-full overflow-hidden flex">
            {pitchEntries.map(([type, pct]) => (
              <div
                key={type}
                className="h-full"
                style={{
                  width: `${pct}%`,
                  backgroundColor: PITCH_COLORS[type] ?? '#64748b',
                  opacity: 0.85,
                }}
                title={`${type}: ${pct}%`}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1">
            {pitchEntries.map(([type, pct]) => (
              <span key={type} className="text-[9px] text-[#4a5568]" style={FONT}>
                <span style={{ color: PITCH_COLORS[type] ?? '#64748b' }}>●</span> {type} {pct}%
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Platoon splits */}
      <div className="text-[9px] text-[#4a5568] uppercase tracking-wide mb-1" style={FONT}>
        {t.analysis.platoonSplits}
      </div>
      <div className="grid grid-cols-2 gap-2 text-[11px]" style={FONT}>
        <div className="rounded bg-[#0d1117] px-2 py-1.5">
          <div className="text-[#4a5568] mb-0.5">vs LHB</div>
          <div className="text-[#a0aec0]">
            {pitcher.platoon_splits.vs_left.avg}/{pitcher.platoon_splits.vs_left.obp}/{pitcher.platoon_splits.vs_left.slg}
          </div>
          <div className="text-[#4a5568]">
            K% {pitcher.platoon_splits.vs_left.k_pct.toFixed(1)} · BB% {pitcher.platoon_splits.vs_left.bb_pct.toFixed(1)}
          </div>
        </div>
        <div className="rounded bg-[#0d1117] px-2 py-1.5">
          <div className="text-[#4a5568] mb-0.5">vs RHB</div>
          <div className="text-[#a0aec0]">
            {pitcher.platoon_splits.vs_right.avg}/{pitcher.platoon_splits.vs_right.obp}/{pitcher.platoon_splits.vs_right.slg}
          </div>
          <div className="text-[#4a5568]">
            K% {pitcher.platoon_splits.vs_right.k_pct.toFixed(1)} · BB% {pitcher.platoon_splits.vs_right.bb_pct.toFixed(1)}
          </div>
        </div>
      </div>
    </div>
  )
}

interface PitchingMatchupCardProps {
  data: PitchingMatchup
}

export function PitchingMatchupCard({ data }: PitchingMatchupCardProps) {
  const { t } = useTranslation()

  return (
    <div className="rounded-[10px] border border-[#1e2733] bg-[#161b22] overflow-hidden">
      <div className="px-5 py-3 border-b border-[#1e2733] flex items-center justify-between">
        <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-[#3a4a5a]" style={FONT}>
          {t.analysis.pitchingMatchup}
        </span>
        {data.advantage !== 'even' && (
          <span className="text-[10px] font-bold text-[#00e5a0]" style={FONT}>
            {t.analysis.advantage}: {data.advantage === 'home' ? data.home_sp.name : data.away_sp.name}
          </span>
        )}
      </div>
      <div className="px-5 py-4 grid grid-cols-1 md:grid-cols-2 gap-6">
        <PitcherCard pitcher={data.away_sp} />
        <PitcherCard pitcher={data.home_sp} />
      </div>
    </div>
  )
}
