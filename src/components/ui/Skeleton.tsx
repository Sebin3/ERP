import { cn } from '../../utils'

export function Skeleton({ className }: { className?: string }) {
  return <span className={cn('block animate-pulse rounded-[10px] bg-surface-muted', className)} aria-hidden="true" />
}
