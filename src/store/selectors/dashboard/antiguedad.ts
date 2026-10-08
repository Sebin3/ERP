import type { ERPState } from '../../state'
import { redondearDosDecimales } from '../../../utils'
import { sumaSaldos, tramoCuenta } from './common'
import type { PeriodoInput } from './periodo'
import type { TramoDashboard } from './common'
import { selectSaldoCuenta } from '../index'

export interface FranjaSaldoDashboard {
  tramo: TramoDashboard
  monto: number
  cantidad: number
}

export interface AntiguedadDashboard {
  franjas: FranjaSaldoDashboard[]
  totalPendiente: number
}

function antiguedad(estado: ERPState, tipo: 'cobrar' | 'pagar'): AntiguedadDashboard {
  const cuentas = tipo === 'cobrar' ? estado.cuentasCobrar : estado.cuentasPagar
  const fechaReferencia = estado.fechaReferencia
  const franjas = (['Vigente', '1-30', '31-60', '+60'] as const).map((tramo) => {
    const deFranja = cuentas.filter((cuenta) => selectSaldoCuenta(estado, cuenta.id) > 0 && tramoCuenta(cuenta.fechaVencimiento, fechaReferencia) === tramo)
    return { tramo, monto: redondearDosDecimales(deFranja.reduce((total, cuenta) => total + selectSaldoCuenta(estado, cuenta.id), 0)), cantidad: deFranja.length }
  })
  return { franjas, totalPendiente: sumaSaldos(estado, tipo) }
}

export function antiguedadCxC(estado: ERPState, _periodo: PeriodoInput): AntiguedadDashboard {
  return antiguedad(estado, 'cobrar')
}

export function antiguedadCxP(estado: ERPState, _periodo: PeriodoInput): AntiguedadDashboard {
  return antiguedad(estado, 'pagar')
}

export function resumenCuentasLegacy(estado: ERPState, tipo: 'cobrar' | 'pagar') {
  const resumen = antiguedad(estado, tipo)
  return {
    totalPendiente: resumen.totalPendiente,
    cantidad: resumen.franjas.reduce((total, franja) => total + franja.cantidad, 0),
    cantidadVencidas: resumen.franjas.filter((franja) => franja.tramo !== 'Vigente').reduce((total, franja) => total + franja.cantidad, 0),
    distribucion: Object.fromEntries(resumen.franjas.map((franja) => [franja.tramo, franja.monto])),
    cantidadPorFranja: Object.fromEntries(resumen.franjas.map((franja) => [franja.tramo, franja.cantidad])),
  }
}
