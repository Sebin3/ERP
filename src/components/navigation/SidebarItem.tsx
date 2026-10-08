import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '../../utils'

interface SidebarItemProps {
  label: string
  path: string
  icon: LucideIcon
  active: boolean
  count?: number
  standalone?: boolean
  onClick: () => void
}

export function SidebarItem({ label, path, icon: Icon, active, count, standalone = false, onClick }: SidebarItemProps) {
  return (
    <Link
      to={path}
      title={label}
      aria-current={active ? 'page' : undefined}
      onClick={onClick}
      className={cn('relative flex h-9 w-full items-center gap-2.5 rounded-[10px] px-2.5 text-[13px] text-text-soft transition-colors duration-150 hover:bg-surface-muted hover:text-text focus-visible:ring-3 focus-visible:ring-accent-soft group-data-[collapsed=true]:mx-auto group-data-[collapsed=true]:size-10 group-data-[collapsed=true]:justify-center group-data-[collapsed=true]:p-0 md:max-lg:mx-auto md:max-lg:size-10 md:max-lg:justify-center md:max-lg:p-0', active && 'bg-surface font-semibold text-text', standalone && 'mb-1')}
    >
      <Icon size={16} strokeWidth={1.5} className="shrink-0" />
      <span className="min-w-0 truncate group-data-[collapsed=true]:hidden md:max-lg:hidden">{label}</span>
      {count !== undefined ? <span className="ml-auto inline-flex min-w-6 justify-center rounded-full bg-accent-soft px-1.5 py-0.5 text-[11px] font-semibold leading-4 tabular-nums text-accent group-data-[collapsed=true]:hidden md:max-lg:hidden">{count}</span> : null}
      {count !== undefined ? <span className="absolute right-2 top-2 hidden size-2 rounded-full bg-accent group-data-[collapsed=true]:block md:max-lg:block" aria-hidden="true" /> : null}
    </Link>
  )
}
