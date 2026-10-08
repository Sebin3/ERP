import { useRef, useState } from 'react'
import { formatCompactSoles, linearScale } from '../../utils/charts'
import { cn } from '../../utils'
import { ChartFrame } from './ChartFrame'
import { ChartTooltip } from './ChartTooltip'
import type { ChartBaseProps, ChartDatum } from './types'
import { useElementSize } from './useElementSize'

interface RankingBarsProps extends ChartBaseProps {
  data: readonly ChartDatum[]
  title?: string
  valueFormatter?: (value: number) => string
  hideTitle?: boolean
}

export function RankingBars({ data, title = 'Ranking', valueFormatter = formatCompactSoles, hideTitle = false, status, errorMessage, emptyMessage, className }: RankingBarsProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const chartRef = useRef<HTMLDivElement>(null)
  const { width: measuredWidth } = useElementSize(chartRef)
  const maximum = Math.max(1, ...data.map((item) => item.value))
  const rowHeight = 38
  const width = Math.max(200, Math.round((measuredWidth || 520) - 24))
  const labelWidth = Math.min(150, Math.max(92, Math.round(width * 0.3)))
  const valueWidth = Math.min(72, Math.max(52, Math.round(width * 0.18)))
  const trackWidth = width - labelWidth - valueWidth
  const active = activeIndex === null ? null : data[activeIndex]
  return <section className={cn('space-y-3', className)}>{hideTitle ? null : <h2 className="text-sm font-semibold text-text">{title}</h2>}<ChartFrame status={status} errorMessage={errorMessage} emptyMessage={emptyMessage}>
    <div ref={chartRef} className="relative min-w-0 max-w-full overflow-hidden rounded-xl bg-surface-muted p-3" role="img" aria-label={`${title}: ${data.map((item) => `${item.label} ${valueFormatter(item.value)}`).join(', ')}`}>
      {active ? <ChartTooltip title={active.label} rows={[{ label: 'Valor', value: valueFormatter(active.value), color: 'accent' }]} footer={active.detail} /> : null}
      <svg className="block h-auto min-h-36 w-full max-w-full" viewBox={`0 0 ${width} ${Math.max(140, data.length * rowHeight)}`} preserveAspectRatio="none" aria-hidden="true">{data.map((item, index) => { const y = index * rowHeight + 7; const centerY = y + 9.5; const barWidth = linearScale(item.value, [0, maximum], [0, trackWidth]); const label = item.label.slice(0, width < 360 ? 12 : 24); return <g key={item.label} tabIndex={0} role="button" aria-label={`${item.label}: ${valueFormatter(item.value)}`} className="outline-none" onMouseEnter={() => setActiveIndex(index)} onMouseLeave={() => setActiveIndex(null)} onFocus={() => setActiveIndex(index)} onBlur={() => setActiveIndex(null)}><text x="0" y={centerY} dominantBaseline="middle" className="fill-text-soft text-[12px]">{label}</text><rect x={labelWidth} y={y + 5} width={trackWidth} height="9" rx="4.5" className="fill-border/70" /><rect x={labelWidth} y={y + 5} width={barWidth} height="9" rx="4.5" className="fill-chart-1 transition-[width] duration-200 motion-reduce:transition-none" /><text x={width - 4} y={centerY} dominantBaseline="middle" textAnchor="end" className="fill-text text-[12px] font-medium">{valueFormatter(item.value)}</text></g> })}</svg>
    </div>
    <table className="sr-only"><caption>{title}</caption><thead><tr><th>Elemento</th><th>Valor</th></tr></thead><tbody>{data.map((item) => <tr key={item.label}><td>{item.label}</td><td>{item.value}</td></tr>)}</tbody></table>
  </ChartFrame></section>
}
