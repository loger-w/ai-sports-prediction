import ReactApexChart from 'react-apexcharts'
import type { ApexOptions } from 'apexcharts'
import { useTranslation } from '@/lib/i18n'
import type { DailyPoint } from '@/services/predictions/api'

interface AccuracyTrendProps {
  daily: DailyPoint[]
}

// Chart options are static — hoist outside component (rendering-hoist-jsx)
const BASE_OPTIONS: ApexOptions = {
  chart: {
    type: 'line',
    background: 'transparent',
    foreColor: '#4a5568',
    toolbar: { show: false },
    zoom: { enabled: false },
    animations: { enabled: true, speed: 600 },
  },
  colors: ['#00e5a0', '#fbbf24'],
  stroke: { curve: 'smooth', width: 2 },
  grid: {
    borderColor: '#1e2733',
    strokeDashArray: 4,
    xaxis: { lines: { show: false } },
  },
  markers: { size: 0, hover: { size: 4 } },
  xaxis: {
    type: 'category',
    labels: {
      style: { colors: '#4a5568', fontFamily: 'var(--font-barlow-condensed)', fontSize: '10px' },
      rotate: -30,
    },
    axisBorder: { color: '#1e2733' },
    axisTicks: { color: '#1e2733' },
  },
  yaxis: {
    min: 0,
    max: 100,
    tickAmount: 5,
    labels: {
      formatter: (v) => `${v}%`,
      style: { colors: '#4a5568', fontFamily: 'var(--font-barlow-condensed)', fontSize: '10px' },
    },
  },
  tooltip: {
    theme: 'dark',
    style: { fontFamily: 'var(--font-barlow-condensed)', fontSize: '12px' },
    y: { formatter: (v) => `${v}%` },
  },
  legend: {
    labels: { colors: '#a0aec0' },
    fontFamily: 'var(--font-barlow-condensed)',
    fontSize: '11px',
  },
}

export function AccuracyTrend({ daily }: AccuracyTrendProps) {
  const { t } = useTranslation()

  const categories = daily.map((d) => d.date.slice(5)) // MM-DD
  const series = [
    { name: t.accuracy.winnerAccuracy, data: daily.map((d) => d.winnerPct) },
    { name: t.accuracy.ouAccuracy, data: daily.map((d) => d.ouPct) },
  ]
  const options: ApexOptions = { ...BASE_OPTIONS, xaxis: { ...BASE_OPTIONS.xaxis, categories } }

  return (
    <div>
      <h2
        className="text-[9px] font-bold tracking-[0.2em] uppercase text-[#3a4a5a] mb-3"
        style={{ fontFamily: 'var(--font-barlow-condensed)' }}
      >
        {t.accuracy.trend}
      </h2>
      <div className="rounded-[10px] border border-[#1e2733] bg-[#161b22] p-4">
        <ReactApexChart
          type="line"
          series={series}
          options={options}
          height={220}
        />
      </div>
    </div>
  )
}
