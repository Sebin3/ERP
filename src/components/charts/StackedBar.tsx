import { useState } from 'react'
import { formatCompactSoles, formatCompactPercent } from '../../utils/charts'
import { cn } from '../../utils'
import { ChartFrame } from './ChartFrame'
import { ChartTooltip } from './ChartTooltip'
import type { ChartBaseProps } from './types'

export interface StackedBarItem {
  label: string
  value: number
  count: number
  tone: 'success' | 'warning-soft' | 'warning' | 'danger'
}

interface StackedBarProps extends ChartBaseProps {
  data: readonly StackedBarItem[]
  title?: string
}

const segmentColors: Record<StackedBarItem['tone'], string> = {
  success: 'fill-success',
  'warning-soft': 'fill-warning/60',
  warning: 'fill-warning',
  danger: 'fill-danger',
}

export function StackedBar({ data, title = 'Antigüedad de saldos', status, errorMessage, emptyMessage, className }: StackedBarProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const total = data.reduce((sum, item) => sum + Math.max(0, item.value), 0)
  const active = activeIndex === null ? null : data[activeIndex]
  return <section className={cn('chart-panel min-w-0 space-y-4', className)}><h2 className="text-sm font-semibold text-text">{title}</h2><ChartFrame status={status} errorMessage={errorMessage} emptyMessage={emptyMessage}>
    <div className="relative chart-plot" role="img" aria-label={`${title}: ${formatCompactSoles(total)}`}>
      {active ? <ChartTooltip title={active.label} rows={[{ label: 'Saldo', value: formatCompactSoles(active.value), color: active.tone === 'danger' ? 'danger' : active.tone === 'success' ? 'success' : 'warning' }]} footer={`${active.count} cuentas · ${total === 0 ? '0%' : formatCompactPercent((active.value / total) * 100)}`} /> : null}
      <svg className="block h-7 w-full overflow-visible" viewBox="0 0 640 16" preserveAspectRatio="none" aria-hidden="true">{data.map((item, index) => { const width = total === 0 ? 0 : (Math.max(0, item.value) / total) * 640; const x = total === 0 ? 0 : data.slice(0, index).reduce((sum, segment) => sum + Math.max(0, segment.value), 0) / total * 640; return width === 0 ? null : <rect key={item.label} x={x} y="0" width={Math.max(1, width - 1)} height="16" rx="3" className={cn(segmentColors[item.tone], 'transition-opacity duration-200 motion-reduce:transition-none', activeIndex !== null && activeIndex !== index ? 'opacity-40' : 'opacity-100')} onMouseEnter={() => setActiveIndex(index)} onMouseLeave={() => setActiveIndex(null)} /> })}</svg>
      <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">{data.map((item, index) => <button key={item.label} type="button" className="flex min-w-0 items-start gap-2 text-left focus-visible:ring-3 focus-visible:ring-accent-soft" onMouseEnter={() => setActiveIndex(index)} onFocus={() => setActiveIndex(index)} onBlur={() => setActiveIndex(null)}><i className={cn('mt-1 size-2 shrink-0 rounded-full', item.tone === 'success' ? 'bg-success' : item.tone === 'danger' ? 'bg-danger' : item.tone === 'warning' ? 'bg-warning' : 'bg-warning/60')} /><span className="min-w-0"><span className="block truncate text-[11px] text-text-muted">{item.label}</span><span className="mt-0.5 block text-xs font-medium tabular-nums text-text">{formatCompactSoles(item.value)} <span className="font-normal text-text-muted">· {item.count}</span></span></span></button>)}</div>
    </div>
    <table className="sr-only"><caption>{title}</caption><thead><tr><th>Franja</th><th>Importe</th><th>Cantidad</th></tr></thead><tbody>{data.map((item) => <tr key={item.label}><td>{item.label}</td><td>{item.value}</td><td>{item.count}</td></tr>)}</tbody></table>
  </ChartFrame></section>
}
