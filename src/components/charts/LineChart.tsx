import { useMemo, useRef, useState } from 'react'
import { formatCompactSoles, linearScale, monotoneCubicPath } from '../../utils/charts'
import { cn } from '../../utils'
import { ChartFrame } from './ChartFrame'
import { ChartTooltip } from './ChartTooltip'
import { useElementSize } from './useElementSize'
import type { ChartBaseProps, SeriesDatum } from './types'

interface LineChartProps extends ChartBaseProps {
  data: readonly SeriesDatum[]
  title?: string
  subtitle?: string
  valueLabel?: string
  secondaryLabel?: string
  previousLabel?: string
  area?: boolean
}

export function LineChart({ data, title = 'Tendencia', subtitle, valueLabel = 'Valor', secondaryLabel, previousLabel = 'Periodo anterior', area = false, status, errorMessage, emptyMessage, className }: LineChartProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const { width: measuredWidth } = useElementSize(wrapperRef)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [visible, setVisible] = useState({ primary: true, secondary: Boolean(secondaryLabel), previous: true })
  const width = Math.max(240, Math.round((measuredWidth || 640) - 24))
  const height = 224
  const padding = { top: 20, right: 12, bottom: 26, left: 10 }
  const values = data.flatMap((point) => [point.value, point.secondary ?? 0, point.previous ?? 0])
  const maximum = Math.max(1, ...values)
  const pointAt = (value: number, index: number) => ({ x: data.length <= 1 ? width / 2 : padding.left + (index / (data.length - 1)) * (width - padding.left - padding.right), y: linearScale(value, [0, maximum], [height - padding.bottom, padding.top]) })
  const primaryPoints = useMemo(() => data.map((point, index) => pointAt(point.value, index)), [data, width])
  const secondaryPoints = useMemo(() => data.map((point, index) => pointAt(point.secondary ?? 0, index)), [data, width])
  const previousPoints = useMemo(() => data.map((point, index) => pointAt(point.previous ?? 0, index)), [data, width])
  const active = activeIndex === null ? null : data[activeIndex]
  const toggle = (key: keyof typeof visible) => setVisible((current) => ({ ...current, [key]: !current[key] }))
  const pathFor = (points: readonly { x: number; y: number }[]) => monotoneCubicPath(points)
  const areaPath = `${pathFor(primaryPoints)} L ${primaryPoints.at(-1)?.x ?? 0} ${height - padding.bottom} L ${primaryPoints[0]?.x ?? 0} ${height - padding.bottom} Z`
  const summary = data.length === 0 ? 'Sin datos' : `${data.length} puntos para ${valueLabel}`

  return <section className={cn('space-y-3', className)}>
    <div><h2 className="text-sm font-semibold text-text">{title}</h2>{subtitle ? <p className="mt-1 text-xs text-text-muted">{subtitle}</p> : null}</div>
    <ChartFrame status={status} errorMessage={errorMessage} emptyMessage={emptyMessage}>
      <div ref={wrapperRef} className="relative min-w-0 max-w-full overflow-hidden rounded-xl bg-surface-muted p-3" role="img" aria-label={summary}>
        {active ? <ChartTooltip title={active.label} rows={[...(visible.primary ? [{ label: valueLabel, value: formatCompactSoles(active.value), color: 'accent' as const }] : []), ...(secondaryLabel && visible.secondary ? [{ label: secondaryLabel, value: formatCompactSoles(active.secondary ?? 0), color: 'soft' as const }] : []), ...(visible.previous && active.previous !== null && active.previous !== undefined ? [{ label: previousLabel, value: formatCompactSoles(active.previous), color: 'neutral' as const }] : [])]} /> : null}
        <svg className="block h-48 w-full max-w-full overflow-hidden" viewBox={`0 0 ${width} ${height}`} aria-hidden="true" preserveAspectRatio="none">
          {[0, 1, 2, 3].map((tick) => { const y = padding.top + tick * ((height - padding.top - padding.bottom) / 3); return <line key={tick} x1={padding.left} x2={width - padding.right} y1={y} y2={y} className="stroke-border" strokeWidth="1" strokeDasharray="2 4" /> })}
          {area && visible.primary ? <path d={areaPath} className="fill-chart-1/10 motion-safe:animate-chart-grow motion-reduce:animate-none" /> : null}
          {visible.previous && data.some((point) => point.previous !== null && point.previous !== undefined) ? <path d={pathFor(previousPoints)} fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" className="text-chart-5 motion-safe:animate-chart-draw motion-reduce:animate-none" /> : null}
          {visible.secondary && secondaryLabel ? <path d={pathFor(secondaryPoints)} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-text-soft motion-safe:animate-chart-draw motion-reduce:animate-none" /> : null}
          {visible.primary ? <path d={pathFor(primaryPoints)} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-chart-1 motion-safe:animate-chart-draw motion-reduce:animate-none" /> : null}
          {data.map((point, index) => { const current = primaryPoints[index]; return <g key={`${point.label}-${index}`} tabIndex={0} role="button" aria-label={`${point.label}: ${formatCompactSoles(point.value)}`} className="outline-none" onMouseEnter={() => setActiveIndex(index)} onMouseLeave={() => setActiveIndex(null)} onFocus={() => setActiveIndex(index)} onBlur={() => setActiveIndex(null)}><rect x={current.x - 16} y={padding.top} width="32" height={height - padding.bottom - padding.top} className="fill-transparent" />{activeIndex === index ? <><line x1={current.x} x2={current.x} y1={padding.top} y2={height - padding.bottom} className="stroke-accent/40" strokeWidth="1" strokeDasharray="2 3" />{visible.primary ? <circle cx={current.x} cy={current.y} r="4" className="fill-chart-1 stroke-surface" strokeWidth="2" /> : null}</> : null}</g> })}
        </svg>
        <div className="flex flex-wrap items-center gap-4 pt-1"><button type="button" className={cn('inline-flex items-center gap-1.5 text-xs transition-opacity focus-visible:ring-3 focus-visible:ring-accent-soft', visible.primary ? 'text-text-muted' : 'text-text-muted/40')} onClick={() => toggle('primary')}><i className="size-1.5 rounded-full bg-chart-1" />{valueLabel}</button>{secondaryLabel ? <button type="button" className={cn('inline-flex items-center gap-1.5 text-xs transition-opacity focus-visible:ring-3 focus-visible:ring-accent-soft', visible.secondary ? 'text-text-muted' : 'text-text-muted/40')} onClick={() => toggle('secondary')}><i className="size-1.5 rounded-full bg-text-soft" />{secondaryLabel}</button> : null}<button type="button" className={cn('inline-flex items-center gap-1.5 text-xs transition-opacity focus-visible:ring-3 focus-visible:ring-accent-soft', visible.previous ? 'text-text-muted' : 'text-text-muted/40')} onClick={() => toggle('previous')}><i className="size-1.5 rounded-full bg-chart-5" />{previousLabel}</button></div>
      </div>
      <table className="sr-only"><caption>Datos de {title.toLowerCase()}</caption><thead><tr><th>Periodo</th><th>{valueLabel}</th>{secondaryLabel ? <th>{secondaryLabel}</th> : null}<th>{previousLabel}</th></tr></thead><tbody>{data.map((point) => <tr key={point.label}><td>{point.label}</td><td>{point.value}</td>{secondaryLabel ? <td>{point.secondary ?? 0}</td> : null}<td>{point.previous ?? ''}</td></tr>)}</tbody></table>
    </ChartFrame>
  </section>
}

export function AreaChart(props: Omit<LineChartProps, 'area'>) {
  return <LineChart {...props} area />
}
