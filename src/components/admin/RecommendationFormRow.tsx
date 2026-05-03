import type { Market, Pick as RecPick } from '@/types/predictions/recommendation'

const FONT = { fontFamily: 'var(--font-barlow-condensed)' as const }

const FIELD =
  'w-full px-3 py-2 rounded bg-[#0d1117] border border-[#1e2733] text-[#e2e8f0] focus:outline-none focus:border-[#00e5a0]'
const LABEL = 'block text-xs text-[#94a3b8] font-bold tracking-wide mb-1'

export interface RecFormValue {
  market: Market
  pick: RecPick
  line: number | null
  stars: number
}

interface Props {
  value: RecFormValue
  onChange: (next: RecFormValue) => void
  onRemove: () => void
}

const MARKET_PICKS: Record<Market, RecPick[]> = {
  ml: ['home', 'away'],
  spread: ['home', 'away'],
  ou: ['over', 'under'],
}

function defaultsForMarket(market: Market): Pick<RecFormValue, 'pick' | 'line'> {
  if (market === 'ml') return { pick: 'home', line: null }
  if (market === 'spread') return { pick: 'home', line: 0 }
  return { pick: 'over', line: 0 }
}

const LINE_LABEL: Record<Market, string> = {
  ml: '',
  spread: '讓分',
  ou: '盤線',
}

export function RecommendationFormRow({ value, onChange, onRemove }: Props) {
  function patch(p: Partial<RecFormValue>) {
    onChange({ ...value, ...p })
  }

  function handleMarket(m: Market) {
    const d = defaultsForMarket(m)
    onChange({ market: m, pick: d.pick, line: d.line, stars: value.stars })
  }

  const lineLabel = LINE_LABEL[value.market]

  return (
    <div className="grid grid-cols-[1fr_1fr_1fr_auto_auto] gap-2 items-end" style={FONT}>
      <div>
        <label className={LABEL} htmlFor={`rec-market-${value.market}`}>盤口</label>
        <select
          id={`rec-market-${value.market}`}
          aria-label="盤口"
          className={FIELD}
          value={value.market}
          onChange={(e) => handleMarket(e.target.value as Market)}
        >
          <option value="ml">ML</option>
          <option value="spread">讓分</option>
          <option value="ou">大小分</option>
        </select>
      </div>
      <div>
        <label className={LABEL} htmlFor={`rec-pick-${value.market}`}>選邊</label>
        <select
          id={`rec-pick-${value.market}`}
          aria-label="選邊"
          className={FIELD}
          value={value.pick}
          onChange={(e) => patch({ pick: e.target.value as RecPick })}
        >
          {MARKET_PICKS[value.market].map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>
      {lineLabel ? (
        <div>
          <label className={LABEL} htmlFor={`rec-line-${value.market}`}>{lineLabel}</label>
          <input
            id={`rec-line-${value.market}`}
            aria-label={lineLabel}
            type="number"
            step="0.5"
            className={FIELD}
            value={value.line ?? 0}
            onChange={(e) => patch({ line: parseFloat(e.target.value) })}
          />
        </div>
      ) : (
        <div />
      )}
      <div>
        <label className={LABEL} htmlFor={`rec-stars-${value.market}`}>星等</label>
        <select
          id={`rec-stars-${value.market}`}
          aria-label="星等"
          className={FIELD}
          value={String(value.stars)}
          onChange={(e) => patch({ stars: parseInt(e.target.value, 10) })}
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="px-3 py-2 rounded text-sm font-bold bg-[rgba(252,129,129,0.1)] text-[#fc8181] border border-[rgba(252,129,129,0.25)] hover:bg-[rgba(252,129,129,0.18)]"
        aria-label="移除這條推薦"
      >
        移除
      </button>
    </div>
  )
}
