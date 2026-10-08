import type { TipoMovimientoInventario } from '../types'

export const NATURALEZA_MOVIMIENTO_INVENTARIO: Record<TipoMovimientoInventario, 'entrada' | 'salida'> = {
  'Saldo inicial': 'entrada',
  'Entrada por compra': 'entrada',
  'Salida por venta': 'salida',
  'Entrada por devolución': 'entrada',
  'Transferencia salida': 'salida',
  'Transferencia entrada': 'entrada',
  'Ajuste entrada': 'entrada',
  'Ajuste salida': 'salida',
}
