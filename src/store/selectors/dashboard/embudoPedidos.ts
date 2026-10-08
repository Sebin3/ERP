import type { ERPState } from '../../state'
import { redondearDosDecimales } from '../../../utils'
import { periodoActual, enRango } from './common'
import type { PeriodoInput } from './periodo'
import { selectEstadoVenta, selectTotalVenta } from '../index'

export interface PasoEmbudoPedidos {
  paso: 'Pedidos creados' | 'Pedidos aprobados' | 'Pedidos facturados' | 'Pedidos cobrados'
  cantidad: number
  monto: number
  porcentajeConversion: number
}

interface RegistroConMonto {
  id: string
  monto: number
}

function porcentaje(actual: number, anterior: number): number {
  return anterior === 0 ? 0 : redondearDosDecimales((actual / anterior) * 100)
}

function crearPaso(nombre: PasoEmbudoPedidos['paso'], registros: RegistroConMonto[], anterior: PasoEmbudoPedidos | null): PasoEmbudoPedidos {
  const cantidad = registros.length
  const monto = redondearDosDecimales(registros.reduce((total, registro) => total + registro.monto, 0))
  return { paso: nombre, cantidad, monto, porcentajeConversion: anterior ? porcentaje(cantidad, anterior.cantidad) : 100 }
}

export function embudoPedidos(estado: ERPState, periodo: PeriodoInput): PasoEmbudoPedidos[] {
  const rango = periodoActual(estado, periodo).actual
  const pedidos = estado.ventas.filter((venta) => venta.estado !== 'Anulado' && enRango(venta.fecha, rango)).map((venta) => ({ id: venta.id, monto: selectTotalVenta(estado, venta.id) }))
  const idsPedidos = new Set(pedidos.map((pedido) => pedido.id))
  const aprobados = estado.ventas.filter((venta) => idsPedidos.has(venta.id) && (venta.estado === 'Aprobado' || venta.estado === 'Facturado')).map((venta) => ({ id: venta.id, monto: selectTotalVenta(estado, venta.id) }))
  const facturados = estado.ventas.filter((venta) => idsPedidos.has(venta.id) && venta.estado === 'Facturado').map((venta) => ({ id: venta.id, monto: selectTotalVenta(estado, venta.id) }))
  const cobrados = facturados.filter((venta) => selectEstadoVenta(estado, venta.id, estado.fechaReferencia) === 'Cobrado')
  const pasos: PasoEmbudoPedidos[] = []
  for (const [nombre, registros] of [['Pedidos creados', pedidos], ['Pedidos aprobados', aprobados], ['Pedidos facturados', facturados], ['Pedidos cobrados', cobrados] ] as const) pasos.push(crearPaso(nombre, registros, pasos.at(-1) ?? null))
  return pasos
}
