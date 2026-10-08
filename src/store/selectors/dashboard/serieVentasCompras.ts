import type { ERPState } from '../../state'
import { redondearDosDecimales } from '../../../utils'
import { enRango, periodoActual, totalFacturadoCompras, totalFacturadoVentas } from './common'
import type { PeriodoInput, RangoDashboard } from './periodo'

export interface PuntoSerieVentasCompras {
  etiqueta: string
  desde: string
  hasta: string
  ventas: number
  compras: number
  ventasAnterior: number | null
  parcial: boolean
}

function fecha(fechaISO: string): Date {
  return new Date(`${fechaISO}T12:00:00.000Z`)
}

function iso(fechaActual: Date): string {
  return fechaActual.toISOString().slice(0, 10)
}

function terminaNaturalmente(desde: string, granularidad: 'dia' | 'semana' | 'mes'): string {
  const resultado = fecha(desde)
  if (granularidad === 'mes') resultado.setUTCMonth(resultado.getUTCMonth() + 1)
  else resultado.setUTCDate(resultado.getUTCDate() + (granularidad === 'semana' ? 7 : 1))
  resultado.setUTCDate(resultado.getUTCDate() - 1)
  return iso(resultado)
}

function puntosRango(rango: RangoDashboard, granularidad: 'dia' | 'semana' | 'mes'): RangoDashboard[] {
  const resultado: RangoDashboard[] = []
  let cursor = fecha(rango.desde)
  const limite = fecha(rango.hasta)
  while (cursor <= limite) {
    const desde = new Date(cursor)
    const hasta = new Date(cursor)
    if (granularidad === 'dia') hasta.setUTCDate(hasta.getUTCDate() + 1)
    if (granularidad === 'semana') hasta.setUTCDate(hasta.getUTCDate() + 7)
    if (granularidad === 'mes') hasta.setUTCMonth(hasta.getUTCMonth() + 1)
    hasta.setUTCDate(hasta.getUTCDate() - 1)
    resultado.push({ desde: iso(desde), hasta: iso(hasta > limite ? limite : hasta) })
    cursor = new Date(hasta)
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return resultado
}

function etiqueta(rango: RangoDashboard, index: number, granularidad: 'dia' | 'semana' | 'mes'): string {
  if (granularidad === 'dia') return rango.desde.slice(8, 10)
  if (granularidad === 'semana') return `Sem ${index + 1}`
  return new Intl.DateTimeFormat('es-PE', { month: 'short', year: '2-digit', timeZone: 'UTC' }).format(fecha(rango.desde))
}

export function serieVentasCompras(estado: ERPState, periodo: PeriodoInput): PuntoSerieVentasCompras[] {
  const resuelto = periodoActual(estado, periodo)
  const actual = puntosRango(resuelto.actual, resuelto.granularidad)
  const anterior = resuelto.anterior ? puntosRango(resuelto.anterior, resuelto.granularidad) : []
  return actual.map((rango, index) => ({
    ...rango,
    etiqueta: etiqueta(rango, index, resuelto.granularidad),
    ventas: redondearDosDecimales(totalFacturadoVentas(estado, rango)),
    compras: redondearDosDecimales(totalFacturadoCompras(estado, rango)),
    ventasAnterior: resuelto.anterior && anterior[index] ? redondearDosDecimales(totalFacturadoVentas(estado, anterior[index])) : null,
    parcial: resuelto.granularidad === 'dia' ? terminaNaturalmente(rango.desde, resuelto.granularidad) >= resuelto.actual.hasta : terminaNaturalmente(rango.desde, resuelto.granularidad) > resuelto.actual.hasta,
  }))
}

export function sumaSerie(serie: readonly PuntoSerieVentasCompras[], campo: 'ventas' | 'compras'): number {
  return redondearDosDecimales(serie.reduce((total, punto) => total + punto[campo], 0))
}

export function tieneVentasEnPeriodo(estado: ERPState, rango: RangoDashboard): boolean {
  return estado.comprobantes.some((item) => item.estado === 'Emitido' && 'ventaId' in item && item.tipo !== 'Nota de crédito' && enRango(item.fechaEmision, rango))
}
