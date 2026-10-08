import { Check, Circle, CircleAlert } from 'lucide-react'
import { cn } from '../../utils'

export interface WorkflowStepperProps {
  steps: readonly string[]
  currentIndex: number
  currentDescription?: string
  cancelledLabel?: string
  exception?: { label: string; description: string }
  ariaLabel?: string
}

export function WorkflowStepper({ steps, currentIndex, currentDescription, cancelledLabel, exception, ariaLabel = 'Estado del proceso' }: WorkflowStepperProps) {
  const safeCurrentIndex = Math.min(Math.max(currentIndex, 0), Math.max(steps.length - 1, 0))
  const resolvedException = exception ?? (cancelledLabel ? { label: cancelledLabel, description: 'La operación quedó fuera del flujo activo.' } : undefined)

  return (
    <div className="space-y-5">
      <ol aria-label={ariaLabel} className="flex flex-col gap-3 sm:flex-row sm:gap-0">
        {steps.map((label, index) => {
        const completed = index < safeCurrentIndex
        const current = index === safeCurrentIndex
        return (
          <li key={label} className="relative flex min-w-0 flex-1 items-start gap-3 sm:block sm:pr-4">
            {index < steps.length - 1 ? <span aria-hidden="true" className={cn('absolute left-4 top-8 h-full w-px sm:left-8 sm:right-0 sm:top-4 sm:h-px sm:w-auto', completed ? 'bg-accent' : 'bg-border')} /> : null}
            <div className="relative z-10 flex min-w-0 items-start gap-3 sm:block">
              <span className={cn('grid size-8 shrink-0 place-items-center rounded-full border text-xs transition-colors duration-150', completed ? 'border-accent bg-accent text-white' : current ? 'border-accent bg-accent-soft text-accent' : 'border-border bg-surface text-text-muted')} aria-current={current ? 'step' : undefined}>
                {completed ? <Check size={14} strokeWidth={2} /> : current ? <Circle size={14} strokeWidth={1.5} /> : <span className="tabular-nums">{index + 1}</span>}
              </span>
              <span className="min-w-0 sm:mt-2 sm:block">
                <span className={cn('block truncate text-xs font-medium', current ? 'text-text' : 'text-text-muted')}>{label}</span>
                <span className="mt-0.5 block text-[11px] text-text-muted">{completed ? 'Completado' : current ? currentDescription ?? 'Estado actual' : 'Pendiente'}</span>
              </span>
            </div>
          </li>
        )
        })}
      </ol>
      {resolvedException ? <div role="status" className="flex items-start gap-2 rounded-xl bg-danger-soft px-3 py-2.5 text-sm text-danger"><CircleAlert size={16} className="mt-0.5 shrink-0" strokeWidth={1.5} /><span><strong className="font-medium">{resolvedException.label}</strong><span className="ml-1 text-danger/80">{resolvedException.description}</span></span></div> : null}
    </div>
  )
}
