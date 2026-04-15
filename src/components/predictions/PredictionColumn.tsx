import { StarRating } from './StarRating'

const FONT = { fontFamily: 'var(--font-barlow-condensed)' }

interface PredictionColumnProps {
  label: string
  stars: number        // 0–5 (0 = PASS)
  pick: string         // formatted pick text, e.g. "LAL", "LAL -3.5", "O 218.5"
  pct: number | null   // confidence %, shown when stars >= 2
  lineRef: string | null  // grey reference shown in PASS state (e.g. "218.5", "-3.5")
  isLast?: boolean
}

export function PredictionColumn({
  label,
  stars,
  pick,
  pct,
  lineRef,
  isLast = false,
}: PredictionColumnProps) {
  const isPass = stars === 0

  return (
    <div
      style={{
        padding: '10px 6px',
        textAlign: 'center',
        borderRight: isLast ? 'none' : '1px solid #1e2733',
      }}
    >
      {/* Dimension label */}
      <div
        style={{
          ...FONT,
          fontSize: '8px',
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: '#3a4a5a',
          marginBottom: '3px',
        }}
      >
        {label}
      </div>

      {/* Stars */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '4px' }}>
        <StarRating stars={stars} size={9} />
      </div>

      {/* Pick or PASS */}
      {isPass ? (
        <div
          style={{
            ...FONT,
            fontSize: '12px',
            fontWeight: 700,
            color: '#2d3748',
            letterSpacing: '0.05em',
          }}
        >
          PASS
        </div>
      ) : (
        <div
          style={{
            ...FONT,
            fontSize: '13px',
            fontWeight: 800,
            color: '#00e5a0',
          }}
        >
          {pick}
        </div>
      )}

      {/* Bottom: pct or lineRef */}
      <div
        style={{
          ...FONT,
          fontSize: '9px',
          color: '#2d3748',
          marginTop: '2px',
        }}
      >
        {isPass ? (lineRef ?? '') : pct !== null ? `${pct}%` : ''}
      </div>
    </div>
  )
}
