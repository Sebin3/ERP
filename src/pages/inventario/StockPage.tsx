import { useMemo, useState } from 'react'
import { DataTable, type DataTableColumn } from '../../components/data-display/DataTable'
import { PageContent, PageHeader } from '../../components/layout/PageLayout'
import { Select, StatusPill } from '../../components/ui'
import { useERPStore } from '../../store'
import { selectReservado, selectStock, selectStockDisponible } from '../../store/selectors'

interface StockRow {
  id: string
  sku: string
  producto: string
  almacenId: string
  almacen: string
  unidad: string
  existencia: number
  reservado: number
  disponible: number
  minimo: number
}

const quantity = (value: number) => value.toLocaleString('es-PE', { maximumFractionDigits: 2 })
const columns: DataTableColumn<StockRow>[] = [
  { key: 'producto', header: 'Producto', sortable: true, sortValue: (row) => row.producto, render: (row) => <div><span className="block font-medium">{row.producto}</span><span className="text-xs text-text-muted">{row.sku} · {row.unidad}</span></div> },
  { key: 'almacen', header: 'Almacén', sortable: true, sortValue: (row) => row.almacen, render: (row) => row.almacen },
  ...(['existencia', 'reservado', 'disponible'] as const).map((key) => ({ key, header: { existencia: 'Existencia física', reservado: 'Reservado', disponible: 'Disponible' }[key], align: 'right' as const, sortable: true, sortValue: (row: StockRow) => row[key], render: (row: StockRow) => <span className="tabular-nums">{quantity(row[key])}</span> })),
  { key: 'estado', header: 'Disponibilidad', render: (row) => <StatusPill label={row.disponible <= row.minimo ? 'Bajo mínimo' : 'Disponible'} tone={row.disponible <= row.minimo ? 'warning' : 'success'} /> },
]

export function StockPage() {
  const state = useERPStore()
  const [query, setQuery] = useState('')
  const [warehouse, setWarehouse] = useState('todos')
  const [criticalOnly, setCriticalOnly] = useState('todos')
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const rows = useMemo(() => {
    const search = query.trim().toLocaleLowerCase('es-PE')
    return state.productos.flatMap((product) => state.almacenes.map((almacen): StockRow => ({
      id: `${product.id}:${almacen.id}`, sku: product.sku, producto: product.nombre,
      almacenId: almacen.id, almacen: almacen.nombre, unidad: product.unidadMedida,
      existencia: selectStock(state, product.id, almacen.id),
      reservado: selectReservado(state, product.id, almacen.id),
      disponible: selectStockDisponible(state, product.id, almacen.id), minimo: product.stockMinimo,
    }))).filter((row) => (warehouse === 'todos' || row.almacenId === warehouse)
      && (criticalOnly === 'todos' || row.disponible <= row.minimo)
      && (!search || [row.sku, row.producto, row.almacen].some((value) => value.toLocaleLowerCase('es-PE').includes(search))))
  }, [state, query, warehouse, criticalOnly])

  return <>
    <PageHeader title="Existencias" description="Existencia física, reservas de pedidos y disponibilidad por producto y almacén." />
    <PageContent>
      <p className="mb-5 text-sm text-text-muted">La existencia se calcula desde el kardex. Disponible = existencia física − reservado. El mínimo de referencia corresponde al configurado en el producto.</p>
      <DataTable rows={rows} columns={columns} getRowId={(row) => row.id} selectedIds={selectedIds} onSelectedIdsChange={setSelectedIds} showSelectionSummary={false} searchValue={query} onSearchChange={(value) => { setQuery(value); setPage(1) }} page={page} pageSize={10} onPageChange={setPage} totalCount={rows.length} responsive
        toolbarActions={<div className="flex flex-wrap gap-2"><Select aria-label="Almacén" value={warehouse} onChange={(event) => { setWarehouse(event.target.value); setPage(1) }} options={[{ value: 'todos', label: 'Todos los almacenes' }, ...state.almacenes.map((item) => ({ value: item.id, label: item.nombre }))]} /><Select aria-label="Disponibilidad" value={criticalOnly} onChange={(event) => { setCriticalOnly(event.target.value); setPage(1) }} options={[{ value: 'todos', label: 'Toda la disponibilidad' }, { value: 'criticos', label: 'Bajo mínimo' }]} /></div>}
        emptyTitle="No hay existencias para estos filtros" emptyDescription="Prueba otro producto o almacén." />
    </PageContent>
  </>
}
