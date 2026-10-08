import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '../ui'

type Props = { children: ReactNode }
type State = { hasError: boolean }

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[EnterpriseCloud] Error no controlado en la interfaz.', error, errorInfo)
  }

  private reload = () => window.location.reload()

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <main className="grid min-h-dvh place-items-center bg-app px-6 py-10 text-text">
        <section className="w-full max-w-md rounded-2xl bg-surface p-8 text-center shadow-panel">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-danger-soft text-danger">
            <AlertTriangle size={22} strokeWidth={1.5} />
          </span>
          <h1 className="mt-5 text-xl font-semibold tracking-tight">Algo no salió como esperábamos</h1>
          <p className="mt-2 text-sm leading-6 text-text-muted">
            La pantalla encontró un problema inesperado. Puedes recargarla para continuar con tus datos guardados.
          </p>
          <Button className="mt-6" leadingIcon={RefreshCw} onClick={this.reload}>
            Recargar pantalla
          </Button>
        </section>
      </main>
    )
  }
}
