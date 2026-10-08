import { Download, ExternalLink, PackageSearch, Receipt, TrendingUp, WalletCards } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FunnelSteps, LineChart, RankingBars, StackedBar } from '../components/charts'
import type { FunnelStep, StackedBarItem } from '../components/charts'
import { BarChart } from '../components/data-display/BarChart'
import { SalesPurchasesBarChart } from '../components/data-display/SalesPurchasesBarChart'
import { PageContent, PageHeader } from '../components/layout/PageLayout'
import { Button, EmptyState, KpiCard, StatusPill } from '../components/ui'
import { usePermisos, useSesion } from '../hooks'
import { construirCsvDashboard } from '../modules/dashboard/csv'
import { tiposOperacionPermitidos, widgetVisibleParaRol } from '../modules/dashboard/widgets'
import { useERPStore } from '../store'
import { antiguedadCxC, antiguedadCxP, bandejaAcciones, cuentasPorCobrar, cuentasPorPagar, cuentasPorVencer, embudoPedidos, flujoCaja, operacionesRecientes, rotacionInventario, serieVentasCompras, stockCritico, topClientes, topProductos, utilidadDelMes, ventasDelMes, ventasPorCategoria, comprasDelMes } from '../store/selectors/dashboard/index'
import type { AccionPermiso, RecursoSistema } from '../types'
import type { DistribucionCuentas, PeriodoDashboard, RangoDashboard, ResumenCuentas } from '../store/selectors/dashboard/index'

const money = (value: number) => `S/ ${value.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`

function barras(values: number[]): number[] {
  const max = Math.max(1, ...values)
  return values.map((value) => (value / max) * 100)
}

function Delta({ value }: { value: number }) {
  return <span className={value >= 0 ? 'text-success' : 'text-danger'}>{value >= 0 ? '+' : ''}{value.toFixed(1)}% vs. mes anterior</span>
}

function AgingBar({ distribucion }: { distribucion: DistribucionCuentas }) {
  const total = Object.values(distribucion).reduce((sum, value) => sum + value, 0)
  if (total === 0) return <div className="h-2 rounded-full bg-surface-muted" />
  return <div className="flex h-2 overflow-hidden rounded-full bg-surface-muted" aria-label="Distribución por antigüedad">{(['Vigente', '1-30', '31-60', '+60'] as const).map((tramo, index) => <span key={tramo} className={index === 0 ? 'bg-success' : index === 1 ? 'bg-warning' : index === 2 ? 'bg-warning/70' : 'bg-danger'} style={{ width: `${(distribucion[tramo] / total) * 100}%` }} />)}</div>
}

function AccountSummary({ title, summary, href }: { title: string; summary: ResumenCuentas; href: string }) {
  return <section className="rounded-xl bg-surface p-4"><div className="flex items-start justify-between gap-4"><div><h2 className="text-sm font-semibold text-text">{title}</h2><p className="mt-2 text-xl font-semibold tabular-nums text-text">{money(summary.totalPendiente)}</p><p className="mt-1 text-xs text-text-muted">{summary.cantidad} cuentas · {summary.cantidadVencidas} vencidas</p></div><Link to={href} className="text-xs font-medium text-accent hover:text-accent-hover">Ver detalle</Link></div><div className="mt-4"><AgingBar distribucion={summary.distribucion} /><div className="mt-2 grid grid-cols-4 gap-2 text-[10px] text-text-muted"><span>Vigente</span><span>1–30</span><span>31–60</span><span>+60</span></div></div></section>
}

function agingItems(franjas: readonly { tramo: string; monto: number; cantidad: number }[]): StackedBarItem[] {
  const tones: StackedBarItem['tone'][] = ['success', 'warning-soft', 'warning', 'danger']
  return franjas.map((franja, index) => ({ label: franja.tramo, value: franja.monto, count: franja.cantidad, tone: tones[index] ?? 'warning-soft' }))
}

function ActionInbox({ actions, can }: { actions: ReturnType<typeof bandejaAcciones>; can: (recurso: RecursoSistema, accion: AccionPermiso) => boolean }) {
  const visibleActions = actions.filter((action) => can(action.recurso, action.accion))
  return <section className="min-w-0 rounded-xl bg-surface p-4"><div className="flex items-start justify-between gap-4"><div><h2 className="text-sm font-semibold text-text">Bandeja de acciones</h2><p className="mt-1 text-xs text-text-muted">Pendientes que requieren tu atención.</p></div><StatusPill label={`${visibleActions.length} tipos`} tone={visibleActions.length ? 'accent' : 'neutral'} /></div>{visibleActions.length ? <div className="mt-3 grid gap-1 sm:grid-cols-2">{visibleActions.map((action) => <Link key={action.id} to={action.ruta} className="flex min-w-0 items-center justify-between gap-3 rounded-lg px-2.5 py-2.5 transition-colors hover:bg-surface-muted focus-visible:ring-3 focus-visible:ring-accent-soft"><span className="min-w-0"><span className="block truncate text-sm font-medium text-text">{action.titulo}</span><span className="mt-0.5 block truncate text-xs text-text-muted">{action.recurso} · {action.accion}</span></span><StatusPill label={String(action.cantidad)} tone={action.severidad === 'urgente' ? 'danger' : action.severidad === 'aviso' ? 'warning' : 'accent'} /></Link>)}</div> : <EmptyState title="Todo al día" description="No hay acciones pendientes para tu perfil." />}</section>
}

function descargarCsv(contenido: string) {
  const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = 'dashboard-enterprisecloud.csv'
  enlace.click()
  URL.revokeObjectURL(url)
}

export function DashboardPage() {
  const state = useERPStore()
  const navigate = useNavigate()
  const { usuario, rol } = useSesion()
  const { puede } = usePermisos()
  const [periodo, setPeriodo] = useState<PeriodoDashboard>('mensual')
  const [rango, setRango] = useState<RangoDashboard>('12meses')
  const fechaReferencia = state.fechaReferencia
  const visible = (widget: Parameters<typeof widgetVisibleParaRol>[1]) => widgetVisibleParaRol(rol, widget, state)
  const dashboard = useMemo(() => {
    const ventas = ventasDelMes(state, fechaReferencia)
    const compras = comprasDelMes(state, fechaReferencia)
    const utilidad = utilidadDelMes(state, fechaReferencia)
    const serie = serieVentasCompras(state, fechaReferencia, periodo)
    const periodoGraficos = rango === 'mes' ? 'mes' as const : rango === '3meses' ? 'trimestre' as const : '12meses' as const
    return {
      ventas,
      compras,
      utilidad,
      cxc: cuentasPorCobrar(state, fechaReferencia),
      cxp: cuentasPorPagar(state, fechaReferencia),
      rotacion: rotacionInventario(state, fechaReferencia),
      serie,
      categorias: ventasPorCategoria(state, fechaReferencia, rango),
      critico: stockCritico(state, 5),
      porVencer: cuentasPorVencer(state, fechaReferencia, 5),
      operaciones: operacionesRecientes(state, 8, rol ? tiposOperacionPermitidos(rol, state) : []),
      flujo: flujoCaja(state, periodoGraficos),
      embudo: embudoPedidos(state, periodoGraficos),
      clientes: topClientes(state, periodoGraficos),
      productos: topProductos(state, periodoGraficos),
      agingCxc: antiguedadCxC(state, periodoGraficos),
      agingCxp: antiguedadCxP(state, periodoGraficos),
      acciones: bandejaAcciones(state),
    }
  }, [state, fechaReferencia, periodo, rango, rol])

  const exportar = () => descargarCsv(construirCsvDashboard({ ventas: dashboard.ventas, compras: dashboard.compras, utilidad: dashboard.utilidad, stockCritico: selectCriticalCount(state), serieMensual: serieVentasCompras(state, fechaReferencia, 'mensual') }))
  const nombre = usuario?.nombres ?? 'equipo'
  const criticalCount = selectCriticalCount(state)

  return <>
    <PageHeader title={`Buenos días, ${nombre}`} description="Resumen operativo de EnterpriseCloud." actions={puede('Dashboard', 'exportar') ? <Button variant="secondary" leadingIcon={Download} onClick={exportar}>Exportar CSV</Button> : undefined} />
    <PageContent>
      <div className="space-y-6">
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {visible('ventasMes') ? <KpiCard label="Ventas del mes" value={money(dashboard.ventas.importe)} subtitle={<Delta value={dashboard.ventas.deltaPorcentaje} />} delta={dashboard.ventas.deltaPorcentaje} bars={barras(dashboard.serie.map((punto) => punto.ventas))} icon={Receipt} /> : null}
          {visible('comprasMes') ? <KpiCard label="Compras del mes" value={money(dashboard.compras.importe)} subtitle={<Delta value={dashboard.compras.deltaPorcentaje} />} delta={dashboard.compras.deltaPorcentaje} bars={barras(dashboard.serie.map((punto) => punto.compras))} icon={PackageSearch} tone="neutral" /> : null}
          {visible('utilidadBruta') ? <KpiCard label="Utilidad bruta (sin IGV)" value={money(dashboard.utilidad.importe)} subtitle={<Delta value={dashboard.utilidad.deltaPorcentaje} />} delta={dashboard.utilidad.deltaPorcentaje} icon={TrendingUp} tone="success" /> : null}
          {visible('stockCritico') ? <KpiCard label="Productos con stock crítico" value={String(criticalCount)} subtitle="Stock disponible bajo mínimo" icon={WalletCards} tone="warning" /> : null}
        </section>

        <section className="grid gap-3 lg:grid-cols-3">
          {visible('cuentasPorCobrar') ? <AccountSummary title="Cuentas por cobrar" summary={dashboard.cxc} href="/finanzas/cuentas-cobrar" /> : null}
          {visible('cuentasPorPagar') ? <AccountSummary title="Cuentas por pagar" summary={dashboard.cxp} href="/finanzas/cuentas-pagar" /> : null}
          {visible('rotacionInventario') ? <section className="rounded-xl bg-surface p-5"><h2 className="text-sm font-semibold text-text">Rotación de inventario</h2><p className="mt-3 text-3xl font-semibold tabular-nums text-text">{dashboard.rotacion.toFixed(2)}<span className="ml-1 text-sm font-normal text-text-muted">veces/año</span></p><p className="mt-2 text-xs text-text-muted">Costo de ventas de los últimos 12 meses.</p><Link to="/inventario/kardex" className="mt-5 inline-block text-xs font-medium text-accent hover:text-accent-hover">Ver Kardex</Link></section> : null}
        </section>

        {visible('bandejaAcciones') ? <ActionInbox actions={dashboard.acciones} can={puede} /> : null}

        <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(420px,1fr)]">
          {visible('serieVentas') ? <div className="min-w-0"><SalesPurchasesBarChart data={dashboard.serie} periodo={periodo} onPeriodoChange={setPeriodo} mostrarCompras={visible('serieCompras')} /></div> : null}
          {visible('ventasPorCategoria') ? <BarChart data={dashboard.categorias} rango={rango} onRangoChange={setRango} /> : null}
        </section>

        <section className="grid min-w-0 gap-4 xl:grid-cols-2">
          {visible('flujoCaja') ? <section className="min-w-0 space-y-3"><LineChart data={dashboard.flujo.puntos.map((punto) => ({ label: punto.etiqueta, value: punto.ingresos, secondary: punto.egresos }))} title="Flujo de caja" subtitle="Ingresos y egresos del periodo" valueLabel="Ingresos" secondaryLabel="Egresos" /><div className="flex flex-wrap gap-4 px-1 text-xs text-text-muted"><span>Caja <strong className="tabular-nums text-text">{money(dashboard.flujo.saldoCajaActual)}</strong></span><span>Bancos <strong className="tabular-nums text-text">{money(dashboard.flujo.saldoBancosActual)}</strong></span></div></section> : null}
          {visible('embudoPedidos') ? <FunnelSteps data={dashboard.embudo.map((paso): FunnelStep => ({ label: paso.paso.replace('Pedidos ', ''), count: paso.cantidad, amount: paso.monto, conversion: paso.porcentajeConversion }))} title="Embudo de pedidos" /> : null}
        </section>

        <section className="grid min-w-0 gap-4 xl:grid-cols-2">
          {visible('topClientes') ? <RankingBars data={dashboard.clientes.map((cliente) => ({ label: cliente.nombre, value: cliente.monto, detail: `${cliente.porcentaje}% del periodo` }))} title="Top clientes" /> : null}
          {visible('topProductos') ? <RankingBars data={dashboard.productos.map((producto) => ({ label: producto.nombre, value: producto.monto, detail: `${producto.unidades} unidades · ${producto.porcentaje}% del periodo` }))} title="Top productos" /> : null}
        </section>

        <section className="grid min-w-0 gap-4 xl:grid-cols-2">
          {visible('antiguedadCxC') ? <StackedBar data={agingItems(dashboard.agingCxc.franjas)} title="Antigüedad de CxC" /> : null}
          {visible('antiguedadCxP') ? <StackedBar data={agingItems(dashboard.agingCxp.franjas)} title="Antigüedad de CxP" /> : null}
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          {visible('stockCritico') ? <section className="rounded-xl bg-surface p-5"><div className="flex items-start justify-between gap-4"><div><h2 className="text-sm font-semibold text-text">Stock crítico</h2><p className="mt-1 text-xs text-text-muted">Productos con disponibilidad bajo mínimo.</p></div><Link to="/inventario/productos" className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:text-accent-hover">Ver todos <ExternalLink size={13} strokeWidth={1.5} /></Link></div>{dashboard.critico.length ? <div className="mt-5 divide-y divide-border/70">{dashboard.critico.map((item) => <div key={item.productoId} className="flex items-center justify-between gap-4 py-3 first:pt-0"><div className="min-w-0"><p className="truncate text-sm font-medium text-text">{item.nombre}</p><p className="mt-1 text-xs text-text-muted">{item.almacenNombre} · mínimo {item.minimo}</p></div><span className="shrink-0 text-sm font-semibold tabular-nums text-warning">{item.stockDisponible}</span></div>)}</div> : <EmptyState title="Sin productos críticos" description="El stock disponible está sobre el mínimo." />}{puede('Solicitudes de compra', 'crear') ? <Button className="mt-4" variant="secondary" size="sm" onClick={() => navigate('/compras/solicitudes')}>Generar solicitud</Button> : null}</section> : null}
          {visible('cuentasPorVencer') ? <section className="rounded-xl bg-surface p-5"><div className="flex items-start justify-between gap-4"><div><h2 className="text-sm font-semibold text-text">Cuentas por vencer</h2><p className="mt-1 text-xs text-text-muted">Vencidas o próximas a vencer en 7 días.</p></div><Link to="/finanzas/cuentas-cobrar" className="text-xs font-medium text-accent hover:text-accent-hover">Ver cuentas</Link></div>{dashboard.porVencer.length ? <div className="mt-5 divide-y divide-border/70">{dashboard.porVencer.map((cuenta) => <div key={cuenta.cuentaId} className="flex items-center justify-between gap-4 py-3 first:pt-0"><div className="min-w-0"><p className="truncate text-sm font-medium text-text">{cuenta.cliente}</p><p className="mt-1 text-xs text-text-muted">{cuenta.documento} · vence {cuenta.fechaVencimiento}</p></div><div className="shrink-0 text-right"><p className="text-sm font-semibold tabular-nums text-text">{money(cuenta.saldo)}</p><p className={cuenta.diasParaVencer < 0 ? 'mt-1 text-xs text-danger' : 'mt-1 text-xs text-warning'}>{cuenta.diasParaVencer < 0 ? `Vencida hace ${Math.abs(cuenta.diasParaVencer)} días` : `Vence en ${cuenta.diasParaVencer} días`}</p></div></div>)}</div> : <EmptyState title="Sin cuentas próximas" description="No hay cuentas vencidas o próximas a vencer." />}</section> : null}
        </section>

        {visible('operacionesRecientes') ? <section className="rounded-xl bg-surface p-5"><div className="flex items-center justify-between"><div><h2 className="text-sm font-semibold text-text">Operaciones recientes</h2><p className="mt-1 text-xs text-text-muted">Actividad según tus permisos.</p></div></div>{dashboard.operaciones.length ? <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="text-xs text-text-muted"><tr><th className="pb-3 font-medium">Tipo</th><th className="pb-3 font-medium">Documento</th><th className="pb-3 font-medium">Tercero</th><th className="pb-3 text-right font-medium">Monto</th><th className="pb-3 text-right font-medium">Fecha</th></tr></thead><tbody className="divide-y divide-border/70">{dashboard.operaciones.map((operacion, index) => <tr key={operacion.id} className={index === dashboard.operaciones.length - 1 ? 'text-sm text-text-soft opacity-50' : 'text-sm text-text-soft'}><td className="py-3">{operacion.tipo}</td><td className="py-3 font-medium text-text">{operacion.documento}</td><td className="max-w-56 truncate py-3">{operacion.tercero}</td><td className="py-3 text-right tabular-nums">{money(operacion.monto)}</td><td className="py-3 text-right tabular-nums">{operacion.fecha}</td></tr>)}</tbody></table></div> : <EmptyState title="Sin operaciones recientes" description="Las operaciones visibles aparecerán aquí." />}</section> : null}
      </div>
    </PageContent>
  </>
}

function selectCriticalCount(state: Parameters<typeof stockCritico>[0]): number {
  return stockCritico(state, Number.MAX_SAFE_INTEGER).length
}
