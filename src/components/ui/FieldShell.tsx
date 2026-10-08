import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../utils'

interface FieldShellProps {
  label?: string
  description?: string
  error?: string
  leadingIcon?: LucideIcon
  children: ReactNode
  className?: string
}

export function FieldShell({ label, description, error, leadingIcon: LeadingIcon, children, className }: FieldShellProps) {
  return (
    <label className={cn('grid gap-2 text-sm', className)}>
      {label ? <span className="font-medium text-text">{label}</span> : null}
      <span className="relative block">
        {LeadingIcon ? <LeadingIcon size={16} strokeWidth={1.5} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" /> : null}
        {children}
      </span>
      {error ? <span className="text-xs text-danger">{error}</span> : description ? <span className="text-xs text-text-muted">{description}</span> : null}
    </label>
  )
}
