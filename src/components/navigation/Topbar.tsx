import { Bell, Menu, Search } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { navigationGroups, navigationRoutes } from '../../modules/navigation'
import { useSesion } from '../../hooks'
import { Avatar, IconButton, Input } from '../ui'

function findRoute(pathname: string) {
  const exactRoute = navigationRoutes.find((route) => route.path === pathname)
  if (exactRoute) return exactRoute
  return [...navigationRoutes].sort((a, b) => b.path.length - a.path.length).find((route) => {
    if (route.path === '/') return pathname === '/'
    return pathname === route.path || pathname.startsWith(`${route.path}/`)
  })
}

export function Topbar({ onOpenMobile, onNotify }: { onOpenMobile: () => void; onNotify: () => void }) {
  const location = useLocation()
  const { usuario } = useSesion()
  const route = findRoute(location.pathname)
  const group = route?.group ? navigationGroups.find((item) => item.id === route.group) : undefined
  const Icon = route?.icon

  return (
    <header className="flex h-[72px] shrink-0 items-center justify-between gap-5 border-b border-border/70 px-8 max-md:h-16 max-md:px-4">
      <div className="flex min-w-0 items-center gap-2.5">
        <IconButton className="!hidden max-md:!inline-grid" aria-label="Abrir menú" onClick={onOpenMobile}><Menu size={19} strokeWidth={1.5} /></IconButton>
        <div className="flex min-w-0 items-center gap-2.5 text-[13px]">
          <span className="grid shrink-0 place-items-center text-accent">{Icon ? <Icon size={15} strokeWidth={1.5} /> : null}</span>
          {group ? <><span className="text-text-muted max-md:hidden">{group.label}</span><span className="text-text-muted max-md:hidden">/</span></> : null}
          <span className="truncate font-medium text-text">{route?.label ?? 'EnterpriseCloud'}</span>
        </div>
      </div>
      <div className="flex items-center gap-2.5">
        <div className="relative w-[220px] max-md:hidden"><Input placeholder="Buscar" aria-label="Buscar" leadingIcon={Search} className="border-transparent bg-surface-muted pr-12" /><span className="pointer-events-none absolute right-2.5 top-2 rounded-[5px] border border-border bg-surface px-1.5 py-0.5 text-[10px] leading-4 text-text-muted">⌘K</span></div>
        <IconButton className="relative" aria-label="Notificaciones" onClick={onNotify}><Bell size={18} strokeWidth={1.5} /><span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-accent" /></IconButton>
        <Avatar name={usuario ? `${usuario.nombres} ${usuario.apellidos}` : 'Sin sesión'} size="sm" />
      </div>
    </header>
  )
}
