import { Check, Minus } from 'lucide-react'
import { forwardRef, useEffect, useRef, type InputHTMLAttributes } from 'react'
import { cn } from '../../utils'

export interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  indeterminate?: boolean
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox({ label, indeterminate = false, className, ...props }, forwardedRef) {
  const internalRef = useRef<HTMLInputElement>(null)
  const marked = indeterminate || props.checked === true

  useEffect(() => {
    if (internalRef.current) internalRef.current.indeterminate = indeterminate
  }, [indeterminate])

  const setRef = (node: HTMLInputElement | null) => {
    internalRef.current = node
    if (typeof forwardedRef === 'function') forwardedRef(node)
    else if (forwardedRef) forwardedRef.current = node
  }

  return (
    <label className={cn('inline-flex cursor-pointer items-center gap-2 text-sm text-text-soft', className)}>
      <span className="relative grid size-[18px] place-items-center">
        <input ref={setRef} type="checkbox" className="peer absolute inset-0 cursor-pointer opacity-0" {...props} />
        <span className={cn('grid size-[18px] place-items-center rounded-[5px] border transition-colors duration-150 peer-focus-visible:ring-3 peer-focus-visible:ring-accent-soft', marked ? 'border-accent bg-accent text-white' : 'border-border bg-surface text-transparent')}>
          {marked ? indeterminate ? <Minus size={11} strokeWidth={2.2} /> : <Check size={11} strokeWidth={2.2} /> : null}
        </span>
      </span>
      {label ? <span>{label}</span> : null}
    </label>
  )
})
