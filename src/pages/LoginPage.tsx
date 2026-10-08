import { Cloud, LockKeyhole } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Button, Select } from '../components/ui'
import { useERPStore } from '../store'

export function LoginPage() {
  const navigate = useNavigate()
  const usuariosRegistrados = useERPStore((state) => state.usuarios)
  const usuarios = useMemo(() => usuariosRegistrados.filter((usuario) => usuario.estado === 'Activo'), [usuariosRegistrados])
  const roles = useERPStore((state) => state.roles)
  const usuarioActualId = useERPStore((state) => state.usuarioActualId)
  const iniciarSesion = useERPStore((state) => state.iniciarSesion)
  const [usuarioId, setUsuarioId] = useState(usuarios[0]?.id ?? '')
  const [error, setError] = useState<string | null>(null)

  if (usuarioActualId) return <Navigate to="/" replace />

  const options = usuarios.map((usuario) => {
    const rol = roles.find((item) => item.id === usuario.rolId)?.nombre ?? 'Sin rol'
    return { value: usuario.id, label: `${usuario.nombres} ${usuario.apellidos} · ${rol}` }
  })

  const entrar = () => {
    const result = iniciarSesion(usuarioId)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setError(null)
    navigate('/', { replace: true })
  }

  return <main className="grid min-h-dvh place-items-center bg-app p-6"><div className="w-full max-w-[420px] rounded-2xl border border-border bg-surface p-8"><div className="flex items-center gap-3"><span className="grid size-8 place-items-center rounded-[10px] bg-accent text-white"><Cloud size={18} strokeWidth={1.5} /></span><span className="text-base font-semibold text-text">EnterpriseCloud</span></div><div className="mt-10"><p className="text-sm font-medium text-text-muted">Bienvenido de vuelta</p><h1 className="mt-2 text-2xl font-semibold tracking-tight text-text">Ingresa a tu espacio</h1><p className="mt-2 text-sm leading-6 text-text-muted">Selecciona un usuario de ejemplo para explorar el sistema.</p></div><div className="mt-8 grid gap-5"><Select label="Usuario de ejemplo" value={usuarioId} onChange={(event) => setUsuarioId(event.target.value)} options={options} error={error ?? undefined} /><Button size="lg" leadingIcon={LockKeyhole} onClick={entrar}>Entrar al sistema</Button></div><p className="mt-6 text-center text-xs text-text-muted">Modo de demostración · Sin autenticación real</p></div></main>
}
