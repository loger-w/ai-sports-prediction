import dayjs from 'dayjs'
import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import type { GameWithPrediction } from '@/services/predictions/api'
import { WinProbabilityBar } from './WinProbabilityBar'
import { OverUnderDisplay } from './OverUnderDisplay'

interface GameCardProps {
  game: GameWithPrediction
}

const CONF_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  high: { label: '', color: '#00e5a0', bg: 'rgba(0,229,160,0.12)' },
  medium: { label: '', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' },
  low: { label: '', color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
}

export function GameCard({ game }: GameCardProps) {
  const { t, lang } = useTranslation()
  const prediction = game.predictions[0]

  if (!prediction) return null

  const homeTeam = game.home_team
  const awayTeam = game.away_team
  const homeWins = prediction.predicted_winner === 'home'

  const homeName = lang === 'zh' ? homeTeam.name_zh : homeTeam.name_en
  const awayName = lang === 'zh' ? awayTeam.name_zh : awayTeam.name_en

  const gameTime = game.game_time
    ? dayjs(game.game_time).format('HH:mm') + ' ET'
    : null

  const conf = CONF_STYLES[prediction.confidence_level] ?? CONF_STYLES.low
  const confLabels = t.predictions.confidence
  const confLabel =
    prediction.confidence_level === 'high'
      ? confLabels.high
      : prediction.confidence_level === 'medium'
        ? confLabels.medium
        : confLabels.low

  return (
    <div
      className={cn(
        'rounded-[10px] border overflow-hidden',
        'bg-[#161b22] border-[#1e2733]',
      )}
    >

      {/* Card header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#0d1117] border-b border-[#1e2733]">
        <span
          className="text-[10px] font-bold tracking-[0.18em] uppercase text-[#00e5a0]"
          style={{ fontFamily: 'var(--font-barlow-condensed)' }}
        >
          {game.sport_id.toUpperCase()}
        </span>
        {gameTime && (
          <span
            className="text-[11px] text-[#3a4a5a]"
            style={{ fontFamily: 'var(--font-barlow-condensed)' }}
          >
            {gameTime}
          </span>
        )}
        <span
          className="text-[10px] font-bold tracking-[0.12em] px-2 py-0.5 rounded"
          style={{
            fontFamily: 'var(--font-barlow-condensed)',
            color: conf.color,
            background: conf.bg,
          }}
        >
          {confLabel}
        </span>
      </div>

      {/* Card body */}
      <div className="px-4 pt-3.5 pb-4 space-y-3">
        {/* Teams */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="min-w-0">
            <div
              className="text-[32px] font-black leading-none mb-1"
              style={{
                fontFamily: 'var(--font-barlow-condensed)',
                color: homeWins ? '#e2e8f0' : '#2d3748',
              }}
            >
              {homeTeam.abbreviation}
            </div>
            <div
              className="text-[10px] uppercase tracking-widest text-[#3a4a5a] truncate"
              style={{ fontFamily: 'var(--font-barlow-condensed)' }}
            >
              {homeName}
            </div>
          </div>

          <div
            className="text-[13px] font-bold text-[#2d3748] shrink-0"
            style={{ fontFamily: 'var(--font-barlow-condensed)' }}
          >
            {t.predictions.vs}
          </div>

          <div className="text-right min-w-0">
            <div
              className="text-[32px] font-black leading-none mb-1"
              style={{
                fontFamily: 'var(--font-barlow-condensed)',
                color: !homeWins ? '#e2e8f0' : '#2d3748',
              }}
            >
              {awayTeam.abbreviation}
            </div>
            <div
              className="text-[10px] uppercase tracking-widest text-[#3a4a5a] truncate"
              style={{ fontFamily: 'var(--font-barlow-condensed)' }}
            >
              {awayName}
            </div>
          </div>
        </div>

        {/* Win probability bar */}
        <WinProbabilityBar
          homeWinPct={prediction.home_win_pct}
          awayWinPct={prediction.away_win_pct}
          homeLabel={t.predictions.homeWinPct}
          awayLabel={t.predictions.awayWinPct}
        />

        {/* O/U display */}
        <OverUnderDisplay
          overUnderLine={prediction.over_under_line}
          overPct={prediction.over_pct}
          underPct={prediction.under_pct}
          predictedWinner={prediction.predicted_winner}
          homeAbbr={homeTeam.abbreviation}
          awayAbbr={awayTeam.abbreviation}
        />
      </div>

      {/* Card footer — detail link */}
      <Link
        to="/$lang/$sport/$slug"
        params={{ lang, sport: game.sport_id, slug: game.slug }}
        className="flex items-center justify-end px-4 py-2 border-t border-[#1e2733] text-[10px] font-bold tracking-wide text-[#3a4a5a] hover:text-[#00e5a0] transition-colors"
        style={{ fontFamily: 'var(--font-barlow-condensed)' }}
      >
        {t.gameDetail.viewDetail}
      </Link>
    </div>
  )
}
