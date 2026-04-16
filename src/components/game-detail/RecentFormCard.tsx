import { useTranslation } from '@/lib/i18n'
import type { RecentForm, MatchMeta, TeamRecentForm } from '@/types/predictions/analysis'

const FONT = { fontFamily: 'var(--font-barlow-condensed)' }

function TeamForm({ form, team, align }: { form: TeamRecentForm; team: string; align: 'left' | 'right' }) {
  const { t } = useTranslation()
  const isRight = align === 'right'

  return (
    <div className={isRight ? 'text-right' : ''}>
      <div className="text-[11px] font-bold uppercase tracking-widest text-[#3a4a5a] mb-2" style={FONT}>
        {team}
      </div>
      <div className="text-[22px] font-black text-[#e2e8f0] mb-1" style={FONT}>
        {form.record_10}
      </div>
      <div className="text-[11px] text-[#4a5568] mb-2" style={FONT}>
        {t.analysis.streak}:{' '}
        <span style={{ color: form.streak > 0 ? '#00e5a0' : form.streak < 0 ? '#ef4444' : '#a0aec0' }}>
          {form.streak > 0 ? `${form.streak}W` : `${Math.abs(form.streak)}L`}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-[16px] font-bold text-[#e2e8f0]" style={FONT}>{form.rs_per_game.toFixed(1)}</div>
          <div className="text-[9px] text-[#4a5568] uppercase" style={FONT}>{t.analysis.runsScored}</div>
        </div>
        <div>
          <div className="text-[16px] font-bold text-[#e2e8f0]" style={FONT}>{form.ra_per_game.toFixed(1)}</div>
          <div className="text-[9px] text-[#4a5568] uppercase" style={FONT}>{t.analysis.runsAllowed}</div>
        </div>
        <div>
          <div
            className="text-[16px] font-bold"
            style={{ ...FONT, color: form.run_diff > 0 ? '#00e5a0' : form.run_diff < 0 ? '#ef4444' : '#a0aec0' }}
          >
            {form.run_diff > 0 ? '+' : ''}{form.run_diff}
          </div>
          <div className="text-[9px] text-[#4a5568] uppercase" style={FONT}>{t.analysis.runDiff}</div>
        </div>
      </div>
      {/* Last 5 results */}
      <div className={`flex gap-1 mt-3 ${isRight ? 'justify-end' : ''}`}>
        {form.last_5_results.map((r, i) => (
          <span
            key={i}
            className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold"
            style={{
              ...FONT,
              backgroundColor: r === 'W' ? '#00e5a015' : '#ef444415',
              color: r === 'W' ? '#00e5a0' : '#ef4444',
            }}
          >
            {r}
          </span>
        ))}
      </div>
    </div>
  )
}

interface RecentFormCardProps {
  data: RecentForm
  meta: MatchMeta
}

export function RecentFormCard({ data, meta }: RecentFormCardProps) {
  const { t } = useTranslation()

  return (
    <div className="rounded-[10px] border border-[#1e2733] bg-[#161b22] overflow-hidden">
      <div className="px-5 py-3 border-b border-[#1e2733]">
        <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-[#3a4a5a]" style={FONT}>
          {t.analysis.recentForm}
        </span>
      </div>
      <div className="px-5 py-4 grid grid-cols-2 gap-6">
        <TeamForm form={data.away} team={meta.away_team} align="left" />
        <TeamForm form={data.home} team={meta.home_team} align="right" />
      </div>
      {data.series_prev && (
        <div className="px-5 py-2.5 border-t border-[#1e2733] text-center">
          <span className="text-[10px] text-[#4a5568]" style={FONT}>
            {t.analysis.seriesPrev}: {meta.away_team} {data.series_prev.away_score} — {data.series_prev.home_score} {meta.home_team}
          </span>
        </div>
      )}
    </div>
  )
}
