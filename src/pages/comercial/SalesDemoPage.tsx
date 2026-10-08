import { Download, Plus, ReceiptText } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DataTable, type DataTableColumn } from '../../components/data-display/DataTable'
import { PageContent, PageHeader, ViewToggle } from '../../components/layout/PageLayout'
import { Avatar, Button, Dropdown, Select, StatusPill, Toast } from '../../components/ui'
import { usePermisos } from '../../hooks'
import { useERPStore } from '../../store'
import { selectEstadoVenta, selectTotalVenta } from '../../store/selectors'
import type { EstadoVenta } from '../../types'

interface SaleRow {
  id: string
  code: string
  customer: string
  warehouse: string
  seller: string
  status: EstadoVenta
  date: string
  amount: number
}

type SaleStatusFilter = 'todos' | EstadoVenta

function statusTone(status: EstadoVenta) {
  if (status === 'Cobrado') return 'success' as const
  if (status === 'Facturado' || status === 'Aprobado') return 'accent' as const
  if (status === 'Pendiente') return 'warning' as const
  if (status === 'Anulado') return 'danger' as const
  return 'neutral' as const
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium' }).format(new Date(`${value}T12:00:00Z`))
}

const saleColumns = (onPreview: (id: string) => void, onExport: (code: string) => void): DataTableColumn<SaleRow>[] => [
  { key: 'code', header: 'Venta', sortable: true, sortValue: (row) => row.code, render: (row) => <div><span className="font-semibold text-text">{row.code}</span><span className="mt-0.5 block text-xs text-text-muted">{row.date}</span></div> },
  { key: 'customer', header: 'Cliente', sortable: true, sortValue: (row) => row.customer, render: (row) => <div className="flex items-center gap-3"><Avatar name={row.customer} size="sm" /><span className="font-medium text-text">{row.customer}</span></div> },
  { key: 'warehouse', header: 'Almacén', hideOnMobile: true, sortable: true, sortValue: (row) => row.warehouse, render: (row) => row.warehouse },
  { key: 'seller', header: 'Vendedor', hideOnMobile: true, render: (row) => <div className="flex items-center gap-2"><Avatar name={row.seller} size="sm" /><span>{row.seller}</span></div> },
  { key: 'status', header: 'Estado', sortable: true, sortValue: (row) => row.status, render: (row) => <StatusPill label={row.status} tone={statusTone(row.status)} /> },
  { key: 'amount', header: 'Importe', align: 'right', sortable: true, sortValue: (row) => row.amount, render: (row) => <span className="font-semibold text-text tabular-nums">S/ {row.amount.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span> },
  { key: 'actions', header: '', align: 'right', render: (row) => <Dropdown items={[{ label: 'Ver detalle', icon: ReceiptText, onSelect: () => onPreview(row.id) }, { label: 'Exportar', icon: Download, onSelect: () => onExport(row.code) }]} /> },
]

export function SalesDemoPage() {
  const state = useERPStore()
  const navigate = useNavigate()
  const { puede } = usePermisos()
  const [view, setView] = useState<'list' | 'grid'>('list')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [toast, setToast] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<SaleStatusFilter>('todos')
  const [warehouseFilter, setWarehouseFilter] = useState('todos')

  const rows = useMemo<SaleRow[]>(() => state.ventas.map((venta) => {
    const vendedor = state.usuarios.find((usuario) => usuario.id === venta.vendedorId)
    return {
      id: venta.id,
      code: venta.numero,
      customer: state.clientes.find((cliente) => cliente.id === venta.clienteId)?.razonSocial ?? 'Cliente no encontrado',
      warehouse: state.almacenes.find((almacen) => almacen.id === venta.almacenId)?.nombre ?? 'Almacén no encontrado',
      seller: vendedor ? `${vendedor.nombres} ${vendedor.apellidos}` : 'Usuario no encontrado',
      status: selectEstadoVenta(state, venta.id, state.fechaReferencia),
      date: formatDate(venta.fecha),
      amount: selectTotalVenta(state, venta.id),
    }
  }), [state])

  const filteredSales = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return rows
    return rows.filter((sale) => [sale.code, sale.customer, sale.seller, sale.warehouse, sale.status].some((field) => field.toLowerCase().includes(normalized)))
  }, [query, rows])

  const visibleSales = useMemo(() => filteredSales.filter((sale) => (statusFilter === 'todos' || sale.status === statusFilter) && (warehouseFilter === 'todos' || sale.warehouse === warehouseFilter)), [filteredSales, statusFilter, warehouseFilter])

  const resetPage = <T,>(setter: (value: T) => void, value: T) => {
    setter(value)
    setPage(1)
  }

  useEffect(() => setPage(1), [query])

  const columns = saleColumns((id) => navigate(`/comercial/ventas/${id}`), (code) => setToast(`Exportación de ${code} preparada`))
  const handleBulkAction = () => { setToast(`${selectedIds.length} ventas listas para exportar`); setSelectedIds([]) }

  return <>
    <PageHeader title="Ventas" description="Consulta y seguimiento de las operaciones comerciales." viewControl={<ViewToggle value={view} onChange={setView} />} actions={puede('Ventas', 'crear') ? <Button leadingIcon={Plus} onClick={() => navigate('/comercial/ventas/nueva')}>Nueva venta</Button> : undefined} />
    <PageContent>
      {view === 'list' ? <DataTable rows={visibleSales} columns={columns} getRowId={(row) => row.id} selectedIds={selectedIds} onSelectedIdsChange={setSelectedIds} searchValue={query} onSearchChange={(value) => { setQuery(value); setPage(1) }} page={page} pageSize={10} onPageChange={setPage} totalCount={visibleSales.length} responsive showSelectionSummary={false} toolbarActions={<div className="flex flex-wrap gap-2"><Select aria-label="Filtrar por estado" value={statusFilter} onChange={(event) => resetPage(setStatusFilter, event.target.value as SaleStatusFilter)} className="w-36"><option value="todos">Todos los estados</option>{(['Borrador', 'Pendiente', 'Aprobado', 'Facturado', 'Cobrado', 'Anulado'] as EstadoVenta[]).map((status) => <option key={status} value={status}>{status}</option>)}</Select><Select aria-label="Filtrar por almacén" value={warehouseFilter} onChange={(event) => resetPage(setWarehouseFilter, event.target.value)} className="w-40"><option value="todos">Todos los almacenes</option>{state.almacenes.map((warehouse) => <option key={warehouse.id} value={warehouse.nombre}>{warehouse.nombre}</option>)}</Select></div>} bulkActions={<Button variant="secondary" size="sm" leadingIcon={Download} onClick={handleBulkAction}>Exportar</Button>} emptyTitle="No encontramos ventas" emptyDescription="Prueba con otro término o cambia los filtros." /> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{visibleSales.map((sale) => <article key={sale.id} className="rounded-xl border border-border bg-surface p-5"><div className="flex items-start justify-between"><div><p className="font-semibold text-text">{sale.code}</p><p className="mt-1 text-xs text-text-muted">{sale.date}</p></div><StatusPill label={sale.status} tone={statusTone(sale.status)} /></div><div className="mt-6 flex items-center gap-3"><Avatar name={sale.customer} /><div><p className="text-sm font-medium text-text">{sale.customer}</p><p className="mt-1 text-xs text-text-muted">{sale.warehouse}</p></div></div><div className="mt-6 flex items-center justify-between border-t border-border pt-4"><span className="text-xs text-text-muted">Importe</span><span className="font-semibold text-text tabular-nums">S/ {sale.amount.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span></div></article>)}</div>}
    </PageContent>
    {toast ? <Toast message={toast} onClose={() => setToast(null)} /> : null}
  </>
}
