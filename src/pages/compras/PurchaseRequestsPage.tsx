import { ArrowRight, Check, ClipboardList, Plus, Send, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DataTable, type DataTableColumn } from '../../components/data-display/DataTable'
import { PageContent, PageHeader } from '../../components/layout/PageLayout'
import { Button, Drawer, Dropdown, Input, Select, StatusPill, Toast } from '../../components/ui'
import { usePermisos } from '../../hooks'
import { useERPStore } from '../../store'
import { selectEstadoSolicitudCompra } from '../../store/selectors'
import type { EstadoSolicitudCompra, SolicitudCompra } from '../../types'

type RequestLine = { productoId: string; cantidadSolicitada: number; observacion?: string }
type ToastState = { message: string; tone: 'success' | 'danger' }

const date = (value: string) => new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
const statusTone = (status: EstadoSolicitudCompra) => status === 'Aprobada' || status === 'Atendida' ? 'success' as const : status === 'Anulada' ? 'danger' as const : status === 'Solicitada' ? 'warning' as const : 'neutral' as const

function requestColumns(state: ReturnType<typeof useERPStore.getState>, onRequest: (id: string) => void, onApprove: (id: string) => void, onOrder: (id: string) => void, canRequest: boolean, canApprove: boolean): DataTableColumn<SolicitudCompra>[] {
  return [
    { key: 'request', header: 'Solicitud', sortable: true, sortValue: (row) => row.numero, render: (row) => <div><span className="block font-medium text-text">{row.numero}</span><span className="mt-0.5 block text-xs text-text-muted">{date(row.fecha)}</span></div> },
    { key: 'warehouse', header: 'Almacén destino', sortable: true, sortValue: (row) => state.almacenes.find((item) => item.id === row.almacenDestinoId)?.nombre ?? '', render: (row) => state.almacenes.find((item) => item.id === row.almacenDestinoId)?.nombre ?? 'No encontrado' },
    { key: 'requester', header: 'Solicitante', hideOnMobile: true, sortable: true, sortValue: (row) => state.usuarios.find((item) => item.id === row.solicitanteUsuarioId)?.nombres ?? '', render: (row) => state.usuarios.find((item) => item.id === row.solicitanteUsuarioId)?.nombres ?? 'No encontrado' },
    { key: 'items', header: 'Líneas', align: 'right', sortable: true, sortValue: (row) => row.items.length, render: (row) => <span className="tabular-nums">{row.items.length}</span> },
    { key: 'status', header: 'Estado', sortable: true, sortValue: (row) => selectEstadoSolicitudCompra(state, row.id), render: (row) => { const status = selectEstadoSolicitudCompra(state, row.id); return <StatusPill label={status} tone={statusTone(status)} /> } },
    { key: 'actions', header: '', align: 'right', render: (row) => { const status = selectEstadoSolicitudCompra(state, row.id); const linkedOrder = state.ordenesCompra.find((order) => order.solicitudCompraId === row.id); const items = [...(canRequest && status === 'Borrador' ? [{ label: 'Enviar solicitud', icon: Send, onSelect: () => onRequest(row.id) }] : []), ...(canApprove && status === 'Solicitada' ? [{ label: 'Aprobar solicitud', icon: Check, onSelect: () => onApprove(row.id) }] : []), ...(linkedOrder ? [{ label: 'Ver orden de compra', icon: ArrowRight, onSelect: () => onOrder(linkedOrder.id) }] : [])]; return items.length ? <Dropdown items={items} /> : null } },
  ]
}

export function PurchaseRequestsPage() {
  const state = useERPStore()
  const navigate = useNavigate()
  const { puede } = usePermisos()
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [warehouseId, setWarehouseId] = useState(state.almacenes[0]?.id ?? '')
  const [reason, setReason] = useState('')
  const [lines, setLines] = useState<RequestLine[]>([{ productoId: state.productos[0]?.id ?? '', cantidadSolicitada: 1 }])
  const canCreate = puede('Solicitudes de compra', 'crear')
  const canRequest = puede('Solicitudes de compra', 'editar')
  const canApprove = puede('Solicitudes de compra', 'aprobar')

  const rows = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return state.solicitudesCompra.filter((request) => { const status = selectEstadoSolicitudCompra(state, request.id); return !normalized || [request.numero, status, state.almacenes.find((item) => item.id === request.almacenDestinoId)?.nombre, request.motivo].some((value) => value?.toLowerCase().includes(normalized)) })
  }, [query, state.almacenes, state.ordenesCompra, state.solicitudesCompra])

  const notify = (result: { ok: true } | { ok: false; error: string }, successMessage: string) => {
    if (!result.ok) { setToast({ message: result.error, tone: 'danger' }); return false }
    setToast({ message: successMessage, tone: 'success' })
    return true
  }
  const closeDrawer = () => { setDrawerOpen(false); setReason(''); setLines([{ productoId: state.productos[0]?.id ?? '', cantidadSolicitada: 1 }]) }
  const create = () => {
    if (!state.usuarioActualId) return
    const result = state.crearSolicitudCompra({ solicitanteUsuarioId: state.usuarioActualId, almacenDestinoId: warehouseId, items: lines, motivo: reason || undefined, usuarioId: state.usuarioActualId })
    if (notify(result, 'Solicitud creada en borrador.')) closeDrawer()
  }
  const request = (id: string) => { if (state.usuarioActualId) notify(state.solicitarCompra(id, state.usuarioActualId), 'Solicitud enviada para aprobación.') }
  const approve = (id: string) => { if (state.usuarioActualId) notify(state.aprobarSolicitudCompra(id, state.usuarioActualId), 'Solicitud aprobada.') }
  const addLine = () => setLines((current) => [...current, { productoId: state.productos.find((product) => !current.some((line) => line.productoId === product.id))?.id ?? '', cantidadSolicitada: 1 }])
  const updateLine = (index: number, changes: Partial<RequestLine>) => setLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, ...changes } : line))

  return <>
    <PageHeader title="Solicitudes de compra" description="Necesidades internas de abastecimiento antes de emitir una orden." actions={canCreate ? <Button leadingIcon={Plus} onClick={() => navigate('/compras/solicitudes/nueva')}>Nueva solicitud</Button> : undefined} />
    <PageContent>
      <div className="mb-5 flex items-center gap-3 rounded-xl bg-surface-muted px-4 py-3 text-sm text-text-soft"><ClipboardList size={17} strokeWidth={1.5} className="text-text-muted" /><span>{state.solicitudesCompra.length} solicitudes registradas</span><span className="hidden text-xs text-text-muted sm:block">Las solicitudes no cambian el stock.</span></div>
      <DataTable rows={rows} columns={requestColumns(state, request, approve, (id) => navigate(`/compras/ordenes/${id}`), canRequest, canApprove)} getRowId={(row) => row.id} selectedIds={selectedIds} onSelectedIdsChange={setSelectedIds} searchValue={query} onSearchChange={(value) => { setQuery(value); setPage(1) }} page={page} pageSize={10} onPageChange={setPage} totalCount={rows.length} responsive showSelectionSummary={false} emptyTitle="No encontramos solicitudes" emptyDescription="Crea una solicitud cuando necesites reponer inventario." />
    </PageContent>
    <Drawer open={drawerOpen} title="Nueva solicitud de compra" onClose={closeDrawer}><div className="space-y-5"><p className="text-sm leading-6 text-text-muted">Registra una necesidad de compra para que pueda revisarse antes de convertirla en una orden.</p><Select label="Almacén destino" value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)} options={state.almacenes.filter((item) => item.estado === 'Activo').map((item) => ({ value: item.id, label: item.nombre }))} /><Input label="Motivo" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Ej. Reposición por campaña" /><section><div className="flex items-center justify-between"><div><h3 className="text-sm font-semibold text-text">Productos solicitados</h3><p className="mt-1 text-xs text-text-muted">Indica cantidades mayores que cero.</p></div><Button size="sm" variant="secondary" onClick={addLine}>Agregar línea</Button></div><div className="mt-4 space-y-3">{lines.map((line, index) => <div key={`${index}-${line.productoId}`} className="flex items-end gap-2"><Select label={index === 0 ? 'Producto' : undefined} value={line.productoId} onChange={(event) => updateLine(index, { productoId: event.target.value })} className="min-w-0 flex-1" options={state.productos.filter((product) => product.estado === 'Activo').map((product) => ({ value: product.id, label: `${product.nombre} · ${product.sku}` }))} /><Input label={index === 0 ? 'Cantidad' : undefined} type="number" min="1" step="1" value={line.cantidadSolicitada} onChange={(event) => updateLine(index, { cantidadSolicitada: Number(event.target.value) })} className="w-24" />{lines.length > 1 ? <Button aria-label="Quitar línea" variant="ghost" size="sm" onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))}><X size={16} strokeWidth={1.5} /></Button> : null}</div>)}</div></section><div className="flex justify-end gap-2 border-t border-border pt-5"><Button variant="secondary" onClick={closeDrawer}>Cancelar</Button><Button onClick={create}>Crear borrador</Button></div></div></Drawer>
    {toast ? <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} /> : null}
  </>
}
