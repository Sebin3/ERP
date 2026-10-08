import type { HTMLAttributes } from 'react'
import { cn } from '../../utils'

export function Card({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-xl border border-border bg-surface', className)} {...props}>{children}</div>
}
