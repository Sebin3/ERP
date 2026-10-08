import { ArrowLeft, Plus, Send, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageContent, PageHeader } from '../../components/layout/PageLayout'
import { Button, Card, Input, Select, Toast } from '../../components/ui'
import { usePermisos } from '../../hooks'
import { useERPStore } from '../../store'

type RequestLine = { productoId: string; cantidadSolicitada: number; observacion?: string }
type ToastState = { message: string; tone: 'success' | 'danger' }

export function NewPurchaseRequestPage() {
  const state = useERPStore()
  const navigate = useNavigate()
  const { puede } = usePermisos()
  const [warehouseId, setWarehouseId] = useState(state.almacenes[0]?.id ?? '')
  const [reason, setReason] = useState('')
  const [lines, setLines] = useState<RequestLine[]>([{ productoId: state.productos[0]?.id ?? '', cantidadSolicitada: 1 }])
  const [toast, setToast] = useState<ToastState | null>(null)

  const updateLine = (index: number, changes: Partial<RequestLine>) => {
    setLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, ...changes } : line))
  }

  const addLine = () => {
    const productoId = state.productos.find((product) => !lines.some((line) => line.productoId === product.id))?.id ?? ''
    setLines((current) => [...current, { productoId, cantidadSolicitada: 1 }])
  }

  const create = (send: boolean) => {
    if (!state.usuarioActualId) return
    const result = state.crearSolicitudCompra({
      solicitanteUsuarioId: state.usuarioActualId,
      almacenDestinoId: warehouseId,
      items: lines,
      motivo: reason.trim() || undefined,
      usuarioId: state.usuarioActualId,
    })
    if (!result.ok) {
      setToast({ message: result.error, tone: 'danger' })
      return
    }
    if (!send) {
      navigate('/compras/solicitudes')
      return
    }
    const solicitud = result.estado.solicitudesCompra.at(-1)
    if (!solicitud || !puede('Solicitudes de compra', 'editar')) {
      setToast({ message: 'Solicitud creada en borrador.', tone: 'success' })
      return
    }
    const sent = state.solicitarCompra(solicitud.id, state.usuarioActualId)
    if (!sent.ok) {
      setToast({ message: `Se creó el borrador, pero no se pudo enviar: ${sent.error}`, tone: 'danger' })
      return
    }
    navigate('/compras/solicitudes')
  }

  return <>
    <PageHeader
      title="Nueva solicitud de compra"
      description="Registra una necesidad de abastecimiento para que pueda revisarse antes de emitir una orden."
      actions={<Button variant="secondary" leadingIcon={ArrowLeft} onClick={() => navigate('/compras/solicitudes')}>Volver</Button>}
    />
    <PageContent>
      <div className="mx-auto max-w-4xl space-y-6">
        <Card>
          <div className="grid gap-5 sm:grid-cols-2">
            <Select label="Almacén destino" value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)} options={state.almacenes.filter((item) => item.estado === 'Activo').map((item) => ({ value: item.id, label: item.nombre }))} />
            <Input label="Motivo" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Ej. Reposición por campaña" />
          </div>
        </Card>
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div><h2 className="text-base font-semibold text-text">Productos solicitados</h2><p className="mt-1 text-sm text-text-muted">Agrega cantidades mayores que cero. El stock no cambia al crear la solicitud.</p></div>
            <Button size="sm" variant="secondary" leadingIcon={Plus} onClick={addLine}>Agregar línea</Button>
          </div>
          <div className="mt-6 space-y-3">
            {lines.map((line, index) => <div key={`${index}-${line.productoId}`} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem_auto] sm:items-end">
              <Select label={index === 0 ? 'Producto' : undefined} value={line.productoId} onChange={(event) => updateLine(index, { productoId: event.target.value })} options={state.productos.filter((product) => product.estado === 'Activo').map((product) => ({ value: product.id, label: `${product.nombre} · ${product.sku}` }))} />
              <Input label={index === 0 ? 'Cantidad' : undefined} type="number" min="1" step="1" value={line.cantidadSolicitada} onChange={(event) => updateLine(index, { cantidadSolicitada: Number(event.target.value) })} />
              <Button aria-label="Quitar línea" variant="ghost" size="sm" disabled={lines.length === 1} onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))}><Trash2 size={16} strokeWidth={1.5} /></Button>
            </div>)}
          </div>
        </Card>
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="secondary" onClick={() => navigate('/compras/solicitudes')}>Cancelar</Button>
          <Button variant="secondary" onClick={() => create(false)}>Guardar borrador</Button>
          {puede('Solicitudes de compra', 'editar') ? <Button leadingIcon={Send} onClick={() => create(true)}>Guardar y solicitar</Button> : null}
        </div>
      </div>
    </PageContent>
    {toast ? <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} /> : null}
  </>
}
