import { ArrowLeft, Building2, CalendarDays, Mail, MapPin, Pencil, Phone, Save, ShoppingCart, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { PageContent, PageHeader } from '../../components/layout/PageLayout'
import { Button, Drawer, Input, Select, StatusPill, Tabs, Toast } from '../../components/ui'
import { usePermisos, useSesion } from '../../hooks'
import { useERPStore } from '../../store'
import { selectEstadoCompra, selectEstadoCuenta, selectSaldoCuenta, selectTotalCompra } from '../../store/selectors'
import { departamentosPeru, distritosPorProvincia, provinciasPorDepartamento } from '../../data/peruLocations'
import type { Proveedor } from '../../types'

type SupplierForm = Pick<Proveedor, 'razonSocial' | 'nombreComercial' | 'direccion' | 'distrito' | 'provincia' | 'departamento' | 'contactoNombre' | 'telefono' | 'email' | 'diasCredito' | 'estado'>
type DetailTab = 'resumen' | 'actividad'

function fromSupplier(proveedor: Proveedor): SupplierForm {
  return { razonSocial: proveedor.razonSocial, nombreComercial: proveedor.nombreComercial ?? '', direccion: proveedor.direccion, distrito: proveedor.distrito, provincia: proveedor.provincia, departamento: proveedor.departamento, contactoNombre: proveedor.contactoNombre ?? '', telefono: proveedor.telefono ?? '', email: proveedor.email ?? '', diasCredito: proveedor.diasCredito, estado: proveedor.estado }
}

function money(value: number) {
  return `S/ ${value.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`
}

function date(value: string) {
  return new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium' }).format(new Date(`${value.slice(0, 10)}T12:00:00Z`))
}

function DetailRow({ label, value, icon: Icon }: { label: string; value: string; icon?: typeof MapPin }) {
  return <div className="flex items-start justify-between gap-5 py-3.5"><div className="flex items-center gap-2 text-sm text-text-muted">{Icon ? <Icon size={15} strokeWidth={1.5} /> : null}{label}</div><span className="max-w-[65%] text-right text-sm font-medium text-text">{value}</span></div>
}

export function SupplierDetailPage() {
  const navigate = useNavigate()
  const { proveedorId } = useParams()
  const [searchParams] = useSearchParams()
  const state = useERPStore()
  const { usuarioActualId } = useSesion()
  const { puede } = usePermisos()
  const proveedor = state.proveedores.find((item) => item.id === proveedorId)
  const [tab, setTab] = useState<DetailTab>('resumen')
  const [editing, setEditing] = useState(searchParams.get('editar') === '1')
  const [form, setForm] = useState<SupplierForm | null>(proveedor ? fromSupplier(proveedor) : null)
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'danger' } | null>(null)
  const canEdit = puede('Proveedores', 'editar')

  useEffect(() => {
    if (proveedor) setForm(fromSupplier(proveedor))
  }, [proveedor])

  const provincias = form ? provinciasPorDepartamento(form.departamento) : []
  const distritos = form ? distritosPorProvincia(form.departamento, form.provincia) : []
  if (!proveedor || !form) return <><PageHeader title="Proveedor no encontrado" /><PageContent><Button variant="secondary" leadingIcon={ArrowLeft} onClick={() => navigate('/compras/proveedores')}>Volver a proveedores</Button></PageContent></>

  const compras = state.compras.filter((compra) => compra.proveedorId === proveedor.id).sort((a, b) => b.fecha.localeCompare(a.fecha))
  const cuentas = state.cuentasPagar.filter((cuenta) => cuenta.proveedorId === proveedor.id)
  const saldoCxp = cuentas.reduce((total, cuenta) => total + selectSaldoCuenta(state, cuenta.id), 0)
  const vencidas = cuentas.filter((cuenta) => selectEstadoCuenta(state, cuenta.id, state.fechaReferencia) === 'Vencida').length
  const totalCompras = compras.reduce((total, compra) => total + selectTotalCompra(state, compra.id), 0)
  const comprasRecibidas = compras.filter((compra) => ['Recibida', 'Facturada', 'Pagada'].includes(selectEstadoCompra(state, compra.id, state.fechaReferencia))).length

  const update = <K extends keyof SupplierForm>(key: K, value: SupplierForm[K]) => setForm((current) => current ? { ...current, [key]: value } : current)
  const updateDepartamento = (departamento: string) => { const provincia = provinciasPorDepartamento(departamento)[0] ?? ''; const distrito = distritosPorProvincia(departamento, provincia)[0] ?? ''; setForm((current) => current ? { ...current, departamento, provincia, distrito } : current) }
  const updateProvincia = (provincia: string) => { const distrito = distritosPorProvincia(form.departamento, provincia)[0] ?? ''; setForm((current) => current ? { ...current, provincia, distrito } : current) }
  const save = () => {
    if (!usuarioActualId) return
    const result = state.editarProveedor(proveedor.id, form, usuarioActualId)
    if (!result.ok) { setToast({ message: result.error, tone: 'danger' }); return }
    setEditing(false)
    setToast({ message: 'Ficha de proveedor actualizada.', tone: 'success' })
  }

  return <>
    <PageHeader title="Ficha de proveedor" description="Maestro de abastecimiento y relación de cuenta." actions={<><Button variant="secondary" leadingIcon={ArrowLeft} onClick={() => navigate('/compras/proveedores')}>Volver</Button>{canEdit ? <Button leadingIcon={Pencil} onClick={() => setEditing(true)}>Editar ficha</Button> : null}</>} />
    <PageContent>
      <section className="overflow-hidden rounded-2xl bg-surface-muted"><div className="flex flex-col justify-between gap-6 p-6 sm:flex-row sm:items-center sm:p-8"><div className="flex min-w-0 items-center gap-4"><span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-accent text-lg font-semibold text-white">{proveedor.razonSocial.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="truncate text-xl font-semibold tracking-tight text-text">{proveedor.razonSocial}</h2><StatusPill label={proveedor.estado} tone={proveedor.estado === 'Activo' ? 'success' : 'neutral'} /></div><p className="mt-1 text-sm text-text-muted">{proveedor.nombreComercial ?? 'Sin nombre comercial'} · {proveedor.tipoDocumento} {proveedor.numeroDocumento}</p><p className="mt-2 flex items-center gap-1.5 text-sm text-text-soft"><MapPin size={14} strokeWidth={1.5} />{proveedor.distrito}, {proveedor.provincia}, {proveedor.departamento}</p></div></div><div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:min-w-64"><div><p className="text-xs text-text-muted">Última actualización</p><p className="mt-1 font-medium text-text">{date(proveedor.actualizadoEn)}</p></div><div><p className="text-xs text-text-muted">Condición</p><p className="mt-1 font-medium text-text">{proveedor.diasCredito > 0 ? `Crédito ${proveedor.diasCredito} días` : 'Contado'}</p></div></div></div><div className="grid grid-cols-2 border-t border-border/60 sm:grid-cols-4"><Metric label="Compras" value={String(compras.length)} detail={`${comprasRecibidas} recibidas`} /><Metric label="Comprado" value={money(totalCompras)} detail="Acumulado" /><Metric label="CxP pendiente" value={money(saldoCxp)} detail={vencidas ? `${vencidas} vencida${vencidas === 1 ? '' : 's'}` : 'Sin vencimientos'} /><Metric label="Plazo acordado" value={`${proveedor.diasCredito} días`} detail="Condición comercial" /></div></section>
      <div className="mt-8"><Tabs tabs={[{ value: 'resumen', label: 'Resumen' }, { value: 'actividad', label: 'Actividad', count: compras.length }]} value={tab} onChange={setTab} /></div>
      {tab === 'resumen' ? <div className="mt-7 grid gap-8 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,.65fr)]"><section><h3 className="text-base font-semibold text-text">Información registrada</h3><p className="mt-1 text-sm text-text-muted">Datos de contacto y ubicación del proveedor.</p><div className="mt-4 divide-y divide-border/60"><DetailRow label="Razón social" value={proveedor.razonSocial} icon={Building2} /><DetailRow label="Documento" value={`${proveedor.tipoDocumento} ${proveedor.numeroDocumento}`} /><DetailRow label="Dirección" value={proveedor.direccion} icon={MapPin} /><DetailRow label="Ubicación" value={`${proveedor.distrito}, ${proveedor.provincia}, ${proveedor.departamento}`} icon={MapPin} /><DetailRow label="Contacto" value={proveedor.contactoNombre ?? 'No registrado'} icon={UserRound} /><DetailRow label="Teléfono" value={proveedor.telefono ?? 'No registrado'} icon={Phone} /><DetailRow label="Correo" value={proveedor.email ?? 'No registrado'} icon={Mail} /></div></section><aside><h3 className="text-base font-semibold text-text">Datos de relación</h3><div className="mt-3 divide-y divide-border/60"><DetailRow label="Alta en el sistema" value={date(proveedor.creadoEn)} icon={CalendarDays} /><DetailRow label="Última edición" value={date(proveedor.actualizadoEn)} icon={Pencil} /><DetailRow label="Operaciones" value={`${compras.length} compras`} icon={ShoppingCart} /><DetailRow label="Cuenta por pagar" value={money(saldoCxp)} /></div></aside></div> : <ActivityList state={state} compras={compras} />}
    </PageContent>
    <Drawer open={editing} title="Editar ficha de proveedor" onClose={() => setEditing(false)}><div className="space-y-5"><section><p className="text-xs font-medium text-text-muted">Identificación</p><div className="mt-3 space-y-4"><Input label="Razón social" value={form.razonSocial} onChange={(event) => update('razonSocial', event.target.value)} /><Input label="Nombre comercial" value={form.nombreComercial} onChange={(event) => update('nombreComercial', event.target.value)} /><Input label="Persona de contacto" value={form.contactoNombre} onChange={(event) => update('contactoNombre', event.target.value)} /></div></section><section><p className="text-xs font-medium text-text-muted">Ubicación</p><div className="mt-3 space-y-4"><Input label="Dirección" value={form.direccion} onChange={(event) => update('direccion', event.target.value)} /><Select label="Departamento" value={form.departamento} onChange={(event) => updateDepartamento(event.target.value)} options={departamentosPeru.map((item) => ({ value: item, label: item }))} /><Select label="Provincia" value={form.provincia} onChange={(event) => updateProvincia(event.target.value)} options={provincias.map((item) => ({ value: item, label: item }))} /><Select label="Distrito" value={form.distrito} onChange={(event) => update('distrito', event.target.value)} options={distritos.map((item) => ({ value: item, label: item }))} /></div></section><section><p className="text-xs font-medium text-text-muted">Contacto y condiciones</p><div className="mt-3 space-y-4"><Input label="Teléfono" value={form.telefono} onChange={(event) => update('telefono', event.target.value)} /><Input label="Correo" type="email" value={form.email} onChange={(event) => update('email', event.target.value)} /><Input label="Días de crédito" type="number" min="0" step="1" value={form.diasCredito} onChange={(event) => update('diasCredito', Number(event.target.value))} /><Select label="Estado" value={form.estado} onChange={(event) => update('estado', event.target.value as Proveedor['estado'])} options={[{ value: 'Activo', label: 'Activo' }, { value: 'Inactivo', label: 'Inactivo' }]} /></div></section><div className="flex justify-end gap-2 border-t border-border pt-5"><Button variant="secondary" onClick={() => setEditing(false)}>Cancelar</Button><Button leadingIcon={Save} onClick={save}>Guardar cambios</Button></div></div></Drawer>
    {toast ? <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} /> : null}
  </>
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="border-r border-border/60 px-5 py-4 last:border-r-0 sm:px-6"><p className="text-xs text-text-muted">{label}</p><p className="mt-1 truncate text-base font-semibold text-text tabular-nums">{value}</p><p className="mt-1 truncate text-xs text-text-muted">{detail}</p></div>
}

function ActivityList({ state, compras }: { state: ReturnType<typeof useERPStore.getState>; compras: ReturnType<typeof useERPStore.getState>['compras'] }) {
  return <section><div className="flex items-end justify-between gap-4"><div><h3 className="text-base font-semibold text-text">Actividad de abastecimiento</h3><p className="mt-1 text-sm text-text-muted">Compras asociadas a este proveedor.</p></div><ShoppingCart size={20} strokeWidth={1.5} className="text-text-muted" /></div><div className="mt-5 divide-y divide-border/60">{compras.length === 0 ? <p className="py-10 text-sm text-text-muted">Todavía no hay compras asociadas.</p> : compras.map((compra) => { const estado = selectEstadoCompra(state, compra.id, state.fechaReferencia); return <div key={compra.id} className="flex flex-wrap items-center justify-between gap-4 py-4"><div><p className="text-sm font-medium text-text">{compra.numero}</p><p className="mt-1 flex items-center gap-1.5 text-xs text-text-muted"><CalendarDays size={13} strokeWidth={1.5} />{date(compra.fecha)}</p></div><div className="flex items-center gap-4"><StatusPill label={estado} tone={estado === 'Pagada' ? 'success' : estado === 'Anulada' ? 'danger' : estado === 'Facturada' || estado === 'Recibida' ? 'accent' : 'warning'} /><span className="text-sm font-semibold text-text tabular-nums">{money(selectTotalCompra(state, compra.id))}</span></div></div> })}</div></section>
}
