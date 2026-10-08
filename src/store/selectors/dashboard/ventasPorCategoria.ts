import type { ID } from '../../../types'
import type { ERPState } from '../../state'
import { redondearDosDecimales } from '../../../utils'
import { enRango, notasCredito, periodoActual, comprobantesVenta, detallesVenta, totalVentasNetas } from './common'
import type { PeriodoInput } from './periodo'

export interface VentaCategoriaDashboard {
  categoriaId?: ID
  nombre: string
  monto: number
  porcentaje: number
}

interface CategoriaMonto {
  categoriaId?: ID
  nombre: string
  monto: number
}

export function ventasPorCategoria(estado: ERPState, periodo: PeriodoInput): VentaCategoriaDashboard[] {
  const rango = periodoActual(estado, periodo).actual
  const importes = new Map<ID, number>()
  for (const comprobante of comprobantesVenta(estado).filter((item) => enRango(item.fechaEmision, rango))) {
    for (const detalle of detallesVenta(estado, comprobante.ventaId)) importes.set(detalle.productoId, redondearDosDecimales((importes.get(detalle.productoId) ?? 0) + detalle.cantidad * detalle.precioUnitario - detalle.descuento))
  }
  for (const nota of notasCredito(estado, rango)) {
    for (const detalle of detallesVenta(estado, nota.ventaId)) importes.set(detalle.productoId, redondearDosDecimales((importes.get(detalle.productoId) ?? 0) - (detalle.cantidad * detalle.precioUnitario - detalle.descuento)))
  }
  const total = totalVentasNetas(estado, rango)
  const categorias = estado.categorias.map((categoria) => ({ categoriaId: categoria.id, nombre: categoria.nombre, monto: redondearDosDecimales(estado.productos.filter((producto) => producto.categoriaId === categoria.id).reduce((subtotal, producto) => subtotal + (importes.get(producto.id) ?? 0), 0)) })).filter((item) => item.monto !== 0).sort((a, b) => b.monto - a.monto)
  const principales: CategoriaMonto[] = categorias.slice(0, 5)
  const otras = redondearDosDecimales(categorias.slice(5).reduce((subtotal, item) => subtotal + item.monto, 0))
  if (otras !== 0) principales.push({ nombre: 'Otras', monto: otras })
  return principales.map((item) => ({ ...item, porcentaje: total === 0 ? 0 : redondearDosDecimales((item.monto / total) * 100) }))
}

export function categoriasSumanVentasNetas(estado: ERPState, periodo: PeriodoInput): number {
  return redondearDosDecimales(ventasPorCategoria(estado, periodo).reduce((total, item) => total + item.monto, 0))
}
