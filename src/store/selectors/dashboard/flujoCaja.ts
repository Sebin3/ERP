import type { ERPState } from '../../state'
import { redondearDosDecimales } from '../../../utils'
import { periodoActual, fechasEntre, enRango } from './common'
import { selectSaldoBanco, selectSaldoCaja } from '../index'
import type { PeriodoInput } from './periodo'

export interface PuntoFlujoCaja {
  etiqueta: string
  desde: string
  hasta: string
  ingresos: number
  egresos: number
  neto: number
  saldoAcumulado: number
}

export interface FlujoCajaDashboard {
  puntos: PuntoFlujoCaja[]
  saldoCajaActual: number
  saldoBancosActual: number
}

export function flujoCaja(estado: ERPState, periodo: PeriodoInput): FlujoCajaDashboard {
  const resuelto = periodoActual(estado, periodo)
  const rangos = fechasEntre(resuelto.actual.desde, resuelto.actual.hasta, resuelto.granularidad === 'dia' ? 31 : resuelto.granularidad === 'semana' ? 13 : 12, resuelto.granularidad)
    .map((rango) => ({ ...rango, hasta: rango.hasta > resuelto.actual.hasta ? resuelto.actual.hasta : rango.hasta }))
    .filter((rango) => rango.desde <= resuelto.actual.hasta)
  const puntos = rangos.map((rango, index) => {
    const movimientos = estado.movimientosCaja.filter((movimiento) => enRango(movimiento.fecha, rango))
    const ingresos = redondearDosDecimales(movimientos.filter((item) => item.tipo === 'Ingreso').reduce((total, item) => total + item.monto, 0))
    const egresos = redondearDosDecimales(movimientos.filter((item) => item.tipo === 'Egreso').reduce((total, item) => total + item.monto, 0))
    const saldoAcumulado = redondearDosDecimales(estado.movimientosCaja.filter((item) => item.fecha.slice(0, 10) <= rango.hasta).reduce((total, item) => total + (item.tipo === 'Ingreso' ? item.monto : -item.monto), 0))
    return { ...rango, etiqueta: resuelto.granularidad === 'semana' ? `Sem ${index + 1}` : resuelto.granularidad === 'mes' ? rango.desde.slice(0, 7) : rango.desde.slice(8, 10), ingresos, egresos, neto: redondearDosDecimales(ingresos - egresos), saldoAcumulado }
  })
  return {
    puntos,
    saldoCajaActual: selectSaldoCaja(estado),
    saldoBancosActual: redondearDosDecimales(estado.cuentasBancarias.reduce((total, cuenta) => total + selectSaldoBanco(estado, cuenta.id), 0)),
  }
}

