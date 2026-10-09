import { useId, useRef, useState } from 'react'
import { EmptyState, SegmentedControl, Skeleton } from '../ui'
import type { SegmentOption } from '../ui'
import { formatCompactSoles, linearScale, niceTicks } from '../../utils/charts'
import { ChartTooltip } from '../charts/ChartTooltip'
import { useElementSize } from '../charts/useElementSize'

interface SalesPurchasesPoint {
  etiqueta: string
  ventas: number
  compras: number
}

interface SalesPurchasesBarChartProps<T extends string> {
  data: readonly SalesPurchasesPoint[]
  periodo: T
  onPeriodoChange: (periodo: T) => void
  periodOptions?: readonly SegmentOption<T>[]
  mostrarCompras?: boolean
  status?: 'loading' | 'empty' | 'error'
  title?: string
  subtitle?: string
  errorMessage?: string
  showPeriodControl?: boolean
}

const defaultPeriodOptions: readonly SegmentOption<string>[] = [
  { value: 'semanal', label: 'Semanal' },
  { value: 'mensual', label: 'Mensual' },
  { value: 'trimestral', label: 'Trimestral' },
]

export function SalesPurchasesBarChart<T extends string>({
  data,
  periodo,
  onPeriodoChange,
  periodOptions,
  mostrarCompras = true,
  status,
  title = 'Ventas vs compras',
  subtitle = 'Importes facturados por periodo',
  errorMessage = 'No se pudo cargar el gráfico.',
  showPeriodControl = true,
}: SalesPurchasesBarChartProps<T>) {
  const chartId = useId()
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const chartRef = useRef<HTMLDivElement>(null)
  const { width: measuredWidth } = useElementSize(chartRef)
  const options = periodOptions ?? (defaultPeriodOptions as readonly SegmentOption<T>[])
  const ticks = niceTicks(Math.max(1, ...data.flatMap((point) => mostrarCompras ? [point.ventas, point.compras] : [point.ventas])))
  const maximum = ticks.at(-1) ?? 1
  const width = Math.max(260, Math.round((measuredWidth || 640) - 32))
  const height = 280
  const padding = { top: 18, right: 12, bottom: 42, left: 62 }
  const columnWidth = (width - padding.left - padding.right) / Math.max(1, data.length)
  const active = activeIndex === null ? null : data[activeIndex]
  const resumen = data.length === 0
    ? 'Sin datos'
    : `${data.length} periodos; ventas ${formatCompactSoles(data.reduce((total, point) => total + point.ventas, 0))}${mostrarCompras ? ` y compras ${formatCompactSoles(data.reduce((total, point) => total + point.compras, 0))}` : ''}`

  if (status === 'loading') {
    return <section className="chart-panel min-w-0 w-full space-y-4" aria-label={title}><ChartHeading title={title} subtitle={subtitle} options={options} periodo={periodo} onPeriodoChange={onPeriodoChange} showPeriodControl={showPeriodControl} /><Skeleton className="h-64 w-full rounded-xl" /></section>
  }

  if (status === 'empty' || status === 'error' || data.length === 0) {
    return <section className="chart-panel min-w-0 w-full" aria-label={title}><EmptyState title={status !== 'error' ? 'Sin datos' : 'Error al cargar'} description={status !== 'error' ? 'No hay periodos para mostrar.' : errorMessage} /></section>
  }

  return (
    <section className="chart-panel min-w-0 w-full space-y-4" aria-label={title}>
      <ChartHeading title={title} subtitle={subtitle} options={options} periodo={periodo} onPeriodoChange={onPeriodoChange} showPeriodControl={showPeriodControl} />
      <div ref={chartRef} className="relative min-w-0 max-w-full overflow-hidden chart-plot" role="img" aria-label={resumen}>
        {active ? <ChartTooltip title={active.etiqueta} rows={[{ label: 'Ventas', value: formatCompactSoles(active.ventas), color: 'accent' }, ...(mostrarCompras ? [{ label: 'Compras', value: formatCompactSoles(active.compras), color: 'soft' as const }] : [])]} /> : null}
        <svg className="block h-64 w-full max-w-full overflow-hidden" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
          <defs><linearGradient id={`${chartId}-sales`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#548BFF" /><stop offset="100%" stopColor="var(--color-chart-1)" /></linearGradient><linearGradient id={`${chartId}-purchases`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2CBCAE" /><stop offset="100%" stopColor="var(--color-chart-2)" /></linearGradient></defs>
          {ticks.map((value) => { const y = linearScale(value, [0, maximum], [height - padding.bottom, padding.top]); return <g key={value}><line x1={padding.left} x2={width - padding.right} y1={y} y2={y} className="stroke-border" strokeWidth="1" strokeDasharray="3 5" /><text x={padding.left - 10} y={y + 4} textAnchor="end" className="fill-text-muted text-[10px]">{formatCompactSoles(value)}</text></g> })}
          {data.map((point, index) => {
            const ventasHeight = linearScale(point.ventas, [0, maximum], [0, height - padding.top - padding.bottom])
            const comprasHeight = linearScale(point.compras, [0, maximum], [0, height - padding.top - padding.bottom])
            const groupX = padding.left + index * columnWidth
            const barWidth = Math.max(1, Math.min(28, columnWidth * (mostrarCompras ? 0.24 : 0.42)))
            const gap = mostrarCompras ? Math.max(1, columnWidth * 0.08) : 0
            const ventasX = groupX + columnWidth / 2 - (mostrarCompras ? barWidth + gap / 2 : barWidth / 2)
            const comprasX = groupX + columnWidth / 2 + gap / 2
            const baseY = height - padding.bottom
            return <g key={`${point.etiqueta}-${index}`} tabIndex={0} role="button" aria-label={`${point.etiqueta}: ventas ${formatCompactSoles(point.ventas)}${mostrarCompras ? `, compras ${formatCompactSoles(point.compras)}` : ''}`} className="outline-none" onMouseEnter={() => setActiveIndex(index)} onMouseLeave={() => setActiveIndex(null)} onFocus={() => setActiveIndex(index)} onBlur={() => setActiveIndex(null)}><rect x={groupX} y={padding.top} width={columnWidth} height={baseY - padding.top} fill={activeIndex === index ? "var(--color-accent-soft)" : "transparent"} rx="6" />{ventasHeight > 0 ? <rect x={ventasX} y={baseY - ventasHeight} width={barWidth} height={ventasHeight} rx="5" fill={`url(#${chartId}-sales)`} className="transition-opacity duration-200 motion-reduce:transition-none" /> : null}{mostrarCompras && comprasHeight > 0 ? <rect x={comprasX} y={baseY - comprasHeight} width={barWidth} height={comprasHeight} rx="5" fill={`url(#${chartId}-purchases)`} className="transition-opacity duration-200 motion-reduce:transition-none" /> : null}{index % Math.max(1, Math.ceil(data.length / (width < 420 ? 4 : 8))) === 0 || index === data.length - 1 ? <text x={groupX + columnWidth / 2} y={height - 14} textAnchor="middle" className="fill-text-muted text-[11px]">{point.etiqueta}</text> : null}</g>
          })}
        </svg>
        <div className="mt-1 flex items-center gap-4"><span className="inline-flex items-center gap-1.5 text-xs text-text-muted"><i className="size-1.5 rounded-full bg-chart-1" />Ventas</span>{mostrarCompras ? <span className="inline-flex items-center gap-1.5 text-xs text-text-muted"><i className="size-1.5 rounded-full bg-chart-2" />Compras</span> : null}</div>
      </div>
      <table className="sr-only"><caption>Datos de ventas y compras</caption><thead><tr><th>Periodo</th><th>Ventas</th>{mostrarCompras ? <th>Compras</th> : null}</tr></thead><tbody>{data.map((point) => <tr key={point.etiqueta}><td>{point.etiqueta}</td><td>{point.ventas}</td>{mostrarCompras ? <td>{point.compras}</td> : null}</tr>)}</tbody></table>
    </section>
  )
}

function ChartHeading<T extends string>({ title, subtitle, options, periodo, onPeriodoChange, showPeriodControl }: { title: string; subtitle: string; options: readonly SegmentOption<T>[]; periodo: T; onPeriodoChange: (periodo: T) => void; showPeriodControl: boolean }) {
  return <div className="flex items-center justify-between gap-3 max-sm:flex-col max-sm:items-start"><div><h2 className="text-sm font-semibold text-text">{title}</h2><p className="mt-1 text-xs text-text-muted">{subtitle}</p></div>{showPeriodControl ? <SegmentedControl ariaLabel="Periodo del gráfico" options={options} value={periodo} onChange={onPeriodoChange} /> : null}</div>
}
