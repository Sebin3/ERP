import { ArrowLeft, Building2, CalendarDays, Mail, MapPin, Pencil, Phone, Save, ShoppingBag } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { PageContent, PageHeader } from '../../components/layout/PageLayout'
import { Button, Drawer, Input, Select, StatusPill, Tabs, Toast } from '../../components/ui'
import { usePermisos, useSesion } from '../../hooks'
import { useERPStore } from '../../store'
import { selectEstadoCuenta, selectEstadoVenta, selectSaldoCuenta, selectTotalVenta } from '../../store/selectors'
import { departamentosPeru, distritosPorProvincia, provinciasPorDepartamento } from '../../data/peruLocations'
import type { Cliente } from '../../types'

type ClientForm = Pick<Cliente, 'razonSocial' | 'nombreComercial' | 'direccion' | 'distrito' | 'provincia' | 'departamento' | 'telefono' | 'email' | 'limiteCredito' | 'diasCredito' | 'estado'>
type DetailTab = 'resumen' | 'actividad'

function fromClient(cliente: Cliente): ClientForm {
  return { razonSocial: cliente.razonSocial, nombreComercial: cliente.nombreComercial ?? '', direccion: cliente.direccion, distrito: cliente.distrito, provincia: cliente.provincia, departamento: cliente.departamento, telefono: cliente.telefono ?? '', email: cliente.email ?? '', limiteCredito: cliente.limiteCredito, diasCredito: cliente.diasCredito, estado: cliente.estado }
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

export function ClientDetailPage() {
  const navigate = useNavigate()
  const { clienteId } = useParams()
  const [searchParams] = useSearchParams()
  const state = useERPStore()
  const { usuarioActualId } = useSesion()
  const { puede } = usePermisos()
  const cliente = state.clientes.find((item) => item.id === clienteId)
  const [tab, setTab] = useState<DetailTab>('resumen')
  const [editing, setEditing] = useState(searchParams.get('editar') === '1')
  const [form, setForm] = useState<ClientForm | null>(cliente ? fromClient(cliente) : null)
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'danger' } | null>(null)
  const canEdit = puede('Clientes', 'editar')

  useEffect(() => {
    if (cliente) setForm(fromClient(cliente))
  }, [cliente])

  const provincias = form ? provinciasPorDepartamento(form.departamento) : []
  const distritos = form ? distritosPorProvincia(form.departamento, form.provincia) : []

  if (!cliente || !form) return <><PageHeader title="Cliente no encontrado" /><PageContent><Button variant="secondary" leadingIcon={ArrowLeft} onClick={() => navigate('/comercial/clientes')}>Volver a clientes</Button></PageContent></>

  const ventas = state.ventas.filter((venta) => venta.clienteId === cliente.id).sort((a, b) => b.fecha.localeCompare(a.fecha))
  const cuentas = state.cuentasCobrar.filter((cuenta) => cuenta.clienteId === cliente.id)
  const saldoCxc = cuentas.reduce((total, cuenta) => total + selectSaldoCuenta(state, cuenta.id), 0)
  const vencidas = cuentas.filter((cuenta) => selectEstadoCuenta(state, cuenta.id, state.fechaReferencia) === 'Vencida').length
  const totalVentas = ventas.reduce((total, venta) => total + selectTotalVenta(state, venta.id), 0)
  const ventasFacturadas = ventas.filter((venta) => ['Facturado', 'Cobrado'].includes(selectEstadoVenta(state, venta.id, state.fechaReferencia))).length
  const creditoDisponible = Math.max(0, cliente.limiteCredito - saldoCxc)
  const creditoUsadoPct = cliente.limiteCredito === 0 ? 0 : Math.min(100, (saldoCxc / cliente.limiteCredito) * 100)
  const update = <K extends keyof ClientForm>(key: K, value: ClientForm[K]) => setForm((current) => current ? { ...current, [key]: value } : current)
  const updateDepartamento = (departamento: string) => {
    const nextProvincias = provinciasPorDepartamento(departamento)
    const provincia = nextProvincias[0] ?? ''
    const distrito = distritosPorProvincia(departamento, provincia)[0] ?? ''
    setForm((current) => current ? { ...current, departamento, provincia, distrito } : current)
  }
  const updateProvincia = (provincia: string) => {
    const distrito = distritosPorProvincia(form.departamento, provincia)[0] ?? ''
    setForm((current) => current ? { ...current, provincia, distrito } : current)
  }
  const save = () => {
    if (!usuarioActualId) return
    const result = state.editarCliente(cliente.id, form, usuarioActualId)
    if (!result.ok) { setToast({ message: result.error, tone: 'danger' }); return }
    setEditing(false)
    setToast({ message: 'Ficha de cliente actualizada.', tone: 'success' })
  }

  return <>
    <PageHeader title="Ficha de cliente" description="Maestro comercial y relación de cuenta." actions={<><Button variant="secondary" leadingIcon={ArrowLeft} onClick={() => navigate('/comercial/clientes')}>Volver</Button>{canEdit ? <Button leadingIcon={Pencil} onClick={() => setEditing(true)}>Editar ficha</Button> : null}</>} />
    <PageContent>
      <section className="overflow-hidden rounded-2xl bg-surface-muted">
        <div className="flex flex-col justify-between gap-6 p-6 sm:flex-row sm:items-center sm:p-8">
          <div className="flex min-w-0 items-center gap-4"><span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-accent text-lg font-semibold text-white">{cliente.razonSocial.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="truncate text-xl font-semibold tracking-tight text-text">{cliente.razonSocial}</h2><StatusPill label={cliente.estado} tone={cliente.estado === 'Activo' ? 'success' : 'neutral'} /></div><p className="mt-1 text-sm text-text-muted">{cliente.nombreComercial ?? 'Sin nombre comercial'} · {cliente.tipoDocumento} {cliente.numeroDocumento}</p><p className="mt-2 flex items-center gap-1.5 text-sm text-text-soft"><MapPin size={14} strokeWidth={1.5} />{cliente.distrito}, {cliente.provincia}, {cliente.departamento}</p></div></div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:min-w-64"><div><p className="text-xs text-text-muted">Última actualización</p><p className="mt-1 font-medium text-text">{date(cliente.actualizadoEn)}</p></div><div><p className="text-xs text-text-muted">Condición</p><p className="mt-1 font-medium text-text">{cliente.diasCredito > 0 ? `Crédito ${cliente.diasCredito} días` : 'Contado'}</p></div></div>
        </div>
        <div className="grid grid-cols-2 border-t border-border/60 sm:grid-cols-4"><Metric label="Ventas" value={String(ventas.length)} detail={`${ventasFacturadas} facturadas`} /><Metric label="Facturado" value={money(totalVentas)} detail="Acumulado" /><Metric label="CxC pendiente" value={money(saldoCxc)} detail={vencidas ? `${vencidas} vencida${vencidas === 1 ? '' : 's'}` : 'Sin vencimientos'} /><Metric label="Crédito disponible" value={money(creditoDisponible)} detail={`Límite ${money(cliente.limiteCredito)}`} /></div>
      </section>

      <div className="mt-8"><Tabs tabs={[{ value: 'resumen', label: 'Resumen' }, { value: 'actividad', label: 'Actividad', count: ventas.length }]} value={tab} onChange={setTab} /></div>
      {tab === 'resumen' ? <div className="mt-7 grid gap-8 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,.65fr)]"><section><h3 className="text-base font-semibold text-text">Información registrada</h3><p className="mt-1 text-sm text-text-muted">Datos que identifican y describen la relación comercial.</p><div className="mt-4 divide-y divide-border/60"><DetailRow label="Razón social" value={cliente.razonSocial} icon={Building2} /><DetailRow label="Documento" value={`${cliente.tipoDocumento} ${cliente.numeroDocumento}`} /><DetailRow label="Dirección" value={cliente.direccion} icon={MapPin} /><DetailRow label="Ubicación" value={`${cliente.distrito}, ${cliente.provincia}, ${cliente.departamento}`} icon={MapPin} /><DetailRow label="Teléfono" value={cliente.telefono ?? 'No registrado'} icon={Phone} /><DetailRow label="Correo" value={cliente.email ?? 'No registrado'} icon={Mail} /></div></section><aside className="space-y-7"><section><h3 className="text-base font-semibold text-text">Estado de crédito</h3><div className="mt-4 rounded-2xl bg-surface-muted p-5"><div className="flex items-end justify-between gap-3"><div><p className="text-xs text-text-muted">Utilizado</p><p className="mt-1 text-2xl font-semibold tracking-tight text-text tabular-nums">{money(saldoCxc)}</p></div><span className="text-sm font-medium text-text-muted tabular-nums">{creditoUsadoPct.toFixed(0)}%</span></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-border/60"><div className="h-full rounded-full bg-accent transition-[width] duration-200" style={{ width: `${creditoUsadoPct}%` }} /></div><div className="mt-3 flex justify-between text-xs text-text-muted"><span>Disponible {money(creditoDisponible)}</span><span>Límite {money(cliente.limiteCredito)}</span></div></div></section><section><h3 className="text-base font-semibold text-text">Datos de relación</h3><div className="mt-3 divide-y divide-border/60"><DetailRow label="Alta en el sistema" value={date(cliente.creadoEn)} icon={CalendarDays} /><DetailRow label="Última edición" value={date(cliente.actualizadoEn)} icon={Pencil} /><DetailRow label="Operaciones" value={`${ventas.length} ventas`} icon={ShoppingBag} /></div></section></aside></div> : <ActivityList state={state} ventas={ventas} />}
    </PageContent>
    <Drawer open={editing} title="Editar ficha de cliente" onClose={() => setEditing(false)}><div className="space-y-5"><section><p className="text-xs font-medium text-text-muted">Identificación</p><div className="mt-3 space-y-4"><Input label="Razón social" value={form.razonSocial} onChange={(event) => update('razonSocial', event.target.value)} /><Input label="Nombre comercial" value={form.nombreComercial} onChange={(event) => update('nombreComercial', event.target.value)} /></div></section><section><p className="text-xs font-medium text-text-muted">Ubicación</p><div className="mt-3 space-y-4"><Input label="Dirección" value={form.direccion} onChange={(event) => update('direccion', event.target.value)} /><Select label="Departamento" value={form.departamento} onChange={(event) => updateDepartamento(event.target.value)} options={departamentosPeru.map((item) => ({ value: item, label: item }))} /><Select label="Provincia" value={form.provincia} onChange={(event) => updateProvincia(event.target.value)} options={provincias.map((item) => ({ value: item, label: item }))} /><Select label="Distrito" value={form.distrito} onChange={(event) => update('distrito', event.target.value)} options={distritos.map((item) => ({ value: item, label: item }))} /></div></section><section><p className="text-xs font-medium text-text-muted">Contacto y crédito</p><div className="mt-3 space-y-4"><Input label="Teléfono" value={form.telefono} onChange={(event) => update('telefono', event.target.value)} /><Input label="Correo" type="email" value={form.email} onChange={(event) => update('email', event.target.value)} /><div className="grid gap-4 sm:grid-cols-2"><Input label="Límite de crédito" type="number" min="0" step="0.01" value={form.limiteCredito} onChange={(event) => update('limiteCredito', Number(event.target.value))} /><Input label="Días de crédito" type="number" min="0" step="1" value={form.diasCredito} onChange={(event) => update('diasCredito', Number(event.target.value))} /></div><Select label="Estado" value={form.estado} onChange={(event) => update('estado', event.target.value as Cliente['estado'])} options={[{ value: 'Activo', label: 'Activo' }, { value: 'Inactivo', label: 'Inactivo' }]} /></div></section><div className="flex justify-end gap-2 border-t border-border pt-5"><Button variant="secondary" onClick={() => setEditing(false)}>Cancelar</Button><Button leadingIcon={Save} onClick={save}>Guardar cambios</Button></div></div></Drawer>
    {toast ? <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} /> : null}
  </>
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="border-r border-border/60 px-5 py-4 last:border-r-0 sm:px-6"><p className="text-xs text-text-muted">{label}</p><p className="mt-1 truncate text-base font-semibold text-text tabular-nums">{value}</p><p className="mt-1 truncate text-xs text-text-muted">{detail}</p></div>
}

function ActivityList({ state, ventas }: { state: ReturnType<typeof useERPStore.getState>; ventas: ReturnType<typeof useERPStore.getState>['ventas'] }) {
  return <section><div className="flex items-end justify-between gap-4"><div><h3 className="text-base font-semibold text-text">Actividad comercial</h3><p className="mt-1 text-sm text-text-muted">Ventas asociadas a este cliente.</p></div><ShoppingBag size={20} strokeWidth={1.5} className="text-text-muted" /></div><div className="mt-5 divide-y divide-border/60">{ventas.length === 0 ? <p className="py-10 text-sm text-text-muted">Todavía no hay ventas asociadas.</p> : ventas.map((venta) => { const estado = selectEstadoVenta(state, venta.id, state.fechaReferencia); return <div key={venta.id} className="flex flex-wrap items-center justify-between gap-4 py-4"><div><p className="text-sm font-medium text-text">{venta.numero}</p><p className="mt-1 flex items-center gap-1.5 text-xs text-text-muted"><CalendarDays size={13} strokeWidth={1.5} />{date(venta.fecha)}</p></div><div className="flex items-center gap-4"><StatusPill label={estado} tone={estado === 'Cobrado' ? 'success' : estado === 'Anulado' ? 'danger' : estado === 'Facturado' || estado === 'Aprobado' ? 'accent' : 'warning'} /><span className="text-sm font-semibold text-text tabular-nums">{money(selectTotalVenta(state, venta.id))}</span></div></div> })}</div></section>
}
