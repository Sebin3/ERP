import { useState } from 'react'
import { formatCompactPercent, formatCompactSoles } from '../../utils/charts'
import { cn } from '../../utils'
import { ChartFrame } from './ChartFrame'
import { ChartTooltip } from './ChartTooltip'
import type { ChartBaseProps } from './types'

export interface FunnelStep {
  label: string
  count: number
  amount: number
  conversion?: number
}

interface FunnelStepsProps extends ChartBaseProps {
  data: readonly FunnelStep[]
  title?: string
}

export function FunnelSteps({ data, title = 'Embudo comercial', status, errorMessage, emptyMessage, className }: FunnelStepsProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const maximum = Math.max(1, ...data.map((step) => step.count))
  const active = activeIndex === null ? null : data[activeIndex]
  return <section className={cn('chart-panel min-w-0 space-y-4', className)}><h2 className="text-sm font-semibold text-text">{title}</h2><ChartFrame status={status} errorMessage={errorMessage} emptyMessage={emptyMessage}>
    <div className="relative min-w-0 chart-plot" role="img" aria-label={`${title}: ${data.map((step) => `${step.label} ${step.count}`).join(', ')}`}>
      {active ? <ChartTooltip title={active.label} rows={[{ label: 'Cantidad', value: String(active.count), color: 'accent' }, { label: 'Monto', value: formatCompactSoles(active.amount), color: 'soft' }]} footer={active.conversion === undefined ? undefined : `${formatCompactPercent(active.conversion)} de conversión`} /> : null}
      <div className="grid gap-3">{data.map((step, index) => { const porcentaje = (step.count / maximum) * 100; return <div key={step.label} tabIndex={0} role="button" aria-label={`${step.label}: ${step.count}, ${formatCompactSoles(step.amount)}`} className="min-w-0 rounded-lg outline-none transition-colors focus-visible:bg-surface/70" onMouseEnter={() => setActiveIndex(index)} onMouseLeave={() => setActiveIndex(null)} onFocus={() => setActiveIndex(index)} onBlur={() => setActiveIndex(null)}><div className="flex min-w-0 items-center justify-between gap-3"><span className="min-w-0 truncate text-xs font-medium text-text">{step.label}</span><span className="shrink-0 text-right text-xs tabular-nums text-text"><strong className="font-semibold">{step.count}</strong><span className="ml-2 text-text-muted">{formatCompactSoles(step.amount)}</span></span></div><div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-chart-1 to-chart-2 transition-[width] duration-200 motion-reduce:transition-none" style={{ width: `${porcentaje}%` }} /></div><div className="mt-1 flex justify-end text-[11px] tabular-nums text-text-muted">{index === 0 ? 'Inicio del embudo' : `${formatCompactPercent(step.conversion ?? 0)} desde ${data[index - 1].label}`}</div></div> })}</div>
    </div>
    <table className="sr-only"><caption>{title}</caption><thead><tr><th>Paso</th><th>Cantidad</th><th>Monto</th><th>Conversión</th></tr></thead><tbody>{data.map((step) => <tr key={step.label}><td>{step.label}</td><td>{step.count}</td><td>{step.amount}</td><td>{step.conversion ?? 100}</td></tr>)}</tbody></table>
  </ChartFrame></section>
}
