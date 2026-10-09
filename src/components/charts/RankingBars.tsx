import { useState } from 'react'
import { formatCompactSoles } from '../../utils/charts'
import { cn } from '../../utils'
import { ChartFrame } from './ChartFrame'
import { ChartTooltip } from './ChartTooltip'
import type { ChartBaseProps, ChartDatum } from './types'

interface RankingBarsProps extends ChartBaseProps {
  data: readonly ChartDatum[]
  title?: string
  valueFormatter?: (value: number) => string
  hideTitle?: boolean
}

export function RankingBars({ data, title = 'Ranking', valueFormatter = formatCompactSoles, hideTitle = false, status, errorMessage, emptyMessage, className }: RankingBarsProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const maximum = Math.max(1, ...data.map((item) => item.value))
  const active = activeIndex === null ? null : data[activeIndex]
  return <section className={cn(hideTitle ? 'min-w-0 space-y-4' : 'chart-panel min-w-0 space-y-4', className)}>{hideTitle ? null : <h2 className="text-sm font-semibold text-text">{title}</h2>}<ChartFrame status={status ?? (data.length === 0 ? 'empty' : 'ready')} errorMessage={errorMessage} emptyMessage={emptyMessage}>
    <div className="relative min-w-0 max-w-full overflow-hidden chart-plot" aria-label={`${title}: ${data.map((item) => `${item.label} ${valueFormatter(item.value)}`).join(', ')}`}>
      {active ? <ChartTooltip title={active.label} rows={[{ label: 'Valor', value: valueFormatter(active.value), color: 'accent' }]} footer={active.detail} /> : null}
      <div className="grid gap-3" onMouseLeave={() => setActiveIndex(null)}>{data.map((item, index) => <button key={`${item.label}-${index}`} type="button" className="grid w-full min-w-0 grid-cols-[28px_minmax(0,1fr)] gap-3 rounded-xl p-2 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" onMouseEnter={() => setActiveIndex(index)} onFocus={() => setActiveIndex(index)} onBlur={() => setActiveIndex(null)} aria-label={`${item.label}: ${valueFormatter(item.value)}`}>
        <span className={cn('mt-0.5 grid size-7 place-items-center rounded-lg text-[11px] font-semibold tabular-nums', index === 0 ? 'bg-accent-soft text-accent' : 'bg-slate-100 text-text-soft')}>{String(index + 1).padStart(2, '0')}</span>
        <span className="min-w-0"><span className="mb-2 flex items-start justify-between gap-3"><span className="min-w-0 break-words text-xs font-medium leading-5 text-text-soft">{item.label}</span><span className="shrink-0 text-xs font-semibold leading-5 tabular-nums text-text">{valueFormatter(item.value)}</span></span><span className="block h-2.5 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-gradient-to-r from-chart-1 to-blue-400 transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${Math.max(0, item.value) / maximum * 100}%` }} /></span></span>
      </button>)}</div>
    </div>
    <table className="sr-only"><caption>{title}</caption><thead><tr><th>Elemento</th><th>Valor</th></tr></thead><tbody>{data.map((item) => <tr key={item.label}><td>{item.label}</td><td>{item.value}</td></tr>)}</tbody></table>
  </ChartFrame></section>
}
