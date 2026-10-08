import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { IconButton } from './IconButton'

export function Drawer({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 bg-text/20 backdrop-blur-sm" role="presentation" onMouseDown={onClose}>
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-surface shadow-panel" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-6 py-5"><h2 className="text-lg font-semibold text-text">{title}</h2><IconButton aria-label="Cerrar" onClick={onClose}><X size={18} strokeWidth={1.5} /></IconButton></div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </aside>
    </div>
  )
}
