import { monotoneCubicPath, linearScale } from '../../utils/charts'
import { cn } from '../../utils'

export interface SparklineProps {
  values: readonly number[]
  variant?: 'line' | 'bars'
  className?: string
  ariaLabel?: string
}

export function Sparkline({ values, variant = 'line', className, ariaLabel = 'Tendencia' }: SparklineProps) {
  const width = 128
  const height = 36
  const padding = 3
  const maximum = Math.max(1, ...values)
  const points = values.map((value, index) => ({
    x: values.length <= 1 ? width / 2 : padding + (index / (values.length - 1)) * (width - padding * 2),
    y: linearScale(value, [0, maximum], [height - padding, padding]),
  }))
  const path = monotoneCubicPath(points)
  const last = points.at(-1)
  return <svg className={cn('h-9 w-32 overflow-visible', className)} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={ariaLabel} preserveAspectRatio="none">
    {variant === 'bars' ? values.map((value, index) => {
      const barWidth = values.length === 0 ? 0 : Math.max(2, (width - padding * 2) / values.length - 3)
      const x = padding + index * ((width - padding * 2) / Math.max(values.length, 1))
      const y = linearScale(value, [0, maximum], [height - padding, padding])
      return <rect key={index} x={x} y={y} width={barWidth} height={height - padding - y} rx="2" className="fill-chart-1/60 motion-safe:animate-chart-grow motion-reduce:animate-none" />
    }) : <path d={path} fill="none" pathLength="1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-chart-1 motion-safe:animate-chart-draw motion-reduce:animate-none" />}
    {last ? <circle cx={last.x} cy={last.y} r="2.5" className="fill-chart-1 stroke-surface" strokeWidth="1.5" /> : null}
  </svg>
}
