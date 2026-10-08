import { Check, ClipboardList, KeyRound, Pencil, ShieldCheck, UserCog } from 'lucide-react'
import { useMemo, useState } from 'react'
import { DataTable, type DataTableColumn } from '../../components/data-display/DataTable'
import { PageContent, PageHeader } from '../../components/layout/PageLayout'
import { Avatar, Button, Checkbox, Drawer, EmptyState, Select, StatusPill, Toast } from '../../components/ui'
import { useERPStore } from '../../store'
import { puedeEnEstado } from '../../store/permissions'
import type { AccionPermiso, RegistroAuditoria, RecursoSistema, RolSistema, Usuario } from '../../types'

const actions: AccionPermiso[] = ['ver', 'crear', 'editar', 'aprobar', 'anular', 'exportar']
const resources: RecursoSistema[] = ['Dashboard', 'Clientes', 'Cotizaciones', 'Ventas', 'Facturación', 'Proveedores', 'Solicitudes de compra', 'Órdenes de compra', 'Recepción', 'Productos', 'Almacenes', 'Kardex', 'Transferencias', 'Ajustes de inventario', 'Cuentas por cobrar', 'Cuentas por pagar', 'Caja', 'Bancos', 'Documentos', 'Reportes', 'Usuarios', 'Roles', 'Permisos', 'Auditoría', 'Configuración']
const roles: RolSistema[] = ['Administrador', 'Vendedor', 'Almacenero', 'Contador']
const date = (value: string) => new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))

function userName(state: ReturnType<typeof useERPStore.getState>, id: string) {
  const user = state.usuarios.find((item) => item.id === id)
  return user ? `${user.nombres} ${user.apellidos}` : 'Usuario no encontrado'
}

function entityLabel(state: ReturnType<typeof useERPStore.getState>, row: RegistroAuditoria) {
  if (row.entidadTipo === 'Usuario') return userName(state, row.entidadId)
  if (row.entidadTipo === 'Venta') return state.ventas.find((item) => item.id === row.entidadId)?.numero ?? row.entidadId
  if (row.entidadTipo === 'Compra') return state.compras.find((item) => item.id === row.entidadId)?.numero ?? row.entidadId
  if (row.entidadTipo === 'Producto') return state.productos.find((item) => item.id === row.entidadId)?.nombre ?? row.entidadId
  if (row.entidadTipo === 'Cliente') return state.clientes.find((item) => item.id === row.entidadId)?.razonSocial ?? row.entidadId
  if (row.entidadTipo === 'Proveedor') return state.proveedores.find((item) => item.id === row.entidadId)?.razonSocial ?? row.entidadId
  return row.entidadId
}

const userColumns = (state: ReturnType<typeof useERPStore.getState>, onEdit: (id: string) => void): DataTableColumn<Usuario>[] => [
  { key: 'user', header: 'Usuario', sortable: true, sortValue: (row) => `${row.nombres} ${row.apellidos}`, render: (row) => <div className="flex items-center gap-3"><Avatar name={`${row.nombres} ${row.apellidos}`} size="sm" /><div><p className="font-medium text-text">{row.nombres} {row.apellidos}</p><p className="mt-0.5 text-xs text-text-muted">@{row.nombreUsuario} · {row.email}</p></div></div> },
  { key: 'role', header: 'Rol', sortable: true, sortValue: (row) => state.roles.find((role) => role.id === row.rolId)?.nombre ?? '', render: (row) => <StatusPill label={state.roles.find((role) => role.id === row.rolId)?.nombre ?? 'Sin rol'} tone="accent" /> },
  { key: 'status', header: 'Estado', sortable: true, sortValue: (row) => row.estado, render: (row) => <StatusPill label={row.estado} tone={row.estado === 'Activo' ? 'success' : 'neutral'} /> },
  { key: 'lastAccess', header: 'Último acceso', hideOnMobile: true, sortValue: (row) => row.ultimoAccesoEn ?? '', render: (row) => <span className="text-sm text-text-muted">{row.ultimoAccesoEn ? date(row.ultimoAccesoEn) : 'Sin registro'}</span> },
  { key: 'actions', header: '', align: 'right', render: (row) => <Button variant="ghost" size="sm" aria-label={`Editar ${row.nombres}`} leadingIcon={Pencil} onClick={() => onEdit(row.id)} /> },
]

export function UsersPage() {
  const state = useERPStore()
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [roleFilter, setRoleFilter] = useState<'todos' | RolSistema>('todos')
  const [statusFilter, setStatusFilter] = useState<'todos' | Usuario['estado']>('todos')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [roleId, setRoleId] = useState('')
  const [status, setStatus] = useState<Usuario['estado']>('Activo')
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'danger' } | null>(null)
  const rows = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return state.usuarios.filter((user) => {
      const userRole = state.roles.find((role) => role.id === user.rolId)?.nombre
      const matchesQuery = !normalized || `${user.nombres} ${user.apellidos} ${user.nombreUsuario} ${user.email}`.toLowerCase().includes(normalized)
      return matchesQuery && (roleFilter === 'todos' || userRole === roleFilter) && (statusFilter === 'todos' || user.estado === statusFilter)
    })
  }, [query, roleFilter, state.roles, state.usuarios, statusFilter])
  const selected = editingId ? state.usuarios.find((user) => user.id === editingId) : undefined
  const openEdit = (id: string) => { const user = state.usuarios.find((item) => item.id === id); if (!user) return; setEditingId(id); setRoleId(user.rolId); setStatus(user.estado) }
  const save = () => { if (!selected || !state.usuarioActualId) return; const result = state.editarUsuario({ usuarioId: state.usuarioActualId, objetivoUsuarioId: selected.id, rolId: roleId, estado: status }); if (!result.ok) { setToast({ message: result.error, tone: 'danger' }); return }; setEditingId(null); setToast({ message: 'Usuario actualizado correctamente.', tone: 'success' }) }
  const resetPage = <T,>(setter: (value: T) => void, value: T) => { setter(value); setPage(1) }
  return <><PageHeader title="Usuarios" description="Personas con acceso al entorno simulado y su rol operativo." /><PageContent><div className="mb-5 flex items-center gap-3 rounded-xl bg-surface-muted px-4 py-3 text-sm text-text-soft"><UserCog size={17} strokeWidth={1.5} className="text-text-muted" /><span>{state.usuarios.length} usuarios registrados</span><span className="hidden text-xs text-text-muted sm:block">Cada usuario tiene un único rol.</span></div><DataTable rows={rows} columns={userColumns(state, openEdit)} getRowId={(row) => row.id} selectedIds={[]} onSelectedIdsChange={() => undefined} searchValue={query} onSearchChange={(value) => { setQuery(value); setPage(1) }} page={page} pageSize={11} onPageChange={setPage} totalCount={rows.length} responsive showSelectionSummary={false} toolbarActions={<div className="flex flex-wrap gap-2"><Select aria-label="Filtrar usuarios por rol" value={roleFilter} onChange={(event) => resetPage(setRoleFilter, event.target.value as 'todos' | RolSistema)} className="w-36"><option value="todos">Todos los roles</option>{roles.map((item) => <option key={item} value={item}>{item}</option>)}</Select><Select aria-label="Filtrar usuarios por estado" value={statusFilter} onChange={(event) => resetPage(setStatusFilter, event.target.value as 'todos' | Usuario['estado'])} className="w-32"><option value="todos">Todos los estados</option><option value="Activo">Activo</option><option value="Inactivo">Inactivo</option></Select></div>} emptyTitle="No encontramos usuarios" emptyDescription="Prueba con otro nombre, correo o filtro." /></PageContent><Drawer open={Boolean(selected)} title="Editar usuario" onClose={() => setEditingId(null)}><div className="space-y-5"><div className="rounded-xl bg-surface-muted p-4"><p className="font-medium text-text">{selected ? `${selected.nombres} ${selected.apellidos}` : 'Usuario'}</p><p className="mt-1 text-xs text-text-muted">{selected?.email}</p></div><Select label="Rol" value={roleId} onChange={(event) => setRoleId(event.target.value)} options={state.roles.filter((role) => role.estado === 'Activo').map((role) => ({ value: role.id, label: role.nombre }))} /><Select label="Estado" value={status} onChange={(event) => setStatus(event.target.value as Usuario['estado'])} options={[{ value: 'Activo', label: 'Activo' }, { value: 'Inactivo', label: 'Inactivo' }]} /><div className="flex justify-end gap-2 border-t border-border pt-5"><Button variant="secondary" onClick={() => setEditingId(null)}>Cancelar</Button><Button onClick={save}>Guardar cambios</Button></div></div></Drawer>{toast ? <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} /> : null}</>
}

export function RolesPage() {
  const state = useERPStore()
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null)
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<string[]>([])
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'danger' } | null>(null)
  const selectedRole = editingRoleId ? state.roles.find((item) => item.id === editingRoleId) : undefined
  const openEditor = (roleId: string) => {
    const role = state.roles.find((item) => item.id === roleId)
    if (!role) return
    setEditingRoleId(roleId)
    setSelectedPermissionIds([...role.permisoIds])
  }
  const togglePermission = (permissionId: string, checked: boolean) => setSelectedPermissionIds((current) => checked ? [...current, permissionId] : current.filter((id) => id !== permissionId))
  const save = () => {
    if (!selectedRole || !state.usuarioActualId) return
    const result = state.editarPermisosRol({ usuarioId: state.usuarioActualId, rolId: selectedRole.id, permisoIds: selectedPermissionIds })
    if (!result.ok) { setToast({ message: result.error, tone: 'danger' }); return }
    setEditingRoleId(null)
    setToast({ message: `Permisos de ${selectedRole.nombre} actualizados.`, tone: 'success' })
  }
  return <><PageHeader title="Roles" description="Perfiles de acceso configurables para cada área del ERP." /><PageContent><div className="grid gap-4 lg:grid-cols-2">{roles.map((role) => { const record = state.roles.find((item) => item.nombre === role); const users = state.usuarios.filter((item) => item.rolId === record?.id); const permissionCount = record?.permisoIds.length ?? 0; return <section key={role} className="rounded-2xl bg-surface p-6"><div className="flex items-start justify-between gap-4"><div className="flex min-w-0 items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent"><ShieldCheck size={19} strokeWidth={1.5} /></span><div className="min-w-0"><h2 className="font-semibold text-text">{role}</h2><p className="mt-1 truncate text-xs text-text-muted">{record?.descripcion ?? 'Rol del sistema'}</p></div></div><StatusPill label={`${users.length} usuarios`} tone="neutral" /></div><div className="mt-6 grid grid-cols-2 gap-3 border-t border-border/60 pt-5 text-sm"><div><p className="text-xs text-text-muted">Permisos asignados</p><p className="mt-1 font-semibold tabular-nums text-text">{permissionCount}</p></div><div><p className="text-xs text-text-muted">Estado</p><p className="mt-1 font-medium text-success">{record?.estado ?? 'Activo'}</p></div></div><Button className="mt-5" variant="secondary" size="sm" leadingIcon={Pencil} onClick={() => record && openEditor(record.id)}>Editar permisos</Button></section> })}</div></PageContent><Drawer open={Boolean(selectedRole)} title={selectedRole ? `Permisos · ${selectedRole.nombre}` : 'Editar permisos'} onClose={() => setEditingRoleId(null)}><div className="flex min-h-0 flex-col gap-5"><p className="text-sm leading-6 text-text-muted">Selecciona las acciones que podrá ejecutar este rol. Los cambios se aplican al menú, las guardas y las acciones del store.</p><div className="max-h-[calc(100dvh-250px)] space-y-4 overflow-y-auto pr-1">{resources.map((resource) => <section key={resource} className="rounded-xl bg-surface-muted p-4"><div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold text-text">{resource}</h3><span className="text-xs text-text-muted">{selectedPermissionIds.filter((id) => state.permisos.find((item) => item.id === id)?.recurso === resource).length} acciones</span></div><div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">{actions.map((action) => { const permission = state.permisos.find((item) => item.recurso === resource && item.accion === action); return permission ? <Checkbox key={permission.id} checked={selectedPermissionIds.includes(permission.id)} onChange={(event) => togglePermission(permission.id, event.target.checked)} label={action} /> : <span key={`${resource}-${action}`} className="text-xs text-text-muted">—</span> })}</div></section>)}</div><div className="flex justify-end gap-2 border-t border-border pt-5"><Button variant="secondary" onClick={() => setEditingRoleId(null)}>Cancelar</Button><Button onClick={save}>Guardar permisos</Button></div></div></Drawer>{toast ? <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} /> : null}</>
}

export function PermissionsPage() {
  const state = useERPStore()
  const [role, setRole] = useState<RolSistema>('Administrador')
  return <><PageHeader title="Permisos" description="Matriz efectiva de acceso por recurso y acción." /><PageContent><div className="mb-5 flex flex-wrap items-center gap-2">{roles.map((item) => <button key={item} type="button" className={`rounded-lg px-3 py-2 text-sm transition-colors ${role === item ? 'bg-accent text-white' : 'bg-surface-muted text-text-soft hover:bg-border/60'}`} onClick={() => setRole(item)}>{item}</button>)}</div><section className="overflow-x-auto rounded-2xl bg-surface"><div className="min-w-[720px] grid grid-cols-[minmax(12rem,1fr)_repeat(6,4.5rem)] gap-px bg-border/60 text-xs"><div className="bg-surface-muted p-3 font-semibold text-text">Recurso</div>{actions.map((action) => <div key={action} className="bg-surface-muted p-3 text-center font-medium capitalize text-text-muted">{action}</div>)}{resources.map((resource) => <div key={resource} className="contents"><div className="bg-surface p-3 text-sm text-text">{resource}</div>{actions.map((action) => { const allowed = puedeEnEstado(state, role, resource, action); return <div key={`${resource}-${action}`} className="grid place-items-center bg-surface p-3">{allowed ? <Check size={16} strokeWidth={2} className="text-success" aria-label="Permitido" /> : <span className="text-border" aria-label="No permitido">—</span>}</div> })}</div>)}</div></section></PageContent></>
}

export function AuditPage() {
  const state = useERPStore()
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [actionFilter, setActionFilter] = useState<'todas' | RegistroAuditoria['accion']>('todas')
  const rows = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return [...state.auditoria].reverse().filter((row) => {
      const matchesQuery = !normalized || [row.accion, row.modulo, row.entidadTipo, row.entidadId, row.descripcion, userName(state, row.usuarioId)].some((value) => value.toLowerCase().includes(normalized))
      return matchesQuery && (actionFilter === 'todas' || row.accion === actionFilter)
    })
  }, [actionFilter, query, state])
  const columns: DataTableColumn<RegistroAuditoria>[] = [
    { key: 'date', header: 'Fecha', sortable: true, sortValue: (row) => row.fecha, render: (row) => <span className="whitespace-nowrap text-sm text-text-muted">{date(row.fecha)}</span> },
    { key: 'action', header: 'Acción', sortable: true, sortValue: (row) => row.accion, render: (row) => <StatusPill label={row.accion} tone={row.accion.includes('Anular') ? 'danger' : 'neutral'} /> },
    { key: 'user', header: 'Usuario', sortable: true, sortValue: (row) => userName(state, row.usuarioId), render: (row) => <span className="text-sm font-medium text-text">{userName(state, row.usuarioId)}</span> },
    { key: 'entity', header: 'Entidad', sortable: true, sortValue: (row) => row.entidadTipo, render: (row) => <div><span className="block text-sm font-medium text-text">{entityLabel(state, row)}</span><span className="mt-0.5 block text-xs text-text-muted">{row.entidadTipo} · {row.modulo}</span></div> },
    { key: 'description', header: 'Detalle', hideOnMobile: true, render: (row) => <span className="block max-w-md truncate text-sm text-text-soft">{row.descripcion}</span> },
  ]
  const actionsInAudit = [...new Set(state.auditoria.map((row) => row.accion))]
  return <><PageHeader title="Auditoría" description="Registro de acciones críticas realizadas dentro del sistema." /><PageContent>{rows.length ? <DataTable rows={rows} columns={columns} getRowId={(row) => row.id} selectedIds={[]} onSelectedIdsChange={() => undefined} searchValue={query} onSearchChange={(value) => { setQuery(value); setPage(1) }} page={page} pageSize={11} onPageChange={setPage} totalCount={rows.length} responsive showSelectionSummary={false} toolbarActions={<Select aria-label="Filtrar auditoría por acción" value={actionFilter} onChange={(event) => { setActionFilter(event.target.value as 'todas' | RegistroAuditoria['accion']); setPage(1) }} className="w-44"><option value="todas">Todas las acciones</option>{actionsInAudit.map((action) => <option key={action} value={action}>{action}</option>)}</Select>} emptyTitle="Sin registros" emptyDescription="No hay acciones que coincidan con la búsqueda." /> : <EmptyState icon={ClipboardList} title="Todavía no hay auditoría" description="Las acciones críticas aparecerán aquí." />}</PageContent></>
}

export function PermissionLegend() { return <div className="flex items-center gap-2 text-xs text-text-muted"><KeyRound size={14} strokeWidth={1.5} />Los permisos se consultan desde la matriz central y no se duplican por pantalla.</div> }
