import { ArrowRight, ArrowRightLeft, Check, Plus, Send, X, XCircle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DataTable, type DataTableColumn } from '../../components/data-display/DataTable'
import { PageContent, PageHeader } from '../../components/layout/PageLayout'
import { Button, ConfirmActionModal, Drawer, Dropdown, Input, Select, StatusPill, Toast } from '../../components/ui'
import { usePermisos } from '../../hooks'
import { useERPStore } from '../../store'
import { selectEstadoTransferencia } from '../../store/selectors'
import type { EstadoTransferencia, Transferencia } from '../../types'

type TransferLine = { productoId: string; cantidad: number }
type ToastState = { message: string; tone: 'success' | 'danger' }

const date = (value: string) => new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
const statusTone = (status: EstadoTransferencia) => status === 'Completada' ? 'success' as const : status === 'Anulada' ? 'danger' as const : status === 'Solicitada' ? 'warning' as const : 'neutral' as const

function transferColumns(state: ReturnType<typeof useERPStore.getState>, onRequest: (id: string) => void, onExecute: (id: string) => void, onCancel: (id: string) => void, canRequest: boolean, canExecute: boolean, canCancel: boolean): DataTableColumn<Transferencia>[] {
  return [
    { key: 'transfer', header: 'Transferencia', sortable: true, sortValue: (row) => row.numero, render: (row) => <div><span className="block font-medium text-text">{row.numero}</span><span className="mt-0.5 block text-xs text-text-muted">{date(row.fecha)}</span></div> },
    { key: 'route', header: 'Ruta', sortable: true, sortValue: (row) => row.almacenOrigenId, render: (row) => <span className="inline-flex items-center gap-2 whitespace-nowrap"><span>{state.almacenes.find((item) => item.id === row.almacenOrigenId)?.nombre}</span><ArrowRight size={14} strokeWidth={1.5} className="text-text-muted" /><span>{state.almacenes.find((item) => item.id === row.almacenDestinoId)?.nombre}</span></span> },
    { key: 'items', header: 'Líneas', align: 'right', sortable: true, sortValue: (row) => row.itemIds.length, render: (row) => <span className="tabular-nums">{row.itemIds.length}</span> },
    { key: 'requester', header: 'Solicitante', hideOnMobile: true, sortable: true, sortValue: (row) => state.usuarios.find((item) => item.id === row.solicitanteUsuarioId)?.nombres ?? '', render: (row) => state.usuarios.find((item) => item.id === row.solicitanteUsuarioId)?.nombres ?? 'Sin asignar' },
    { key: 'status', header: 'Estado', sortable: true, sortValue: (row) => selectEstadoTransferencia(state, row.id), render: (row) => { const status = selectEstadoTransferencia(state, row.id); return <StatusPill label={status} tone={statusTone(status)} /> } },
    { key: 'actions', header: '', align: 'right', render: (row) => { const status = selectEstadoTransferencia(state, row.id); const items = [...(canRequest && status === 'Borrador' ? [{ label: 'Solicitar aprobación', icon: Send, onSelect: () => onRequest(row.id) }] : []), ...(canExecute && status === 'Solicitada' ? [{ label: 'Ejecutar transferencia', icon: Check, onSelect: () => onExecute(row.id) }] : []), ...(canCancel && (status === 'Borrador' || status === 'Solicitada') ? [{ label: 'Anular transferencia', icon: XCircle, onSelect: () => onCancel(row.id) }] : [])]; return items.length ? <Dropdown items={items} /> : null } },
  ]
}

export function TransfersPage() {
  const state = useERPStore()
  const navigate = useNavigate()
  const { puede } = usePermisos()
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [statusFilter, setStatusFilter] = useState<'todos' | EstadoTransferencia>('todos')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [cancelId, setCancelId] = useState<string | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [toast, setToast] = useState<ToastState | null>(null)
  const [originId, setOriginId] = useState(state.almacenes[0]?.id ?? '')
  const [destinationId, setDestinationId] = useState(state.almacenes[1]?.id ?? '')
  const [lines, setLines] = useState<TransferLine[]>([{ productoId: state.productos[0]?.id ?? '', cantidad: 1 }])
  const canCreate = puede('Transferencias', 'crear')
  const canRequest = puede('Transferencias', 'editar')
  const canExecute = puede('Transferencias', 'aprobar')
  const canCancel = puede('Transferencias', 'anular')

  const rows = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return state.transferencias.filter((transfer) => {
      const status = selectEstadoTransferencia(state, transfer.id)
      const matchesQuery = !normalized || [transfer.numero, status, state.almacenes.find((item) => item.id === transfer.almacenOrigenId)?.nombre, state.almacenes.find((item) => item.id === transfer.almacenDestinoId)?.nombre].some((value) => value?.toLowerCase().includes(normalized))
      return matchesQuery && (statusFilter === 'todos' || status === statusFilter)
    })
  }, [query, state, statusFilter])

  const resetStatus = (value: 'todos' | EstadoTransferencia) => { setStatusFilter(value); setPage(1) }

  const closeDrawer = () => {
    setDrawerOpen(false)
    setLines([{ productoId: state.productos[0]?.id ?? '', cantidad: 1 }])
  }

  const notify = (result: { ok: true } | { ok: false; error: string }, successMessage: string) => {
    if (!result.ok) { setToast({ message: result.error, tone: 'danger' }); return false }
    setToast({ message: successMessage, tone: 'success' })
    return true
  }

  const create = () => {
    if (!state.usuarioActualId) return
    const result = state.crearTransferencia({ almacenOrigenId: originId, almacenDestinoId: destinationId, items: lines, usuarioId: state.usuarioActualId })
    if (notify(result, 'Transferencia creada en borrador.')) closeDrawer()
  }

  const request = (id: string) => { if (!state.usuarioActualId) return; notify(state.solicitarTransferencia(id, state.usuarioActualId), 'Transferencia enviada para aprobación.') }
  const execute = (id: string) => {
    if (!state.usuarioActualId) return
    const transfer = state.transferencias.find((item) => item.id === id)
    if (!transfer) return
    const items = state.itemsTransferencia.filter((item) => transfer.itemIds.includes(item.id)).map((item) => ({ productoId: item.productoId, cantidad: item.cantidad }))
    notify(state.ejecutarTransferencia({ transferenciaId: id, almacenOrigenId: transfer.almacenOrigenId, almacenDestinoId: transfer.almacenDestinoId, items, usuarioId: state.usuarioActualId }), 'Transferencia ejecutada y movimientos registrados.')
  }
  const cancel = () => { if (!state.usuarioActualId || !cancelId || !cancelReason.trim()) return; if (notify(state.anularTransferencia(cancelId, cancelReason, state.usuarioActualId), 'Transferencia anulada correctamente.')) { setCancelId(null); setCancelReason('') } }

  const addLine = () => setLines((current) => [...current, { productoId: state.productos.find((product) => !current.some((line) => line.productoId === product.id))?.id ?? '', cantidad: 1 }])
  const updateLine = (index: number, changes: Partial<TransferLine>) => setLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, ...changes } : line))

  return <>
    <PageHeader title="Transferencias" description="Mueve existencias entre almacenes con trazabilidad y doble movimiento de kardex." actions={canCreate ? <Button leadingIcon={Plus} onClick={() => navigate('/inventario/transferencias/nueva')}>Nueva transferencia</Button> : undefined} />
    <PageContent>
      <div className="mb-5 flex items-center gap-3 rounded-xl bg-surface-muted px-4 py-3 text-sm text-text-soft"><ArrowRightLeft size={17} strokeWidth={1.5} className="text-text-muted" /><span>{state.transferencias.length} transferencias registradas</span><span className="hidden text-xs text-text-muted sm:block">Una ejecución crea salida y entrada emparejadas.</span></div>
      <DataTable rows={rows} columns={transferColumns(state, request, execute, (id) => { setCancelId(id); setCancelReason('') }, canRequest, canExecute, canCancel)} getRowId={(row) => row.id} selectedIds={selectedIds} onSelectedIdsChange={setSelectedIds} searchValue={query} onSearchChange={(value) => { setQuery(value); setPage(1) }} page={page} pageSize={10} onPageChange={setPage} totalCount={rows.length} responsive showSelectionSummary={false} toolbarActions={<Select aria-label="Filtrar transferencias por estado" value={statusFilter} onChange={(event) => resetStatus(event.target.value as 'todos' | EstadoTransferencia)} className="w-40"><option value="todos">Todos los estados</option>{(['Borrador', 'Solicitada', 'Completada', 'Anulada'] as EstadoTransferencia[]).map((status) => <option key={status} value={status}>{status}</option>)}</Select>} emptyTitle="No encontramos transferencias" emptyDescription="Crea una transferencia para mover stock entre almacenes." />
    </PageContent>
    <Drawer open={drawerOpen} title="Nueva transferencia" onClose={closeDrawer}>
      <div className="space-y-5">
        <p className="text-sm leading-6 text-text-muted">Primero se guarda en borrador. Después podrás solicitarla y ejecutarla cuando corresponda.</p>
        <div className="grid gap-4 sm:grid-cols-2"><Select label="Almacén origen" value={originId} onChange={(event) => setOriginId(event.target.value)} options={state.almacenes.filter((item) => item.estado === 'Activo').map((item) => ({ value: item.id, label: item.nombre }))} /><Select label="Almacén destino" value={destinationId} onChange={(event) => setDestinationId(event.target.value)} options={state.almacenes.filter((item) => item.estado === 'Activo').map((item) => ({ value: item.id, label: item.nombre }))} /></div>
        <section><div className="flex items-center justify-between"><div><h3 className="text-sm font-semibold text-text">Productos a transferir</h3><p className="mt-1 text-xs text-text-muted">No repitas un producto en la misma transferencia.</p></div><Button size="sm" variant="secondary" onClick={addLine}>Agregar línea</Button></div><div className="mt-4 space-y-3">{lines.map((line, index) => <div key={`${index}-${line.productoId}`} className="flex items-end gap-2"><Select label={index === 0 ? 'Producto' : undefined} value={line.productoId} onChange={(event) => updateLine(index, { productoId: event.target.value })} className="min-w-0 flex-1" options={state.productos.filter((product) => product.estado === 'Activo').map((product) => ({ value: product.id, label: `${product.nombre} · ${product.sku}` }))} /><Input label={index === 0 ? 'Cantidad' : undefined} type="number" min="1" step="1" value={line.cantidad} onChange={(event) => updateLine(index, { cantidad: Number(event.target.value) })} className="w-24" />{lines.length > 1 ? <Button aria-label="Quitar línea" variant="ghost" size="sm" onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))}><X size={16} strokeWidth={1.5} /></Button> : null}</div>)}</div></section>
        <div className="flex justify-end gap-2 border-t border-border pt-5"><Button variant="secondary" onClick={closeDrawer}>Cancelar</Button><Button onClick={create}>Crear borrador</Button></div>
      </div>
    </Drawer>
    <ConfirmActionModal open={Boolean(cancelId)} title="Anular transferencia" description="Solo se pueden anular transferencias que todavía no hayan creado movimientos de kardex." confirmLabel="Confirmar anulación" confirmDisabled={!cancelReason.trim()} onClose={() => setCancelId(null)} onConfirm={cancel}><Input label="Motivo de anulación" placeholder="Ej. Reubicación cancelada" value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} /></ConfirmActionModal>
    {toast ? <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} /> : null}
  </>
}
