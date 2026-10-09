import { ArrowRight, Boxes, Pencil } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DataTable, type DataTableColumn } from '../../components/data-display/DataTable'
import { PageContent, PageHeader } from '../../components/layout/PageLayout'
import { Avatar, Dropdown, Select, StatusPill } from '../../components/ui'
import { usePermisos } from '../../hooks'
import { useERPStore } from '../../store'
import { selectStockDisponible } from '../../store/selectors'
import type { Producto } from '../../types'

function tone(critical: boolean, status: Producto['estado']) {
  if (status === 'Inactivo') return 'neutral' as const
  return critical ? 'warning' as const : 'success' as const
}

function productColumns(state: ReturnType<typeof useERPStore.getState>, onOpen: (id: string) => void, onEdit: (id: string) => void, canEdit: boolean): DataTableColumn<Producto>[] {
  return [
    { key: 'product', header: 'Producto', sortable: true, sortValue: (row) => row.nombre, render: (row) => <div className="flex items-center gap-3"><Avatar name={row.nombre} size="sm" /><div className="min-w-0"><span className="block truncate font-medium text-text">{row.nombre}</span><span className="mt-0.5 block truncate text-xs text-text-muted">{row.sku} · {row.unidadMedida}</span></div></div> },
    { key: 'category', header: 'Categoría', hideOnMobile: true, sortable: true, sortValue: (row) => state.categorias.find((item) => item.id === row.categoriaId)?.nombre ?? '', render: (row) => state.categorias.find((item) => item.id === row.categoriaId)?.nombre ?? 'Sin categoría' },
    { key: 'stock', header: 'Disponible', sortable: true, align: 'right', sortValue: (row) => state.almacenes.reduce((total, almacen) => total + selectStockDisponible(state, row.id, almacen.id), 0), render: (row) => { const available = state.almacenes.reduce((total, almacen) => total + selectStockDisponible(state, row.id, almacen.id), 0); const critical = available <= row.stockMinimo; return <div className="flex min-w-20 flex-col items-end gap-0.5 text-right"><span className="whitespace-nowrap font-semibold text-text tabular-nums">{available.toLocaleString('es-PE')} <span className="text-xs font-normal text-text-muted">{row.unidadMedida}</span></span><span className="flex items-center gap-2 whitespace-nowrap text-xs text-text-muted" title="Cantidad mínima configurada para activar la alerta de stock crítico">Mínimo {row.stockMinimo}{critical ? <StatusPill label="Crítico" tone={tone(true, row.estado)} /> : null}</span></div> } },
    { key: 'price', header: 'Precio', hideOnMobile: true, align: 'right', sortable: true, sortValue: (row) => row.precioVenta, render: (row) => <span className="font-medium text-text tabular-nums">S/ {row.precioVenta.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span> },
    { key: 'status', header: 'Estado', hideOnMobile: true, sortable: true, sortValue: (row) => row.estado, render: (row) => <StatusPill label={row.estado} tone={row.estado === 'Activo' ? 'success' : 'neutral'} /> },
    { key: 'actions', header: '', align: 'right', render: (row) => <Dropdown items={[{ label: 'Ver ficha', icon: ArrowRight, onSelect: () => onOpen(row.id) }, ...(canEdit ? [{ label: 'Editar ficha', icon: Pencil, onSelect: () => onEdit(row.id) }] : [])]} /> },
  ]
}

export function ProductsPage() {
  const navigate = useNavigate()
  const state = useERPStore()
  const { puede } = usePermisos()
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [categoryFilter, setCategoryFilter] = useState('todas')
  const [stockFilter, setStockFilter] = useState<'todos' | 'critico' | 'disponible'>('todos')
  const canEdit = puede('Productos', 'editar')

  const rows = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return state.productos.filter((producto) => {
      const category = state.categorias.find((item) => item.id === producto.categoriaId)
      const available = state.almacenes.reduce((total, almacen) => total + selectStockDisponible(state, producto.id, almacen.id), 0)
      const matchesQuery = !normalized || [producto.nombre, producto.sku, producto.codigoBarras, category?.nombre, producto.estado].some((value) => value?.toLowerCase().includes(normalized))
      const matchesCategory = categoryFilter === 'todas' || producto.categoriaId === categoryFilter
      const matchesStock = stockFilter === 'todos' || (stockFilter === 'critico' ? available <= producto.stockMinimo : available > producto.stockMinimo)
      return matchesQuery && matchesCategory && matchesStock
    })
  }, [categoryFilter, query, state, stockFilter])

  useEffect(() => setPage(1), [query])

  const resetFilter = <T,>(setter: (value: T) => void, value: T) => { setter(value); setPage(1) }
  return <><PageHeader title="Productos" description="Maestro de productos y disponibilidad por almacén." /><PageContent><div className="mb-5 flex items-center justify-between gap-4 rounded-xl bg-surface-muted px-4 py-3 text-sm text-text-soft"><div className="flex items-center gap-2"><Boxes size={17} strokeWidth={1.5} className="text-text-muted" /><span>{state.productos.length} productos registrados</span></div><span className="hidden text-xs text-text-muted sm:block">El stock se calcula desde el kardex.</span></div><DataTable rows={rows} columns={productColumns(state, (id) => navigate(`/inventario/productos/${id}`), (id) => navigate(`/inventario/productos/${id}?editar=1`), canEdit)} getRowId={(row) => row.id} selectedIds={selectedIds} onSelectedIdsChange={setSelectedIds} searchValue={query} onSearchChange={(value) => { setQuery(value); setPage(1) }} page={page} pageSize={10} onPageChange={setPage} totalCount={rows.length} responsive showSelectionSummary={false} toolbarActions={<div className="flex flex-wrap gap-2"><Select aria-label="Filtrar productos por categoría" value={categoryFilter} onChange={(event) => resetFilter(setCategoryFilter, event.target.value)} className="w-40"><option value="todas">Todas las categorías</option>{state.categorias.map((category) => <option key={category.id} value={category.id}>{category.nombre}</option>)}</Select><Select aria-label="Filtrar productos por stock" value={stockFilter} onChange={(event) => resetFilter(setStockFilter, event.target.value as 'todos' | 'critico' | 'disponible')} className="w-36"><option value="todos">Todo el stock</option><option value="critico">Stock crítico</option><option value="disponible">Sobre mínimo</option></Select></div>} emptyTitle="No encontramos productos" emptyDescription="Prueba con otro nombre, SKU, categoría o filtro." /></PageContent></>
}
