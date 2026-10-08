import type { ISODateOnly } from '../../../types'

export type PeriodoDashboard = 'mes' | 'trimestre' | '12meses'

export interface RangoDashboard {
  desde: ISODateOnly
  hasta: ISODateOnly
}

export interface PeriodoResuelto {
  actual: RangoDashboard
  anterior: RangoDashboard | null
  granularidad: 'dia' | 'semana' | 'mes'
}

function fechaUTC(fecha: ISODateOnly): Date {
  return new Date(`${fecha}T12:00:00.000Z`)
}

function fechaISO(fecha: Date): ISODateOnly {
  return fecha.toISOString().slice(0, 10)
}

function inicioMes(fecha: ISODateOnly): Date {
  const resultado = fechaUTC(fecha)
  resultado.setUTCDate(1)
  return resultado
}

function sumarMeses(fecha: Date, meses: number): Date {
  const resultado = new Date(fecha)
  resultado.setUTCMonth(resultado.getUTCMonth() + meses)
  return resultado
}

function sumarDias(fecha: Date, dias: number): Date {
  const resultado = new Date(fecha)
  resultado.setUTCDate(resultado.getUTCDate() + dias)
  return resultado
}

function finMes(fecha: Date): Date {
  return sumarDias(sumarMeses(fecha, 1), -1)
}

export function resolverPeriodo(periodo: PeriodoDashboard, fechaReferencia: ISODateOnly): PeriodoResuelto {
  const referencia = fechaUTC(fechaReferencia)
  if (periodo === 'mes') {
    const actualDesde = inicioMes(fechaReferencia)
    const anteriorDesde = sumarMeses(actualDesde, -1)
    const diaDelMes = referencia.getUTCDate()
    const ultimoDiaAnterior = finMes(anteriorDesde).getUTCDate()
    const anteriorHasta = new Date(anteriorDesde)
    anteriorHasta.setUTCDate(Math.min(diaDelMes, ultimoDiaAnterior))
    return {
      actual: { desde: fechaISO(actualDesde), hasta: fechaReferencia },
      anterior: { desde: fechaISO(anteriorDesde), hasta: fechaISO(anteriorHasta) },
      granularidad: 'dia',
    }
  }

  if (periodo === 'trimestre') {
    const actualDesde = sumarMeses(inicioMes(fechaReferencia), -2)
    const anteriorHasta = sumarDias(actualDesde, -1)
    const anteriorDesde = sumarMeses(actualDesde, -3)
    return {
      actual: { desde: fechaISO(actualDesde), hasta: fechaReferencia },
      anterior: { desde: fechaISO(anteriorDesde), hasta: fechaISO(anteriorHasta) },
      granularidad: 'semana',
    }
  }

  const actualDesde = sumarMeses(inicioMes(fechaReferencia), -11)
  return {
    actual: { desde: fechaISO(actualDesde), hasta: fechaReferencia },
    anterior: null,
    granularidad: 'mes',
  }
}

export type PeriodoInput = PeriodoDashboard | PeriodoResuelto

export function periodoResuelto(periodo: PeriodoInput, fechaReferencia: ISODateOnly): PeriodoResuelto {
  return typeof periodo === 'string' ? resolverPeriodo(periodo, fechaReferencia) : periodo
}

export function sumarDiasISO(fecha: ISODateOnly, dias: number): ISODateOnly {
  return fechaISO(sumarDias(fechaUTC(fecha), dias))
}

export function fechaInicioMes(fecha: ISODateOnly): ISODateOnly {
  return fechaISO(inicioMes(fecha))
}

export function fechaFinMes(fecha: ISODateOnly): ISODateOnly {
  return fechaISO(finMes(inicioMes(fecha)))
}

export function fechaISODesde(fecha: Date): ISODateOnly {
  return fechaISO(fecha)
}

