import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { IconButton } from './IconButton'

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl'

const sizes: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
}

export function Modal({ open, title, onClose, children, size = 'md' }: { open: boolean; title: string; onClose: () => void; children: ReactNode; size?: ModalSize }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-text/20 p-4 backdrop-blur-sm" role="presentation" onMouseDown={onClose}>
      <section className={`w-full ${sizes[size]} max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl bg-surface p-6 shadow-panel`} role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-semibold text-text">{title}</h2><IconButton aria-label="Cerrar" onClick={onClose}><X size={18} strokeWidth={1.5} /></IconButton></div>
        {children}
      </section>
    </div>
  )
}
