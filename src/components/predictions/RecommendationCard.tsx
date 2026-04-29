import { useTranslation } from '@/lib/i18n'
import type { RecommendationWithGame } from '@/types/predictions/recommendation'
import { StarRating } from './StarRating'

const FONT = { fontFamily: 'var(--font-barlow-condensed)' as const }

interface Props {
  rec: RecommendationWithGame
}

function timePart(gameTime: string): string {
  // Stored as Taiwan-local "YYYY-MM-DD HH:mm:ss" — extract HH:mm.
  return gameTime.slice(11, 16)
}

function formatPick(rec: RecommendationWithGame, t: ReturnType<typeof useTranslation>['t']): string {
  if (rec.market === 'ml') {
    return rec.pick === 'home' ? rec.game.home_team.abbreviation : rec.game.away_team.abbreviation
  }
  if (rec.market === 'spread') {
    const abbr =
      rec.pick === 'home' ? rec.game.home_team.abbreviation : rec.game.away_team.abbreviation
    const sign = rec.line! >= 0 ? '+' : ''
    return `${abbr} ${sign}${rec.line}`
  }
  // ou
  const label = rec.pick === 'over' ? t.market.over : t.market.under
  return `${label} ${rec.line}`
}

function ResultBadge({ result }: { result: 'win' | 'loss' | 'push' | 'void' }) {
  const { t } = useTranslation()
  const map: Record<typeof result, string> = {
    win: '#00e5a0', loss: '#fc8181', push: '#a0aec0', void: '#4a5568',
  }
  const bgMap: Record<typeof result, string> = {
    win: 'rgba(0,229,160,0.15)',
    loss: 'rgba(252,129,129,0.15)',
    push: 'rgba(160,174,192,0.15)',
    void: 'rgba(74,85,104,0.15)',
  }
  return (
    <span
      className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide"
      style={{ ...FONT, color: map[result], background: bgMap[result] }}
    >
      {t.result[result]}
    </span>
  )
}

export function RecommendationCard({ rec }: Props) {
  const { t } = useTranslation()
  const home = rec.game.home_team
  const away = rec.game.away_team
  const homePicked = rec.pick === 'home' || (rec.market === 'ou')
  const awayPicked = rec.pick === 'away' || (rec.market === 'ou')

  const sportLabel = rec.game.sport_id.toUpperCase()
  const marketLabel = t.market[rec.market]
  const time = timePart(rec.game.game_time)
  const pickText = formatPick(rec, t)

  return (
    <div className="rounded-[10px] border border-[#1e2733] bg-[#161b22] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-[#0d1117] border-b border-[#1e2733]">
        <span
          className="text-[11px] font-bold tracking-[0.18em] uppercase text-[#00e5a0]"
          style={FONT}
        >
          {sportLabel} · {marketLabel}
        </span>
        <div className="flex items-center gap-2">
          {rec.result ? <ResultBadge result={rec.result} /> : null}
          <span className="text-[11px] text-[#3a4a5a]" style={FONT}>{time}</span>
        </div>
      </div>

      {/* Teams */}
      <div className="px-3.5 py-2.5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="min-w-0">
          <div
            data-picked={homePicked}
            className="text-[22px] font-black leading-none mb-0.5"
            style={{
              ...FONT,
              color: homePicked ? '#e2e8f0' : '#2d3748',
            }}
          >
            {home.abbreviation}
          </div>
          <div className="text-[10px] uppercase tracking-widest text-[#3a4a5a] truncate" style={FONT}>
            {home.name_zh}
          </div>
        </div>

        <div className="text-[11px] font-bold text-[#2d3748]" style={FONT}>{t.predictions.vs}</div>

        <div className="text-right min-w-0">
          <div
            data-picked={awayPicked}
            className="text-[22px] font-black leading-none mb-0.5"
            style={{
              ...FONT,
              color: awayPicked ? '#e2e8f0' : '#2d3748',
            }}
          >
            {away.abbreviation}
          </div>
          <div className="text-[10px] uppercase tracking-widest text-[#3a4a5a] truncate" style={FONT}>
            {away.name_zh}
          </div>
        </div>
      </div>

      {/* Pick + Stars */}
      <div className="border-t border-[#1e2733] px-3.5 py-2.5 flex items-center justify-between">
        <span className="text-[14px] font-bold text-[#e2e8f0]" style={FONT}>{pickText}</span>
        <span data-testid="rec-stars" className="flex items-center gap-1">
          <StarRating stars={rec.stars} size={12} />
          <span className="text-[11px] text-[#fbbf24] font-bold" style={FONT}>{rec.stars}</span>
        </span>
      </div>
    </div>
  )
}
