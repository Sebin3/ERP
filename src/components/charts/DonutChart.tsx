import { useState } from 'react'
import { arcPath, donutSegments, formatCompactPercent, formatCompactSoles } from '../../utils/charts'
import { cn } from '../../utils'
import { ChartFrame } from './ChartFrame'
import type { ChartBaseProps } from './types'

export interface DonutItem {
  label: string
  value: number
  percentage?: number
}

interface DonutChartProps extends ChartBaseProps {
  data: readonly DonutItem[]
  title?: string
  centerLabel?: string
}

const colors = ['text-chart-1', 'text-chart-2', 'text-chart-3', 'text-chart-4', 'text-chart-5', 'text-chart-6']
const fillColors = ['bg-chart-1', 'bg-chart-2', 'bg-chart-3', 'bg-chart-4', 'bg-chart-5', 'bg-chart-6']

export function DonutChart({ data, title = 'Distribución', centerLabel = 'Total', status, errorMessage, emptyMessage, className }: DonutChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const segments = donutSegments(data.map((item) => item.value))
  const total = data.reduce((sum, item) => sum + Math.max(0, item.value), 0)
  const summary = `${title}: ${formatCompactSoles(total)}`
  return <section className={cn('chart-panel min-w-0 w-full space-y-4', className)}><h2 className="text-sm font-semibold text-text">{title}</h2><ChartFrame status={status ?? (data.length === 0 ? 'empty' : 'ready')} errorMessage={errorMessage} emptyMessage={emptyMessage}>
    <div className="grid min-w-0 max-w-full items-center gap-5 overflow-hidden chart-plot sm:grid-cols-[180px_minmax(0,1fr)]" role="img" aria-label={summary}>
      <div className="relative mx-auto size-44"><svg className="size-full -rotate-90 overflow-visible" viewBox="0 0 200 200" aria-hidden="true"><circle cx="100" cy="100" r="72" fill="none" strokeWidth="22" className="stroke-slate-100" />{segments.map((segment) => <path key={segment.index} d={arcPath(100, 72, segment.startAngle + Math.min(1, (segment.endAngle - segment.startAngle) / 4), segment.endAngle - Math.min(1, (segment.endAngle - segment.startAngle) / 4))} fill="none" stroke="currentColor" strokeWidth="22" strokeLinecap="butt" className={cn(colors[segment.index % colors.length], 'transition-opacity duration-200 motion-reduce:transition-none', activeIndex !== null && activeIndex !== segment.index ? 'opacity-35' : 'opacity-100')} onMouseEnter={() => setActiveIndex(segment.index)} onMouseLeave={() => setActiveIndex(null)} />)}</svg><div className="absolute inset-0 grid place-items-center text-center"><div><p className="text-xl font-semibold tabular-nums text-text">{formatCompactSoles(total)}</p><p className="mt-1 text-[11px] text-text-muted">{centerLabel}</p></div></div></div>
      <div className="grid min-w-0 gap-2" onMouseLeave={() => setActiveIndex(null)}>{data.map((item, index) => { const segment = segments.find((candidate) => candidate.index === index); const percentage = item.percentage ?? segment?.percentage ?? 0; return <button key={item.label} type="button" className="flex min-w-0 max-w-full items-center justify-between gap-2 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-surface focus-visible:ring-3 focus-visible:ring-accent-soft" onMouseEnter={() => setActiveIndex(index)} onFocus={() => setActiveIndex(index)} onBlur={() => setActiveIndex(null)}><span className="inline-flex min-w-0 items-center gap-2 text-xs text-text-soft"><i className={cn('size-2 shrink-0 rounded-full', fillColors[index % fillColors.length])} /> <span className="truncate">{item.label}</span></span><span className="shrink-0 text-right text-xs tabular-nums text-text"><span className="block">{formatCompactSoles(item.value)}</span><span className="text-text-muted">{formatCompactPercent(percentage)}</span></span></button> })}</div>
    </div>
    <table className="sr-only"><caption>{title}</caption><thead><tr><th>Segmento</th><th>Importe</th><th>Porcentaje</th></tr></thead><tbody>{data.map((item, index) => { const segment = segments.find((candidate) => candidate.index === index); return <tr key={item.label}><td>{item.label}</td><td>{item.value}</td><td>{item.percentage ?? segment?.percentage ?? 0}</td></tr> })}</tbody></table>
  </ChartFrame></section>
}
