import { Check, ClipboardList } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DataTable, type DataTableColumn } from '../../components/data-display/DataTable'
import { PageContent, PageHeader } from '../../components/layout/PageLayout'
import { Button, ConfirmActionModal, Input, Select, StatusPill, Toast } from '../../components/ui'
import { usePermisos } from '../../hooks'
import { useERPStore } from '../../store'
import type { EstadoSolicitudAjuste, SolicitudAjusteInventario } from '../../types'

const date = (value: string) => new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
const statusTone = (status: EstadoSolicitudAjuste) => status === 'Aprobada' ? 'success' as const : status === 'Rechazada' || status === 'Anulada' ? 'danger' as const : 'warning' as const

function adjustmentColumns(state: ReturnType<typeof useERPStore.getState>, onApprove: (id: string) => void, onReject: (id: string) => void, onAnnul: (id: string) => void, onOpenProduct: (id: string) => void, canApprove: boolean, canAnnul: boolean): DataTableColumn<SolicitudAjusteInventario>[] {
  return [
    { key: 'request', header: 'Solicitud', sortable: true, sortValue: (row) => row.id, render: (row) => <div><span className="block font-medium text-text">{row.id}</span><span className="mt-0.5 block text-xs text-text-muted">{date(row.creadoEn)}</span></div> },
    { key: 'product', header: 'Producto', sortable: true, sortValue: (row) => state.productos.find((item) => item.id === row.productoId)?.nombre ?? '', render: (row) => <div><span className="block truncate font-medium text-text">{state.productos.find((item) => item.id === row.productoId)?.nombre ?? 'Producto no encontrado'}</span><span className="mt-0.5 block text-xs text-text-muted">{state.productos.find((item) => item.id === row.productoId)?.sku ?? row.productoId}</span></div> },
    { key: 'warehouse', header: 'Almacén', hideOnMobile: true, sortable: true, sortValue: (row) => state.almacenes.find((item) => item.id === row.almacenId)?.nombre ?? '', render: (row) => state.almacenes.find((item) => item.id === row.almacenId)?.nombre ?? 'Almacén no encontrado' },
    { key: 'expected', header: 'Stock esperado', align: 'right', sortable: true, sortValue: (row) => row.cantidadEsperada, render: (row) => <span className="tabular-nums">{row.cantidadEsperada.toLocaleString('es-PE')} {state.productos.find((item) => item.id === row.productoId)?.unidadMedida}</span> },
    { key: 'requester', header: 'Solicitante', hideOnMobile: true, sortable: true, sortValue: (row) => state.usuarios.find((item) => item.id === row.solicitadoPorUsuarioId)?.nombres ?? '', render: (row) => { const user = state.usuarios.find((item) => item.id === row.solicitadoPorUsuarioId); return user ? `${user.nombres} ${user.apellidos}` : 'Usuario no encontrado' } },
    { key: 'status', header: 'Estado', sortable: true, sortValue: (row) => row.estado, render: (row) => <StatusPill label={row.estado} tone={statusTone(row.estado)} /> },
    { key: 'actions', header: '', align: 'right', render: (row) => <div className="flex items-center justify-end gap-2">{row.estado === 'Pendiente' && canApprove ? <><Button size="sm" leadingIcon={Check} onClick={() => onApprove(row.id)}>Aprobar</Button><button type="button" className="text-xs font-medium text-danger transition-colors hover:text-danger/80 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-danger-soft" onClick={() => onReject(row.id)}>Rechazar</button></> : null}{row.estado === 'Pendiente' && canAnnul ? <button type="button" className="text-xs font-medium text-text-muted transition-colors hover:text-text focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-accent-soft" onClick={() => onAnnul(row.id)}>Anular</button> : null}<button type="button" className="text-xs font-medium text-accent transition-colors hover:text-accent-hover focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-accent-soft" onClick={() => onOpenProduct(row.productoId)}>Ver ficha</button></div> },
  ]
}

export function AdjustmentsPage() {
  const state = useERPStore()
  const navigate = useNavigate()
  const { puede } = usePermisos()
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [statusFilter, setStatusFilter] = useState<'todos' | EstadoSolicitudAjuste>('todos')
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [annulId, setAnnulId] = useState<string | null>(null)
  const [annulReason, setAnnulReason] = useState('')
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'danger' } | null>(null)
  const canApprove = puede('Ajustes de inventario', 'aprobar')
  const canAnnul = puede('Ajustes de inventario', 'anular')

  const rows = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return state.solicitudesAjuste.filter((request) => {
      const product = state.productos.find((item) => item.id === request.productoId)
      const warehouse = state.almacenes.find((item) => item.id === request.almacenId)
      const matchesQuery = !normalized || [request.id, request.motivo, request.estado, product?.nombre, product?.sku, warehouse?.nombre].some((value) => value?.toLowerCase().includes(normalized))
      return matchesQuery && (statusFilter === 'todos' || request.estado === statusFilter)
    })
  }, [query, state, statusFilter])

  const approve = (id: string) => {
    if (!state.usuarioActualId) return
    const result = state.aprobarAjuste(id, state.usuarioActualId)
    setToast(result.ok ? { message: 'Ajuste aprobado y movimiento agregado al kardex.', tone: 'success' } : { message: result.error, tone: 'danger' })
  }

  const reject = () => {
    if (!state.usuarioActualId || !rejectId || !rejectReason.trim()) return
    const result = state.rechazarAjuste(rejectId, rejectReason, state.usuarioActualId)
    setToast(result.ok ? { message: 'Solicitud de ajuste rechazada.', tone: 'success' } : { message: result.error, tone: 'danger' })
    if (result.ok) { setRejectId(null); setRejectReason('') }
  }

  const annul = () => {
    if (!state.usuarioActualId || !annulId || !annulReason.trim()) return
    const result = state.anularAjuste(annulId, annulReason, state.usuarioActualId)
    setToast(result.ok ? { message: 'Solicitud de ajuste anulada.', tone: 'success' } : { message: result.error, tone: 'danger' })
    if (result.ok) { setAnnulId(null); setAnnulReason('') }
  }

  return <>
    <PageHeader title="Ajustes de inventario" description="Solicitudes controladas para corregir existencias después de una aprobación." />
    <PageContent>
      <div className="mb-5 flex items-start gap-3 rounded-xl bg-surface-muted px-4 py-3 text-sm text-text-soft"><ClipboardList size={17} strokeWidth={1.5} className="mt-0.5 shrink-0 text-text-muted" /><div><p>El stock nunca se edita directamente.</p><p className="mt-1 text-xs text-text-muted">Las solicitudes se crean desde la ficha de producto; al aprobarlas se genera el movimiento de kardex.</p></div></div>
      <DataTable rows={rows} columns={adjustmentColumns(state, approve, (id) => { setRejectId(id); setRejectReason('') }, (id) => { setAnnulId(id); setAnnulReason('') }, (id) => navigate(`/inventario/productos/${id}`), canApprove, canAnnul)} getRowId={(row) => row.id} selectedIds={selectedIds} onSelectedIdsChange={setSelectedIds} searchValue={query} onSearchChange={(value) => { setQuery(value); setPage(1) }} page={page} pageSize={10} onPageChange={setPage} totalCount={rows.length} responsive showSelectionSummary={false} toolbarActions={<Select aria-label="Filtrar ajustes por estado" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as 'todos' | EstadoSolicitudAjuste); setPage(1) }} className="w-40"><option value="todos">Todos los estados</option>{(['Pendiente', 'Aprobada', 'Rechazada', 'Anulada'] as EstadoSolicitudAjuste[]).map((status) => <option key={status} value={status}>{status}</option>)}</Select>} emptyTitle="No hay solicitudes de ajuste" emptyDescription="Las solicitudes creadas desde las fichas de producto aparecerán aquí." />
    </PageContent>
    <ConfirmActionModal open={Boolean(rejectId)} title="Rechazar ajuste" description="El rechazo no modifica el stock ni crea movimientos de kardex. La decisión quedará registrada en auditoría." confirmLabel="Rechazar solicitud" confirmVariant="danger" confirmDisabled={!rejectReason.trim()} onClose={() => setRejectId(null)} onConfirm={reject}><Input label="Motivo del rechazo" placeholder="Ej. Conteo pendiente de validar" value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} /></ConfirmActionModal>
    <ConfirmActionModal open={Boolean(annulId)} title="Anular solicitud" description="Solo se puede anular una solicitud pendiente. Esta acción no modifica el stock y quedará registrada en auditoría." confirmLabel="Anular solicitud" confirmVariant="danger" confirmDisabled={!annulReason.trim()} onClose={() => setAnnulId(null)} onConfirm={annul}><Input label="Motivo de la anulación" placeholder="Ej. Solicitud duplicada" value={annulReason} onChange={(event) => setAnnulReason(event.target.value)} /></ConfirmActionModal>
    {toast ? <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} /> : null}
  </>
}
