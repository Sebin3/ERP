import { cn } from '../../utils'

export interface TabsProps<T extends string> {
  tabs: Array<{ value: T; label: string; count?: number }>
  value: T
  onChange: (value: T) => void
}

export function Tabs<T extends string>({ tabs, value, onChange }: TabsProps<T>) {
  return (
    <div className="flex gap-5 border-b border-border/70" role="tablist">
      {tabs.map((tab) => {
        const active = tab.value === value
        return (
          <button key={tab.value} type="button" role="tab" aria-selected={active} onClick={() => onChange(tab.value)} className={cn('relative -mb-px flex items-center gap-2 pb-3 text-sm transition-colors duration-150 focus-visible:ring-3 focus-visible:ring-accent-soft', active ? 'font-semibold text-text after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-accent' : 'text-text-muted hover:text-text')}>
            {tab.label}
            {tab.count !== undefined ? <span className="text-xs tabular-nums text-text-muted">{tab.count}</span> : null}
          </button>
        )
      })}
    </div>
  )
}
