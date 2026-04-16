import { Link } from '@tanstack/react-router'
import { useTranslation } from '@/lib/i18n'
import { toLocalDisplayDateTime } from '@/lib/timezone'
import type { GameWithPrediction } from '@/services/predictions/api'

interface GameDetailHeaderProps {
  game: GameWithPrediction
}

const FONT = { fontFamily: 'var(--font-barlow-condensed)' }

export function GameDetailHeader({ game }: GameDetailHeaderProps) {
  const { t, lang } = useTranslation()
  const prediction = game.predictions[0]

  const homeName = lang === 'zh' ? game.home_team.name_zh : game.home_team.name_en
  const awayName = lang === 'zh' ? game.away_team.name_zh : game.away_team.name_en
  const homeWins = prediction?.moneyline_pick === 'home'

  const gameTime = toLocalDisplayDateTime(game.game_time)
  const isFinal = game.status === 'final'

  return (
    <div className="rounded-[10px] border border-[#1e2733] bg-[#0d1117] overflow-hidden">
      {/* Top bar: back + meta */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#1e2733]">
        <Link
          to="/$lang/predictions"
          params={{ lang }}
          className="text-[14px] font-bold tracking-wide text-[#4a5568] hover:text-[#a0aec0] transition-colors"
          style={FONT}
        >
          {t.gameDetail.back}
        </Link>

        <div className="flex items-center gap-2">
          <span
            className="text-[13px] font-bold tracking-[0.18em] uppercase text-[#00e5a0]"
            style={FONT}
          >
            {game.sport_id.toUpperCase()}
          </span>
          <span className="text-[#1e2733]">·</span>
          <span
            className="text-[13px] font-bold tracking-wide uppercase"
            style={{
              ...FONT,
              color: isFinal ? '#fbbf24' : '#3a4a5a',
            }}
          >
            {isFinal ? t.gameDetail.finalScore : t.gameDetail.scheduled}
          </span>
          {gameTime && (
            <>
              <span className="text-[#1e2733]">·</span>
              <span className="text-[13px] text-[#3a4a5a]" style={FONT}>
                {gameTime}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Teams + scores */}
      <div className="px-6 py-6 grid grid-cols-[1fr_auto_1fr] items-center gap-6">
        {/* Away team */}
        <div>
          <div
            className="text-[13px] uppercase tracking-widest text-[#3a4a5a] mb-1"
            style={FONT}
          >
            {awayName}
          </div>
          <div
            className="text-[52px] font-black leading-none"
            style={{
              ...FONT,
              color: !homeWins ? '#e2e8f0' : '#2d3748',
            }}
          >
            {game.away_team.abbreviation}
          </div>
          {isFinal && (
            <div
              className="text-[32px] font-black leading-none mt-1"
              style={{
                ...FONT,
                color: !homeWins ? '#00e5a0' : '#4a5568',
              }}
            >
              {game.away_score ?? '—'}
            </div>
          )}
        </div>

        {/* VS */}
        <div
          className="text-[15px] font-bold text-[#2d3748] text-center"
          style={FONT}
        >
          {t.predictions.vs}
        </div>

        {/* Home team */}
        <div className="text-right">
          <div
            className="text-[13px] uppercase tracking-widest text-[#3a4a5a] mb-1"
            style={FONT}
          >
            {homeName}
          </div>
          <div
            className="text-[52px] font-black leading-none"
            style={{
              ...FONT,
              color: homeWins ? '#e2e8f0' : '#2d3748',
            }}
          >
            {game.home_team.abbreviation}
          </div>
          {isFinal && (
            <div
              className="text-[32px] font-black leading-none mt-1"
              style={{
                ...FONT,
                color: homeWins ? '#00e5a0' : '#4a5568',
              }}
            >
              {game.home_score ?? '—'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
