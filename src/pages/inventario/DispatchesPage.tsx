import { ArrowDownToLine, ExternalLink, Package } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DataTable, type DataTableColumn } from '../../components/data-display/DataTable'
import { PageContent, PageHeader } from '../../components/layout/PageLayout'
import { Select, StatusPill } from '../../components/ui'
import { useERPStore } from '../../store'
import { selectEstadoVenta, selectTotalVenta } from '../../store/selectors'
import type { EstadoVenta } from '../../types'

type DispatchRow = {
  saleId: string
  numero: string
  fecha: string
  cliente: string
  almacen: string
  lineas: number
  unidades: number
  total: number
  estado: EstadoVenta
}

const date = (value: string) => new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
const money = (value: number) => `S/ ${value.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const statusTone = (status: EstadoVenta) => status === 'Cobrado' ? 'success' as const : status === 'Anulado' ? 'danger' as const : status === 'Facturado' ? 'accent' as const : 'neutral' as const

function dispatchColumns(onOpen: (id: string) => void): DataTableColumn<DispatchRow>[] {
  return [
    { key: 'document', header: 'Venta', sortable: true, sortValue: (row) => row.numero, render: (row) => <div><span className="block font-medium text-text">{row.numero}</span><span className="mt-0.5 block text-xs text-text-muted">{date(row.fecha)}</span></div> },
    { key: 'customer', header: 'Cliente', sortable: true, sortValue: (row) => row.cliente, render: (row) => <span className="block truncate">{row.cliente}</span> },
    { key: 'warehouse', header: 'Almacén', hideOnMobile: true, sortable: true, sortValue: (row) => row.almacen, render: (row) => row.almacen },
    { key: 'lines', header: 'Líneas', hideOnMobile: true, align: 'right', sortable: true, sortValue: (row) => row.lineas, render: (row) => <span className="tabular-nums">{row.lineas}</span> },
    { key: 'units', header: 'Unidades', align: 'right', sortable: true, sortValue: (row) => row.unidades, render: (row) => <span className="font-semibold tabular-nums">-{row.unidades.toLocaleString('es-PE')}</span> },
    { key: 'total', header: 'Total', align: 'right', sortable: true, sortValue: (row) => row.total, render: (row) => <span className="font-medium tabular-nums">{money(row.total)}</span> },
    { key: 'status', header: 'Estado', hideOnMobile: true, sortable: true, sortValue: (row) => row.estado, render: (row) => <StatusPill label={row.estado} tone={statusTone(row.estado)} /> },
    { key: 'actions', header: '', align: 'right', render: (row) => <button type="button" className="inline-flex items-center gap-1.5 text-xs font-medium text-accent transition-colors hover:text-accent-hover focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-accent-soft" onClick={() => onOpen(row.saleId)}>Ver venta <ExternalLink size={13} strokeWidth={1.5} /></button> },
  ]
}

export function DispatchesPage() {
  const state = useERPStore()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [warehouseFilter, setWarehouseFilter] = useState('todos')

  const allRows = useMemo<DispatchRow[]>(() => state.ventas.flatMap((sale) => {
    const movements = state.movimientosInventario.filter((movement) => movement.tipo === 'Salida por venta' && movement.referenciaId === sale.id)
    if (movements.length === 0) return []
    return [{
      saleId: sale.id,
      numero: sale.numero,
      fecha: sale.fecha,
      cliente: state.clientes.find((item) => item.id === sale.clienteId)?.razonSocial ?? 'Cliente no encontrado',
      almacen: state.almacenes.find((item) => item.id === sale.almacenId)?.nombre ?? 'Almacén no encontrado',
      lineas: movements.length,
      unidades: movements.reduce((total, movement) => total + movement.cantidad, 0),
      total: selectTotalVenta(state, sale.id),
      estado: selectEstadoVenta(state, sale.id, state.fechaReferencia),
    }]
  }).sort((first, second) => second.fecha.localeCompare(first.fecha)), [state])

  const rows = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return allRows.filter((row) => (warehouseFilter === 'todos' || row.almacen === warehouseFilter) && (!normalized || [row.numero, row.cliente, row.almacen, row.estado].some((value) => value.toLowerCase().includes(normalized))))
  }, [allRows, query, warehouseFilter])

  const totalUnits = allRows.reduce((total, row) => total + row.unidades, 0)
  const totalAmount = allRows.reduce((total, row) => total + row.total, 0)

  return <>
    <PageHeader title="Salidas por venta" description="Salidas de mercadería registradas al facturar ventas." />
    <PageContent>
      <div className="mb-6 grid gap-3 sm:grid-cols-3"><Summary label="Ventas con salida" value={allRows.length.toLocaleString('es-PE')} detail="Ventas con salida en kardex" icon={Package} /><Summary label="Unidades salidas" value={totalUnits.toLocaleString('es-PE')} detail="Unidades registradas en kardex" icon={ArrowDownToLine} /><Summary label="Valor de ventas" value={money(totalAmount)} detail="Importe de las ventas relacionadas" /></div>
      <div className="mb-5 flex items-start gap-3 rounded-xl bg-surface-muted px-4 py-3 text-sm text-text-soft"><ArrowDownToLine size={17} strokeWidth={1.5} className="mt-0.5 shrink-0 text-danger" /><div><p>Vista consolidada por venta.</p><p className="mt-1 text-xs text-text-muted">La facturación registra la salida en el kardex. La gestión logística independiente se podrá ampliar en una fase posterior.</p></div></div>
      <DataTable rows={rows} columns={dispatchColumns((id) => navigate(`/comercial/ventas/${id}`))} getRowId={(row) => row.saleId} selectedIds={selectedIds} onSelectedIdsChange={setSelectedIds} searchValue={query} onSearchChange={(value) => { setQuery(value); setPage(1) }} page={page} pageSize={10} onPageChange={setPage} totalCount={rows.length} responsive showSelectionSummary={false} toolbarActions={<Select aria-label="Filtrar salidas por almacén" value={warehouseFilter} onChange={(event) => { setWarehouseFilter(event.target.value); setPage(1) }} className="w-44"><option value="todos">Todos los almacenes</option>{state.almacenes.map((warehouse) => <option key={warehouse.id} value={warehouse.nombre}>{warehouse.nombre}</option>)}</Select>} emptyTitle="No hay salidas por venta" emptyDescription="Las salidas aparecerán cuando una venta sea facturada." />
    </PageContent>
  </>
}

function Summary({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon?: typeof Package }) {
  return <section className="rounded-2xl bg-surface-muted p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs text-text-muted">{label}</p><p className="mt-1 text-lg font-semibold text-text tabular-nums">{value}</p><p className="mt-1 text-xs text-text-muted">{detail}</p></div>{Icon ? <span className="grid size-9 place-items-center rounded-xl bg-surface text-text-muted"><Icon size={17} strokeWidth={1.5} /></span> : null}</div></section>
}
