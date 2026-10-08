import { FileQuestion } from 'lucide-react'
import { useState } from 'react'
import { PageContent, PageHeader } from '../components/layout/PageLayout'
import { Button, Drawer, EmptyState, Input, Select, Toast } from '../components/ui'
import type { NavigationRoute } from '../modules/navigation'
import { useERPStore } from '../store'

export function PlaceholderPage({ route }: { route: NavigationRoute }) {
  return <><PageHeader title={route.label} /><PageContent><EmptyState icon={FileQuestion} title="Esta pantalla se construirá en una fase posterior" description="La estructura de navegación ya está lista. El contenido operativo llegará en una fase posterior." /></PageContent></>
}

export function NotFoundPage() {
  return <><PageHeader title="Página no encontrada" /><PageContent><EmptyState icon={FileQuestion} title="No encontramos esta ruta" description="Vuelve al Dashboard para continuar explorando EnterpriseCloud." /></PageContent></>
}

export function NoAccessPage() {
  return <><PageHeader title="Sin acceso" /><PageContent><EmptyState icon={FileQuestion} title="No tienes permiso para ver esta pantalla" description="Solicita el acceso a un Administrador para continuar." /></PageContent></>
}

export function ConfigurationPage() {
  const state = useERPStore()
  const restablecer = state.restablecerDatosEjemplo
  const warehouse = state.almacenes.find((item) => item.id === state.configuracion.almacenPorDefectoId)
  const [editing, setEditing] = useState(false)
  const [igv, setIgv] = useState(state.configuracion.igvPorDefecto * 100)
  const [warehouseId, setWarehouseId] = useState(state.configuracion.almacenPorDefectoId)
  const [company, setCompany] = useState(state.configuracion.datosEmpresa)
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'danger' } | null>(null)
  const reset = () => {
    if (!window.confirm('¿Deseas reemplazar los datos actuales por la semilla de ejemplo? Esta acción cerrará la sesión.')) return
    restablecer()
  }
  const save = () => { if (!state.usuarioActualId) return; const result = state.editarConfiguracion({ usuarioId: state.usuarioActualId, igvPorDefecto: igv / 100, almacenPorDefectoId: warehouseId, datosEmpresa: company }); if (!result.ok) { setToast({ message: result.error, tone: 'danger' }); return }; setEditing(false); setToast({ message: 'Configuración actualizada correctamente.', tone: 'success' }) }
  return <><PageHeader title="Configuración" description="Parámetros generales del entorno simulado." actions={<Button onClick={() => setEditing(true)}>Editar configuración</Button>} /><PageContent><div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]"><div className="space-y-6"><section className="rounded-2xl bg-surface p-6"><h2 className="text-base font-semibold text-text">Datos de empresa</h2><p className="mt-1 text-sm text-text-muted">Identidad que aparece en comprobantes y documentos generados.</p><dl className="mt-5 divide-y divide-border/60 text-sm"><ConfigRow label="Razón social" value={state.configuracion.datosEmpresa.razonSocial} /><ConfigRow label="Nombre comercial" value={state.configuracion.datosEmpresa.nombreComercial ?? 'No registrado'} /><ConfigRow label="Documento" value={`${state.configuracion.datosEmpresa.tipoDocumento} ${state.configuracion.datosEmpresa.numeroDocumento}`} /><ConfigRow label="Dirección" value={state.configuracion.datosEmpresa.direccion} /></dl></section><section className="rounded-2xl bg-surface p-6"><div className="flex items-start justify-between gap-4"><div><h2 className="text-base font-semibold text-text">Series de comprobantes</h2><p className="mt-1 text-sm text-text-muted">Los correlativos avanzan desde las acciones de emisión.</p></div><span className="text-sm font-semibold tabular-nums text-accent">IGV {state.configuracion.igvPorDefecto * 100}%</span></div><div className="mt-5 grid gap-3 sm:grid-cols-3">{Object.entries(state.configuracion.series).map(([type, serie]) => serie ? <div key={type} className="rounded-xl bg-surface-muted p-4"><p className="text-xs text-text-muted">{type}</p><p className="mt-2 text-lg font-semibold tabular-nums text-text">{serie.serie}-{String(serie.correlativo).padStart(5, '0')}</p><p className="mt-1 text-xs text-text-muted">Último correlativo</p></div> : null)}</div></section></div><aside className="space-y-6"><section className="rounded-2xl bg-surface-muted p-6"><h2 className="text-sm font-semibold text-text">Operación por defecto</h2><p className="mt-1 text-sm text-text-muted">Almacén utilizado cuando una operación no especifica otro destino.</p><p className="mt-5 font-medium text-text">{warehouse?.nombre ?? 'No configurado'}</p><p className="mt-1 text-xs text-text-muted">{warehouse?.direccion ?? '—'}</p></section><section className="rounded-2xl bg-surface p-6"><h2 className="text-sm font-semibold text-text">Datos de ejemplo</h2><p className="mt-2 text-sm leading-6 text-text-muted">Regenera la información simulada vigente y vuelve a la pantalla de inicio de sesión.</p><Button className="mt-5" variant="secondary" onClick={reset}>Restablecer datos de ejemplo</Button></section></aside></div></PageContent><Drawer open={editing} title="Editar configuración" onClose={() => setEditing(false)}><div className="space-y-5"><Input label="IGV (%)" type="number" min="0" max="100" step="0.01" value={igv} onChange={(event) => setIgv(Number(event.target.value))} /><Select label="Almacén por defecto" value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)} options={state.almacenes.filter((item) => item.estado === 'Activo').map((item) => ({ value: item.id, label: item.nombre }))} /><Input label="Razón social" value={company.razonSocial} onChange={(event) => setCompany((current) => ({ ...current, razonSocial: event.target.value }))} /><Input label="Nombre comercial" value={company.nombreComercial ?? ''} onChange={(event) => setCompany((current) => ({ ...current, nombreComercial: event.target.value }))} /><Input label="Número de documento" value={company.numeroDocumento} onChange={(event) => setCompany((current) => ({ ...current, numeroDocumento: event.target.value }))} /><Input label="Dirección" value={company.direccion} onChange={(event) => setCompany((current) => ({ ...current, direccion: event.target.value }))} /><div className="flex justify-end gap-2 border-t border-border pt-5"><Button variant="secondary" onClick={() => setEditing(false)}>Cancelar</Button><Button onClick={save}>Guardar cambios</Button></div></div></Drawer>{toast ? <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} /> : null}</>
}

function ConfigRow({ label, value }: { label: string; value: string }) { return <div className="flex flex-wrap justify-between gap-3 py-3"><dt className="text-text-muted">{label}</dt><dd className="text-right font-medium text-text">{value}</dd></div> }
