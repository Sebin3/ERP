import type { Comprobante, ID, Pago } from '../../../types'
import type { ERPState } from '../../state'
import { redondearDosDecimales } from '../../../utils'
import { selectCostoPromedio, selectSaldoCuenta, selectStock, selectStockDisponible, selectTotalCompra, selectTotalVenta } from '../index'
import type { PeriodoInput, PeriodoResuelto, RangoDashboard } from './periodo'
import { periodoResuelto } from './periodo'

export type TramoDashboard = 'Vigente' | '1-30' | '31-60' | '+60'
export const TRAMOS: readonly TramoDashboard[] = ['Vigente', '1-30', '31-60', '+60']

export type OperacionRecienteTipo = 'Venta' | 'Cobro' | 'Compra' | 'Pago'

export function periodoActual(estado: ERPState, periodo: PeriodoInput): PeriodoResuelto {
  return periodoResuelto(periodo, estado.fechaReferencia)
}

export function enRango(fecha: string, rango: RangoDashboard): boolean {
  return fecha.slice(0, 10) >= rango.desde && fecha.slice(0, 10) <= rango.hasta
}

export function fechasEntre(desde: string, hasta: string, cantidad: number, unidad: 'dia' | 'semana' | 'mes'): RangoDashboard[] {
  const inicio = new Date(`${desde}T12:00:00.000Z`)
  const limite = new Date(`${hasta}T12:00:00.000Z`)
  const resultado: RangoDashboard[] = []
  for (let index = 0; index < cantidad; index += 1) {
    const actual = new Date(inicio)
    if (unidad === 'mes') actual.setUTCMonth(actual.getUTCMonth() + index)
    else actual.setUTCDate(actual.getUTCDate() + index * (unidad === 'semana' ? 7 : 1))
    if (actual > limite) break
    const siguiente = new Date(actual)
    if (unidad === 'mes') siguiente.setUTCMonth(siguiente.getUTCMonth() + 1)
    else siguiente.setUTCDate(siguiente.getUTCDate() + (unidad === 'semana' ? 7 : 1))
    siguiente.setUTCDate(siguiente.getUTCDate() - 1)
    resultado.push({ desde: actual.toISOString().slice(0, 10), hasta: (siguiente > limite ? limite : siguiente).toISOString().slice(0, 10) })
  }
  return resultado
}

export type ComprobanteVentaLike = Extract<Comprobante, { ventaId: ID }>
export type ComprobanteCompraLike = Extract<Comprobante, { compraId: ID }>

export function esComprobanteVenta(comprobante: Comprobante): comprobante is ComprobanteVentaLike {
  return 'ventaId' in comprobante
}

export function esComprobanteCompra(comprobante: Comprobante): comprobante is ComprobanteCompraLike {
  return 'compraId' in comprobante
}

export function esPagoCobro(pago: Pago): pago is Extract<Pago, { tipo: 'Cobro cliente' }> {
  return pago.tipo === 'Cobro cliente'
}

export function comprobantesVenta(estado: ERPState): ComprobanteVentaLike[] {
  return estado.comprobantes.filter((item): item is ComprobanteVentaLike => esComprobanteVenta(item) && item.tipo !== 'Nota de crédito' && item.estado === 'Emitido')
}

export function comprobantesCompra(estado: ERPState): ComprobanteCompraLike[] {
  return estado.comprobantes.filter((item): item is ComprobanteCompraLike => esComprobanteCompra(item) && item.estado === 'Emitido')
}

export function detallesVenta(estado: ERPState, ventaId: ID) {
  const venta = estado.ventas.find((item) => item.id === ventaId)
  return estado.detallesVenta.filter((item) => venta?.detalleIds.includes(item.id))
}

export function detallesCompra(estado: ERPState, compraId: ID) {
  const compra = estado.compras.find((item) => item.id === compraId)
  return estado.detallesCompra.filter((item) => compra?.detalleIds.includes(item.id))
}

export function baseVenta(estado: ERPState, ventaId: ID): number {
  return redondearDosDecimales(detallesVenta(estado, ventaId).reduce((total, detalle) => total + detalle.cantidad * detalle.precioUnitario - detalle.descuento, 0))
}

export function baseCompra(estado: ERPState, compraId: ID): number {
  return redondearDosDecimales(detallesCompra(estado, compraId).reduce((total, detalle) => total + detalle.cantidad * detalle.costoUnitario, 0))
}

export function notasCredito(estado: ERPState, rango: RangoDashboard): ComprobanteVentaLike[] {
  return estado.comprobantes.filter((item): item is ComprobanteVentaLike => esComprobanteVenta(item) && item.tipo === 'Nota de crédito' && item.estado === 'Emitido' && enRango(item.fechaEmision, rango))
}

export function totalFacturadoVentas(estado: ERPState, rango: RangoDashboard): number {
  return redondearDosDecimales(comprobantesVenta(estado).filter((item) => enRango(item.fechaEmision, rango)).reduce((total, item) => total + selectTotalVenta(estado, item.ventaId), 0))
}

export function totalFacturadoCompras(estado: ERPState, rango: RangoDashboard): number {
  return redondearDosDecimales(comprobantesCompra(estado).filter((item) => enRango(item.fechaEmision, rango)).reduce((total, item) => total + selectTotalCompra(estado, item.compraId), 0))
}

export function totalVentasNetas(estado: ERPState, rango: RangoDashboard): number {
  const facturado = comprobantesVenta(estado).filter((item) => enRango(item.fechaEmision, rango)).reduce((total, item) => total + baseVenta(estado, item.ventaId), 0)
  const notas = notasCredito(estado, rango).reduce((total, item) => total + baseVenta(estado, item.ventaId), 0)
  return redondearDosDecimales(facturado - notas)
}

export function costoVentas(estado: ERPState, rango: RangoDashboard): number {
  return redondearDosDecimales(estado.movimientosInventario.filter((item) => item.tipo === 'Salida por venta' && enRango(item.fecha, rango)).reduce((total, item) => total + item.cantidad * item.costoUnitario, 0))
}

export function importeCobrado(estado: ERPState, rango: RangoDashboard): number {
  return redondearDosDecimales(estado.pagos.filter((pago) => esPagoCobro(pago) && enRango(pago.fecha, rango)).reduce((total, pago) => total + pago.monto, 0))
}

export function sumaSaldos(estado: ERPState, tipo: 'cobrar' | 'pagar'): number {
  const cuentas = tipo === 'cobrar' ? estado.cuentasCobrar : estado.cuentasPagar
  return redondearDosDecimales(cuentas.reduce((total, cuenta) => total + selectSaldoCuenta(estado, cuenta.id), 0))
}

export function valorInventario(estado: ERPState): number {
  return redondearDosDecimales(estado.productos.reduce((totalProductos, producto) => totalProductos + estado.almacenes.reduce((totalAlmacenes, almacen) => totalAlmacenes + selectStock(estado, producto.id, almacen.id) * selectCostoPromedio(estado, producto.id, almacen.id), 0), 0))
}

export function diasEntre(desde: string, hasta: string): number {
  return Math.floor((Date.parse(`${hasta.slice(0, 10)}T12:00:00.000Z`) - Date.parse(`${desde.slice(0, 10)}T12:00:00.000Z`)) / 86_400_000)
}

export function tramoCuenta(fechaVencimiento: string, fechaReferencia: string): TramoDashboard {
  const dias = diasEntre(fechaVencimiento, fechaReferencia)
  return dias <= 0 ? 'Vigente' : dias <= 30 ? '1-30' : dias <= 60 ? '31-60' : '+60'
}

export function generarDelta(actual: number, anterior: number | null): number | null {
  if (anterior === null || anterior === 0) return null
  return redondearDosDecimales(((actual - anterior) / anterior) * 100)
}

export function stockDisponible(estado: ERPState, productoId: ID, almacenId: ID): number {
  return selectStockDisponible(estado, productoId, almacenId)
}
