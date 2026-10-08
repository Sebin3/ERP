import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../utils'
import { Sparkline } from '../charts/Sparkline'
import type { StatusTone } from './StatusPill'

export function KpiCard({ label, value, detail, subtitle, delta, bars = [], sparkline, icon: Icon, tone = 'accent', loading = false }: { label: string; value: string; detail?: ReactNode; subtitle?: ReactNode; delta?: number | null; bars?: number[]; sparkline?: number[]; icon?: LucideIcon; tone?: StatusTone; loading?: boolean }) {
  const toneClasses: Record<StatusTone, string> = { accent: 'bg-accent-soft text-accent', success: 'bg-success-soft text-success', warning: 'bg-warning-soft text-warning', danger: 'bg-danger-soft text-danger', neutral: 'bg-neutral-soft text-neutral' }
  const descripcion = subtitle ?? detail
  if (loading) return <div className="rounded-xl bg-surface p-5" aria-busy="true"><span className="block h-3 w-24 animate-pulse rounded bg-surface-muted" /><span className="mt-3 block h-8 w-36 animate-pulse rounded bg-surface-muted" /><span className="mt-3 block h-3 w-28 animate-pulse rounded bg-surface-muted" /></div>
  const tendencia = sparkline ?? bars
  const DeltaIcon = delta !== null && delta !== undefined && delta >= 0 ? ArrowUpRight : ArrowDownRight
  return <div className="rounded-xl bg-surface p-5"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><p className="text-xs font-medium text-text-muted">{label}</p><p className="mt-2 text-2xl font-semibold tracking-tight text-text tabular-nums">{value}</p>{descripcion ? <p className="mt-1 text-xs text-text-muted">{descripcion}</p> : null}</div>{Icon ? <span className={cn('grid size-8 place-items-center rounded-[10px]', toneClasses[tone])}><Icon size={16} strokeWidth={1.5} /></span> : null}</div>{tendencia.length > 0 || delta !== undefined ? <div className="mt-4 flex items-end justify-between gap-3"><Sparkline values={tendencia} variant={sparkline ? 'line' : 'bars'} ariaLabel={`${label}: tendencia`} />{delta === null || delta === undefined ? <span className="inline-flex items-center gap-1 text-xs font-medium tabular-nums text-text-muted"><ArrowDownRight size={14} strokeWidth={1.5} />—</span> : <span className={cn('inline-flex items-center gap-0.5 text-xs font-medium tabular-nums', delta >= 0 ? 'text-success' : 'text-danger')}><DeltaIcon size={14} strokeWidth={1.5} />{delta >= 0 ? '+' : ''}{delta.toFixed(1)}%</span>}</div> : null}</div>
}
