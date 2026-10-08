import { AlertCircle, Check, X } from 'lucide-react'
import { cn } from '../../utils'
import { IconButton } from './IconButton'

export function Toast({ message, tone = 'success', onClose }: { message: string; tone?: 'success' | 'danger' | 'neutral'; onClose?: () => void }) {
  const Icon = tone === 'danger' ? AlertCircle : Check
  return <div className="fixed bottom-5 right-5 z-[60] flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text shadow-md"><span className={cn('grid size-6 place-items-center rounded-full', tone === 'danger' ? 'bg-danger-soft text-danger' : tone === 'neutral' ? 'bg-neutral-soft text-neutral' : 'bg-success-soft text-success')}><Icon size={14} strokeWidth={1.8} /></span><span>{message}</span>{onClose ? <IconButton className="ml-2 size-6" aria-label="Cerrar aviso" onClick={onClose}><X size={15} strokeWidth={1.5} /></IconButton> : null}</div>
}
