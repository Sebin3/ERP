import type { ERPState } from '../../state'
import { redondearDosDecimales } from '../../../utils'
import { selectProductosStockCritico } from '../index'
import { periodoActual, fechasEntre, enRango, generarDelta, costoVentas, importeCobrado, sumaSaldos, totalFacturadoCompras, totalFacturadoVentas, totalVentasNetas, valorInventario } from './common'
import type { PeriodoInput, RangoDashboard } from './periodo'
import { fechaInicioMes, sumarDiasISO } from './periodo'

export interface KpiDashboard<T = number> {
  valor: T
  anterior: T | null
  deltaPct: number | null
  sparkline: number[]
}

export interface KpisDashboard {
  ventasFacturadas: KpiDashboard
  ventasNetas: KpiDashboard
  comprasFacturadas: KpiDashboard
  utilidadBruta: KpiDashboard
  margenBrutoPct: KpiDashboard
  ticketPromedio: KpiDashboard
  nVentas: KpiDashboard
  cobrado: KpiDashboard
  porCobrar: KpiDashboard
  dso: KpiDashboard
  porPagar: KpiDashboard
  productosStockCritico: KpiDashboard
  valorInventario: KpiDashboard
  rotacion: KpiDashboard
  coberturaDias: KpiDashboard
}

function calcularKpi(actual: number, anterior: number | null, sparkline: number[]): KpiDashboard {
  return { valor: redondearDosDecimales(actual), anterior: anterior === null ? null : redondearDosDecimales(anterior), deltaPct: generarDelta(actual, anterior), sparkline: sparkline.slice(-12).map(redondearDosDecimales) }
}

function rangosSparkline(estado: ERPState, periodo: PeriodoInput): RangoDashboard[] {
  const resuelto = periodoActual(estado, periodo)
  return fechasEntre(resuelto.actual.desde, resuelto.actual.hasta, 12, resuelto.granularidad)
}

function kpiPorRango(estado: ERPState, periodo: PeriodoInput, calcular: (rango: RangoDashboard) => number): KpiDashboard {
  const resuelto = periodoActual(estado, periodo)
  const sparkline = rangosSparkline(estado, periodo).map(calcular)
  return calcularKpi(calcular(resuelto.actual), resuelto.anterior ? calcular(resuelto.anterior) : null, sparkline)
}

function utilidadEnRango(estado: ERPState, rango: RangoDashboard): number {
  return redondearDosDecimales(totalVentasNetas(estado, rango) - costoVentas(estado, rango))
}

function margenEnRango(estado: ERPState, rango: RangoDashboard): number {
  const ventas = totalVentasNetas(estado, rango)
  return ventas === 0 ? 0 : redondearDosDecimales((utilidadEnRango(estado, rango) / ventas) * 100)
}

export function ventasFacturadas(estado: ERPState, periodo: PeriodoInput): KpiDashboard {
  return kpiPorRango(estado, periodo, (rango) => totalFacturadoVentas(estado, rango))
}

export function ventasNetas(estado: ERPState, periodo: PeriodoInput): KpiDashboard {
  return kpiPorRango(estado, periodo, (rango) => totalVentasNetas(estado, rango))
}

export function comprasFacturadas(estado: ERPState, periodo: PeriodoInput): KpiDashboard {
  return kpiPorRango(estado, periodo, (rango) => totalFacturadoCompras(estado, rango))
}

export function utilidadBruta(estado: ERPState, periodo: PeriodoInput): KpiDashboard {
  return kpiPorRango(estado, periodo, (rango) => utilidadEnRango(estado, rango))
}

export function margenBrutoPct(estado: ERPState, periodo: PeriodoInput): KpiDashboard {
  return kpiPorRango(estado, periodo, (rango) => margenEnRango(estado, rango))
}

export function ticketPromedio(estado: ERPState, periodo: PeriodoInput): KpiDashboard {
  return kpiPorRango(estado, periodo, (rango) => {
    const facturas = estado.comprobantes.filter((item) => item.estado === 'Emitido' && item.tipo !== 'Nota de crédito' && 'ventaId' in item && enRango(item.fechaEmision, rango))
    return facturas.length === 0 ? 0 : redondearDosDecimales(totalFacturadoVentas(estado, rango) / facturas.length)
  })
}

export function nVentas(estado: ERPState, periodo: PeriodoInput): KpiDashboard {
  return kpiPorRango(estado, periodo, (rango) => estado.comprobantes.filter((item) => item.estado === 'Emitido' && item.tipo !== 'Nota de crédito' && 'ventaId' in item && enRango(item.fechaEmision, rango)).length)
}

export function cobrado(estado: ERPState, periodo: PeriodoInput): KpiDashboard {
  return kpiPorRango(estado, periodo, (rango) => importeCobrado(estado, rango))
}

export function porCobrar(estado: ERPState, _periodo: PeriodoInput): KpiDashboard {
  return calcularKpi(sumaSaldos(estado, 'cobrar'), null, [sumaSaldos(estado, 'cobrar')])
}

function ventasUltimosDias(estado: ERPState, hasta: string, dias: number): number {
  const desde = sumarDiasISO(hasta, -(dias - 1))
  return totalFacturadoVentas(estado, { desde, hasta })
}

export function dso(estado: ERPState, _periodo: PeriodoInput): KpiDashboard {
  const ventas90 = ventasUltimosDias(estado, estado.fechaReferencia, 90)
  const valor = ventas90 === 0 ? 0 : redondearDosDecimales((sumaSaldos(estado, 'cobrar') / ventas90) * 90)
  return calcularKpi(valor, null, [valor])
}

export function porPagar(estado: ERPState, _periodo: PeriodoInput): KpiDashboard {
  return calcularKpi(sumaSaldos(estado, 'pagar'), null, [sumaSaldos(estado, 'pagar')])
}

export function productosStockCritico(estado: ERPState, _periodo: PeriodoInput): KpiDashboard {
  const valor = selectProductosStockCritico(estado).length
  return { valor, anterior: null, deltaPct: null, sparkline: [valor] }
}

export function valorInventarioKpi(estado: ERPState, _periodo: PeriodoInput): KpiDashboard {
  const valor = valorInventario(estado)
  return calcularKpi(valor, null, [valor])
}

export function rotacion(estado: ERPState, _periodo: PeriodoInput): KpiDashboard {
  const desde = fechaInicioMes(sumarDiasISO(estado.fechaReferencia, -365))
  const costo = costoVentas(estado, { desde, hasta: estado.fechaReferencia })
  const inventario = valorInventario(estado)
  const valor = inventario === 0 ? 0 : redondearDosDecimales(costo / inventario)
  return calcularKpi(valor, null, [valor])
}

export function coberturaDias(estado: ERPState, _periodo: PeriodoInput): KpiDashboard {
  const desde = fechaInicioMes(sumarDiasISO(estado.fechaReferencia, -365))
  const costo = costoVentas(estado, { desde, hasta: estado.fechaReferencia })
  const inventario = valorInventario(estado)
  const valor = costo === 0 ? 0 : redondearDosDecimales((inventario / costo) * 365)
  return calcularKpi(valor, null, [valor])
}

export function kpisDashboard(estado: ERPState, periodo: PeriodoInput): KpisDashboard {
  return {
    ventasFacturadas: ventasFacturadas(estado, periodo),
    ventasNetas: ventasNetas(estado, periodo),
    comprasFacturadas: comprasFacturadas(estado, periodo),
    utilidadBruta: utilidadBruta(estado, periodo),
    margenBrutoPct: margenBrutoPct(estado, periodo),
    ticketPromedio: ticketPromedio(estado, periodo),
    nVentas: nVentas(estado, periodo),
    cobrado: cobrado(estado, periodo),
    porCobrar: porCobrar(estado, periodo),
    dso: dso(estado, periodo),
    porPagar: porPagar(estado, periodo),
    productosStockCritico: productosStockCritico(estado, periodo),
    valorInventario: valorInventarioKpi(estado, periodo),
    rotacion: rotacion(estado, periodo),
    coberturaDias: coberturaDias(estado, periodo),
  }
}
