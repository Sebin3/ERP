import { CalendarDays, Check, PackageCheck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DataTable, type DataTableColumn } from '../../components/data-display/DataTable'
import { PageContent, PageHeader } from '../../components/layout/PageLayout'
import { Dropdown, Select, StatusPill } from '../../components/ui'
import { usePermisos } from '../../hooks'
import { useERPStore } from '../../store'
import { selectEstadoOrdenCompra } from '../../store/selectors'
import type { EstadoOrdenCompra, OrdenCompra } from '../../types'

const date = (value?: string) => value ? new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${value}T12:00:00Z`)) : 'Sin fecha'
const statusTone = (status: EstadoOrdenCompra) => status === 'Atendida' ? 'success' as const : status === 'Anulada' ? 'danger' as const : status === 'Parcial' ? 'warning' as const : 'neutral' as const

function receiptColumns(state: ReturnType<typeof useERPStore.getState>, onRegister: (id: string) => void, canCreate: boolean): DataTableColumn<OrdenCompra>[] {
  return [
    { key: 'order', header: 'Orden', sortable: true, sortValue: (row) => row.numero, render: (row) => <div><span className="block font-medium text-text">{row.numero}</span><span className="mt-0.5 block text-xs text-text-muted">Emitida {date(row.fecha)}</span></div> },
    { key: 'supplier', header: 'Proveedor', sortable: true, sortValue: (row) => state.proveedores.find((item) => item.id === row.proveedorId)?.razonSocial ?? '', render: (row) => state.proveedores.find((item) => item.id === row.proveedorId)?.razonSocial ?? 'No encontrado' },
    { key: 'destination', header: 'Destino', hideOnMobile: true, sortable: true, sortValue: (row) => state.almacenes.find((item) => item.id === row.almacenDestinoId)?.nombre ?? '', render: (row) => state.almacenes.find((item) => item.id === row.almacenDestinoId)?.nombre ?? 'No encontrado' },
    { key: 'delivery', header: 'Entrega esperada', hideOnMobile: true, sortable: true, sortValue: (row) => row.fechaEntregaEsperada ?? '', render: (row) => <span className="inline-flex items-center gap-1.5 whitespace-nowrap"><CalendarDays size={14} strokeWidth={1.5} className="text-text-muted" />{date(row.fechaEntregaEsperada)}</span> },
    { key: 'status', header: 'Estado', sortable: true, sortValue: (row) => selectEstadoOrdenCompra(state, row.id), render: (row) => { const status = selectEstadoOrdenCompra(state, row.id); return <StatusPill label={status} tone={statusTone(status)} /> } },
    { key: 'actions', header: '', align: 'right', render: (row) => { const purchase = state.compras.find((item) => item.ordenCompraId === row.id); const status = selectEstadoOrdenCompra(state, row.id); return purchase && canCreate && status !== 'Atendida' && status !== 'Anulada' ? <Dropdown items={[{ label: 'Registrar recepción', icon: Check, onSelect: () => onRegister(row.id) }]} /> : null } },
  ]
}

export function ReceiptsPage() {
  const state = useERPStore()
  const navigate = useNavigate()
  const { puede } = usePermisos()
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [statusFilter, setStatusFilter] = useState<'todos' | EstadoOrdenCompra>('todos')
  const canCreate = puede('Recepción', 'crear')
  const rows = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return state.ordenesCompra.filter((order) => state.compras.some((purchase) => purchase.ordenCompraId === order.id)).filter((order) => {
      const status = selectEstadoOrdenCompra(state, order.id)
      const matchesQuery = !normalized || [order.numero, status, state.proveedores.find((item) => item.id === order.proveedorId)?.razonSocial, state.almacenes.find((item) => item.id === order.almacenDestinoId)?.nombre].some((value) => value?.toLowerCase().includes(normalized))
      return matchesQuery && (statusFilter === 'todos' || status === statusFilter)
    })
  }, [query, state, statusFilter])

  const resetStatus = (value: 'todos' | EstadoOrdenCompra) => {
    setStatusFilter(value)
    setPage(1)
  }

  return <>
    <PageHeader title="Recepción de compras" description="Registra la mercadería recibida y actualiza el kardex del almacén." />
    <PageContent>
      <div className="mb-5 flex items-center gap-3 rounded-xl bg-surface-muted px-4 py-3 text-sm text-text-soft"><PackageCheck size={17} strokeWidth={1.5} className="text-text-muted" /><span>{rows.length} órdenes emitidas</span><span className="hidden text-xs text-text-muted sm:block">La recepción puede ser parcial o completa.</span></div>
      <DataTable rows={rows} columns={receiptColumns(state, (id) => navigate(`/compras/recepcion/${id}`), canCreate)} getRowId={(row) => row.id} selectedIds={selectedIds} onSelectedIdsChange={setSelectedIds} searchValue={query} onSearchChange={(value) => { setQuery(value); setPage(1) }} page={page} pageSize={10} onPageChange={setPage} totalCount={rows.length} responsive showSelectionSummary={false} toolbarActions={<Select aria-label="Filtrar recepciones por estado" value={statusFilter} onChange={(event) => resetStatus(event.target.value as 'todos' | EstadoOrdenCompra)} className="w-40"><option value="todos">Todos los estados</option>{(['Ordenada', 'Parcial', 'Atendida', 'Anulada'] as EstadoOrdenCompra[]).map((status) => <option key={status} value={status}>{status}</option>)}</Select>} emptyTitle="No hay compras para recibir" emptyDescription="Las órdenes emitidas aparecerán aquí cuando tengan una Compra asociada." />
    </PageContent>
  </>
}
