import type { Audience } from '@/types/predictions/recommendation'

const FONT = { fontFamily: 'var(--font-barlow-condensed)' as const }

interface Props {
  value: Audience
  onChange: (next: Audience) => void
  disabled?: boolean
  label?: string
}

const OPTIONS: { value: Audience; label: string; bg: string; fg: string; border: string }[] = [
  { value: 'all',     label: '公開',    bg: 'rgba(0,229,160,0.15)',   fg: '#00e5a0', border: 'rgba(0,229,160,0.40)' },
  { value: 'premium', label: 'Premium', bg: 'rgba(251,191,36,0.15)',  fg: '#fbbf24', border: 'rgba(251,191,36,0.40)' },
]

export function AudienceToggle({ value, onChange, disabled = false, label = '受眾' }: Props) {
  function handleClick(next: Audience) {
    if (disabled || next === value) return
    onChange(next)
  }

  return (
    <div
      role="group"
      aria-label={label}
      className="flex gap-2"
      style={{ ...FONT, opacity: disabled ? 0.5 : 1 }}
    >
      {OPTIONS.map((opt) => {
        const pressed = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={pressed}
            disabled={disabled}
            onClick={() => handleClick(opt.value)}
            className="px-3 py-1.5 rounded text-xs font-bold border disabled:cursor-not-allowed"
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
