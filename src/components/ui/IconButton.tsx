import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../utils'

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
}

export function IconButton({ className, children, type = 'button', ...props }: IconButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-grid size-8 shrink-0 place-items-center rounded-[10px] text-text-soft transition-colors duration-150 hover:bg-surface-muted hover:text-text focus-visible:ring-3 focus-visible:ring-accent-soft disabled:cursor-not-allowed disabled:opacity-40',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
