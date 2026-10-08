import { LogOut } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import type { RolSistema, Usuario, RecursoSistema } from '../../types'
import { gruposVisiblesParaRol, navigationRouteById, navigationSidebar, rutasVisiblesParaRol, type NavigationGroupId, type SidebarCounter } from '../../modules/navigation'
import { useContadoresSidebar, usePermisos, useSesion } from '../../hooks'
import { useERPStore } from '../../store'
import { cn } from '../../utils'
import { Avatar, IconButton } from '../ui'
import { SidebarGroup } from './SidebarGroup'
import { SidebarHeader } from './SidebarHeader'
import { SidebarItem } from './SidebarItem'

export interface SidebarProps {
  collapsed: boolean
  mobileOpen: boolean
  onToggle: () => void
  onCloseMobile: () => void
}

function routeIsActive(pathname: string, routePath: string) {
  if (routePath === '/') return pathname === '/'
  return pathname === routePath || pathname.startsWith(`${routePath}/`)
}

function SidebarProfile({ usuario, rol, onLogout }: { usuario?: Usuario; rol?: RolSistema; onLogout: () => unknown }) {
  const nombre = usuario ? `${usuario.nombres} ${usuario.apellidos}` : 'Sin sesión'
  return (
    <footer className="mt-auto shrink-0 rounded-xl bg-surface p-3 group-data-[collapsed=true]:p-2 md:max-lg:p-2">
      <div className="flex items-center gap-3 group-data-[collapsed=true]:justify-center md:max-lg:justify-center">
        <span className="relative shrink-0">
          <Avatar name={nombre} />
          <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full border-2 border-surface bg-success" />
        </span>
        <span className="min-w-0 flex-1 group-data-[collapsed=true]:hidden md:max-lg:hidden">
          <span className="block truncate text-sm font-semibold text-text">{nombre}</span>
          <span className="mt-0.5 block truncate text-xs text-text-muted">{rol ?? 'Sin rol'}</span>
        </span>
        <IconButton className="group-data-[collapsed=true]:hidden md:max-lg:hidden" aria-label="Cerrar sesión" onClick={() => { onLogout() }}>
          <LogOut size={16} strokeWidth={1.5} />
        </IconButton>
      </div>
    </footer>
  )
}

export function Sidebar({ collapsed, mobileOpen, onToggle, onCloseMobile }: SidebarProps) {
  const location = useLocation()
  const { usuario, rol, cerrarSesion } = useSesion()
  const state = useERPStore()
  const { puede } = usePermisos()
  const counters = useContadoresSidebar()
  const [isMobileViewport, setIsMobileViewport] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches)
  const [openGroups, setOpenGroups] = useState<Record<NavigationGroupId, boolean>>({ comercial: true, compras: true, inventario: true, finanzas: true, maestros: true, administracion: true })

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)')
    const updateViewport = () => setIsMobileViewport(mediaQuery.matches)
    updateViewport()
    mediaQuery.addEventListener('change', updateViewport)
    return () => mediaQuery.removeEventListener('change', updateViewport)
  }, [])

  const effectiveCollapsed = collapsed && !isMobileViewport
  const visibleRoutes = rutasVisiblesParaRol(rol, state)
  const visibleGroups = gruposVisiblesParaRol(rol, state)
  const dashboard = visibleRoutes.find((route) => route.id === 'dashboard')

  const counterValue = (counter?: SidebarCounter) => counter ? counters[counter] : undefined
  const permittedCounter = (counter?: SidebarCounter, counterResource?: RecursoSistema, counterAction: Parameters<typeof puede>[1] = 'ver') => counterResource && puede(counterResource, counterAction) ? counterValue(counter) : undefined

  const toggleGroup = (groupId: NavigationGroupId) => {
    setOpenGroups((current) => ({ ...current, [groupId]: effectiveCollapsed ? true : !current[groupId] }))
    if (effectiveCollapsed) onToggle()
  }

  const renderRoute = (routeId: string) => {
    const route = navigationRouteById[routeId]
    if (!route) return null
    const count = permittedCounter(route.counter, route.counterResource, route.counterAction)
    return <SidebarItem key={route.id} label={route.label} path={route.path} icon={route.icon} active={routeIsActive(location.pathname, route.path)} count={count} onClick={onCloseMobile} />
  }

  const renderSidebarEntry = (entry: typeof navigationSidebar[number]) => {
    if (entry.type === 'route') {
      return visibleRoutes.some((route) => route.id === entry.id) ? renderRoute(entry.id) : null
    }

    const group = visibleGroups.find((item) => item.id === entry.id)
    if (!group) return null
    const active = group.routes.some((route) => routeIsActive(location.pathname, route.path))
    const count = permittedCounter(group.counter, group.counterResource, group.counterAction)
    return <SidebarGroup key={group.id} group={group} routes={group.routes} open={openGroups[group.id]} active={active} pathname={location.pathname} count={count} onToggle={() => toggleGroup(group.id)} onRouteClick={onCloseMobile} />
  }

  return (
    <aside data-collapsed={effectiveCollapsed} data-mobile-open={mobileOpen} className={cn('group relative z-20 isolate flex min-h-dvh w-[264px] basis-[264px] shrink-0 flex-col overflow-hidden bg-surface px-4 pb-4 pt-6 transition-[width,flex-basis,transform] duration-200 ease-out md:sticky md:top-0 md:self-start data-[collapsed=true]:w-[72px] data-[collapsed=true]:basis-[72px] md:max-lg:w-[72px] md:max-lg:basis-[72px] max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:-translate-x-[105%] max-md:data-[mobile-open=true]:translate-x-0')}>
      <SidebarHeader collapsed={effectiveCollapsed} onToggle={onToggle} />
      <nav aria-label="Navegación principal" className="min-h-0 flex-1 space-y-1 overflow-x-hidden overflow-y-auto py-1 outline-none">
        {dashboard ? <SidebarItem label={dashboard.label} path={dashboard.path} icon={dashboard.icon} active={routeIsActive(location.pathname, dashboard.path)} standalone onClick={onCloseMobile} /> : null}
        {navigationSidebar.map(renderSidebarEntry)}
      </nav>
      <SidebarProfile usuario={usuario} rol={rol} onLogout={cerrarSesion} />
    </aside>
  )
}
