import { ArrowLeft, CalendarDays, MapPin, Pencil, Save, Warehouse } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { DataTable, type DataTableColumn } from '../../components/data-display/DataTable'
import { PageContent, PageHeader } from '../../components/layout/PageLayout'
import { Button, Drawer, Input, Select, StatusPill, Toast } from '../../components/ui'
import { usePermisos } from '../../hooks'
import { useERPStore } from '../../store'
import { selectCostoPromedio, selectReservado, selectStock, selectStockDisponible } from '../../store/selectors'
import type { Almacen, Producto } from '../../types'

type WarehouseForm = Pick<Almacen, 'codigo' | 'nombre' | 'direccion' | 'responsableUsuarioId' | 'estado'>
type WarehouseProduct = { producto: Producto; stock: number; reservado: number; disponible: number; costo: number; valor: number }
type ToastState = { message: string; tone: 'success' | 'danger' }

const date = (value?: string) => value ? new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)) : 'No registrado'
const money = (value: number) => `S/ ${value.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`

function stockColumns(): DataTableColumn<WarehouseProduct>[] {
  return [
    { key: 'product', header: 'Producto', sortable: true, sortValue: (row) => row.producto.nombre, render: (row) => <div className="min-w-0"><span className="block truncate font-medium text-text">{row.producto.nombre}</span><span className="mt-0.5 block text-xs text-text-muted">{row.producto.sku}</span></div> },
    { key: 'stock', header: 'Stock físico', align: 'right', sortable: true, sortValue: (row) => row.stock, render: (row) => <span className="tabular-nums">{row.stock.toLocaleString('es-PE')} {row.producto.unidadMedida}</span> },
    { key: 'reserved', header: 'Reservado', hideOnMobile: true, align: 'right', sortable: true, sortValue: (row) => row.reservado, render: (row) => <span className="tabular-nums">{row.reservado.toLocaleString('es-PE')}</span> },
    { key: 'available', header: 'Disponible', align: 'right', sortable: true, sortValue: (row) => row.disponible, render: (row) => <div className="text-right"><span className="block font-semibold text-text tabular-nums">{row.disponible.toLocaleString('es-PE')} {row.producto.unidadMedida}</span><span className="mt-0.5 block text-xs text-text-muted">mín. {row.producto.stockMinimo}</span></div> },
    { key: 'value', header: 'Valor', hideOnMobile: true, align: 'right', sortable: true, sortValue: (row) => row.valor, render: (row) => <span className="font-medium tabular-nums">{money(row.valor)}</span> },
  ]
}

export function WarehouseDetailPage() {
  const navigate = useNavigate()
  const { almacenId } = useParams<{ almacenId: string }>()
  const [searchParams] = useSearchParams()
  const state = useERPStore()
  const { puede } = usePermisos()
  const warehouse = state.almacenes.find((item) => item.id === almacenId)
  const [editing, setEditing] = useState(searchParams.get('editar') === '1')
  const [toast, setToast] = useState<ToastState | null>(null)
  const [form, setForm] = useState<WarehouseForm | null>(warehouse ? { codigo: warehouse.codigo, nombre: warehouse.nombre, direccion: warehouse.direccion, responsableUsuarioId: warehouse.responsableUsuarioId, estado: warehouse.estado } : null)
  const [stockQuery, setStockQuery] = useState('')
  const [stockPage, setStockPage] = useState(1)
  const [stockSelectedIds, setStockSelectedIds] = useState<string[]>([])

  useEffect(() => {
    if (!warehouse) return
    setForm({ codigo: warehouse.codigo, nombre: warehouse.nombre, direccion: warehouse.direccion, responsableUsuarioId: warehouse.responsableUsuarioId, estado: warehouse.estado })
  }, [warehouse])

  const stockRows = useMemo(() => !warehouse ? [] : state.productos.filter((product) => product.estado === 'Activo' && selectStock(state, product.id, warehouse.id) > 0).map((product) => {
    const stock = selectStock(state, product.id, warehouse.id)
    const reservado = selectReservado(state, product.id, warehouse.id)
    const disponible = selectStockDisponible(state, product.id, warehouse.id)
    const costo = selectCostoPromedio(state, product.id, warehouse.id)
    return { producto: product, stock, reservado, disponible, costo, valor: stock * costo }
  }), [state, warehouse])

  const filteredStockRows = useMemo(() => {
    const normalized = stockQuery.trim().toLowerCase()
    if (!normalized) return stockRows
    return stockRows.filter((row) => [row.producto.nombre, row.producto.sku, row.producto.unidadMedida].some((value) => value.toLowerCase().includes(normalized)))
  }, [stockQuery, stockRows])

  if (!warehouse || !form) return <><PageHeader title="Almacén no encontrado" /><PageContent><Button variant="secondary" leadingIcon={ArrowLeft} onClick={() => navigate('/inventario/almacenes')}>Volver a almacenes</Button></PageContent></>

  const totalStock = stockRows.reduce((total, row) => total + row.stock, 0)
  const totalValue = stockRows.reduce((total, row) => total + row.valor, 0)
  const critical = stockRows.filter((row) => row.disponible <= row.producto.stockMinimo).length
  const responsible = state.usuarios.find((user) => user.id === warehouse.responsableUsuarioId)
  const update = <K extends keyof WarehouseForm>(key: K, value: WarehouseForm[K]) => setForm((current) => current ? { ...current, [key]: value } : current)
  const save = () => {
    if (!state.usuarioActualId) return
    const result = state.editarAlmacen(warehouse.id, form, state.usuarioActualId)
    if (!result.ok) { setToast({ message: result.error, tone: 'danger' }); return }
    setEditing(false)
    setToast({ message: 'Ficha de almacén actualizada.', tone: 'success' })
  }

  return <>
    <PageHeader title="Ficha de almacén" description="Ubicación, responsable y existencias derivadas del kardex." actions={<><Button variant="secondary" leadingIcon={ArrowLeft} onClick={() => navigate('/inventario/almacenes')}>Volver</Button>{puede('Almacenes', 'editar') ? <Button leadingIcon={Pencil} onClick={() => setEditing(true)}>Editar ficha</Button> : null}</>} />
    <PageContent>
      <section className="overflow-hidden rounded-2xl bg-surface-muted"><div className="flex flex-col justify-between gap-6 p-6 sm:flex-row sm:items-center sm:p-8"><div className="flex min-w-0 items-center gap-4"><span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-accent text-white"><Warehouse size={25} strokeWidth={1.5} /></span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="truncate text-xl font-semibold tracking-tight text-text">{warehouse.nombre}</h2><StatusPill label={warehouse.estado} tone={warehouse.estado === 'Activo' ? 'success' : 'neutral'} /></div><p className="mt-1 text-sm text-text-muted">{warehouse.codigo}</p><p className="mt-2 flex items-center gap-1.5 text-sm text-text-soft"><MapPin size={14} strokeWidth={1.5} />{warehouse.direccion}</p></div></div><div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:min-w-60"><div><p className="text-xs text-text-muted">Responsable</p><p className="mt-1 truncate font-medium text-text">{responsible ? `${responsible.nombres} ${responsible.apellidos}` : 'Sin asignar'}</p></div><div><p className="text-xs text-text-muted">Última edición</p><p className="mt-1 font-medium text-text">{date(warehouse.actualizadoEn)}</p></div></div></div><div className="grid grid-cols-2 border-t border-border/60 sm:grid-cols-4"><Metric label="Productos" value={String(stockRows.length)} detail="Con existencia" /><Metric label="Stock físico" value={totalStock.toLocaleString('es-PE')} detail="Unidades" /><Metric label="Valor" value={money(totalValue)} detail="Costo promedio" /><Metric label="Stock crítico" value={String(critical)} detail={critical ? 'Requiere atención' : 'Sin alertas'} /></div></section>
      <section className="mt-8"><div className="flex items-end justify-between gap-4"><div><h3 className="text-base font-semibold text-text">Existencias por producto</h3><p className="mt-1 text-sm text-text-muted">Disponible = físico menos reservas activas.</p></div><Button variant="ghost" size="sm" onClick={() => navigate(`/inventario/kardex?almacen=${warehouse.id}`)}>Ver Kardex</Button></div><div className="mt-4"><DataTable rows={filteredStockRows} columns={stockColumns()} getRowId={(row) => row.producto.id} selectedIds={stockSelectedIds} onSelectedIdsChange={setStockSelectedIds} searchValue={stockQuery} onSearchChange={(value) => { setStockQuery(value); setStockPage(1) }} page={stockPage} pageSize={10} onPageChange={setStockPage} totalCount={filteredStockRows.length} responsive showSelectionSummary={false} emptyTitle="Sin existencias" emptyDescription="Este almacén todavía no tiene movimientos con saldo positivo." /></div></section>
      <section className="mt-8 grid gap-8 lg:grid-cols-2"><div><h3 className="text-base font-semibold text-text">Información registrada</h3><div className="mt-4 divide-y divide-border/60"><DetailRow label="Código interno" value={warehouse.codigo} /><DetailRow label="Dirección" value={warehouse.direccion} icon={MapPin} /><DetailRow label="Responsable" value={responsible ? `${responsible.nombres} ${responsible.apellidos}` : 'Sin asignar'} /><DetailRow label="Alta en el sistema" value={date(warehouse.creadoEn)} icon={CalendarDays} /></div></div><div><h3 className="text-base font-semibold text-text">Regla de inventario</h3><p className="mt-4 text-sm leading-6 text-text-muted">Las existencias de este almacén se calculan sumando los movimientos del kardex. Las transferencias, recepciones, ventas y ajustes aprobados son los únicos procesos que pueden cambiar el saldo.</p></div></section>
    </PageContent>
    <Drawer open={editing} title="Editar ficha de almacén" onClose={() => setEditing(false)}><div className="space-y-5"><Input label="Código" value={form.codigo} onChange={(event) => update('codigo', event.target.value)} /><Input label="Nombre" value={form.nombre} onChange={(event) => update('nombre', event.target.value)} /><Input label="Dirección" value={form.direccion} onChange={(event) => update('direccion', event.target.value)} /><Select label="Responsable" value={form.responsableUsuarioId ?? ''} onChange={(event) => update('responsableUsuarioId', event.target.value || undefined)} options={[{ value: '', label: 'Sin asignar' }, ...state.usuarios.filter((user) => user.estado === 'Activo').map((user) => ({ value: user.id, label: `${user.nombres} ${user.apellidos}` }))]} /><Select label="Estado" value={form.estado} onChange={(event) => update('estado', event.target.value as Almacen['estado'])} options={[{ value: 'Activo', label: 'Activo' }, { value: 'Inactivo', label: 'Inactivo' }]} /><div className="flex justify-end gap-2 border-t border-border pt-5"><Button variant="secondary" onClick={() => setEditing(false)}>Cancelar</Button><Button leadingIcon={Save} onClick={save}>Guardar cambios</Button></div></div></Drawer>
    {toast ? <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} /> : null}
  </>
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="border-r border-border/60 px-5 py-4 last:border-r-0 sm:px-6"><p className="text-xs text-text-muted">{label}</p><p className="mt-1 truncate text-base font-semibold text-text tabular-nums">{value}</p><p className="mt-1 truncate text-xs text-text-muted">{detail}</p></div>
}

function DetailRow({ label, value, icon: Icon }: { label: string; value: string; icon?: typeof MapPin }) {
  return <div className="flex items-center justify-between gap-4 py-3 text-sm"><span className="inline-flex items-center gap-2 text-text-muted">{Icon ? <Icon size={14} strokeWidth={1.5} /> : null}{label}</span><span className="text-right font-medium text-text">{value}</span></div>
}
