import { useERPStore } from '../store'

export function useSesion() {
  const usuarioActualId = useERPStore((state) => state.usuarioActualId)
  const usuario = useERPStore((state) => state.usuarios.find((item) => item.id === state.usuarioActualId))
  const rol = useERPStore((state) => {
    const usuarioActual = state.usuarios.find((item) => item.id === state.usuarioActualId)
    return state.roles.find((item) => item.id === usuarioActual?.rolId)?.nombre
  })
  return {
    usuarioActualId,
    usuario,
    rol,
    autenticado: Boolean(usuarioActualId && usuario),
    iniciarSesion: useERPStore((state) => state.iniciarSesion),
    cerrarSesion: useERPStore((state) => state.cerrarSesion),
  }
}
