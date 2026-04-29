import { useEffect, useRef, useState } from 'react'
import dayjs from 'dayjs'
import { CalendarDots } from '@phosphor-icons/react'
import { localToday } from '@/lib/timezone'
import { useTranslation } from '@/lib/i18n'
import { usePredictionStore } from '@/stores/predictions/predictionStore'
import { useDatesWithRecommendations } from '@/hooks/predictions/useDatesWithRecommendations'

const FONT = { fontFamily: 'var(--font-barlow-condensed)' }

/** Build array of YYYY-MM-DD strings: 7 days ago → today → 6 days ahead */
function buildDateRange(referenceDate: string): string[] {
  const dates: string[] = []
  for (let i = -7; i <= 6; i++) {
    dates.push(dayjs(referenceDate).add(i, 'day').format('YYYY-MM-DD'))
  }
  return dates
}

/** Returns opacity 0.3–1.0 based on how far from today */
function getDateOpacity(date: string, todayStr: string): number {
  const diff = Math.abs(dayjs(date).diff(dayjs(todayStr), 'day'))
  if (diff === 0) return 1
  if (diff <= 2) return 0.85
  if (diff <= 4) return 0.55
  return 0.3
}

export function DateScrollBar() {
  const { t } = useTranslation()
  const { dateRange, setDateRange } = usePredictionStore()
  const todayStr = localToday()
  const formatMonth = (d: dayjs.Dayjs) => `${d.year()}年${d.month() + 1}月`
  const dates = buildDateRange(todayStr)
  const from = dates[0]
  const to = dates[dates.length - 1]

  const { data: datesWithRecs = [] } = useDatesWithRecommendations(from, to)
  const datesWithGamesSet = new Set(datesWithRecs)

  const scrollRef = useRef<HTMLDivElement>(null)
  const todayRef = useRef<HTMLButtonElement>(null)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState(dayjs(todayStr))

  // Auto-scroll to today on mount
  useEffect(() => {
    if (todayRef.current && scrollRef.current) {
      const container = scrollRef.current
      const todayEl = todayRef.current
      const offset = todayEl.offsetLeft - container.offsetWidth / 2 + todayEl.offsetWidth / 2
      container.scrollLeft = offset
    }
  }, [])

  const displayMonth = formatMonth(dayjs(dateRange))

  // Calendar popup: build days grid for calendarMonth
  const firstDay = calendarMonth.startOf('month').day() // 0=Sun
  const daysInMonth = calendarMonth.daysInMonth()

  function handleCalendarSelect(dateStr: string) {
    setDateRange(dateStr)
    setCalendarOpen(false)
  }

  return (
    <div className="relative mb-1">
      <div className="flex items-center gap-2">
        {/* Calendar icon */}
        <button
          onClick={() => setCalendarOpen((v) => !v)}
          className="flex-shrink-0 w-[36px] h-[44px] rounded-[6px] flex items-center justify-center border border-[#1e2733] bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.07)] transition-colors"
          aria-label="Open calendar"
        >
          <CalendarDots size={16} color="#6b7280" />
        </button>

        {/* Scrollable date chips */}
        <div
          ref={scrollRef}
          className="flex gap-1 overflow-x-auto flex-1 no-scrollbar"
          style={{ scrollBehavior: 'smooth' }}
        >
          {dates.map((date) => {
            const isToday = date === todayStr
            const isSelected = date === dateRange
            const hasGames = datesWithGamesSet.has(date)
            const opacity = getDateOpacity(date, todayStr)
            const d = dayjs(date)

            return (
              <button
                key={date}
                ref={isToday ? todayRef : undefined}
                onClick={() => setDateRange(date)}
                className="flex-shrink-0 relative flex flex-col items-center justify-center rounded-[6px] min-w-[44px] h-[44px]"
                style={{
                  background: isToday
                    ? '#00e5a0'
                    : isSelected
                      ? 'rgba(255,255,255,0.1)'
                      : 'rgba(255,255,255,0.04)',
                  boxShadow: isToday ? '0 0 12px rgba(0,229,160,0.3)' : undefined,
                  opacity,
                }}
              >
                <span
                  style={{
                    ...FONT,
                    fontSize: '10px',
                    fontWeight: 700,
                    color: isToday ? '#0d1117' : '#a0aec0',
                    letterSpacing: '0.05em',
                    lineHeight: 1,
                  }}
                >
                  {isToday ? t.dates.today : t.dates.weekdaysShort[d.day()]}
                </span>
                <span
                  style={{
                    ...FONT,
                    fontSize: '15px',
                    fontWeight: isToday ? 900 : 700,
                    color: isToday ? '#0d1117' : '#a0aec0',
                    lineHeight: 1.2,
                  }}
                >
                  {d.date()}
                </span>
                {hasGames && !isToday && (
                  <span
                    style={{
                      position: 'absolute',
                      bottom: '2px',
                      width: '3px',
                      height: '3px',
                      borderRadius: '50%',
                      background: '#fbbf24',
                    }}
                  />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Month label */}
      <div
        style={{
          ...FONT,
          fontSize: '14px',
          fontWeight: 600,
          letterSpacing: '0.12em',
          color: '#94a3b8',
          marginTop: '4px',
          paddingLeft: '44px',
        }}
      >
        {displayMonth}
      </div>

      {/* Calendar popup */}
      {calendarOpen && (
        <div
          className="absolute left-0 top-[56px] z-50 rounded-[10px] border border-[#1e2733] bg-[#0f1419] p-4 shadow-2xl"
          style={{ minWidth: '240px' }}
        >
          {/* Month nav */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setCalendarMonth((m) => m.subtract(1, 'month'))}
              className="w-6 h-6 rounded flex items-center justify-center text-[#94a3b8] hover:text-[#e2e8f0]"
              style={FONT}
            >
              ‹
            </button>
            <span style={{ ...FONT, fontSize: '14px', fontWeight: 700, color: '#a0aec0', letterSpacing: '0.08em' }}>
              {formatMonth(calendarMonth)}
            </span>
            <button
              onClick={() => setCalendarMonth((m) => m.add(1, 'month'))}
              className="w-6 h-6 rounded flex items-center justify-center text-[#94a3b8] hover:text-[#e2e8f0]"
              style={FONT}
            >
              ›
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {t.dates.weekdaysShort.map((d, i) => (
              <div key={i} style={{ ...FONT, fontSize: '14px', color: '#94a3b8', textAlign: 'center', padding: '2px 0' }}>
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-y-1">
            {/* Empty cells before first day */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1
              const dateStr = calendarMonth.date(dayNum).format('YYYY-MM-DD')
              const isSelected = dateStr === dateRange
              const isToday = dateStr === todayStr
              return (
                <button
                  key={dayNum}
                  onClick={() => handleCalendarSelect(dateStr)}
                  style={{
                    ...FONT,
                    fontSize: '11px',
                    fontWeight: isToday || isSelected ? 700 : 400,
                    color: isSelected ? '#0d1117' : isToday ? '#00e5a0' : '#6b7280',
                    background: isSelected ? '#00e5a0' : 'transparent',
                    borderRadius: '4px',
                    padding: '4px 0',
                    textAlign: 'center',
                  }}
                >
                  {dayNum}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
