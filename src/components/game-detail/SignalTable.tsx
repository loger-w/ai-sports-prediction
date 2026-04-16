import { useTranslation } from '@/lib/i18n'
import type { Translations } from '@/lib/i18n/en'
import type { SignalAdjustments, SignalCode } from '@/types/predictions/analysis'

const FONT = { fontFamily: 'var(--font-barlow-condensed)' }

const SIGNAL_LABELS: Record<SignalCode, keyof Translations['analysis']> = {
  PARK_FACTOR: 'sgParkFactor',
  BULLPEN_IL_2PLUS: 'sgBullpenIl2',
  BULLPEN_IL_3PLUS: 'sgBullpenIl3',
  BULLPEN_HEAVY_USE: 'sgBullpenHeavy',
  BOTH_K_PCT_HIGH: 'sgBothKHigh',
  BOTH_LINEUP_HOT: 'sgBothLineupHot',
  BOTH_LINEUP_COLD: 'sgBothLineupCold',
  BOTH_SP_STRONG: 'sgBothSpStrong',
  BOTH_SP_SOLID_PLUS: 'sgBothSpSolid',
  TEMP_HIGH: 'sgTempHigh',
  TEMP_LOW: 'sgTempLow',
  WIND_OUT: 'sgWindOut',
  WIND_IN: 'sgWindIn',
  UMPIRE_OVER: 'sgUmpOver',
  UMPIRE_UNDER: 'sgUmpUnder',
  DOUBLEHEADER_G2: 'sgDoubleheader',
  PLATOON_DISADVANTAGE: 'sgPlatoonDis',
  SP_REST_ADJUSTED: 'sgSpRest',
}

interface SignalTableProps {
  data: SignalAdjustments
}

export function SignalTable({ data }: SignalTableProps) {
  const { t } = useTranslation()

  if (data.signals.length === 0) return null

  return (
    <div className="rounded-[10px] border border-[#1e2733] bg-[#161b22] overflow-hidden">
      <div className="px-5 py-3 border-b border-[#1e2733] flex items-center justify-between">
        <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-[#3a4a5a]" style={FONT}>
          {t.analysis.signalAdjustments}
        </span>
        <span
          className="text-[13px] font-bold"
          style={{
            ...FONT,
            color: data.total_run_adjustment > 0 ? '#ef4444' : data.total_run_adjustment < 0 ? '#3b82f6' : '#a0aec0',
          }}
        >
          {data.total_run_adjustment > 0 ? '+' : ''}{data.total_run_adjustment.toFixed(1)} R
        </span>
      </div>
      <div className="divide-y divide-[#1e2733]">
        {data.signals.map((s) => (
          <div key={s.code} className="px-5 py-2.5 flex items-center justify-between">
            <span className="text-[12px] text-[#a0aec0]" style={FONT}>
              {t.analysis[SIGNAL_LABELS[s.code]]}
            </span>
            <span
              className="text-[13px] font-bold tabular-nums"
              style={{
                ...FONT,
                color: s.run_value > 0 ? '#ef4444' : s.run_value < 0 ? '#3b82f6' : '#a0aec0',
              }}
            >
              {s.run_value > 0 ? '+' : ''}{s.run_value.toFixed(1)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
