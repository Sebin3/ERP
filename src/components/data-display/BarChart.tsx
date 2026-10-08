import { RankingBars } from '../charts'
import { SegmentedControl } from '../ui'
import type { CategoriaDashboard, RangoDashboard } from '../../store/selectors/dashboard/index'

export function BarChart({ data, rango, onRangoChange }: { data: readonly CategoriaDashboard[]; rango: RangoDashboard; onRangoChange: (rango: RangoDashboard) => void }) {
  return <section className="min-w-0 w-full max-w-[560px] space-y-3" aria-label="Ventas por categoría">
    <div className="flex min-w-0 flex-wrap items-center justify-between gap-3"><div className="min-w-0"><h2 className="text-sm font-semibold text-text">Ventas por categoría</h2><p className="mt-1 text-xs text-text-muted">Ventas netas sin IGV</p></div><div className="max-w-full overflow-x-auto"><SegmentedControl ariaLabel="Rango del gráfico" options={[{ value: 'mes', label: 'Mes' }, { value: '3meses', label: '3 meses' }, { value: '12meses', label: '12 meses' }]} value={rango} onChange={onRangoChange} /></div></div>
    <RankingBars data={data.map((item) => ({ label: item.nombre, value: item.importe }))} title="Ventas por categoría" hideTitle />
  </section>
}
