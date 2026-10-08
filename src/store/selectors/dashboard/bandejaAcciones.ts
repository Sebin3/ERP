import type { AccionPermiso, RecursoSistema } from '../../../types'
import type { ERPState } from '../../state'
import { selectEstadoCuenta, selectEstadoOrdenCompra, selectEstadoTransferencia, selectProductosStockCritico } from '../index'

export interface AccionDashboard {
  id: string
  titulo: string
  cantidad: number
  severidad: 'info' | 'aviso' | 'urgente'
  ruta: string
  recurso: RecursoSistema
  accion: AccionPermiso
}

function item(id: string, titulo: string, cantidad: number, ruta: string, recurso: RecursoSistema, accion: AccionPermiso, severidad: AccionDashboard['severidad']): AccionDashboard | null {
  return cantidad > 0 ? { id, titulo, cantidad, severidad, ruta, recurso, accion } : null
}

export function bandejaAcciones(estado: ERPState): AccionDashboard[] {
  const fecha = estado.fechaReferencia
  const acciones = [
    item('ventas-pendientes', 'Ventas pendientes de aprobación', estado.ventas.filter((venta) => venta.estado === 'Pendiente').length, '/comercial/ventas', 'Ventas', 'aprobar', 'aviso'),
    item('ventas-por-facturar', 'Ventas aprobadas por facturar', estado.ventas.filter((venta) => venta.estado === 'Aprobado').length, '/comercial/facturacion', 'Facturación', 'crear', 'info'),
    item('cxc-vencidas', 'Cuentas por cobrar vencidas', estado.cuentasCobrar.filter((cuenta) => selectEstadoCuenta(estado, cuenta.id, fecha) === 'Vencida').length, '/finanzas/cuentas-cobrar', 'Cuentas por cobrar', 'ver', 'urgente'),
    item('cxp-vencidas', 'Cuentas por pagar vencidas', estado.cuentasPagar.filter((cuenta) => selectEstadoCuenta(estado, cuenta.id, fecha) === 'Vencida').length, '/finanzas/cuentas-pagar', 'Cuentas por pagar', 'ver', 'urgente'),
    item('solicitudes-aprobar', 'Solicitudes de compra por aprobar', estado.solicitudesCompra.filter((solicitud) => solicitud.estado === 'Solicitada').length, '/compras/solicitudes', 'Solicitudes de compra', 'aprobar', 'aviso'),
    item('ordenes-recibir', 'Órdenes pendientes de recibir', estado.ordenesCompra.filter((orden) => ['Ordenada', 'Parcial'].includes(selectEstadoOrdenCompra(estado, orden.id))).length, '/compras/recepcion', 'Recepción', 'crear', 'info'),
    item('transferencias-solicitadas', 'Transferencias solicitadas', estado.transferencias.filter((transferencia) => selectEstadoTransferencia(estado, transferencia.id) === 'Solicitada').length, '/inventario/transferencias', 'Transferencias', 'aprobar', 'aviso'),
    item('ajustes-pendientes', 'Ajustes de inventario pendientes', estado.solicitudesAjuste.filter((solicitud) => solicitud.estado === 'Pendiente').length, '/inventario/productos', 'Ajustes de inventario', 'aprobar', 'aviso'),
    item('stock-critico', 'Productos en stock crítico', selectProductosStockCritico(estado).length, '/inventario/productos', 'Productos', 'ver', 'urgente'),
  ]
  return acciones.filter((accion): accion is AccionDashboard => accion !== null)
}

