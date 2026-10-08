import type {
  EstadoCompra,
  EstadoCuenta,
  EstadoOrdenCompra,
  EstadoRecepcion,
  EstadoSolicitudCompra,
  EstadoTransferencia,
  EstadoVenta,
  ID,
} from '../../types'
import type { ERPState } from '../state'
import { NATURALEZA_MOVIMIENTO_INVENTARIO, redondearDosDecimales } from '../../utils'

function detallesVenta(estado: ERPState, ventaId: ID) {
  const venta = estado.ventas.find((item) => item.id === ventaId)
  return estado.detallesVenta.filter((item) => venta?.detalleIds.includes(item.id))
}

function detallesCompra(estado: ERPState, compraId: ID) {
  const compra = estado.compras.find((item) => item.id === compraId)
  return estado.detallesCompra.filter((item) => compra?.detalleIds.includes(item.id))
}

function porcentaje(valor: number): number {
  return valor > 1 ? valor / 100 : valor
}

export function selectStock(estado: ERPState, productoId: ID, almacenId: ID): number {
  return redondearDosDecimales(estado.movimientosInventario.reduce((total, movimiento) => {
    if (movimiento.productoId !== productoId || movimiento.almacenId !== almacenId) return total
    const entrada = NATURALEZA_MOVIMIENTO_INVENTARIO[movimiento.tipo] === 'entrada'
    return total + (entrada ? movimiento.cantidad : -movimiento.cantidad)
  }, 0))
}

export function selectReservado(estado: ERPState, productoId: ID, almacenId: ID): number {
  return redondearDosDecimales(estado.ventas.filter((venta) => venta.estado === 'Aprobado' && venta.almacenId === almacenId && !estado.comprobantes.some((comprobante) => 'ventaId' in comprobante && comprobante.ventaId === venta.id && comprobante.tipo !== 'Nota de crédito')).reduce((total, venta) => {
    return total + detallesVenta(estado, venta.id).filter((detalle) => detalle.productoId === productoId).reduce((subtotal, detalle) => subtotal + detalle.cantidad, 0)
  }, 0))
}

export function selectStockDisponible(estado: ERPState, productoId: ID, almacenId: ID): number {
  return redondearDosDecimales(selectStock(estado, productoId, almacenId) - selectReservado(estado, productoId, almacenId))
}

export function selectCostoPromedio(estado: ERPState, productoId: ID, almacenId: ID): number {
  const entradas = estado.movimientosInventario.filter((movimiento) => movimiento.productoId === productoId && movimiento.almacenId === almacenId && NATURALEZA_MOVIMIENTO_INVENTARIO[movimiento.tipo] === 'entrada')
  const cantidad = entradas.reduce((total, movimiento) => total + movimiento.cantidad, 0)
  if (cantidad === 0) return 0
  return redondearDosDecimales(entradas.reduce((total, movimiento) => total + movimiento.cantidad * movimiento.costoUnitario, 0) / cantidad)
}

export function selectTotalVenta(estado: ERPState, ventaId: ID): number {
  return redondearDosDecimales(detallesVenta(estado, ventaId).reduce((total, detalle) => {
    const base = detalle.cantidad * detalle.precioUnitario - detalle.descuento
    return total + base + base * porcentaje(detalle.tasaImpuesto)
  }, 0))
}

export function selectTotalCompra(estado: ERPState, compraId: ID): number {
  return redondearDosDecimales(detallesCompra(estado, compraId).reduce((total, detalle) => {
    const base = detalle.cantidad * detalle.costoUnitario
    return total + base + base * porcentaje(detalle.tasaImpuesto)
  }, 0))
}

function importeCuenta(estado: ERPState, cuentaId: ID): number {
  const cobrar = estado.cuentasCobrar.find((cuenta) => cuenta.id === cuentaId)
  if (cobrar) {
    const base = selectTotalVenta(estado, cobrar.ventaId)
    const notas = estado.comprobantes.filter((comprobante) => comprobante.tipo === 'Nota de crédito' && comprobante.ventaId === cobrar.ventaId).length
    return redondearDosDecimales(notas ? 0 : base)
  }
  const pagar = estado.cuentasPagar.find((cuenta) => cuenta.id === cuentaId)
  return pagar ? selectTotalCompra(estado, pagar.compraId) : 0
}

export function selectSaldoCuenta(estado: ERPState, cuentaId: ID): number {
  const cuenta = estado.cuentasCobrar.find((item) => item.id === cuentaId) ?? estado.cuentasPagar.find((item) => item.id === cuentaId)
  if (!cuenta || cuenta.anuladaEn) return 0
  return redondearDosDecimales(Math.max(0, importeCuenta(estado, cuentaId) - estado.pagos.filter((pago) => ('cuentaCobrarId' in pago && pago.cuentaCobrarId === cuentaId) || ('cuentaPagarId' in pago && pago.cuentaPagarId === cuentaId)).reduce((total, pago) => total + pago.monto, 0)))
}

export function selectEstadoCuenta(estado: ERPState, cuentaId: ID, fechaActual: string): EstadoCuenta {
  const cuenta = estado.cuentasCobrar.find((item) => item.id === cuentaId) ?? estado.cuentasPagar.find((item) => item.id === cuentaId)
  if (!cuenta) return 'Anulada'
  if (cuenta.anuladaEn) return 'Anulada'
  if (selectSaldoCuenta(estado, cuentaId) === 0) return 'Pagada'
  return fechaActual > cuenta.fechaVencimiento ? 'Vencida' : 'Pendiente'
}

export function selectEstadoVenta(estado: ERPState, ventaId: ID, fechaActual: string): EstadoVenta {
  const venta = estado.ventas.find((item) => item.id === ventaId)
  if (!venta) return 'Anulado'
  if (venta.estado === 'Facturado') {
    const cuenta = estado.cuentasCobrar.find((item) => item.ventaId === ventaId)
    return cuenta && selectEstadoCuenta(estado, cuenta.id, fechaActual) === 'Pagada' ? 'Cobrado' : 'Facturado'
  }
  return venta.estado
}

function recibidoPorCompra(estado: ERPState, compraId: ID, productoId: ID): number {
  return estado.recepciones.filter((recepcion) => recepcion.compraId === compraId).flatMap((recepcion) => recepcion.itemIds).map((id) => estado.itemsRecepcion.find((item) => item.id === id)).filter((item): item is NonNullable<typeof item> => Boolean(item && item.productoId === productoId)).reduce((total, item) => total + item.cantidadRecibida, 0)
}

function ordenCompleta(estado: ERPState, compraId: ID): boolean {
  const compra = estado.compras.find((item) => item.id === compraId)
  return Boolean(compra && detallesCompra(estado, compraId).every((detalle) => recibidoPorCompra(estado, compraId, detalle.productoId) >= detalle.cantidad))
}

export function selectEstadoCompra(estado: ERPState, compraId: ID, fechaActual: string): EstadoCompra {
  const compra = estado.compras.find((item) => item.id === compraId)
  if (!compra) return 'Anulada'
  if (compra.estado === 'Anulada') return 'Anulada'
  if (compra.estado === 'Facturada') {
    const cuenta = estado.cuentasPagar.find((item) => item.compraId === compraId)
    return cuenta && selectEstadoCuenta(estado, cuenta.id, fechaActual) === 'Pagada' ? 'Pagada' : 'Facturada'
  }
  return ordenCompleta(estado, compraId) ? 'Recibida' : compra.estado
}

export function selectEstadoOrdenCompra(estado: ERPState, ordenCompraId: ID): EstadoOrdenCompra {
  const orden = estado.ordenesCompra.find((item) => item.id === ordenCompraId)
  if (!orden) return 'Anulada'
  if (orden.estado === 'Anulada') return 'Anulada'
  const compra = estado.compras.find((item) => item.ordenCompraId === ordenCompraId)
  if (!compra) return orden.estado
  const recibidos = detallesCompra(estado, compra.id).reduce((total, detalle) => total + recibidoPorCompra(estado, compra.id, detalle.productoId), 0)
  const ordenados = detallesCompra(estado, compra.id).reduce((total, detalle) => total + detalle.cantidad, 0)
  return recibidos >= ordenados ? 'Atendida' : recibidos > 0 ? 'Parcial' : orden.estado
}

export function selectEstadoSolicitudCompra(estado: ERPState, solicitudId: ID): EstadoSolicitudCompra {
  const solicitud = estado.solicitudesCompra.find((item) => item.id === solicitudId)
  if (!solicitud) return 'Anulada'
  if (solicitud.estado === 'Anulada') return 'Anulada'
  const ordenes = estado.ordenesCompra.filter((orden) => orden.solicitudCompraId === solicitudId)
  const atendida = solicitud.items.every((item) => ordenes.reduce((total, orden) => total + orden.items.filter((linea) => linea.productoId === item.productoId).reduce((subtotal, linea) => subtotal + linea.cantidad, 0), 0) >= item.cantidadSolicitada)
  return atendida ? 'Atendida' : solicitud.estado
}

export function selectEstadoRecepcion(estado: ERPState, recepcionId: ID): EstadoRecepcion {
  const recepcion = estado.recepciones.find((item) => item.id === recepcionId)
  if (!recepcion) return 'Pendiente'
  const compra = estado.compras.find((item) => item.id === recepcion.compraId)
  if (!compra) return 'Pendiente'
  const totalRecibido = detallesCompra(estado, compra.id).reduce((total, detalle) => total + recibidoPorCompra(estado, compra.id, detalle.productoId), 0)
  const totalOrdenado = detallesCompra(estado, compra.id).reduce((total, detalle) => total + detalle.cantidad, 0)
  return totalRecibido >= totalOrdenado ? 'Completa' : totalRecibido > 0 ? 'Parcial' : 'Pendiente'
}

export function selectEstadoTransferencia(estado: ERPState, transferenciaId: ID): EstadoTransferencia {
  const transferencia = estado.transferencias.find((item) => item.id === transferenciaId)
  if (!transferencia) return 'Anulada'
  if (transferencia.estado === 'Anulada') return 'Anulada'
  const items = estado.itemsTransferencia.filter((item) => transferencia.itemIds.includes(item.id))
  const completa = items.length > 0 && items.every((item) => {
    const movimientos = estado.movimientosInventario.filter((movimiento) => movimiento.transferenciaId === transferenciaId && movimiento.productoId === item.productoId && movimiento.cantidad === item.cantidad)
    return movimientos.some((movimiento) => movimiento.tipo === 'Transferencia salida') && movimientos.some((movimiento) => movimiento.tipo === 'Transferencia entrada')
  })
  return completa ? 'Completada' : transferencia.estado
}

export function selectSaldoBanco(estado: ERPState, cuentaBancariaId: ID): number {
  return redondearDosDecimales(estado.movimientosCaja.filter((movimiento) => movimiento.cuentaBancariaId === cuentaBancariaId).reduce((total, movimiento) => total + (movimiento.tipo === 'Ingreso' ? movimiento.monto : -movimiento.monto), 0))
}

export function selectSaldoCaja(estado: ERPState): number {
  return redondearDosDecimales(estado.movimientosCaja.filter((movimiento) => !movimiento.cuentaBancariaId).reduce((total, movimiento) => total + (movimiento.tipo === 'Ingreso' ? movimiento.monto : -movimiento.monto), 0))
}

export function selectProductosStockCritico(estado: ERPState): ID[] {
  return estado.productos.filter((producto) => producto.estado === 'Activo' && estado.almacenes.some((almacen) => selectStockDisponible(estado, producto.id, almacen.id) <= producto.stockMinimo)).map((producto) => producto.id)
}

export function selectCuentasVencidas(estado: ERPState, fechaActual: string): ID[] {
  return [...estado.cuentasCobrar, ...estado.cuentasPagar].filter((cuenta) => selectEstadoCuenta(estado, cuenta.id, fechaActual) === 'Vencida').map((cuenta) => cuenta.id)
}

export function selectVentasPendientesAprobacion(estado: ERPState): number {
  return estado.ventas.filter((venta) => venta.estado === 'Pendiente').length
}

export function selectCuentasCobrarVencidas(estado: ERPState, fechaActual: string): number {
  return estado.cuentasCobrar.filter((cuenta) => selectEstadoCuenta(estado, cuenta.id, fechaActual) === 'Vencida').length
}

export * from './dashboard/index'

export interface AntiguedadSaldo {
  cuentaId: ID
  saldo: number
  diasVencidos: number
  tramo: 'Corriente' | '1-30' | '31-60' | '61-90' | 'Más de 90'
}

export function selectAntiguedadSaldos(estado: ERPState, fechaActual: string): AntiguedadSaldo[] {
  const actual = Date.parse(fechaActual)
  return [...estado.cuentasCobrar, ...estado.cuentasPagar].map((cuenta) => {
    const dias = Math.max(0, Math.floor((actual - Date.parse(cuenta.fechaVencimiento)) / 86_400_000))
    const tramo = dias === 0 ? 'Corriente' : dias <= 30 ? '1-30' : dias <= 60 ? '31-60' : dias <= 90 ? '61-90' : 'Más de 90'
    return { cuentaId: cuenta.id, saldo: selectSaldoCuenta(estado, cuenta.id), diasVencidos: dias, tramo }
  })
}
