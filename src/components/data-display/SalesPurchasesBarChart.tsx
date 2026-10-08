import { useRef, useState } from 'react'
import { EmptyState, SegmentedControl, Skeleton } from '../ui'
import type { SegmentOption } from '../ui'
import { formatCompactSoles, linearScale } from '../../utils/charts'
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
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const chartRef = useRef<HTMLDivElement>(null)
  const { width: measuredWidth } = useElementSize(chartRef)
  const options = periodOptions ?? (defaultPeriodOptions as readonly SegmentOption<T>[])
  const maximum = Math.max(1, ...data.flatMap((point) => [point.ventas, point.compras]))
  const width = Math.max(200, Math.round((measuredWidth || 640) - 32))
  const height = 250
  const padding = { top: 18, right: 12, bottom: 42, left: 12 }
  const columnWidth = (width - padding.left - padding.right) / Math.max(1, data.length)
  const active = activeIndex === null ? null : data[activeIndex]
  const resumen = data.length === 0
    ? 'Sin datos'
    : `${data.length} periodos; ventas ${formatCompactSoles(data.reduce((total, point) => total + point.ventas, 0))}${mostrarCompras ? ` y compras ${formatCompactSoles(data.reduce((total, point) => total + point.compras, 0))}` : ''}`

  if (status === 'loading') {
    return <section className="w-full max-w-[760px] space-y-4" aria-label={title}><ChartHeading title={title} subtitle={subtitle} options={options} periodo={periodo} onPeriodoChange={onPeriodoChange} showPeriodControl={showPeriodControl} /><Skeleton className="h-64 w-full rounded-xl" /></section>
  }

  if (status === 'empty' || status === 'error') {
    return <section className="w-full max-w-[760px]" aria-label={title}><EmptyState title={status === 'empty' ? 'Sin datos' : 'Error al cargar'} description={status === 'empty' ? 'No hay periodos para mostrar.' : errorMessage} /></section>
  }

  return (
    <section className="w-full max-w-[760px] space-y-3" aria-label={title}>
      <ChartHeading title={title} subtitle={subtitle} options={options} periodo={periodo} onPeriodoChange={onPeriodoChange} showPeriodControl={showPeriodControl} />
      <div ref={chartRef} className="relative min-w-0 max-w-full overflow-hidden rounded-xl bg-surface-muted p-3" role="img" aria-label={resumen}>
        {active ? <div className="pointer-events-none absolute right-3 top-3 z-10 min-w-40 rounded-xl bg-surface px-3 py-2.5 text-xs shadow-md"><p className="font-semibold text-text">{active.etiqueta}</p><p className="mt-1.5 flex items-center justify-between gap-4 text-text-muted"><span><i className="mr-1.5 inline-block size-1.5 rounded-full bg-chart-1" />Ventas</span><strong className="tabular-nums text-text">{formatCompactSoles(active.ventas)}</strong></p>{mostrarCompras ? <p className="mt-1 flex items-center justify-between gap-4 text-text-muted"><span><i className="mr-1.5 inline-block size-1.5 rounded-full bg-text-soft" />Compras</span><strong className="tabular-nums text-text">{formatCompactSoles(active.compras)}</strong></p> : null}</div> : null}
        <svg className="block h-48 w-full max-w-full overflow-hidden" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
          {[0, 1, 2, 3].map((tick) => { const y = padding.top + tick * ((height - padding.top - padding.bottom) / 3); return <line key={tick} x1={padding.left} x2={width - padding.right} y1={y} y2={y} className="stroke-border" strokeWidth="1" strokeDasharray="2 4" /> })}
          {data.map((point, index) => {
            const ventasHeight = linearScale(point.ventas, [0, maximum], [0, height - padding.top - padding.bottom])
            const comprasHeight = linearScale(point.compras, [0, maximum], [0, height - padding.top - padding.bottom])
            const groupX = padding.left + index * columnWidth
            const barWidth = Math.max(5, Math.min(18, columnWidth * (mostrarCompras ? 0.24 : 0.42)))
            const gap = mostrarCompras ? Math.max(3, columnWidth * 0.06) : 0
            const ventasX = groupX + columnWidth / 2 - barWidth - gap / 2
            const comprasX = groupX + columnWidth / 2 + gap / 2
            const baseY = height - padding.bottom
            return <g key={`${point.etiqueta}-${index}`} tabIndex={0} role="button" aria-label={`${point.etiqueta}: ventas ${formatCompactSoles(point.ventas)}${mostrarCompras ? `, compras ${formatCompactSoles(point.compras)}` : ''}`} className="outline-none" onMouseEnter={() => setActiveIndex(index)} onMouseLeave={() => setActiveIndex(null)} onFocus={() => setActiveIndex(index)} onBlur={() => setActiveIndex(null)}><rect x={groupX} y={padding.top} width={columnWidth} height={baseY - padding.top} className="fill-transparent" />{ventasHeight > 0 ? <rect x={ventasX} y={baseY - ventasHeight} width={barWidth} height={ventasHeight} rx="5" className="fill-chart-1 transition-opacity duration-200 motion-reduce:transition-none" /> : null}{mostrarCompras && comprasHeight > 0 ? <rect x={comprasX} y={baseY - comprasHeight} width={barWidth} height={comprasHeight} rx="5" className="fill-text-soft transition-opacity duration-200 motion-reduce:transition-none" /> : null}<text x={groupX + columnWidth / 2} y={height - 14} textAnchor="middle" className="fill-text-muted text-[11px]">{point.etiqueta}</text></g>
          })}
        </svg>
        <div className="mt-1 flex items-center gap-4"><span className="inline-flex items-center gap-1.5 text-xs text-text-muted"><i className="size-1.5 rounded-full bg-chart-1" />Ventas</span>{mostrarCompras ? <span className="inline-flex items-center gap-1.5 text-xs text-text-muted"><i className="size-1.5 rounded-full bg-text-soft" />Compras</span> : null}</div>
      </div>
      <table className="sr-only"><caption>Datos de ventas y compras</caption><thead><tr><th>Periodo</th><th>Ventas</th>{mostrarCompras ? <th>Compras</th> : null}</tr></thead><tbody>{data.map((point) => <tr key={point.etiqueta}><td>{point.etiqueta}</td><td>{point.ventas}</td>{mostrarCompras ? <td>{point.compras}</td> : null}</tr>)}</tbody></table>
    </section>
  )
}

function ChartHeading<T extends string>({ title, subtitle, options, periodo, onPeriodoChange, showPeriodControl }: { title: string; subtitle: string; options: readonly SegmentOption<T>[]; periodo: T; onPeriodoChange: (periodo: T) => void; showPeriodControl: boolean }) {
  return <div className="flex items-center justify-between gap-3 max-sm:flex-col max-sm:items-start"><div><h2 className="text-sm font-semibold text-text">{title}</h2><p className="mt-1 text-xs text-text-muted">{subtitle}</p></div>{showPeriodControl ? <SegmentedControl ariaLabel="Periodo del gráfico" options={options} value={periodo} onChange={onPeriodoChange} /> : null}</div>
}
