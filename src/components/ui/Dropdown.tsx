import { MoreHorizontal } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useEffect, useRef, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../utils'
import { IconButton } from './IconButton'

export interface DropdownItem {
  label: string
  onSelect: () => void
  icon?: LucideIcon
  danger?: boolean
}

export function Dropdown({ items, label = 'Más acciones' }: { items: DropdownItem[]; label?: string }) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<{ top: number; right: number } | null>(null)
  const triggerRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const updatePosition = () => {
      const trigger = triggerRef.current?.getBoundingClientRect()
      if (!trigger) return
      setPosition({ top: trigger.bottom + 8, right: Math.max(8, window.innerWidth - trigger.right) })
    }
    const closeFromOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false)
    }
    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    document.addEventListener('mousedown', closeFromOutside)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
      document.removeEventListener('mousedown', closeFromOutside)
    }
  }, [open])

  return (
    <div ref={triggerRef} className="relative">
      <IconButton aria-label={label} aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen((current) => !current)}><MoreHorizontal size={18} strokeWidth={1.5} /></IconButton>
      {open && position ? createPortal(<div ref={menuRef} className="z-[70] min-w-40 rounded-xl border border-border bg-surface p-1 shadow-md" style={{ position: 'fixed', top: position.top, right: position.right }} role="menu">
        {items.map((item) => { const Icon = item.icon; return <button type="button" key={item.label} role="menuitem" className={cn('flex w-full items-center gap-2 rounded-[8px] px-3 py-2 text-left text-xs transition-colors duration-150 hover:bg-surface-muted focus-visible:ring-3 focus-visible:ring-accent-soft', item.danger ? 'text-danger' : 'text-text-soft')} onClick={() => { setOpen(false); item.onSelect() }}>{Icon ? <Icon size={14} strokeWidth={1.5} /> : null}{item.label}</button> })}
      </div>, document.body) : null}
    </div>
  )
}
