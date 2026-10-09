import { ArrowLeft, Check, PackageCheck } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PageContent, PageHeader } from '../../components/layout/PageLayout'
import { WorkflowStepper } from '../../components/data-display/WorkflowStepper'
import { Button, Card, EmptyState, StatusPill, Toast } from '../../components/ui'
import { usePermisos } from '../../hooks'
import { useERPStore } from '../../store'
import { selectEstadoCompra, selectEstadoOrdenCompra } from '../../store/selectors'
import type { EstadoOrdenCompra } from '../../types'

const money = (value: number) => `S/ ${value.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const date = (value: string) => new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium' }).format(new Date(`${value}T12:00:00Z`))
const tone = (status: EstadoOrdenCompra) => status === 'Atendida' ? 'success' as const : status === 'Anulada' ? 'danger' as const : status === 'Parcial' ? 'warning' as const : status === 'Ordenada' ? 'accent' as const : 'neutral' as const

export function PurchaseOrderDetailPage() {
  const { ordenCompraId } = useParams<{ ordenCompraId: string }>()
  const state = useERPStore()
  const navigate = useNavigate()
  const { puede } = usePermisos()
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'danger' } | null>(null)
  const order = state.ordenesCompra.find((item) => item.id === ordenCompraId)

  if (!order) return <><PageHeader title="Orden no encontrada" /><PageContent><EmptyState title="No encontramos la orden" description="La orden puede haber sido eliminada o el enlace ya no es válido." /><div className="flex justify-center"><Button variant="secondary" leadingIcon={ArrowLeft} onClick={() => navigate('/compras/ordenes')}>Volver a órdenes</Button></div></PageContent></>

  const status = selectEstadoOrdenCompra(state, order.id)
  const supplier = state.proveedores.find((item) => item.id === order.proveedorId)
  const warehouse = state.almacenes.find((item) => item.id === order.almacenDestinoId)
  const purchase = state.compras.find((item) => item.ordenCompraId === order.id)
  const purchaseStatus = purchase ? selectEstadoCompra(state, purchase.id, state.fechaReferencia) : undefined
  const receivedStage = ['Parcial', 'Atendida'].includes(status) || Boolean(purchase && state.recepciones.some((item) => item.compraId === purchase.id))
  const purchaseSteps = ['Borrador', 'Ordenada', 'Recepción', 'Facturada', 'Pagada'] as const
  const purchaseStepIndex = status === 'Borrador' ? 0 : purchaseStatus === 'Facturada' ? 3 : purchaseStatus === 'Pagada' ? 4 : receivedStage ? 2 : 1
  const purchaseCancelled = status === 'Anulada' || purchaseStatus === 'Anulada' ? 'Anulada' : undefined
  const canEmit = status === 'Borrador' && puede('Órdenes de compra', 'aprobar')
  const emit = () => {
    if (!state.usuarioActualId) return
    const result = state.emitirOrdenCompra(order.id, state.usuarioActualId)
    if (!result.ok) { setToast({ message: result.error, tone: 'danger' }); return }
    setToast({ message: 'Orden emitida y Compra creada correctamente.', tone: 'success' })
  }

  return <>
    <PageHeader title={`Orden ${order.numero}`} description={`${supplier?.razonSocial ?? 'Proveedor no encontrado'} · creada el ${date(order.fecha)}`} actions={<Button variant="secondary" leadingIcon={ArrowLeft} onClick={() => navigate('/compras/ordenes')}>Volver</Button>} />
    <PageContent>
      <div className="mx-auto max-w-5xl space-y-6">
        <Card><WorkflowStepper steps={purchaseSteps} currentIndex={purchaseStepIndex} currentDescription={status === 'Parcial' ? 'Recepción parcial' : undefined} exception={purchaseCancelled ? { label: purchaseCancelled, description: 'La orden quedó fuera del flujo activo.' } : undefined} ariaLabel="Flujo de compra" /></Card>
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3"><StatusPill label={status} tone={tone(status)} /><span className="text-sm text-text-muted">{warehouse?.nombre ?? 'Almacén no encontrado'}</span>{order.fechaEntregaEsperada ? <span className="text-sm text-text-muted">Entrega: {date(order.fechaEntregaEsperada)}</span> : null}</div>
            <div className="flex flex-wrap gap-2">{canEmit ? <Button leadingIcon={Check} onClick={emit}>Emitir orden</Button> : null}{purchase && status !== 'Borrador' ? <Button variant="secondary" leadingIcon={PackageCheck} onClick={() => navigate(`/inventario/recepciones/${order.id}`)}>Ver recepción</Button> : null}</div>
          </div>
        </Card>
        <Card>
          <div className="flex items-start justify-between gap-4"><div><h2 className="text-base font-semibold text-text">Líneas de la orden</h2><p className="mt-1 text-sm text-text-muted">{order.items.length} línea{order.items.length === 1 ? '' : 's'} de abastecimiento.</p></div><p className="text-xl font-semibold tabular-nums text-text">{money(order.items.reduce((total, item) => total + item.cantidad * item.costoUnitario * (1 + state.configuracion.igvPorDefecto), 0))}</p></div>
          <div className="mt-6 divide-y divide-border/60">{order.items.map((item) => { const product = state.productos.find((actual) => actual.id === item.productoId); return <div key={item.id} className="grid gap-2 py-4 sm:grid-cols-[minmax(0,1fr)_8rem_8rem] sm:items-center"><div><p className="text-sm font-medium text-text">{product?.nombre ?? 'Producto no encontrado'}</p><p className="mt-1 text-xs text-text-muted">{product?.sku ?? item.productoId}</p></div><span className="text-sm text-text-muted sm:text-right">{item.cantidad} unidades</span><span className="text-sm font-semibold tabular-nums text-text sm:text-right">{money(item.cantidad * item.costoUnitario)}</span></div> })}</div>
        </Card>
      </div>
    </PageContent>
    {toast ? <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} /> : null}
  </>
}
