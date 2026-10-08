import type { ERPState } from '../../state'
import { redondearDosDecimales } from '../../../utils'
import { periodoActual, enRango } from './common'
import type { PeriodoInput } from './periodo'

export interface ConversionCotizacionesDashboard {
  emitidas: { cantidad: number; monto: number }
  aceptadas: { cantidad: number; monto: number }
  convertidas: { cantidad: number; monto: number }
  tasaAceptacion: number
  tasaConversion: number
  tasaConversionSobreAceptadas: number
}

function porcentaje(actual: number, anterior: number): number {
  return anterior === 0 ? 0 : redondearDosDecimales((actual / anterior) * 100)
}

function totalCotizacion(cotizacion: ERPState['cotizaciones'][number]): number {
  return redondearDosDecimales(cotizacion.items.reduce((total, item) => {
    const base = item.cantidad * item.precioUnitario - item.descuento
    return total + base + base * (item.tasaImpuesto > 1 ? item.tasaImpuesto / 100 : item.tasaImpuesto)
  }, 0))
}

export function conversionCotizaciones(estado: ERPState, periodo: PeriodoInput): ConversionCotizacionesDashboard {
  const rango = periodoActual(estado, periodo).actual
  const emitidas = estado.cotizaciones.filter((cotizacion) => enRango(cotizacion.fecha, rango) && (cotizacion.estado === 'Enviada' || cotizacion.estado === 'Aceptada'))
  const aceptadas = emitidas.filter((cotizacion) => cotizacion.estado === 'Aceptada')
  const ventasPorCotizacion = new Map(estado.ventas.filter((venta) => venta.cotizacionId).map((venta) => [venta.cotizacionId, venta]))
  const convertidas = emitidas.filter((cotizacion) => ventasPorCotizacion.has(cotizacion.id))
  const resumen = (registros: typeof emitidas) => ({ cantidad: registros.length, monto: redondearDosDecimales(registros.reduce((total, registro) => total + totalCotizacion(registro), 0)) })
  return {
    emitidas: resumen(emitidas),
    aceptadas: resumen(aceptadas),
    convertidas: resumen(convertidas),
    tasaAceptacion: porcentaje(aceptadas.length, emitidas.length),
    tasaConversion: porcentaje(convertidas.length, emitidas.length),
    tasaConversionSobreAceptadas: porcentaje(convertidas.length, aceptadas.length),
  }
}
