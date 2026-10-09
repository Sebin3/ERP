import { BarChart3, Download, PackageSearch, Receipt, WalletCards } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { FunnelSteps, LineChart, RankingBars, StackedBar } from '../components/charts'
import type { StackedBarItem } from '../components/charts'
import { SalesPurchasesBarChart } from '../components/data-display/SalesPurchasesBarChart'
import { PageContent, PageHeader } from '../components/layout/PageLayout'
import { Button, KpiCard, SegmentedControl, Toast } from '../components/ui'
import type { PeriodoDashboard } from '../store/selectors/dashboard/periodo'
import { antiguedadCxC, antiguedadCxP, embudoPedidos, flujoCaja, kpisDashboard, serieVentasCompras, valorInventarioPorAlmacen, valorInventarioPorCategoria } from '../store/selectors/dashboard'
import { useERPStore } from '../store'
import { usePermisos } from '../hooks'
import { formatCompactSoles } from '../utils/charts'

type ReportKind = 'resumen' | 'ventas' | 'compras' | 'inventario' | 'finanzas'

const periodos = [
  { value: 'mes' as const, label: 'Mes' },
  { value: 'trimestre' as const, label: 'Trimestre' },
  { value: '12meses' as const, label: '12 meses' },
]

const money = (value: number) => `S/ ${value.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function agingItems(franjas: readonly { tramo: string; monto: number; cantidad: number }[]): StackedBarItem[] {
  const tones: StackedBarItem['tone'][] = ['success', 'warning-soft', 'warning', 'danger']
  return franjas.map((item, index) => ({ label: item.tramo, value: item.monto, count: item.cantidad, tone: tones[index] ?? 'warning-soft' }))
}

export function ReportsPage({ kind }: { kind: ReportKind }) {
  const state = useERPStore()
  const { puede } = usePermisos()
  const [periodo, setPeriodo] = useState<PeriodoDashboard>('12meses')
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'danger' } | null>(null)
  const data = useMemo(() => buildReportData(state, periodo), [state, periodo])

  const title = kind === 'resumen' ? 'Reportes' : kind === 'ventas' ? 'Reporte de ventas' : kind === 'compras' ? 'Reporte de compras' : kind === 'inventario' ? 'Reporte de inventario' : 'Reporte financiero'
  const description = kind === 'resumen' ? 'Indicadores consolidados para revisar el estado del negocio.' : 'Información derivada de las operaciones registradas en EnterpriseCloud.'
  const exportReport = () => {
    if (!state.usuarioActualId) return
    const result = state.exportarReporte(kind, state.usuarioActualId)
    setToast(result.ok ? { message: 'Reporte registrado para exportación.', tone: 'success' } : { message: result.error, tone: 'danger' })
  }
  const kpiCards = [
    { label: 'Ventas facturadas', value: money(data.kpis.ventasFacturadas.valor), icon: Receipt, tone: 'accent' as const, sparkline: data.kpis.ventasFacturadas.sparkline, delta: data.kpis.ventasFacturadas.deltaPct },
    { label: 'Compras facturadas', value: money(data.kpis.comprasFacturadas.valor), icon: PackageSearch, tone: 'neutral' as const, sparkline: data.kpis.comprasFacturadas.sparkline, delta: data.kpis.comprasFacturadas.deltaPct },
    { label: 'Utilidad bruta', value: money(data.kpis.utilidadBruta.valor), icon: BarChart3, tone: 'success' as const, sparkline: data.kpis.utilidadBruta.sparkline, delta: data.kpis.utilidadBruta.deltaPct },
    { label: 'Por cobrar', value: money(data.kpis.porCobrar.valor), icon: WalletCards, tone: 'warning' as const, sparkline: data.kpis.porCobrar.sparkline, delta: data.kpis.porCobrar.deltaPct },
  ]

  return <>
    <PageHeader title={title} description={description} actions={puede('Reportes', 'exportar') ? <Button variant="secondary" leadingIcon={Download} onClick={exportReport}>Exportar reporte</Button> : undefined} />
    <PageContent>
      <div className="mx-auto max-w-[1440px] space-y-8">
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-surface-muted p-3.5"><div><p className="text-sm font-medium text-text">Periodo del reporte</p><p className="mt-0.5 text-xs text-text-muted">Los indicadores se recalculan con la fecha de referencia del sistema.</p></div><SegmentedControl ariaLabel="Periodo del reporte" options={periodos} value={periodo} onChange={setPeriodo} /></section>
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{kpiCards.map((card) => <KpiCard key={card.label} {...card} />)}</section>
        {kind === 'resumen' || kind === 'ventas' ? <ReportGroup title="Actividad comercial" description="Ventas facturadas, compras y avance de los pedidos."><SalesReport data={data} /></ReportGroup> : null}
        {kind === 'resumen' || kind === 'compras' ? <ReportGroup title="Abastecimiento" description="Comportamiento de compras y egresos registrados."><PurchasesReport data={data} /></ReportGroup> : null}
        {kind === 'resumen' || kind === 'inventario' ? <ReportGroup title="Inventario" description="Distribución del valor de existencias por categoría y almacén."><InventoryReport data={data} /></ReportGroup> : null}
        {kind === 'resumen' || kind === 'finanzas' ? <ReportGroup title="Finanzas" description="Antigüedad de saldos y movimiento de caja."><FinanceReport data={data} /></ReportGroup> : null}
      </div>
    </PageContent>
    {toast ? <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} /> : null}
  </>
}

function ReportGroup({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <section className="space-y-4"><div><h2 className="text-base font-semibold text-text">{title}</h2><p className="mt-1 text-sm text-text-muted">{description}</p></div>{children}</section>
}

function ReportCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`min-w-0 ${className}`}>{children}</div>
}

function SalesReport({ data }: { data: ReturnType<typeof buildReportData> }) {
  return <section className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.85fr)]"><ReportCard><SalesPurchasesBarChart data={data.serie} periodo="12meses" onPeriodoChange={() => undefined} periodOptions={periodos} showPeriodControl={false} /></ReportCard><ReportCard><FunnelSteps data={data.embudo.map((item) => ({ label: item.paso.replace('Pedidos ', ''), count: item.cantidad, amount: item.monto, conversion: item.porcentajeConversion }))} title="Embudo de pedidos" /></ReportCard></section>
}

function PurchasesReport({ data }: { data: ReturnType<typeof buildReportData> }) {
  return <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(420px,1fr)]"><ReportTable title="Compras por periodo" columns={['Periodo', 'Compras facturadas']} rows={data.serie.map((item) => [item.etiqueta, formatCompactSoles(item.compras)])} /><ReportCard><LineChart data={data.flujo.puntos.map((item) => ({ label: item.etiqueta, value: item.egresos }))} title="Egresos registrados" subtitle="Pagos y salidas de caja del periodo" valueLabel="Egresos" /></ReportCard></section>
}

function InventoryReport({ data }: { data: ReturnType<typeof buildReportData> }) {
  return <section className="grid gap-5 xl:grid-cols-2"><ReportCard><RankingBars data={data.inventarioCategoria.map((item) => ({ label: item.nombre, value: item.valor }))} title="Valor por categoría" /></ReportCard><ReportCard><RankingBars data={data.inventarioAlmacen.map((item) => ({ label: item.nombre, value: item.valor }))} title="Valor por almacén" /></ReportCard></section>
}

function FinanceReport({ data }: { data: ReturnType<typeof buildReportData> }) {
  return <div className="space-y-5"><div className="grid gap-5 xl:grid-cols-2"><ReportCard><StackedBar data={agingItems(data.cxc.franjas)} title="Antigüedad de CxC" /></ReportCard><ReportCard><StackedBar data={agingItems(data.cxp.franjas)} title="Antigüedad de CxP" /></ReportCard></div><ReportCard className="max-w-[920px]"><LineChart data={data.flujo.puntos.map((item) => ({ label: item.etiqueta, value: item.ingresos, secondary: item.egresos }))} area title="Flujo de caja" subtitle="Ingresos y egresos" valueLabel="Ingresos" secondaryLabel="Egresos" /></ReportCard></div>
}

function ReportTable({ title, columns, rows }: { title: string; columns: string[]; rows: string[][] }) {
  return <section className="min-w-0 rounded-xl bg-surface p-5"><h2 className="text-sm font-semibold text-text">{title}</h2><div className="mt-4 min-w-0"><table className="w-full table-fixed text-left text-sm"><thead className="text-xs text-text-muted"><tr>{columns.map((column) => <th key={column} className="border-b border-border/70 px-2 py-3 font-medium first:w-2/3 first:pl-0 last:text-right">{column}</th>)}</tr></thead><tbody className="divide-y divide-border/60">{rows.map((row, index) => <tr key={`${row[0]}-${index}`} className="text-text-soft">{row.map((cell, cellIndex) => <td key={`${cell}-${cellIndex}`} className={`break-words px-2 py-3 first:pl-0 last:text-right ${cellIndex > 0 ? 'tabular-nums' : ''}`}>{cell}</td>)}</tr>)}</tbody></table></div></section>
}

function buildReportData(state: Parameters<typeof kpisDashboard>[0], periodo: PeriodoDashboard) {
  return { kpis: kpisDashboard(state, periodo), serie: serieVentasCompras(state, periodo), flujo: flujoCaja(state, periodo), embudo: embudoPedidos(state, periodo), cxc: antiguedadCxC(state, periodo), cxp: antiguedadCxP(state, periodo), inventarioCategoria: valorInventarioPorCategoria(state), inventarioAlmacen: valorInventarioPorAlmacen(state) }
}
