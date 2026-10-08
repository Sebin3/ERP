import type { AccionPermiso, Configuracion, ID, RecursoSistema, Usuario } from '../../types'
import type { ActionContext, ActionResult, ERPState } from '../state'
import { auditFields, auditoria, error, ok, permiso } from './helpers'

interface UsuarioChanges {
  usuarioId: ID
  objetivoUsuarioId: ID
  rolId?: ID
  estado?: Usuario['estado']
}

export function editarUsuario(estado: ERPState, input: UsuarioChanges, contexto: ActionContext): ActionResult {
  const permisoError = permiso(estado, input.usuarioId, 'Usuarios', 'editar')
  if (permisoError) return error(permisoError)
  const usuario = estado.usuarios.find((item) => item.id === input.objetivoUsuarioId)
  if (!usuario) return error('El usuario indicado no existe.')
  if (input.rolId && !estado.roles.some((rol) => rol.id === input.rolId && rol.estado === 'Activo')) return error('El rol indicado no existe o está inactivo.')
  if (input.estado === 'Inactivo' && input.objetivoUsuarioId === input.usuarioId) return error('No puedes desactivar tu propia sesión.')
  if (!input.rolId && !input.estado) return error('Debes indicar un cambio para el usuario.')
  const actualizado = { ...usuario, ...(input.rolId ? { rolId: input.rolId } : {}), ...(input.estado ? { estado: input.estado } : {}), ...auditFields(contexto, input.usuarioId) }
  const registro = auditoria(contexto, input.usuarioId, 'Editar', 'Administración', 'Usuario', usuario.id, 'Usuario actualizado.')
  return ok({ ...estado, usuarios: estado.usuarios.map((item) => item.id === usuario.id ? actualizado : item) }, registro)
}

interface PermisosRolChanges {
  usuarioId: ID
  rolId: ID
  permisoIds: ID[]
}

export function editarPermisosRol(estado: ERPState, input: PermisosRolChanges, contexto: ActionContext): ActionResult {
  const permisoError = permiso(estado, input.usuarioId, 'Roles', 'editar')
  if (permisoError) return error(permisoError)
  const rol = estado.roles.find((item) => item.id === input.rolId)
  if (!rol) return error('El rol indicado no existe.')
  const ids = [...new Set(input.permisoIds)]
  if (ids.length !== input.permisoIds.length) return error('La lista de permisos contiene duplicados.')
  if (ids.some((id) => !estado.permisos.some((item) => item.id === id))) return error('La lista contiene un permiso inexistente.')
  if (rol.nombre === 'Administrador') {
    const imprescindibles: Array<[RecursoSistema, AccionPermiso]> = [['Usuarios', 'editar'], ['Roles', 'editar'], ['Permisos', 'editar'], ['Configuración', 'editar']]
    const conservaControl = imprescindibles.every(([recurso, accion]) => ids.some((id) => estado.permisos.some((item) => item.id === id && item.recurso === recurso && item.accion === accion)))
    if (!conservaControl) return error('El rol Administrador debe conservar sus permisos de administración críticos.')
  }
  const actuales = [...rol.permisoIds].sort().join('|')
  const nuevos = [...ids].sort().join('|')
  if (actuales === nuevos) return error('No hay cambios de permisos para guardar.')
  const actualizado = { ...rol, permisoIds: ids, ...auditFields(contexto, input.usuarioId) }
  const registro = auditoria(contexto, input.usuarioId, 'Cambiar permisos', 'Administración', 'Rol', rol.id, `Permisos del rol ${rol.nombre} actualizados.`)
  return ok({ ...estado, roles: estado.roles.map((item) => item.id === rol.id ? actualizado : item) }, registro)
}

interface ConfiguracionChanges {
  usuarioId: ID
  igvPorDefecto?: number
  almacenPorDefectoId?: ID
  datosEmpresa?: Partial<Configuracion['datosEmpresa']>
  series?: Configuracion['series']
}

export function editarConfiguracion(estado: ERPState, input: ConfiguracionChanges, contexto: ActionContext): ActionResult {
  const permisoError = permiso(estado, input.usuarioId, 'Configuración', 'editar')
  if (permisoError) return error(permisoError)
  if (input.igvPorDefecto !== undefined && (!Number.isFinite(input.igvPorDefecto) || input.igvPorDefecto < 0 || input.igvPorDefecto > 1)) return error('El IGV debe expresarse como decimal entre 0 y 1.')
  if (input.almacenPorDefectoId && !estado.almacenes.some((almacen) => almacen.id === input.almacenPorDefectoId && almacen.estado === 'Activo')) return error('El almacén por defecto no existe o está inactivo.')
  const datosEmpresa = input.datosEmpresa ? { ...estado.configuracion.datosEmpresa, ...input.datosEmpresa } : estado.configuracion.datosEmpresa
  if (!datosEmpresa.razonSocial.trim() || !datosEmpresa.numeroDocumento.trim() || !datosEmpresa.direccion.trim()) return error('La razón social, documento y dirección de la empresa son obligatorios.')
  const configuracion = { ...estado.configuracion, ...(input.igvPorDefecto === undefined ? {} : { igvPorDefecto: input.igvPorDefecto }), ...(input.almacenPorDefectoId ? { almacenPorDefectoId: input.almacenPorDefectoId } : {}), ...(input.datosEmpresa ? { datosEmpresa: { ...estado.configuracion.datosEmpresa, ...input.datosEmpresa } } : {}), ...(input.series ? { series: { ...estado.configuracion.series, ...input.series } } : {}), ...auditFields(contexto, input.usuarioId) }
  const registro = auditoria(contexto, input.usuarioId, 'Editar', 'Administración', 'Configuración', configuracion.id, 'Configuración general actualizada.')
  return ok({ ...estado, configuracion }, registro)
}
