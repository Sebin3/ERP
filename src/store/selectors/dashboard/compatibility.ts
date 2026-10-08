import type { ID, ISODateOnly } from '../../../types'
import type { ERPState } from '../../state'
import { redondearDosDecimales } from '../../../utils'
import { utilidadBruta, ventasFacturadas, comprasFacturadas, rotacion as rotacionKpi } from './kpis'
import { stockCritico as stockCriticoNuevo, type StockCriticoDashboard } from './inventario'
import { resumenCuentasLegacy } from './antiguedad'
import { serieVentasCompras as serieNueva, type PuntoSerieVentasCompras } from './serieVentasCompras'
import { ventasPorCategoria as ventasPorCategoriaNueva } from './ventasPorCategoria'
import { enRango, comprobantesVenta, detallesVenta, notasCredito } from './common'
import { resolverPeriodo, type PeriodoInput, type PeriodoResuelto } from './periodo'

export type RangoDashboard = 'mes' | '3meses' | '12meses'
export type PeriodoDashboard = 'semanal' | 'mensual' | 'trimestral'

export interface MetricaImporte { importe: number; deltaPorcentaje: number }
export interface DistribucionCuentas { Vigente: number; '1-30': number; '31-60': number; '+60': number }
export interface ResumenCuentas { totalPendiente: number; cantidad: number; cantidadVencidas: number; distribucion: DistribucionCuentas; cantidadPorFranja: Record<'Vigente' | '1-30' | '31-60' | '+60', number> }
export interface PuntoSerieDashboard { etiqueta: string; desde: ISODateOnly; hasta: ISODateOnly; ventas: number; compras: number }
export interface CategoriaDashboard { categoriaId: ID; nombre: string; importe: number }
export type StockCriticoLegacy = StockCriticoDashboard

function periodoCompat(fechaReferencia: ISODateOnly, periodo: PeriodoDashboard): PeriodoResuelto {
  if (periodo === 'mensual') return resolverPeriodo('12meses', fechaReferencia)
  if (periodo === 'trimestral') return resolverPeriodo('trimestre', fechaReferencia)
  const fecha = new Date(`${fechaReferencia}T12:00:00.000Z`)
  fecha.setUTCDate(fecha.getUTCDate() - 77)
  return { actual: { desde: fecha.toISOString().slice(0, 10), hasta: fechaReferencia }, anterior: null, granularidad: 'semana' }
}

function metricaCompat(kpi: { valor: number; deltaPct: number | null }): MetricaImporte {
  return { importe: kpi.valor, deltaPorcentaje: kpi.deltaPct ?? 0 }
}

export function ventasDelMes(estado: ERPState, fechaReferencia: ISODateOnly): MetricaImporte {
  return metricaCompat(ventasFacturadas(estado, resolverPeriodo('mes', fechaReferencia)))
}

export function comprasDelMes(estado: ERPState, fechaReferencia: ISODateOnly): MetricaImporte {
  return metricaCompat(comprasFacturadas(estado, resolverPeriodo('mes', fechaReferencia)))
}

export function utilidadDelMes(estado: ERPState, fechaReferencia: ISODateOnly): MetricaImporte {
  return metricaCompat(utilidadBruta(estado, resolverPeriodo('mes', fechaReferencia)))
}

export function cuentasPorCobrar(estado: ERPState, _fechaReferencia: ISODateOnly): ResumenCuentas {
  return resumenCuentasLegacy(estado, 'cobrar') as unknown as ResumenCuentas
}

export function cuentasPorPagar(estado: ERPState, _fechaReferencia: ISODateOnly): ResumenCuentas {
  return resumenCuentasLegacy(estado, 'pagar') as unknown as ResumenCuentas
}

export function rotacionInventario(estado: ERPState, fechaReferencia: ISODateOnly): number {
  return rotacionKpi(estado, resolverPeriodo('12meses', fechaReferencia)).valor
}

export function serieVentasCompras(estado: ERPState, periodo: PeriodoInput): PuntoSerieVentasCompras[]
export function serieVentasCompras(estado: ERPState, fechaReferencia: ISODateOnly, periodo: PeriodoDashboard): PuntoSerieDashboard[]
export function serieVentasCompras(estado: ERPState, fechaOPeriodo: ISODateOnly | PeriodoInput, periodo?: PeriodoDashboard): PuntoSerieVentasCompras[] | PuntoSerieDashboard[] {
  if (periodo === undefined) return serieNueva(estado, fechaOPeriodo as PeriodoInput)
  return serieNueva(estado, periodoCompat(fechaOPeriodo as ISODateOnly, periodo)).map(({ etiqueta, desde, hasta, ventas, compras }) => ({ etiqueta, desde, hasta, ventas, compras }))
}

function rangoCompat(fechaReferencia: ISODateOnly, rango: RangoDashboard): PeriodoResuelto {
  if (rango === 'mes') return resolverPeriodo('mes', fechaReferencia)
  if (rango === '3meses') return resolverPeriodo('trimestre', fechaReferencia)
  return resolverPeriodo('12meses', fechaReferencia)
}

export function ventasPorCategoria(estado: ERPState, periodo: PeriodoInput): ReturnType<typeof ventasPorCategoriaNueva>
export function ventasPorCategoria(estado: ERPState, fechaReferencia: ISODateOnly, rango: RangoDashboard): CategoriaDashboard[]
export function ventasPorCategoria(estado: ERPState, fechaOPeriodo: ISODateOnly | PeriodoInput, rango?: RangoDashboard): ReturnType<typeof ventasPorCategoriaNueva> | CategoriaDashboard[] {
  if (rango === undefined) return ventasPorCategoriaNueva(estado, fechaOPeriodo as PeriodoInput)
  const actual = rangoCompat(fechaOPeriodo as ISODateOnly, rango).actual
  const importes = new Map<ID, number>()
  for (const comprobante of comprobantesVenta(estado).filter((item) => enRango(item.fechaEmision, actual))) for (const detalle of detallesVenta(estado, comprobante.ventaId)) importes.set(detalle.productoId, redondearDosDecimales((importes.get(detalle.productoId) ?? 0) + detalle.cantidad * detalle.precioUnitario - detalle.descuento))
  for (const nota of notasCredito(estado, actual)) for (const detalle of detallesVenta(estado, nota.ventaId)) importes.set(detalle.productoId, redondearDosDecimales((importes.get(detalle.productoId) ?? 0) - (detalle.cantidad * detalle.precioUnitario - detalle.descuento)))
  return estado.categorias.map((categoria) => ({ categoriaId: categoria.id, nombre: categoria.nombre, importe: redondearDosDecimales(estado.productos.filter((producto) => producto.categoriaId === categoria.id).reduce((total, producto) => total + (importes.get(producto.id) ?? 0), 0)) }))
}

export function stockCritico(estado: ERPState, limite: number): StockCriticoLegacy[] {
  return stockCriticoNuevo(estado, limite)
}
