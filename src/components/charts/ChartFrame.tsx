import type { ReactNode } from 'react'
import { EmptyState, Skeleton } from '../ui'

export type ChartStatus = 'ready' | 'loading' | 'empty' | 'error'

interface ChartFrameProps {
  status?: ChartStatus
  errorMessage?: string
  emptyMessage?: string
  children: ReactNode
}

export function ChartFrame({ status = 'ready', errorMessage = 'No se pudo cargar el gráfico.', emptyMessage = 'No hay datos para este periodo.', children }: ChartFrameProps) {
  if (status === 'loading') return <div className="grid min-h-48 place-items-center" aria-busy="true"><Skeleton className="h-44 w-full rounded-xl" /></div>
  if (status === 'empty') return <EmptyState title="Sin datos" description={emptyMessage} />
  if (status === 'error') return <EmptyState title="No se pudo mostrar" description={errorMessage} />
  return <>{children}</>
}

export function ChartLegend({ color, label, value }: { color: string; label: string; value?: string }) {
  return <span className="inline-flex items-center gap-2 text-xs text-text-muted"><i className={`size-1.5 rounded-full ${color}`} aria-hidden="true" />{label}{value ? <span className="tabular-nums text-text-soft">{value}</span> : null}</span>
}
