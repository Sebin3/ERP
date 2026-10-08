import { cn } from '../../utils'

export type StatusTone = 'success' | 'warning' | 'danger' | 'neutral' | 'accent'

const toneClasses: Record<StatusTone, string> = {
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  neutral: 'bg-neutral-soft text-neutral',
  accent: 'bg-accent-soft text-accent',
}

const dotClasses: Record<StatusTone, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  neutral: 'bg-neutral',
  accent: 'bg-accent',
}

export function StatusPill({ label, tone = 'neutral' }: { label: string; tone?: StatusTone }) {
  return <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium', toneClasses[tone])}><span className={cn('size-1.5 rounded-full', dotClasses[tone])} />{label}</span>
}
