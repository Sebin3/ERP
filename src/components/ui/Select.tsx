import { ChevronDown } from 'lucide-react'
import type { SelectHTMLAttributes } from 'react'
import { cn } from '../../utils'
import { FieldShell } from './FieldShell'

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  description?: string
  error?: string
  options?: ReadonlyArray<{ value: string; label: string }>
}

export function Select({ label, description, error, options, className, children, ...props }: SelectProps) {
  return (
    <FieldShell label={label} description={description} error={error}>
      <select className={cn('h-10 w-full appearance-none rounded-[10px] border border-border bg-surface px-3 pr-9 text-sm text-text outline-none transition-colors duration-150 focus-visible:border-accent focus-visible:ring-3 focus-visible:ring-accent-soft', className)} {...props}>
        {children ?? options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      <ChevronDown size={16} strokeWidth={1.5} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" />
    </FieldShell>
  )
}
