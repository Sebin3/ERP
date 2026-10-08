import { useMemo, useRef, useState } from 'react'
import { formatCompactSoles } from '../../utils/charts'
import { cn } from '../../utils'
import { SegmentedControl } from '../ui'
import { ChartFrame } from './ChartFrame'
import { ChartTooltip } from './ChartTooltip'
import { useElementSize } from './useElementSize'
import type { ChartBaseProps } from './types'

export interface PixelChartPoint {
  label: string
  ventas: number
  compras?: number
  ventasAnterior?: number | null
}

interface PixelChartProps extends ChartBaseProps {
  data: readonly PixelChartPoint[]
  periodo?: string
  periodOptions?: readonly { value: string; label: string }[]
  onPeriodoChange?: (periodo: string) => void
  mostrarCompras?: boolean
  title?: string
  subtitle?: string
}

const defaultPeriods = [{ value: 'mes', label: 'Mes' }, { value: 'trimestre', label: 'Trimestre' }, { value: '12meses', label: '12 meses' }]

export function PixelChart({ data, periodo, periodOptions = defaultPeriods, onPeriodoChange, mostrarCompras = true, title = 'Ventas vs compras', subtitle = 'Importes facturados por periodo', status, errorMessage, emptyMessage, className }: PixelChartProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const { width: measuredWidth } = useElementSize(wrapperRef)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const width = Math.max(240, Math.round((measuredWidth || 640) - 24))
  const height = 224
  const rows = width < 420 ? 7 : 9
  const maxValue = Math.max(1, ...data.flatMap((point) => [point.ventas, point.compras ?? 0]))
  const columnWidth = width / Math.max(1, data.length)
  const labels = useMemo(() => data.map((point) => point.label), [data])
  const resumen = data.length === 0 ? 'Sin datos' : `${data.length} periodos; ventas ${formatCompactSoles(data.reduce((total, point) => total + point.ventas, 0))}${mostrarCompras ? ` y compras ${formatCompactSoles(data.reduce((total, point) => total + (point.compras ?? 0), 0))}` : ''}`
  const active = activeIndex === null ? null : data[activeIndex]

  return <section className={cn('space-y-4', className)}>
    <div className="flex items-center justify-between gap-3 max-sm:flex-col max-sm:items-start"><div><h2 className="text-sm font-semibold text-text">{title}</h2><p className="mt-1 text-xs text-text-muted">{subtitle}</p></div>{periodo && onPeriodoChange ? <SegmentedControl ariaLabel="Periodo del gráfico" options={periodOptions} value={periodo} onChange={onPeriodoChange} /> : null}</div>
    <ChartFrame status={status} errorMessage={errorMessage} emptyMessage={emptyMessage}>
      <div ref={wrapperRef} className="relative min-w-0 max-w-full overflow-hidden rounded-xl bg-surface-muted p-3" role="img" aria-label={resumen}>
        {active ? <ChartTooltip title={active.label} rows={[{ label: 'Ventas', value: formatCompactSoles(active.ventas), color: 'accent' }, ...(mostrarCompras ? [{ label: 'Compras', value: formatCompactSoles(active.compras ?? 0), color: 'soft' as const }] : [])]} /> : null}
        <svg className="block h-56 w-full overflow-visible" viewBox={`0 0 ${width} ${height}`} aria-hidden="true" preserveAspectRatio="none">
          {Array.from({ length: rows + 1 }, (_, index) => {
            const y = 20 + (index / rows) * 160
            return <line key={`h-${index}`} x1="0" x2={width} y1={y} y2={y} className="stroke-border" strokeWidth="1" strokeDasharray="2 4" />
          })}
          {data.map((point, index) => {
            const ventasBlocks = Math.max(0, Math.round((point.ventas / maxValue) * rows))
            const comprasBlocks = Math.max(0, Math.round(((point.compras ?? 0) / maxValue) * rows))
            const x = index * columnWidth
            const blockWidth = Math.max(4, Math.min(8, (columnWidth - 8) / 2))
            const gap = Math.max(2, Math.min(4, blockWidth / 3))
            const baseY = 180
            return <g key={`${point.label}-${index}`} tabIndex={0} role="button" aria-label={`${point.label}: ventas ${formatCompactSoles(point.ventas)}${mostrarCompras ? `, compras ${formatCompactSoles(point.compras ?? 0)}` : ''}`} className="outline-none" onMouseEnter={() => setActiveIndex(index)} onMouseLeave={() => setActiveIndex(null)} onFocus={() => setActiveIndex(index)} onBlur={() => setActiveIndex(null)}>
              <rect x={x} y="12" width={columnWidth} height="178" className="fill-transparent focus:fill-accent-soft/30" />
              {Array.from({ length: ventasBlocks }, (_, block) => <rect key={`v-${block}`} x={x + columnWidth / 2 - blockWidth - gap / 2} y={baseY - (block + 1) * 10} width={blockWidth} height="8" rx="2" className="fill-chart-1 motion-safe:animate-chart-grow motion-reduce:animate-none" />)}
              {mostrarCompras ? Array.from({ length: comprasBlocks }, (_, block) => <rect key={`c-${block}`} x={x + columnWidth / 2 + gap / 2} y={baseY - (block + 1) * 10} width={blockWidth} height="8" rx="2" className="fill-text-soft motion-safe:animate-chart-grow motion-reduce:animate-none" />) : null}
              {activeIndex === index ? <line x1={x + columnWidth / 2} x2={x + columnWidth / 2} y1="12" y2="180" className="stroke-accent/40" strokeWidth="1" strokeDasharray="2 3" /> : null}
              <text x={x + columnWidth / 2} y="210" textAnchor="middle" className="fill-text-muted text-[11px]">{labels[index]}</text>
            </g>
          })}
        </svg>
        <div className="mt-1 flex items-center gap-4"><span className="inline-flex items-center gap-1.5 text-xs text-text-muted"><i className="size-1.5 rounded-full bg-chart-1" />Ventas</span>{mostrarCompras ? <span className="inline-flex items-center gap-1.5 text-xs text-text-muted"><i className="size-1.5 rounded-full bg-text-soft" />Compras</span> : null}</div>
      </div>
      <table className="sr-only"><caption>Datos de {title.toLowerCase()}</caption><thead><tr><th>Periodo</th><th>Ventas</th>{mostrarCompras ? <th>Compras</th> : null}</tr></thead><tbody>{data.map((point) => <tr key={point.label}><td>{point.label}</td><td>{point.ventas}</td>{mostrarCompras ? <td>{point.compras ?? 0}</td> : null}</tr>)}</tbody></table>
    </ChartFrame>
  </section>
}
