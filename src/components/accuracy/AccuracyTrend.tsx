import ReactApexChart from 'react-apexcharts'
import { useTranslation } from '@/lib/i18n'
import type { AccuracyData } from '@/services/predictions/api'

const FONT = { fontFamily: 'var(--font-barlow-condensed)' as const }

interface Props {
  daily: AccuracyData['daily']
}

export function AccuracyTrend({ daily }: Props) {
  const { t } = useTranslation()
  const series = [
    { name: t.accuracy.overall, data: daily.map((d) => d.pct) },
  ]
  const options = {
    chart: { type: 'line' as const, toolbar: { show: false }, background: 'transparent' },
    theme: { mode: 'dark' as const },
    xaxis: {
      categories: daily.map((d) => d.date),
      labels: { style: { colors: '#94a3b8', fontFamily: 'var(--font-barlow-condensed)' } },
    },
    yaxis: {
      min: 0, max: 100,
      labels: { style: { colors: '#94a3b8', fontFamily: 'var(--font-barlow-condensed)' } },
    },
    colors: ['#00e5a0'],
    stroke: { width: 2, curve: 'smooth' as const },
    grid: { borderColor: '#1e2733' },
    tooltip: { theme: 'dark' },
    dataLabels: { enabled: false },
  }

  return (
    <div>
      <h2 className="text-[14px] font-bold tracking-[0.2em] uppercase text-[#94a3b8] mb-3" style={FONT}>
        {t.accuracy.trend}
      </h2>
      <div className="rounded-[10px] border border-[#1e2733] bg-[#161b22] p-4">
        <ReactApexChart options={options} series={series} type="line" height={252} />
      </div>
    </div>
  )
}
