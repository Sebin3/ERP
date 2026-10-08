import { PixelChart as SharedPixelChart, type PixelChartPoint } from '../charts'
import type { PeriodoDashboard, PuntoSerieDashboard } from '../../store/selectors/dashboard/index'

export function PixelChart({ data, periodo, onPeriodoChange, mostrarCompras = true }: { data: readonly PuntoSerieDashboard[]; periodo: PeriodoDashboard; onPeriodoChange: (periodo: PeriodoDashboard) => void; mostrarCompras?: boolean }) {
  const points: PixelChartPoint[] = data.map((point) => ({ label: point.etiqueta, ventas: point.ventas, compras: point.compras }))
  return <SharedPixelChart data={points} periodo={periodo} periodOptions={[{ value: 'semanal', label: 'Semanal' }, { value: 'mensual', label: 'Mensual' }, { value: 'trimestral', label: 'Trimestral' }]} onPeriodoChange={(value) => onPeriodoChange(value as PeriodoDashboard)} mostrarCompras={mostrarCompras} />
}
