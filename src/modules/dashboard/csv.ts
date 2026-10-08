import type { MetricaImporte, PuntoSerieDashboard } from '../../store/selectors/dashboard/index'

export interface DashboardCsvInput {
  ventas: MetricaImporte
  compras: MetricaImporte
  utilidad: MetricaImporte
  stockCritico: number
  serieMensual: readonly PuntoSerieDashboard[]
}

function escapar(valor: string | number): string {
  const texto = String(valor)
  return /[",\n]/.test(texto) ? `"${texto.replaceAll('"', '""')}"` : texto
}

export function construirCsvDashboard(datos: DashboardCsvInput): string {
  const filas: Array<Array<string | number>> = [
    ['Indicador', 'Importe', 'Delta %'],
    ['Ventas del mes', datos.ventas.importe.toFixed(2), datos.ventas.deltaPorcentaje.toFixed(2)],
    ['Compras del mes', datos.compras.importe.toFixed(2), datos.compras.deltaPorcentaje.toFixed(2)],
    ['Utilidad bruta (sin IGV)', datos.utilidad.importe.toFixed(2), datos.utilidad.deltaPorcentaje.toFixed(2)],
    ['Productos con stock crítico', datos.stockCritico, ''],
    [],
    ['Serie mensual', 'Desde', 'Hasta', 'Ventas', 'Compras'],
    ...datos.serieMensual.map((punto) => [punto.etiqueta, punto.desde, punto.hasta, punto.ventas.toFixed(2), punto.compras.toFixed(2)]),
  ]
  return `\ufeff${filas.map((fila) => fila.map(escapar).join(',')).join('\n')}`
}
