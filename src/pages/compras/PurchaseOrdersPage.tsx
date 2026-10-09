import { ArrowRight, CalendarDays, Check, ClipboardCheck, Plus, ReceiptText, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DataTable, type DataTableColumn } from '../../components/data-display/DataTable'
import { PageContent, PageHeader } from '../../components/layout/PageLayout'
import { Button, Drawer, Dropdown, Input, Select, StatusPill, Toast } from '../../components/ui'
import { usePermisos } from '../../hooks'
import { useERPStore } from '../../store'
import { selectEstadoOrdenCompra } from '../../store/selectors'
import type { EstadoOrdenCompra, OrdenCompra } from '../../types'

type OrderLine = { productoId: string; cantidad: number; costoUnitario: number }
type ToastState = { message: string; tone: 'success' | 'danger' }

const date = (value: string) => new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
const statusTone = (status: EstadoOrdenCompra) => status === 'Atendida' ? 'success' as const : status === 'Anulada' ? 'danger' as const : status === 'Parcial' ? 'warning' as const : 'neutral' as const

function orderColumns(state: ReturnType<typeof useERPStore.getState>, onEmit: (id: string) => void, onDetail: (id: string) => void, onReceipt: (id: string) => void, canEmit: boolean): DataTableColumn<OrdenCompra>[] {
  return [
    { key: 'order', header: 'Orden', sortable: true, sortValue: (row) => row.numero, render: (row) => <div><span className="block font-medium text-text">{row.numero}</span><span className="mt-0.5 block text-xs text-text-muted">{date(row.fecha)}</span></div> },
    { key: 'supplier', header: 'Proveedor', sortable: true, sortValue: (row) => state.proveedores.find((item) => item.id === row.proveedorId)?.razonSocial ?? '', render: (row) => state.proveedores.find((item) => item.id === row.proveedorId)?.razonSocial ?? 'No encontrado' },
    { key: 'warehouse', header: 'Destino', hideOnMobile: true, sortable: true, sortValue: (row) => state.almacenes.find((item) => item.id === row.almacenDestinoId)?.nombre ?? '', render: (row) => state.almacenes.find((item) => item.id === row.almacenDestinoId)?.nombre ?? 'No encontrado' },
    { key: 'items', header: 'Líneas', align: 'right', sortable: true, sortValue: (row) => row.items.length, render: (row) => <span className="tabular-nums">{row.items.length}</span> },
    { key: 'delivery', header: 'Entrega', hideOnMobile: true, sortable: true, sortValue: (row) => row.fechaEntregaEsperada ?? '', render: (row) => row.fechaEntregaEsperada ? <span className="inline-flex items-center gap-1.5 whitespace-nowrap"><CalendarDays size={14} strokeWidth={1.5} className="text-text-muted" />{date(row.fechaEntregaEsperada)}</span> : 'Sin fecha' },
    { key: 'status', header: 'Estado', sortable: true, sortValue: (row) => selectEstadoOrdenCompra(state, row.id), render: (row) => { const status = selectEstadoOrdenCompra(state, row.id); return <StatusPill label={status} tone={statusTone(status)} /> } },
    { key: 'actions', header: '', align: 'right', render: (row) => { const status = selectEstadoOrdenCompra(state, row.id); const hasPurchase = state.compras.some((purchase) => purchase.ordenCompraId === row.id); const items = [{ label: 'Ver detalle', icon: ArrowRight, onSelect: () => onDetail(row.id) }]; if (status === 'Borrador' && canEmit) items.push({ label: 'Emitir orden', icon: Check, onSelect: () => onEmit(row.id) }); if (hasPurchase && status !== 'Borrador') items.push({ label: 'Ver recepción', icon: ReceiptText, onSelect: () => onReceipt(row.id) }); return <Dropdown items={items} /> } },
  ]
}

export function PurchaseOrdersPage() {
  const state = useERPStore()
  const navigate = useNavigate()
  const { puede } = usePermisos()
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [statusFilter, setStatusFilter] = useState<'todos' | EstadoOrdenCompra>('todos')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [requestId, setRequestId] = useState('')
  const [supplierId, setSupplierId] = useState(state.proveedores[0]?.id ?? '')
  const [warehouseId, setWarehouseId] = useState(state.almacenes[0]?.id ?? '')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [lines, setLines] = useState<OrderLine[]>([{ productoId: state.productos[0]?.id ?? '', cantidad: 1, costoUnitario: state.productos[0]?.costoReferencial ?? 0 }])
  const canCreate = puede('Órdenes de compra', 'crear')
  const canEmit = puede('Órdenes de compra', 'aprobar')
  const approvedRequests = useMemo(() => state.solicitudesCompra.filter((request) => request.estado === 'Aprobada'), [state.solicitudesCompra])

  const rows = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return state.ordenesCompra.filter((order) => {
      const status = selectEstadoOrdenCompra(state, order.id)
      const matchesQuery = !normalized || [order.numero, status, state.proveedores.find((item) => item.id === order.proveedorId)?.razonSocial, state.almacenes.find((item) => item.id === order.almacenDestinoId)?.nombre].some((value) => value?.toLowerCase().includes(normalized))
      return matchesQuery && (statusFilter === 'todos' || status === statusFilter)
    })
  }, [query, state, statusFilter])

  const resetStatus = (value: 'todos' | EstadoOrdenCompra) => {
    setStatusFilter(value)
    setPage(1)
  }

  useEffect(() => {
    const request = approvedRequests.find((item) => item.id === requestId)
    if (!request) return
    setWarehouseId(request.almacenDestinoId)
    setLines(request.items.map((item) => ({ productoId: item.productoId, cantidad: item.cantidadSolicitada, costoUnitario: state.productos.find((product) => product.id === item.productoId)?.costoReferencial ?? 0 })))
  }, [requestId, state.productos, approvedRequests])

  const notify = (result: { ok: true } | { ok: false; error: string }, successMessage: string) => {
    if (!result.ok) { setToast({ message: result.error, tone: 'danger' }); return false }
    setToast({ message: successMessage, tone: 'success' })
    return true
  }
  const closeDrawer = () => { setDrawerOpen(false); setRequestId(''); setDeliveryDate(''); setLines([{ productoId: state.productos[0]?.id ?? '', cantidad: 1, costoUnitario: state.productos[0]?.costoReferencial ?? 0 }]) }
  const create = () => {
    if (!state.usuarioActualId) return
    const result = state.crearOrdenCompra({ solicitudCompraId: requestId || undefined, proveedorId: supplierId, compradorUsuarioId: state.usuarioActualId, almacenDestinoId: warehouseId, items: lines, fechaEntregaEsperada: deliveryDate || undefined, usuarioId: state.usuarioActualId })
    if (notify(result, 'Orden creada en borrador.')) closeDrawer()
  }
  const emit = (id: string) => { if (state.usuarioActualId) notify(state.emitirOrdenCompra(id, state.usuarioActualId), 'Orden emitida y compra creada.') }
  const addLine = () => setLines((current) => [...current, { productoId: state.productos.find((product) => !current.some((line) => line.productoId === product.id))?.id ?? '', cantidad: 1, costoUnitario: 0 }])
  const updateLine = (index: number, changes: Partial<OrderLine>) => setLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, ...changes } : line))

  return <>
    <PageHeader title="Órdenes de compra" description="Compromisos de abastecimiento con proveedores existentes." actions={canCreate ? <Button leadingIcon={Plus} onClick={() => setDrawerOpen(true)}>Nueva orden</Button> : undefined} />
    <PageContent>
      <div className="mb-5 flex items-center gap-3 rounded-xl bg-surface-muted px-4 py-3 text-sm text-text-soft"><ClipboardCheck size={17} strokeWidth={1.5} className="text-text-muted" /><span>{state.ordenesCompra.length} órdenes registradas</span><span className="hidden text-xs text-text-muted sm:block">Al emitirla se crea la Compra asociada.</span></div>
      <DataTable rows={rows} columns={orderColumns(state, emit, (id) => navigate(`/compras/ordenes/${id}`), (id) => navigate(`/inventario/recepciones/${id}`), canEmit)} getRowId={(row) => row.id} selectedIds={selectedIds} onSelectedIdsChange={setSelectedIds} searchValue={query} onSearchChange={(value) => { setQuery(value); setPage(1) }} page={page} pageSize={10} onPageChange={setPage} totalCount={rows.length} responsive showSelectionSummary={false} toolbarActions={<Select aria-label="Filtrar órdenes por estado" value={statusFilter} onChange={(event) => resetStatus(event.target.value as 'todos' | EstadoOrdenCompra)} className="w-40"><option value="todos">Todos los estados</option>{(['Borrador', 'Ordenada', 'Parcial', 'Atendida', 'Anulada'] as EstadoOrdenCompra[]).map((status) => <option key={status} value={status}>{status}</option>)}</Select>} emptyTitle="No encontramos órdenes" emptyDescription="Crea una orden desde una solicitud aprobada o de forma directa." />
    </PageContent>
    <Drawer open={drawerOpen} title="Nueva orden de compra" onClose={closeDrawer}><div className="space-y-5"><p className="text-sm leading-6 text-text-muted">Una orden aprobada se convierte en Compra y queda lista para recepción.</p><Select label="Solicitud aprobada (opcional)" value={requestId} onChange={(event) => setRequestId(event.target.value)} options={[{ value: '', label: 'Sin solicitud vinculada' }, ...approvedRequests.map((request) => ({ value: request.id, label: `${request.numero} · ${request.items.length} líneas` }))]} /><div className="grid gap-4 sm:grid-cols-2"><Select label="Proveedor" value={supplierId} onChange={(event) => setSupplierId(event.target.value)} options={state.proveedores.filter((item) => item.estado === 'Activo').map((item) => ({ value: item.id, label: item.razonSocial }))} /><Select label="Almacén destino" value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)} options={state.almacenes.filter((item) => item.estado === 'Activo').map((item) => ({ value: item.id, label: item.nombre }))} /></div><Input label="Fecha esperada de entrega" type="date" value={deliveryDate} onChange={(event) => setDeliveryDate(event.target.value)} /><section><div className="flex items-center justify-between"><div><h3 className="text-sm font-semibold text-text">Líneas de la orden</h3><p className="mt-1 text-xs text-text-muted">El costo unitario se usa para valorar la recepción.</p></div><Button size="sm" variant="secondary" onClick={addLine}>Agregar línea</Button></div><div className="mt-4 space-y-3">{lines.map((line, index) => <div key={`${index}-${line.productoId}`} className="grid grid-cols-[minmax(0,1fr)_5rem_6rem_auto] items-end gap-2"><Select label={index === 0 ? 'Producto' : undefined} value={line.productoId} onChange={(event) => updateLine(index, { productoId: event.target.value })} className="min-w-0" options={state.productos.filter((product) => product.estado === 'Activo').map((product) => ({ value: product.id, label: `${product.nombre} · ${product.sku}` }))} /><Input label={index === 0 ? 'Cant.' : undefined} type="number" min="1" step="1" value={line.cantidad} onChange={(event) => updateLine(index, { cantidad: Number(event.target.value) })} /><Input label={index === 0 ? 'Costo' : undefined} type="number" min="0" step="0.01" value={line.costoUnitario} onChange={(event) => updateLine(index, { costoUnitario: Number(event.target.value) })} />{lines.length > 1 ? <Button aria-label="Quitar línea" variant="ghost" size="sm" onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))}><X size={16} strokeWidth={1.5} /></Button> : <span />}</div>)}</div></section><div className="flex justify-end gap-2 border-t border-border pt-5"><Button variant="secondary" onClick={closeDrawer}>Cancelar</Button><Button onClick={create}>Crear borrador</Button></div></div></Drawer>
    {toast ? <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} /> : null}
  </>
}
