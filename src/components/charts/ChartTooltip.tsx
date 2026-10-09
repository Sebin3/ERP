import type { ChartTooltipProps } from './types'

const dotColors = {
  accent: 'bg-chart-1',
  soft: 'bg-chart-2',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  neutral: 'bg-chart-5',
}

export function ChartTooltip({ title, rows, footer }: ChartTooltipProps) {
  return <div className="chart-tooltip pointer-events-none absolute right-3 top-3 z-20 min-w-44 rounded-xl px-4 py-3 text-xs text-text" role="status">
    <p className="font-semibold">{title}</p>
    <div className="mt-2 grid gap-1.5">
      {rows.map((row) => <div key={row.label} className="flex items-center justify-between gap-4"><span className="inline-flex items-center gap-1.5 text-text-muted"><i className={`size-1.5 rounded-full ${dotColors[row.color]}`} aria-hidden="true" />{row.label}</span><span className="font-medium tabular-nums text-text">{row.value}</span></div>)}
    </div>
    {footer ? <div className="mt-2 border-t border-border pt-2 text-text-muted">{footer}</div> : null}
  </div>
}
