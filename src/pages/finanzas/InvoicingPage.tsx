import { ArrowUpRight, Eye, FileText } from 'lucide-react'
import { useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import { useNavigate } from 'react-router-dom'
import { DataTable, type DataTableColumn } from '../../components/data-display/DataTable'
import { PageContent, PageHeader } from '../../components/layout/PageLayout'
import { Dropdown, Modal, Select, StatusPill } from '../../components/ui'
import { useERPStore } from '../../store'
import { selectTotalCompra, selectTotalVenta } from '../../store/selectors'
import type { Comprobante, EstadoComprobante, TipoComprobante } from '../../types'

type SourceFilter = 'todos' | 'Ventas' | 'Compras'
type TypeFilter = 'todos' | TipoComprobante
type StatusFilter = 'todos' | EstadoComprobante

const date = (value: string) => new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium' }).format(new Date(`${value}T12:00:00Z`))
const money = (value: number) => `S/ ${Math.abs(value).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const source = (comprobante: Comprobante): 'Ventas' | 'Compras' => 'compraId' in comprobante && comprobante.compraId ? 'Compras' : 'Ventas'
const amount = (state: ReturnType<typeof useERPStore.getState>, comprobante: Comprobante) => {
  const total = 'compraId' in comprobante && comprobante.compraId ? selectTotalCompra(state, comprobante.compraId) : 'ventaId' in comprobante && comprobante.ventaId ? selectTotalVenta(state, comprobante.ventaId) : 0
  return comprobante.tipo === 'Nota de crédito' ? -total : total
}
const typeTone = (type: TipoComprobante) => type === 'Nota de crédito' ? 'danger' as const : type === 'Factura' ? 'accent' as const : 'neutral' as const

function partyName(state: ReturnType<typeof useERPStore.getState>, comprobante: Comprobante): string {
  if ('compraId' in comprobante && comprobante.compraId) return state.proveedores.find((item) => item.id === comprobante.proveedorId)?.razonSocial ?? 'Proveedor no encontrado'
  return state.clientes.find((item) => item.id === comprobante.clienteId)?.razonSocial ?? 'Cliente no encontrado'
}

function originNumber(state: ReturnType<typeof useERPStore.getState>, comprobante: Comprobante): string {
  if ('compraId' in comprobante && comprobante.compraId) return state.compras.find((item) => item.id === comprobante.compraId)?.numero ?? comprobante.compraId
  if ('ventaId' in comprobante && comprobante.ventaId) return state.ventas.find((item) => item.id === comprobante.ventaId)?.numero ?? comprobante.ventaId
  return 'Sin origen'
}

function sourcePath(state: ReturnType<typeof useERPStore.getState>, comprobante: Comprobante): string | undefined {
  if ('ventaId' in comprobante && comprobante.ventaId) return `/comercial/ventas/${comprobante.ventaId}`
  if ('compraId' in comprobante && comprobante.compraId) {
    const compra = state.compras.find((item) => item.id === comprobante.compraId)
    return compra?.ordenCompraId ? `/inventario/recepciones/${compra.ordenCompraId}` : undefined
  }
  return undefined
}

function invoiceColumns(state: ReturnType<typeof useERPStore.getState>, onPreview: (comprobante: Comprobante) => void, onOpenSource: (comprobante: Comprobante) => void): DataTableColumn<Comprobante>[] {
  return [
    { key: 'document', header: 'Comprobante', sortable: true, sortValue: (row) => `${row.serie}-${row.numero}`, render: (row) => <div><span className="block font-medium text-text">{row.serie}-{row.numero}</span><span className="mt-0.5 block text-xs text-text-muted">{date(row.fechaEmision)}</span></div> },
    { key: 'type', header: 'Tipo', sortable: true, sortValue: (row) => row.tipo, render: (row) => <StatusPill label={row.tipo} tone={typeTone(row.tipo)} /> },
    { key: 'party', header: 'Cliente / proveedor', sortable: true, sortValue: (row) => partyName(state, row), render: (row) => <div><span className="block truncate font-medium text-text">{partyName(state, row)}</span><span className="mt-0.5 block text-xs text-text-muted">{source(row)}</span></div> },
    { key: 'origin', header: 'Origen', hideOnMobile: true, sortable: true, sortValue: (row) => originNumber(state, row), render: (row) => <span className="text-text-soft">{originNumber(state, row)}</span> },
    { key: 'amount', header: 'Importe', align: 'right', sortable: true, sortValue: (row) => amount(state, row), render: (row) => <span className={row.tipo === 'Nota de crédito' ? 'font-semibold tabular-nums text-danger' : 'font-semibold tabular-nums text-text'}>{row.tipo === 'Nota de crédito' ? '−' : ''} {money(amount(state, row))}</span> },
    { key: 'status', header: 'Estado', sortable: true, sortValue: (row) => row.estado, render: (row) => <StatusPill label={row.estado} tone={row.estado === 'Emitido' ? 'success' : 'danger'} /> },
    { key: 'actions', header: '', align: 'right', render: (row) => <Dropdown items={[{ label: 'Vista previa', icon: Eye, onSelect: () => onPreview(row) }, ...(sourcePath(state, row) ? [{ label: source(row) === 'Ventas' ? 'Ver venta' : 'Ver recepción', icon: ArrowUpRight, onSelect: () => onOpenSource(row) }] : [])]} /> },
  ]
}

function ComprobantePreview({ state, comprobante }: { state: ReturnType<typeof useERPStore.getState>; comprobante: Comprobante }) {
  const isPurchase = 'compraId' in comprobante && Boolean(comprobante.compraId)
  const sale = !isPurchase && 'ventaId' in comprobante ? state.ventas.find((item) => item.id === comprobante.ventaId) : undefined
  const purchase = isPurchase && 'compraId' in comprobante ? state.compras.find((item) => item.id === comprobante.compraId) : undefined
  const details = sale ? state.detallesVenta.filter((item) => sale.detalleIds.includes(item.id)).map((item) => ({ id: item.id, description: item.descripcionProducto, quantity: item.cantidad, unitPrice: item.precioUnitario, total: (item.cantidad * item.precioUnitario - item.descuento) * (1 + item.tasaImpuesto) })) : purchase ? state.detallesCompra.filter((item) => purchase.detalleIds.includes(item.id)).map((item) => ({ id: item.id, description: item.descripcionProducto, quantity: item.cantidad, unitPrice: item.costoUnitario, total: item.cantidad * item.costoUnitario * (1 + item.tasaImpuesto) })) : []
  const total = sale ? selectTotalVenta(state, sale.id) : purchase ? selectTotalCompra(state, purchase.id) : 0
  const party = sale ? state.clientes.find((item) => item.id === sale.clienteId)?.razonSocial : purchase ? state.proveedores.find((item) => item.id === purchase.proveedorId)?.razonSocial : undefined
  const title = comprobante.tipo === 'Nota de crédito' ? 'NOTA DE CRÉDITO' : comprobante.tipo === 'Boleta' ? 'BOLETA DE VENTA' : isPurchase ? 'FACTURA DE COMPRA' : 'FACTURA DE VENTA'
  const displayTotal = comprobante.tipo === 'Nota de crédito' ? -total : total
  return <div className="rounded-xl bg-surface-muted p-3 sm:p-6"><article className="mx-auto max-w-2xl bg-surface p-5 ring-1 ring-border/70 sm:p-8"><header className="flex flex-wrap items-start justify-between gap-6 border-b border-border pb-6"><div><p className="text-lg font-semibold tracking-tight text-text">{state.configuracion.datosEmpresa.nombreComercial ?? state.configuracion.datosEmpresa.razonSocial}</p><p className="mt-1 text-xs leading-5 text-text-muted">{state.configuracion.datosEmpresa.razonSocial} · {state.configuracion.datosEmpresa.tipoDocumento} {state.configuracion.datosEmpresa.numeroDocumento}<br />{state.configuracion.datosEmpresa.direccion}</p></div><div className="min-w-44 rounded-xl border border-border p-4 text-center"><p className="text-[10px] font-semibold tracking-[0.18em] text-text-muted">{title}</p><p className="mt-2 text-base font-semibold tabular-nums text-text">{comprobante.serie}-{comprobante.numero}</p><p className="mt-1 text-xs text-text-muted">{date(comprobante.fechaEmision)} · PEN</p></div></header><div className="grid gap-4 border-b border-border py-5 text-sm sm:grid-cols-2"><div><p className="text-xs text-text-muted">{isPurchase ? 'Proveedor' : 'Cliente'}</p><p className="mt-1 font-medium text-text">{party ?? 'Entidad no encontrada'}</p></div><div className="sm:text-right"><p className="text-xs text-text-muted">Estado</p><p className="mt-1 font-medium text-text">{comprobante.estado}</p></div></div><div className="mt-5 overflow-hidden rounded-xl border border-border/70"><div className="grid grid-cols-[minmax(0,1fr)_5rem_7rem_7rem] gap-2 bg-surface-muted px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-text-muted"><span>Descripción</span><span className="text-right">Cant.</span><span className="text-right">P. unit.</span><span className="text-right">Importe</span></div>{details.map((item) => <div key={item.id} className="grid grid-cols-[minmax(0,1fr)_5rem_7rem_7rem] gap-2 border-t border-border/60 px-3 py-3 text-xs text-text-soft"><span className="min-w-0 truncate">{item.description}</span><span className="text-right tabular-nums">{item.quantity}</span><span className="text-right tabular-nums">{money(item.unitPrice)}</span><span className="text-right font-medium tabular-nums">{money(item.total)}</span></div>)}</div>{comprobante.tipo === 'Nota de crédito' && 'motivo' in comprobante ? <p className="mt-5 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">Motivo: {comprobante.motivo}</p> : null}<div className="mt-6 flex justify-end border-t border-border pt-5"><div className="flex min-w-56 items-center justify-between gap-8"><span className="text-sm font-medium text-text">Total</span><span className={comprobante.tipo === 'Nota de crédito' ? 'text-lg font-semibold tabular-nums text-danger' : 'text-lg font-semibold tabular-nums text-text'}>{money(displayTotal)}</span></div></div></article></div>
}

export function InvoicingPage() {
  const state = useERPStore()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('todos')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('todos')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos')
  const [preview, setPreview] = useState<Comprobante | null>(null)
  const rows = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return state.comprobantes.filter((comprobante) => {
      const matchesQuery = !normalized || [comprobante.serie, comprobante.numero, comprobante.tipo, partyName(state, comprobante), originNumber(state, comprobante)].some((value) => value.toLowerCase().includes(normalized))
      return matchesQuery && (sourceFilter === 'todos' || source(comprobante) === sourceFilter) && (typeFilter === 'todos' || comprobante.tipo === typeFilter) && (statusFilter === 'todos' || comprobante.estado === statusFilter)
    }).sort((a, b) => b.fechaEmision.localeCompare(a.fechaEmision))
  }, [query, sourceFilter, state, statusFilter, typeFilter])
  const totalEmitido = rows.filter((comprobante) => comprobante.estado === 'Emitido').reduce((total, comprobante) => total + amount(state, comprobante), 0)
  const notes = rows.filter((comprobante) => comprobante.tipo === 'Nota de crédito').length

  const resetPage = <T,>(setter: Dispatch<SetStateAction<T>>, value: T) => { setter(value); setPage(1) }

  return <>
    <PageHeader title="Comprobantes" description="Consulta de comprobantes de ventas, compras y notas de crédito." />
    <PageContent>
      <div className="mb-6 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-accent-soft px-4 py-3"><p className="text-xs text-accent">Comprobantes emitidos</p><p className="mt-1 text-xl font-semibold tabular-nums text-text">{rows.filter((comprobante) => comprobante.estado === 'Emitido').length}</p></div><div className="rounded-xl bg-surface-muted px-4 py-3"><p className="text-xs text-text-muted">Importe neto mostrado</p><p className="mt-1 text-xl font-semibold tabular-nums text-text">{money(totalEmitido)}</p></div><div className="rounded-xl bg-danger-soft px-4 py-3"><p className="text-xs text-danger">Notas de crédito</p><p className="mt-1 text-xl font-semibold tabular-nums text-danger">{notes}</p></div></div>
      <div className="mb-5 flex items-center gap-3 rounded-xl bg-surface-muted px-4 py-3 text-sm text-text-soft"><FileText size={17} strokeWidth={1.5} className="text-text-muted" /><span>{state.comprobantes.length} comprobantes registrados</span><span className="hidden text-xs text-text-muted sm:block">Los comprobantes se generan desde ventas y compras.</span></div>
      <DataTable rows={rows} columns={invoiceColumns(state, setPreview, (comprobante) => { const path = sourcePath(state, comprobante); if (path) navigate(path) })} getRowId={(row) => row.id} selectedIds={selectedIds} onSelectedIdsChange={setSelectedIds} searchValue={query} onSearchChange={(value) => { setQuery(value); setPage(1) }} page={page} pageSize={10} onPageChange={setPage} totalCount={rows.length} responsive showSelectionSummary={false} toolbarActions={<div className="flex flex-wrap gap-2"><Select aria-label="Filtrar por origen" value={sourceFilter} onChange={(event) => resetPage(setSourceFilter, event.target.value as SourceFilter)} className="w-32"><option value="todos">Todo origen</option><option value="Ventas">Ventas</option><option value="Compras">Compras</option></Select><Select aria-label="Filtrar por tipo" value={typeFilter} onChange={(event) => resetPage(setTypeFilter, event.target.value as TypeFilter)} className="w-36"><option value="todos">Todo tipo</option><option value="Factura">Facturas</option><option value="Boleta">Boletas</option><option value="Nota de crédito">Notas de crédito</option></Select><Select aria-label="Filtrar por estado" value={statusFilter} onChange={(event) => resetPage(setStatusFilter, event.target.value as StatusFilter)} className="w-32"><option value="todos">Todo estado</option><option value="Emitido">Emitidos</option><option value="Anulado">Anulados</option></Select></div>} emptyTitle="No encontramos comprobantes" emptyDescription="Los comprobantes aparecerán cuando se facture una venta o una compra." />
    </PageContent>
    <Modal open={Boolean(preview)} title={preview ? `Vista previa · ${preview.serie}-${preview.numero}` : 'Vista previa'} size="lg" onClose={() => setPreview(null)}>{preview ? <ComprobantePreview state={state} comprobante={preview} /> : null}</Modal>
  </>
}
