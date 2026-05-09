import type { CSSProperties } from 'react'

const FONT_FAMILY = 'var(--font-barlow-condensed)' as const

export interface DateChipState {
  isToday: boolean
  isSelected: boolean
  hasGames: boolean
  opacity: number
}

export interface DateChipStyles {
  container: CSSProperties
  weekdayLabel: CSSProperties
  dayNumber: CSSProperties
  todayLabel: CSSProperties
  hasGamesDot: CSSProperties
  showTodayLabel: boolean
  showHasGamesDot: boolean
}

export function dateChipStyles({
  isToday,
  isSelected,
  hasGames,
  opacity,
}: DateChipState): DateChipStyles {
  const fg = isSelected ? '#0d1117' : '#a0aec0'
  return {
    container: {
      background: isSelected ? '#00e5a0' : 'rgba(255,255,255,0.04)',
      boxShadow: isSelected ? '0 0 12px rgba(0,229,160,0.3)' : undefined,
      opacity,
    },
    weekdayLabel: {
      fontFamily: FONT_FAMILY,
      fontSize: '10px',
      fontWeight: 700,
      color: fg,
      letterSpacing: '0.05em',
      lineHeight: 1,
    },
    dayNumber: {
      fontFamily: FONT_FAMILY,
      fontSize: '15px',
      fontWeight: isSelected ? 900 : 700,
      color: fg,
      lineHeight: 1.2,
    },
    todayLabel: {
      fontFamily: FONT_FAMILY,
      fontSize: '8px',
      fontWeight: 700,
      color: '#00e5a0',
      letterSpacing: '0.04em',
      marginTop: '2px',
      lineHeight: 1,
    },
    hasGamesDot: {
      position: 'absolute',
      bottom: '2px',
      width: '3px',
      height: '3px',
      borderRadius: '50%',
      background: '#fbbf24',
    },
    showTodayLabel: isToday && !isSelected,
    showHasGamesDot: hasGames && !isToday && !isSelected,
  }
}
