import type { ID } from '../../../types'
import type { ERPState } from '../../state'
import { redondearDosDecimales } from '../../../utils'
import { selectCostoPromedio, selectStock, selectStockDisponible } from '../index'

export interface ValorInventarioDashboard {
  id: ID
  nombre: string
  valor: number
  porcentaje: number
}

export interface StockCriticoDashboard {
  productoId: ID
  sku: string
  nombre: string
  stockDisponible: number
  minimo: number
  ratioDisponibleMinimo: number
  almacenId: ID
  almacenNombre: string
}

export function valorInventarioPorCategoria(estado: ERPState): ValorInventarioDashboard[] {
  const valores = estado.categorias.map((categoria) => ({ id: categoria.id, nombre: categoria.nombre, valor: redondearDosDecimales(estado.productos.filter((producto) => producto.categoriaId === categoria.id).reduce((total, producto) => total + estado.almacenes.reduce((sum, almacen) => sum + selectStock(estado, producto.id, almacen.id) * selectCostoPromedio(estado, producto.id, almacen.id), 0), 0)) }))
  const total = redondearDosDecimales(valores.reduce((sum, item) => sum + item.valor, 0))
  return valores.map((item) => ({ ...item, porcentaje: total === 0 ? 0 : redondearDosDecimales((item.valor / total) * 100) }))
}

export function valorInventarioPorAlmacen(estado: ERPState): ValorInventarioDashboard[] {
  const valores = estado.almacenes.map((almacen) => ({ id: almacen.id, nombre: almacen.nombre, valor: redondearDosDecimales(estado.productos.reduce((total, producto) => total + selectStock(estado, producto.id, almacen.id) * selectCostoPromedio(estado, producto.id, almacen.id), 0)) }))
  const total = redondearDosDecimales(valores.reduce((sum, item) => sum + item.valor, 0))
  return valores.map((item) => ({ ...item, porcentaje: total === 0 ? 0 : redondearDosDecimales((item.valor / total) * 100) }))
}

export function stockCritico(estado: ERPState, limite: number): StockCriticoDashboard[] {
  return estado.productos.flatMap((producto) => {
    if (producto.estado !== 'Activo') return []
    const porAlmacen = estado.almacenes.map((almacen) => ({ almacen, stockDisponible: selectStockDisponible(estado, producto.id, almacen.id) }))
    const mayorExistencia = porAlmacen.reduce((mayor, actual) => actual.stockDisponible > mayor.stockDisponible ? actual : mayor, porAlmacen[0])
    if (!mayorExistencia || !porAlmacen.some((item) => item.stockDisponible <= producto.stockMinimo)) return []
    return [{ productoId: producto.id, sku: producto.sku, nombre: producto.nombre, stockDisponible: mayorExistencia.stockDisponible, minimo: producto.stockMinimo, ratioDisponibleMinimo: producto.stockMinimo === 0 ? 0 : redondearDosDecimales(mayorExistencia.stockDisponible / producto.stockMinimo), almacenId: mayorExistencia.almacen.id, almacenNombre: mayorExistencia.almacen.nombre }]
  }).slice(0, limite)
}

