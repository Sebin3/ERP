import type { ID } from '../../types'
import type { ActionContext, ActionResult, ERPState } from '../state'
import { auditoria, error, ok } from './helpers'

function usuarioActivo(estado: ERPState, usuarioId: ID) {
  return estado.usuarios.find((usuario) => usuario.id === usuarioId && usuario.estado === 'Activo')
}

export function iniciarSesion(estado: ERPState, usuarioId: ID, contexto: ActionContext): ActionResult {
  const usuario = usuarioActivo(estado, usuarioId)
  if (!usuario) return error('El usuario indicado no existe o está inactivo.')
  const registro = auditoria(contexto, usuarioId, 'Iniciar sesión', 'Administración', 'Usuario', usuarioId, `Sesión iniciada por ${usuario.nombres} ${usuario.apellidos}.`)
  return ok(estado, registro)
}

export function cerrarSesion(estado: ERPState, usuarioId: ID, contexto: ActionContext): ActionResult {
  const usuario = usuarioActivo(estado, usuarioId)
  if (!usuario) return error('No hay un usuario activo para cerrar sesión.')
  const registro = auditoria(contexto, usuarioId, 'Cerrar sesión', 'Administración', 'Usuario', usuarioId, `Sesión cerrada por ${usuario.nombres} ${usuario.apellidos}.`)
  return ok(estado, registro)
}
