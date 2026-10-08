import type { AccionPermiso, RecursoSistema, RolSistema } from '../types'
import type { ERPState } from './state'

export type PermissionMatrix = Readonly<Record<RolSistema, Partial<Record<RecursoSistema, readonly AccionPermiso[]>>>>

const all = ['ver', 'crear', 'editar', 'aprobar', 'anular', 'exportar'] as const satisfies readonly AccionPermiso[]
const viewExport = ['ver', 'exportar'] as const satisfies readonly AccionPermiso[]

export const matrizPermisos: PermissionMatrix = {
  Administrador: Object.fromEntries([
    ['Dashboard', ['ver', 'exportar']],
    ['Clientes', ['ver', 'crear', 'editar', 'anular', 'exportar']], ['Cotizaciones', all], ['Ventas', all], ['Facturación', all],
    ['Proveedores', all], ['Solicitudes de compra', all], ['Órdenes de compra', all], ['Recepción', all], ['Despachos', all],
    ['Productos', all], ['Almacenes', all], ['Kardex', viewExport], ['Transferencias', all], ['Ajustes de inventario', all],
    ['Cuentas por cobrar', all], ['Cuentas por pagar', all], ['Caja', all], ['Bancos', all], ['Documentos', all],
    ['Reportes', viewExport], ['Usuarios', all], ['Roles', all], ['Permisos', ['ver', 'crear', 'editar', 'exportar']],
    ['Auditoría', viewExport], ['Configuración', ['ver', 'crear', 'editar', 'exportar']],
  ]),
  Vendedor: Object.fromEntries([
    ['Dashboard', ['ver']], ['Clientes', ['ver', 'crear', 'editar', 'exportar']], ['Cotizaciones', all],
    ['Ventas', all], ['Facturación', ['ver', 'crear', 'aprobar', 'anular', 'exportar']], ['Proveedores', viewExport], ['Despachos', viewExport],
    ['Productos', viewExport], ['Almacenes', viewExport], ['Kardex', ['ver']], ['Ajustes de inventario', viewExport],
    ['Cuentas por cobrar', ['ver', 'crear', 'exportar']], ['Documentos', ['ver', 'crear', 'editar', 'exportar']],
    ['Reportes', ['ver', 'exportar']],
  ]),
  Almacenero: Object.fromEntries([
    ['Dashboard', ['ver']], ['Clientes', viewExport], ['Ventas', ['ver']], ['Proveedores', viewExport], ['Solicitudes de compra', all],
    ['Órdenes de compra', viewExport], ['Recepción', all], ['Despachos', all], ['Productos', ['ver', 'crear', 'editar', 'exportar']],
    ['Almacenes', ['ver', 'crear', 'editar', 'exportar']], ['Kardex', viewExport], ['Transferencias', all],
    ['Ajustes de inventario', ['ver', 'crear', 'editar', 'exportar']], ['Documentos', ['ver', 'crear', 'editar', 'exportar']],
    ['Reportes', ['ver', 'exportar']],
  ]),
  Contador: Object.fromEntries([
    ['Dashboard', ['ver', 'exportar']], ['Clientes', ['ver', 'editar', 'exportar']], ['Cotizaciones', viewExport],
    ['Ventas', ['ver', 'anular', 'exportar']], ['Facturación', all], ['Proveedores', all],
    ['Solicitudes de compra', ['ver', 'aprobar', 'anular', 'exportar']], ['Órdenes de compra', all], ['Recepción', viewExport], ['Despachos', viewExport],
    ['Productos', viewExport], ['Almacenes', viewExport], ['Kardex', viewExport], ['Transferencias', viewExport],
    ['Ajustes de inventario', viewExport], ['Cuentas por cobrar', all], ['Cuentas por pagar', all], ['Caja', all],
    ['Bancos', all], ['Documentos', ['ver', 'crear', 'editar', 'exportar']], ['Reportes', viewExport], ['Auditoría', viewExport],
  ]),
}

export function puede(rol: RolSistema, recurso: RecursoSistema, accion: AccionPermiso): boolean {
  return matrizPermisos[rol][recurso]?.includes(accion) ?? false
}

/** Resuelve permisos del estado persistido; la matriz sigue siendo el catálogo inicial. */
export function puedeEnEstado(estado: ERPState, rol: RolSistema, recurso: RecursoSistema, accion: AccionPermiso): boolean {
  const registro = estado.roles.find((item) => item.nombre === rol)
  if (!registro || estado.permisos.length === 0) return puede(rol, recurso, accion)
  const ids = new Set(registro.permisoIds)
  return estado.permisos.some((permiso) => ids.has(permiso.id) && permiso.recurso === recurso && permiso.accion === accion)
}

export function rolDelUsuario(estado: ERPState, usuarioId: string): RolSistema | undefined {
  const usuario = estado.usuarios.find((item) => item.id === usuarioId)
  return estado.roles.find((item) => item.id === usuario?.rolId)?.nombre
}

export function exigirPermiso(estado: ERPState, usuarioId: string, recurso: RecursoSistema, accion: AccionPermiso): string | undefined {
  const rol = rolDelUsuario(estado, usuarioId)
  if (!rol) return `El usuario ${usuarioId} no existe o no tiene un rol válido.`
  if (!puedeEnEstado(estado, rol, recurso, accion)) return `El rol ${rol} no tiene permiso para ${accion} en ${recurso}.`
  return undefined
}
