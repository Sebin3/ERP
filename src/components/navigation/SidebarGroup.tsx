import { ChevronDown, ChevronRight } from 'lucide-react'
import type { NavigationGroup, NavigationRoute } from '../../modules/navigation'
import { cn } from '../../utils'
import { SidebarItem } from './SidebarItem'

interface SidebarGroupProps {
  group: NavigationGroup
  routes: NavigationRoute[]
  open: boolean
  active: boolean
  pathname: string
  count?: number
  onToggle: () => void
  onRouteClick: () => void
}

function isActive(pathname: string, path: string) {
  return path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(`${path}/`)
}

export function SidebarGroup({ group, routes, open, active, pathname, count, onToggle, onRouteClick }: SidebarGroupProps) {
  const GroupIcon = group.icon
  return (
    <section className="space-y-1">
      <button type="button" aria-expanded={open} className={cn('relative flex h-9 w-full items-center gap-2.5 rounded-[10px] px-2.5 text-left text-[13px] text-text-soft transition-colors duration-150 hover:bg-surface-muted hover:text-text focus-visible:ring-3 focus-visible:ring-accent-soft group-data-[collapsed=true]:mx-auto group-data-[collapsed=true]:size-10 group-data-[collapsed=true]:justify-center group-data-[collapsed=true]:p-0 md:max-lg:mx-auto md:max-lg:size-10 md:max-lg:justify-center md:max-lg:p-0', active && 'text-text')} onClick={onToggle}>
        <GroupIcon size={16} strokeWidth={1.5} className="shrink-0" />
        <span className="min-w-0 truncate group-data-[collapsed=true]:hidden md:max-lg:hidden">{group.label}</span>
        {count !== undefined ? <span className="ml-auto inline-flex min-w-6 justify-center rounded-full bg-accent-soft px-1.5 py-0.5 text-[11px] font-semibold leading-4 tabular-nums text-accent group-data-[collapsed=true]:hidden md:max-lg:hidden">{count}</span> : null}
        <span className="ml-auto text-text-muted group-data-[collapsed=true]:hidden md:max-lg:hidden">{open ? <ChevronDown size={15} strokeWidth={1.5} /> : <ChevronRight size={15} strokeWidth={1.5} />}</span>
        {count !== undefined ? <span className="absolute right-2 top-2 hidden size-2 rounded-full bg-accent group-data-[collapsed=true]:block md:max-lg:block" aria-hidden="true" /> : null}
      </button>
      {open ? <div className="relative ml-4 grid gap-1 border-l border-border/60 pl-2 group-data-[collapsed=true]:hidden md:max-lg:hidden">{routes.map((route) => <SidebarItem key={route.id} label={route.label} path={route.path} icon={route.icon} active={isActive(pathname, route.path)} onClick={onRouteClick} />)}</div> : null}
    </section>
  )
}
