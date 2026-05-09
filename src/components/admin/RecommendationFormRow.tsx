import type { Audience, Market, Pick as RecPick } from '@/types/predictions/recommendation'
import { AudienceToggle } from './AudienceToggle'

const FONT = { fontFamily: 'var(--font-barlow-condensed)' as const }
const LABEL = 'block text-xs text-[#94a3b8] font-bold tracking-wide uppercase mb-1.5'

const MARKET_LABEL: Record<Market, string> = {
  ml: 'ML',
  spread: '讓分',
  ou: '大小分',
}

const PICK_LABEL: Record<RecPick, string> = {
  home: '主',
  away: '客',
  over: '大',
  under: '小',
}

// 客 (away) on the LEFT, 主 (home) on the RIGHT — matches commit 48b0c1d.
const MARKET_PICKS: Record<Market, RecPick[]> = {
  ml: ['away', 'home'],
  spread: ['away', 'home'],
  ou: ['over', 'under'],
}

const LINE_LABEL: Record<Market, string> = {
  ml: '',
  spread: '讓分',
  ou: '盤線',
}

export interface RecFormValue {
  market: Market
  pick: RecPick
  line: number | null
  stars: number
  audience: Audience
}

interface Props {
  value: RecFormValue
  onChange: (next: RecFormValue) => void
  onRemove: () => void
  marketsTaken?: Market[]
}

function defaultsForMarket(market: Market): Pick<RecFormValue, 'pick' | 'line'> {
  if (market === 'ml') return { pick: 'home', line: null }
  if (market === 'spread') return { pick: 'home', line: 0 }
  return { pick: 'over', line: 0 }
}

interface SegOption<T extends string> {
  value: T
  label: string
}

function Segmented<T extends string>({
  groupLabel,
  options,
  value,
  onChange,
  disabledValues = [],
}: {
  groupLabel: string
  options: SegOption<T>[]
  value: T
  onChange: (next: T) => void
  disabledValues?: T[]
}) {
  return (
    <div
      role="radiogroup"
      aria-label={groupLabel}
      className="inline-flex gap-1 bg-[#0a0a0f] border border-[#1e2733] rounded p-0.5"
    >
      {options.map((opt) => {
        const active = value === opt.value
        const disabled = disabledValues.includes(opt.value) && !active
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-disabled={disabled || undefined}
            disabled={disabled}
            onClick={() => {
              if (disabled || active) return
              onChange(opt.value)
            }}
            className={
              active
                ? 'px-3 py-1.5 rounded text-sm font-bold bg-[rgba(0,229,160,0.12)] text-[#00e5a0]'
                : disabled
                  ? 'px-3 py-1.5 rounded text-sm font-bold text-[#475569] cursor-not-allowed opacity-60'
                  : 'px-3 py-1.5 rounded text-sm font-bold text-[#94a3b8] hover:text-[#e2e8f0]'
            }
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

function StarRating({ value, onChange }: { value: number; onChange: (next: number) => void }) {
  return (
    <div role="radiogroup" aria-label="星等" className="inline-flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => {
        const lit = n <= value
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={n === value}
            aria-label={`${n} 星`}
            onClick={() => onChange(n)}
            className={
              lit
                ? 'text-2xl text-[#00e5a0] cursor-pointer leading-none'
                : 'text-2xl text-[#1e2733] cursor-pointer leading-none hover:text-[#475569]'
            }
          >
            ★
          </button>
        )
      })}
    </div>
  )
}

export function RecommendationFormRow({ value, onChange, onRemove, marketsTaken = [] }: Props) {
  function patch(p: Partial<RecFormValue>) {
    onChange({ ...value, ...p })
  }

  function handleMarket(m: Market) {
    if (m === value.market) return
    const d = defaultsForMarket(m)
    onChange({
      market: m,
      pick: d.pick,
      line: d.line,
      stars: value.stars,
      audience: value.audience,
    })
  }

  const lineLabel = LINE_LABEL[value.market]

  return (
    <div className="rounded border border-[#1e2733] bg-[#0d1117] p-4 space-y-3" style={FONT}>
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <div>
          <span className={LABEL}>盤口</span>
          <Segmented<Market>
            groupLabel="盤口"
            options={(['ml', 'spread', 'ou'] as Market[]).map((m) => ({
              value: m,
              label: MARKET_LABEL[m],
            }))}
            value={value.market}
            onChange={handleMarket}
            disabledValues={marketsTaken}
          />
        </div>
        <div>
          <span className={LABEL}>選邊</span>
          <Segmented<RecPick>
            groupLabel="選邊"
            options={MARKET_PICKS[value.market].map((p) => ({
              value: p,
              label: PICK_LABEL[p],
            }))}
            value={value.pick}
            onChange={(p) => patch({ pick: p })}
          />
        </div>
        {lineLabel ? (
          <div>
            <label className={LABEL} htmlFor={`rec-line-${value.market}`}>{lineLabel}</label>
            <input
              id={`rec-line-${value.market}`}
              aria-label={lineLabel}
              type="number"
              step="0.5"
              className="w-24 px-3 py-2 rounded bg-[#0a0a0f] border border-[#1e2733] text-[#e2e8f0] focus:outline-none focus:border-[#00e5a0]"
              value={value.line ?? 0}
              onChange={(e) => {
                const raw = parseFloat(e.target.value)
                patch({ line: Number.isNaN(raw) ? null : raw })
              }}
            />
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <div>
          <span className={LABEL}>星等</span>
          <StarRating value={value.stars} onChange={(n) => patch({ stars: n })} />
        </div>
        <div>
          <span className={LABEL}>受眾</span>
          <AudienceToggle value={value.audience} onChange={(a) => patch({ audience: a })} />
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="ml-auto px-3 py-2 rounded text-xs font-bold bg-[rgba(252,129,129,0.10)] text-[#fc8181] border border-[rgba(252,129,129,0.25)] hover:bg-[rgba(252,129,129,0.18)]"
          aria-label="移除這條推薦"
        >
          移除
        </button>
      </div>
    </div>
  )
}
