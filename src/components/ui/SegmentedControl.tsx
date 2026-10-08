import type { LucideIcon } from 'lucide-react'
import { cn } from '../../utils'

export interface SegmentOption<T extends string> {
  value: T
  label: string
  icon?: LucideIcon
}

export interface SegmentedControlProps<T extends string> {
  options: readonly SegmentOption<T>[]
  value: T
  onChange: (value: T) => void
  ariaLabel: string
}

export function SegmentedControl<T extends string>({ options, value, onChange, ariaLabel }: SegmentedControlProps<T>) {
  return (
    <div className="inline-flex rounded-[10px] bg-surface-muted p-1" role="group" aria-label={ariaLabel}>
      {options.map((option) => {
        const Icon = option.icon
        const active = option.value === value
        return (
          <button key={option.value} type="button" className={cn('inline-flex h-8 items-center gap-2 rounded-[8px] px-3 text-xs font-medium transition-colors duration-150 focus-visible:ring-3 focus-visible:ring-accent-soft', active ? 'bg-surface text-text shadow-sm' : 'text-text-muted hover:text-text')} aria-pressed={active} onClick={() => onChange(option.value)}>
            {Icon ? <Icon size={14} strokeWidth={1.5} /> : null}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
