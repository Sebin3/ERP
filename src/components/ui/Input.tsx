import { forwardRef, type InputHTMLAttributes } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../utils'
import { FieldShell } from './FieldShell'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  description?: string
  error?: string
  leadingIcon?: LucideIcon
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ label, description, error, leadingIcon, className, ...props }, ref) {
  return (
    <FieldShell label={label} description={description} error={error} leadingIcon={leadingIcon}>
      <input
        ref={ref}
        className={cn('h-10 w-full rounded-[10px] border border-border bg-surface px-3 text-sm text-text outline-none transition-colors duration-150 placeholder:text-text-muted focus-visible:border-accent focus-visible:ring-3 focus-visible:ring-accent-soft disabled:bg-surface-muted', leadingIcon && 'pl-9', className)}
        {...props}
      />
    </FieldShell>
  )
})
