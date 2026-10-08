import type { ID } from '../../../types'
import type { ERPState } from '../../state'
import { redondearDosDecimales } from '../../../utils'
import { comprobantesVenta, detallesVenta, enRango, periodoActual } from './common'
import type { PeriodoInput } from './periodo'
import { selectTotalVenta } from '../index'

export interface RankingClienteDashboard {
  clienteId: ID
  nombre: string
  monto: number
  porcentaje: number
}

export interface RankingProductoDashboard {
  productoId: ID
  nombre: string
  unidades: number
  monto: number
  porcentaje: number
}

export function topClientes(estado: ERPState, periodo: PeriodoInput, limite = 5): RankingClienteDashboard[] {
  const rango = periodoActual(estado, periodo).actual
  const montos = new Map<ID, number>()
  for (const comprobante of comprobantesVenta(estado).filter((item) => enRango(item.fechaEmision, rango))) montos.set(comprobante.clienteId, redondearDosDecimales((montos.get(comprobante.clienteId) ?? 0) + selectTotalVenta(estado, comprobante.ventaId)))
  const total = redondearDosDecimales([...montos.values()].reduce((sum, monto) => sum + monto, 0))
  return [...montos.entries()].map(([clienteId, monto]) => ({ clienteId, nombre: estado.clientes.find((item) => item.id === clienteId)?.razonSocial ?? clienteId, monto, porcentaje: total === 0 ? 0 : redondearDosDecimales((monto / total) * 100) })).sort((a, b) => b.monto - a.monto).slice(0, limite)
}

export function topProductos(estado: ERPState, periodo: PeriodoInput, limite = 5): RankingProductoDashboard[] {
  const rango = periodoActual(estado, periodo).actual
  const acumulados = new Map<ID, { unidades: number; monto: number }>()
  for (const comprobante of comprobantesVenta(estado).filter((item) => enRango(item.fechaEmision, rango))) {
    for (const detalle of detallesVenta(estado, comprobante.ventaId)) {
      const previo = acumulados.get(detalle.productoId) ?? { unidades: 0, monto: 0 }
      acumulados.set(detalle.productoId, { unidades: previo.unidades + detalle.cantidad, monto: redondearDosDecimales(previo.monto + detalle.cantidad * detalle.precioUnitario - detalle.descuento) })
    }
  }
  const total = redondearDosDecimales([...acumulados.values()].reduce((sum, item) => sum + item.monto, 0))
  return [...acumulados.entries()].map(([productoId, item]) => ({ productoId, nombre: estado.productos.find((producto) => producto.id === productoId)?.nombre ?? productoId, ...item, porcentaje: total === 0 ? 0 : redondearDosDecimales((item.monto / total) * 100) })).sort((a, b) => b.monto - a.monto).slice(0, limite)
}

