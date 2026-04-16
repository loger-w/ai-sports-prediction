import { useTranslation } from '@/lib/i18n'
import type { Environment } from '@/types/predictions/analysis'

const FONT = { fontFamily: 'var(--font-barlow-condensed)' }

interface EnvironmentCardProps {
  data: Environment
}

export function EnvironmentCard({ data }: EnvironmentCardProps) {
  const { t } = useTranslation()

  const pfColor =
    data.park_factor >= 105 ? '#ef4444'
    : data.park_factor >= 100 ? '#f59e0b'
    : data.park_factor >= 95 ? '#a0aec0'
    : '#3b82f6'

  const roofLabel =
    data.roof === 'open' ? t.analysis.roofOpen
    : data.roof === 'closed' ? t.analysis.roofClosed
    : data.roof === 'retractable' ? t.analysis.roofRetractable
    : null

  return (
    <div className="rounded-[10px] border border-[#1e2733] bg-[#161b22] overflow-hidden">
      <div className="px-5 py-3 border-b border-[#1e2733]">
        <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-[#3a4a5a]" style={FONT}>
          {t.analysis.environment}
        </span>
      </div>
      <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Venue + Park Factor */}
        <div>
          <div className="text-[10px] text-[#4a5568] uppercase tracking-wide mb-1" style={FONT}>
            {data.venue}
          </div>
          <div className="text-[22px] font-black" style={{ ...FONT, color: pfColor }}>
            {data.park_factor}
          </div>
          <div className="text-[10px] text-[#3a4a5a]" style={FONT}>{t.analysis.parkFactor}</div>
        </div>

        {/* Temperature */}
        {data.temperature_f != null && (
          <div>
            <div className="text-[10px] text-[#4a5568] uppercase tracking-wide mb-1" style={FONT}>
              {t.analysis.temperature}
            </div>
            <div className="text-[22px] font-black text-[#e2e8f0]" style={FONT}>
              {data.temperature_f}°F
            </div>
          </div>
        )}

        {/* Wind */}
        {data.wind_mph != null && (
          <div>
            <div className="text-[10px] text-[#4a5568] uppercase tracking-wide mb-1" style={FONT}>
              {t.analysis.wind}
            </div>
            <div className="text-[22px] font-black text-[#e2e8f0]" style={FONT}>
              {data.wind_mph} mph
            </div>
            {data.wind_direction && (
              <div className="text-[10px] text-[#3a4a5a]" style={FONT}>{data.wind_direction}</div>
            )}
          </div>
        )}

        {/* Roof */}
        {roofLabel && (
          <div>
            <div className="text-[10px] text-[#4a5568] uppercase tracking-wide mb-1" style={FONT}>
              Roof
            </div>
            <div className="text-[16px] font-bold text-[#a0aec0]" style={FONT}>{roofLabel}</div>
          </div>
        )}
      </div>
    </div>
  )
}
