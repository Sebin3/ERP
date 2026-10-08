import { useCallback } from 'react'
import type { AccionPermiso, RecursoSistema } from '../types'
import { puedeEnEstado } from '../store/permissions'
import { useERPStore } from '../store'

export function usePermisos() {
  const state = useERPStore()
  const rol = state.roles.find((item) => item.id === state.usuarios.find((user) => user.id === state.usuarioActualId)?.rolId)?.nombre
  const puede = useCallback((recurso: RecursoSistema, accion: AccionPermiso) => Boolean(rol && puedeEnEstado(state, rol, recurso, accion)), [rol, state])
  return { rol, puede }
}
