import { useMemo, useState, type ReactNode } from 'react'
import { AreaChart, DonutChart, FunnelSteps, LineChart, ProgressRing, RankingBars, Sparkline, StackedBar } from '../../components/charts'
import type { DonutItem, FunnelStep, StackedBarItem } from '../../components/charts'
import { SalesPurchasesBarChart } from '../../components/data-display/SalesPurchasesBarChart'
import { PageContent, PageHeader } from '../../components/layout/PageLayout'
import { formatCompactSoles } from '../../utils/charts'
import { useERPStore } from '../../store'
import { antiguedadCxC, conversionCotizaciones, embudoPedidos, flujoCaja, kpisDashboard, serieVentasCompras, topClientes, topProductos, ventasPorCategoria } from '../../store/selectors/dashboard'
import type { PeriodoInput } from '../../store/selectors/dashboard'

type GalleryPeriod = Exclude<PeriodoInput, object>

const periodos: { value: GalleryPeriod; label: string }[] = [{ value: 'mes', label: 'Mes' }, { value: 'trimestre', label: 'Trimestre' }, { value: '12meses', label: '12 meses' }]

function Narrow({ children }: { children: ReactNode }) {
  return <div className="min-w-0 w-[320px] max-w-full overflow-hidden rounded-2xl bg-surface-muted/50 p-3"><p className="mb-3 text-[11px] font-medium text-text-muted">Modo estrecho · 320 px</p>{children}</div>
}

function StateSamples({ children }: { children: (status: 'loading' | 'empty' | 'error') => ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-3"><div className="min-w-0">{children('loading')}</div><div className="min-w-0">{children('empty')}</div><div className="min-w-0">{children('error')}</div></div>
}

export function ChartsGalleryPage() {
  const state = useERPStore()
  const [periodo, setPeriodo] = useState<GalleryPeriod>('12meses')
  const kpis = useMemo(() => kpisDashboard(state, periodo), [state, periodo])
  const serie = useMemo(() => serieVentasCompras(state, periodo), [state, periodo])
  const caja = useMemo(() => flujoCaja(state, periodo), [state, periodo])
  const categorias = useMemo(() => ventasPorCategoria(state, periodo), [state, periodo])
  const clientes = useMemo(() => topClientes(state, periodo), [state, periodo])
  const productos = useMemo(() => topProductos(state, periodo), [state, periodo])
  const aging = useMemo(() => antiguedadCxC(state, periodo), [state, periodo])
  const embudo = useMemo(() => embudoPedidos(state, periodo), [state, periodo])
  const conversion = useMemo(() => conversionCotizaciones(state, periodo), [state, periodo])
  const categoryData: DonutItem[] = categorias.map((item) => ({ label: item.nombre, value: item.monto, percentage: item.porcentaje }))
  const funnelData: FunnelStep[] = embudo.map((step) => ({ label: step.paso.replace('Pedidos ', ''), count: step.cantidad, amount: step.monto, conversion: step.porcentajeConversion }))
  const agingData: StackedBarItem[] = aging.franjas.map((item, index) => ({ label: item.tramo, value: item.monto, count: item.cantidad, tone: index === 0 ? 'success' : index === 1 ? 'warning-soft' : index === 2 ? 'warning' : 'danger' }))
  const flowData = caja.puntos.map((point) => ({ label: point.etiqueta, value: point.ingresos, secondary: point.egresos }))
  const saldoData = caja.puntos.map((point) => ({ label: point.etiqueta, value: point.saldoAcumulado }))
  const narrow = <Narrow><SalesPurchasesBarChart data={serie.slice(-6)} periodo={periodo} periodOptions={periodos} onPeriodoChange={setPeriodo} /></Narrow>

  return <><PageHeader title="Galería de gráficos" description="Componentes SVG del sistema EnterpriseCloud. Solo disponible en desarrollo." /><PageContent><div className="space-y-12">
    <section className="space-y-6"><div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-base font-semibold text-text">Datos reales del store</h2><p className="mt-1 text-sm text-text-muted">Los gráficos usan los selectores del dashboard para la fecha {state.fechaReferencia}.</p></div><select value={periodo} onChange={(event) => setPeriodo(event.target.value as GalleryPeriod)} className="h-9 rounded-[10px] border border-border bg-surface px-3 text-xs text-text focus-visible:ring-3 focus-visible:ring-accent-soft">{periodos.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div><div className="grid gap-8 xl:grid-cols-2"><div><SalesPurchasesBarChart data={serie} periodo={periodo} periodOptions={periodos} onPeriodoChange={setPeriodo} />{narrow}</div><div><LineChart data={flowData} title="Flujo de caja" subtitle="Ingresos y egresos por periodo" valueLabel="Ingresos" secondaryLabel="Egresos" /> <Narrow><LineChart data={flowData.slice(-6)} title="Flujo estrecho" valueLabel="Ingresos" secondaryLabel="Egresos" /></Narrow></div></div></section>
    <section className="grid gap-8 xl:grid-cols-2"><div><AreaChart data={saldoData} title="Saldo acumulado" subtitle="Evolución del saldo de caja" valueLabel="Saldo" /> <Narrow><AreaChart data={saldoData.slice(-6)} title="Saldo estrecho" valueLabel="Saldo" /></Narrow></div><div className="min-w-0"><DonutChart data={categoryData} title="Ventas por categoría" centerLabel="Ventas netas" /><div className="mt-6 w-full max-w-[520px]"><DonutChart data={categoryData.slice(0, 4)} title="Categorías estrecho" /></div></div></section>
    <section className="grid gap-8 xl:grid-cols-2"><div><RankingBars data={clientes.map((item) => ({ label: item.nombre, value: item.monto, detail: `${item.porcentaje}% del periodo` }))} title="Top clientes" /><Narrow><RankingBars data={clientes.slice(0, 3).map((item) => ({ label: item.nombre, value: item.monto }))} title="Clientes estrecho" /></Narrow></div><div><RankingBars data={productos.map((item) => ({ label: item.nombre, value: item.monto, detail: `${item.unidades} unidades` }))} title="Top productos" /><Narrow><RankingBars data={productos.slice(0, 3).map((item) => ({ label: item.nombre, value: item.unidades }))} title="Productos estrecho" valueFormatter={(value) => `${value} u`} /></Narrow></div></section>
    <section className="grid gap-8 xl:grid-cols-2"><div><StackedBar data={agingData} title="Antigüedad de CxC" /><Narrow><StackedBar data={agingData} title="Antigüedad estrecho" /></Narrow></div><div><FunnelSteps data={funnelData} title="Embudo de pedidos" /><Narrow><FunnelSteps data={funnelData} title="Embudo estrecho" /></Narrow></div></section>
    <section className="grid gap-8 xl:grid-cols-2"><div className="rounded-xl bg-surface p-5"><div className="flex items-center justify-between"><div><h2 className="text-sm font-semibold text-text">Sparklines y progreso</h2><p className="mt-1 text-xs text-text-muted">Variantes de los KPI del periodo.</p></div><ProgressRing value={kpis.cobrado.valor === 0 ? 0 : (kpis.cobrado.valor / Math.max(1, kpis.ventasFacturadas.valor)) * 100} label="Cobranza" /></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-lg bg-surface-muted p-3"><p className="text-xs text-text-muted">Ventas facturadas</p><p className="mt-1 text-lg font-semibold tabular-nums text-text">{formatCompactSoles(kpis.ventasFacturadas.valor)}</p></div><div className="rounded-lg bg-surface-muted p-3"><p className="text-xs text-text-muted">Margen bruto</p><p className="mt-1 text-lg font-semibold tabular-nums text-text">{kpis.margenBrutoPct.valor.toFixed(1)}%</p></div></div><div className="mt-5 grid grid-cols-2 gap-4"><div><p className="text-xs text-text-muted">Tendencia ventas</p><div className="mt-2 inline-flex rounded bg-surface-muted px-2"><Sparkline values={kpis.ventasFacturadas.sparkline} ariaLabel="Tendencia de ventas facturadas" /></div></div><ProgressRing value={kpis.margenBrutoPct.valor} label="Margen" size="sm" /></div><Narrow><div className="flex items-center justify-between gap-4"><Sparkline values={kpis.ventasFacturadas.sparkline.slice(-6)} ariaLabel="Tendencia estrecha" /><ProgressRing value={kpis.margenBrutoPct.valor} label="Margen" size="sm" /></div></Narrow></div><div><StateSamples>{(status) => <SalesPurchasesBarChart data={serie.slice(0, 1)} periodo={periodo} periodOptions={periodos} onPeriodoChange={setPeriodo} status={status} title={`Ventas vs compras · ${status}`} />}</StateSamples></div></section>
    <section className="space-y-5"><div><h2 className="text-base font-semibold text-text">Variantes de estado</h2><p className="mt-1 text-sm text-text-muted">Cada componente contempla carga, vacío, error y datos de un solo punto.</p></div><div className="grid gap-8 xl:grid-cols-2"><StateSamples>{(status) => <LineChart data={flowData.slice(0, 1)} status={status} title={`Línea · ${status}`} />}</StateSamples><StateSamples>{(status) => <DonutChart data={categoryData.slice(0, 1)} status={status} title={`Donut · ${status}`} />}</StateSamples><StateSamples>{(status) => <RankingBars data={clientes.slice(0, 1).map((item) => ({ label: item.nombre, value: item.monto }))} status={status} title={`Ranking · ${status}`} />}</StateSamples><StateSamples>{(status) => <StackedBar data={agingData} status={status} title={`Antigüedad · ${status}`} />}</StateSamples><StateSamples>{(status) => <FunnelSteps data={funnelData.slice(0, 1)} status={status} title={`Embudo · ${status}`} />}</StateSamples></div></section>
    <section className="rounded-xl bg-surface-muted p-5"><h2 className="text-sm font-semibold text-text">Conversión de cotizaciones</h2><p className="mt-2 text-sm text-text-soft">Emitidas: <strong>{conversion.emitidas.cantidad}</strong> · aceptadas: <strong>{conversion.aceptadas.cantidad}</strong> · convertidas a venta: <strong>{conversion.convertidas.cantidad}</strong> · tasa: <strong>{conversion.tasaConversion.toFixed(1)}%</strong></p></section>
  </div></PageContent></>
}
