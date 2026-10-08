import { AlertTriangle } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button, type ButtonVariant } from './Button'
import { Modal } from './Modal'

interface ConfirmActionModalProps {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  confirmVariant?: ButtonVariant
  confirmDisabled?: boolean
  onClose: () => void
  onConfirm: () => void
  children?: ReactNode
}

export function ConfirmActionModal({ open, title, description, confirmLabel = 'Confirmar acción', confirmVariant = 'danger', confirmDisabled = false, onClose, onConfirm, children }: ConfirmActionModalProps) {
  return (
    <Modal open={open} title={title} onClose={onClose} size="sm">
      <div className="space-y-5">
        <div className="flex gap-3 rounded-xl bg-danger-soft p-4 text-sm text-danger">
          <AlertTriangle size={18} strokeWidth={1.5} className="mt-0.5 shrink-0" />
          <p className="leading-6">{description}</p>
        </div>
        {children}
        <div className="flex justify-end gap-2 border-t border-border pt-5">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button variant={confirmVariant} onClick={onConfirm} disabled={confirmDisabled}>{confirmLabel}</Button>
        </div>
      </div>
    </Modal>
  )
}
