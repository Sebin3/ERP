import type { LucideIcon } from 'lucide-react'
import {
  ArrowLeftRight,
  BarChart3,
  Banknote,
  Boxes,
  ClipboardCheck,
  ClipboardList,
  BriefcaseBusiness,
  Database,
  FileText,
  FolderOpen,
  KeyRound,
  Landmark,
  LayoutDashboard,
  Package,
  PackageCheck,
  Receipt,
  ScrollText,
  Settings,
  ShieldCheck,
  ShoppingCart,
  ShoppingBag,
  Store,
  SlidersHorizontal,
  Truck,
  UserCog,
  UsersRound,
  Warehouse,
  WalletCards,
} from 'lucide-react'
import type { AccionPermiso, RecursoSistema, RolSistema } from '../types'
import type { ERPState } from '../store/state'
import { puede, puedeEnEstado } from '../store/permissions'

export type NavigationGroupId =
  | 'comercial'
  | 'compras'
  | 'inventario'
  | 'finanzas'
  | 'maestros'
  | 'administracion'

export type SidebarCounter = 'ventasPendientes' | 'productosStockCritico' | 'cuentasCobrarVencidas'

export interface NavigationRoute {
  id: string
  path: string
  label: string
  resource: RecursoSistema
  group?: NavigationGroupId
  icon: LucideIcon
  showInSidebar?: boolean
  counter?: SidebarCounter
  counterResource?: RecursoSistema
  counterAction?: AccionPermiso
}

export interface NavigationGroup {
  id: NavigationGroupId
  label: string
  icon: LucideIcon
  routeIds: string[]
  counter?: SidebarCounter
  counterResource?: RecursoSistema
  counterAction?: AccionPermiso
}

export type NavigationSidebarEntry =
  | { type: 'group'; id: NavigationGroupId }
  | { type: 'route'; id: string }

export const navigationRoutes: NavigationRoute[] = [
  { id: 'dashboard', path: '/', label: 'Inicio', resource: 'Dashboard', icon: LayoutDashboard, showInSidebar: true },
  { id: 'clientes', path: '/comercial/clientes', label: 'Clientes', resource: 'Clientes', group: 'maestros', icon: UsersRound, showInSidebar: true },
  { id: 'cliente-ficha', path: '/comercial/clientes/:clienteId', label: 'Ficha de cliente', resource: 'Clientes', group: 'maestros', icon: UsersRound },
  { id: 'cotizaciones', path: '/comercial/cotizaciones', label: 'Cotizaciones', resource: 'Cotizaciones', group: 'comercial', icon: FileText, showInSidebar: true },
  { id: 'cotizacion-nueva', path: '/comercial/cotizaciones/nueva', label: 'Nueva cotización', resource: 'Cotizaciones', group: 'comercial', icon: FileText },
  { id: 'cotizacion-detalle', path: '/comercial/cotizaciones/:cotizacionId', label: 'Detalle de cotización', resource: 'Cotizaciones', group: 'comercial', icon: FileText },
  { id: 'ventas', path: '/comercial/ventas', label: 'Pedidos de venta', resource: 'Ventas', group: 'comercial', icon: ShoppingBag, showInSidebar: true, counter: 'ventasPendientes', counterResource: 'Ventas', counterAction: 'aprobar' },
  { id: 'venta-nueva', path: '/comercial/ventas/nueva', label: 'Nuevo pedido de venta', resource: 'Ventas', group: 'comercial', icon: ShoppingCart },
  { id: 'venta-detalle', path: '/comercial/ventas/:ventaId', label: 'Detalle del pedido', resource: 'Ventas', group: 'comercial', icon: ShoppingCart },
  { id: 'facturacion', path: '/finanzas/comprobantes', label: 'Comprobantes', resource: 'Facturación', group: 'finanzas', icon: Receipt, showInSidebar: true },
  { id: 'proveedores', path: '/compras/proveedores', label: 'Proveedores', resource: 'Proveedores', group: 'maestros', icon: Store, showInSidebar: true },
  { id: 'proveedor-ficha', path: '/compras/proveedores/:proveedorId', label: 'Ficha de proveedor', resource: 'Proveedores', group: 'maestros', icon: Store },
  { id: 'solicitudes-compra', path: '/compras/solicitudes', label: 'Solicitudes de compra', resource: 'Solicitudes de compra', group: 'compras', icon: ClipboardList, showInSidebar: true },
  { id: 'solicitud-compra-nueva', path: '/compras/solicitudes/nueva', label: 'Nueva solicitud', resource: 'Solicitudes de compra', group: 'compras', icon: ClipboardList },
  { id: 'ordenes-compra', path: '/compras/ordenes', label: 'Órdenes de compra', resource: 'Órdenes de compra', group: 'compras', icon: ClipboardCheck, showInSidebar: true },
  { id: 'orden-compra-detalle', path: '/compras/ordenes/:ordenCompraId', label: 'Detalle de orden', resource: 'Órdenes de compra', group: 'compras', icon: ClipboardCheck },
  { id: 'existencias', path: '/inventario/existencias', label: 'Existencias', resource: 'Productos', group: 'inventario', icon: Boxes, showInSidebar: true },
  { id: 'recepcion', path: '/inventario/recepciones', label: 'Recepciones de compra', resource: 'Recepción', group: 'inventario', icon: PackageCheck, showInSidebar: true },
  { id: 'recepcion-detalle', path: '/inventario/recepciones/:ordenCompraId', label: 'Registrar recepción', resource: 'Recepción', group: 'inventario', icon: PackageCheck },
  { id: 'despachos', path: '/inventario/salidas-venta', label: 'Salidas por venta', resource: 'Despachos', group: 'inventario', icon: Truck, showInSidebar: true },
  { id: 'ajustes', path: '/inventario/ajustes', label: 'Ajustes de inventario', resource: 'Ajustes de inventario', group: 'inventario', icon: SlidersHorizontal, showInSidebar: true },
  { id: 'productos', path: '/inventario/productos', label: 'Productos', resource: 'Productos', group: 'maestros', icon: Package, showInSidebar: true },
  { id: 'producto-ficha', path: '/inventario/productos/:productoId', label: 'Ficha de producto', resource: 'Productos', group: 'maestros', icon: Package },
  { id: 'almacenes', path: '/inventario/almacenes', label: 'Almacenes', resource: 'Almacenes', group: 'maestros', icon: Warehouse, showInSidebar: true },
  { id: 'almacen-ficha', path: '/inventario/almacenes/:almacenId', label: 'Ficha de almacén', resource: 'Almacenes', group: 'maestros', icon: Warehouse },
  { id: 'kardex', path: '/inventario/kardex', label: 'Kardex', resource: 'Kardex', group: 'inventario', icon: ClipboardList, showInSidebar: true },
  { id: 'transferencias', path: '/inventario/transferencias', label: 'Transferencias', resource: 'Transferencias', group: 'inventario', icon: ArrowLeftRight, showInSidebar: true },
  { id: 'transferencia-nueva', path: '/inventario/transferencias/nueva', label: 'Nueva transferencia', resource: 'Transferencias', group: 'inventario', icon: ArrowLeftRight },
  { id: 'cuentas-cobrar', path: '/finanzas/cuentas-cobrar', label: 'Cuentas por cobrar', resource: 'Cuentas por cobrar', group: 'finanzas', icon: Banknote, showInSidebar: true, counter: 'cuentasCobrarVencidas', counterResource: 'Cuentas por cobrar' },
  { id: 'cuentas-pagar', path: '/finanzas/cuentas-pagar', label: 'Cuentas por pagar', resource: 'Cuentas por pagar', group: 'finanzas', icon: Banknote, showInSidebar: true },
  { id: 'caja', path: '/finanzas/caja', label: 'Caja', resource: 'Caja', group: 'finanzas', icon: Banknote, showInSidebar: true },
  { id: 'bancos', path: '/finanzas/bancos', label: 'Bancos', resource: 'Bancos', group: 'finanzas', icon: Landmark, showInSidebar: true },
  { id: 'documentos', path: '/documentos', label: 'Gestión documental', resource: 'Documentos', icon: FolderOpen, showInSidebar: true },
  { id: 'documento-detalle', path: '/documentos/:documentoId', label: 'Detalle de documento', resource: 'Documentos', icon: FolderOpen },
  { id: 'reportes', path: '/reportes', label: 'Reportes', resource: 'Reportes', icon: BarChart3, showInSidebar: true },
  { id: 'reporte-ventas', path: '/reportes/ventas', label: 'Reporte de ventas', resource: 'Reportes', icon: BarChart3 },
  { id: 'reporte-compras', path: '/reportes/compras', label: 'Reporte de compras', resource: 'Reportes', icon: BarChart3 },
  { id: 'reporte-inventario', path: '/reportes/inventario', label: 'Reporte de inventario', resource: 'Reportes', icon: BarChart3 },
  { id: 'reporte-finanzas', path: '/reportes/finanzas', label: 'Reporte financiero', resource: 'Reportes', icon: BarChart3 },
  { id: 'usuarios', path: '/administracion/usuarios', label: 'Usuarios', resource: 'Usuarios', group: 'administracion', icon: UserCog, showInSidebar: true },
  { id: 'roles', path: '/administracion/roles', label: 'Roles', resource: 'Roles', group: 'administracion', icon: ShieldCheck, showInSidebar: true },
  { id: 'permisos', path: '/administracion/permisos', label: 'Permisos', resource: 'Permisos', group: 'administracion', icon: KeyRound, showInSidebar: true },
  { id: 'auditoria', path: '/administracion/auditoria', label: 'Auditoría', resource: 'Auditoría', group: 'administracion', icon: ScrollText, showInSidebar: true },
  { id: 'configuracion', path: '/configuracion', label: 'Configuración', resource: 'Configuración', icon: Settings, showInSidebar: true },
]

export const navigationGroups: NavigationGroup[] = [
  { id: 'comercial', label: 'Comercial', icon: BriefcaseBusiness, routeIds: ['cotizaciones', 'ventas'] },
  { id: 'compras', label: 'Compras', icon: ShoppingCart, routeIds: ['solicitudes-compra', 'ordenes-compra'] },
  { id: 'inventario', label: 'Inventario', icon: Boxes, routeIds: ['existencias', 'recepcion', 'despachos', 'transferencias', 'ajustes', 'kardex'], counter: 'productosStockCritico', counterResource: 'Productos' },
  { id: 'finanzas', label: 'Finanzas', icon: WalletCards, routeIds: ['facturacion', 'cuentas-cobrar', 'cuentas-pagar', 'caja', 'bancos'] },
  { id: 'administracion', label: 'Administración', icon: ShieldCheck, routeIds: ['usuarios', 'roles', 'permisos', 'auditoria'] },
  { id: 'maestros', label: 'Datos maestros', icon: Database, routeIds: ['clientes', 'proveedores', 'productos', 'almacenes'] },
]

// Orden visual del sidebar: los procesos se consultan primero y los datos maestros
// quedan al final como referencia transversal de la operación.
export const navigationSidebar: NavigationSidebarEntry[] = [
  { type: 'group', id: 'comercial' },
  { type: 'group', id: 'compras' },
  { type: 'group', id: 'inventario' },
  { type: 'group', id: 'finanzas' },
  { type: 'route', id: 'documentos' },
  { type: 'route', id: 'reportes' },
  { type: 'group', id: 'maestros' },
  { type: 'group', id: 'administracion' },
  { type: 'route', id: 'configuracion' },
]

export const navigationRouteById = Object.fromEntries(
  navigationRoutes.map((route) => [route.id, route]),
) as Record<string, NavigationRoute>

export function rutasVisiblesParaRol(rol: RolSistema | undefined, estado?: ERPState): NavigationRoute[] {
  if (!rol) return []
  return navigationRoutes.filter((route) => route.showInSidebar === true && (estado ? puedeEnEstado(estado, rol, route.resource, 'ver') : puede(rol, route.resource, 'ver')))
}

export function rutaPermitidaParaRol(rol: RolSistema | undefined, route: NavigationRoute, estado?: ERPState): boolean {
  return Boolean(rol && (estado ? puedeEnEstado(estado, rol, route.resource, 'ver') : puede(rol, route.resource, 'ver')))
}

export function contadoresSidebarVisiblesParaRol(rol: RolSistema | undefined, estado?: ERPState): SidebarCounter[] {
  if (!rol) return []
  const declarations = [
    ...navigationRoutes.map((route) => ({ counter: route.counter, resource: route.counterResource, action: route.counterAction ?? 'ver' as const })),
    ...navigationGroups.map((group) => ({ counter: group.counter, resource: group.counterResource, action: group.counterAction ?? 'ver' as const })),
  ]
  const visibles = declarations.filter((item): item is { counter: SidebarCounter; resource: RecursoSistema; action: AccionPermiso } => Boolean(item.counter && item.resource && (estado ? puedeEnEstado(estado, rol, item.resource, item.action) : puede(rol, item.resource, item.action))))
  return [...new Set(visibles.map((item) => item.counter))]
}

export function gruposVisiblesParaRol(rol: RolSistema | undefined, estado?: ERPState): Array<NavigationGroup & { routes: NavigationRoute[] }> {
  if (!rol) return []
  return navigationGroups.map((group) => ({
    ...group,
    routes: group.routeIds
      .map((routeId) => navigationRouteById[routeId])
      .filter((route): route is NavigationRoute => Boolean(route) && route.showInSidebar === true && (estado ? puedeEnEstado(estado, rol, route.resource, 'ver') : puede(rol, route.resource, 'ver'))),
  })).filter((group) => group.routes.length > 0)
}
