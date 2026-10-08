import { LoaderCircle } from 'lucide-react'
import type { ButtonHTMLAttributes } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../utils'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  leadingIcon?: LucideIcon
}

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-white hover:bg-accent-hover',
  secondary: 'border border-border bg-surface text-text hover:bg-surface-muted',
  ghost: 'text-text-soft hover:bg-surface-muted hover:text-text',
  danger: 'bg-danger text-white hover:bg-danger/90',
}

const sizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5 text-sm',
}

export function Button({ children, className, variant = 'primary', size = 'md', loading = false, leadingIcon: LeadingIcon, disabled, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      className={cn('inline-flex shrink-0 items-center justify-center gap-2 rounded-[10px] font-medium transition-colors duration-150 active:translate-y-px focus-visible:ring-3 focus-visible:ring-accent-soft disabled:cursor-not-allowed disabled:opacity-50', variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <LoaderCircle size={15} strokeWidth={1.5} className="animate-spin" /> : LeadingIcon ? <LeadingIcon size={16} strokeWidth={1.5} /> : null}
      {children}
    </button>
  )
}
