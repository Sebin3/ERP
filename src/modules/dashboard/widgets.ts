import type { RecursoSistema, RolSistema } from '../../types'
import type { ERPState } from '../../store/state'
import { puede, puedeEnEstado } from '../../store/permissions'
import type { OperacionRecienteTipo } from '../../store/selectors/dashboard/index'

export type DashboardWidgetId =
  | 'ventasMes'
  | 'comprasMes'
  | 'utilidadBruta'
  | 'stockCritico'
  | 'cuentasPorCobrar'
  | 'cuentasPorPagar'
  | 'rotacionInventario'
  | 'serieVentas'
  | 'serieCompras'
  | 'ventasPorCategoria'
  | 'cuentasPorVencer'
  | 'operacionesRecientes'
  | 'flujoCaja'
  | 'embudoPedidos'
  | 'topClientes'
  | 'topProductos'
  | 'antiguedadCxC'
  | 'antiguedadCxP'
  | 'bandejaAcciones'

export interface DashboardWidgetConfig {
  id: DashboardWidgetId
  recurso?: RecursoSistema
}

export const dashboardWidgets: readonly DashboardWidgetConfig[] = [
  { id: 'ventasMes', recurso: 'Ventas' },
  { id: 'comprasMes', recurso: 'Órdenes de compra' },
  { id: 'utilidadBruta', recurso: 'Cuentas por pagar' },
  { id: 'stockCritico', recurso: 'Productos' },
  { id: 'cuentasPorCobrar', recurso: 'Cuentas por cobrar' },
  { id: 'cuentasPorPagar', recurso: 'Cuentas por pagar' },
  { id: 'rotacionInventario', recurso: 'Kardex' },
  { id: 'serieVentas', recurso: 'Ventas' },
  { id: 'serieCompras', recurso: 'Órdenes de compra' },
  { id: 'ventasPorCategoria', recurso: 'Ventas' },
  { id: 'cuentasPorVencer', recurso: 'Cuentas por cobrar' },
  { id: 'operacionesRecientes' },
  { id: 'flujoCaja', recurso: 'Caja' },
  { id: 'embudoPedidos', recurso: 'Ventas' },
  { id: 'topClientes', recurso: 'Ventas' },
  { id: 'topProductos', recurso: 'Ventas' },
  { id: 'antiguedadCxC', recurso: 'Cuentas por cobrar' },
  { id: 'antiguedadCxP', recurso: 'Cuentas por pagar' },
  { id: 'bandejaAcciones', recurso: 'Dashboard' },
]

export function tiposOperacionPermitidos(rol: RolSistema, estado?: ERPState): OperacionRecienteTipo[] {
  const can = (recurso: RecursoSistema) => estado ? puedeEnEstado(estado, rol, recurso, 'ver') : puede(rol, recurso, 'ver')
  return [
    can('Ventas') ? 'Venta' : null,
    can('Cuentas por cobrar') ? 'Cobro' : null,
    can('Recepción') ? 'Compra' : null,
    can('Cuentas por pagar') ? 'Pago' : null,
  ].filter((tipo): tipo is OperacionRecienteTipo => tipo !== null)
}

export function widgetsVisiblesParaRol(rol: RolSistema | undefined, estado?: ERPState): DashboardWidgetId[] {
  if (!rol) return []
  const can = (recurso: RecursoSistema) => estado ? puedeEnEstado(estado, rol, recurso, 'ver') : puede(rol, recurso, 'ver')
  return dashboardWidgets.filter((widget) => widget.recurso ? can(widget.recurso) : tiposOperacionPermitidos(rol, estado).length > 0).map((widget) => widget.id)
}

export function widgetVisibleParaRol(rol: RolSistema | undefined, widget: DashboardWidgetId, estado?: ERPState): boolean {
  return widgetsVisiblesParaRol(rol, estado).includes(widget)
}
