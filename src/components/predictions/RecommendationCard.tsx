import { Link } from '@tanstack/react-router'
import { useTranslation } from '@/lib/i18n'
import type { RecResult, RecommendationWithGame } from '@/types/predictions/recommendation'
import { StarRating } from './StarRating'
import { VoteButtons } from './VoteButtons'

const FONT = { fontFamily: 'var(--font-barlow-condensed)' as const }

const RESULT_FG: Record<RecResult, string> = {
  win: '#00e5a0',
  loss: '#fc8181',
  push: '#a0aec0',
  void: '#94a3b8',
}

const RESULT_BG: Record<RecResult, string> = {
  win: 'rgba(0,229,160,0.15)',
  loss: 'rgba(252,129,129,0.15)',
  push: 'rgba(160,174,192,0.15)',
  void: 'rgba(148,163,184,0.15)',
}

interface Props {
  rec: RecommendationWithGame
}

function timePart(gameTime: string): string {
  // Stored as Taiwan-local "YYYY-MM-DD HH:mm:ss" — extract HH:mm.
  return gameTime.slice(11, 16)
}

function formatPick(rec: RecommendationWithGame, t: ReturnType<typeof useTranslation>['t']): string {
  if (rec.pick === null) return '—'
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

function ResultBadge({ result }: { result: RecResult }) {
  const { t } = useTranslation()
  return (
    <span
      className="px-2 py-0.5 rounded-full text-[14px] font-bold tracking-wide"
      style={{ ...FONT, color: RESULT_FG[result], background: RESULT_BG[result] }}
    >
      {t.result[result]}
    </span>
  )
}

export function RecommendationCard({ rec }: Props) {
  const { t } = useTranslation()
  const home = rec.game.home_team
  const away = rec.game.away_team
  const isLocked = rec.audience === 'premium' && rec.pick === null
  const homePicked = !isLocked && (rec.pick === 'home' || rec.market === 'ou')
  const awayPicked = !isLocked && (rec.pick === 'away' || rec.market === 'ou')

  const sportLabel = rec.game.sport_id.toUpperCase()
  const marketLabel = t.market[rec.market]
  const time = timePart(rec.game.game_time)
  const pickText = formatPick(rec, t)

  return (
    <div className="rounded-[10px] border border-[#1e2733] bg-[#161b22] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-[#0d1117] border-b border-[#1e2733]">
        <span
          className="text-[15px] font-bold tracking-[0.18em] uppercase text-[#00e5a0]"
          style={FONT}
        >
          {sportLabel} · {marketLabel}
        </span>
        <div className="flex items-center gap-2">
          {rec.result ? <ResultBadge result={rec.result} /> : null}
          <span className="text-[15px] text-[#94a3b8]" style={FONT}>{time}</span>
        </div>
      </div>

      {/* Teams: away on left, home on right (MLB convention) */}
      <div className="px-3.5 py-2.5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="min-w-0">
          <div
            data-picked={awayPicked}
            className="text-[26px] font-black leading-none mb-0.5"
            style={{
              ...FONT,
              color: awayPicked ? '#e2e8f0' : '#6b7280',
            }}
          >
            {away.abbreviation}
          </div>
          <div className="text-[17px] text-[#94a3b8] truncate" style={FONT}>
            {away.name_zh}
          </div>
        </div>

        <div className="text-[14px] font-bold text-[#6b7280]" style={FONT}>{t.predictions.vs}</div>

        <div className="text-right min-w-0">
          <div
            data-picked={homePicked}
            className="text-[26px] font-black leading-none mb-0.5"
            style={{
              ...FONT,
              color: homePicked ? '#e2e8f0' : '#6b7280',
            }}
          >
            {home.abbreviation}
          </div>
          <div className="text-[17px] text-[#94a3b8] truncate" style={FONT}>
            {home.name_zh}
          </div>
        </div>
      </div>

      {/* Pick + Stars (or locked placeholder) */}
      {isLocked ? (
        <Link
          to="/upgrade"
          className="block border-t border-[#1e2733] px-3.5 py-3 bg-[rgba(251,191,36,0.04)] hover:bg-[rgba(251,191,36,0.08)] transition-colors"
          aria-label="此推薦為 Premium 專屬，點擊了解升級方案"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <span aria-hidden className="text-[17px]">🔒</span>
              <span
                className="text-[15px] font-bold tracking-widest uppercase text-[#fbbf24]"
                style={FONT}
              >
                Premium 專屬
              </span>
            </span>
            <span
              className="text-[13px] font-bold text-[#94a3b8] hover:text-[#fbbf24]"
              style={FONT}
            >
              升級解鎖 →
            </span>
          </div>
        </Link>
      ) : (
        <>
          <div className="border-t border-[#1e2733] px-3.5 py-2.5 flex items-center justify-between">
            <span className="text-[17px] font-bold text-[#e2e8f0]" style={FONT}>{pickText}</span>
            <span data-testid="rec-stars" className="flex items-center gap-1">
              <StarRating stars={rec.stars ?? 0} size={15} />
              <span className="text-[15px] text-[#fbbf24] font-bold" style={FONT}>{rec.stars ?? '—'}</span>
            </span>
          </div>

          <VoteButtons
            gameId={rec.game_id}
            market={rec.market}
            upCount={rec.vote_up_count}
            downCount={rec.vote_down_count}
          />
        </>
      )}
    </div>
  )
}
