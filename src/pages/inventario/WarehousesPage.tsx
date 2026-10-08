import { ArrowRight, MapPin, Pencil, Warehouse } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DataTable, type DataTableColumn } from '../../components/data-display/DataTable'
import { PageContent, PageHeader } from '../../components/layout/PageLayout'
import { Avatar, Dropdown, StatusPill } from '../../components/ui'
import { usePermisos } from '../../hooks'
import { useERPStore } from '../../store'
import { selectCostoPromedio, selectStock, selectStockDisponible } from '../../store/selectors'
import type { Almacen } from '../../types'

const money = (value: number) => `S/ ${value.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`

function warehouseColumns(state: ReturnType<typeof useERPStore.getState>, onOpen: (id: string) => void, onEdit: (id: string) => void, canEdit: boolean): DataTableColumn<Almacen>[] {
  return [
    {
      key: 'warehouse',
      header: 'Almacén',
      sortable: true,
      sortValue: (row) => row.nombre,
      render: (row) => <div className="flex min-w-0 items-center gap-3"><Avatar name={row.nombre} size="sm" /><div className="min-w-0"><span className="block truncate font-medium text-text">{row.nombre}</span><span className="mt-0.5 block truncate text-xs text-text-muted">{row.codigo}</span></div></div>,
    },
    {
      key: 'location',
      header: 'Ubicación',
      hideOnMobile: true,
      sortable: true,
      sortValue: (row) => row.direccion,
      render: (row) => <span className="inline-flex items-center gap-1.5 truncate"><MapPin size={14} strokeWidth={1.5} className="shrink-0 text-text-muted" />{row.direccion}</span>,
    },
    {
      key: 'stock',
      header: 'Stock disponible',
      align: 'right',
      sortable: true,
      sortValue: (row) => state.productos.reduce((total, producto) => total + selectStockDisponible(state, producto.id, row.id), 0),
      render: (row) => {
        const available = state.productos.reduce((total, producto) => total + selectStockDisponible(state, producto.id, row.id), 0)
        const value = state.productos.reduce((total, producto) => total + selectStock(state, producto.id, row.id) * selectCostoPromedio(state, producto.id, row.id), 0)
        return <div className="text-right"><span className="block font-semibold text-text tabular-nums">{available.toLocaleString('es-PE')} und.</span><span className="mt-0.5 block text-xs text-text-muted tabular-nums">{money(value)}</span></div>
      },
    },
    {
      key: 'products',
      header: 'Productos',
      hideOnMobile: true,
      align: 'right',
      sortable: true,
      sortValue: (row) => state.productos.filter((producto) => selectStock(state, producto.id, row.id) > 0).length,
      render: (row) => <span className="tabular-nums">{state.productos.filter((producto) => selectStock(state, producto.id, row.id) > 0).length}</span>,
    },
    {
      key: 'responsible',
      header: 'Responsable',
      hideOnMobile: true,
      sortable: true,
      sortValue: (row) => state.usuarios.find((user) => user.id === row.responsableUsuarioId)?.nombres ?? '',
      render: (row) => state.usuarios.find((user) => user.id === row.responsableUsuarioId)?.nombres ?? 'Sin asignar',
    },
    {
      key: 'status',
      header: 'Estado',
      sortable: true,
      sortValue: (row) => row.estado,
      render: (row) => <StatusPill label={row.estado} tone={row.estado === 'Activo' ? 'success' : 'neutral'} />,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => <Dropdown items={[{ label: 'Ver ficha', icon: ArrowRight, onSelect: () => onOpen(row.id) }, ...(canEdit ? [{ label: 'Editar ficha', icon: Pencil, onSelect: () => onEdit(row.id) }] : [])]} />,
    },
  ]
}

export function WarehousesPage() {
  const navigate = useNavigate()
  const state = useERPStore()
  const { puede } = usePermisos()
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const canEdit = puede('Almacenes', 'editar')

  const rows = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return state.almacenes
    return state.almacenes.filter((warehouse) => [warehouse.codigo, warehouse.nombre, warehouse.direccion, warehouse.estado].some((value) => value.toLowerCase().includes(normalized)))
  }, [query, state.almacenes])

  return <>
    <PageHeader title="Almacenes" description="Consulta y mantenimiento de los puntos físicos de inventario." />
    <PageContent>
      <div className="mb-5 flex items-center justify-between gap-4 rounded-xl bg-surface-muted px-4 py-3 text-sm text-text-soft"><div className="flex items-center gap-2"><Warehouse size={17} strokeWidth={1.5} className="text-text-muted" /><span>{state.almacenes.length} almacenes registrados</span></div><span className="hidden text-xs text-text-muted sm:block">El stock se calcula desde el kardex.</span></div>
      <DataTable rows={rows} columns={warehouseColumns(state, (id) => navigate(`/inventario/almacenes/${id}`), (id) => navigate(`/inventario/almacenes/${id}?editar=1`), canEdit)} getRowId={(row) => row.id} selectedIds={selectedIds} onSelectedIdsChange={setSelectedIds} searchValue={query} onSearchChange={(value) => { setQuery(value); setPage(1) }} page={page} pageSize={10} onPageChange={setPage} totalCount={rows.length} responsive showSelectionSummary={false} emptyTitle="No encontramos almacenes" emptyDescription="Prueba con otro código, nombre o dirección." />
    </PageContent>
  </>
}
