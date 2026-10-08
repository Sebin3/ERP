import { ArrowLeft, ArrowRightLeft, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageContent, PageHeader } from '../../components/layout/PageLayout'
import { Button, Card, Input, Select, Toast } from '../../components/ui'
import { usePermisos } from '../../hooks'
import { useERPStore } from '../../store'

type TransferLine = { productoId: string; cantidad: number }

export function NewTransferPage() {
  const state = useERPStore()
  const navigate = useNavigate()
  const { puede } = usePermisos()
  const [originId, setOriginId] = useState(state.almacenes[0]?.id ?? '')
  const [destinationId, setDestinationId] = useState(state.almacenes[1]?.id ?? '')
  const [lines, setLines] = useState<TransferLine[]>([{ productoId: state.productos[0]?.id ?? '', cantidad: 1 }])
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'danger' } | null>(null)

  const updateLine = (index: number, changes: Partial<TransferLine>) => setLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, ...changes } : line))
  const addLine = () => {
    const productoId = state.productos.find((product) => !lines.some((line) => line.productoId === product.id))?.id ?? ''
    setLines((current) => [...current, { productoId, cantidad: 1 }])
  }
  const create = () => {
    if (!state.usuarioActualId) return
    const result = state.crearTransferencia({ almacenOrigenId: originId, almacenDestinoId: destinationId, items: lines, usuarioId: state.usuarioActualId })
    if (!result.ok) { setToast({ message: result.error, tone: 'danger' }); return }
    navigate('/inventario/transferencias')
  }

  return <>
    <PageHeader title="Nueva transferencia" description="Crea el borrador de un traslado entre almacenes. Luego podrás solicitarlo y ejecutarlo desde la bandeja de transferencias." actions={<Button variant="secondary" leadingIcon={ArrowLeft} onClick={() => navigate('/inventario/transferencias')}>Volver</Button>} />
    <PageContent>
      <div className="mx-auto max-w-4xl space-y-6">
        <Card>
          <div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent"><ArrowRightLeft size={17} strokeWidth={1.5} /></span><div><h2 className="text-base font-semibold text-text">Ruta de movimiento</h2><p className="mt-1 text-sm text-text-muted">Los almacenes deben ser distintos. La ejecución crea una salida y una entrada emparejadas.</p></div></div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2"><Select label="Almacén origen" value={originId} onChange={(event) => setOriginId(event.target.value)} options={state.almacenes.filter((item) => item.estado === 'Activo').map((item) => ({ value: item.id, label: item.nombre }))} /><Select label="Almacén destino" value={destinationId} onChange={(event) => setDestinationId(event.target.value)} options={state.almacenes.filter((item) => item.estado === 'Activo').map((item) => ({ value: item.id, label: item.nombre }))} /></div>
        </Card>
        <Card>
          <div className="flex items-start justify-between gap-4"><div><h2 className="text-base font-semibold text-text">Productos a transferir</h2><p className="mt-1 text-sm text-text-muted">No repitas productos y usa cantidades mayores que cero.</p></div><Button size="sm" variant="secondary" leadingIcon={Plus} onClick={addLine}>Agregar línea</Button></div>
          <div className="mt-6 space-y-3">{lines.map((line, index) => <div key={`${index}-${line.productoId}`} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem_auto] sm:items-end"><Select label={index === 0 ? 'Producto' : undefined} value={line.productoId} onChange={(event) => updateLine(index, { productoId: event.target.value })} options={state.productos.filter((product) => product.estado === 'Activo').map((product) => ({ value: product.id, label: `${product.nombre} · ${product.sku}` }))} /><Input label={index === 0 ? 'Cantidad' : undefined} type="number" min="1" step="1" value={line.cantidad} onChange={(event) => updateLine(index, { cantidad: Number(event.target.value) })} /><Button aria-label="Quitar línea" variant="ghost" size="sm" disabled={lines.length === 1} onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))}><Trash2 size={16} strokeWidth={1.5} /></Button></div>)}</div>
        </Card>
        <div className="flex justify-end gap-3"><Button variant="secondary" onClick={() => navigate('/inventario/transferencias')}>Cancelar</Button>{puede('Transferencias', 'crear') ? <Button onClick={create}>Crear borrador</Button> : null}</div>
      </div>
    </PageContent>
    {toast ? <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} /> : null}
  </>
}
