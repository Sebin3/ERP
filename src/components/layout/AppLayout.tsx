import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useERPStore } from '../../store'
import { Sidebar } from '../navigation/Sidebar'
import { Topbar } from '../navigation/Topbar'
import { Toast } from '../ui'

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const persistenciaAviso = useERPStore((state) => state.persistenciaAviso)
  const limpiarPersistenciaAviso = useERPStore((state) => state.limpiarPersistenciaAviso)
  const aviso = toast ?? persistenciaAviso

  return (
    <div className="flex min-h-dvh w-full max-w-full overflow-x-hidden bg-surface">
      <Sidebar collapsed={collapsed} mobileOpen={mobileOpen} onToggle={() => setCollapsed((current) => !current)} onCloseMobile={() => setMobileOpen(false)} />
      {mobileOpen ? <div className="fixed inset-0 z-10 block bg-text/20 backdrop-blur-[2px] md:hidden" onClick={() => setMobileOpen(false)} aria-hidden="true" /> : null}
      <section className="flex min-h-dvh min-w-0 max-w-full flex-1 flex-col bg-surface">
        <Topbar onOpenMobile={() => setMobileOpen(true)} onNotify={() => setToast('No hay notificaciones nuevas')} />
        <main className="w-full max-w-[1440px] min-w-0 self-center overflow-x-hidden p-8 outline-none max-md:px-4 max-md:py-6"><Outlet /></main>
      </section>
      {aviso ? <Toast message={aviso} onClose={() => { setToast(null); limpiarPersistenciaAviso() }} /> : null}
    </div>
  )
}
