import { ArrowDownToLine, ArrowUpFromLine, ClipboardList } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { DataTable, type DataTableColumn } from '../../components/data-display/DataTable'
import { PageContent, PageHeader } from '../../components/layout/PageLayout'
import { Select } from '../../components/ui'
import { useERPStore } from '../../store'
import { NATURALEZA_MOVIMIENTO_INVENTARIO } from '../../utils'
import type { MovimientoInventario } from '../../types'

const date = (value: string) => new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
const money = (value: number) => `S/ ${value.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`

function movementColumns(state: ReturnType<typeof useERPStore.getState>): DataTableColumn<MovimientoInventario>[] {
  return [
    { key: 'date', header: 'Fecha', sortable: true, sortValue: (row) => row.fecha, render: (row) => <span className="whitespace-nowrap text-text-soft">{date(row.fecha)}</span> },
    { key: 'product', header: 'Producto', sortable: true, sortValue: (row) => state.productos.find((item) => item.id === row.productoId)?.nombre ?? '', render: (row) => <div className="min-w-0"><span className="block truncate font-medium text-text">{state.productos.find((item) => item.id === row.productoId)?.nombre ?? 'Producto no encontrado'}</span><span className="mt-0.5 block truncate text-xs text-text-muted">{state.productos.find((item) => item.id === row.productoId)?.sku ?? row.productoId}</span></div> },
    { key: 'warehouse', header: 'Almacén', hideOnMobile: true, sortable: true, sortValue: (row) => state.almacenes.find((item) => item.id === row.almacenId)?.nombre ?? '', render: (row) => state.almacenes.find((item) => item.id === row.almacenId)?.nombre ?? 'Almacén no encontrado' },
    { key: 'type', header: 'Movimiento', sortable: true, sortValue: (row) => row.tipo, render: (row) => { const entry = NATURALEZA_MOVIMIENTO_INVENTARIO[row.tipo] === 'entrada'; const Icon = entry ? ArrowDownToLine : ArrowUpFromLine; return <span className={entry ? 'inline-flex items-center gap-1.5 text-success' : 'inline-flex items-center gap-1.5 text-danger'}><Icon size={15} strokeWidth={1.5} />{row.tipo}</span> } },
    { key: 'quantity', header: 'Cantidad', align: 'right', sortable: true, sortValue: (row) => row.cantidad, render: (row) => { const entry = NATURALEZA_MOVIMIENTO_INVENTARIO[row.tipo] === 'entrada'; return <span className="font-semibold tabular-nums">{entry ? '+' : '-'}{row.cantidad.toLocaleString('es-PE')} <span className="text-xs font-normal text-text-muted">{state.productos.find((item) => item.id === row.productoId)?.unidadMedida}</span></span> } },
    { key: 'cost', header: 'Costo', hideOnMobile: true, align: 'right', sortable: true, sortValue: (row) => row.costoUnitario, render: (row) => <span className="tabular-nums">{money(row.costoUnitario)}</span> },
    { key: 'reference', header: 'Referencia', hideOnMobile: true, render: (row) => <span className="text-xs text-text-muted">{row.referenciaTipo}</span> },
  ]
}

export function KardexPage() {
  const state = useERPStore()
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [warehouseId, setWarehouseId] = useState(searchParams.get('almacen') ?? 'todos')
  const [type, setType] = useState('todos')

  const rows = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return [...state.movimientosInventario].sort((a, b) => b.fecha.localeCompare(a.fecha)).filter((movement) => {
      const product = state.productos.find((item) => item.id === movement.productoId)
      const matchesQuery = !normalized || [product?.nombre, product?.sku, movement.tipo, movement.referenciaTipo].some((value) => value?.toLowerCase().includes(normalized))
      return matchesQuery && (warehouseId === 'todos' || movement.almacenId === warehouseId) && (type === 'todos' || movement.tipo === type)
    })
  }, [query, state.movimientosInventario, state.productos, warehouseId, type])

  return <>
    <PageHeader title="Kardex" description="Trazabilidad de entradas y salidas; el stock no se edita directamente." />
    <PageContent>
      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl bg-surface-muted px-4 py-3 text-sm text-text-soft"><ClipboardList size={17} strokeWidth={1.5} className="text-text-muted" /><span>{state.movimientosInventario.length} movimientos registrados</span><span className="hidden text-xs text-text-muted sm:block">Las existencias se derivan de esta fuente.</span></div>
      <DataTable rows={rows} columns={movementColumns(state)} getRowId={(row) => row.id} selectedIds={selectedIds} onSelectedIdsChange={setSelectedIds} searchValue={query} onSearchChange={(value) => { setQuery(value); setPage(1) }} page={page} pageSize={10} onPageChange={setPage} totalCount={rows.length} responsive showSelectionSummary={false} toolbarActions={<div className="flex gap-2"><Select aria-label="Filtrar por almacén" value={warehouseId} onChange={(event) => { setWarehouseId(event.target.value); setPage(1) }} className="w-40"><option value="todos">Todos los almacenes</option>{state.almacenes.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.nombre}</option>)}</Select><Select aria-label="Filtrar por movimiento" value={type} onChange={(event) => { setType(event.target.value); setPage(1) }} className="w-40"><option value="todos">Todos los movimientos</option>{Array.from(new Set(state.movimientosInventario.map((movement) => movement.tipo))).map((movementType) => <option key={movementType} value={movementType}>{movementType}</option>)}</Select></div>} emptyTitle="No encontramos movimientos" emptyDescription="Prueba con otro producto, almacén o tipo de movimiento." />
    </PageContent>
  </>
}
