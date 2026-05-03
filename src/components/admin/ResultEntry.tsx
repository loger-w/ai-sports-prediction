import type { Market, RecResult } from '@/types/predictions/recommendation'

const FONT = { fontFamily: 'var(--font-barlow-condensed)' as const }

interface Props {
  market: Market
  value: RecResult | null
  onChange: (next: RecResult | null) => void
}

const OPTIONS: { value: RecResult; label: string; bg: string; fg: string; border: string }[] = [
  { value: 'win',  label: '贏', bg: 'rgba(0,229,160,0.15)',   fg: '#00e5a0', border: 'rgba(0,229,160,0.40)' },
  { value: 'loss', label: '輸', bg: 'rgba(252,129,129,0.15)', fg: '#fc8181', border: 'rgba(252,129,129,0.40)' },
  { value: 'push', label: '和', bg: 'rgba(160,174,192,0.15)', fg: '#a0aec0', border: 'rgba(160,174,192,0.40)' },
  { value: 'void', label: '退', bg: 'rgba(148,163,184,0.15)', fg: '#94a3b8', border: 'rgba(148,163,184,0.40)' },
]

export function ResultEntry({ value, onChange }: Props) {
  function handleClick(r: RecResult) {
    onChange(value === r ? null : r)
  }

  return (
    <div className="flex gap-2" style={FONT}>
      {OPTIONS.map((opt) => {
        const pressed = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={pressed}
            onClick={() => handleClick(opt.value)}
            className="px-4 py-1.5 rounded text-sm font-bold border"
            style={
              pressed
                ? { background: opt.bg, color: opt.fg, borderColor: opt.border }
                : {
                    background: 'transparent',
                    color: '#94a3b8',
                    borderColor: '#1e2733',
                  }
            }
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
