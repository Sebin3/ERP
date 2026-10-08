import { clamp } from '../../utils/charts'
import { cn } from '../../utils'

export function ProgressRing({ value, label = 'Completado', size = 'md', className }: { value: number; label?: string; size?: 'sm' | 'md'; className?: string }) {
  const safeValue = clamp(value, 0, 100)
  const radius = size === 'sm' ? 28 : 38
  const center = radius + 8
  const circumference = 2 * Math.PI * radius
  return <div className={cn('relative inline-grid place-items-center', size === 'sm' ? 'size-16' : 'size-24', className)} role="img" aria-label={`${label}: ${safeValue.toFixed(0)}%`}><svg className="size-full -rotate-90" viewBox={`0 0 ${center * 2} ${center * 2}`} aria-hidden="true"><circle cx={center} cy={center} r={radius} fill="none" stroke="var(--color-border)" strokeWidth="6" /><circle cx={center} cy={center} r={radius} fill="none" stroke="var(--color-chart-1)" strokeWidth="6" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - safeValue / 100)} className="motion-safe:animate-chart-draw motion-reduce:animate-none" /></svg><span className="absolute text-center"><strong className="block text-sm font-semibold tabular-nums text-text">{safeValue.toFixed(0)}%</strong><span className="mt-0.5 block text-[10px] text-text-muted">{label}</span></span></div>
}
