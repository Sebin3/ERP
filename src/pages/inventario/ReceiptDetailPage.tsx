import { ArrowLeft, Check, FileCheck2, PackageCheck, XCircle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PageContent, PageHeader } from '../../components/layout/PageLayout'
import { WorkflowStepper } from '../../components/data-display/WorkflowStepper'
import { Button, ConfirmActionModal, EmptyState, Input, StatusPill, Toast } from '../../components/ui'
import { usePermisos } from '../../hooks'
import { useERPStore } from '../../store'
import { selectEstadoCompra, selectEstadoOrdenCompra, selectTotalCompra } from '../../store/selectors'
import type { EstadoCompra, EstadoOrdenCompra } from '../../types'

type ReceiptLine = { productoId: string; cantidadRecibida: number; costoUnitario: number }
type ToastState = { message: string; tone: 'success' | 'danger' }

const date = (value: string) => new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium' }).format(new Date(`${value}T12:00:00Z`))
const money = (value: number) => `S/ ${value.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const statusTone = (status: EstadoCompra | EstadoOrdenCompra) => status === 'Pagada' || status === 'Recibida' || status === 'Atendida' ? 'success' as const : status === 'Anulada' ? 'danger' as const : status === 'Facturada' || status === 'Ordenada' ? 'accent' as const : 'warning' as const

export function ReceiptDetailPage() {
  const { ordenCompraId } = useParams<{ ordenCompraId: string }>()
  const navigate = useNavigate()
  const state = useERPStore()
  const { puede } = usePermisos()
  const [lines, setLines] = useState<ReceiptLine[]>([])
  const [cancelOpen, setCancelOpen] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [toast, setToast] = useState<ToastState | null>(null)
  const order = state.ordenesCompra.find((item) => item.id === ordenCompraId)
  const purchase = state.compras.find((item) => item.ordenCompraId === ordenCompraId)
  const details = useMemo(() => purchase ? state.detallesCompra.filter((item) => purchase.detalleIds.includes(item.id)) : [], [purchase, state.detallesCompra])
  const received = (productoId: string) => state.recepciones.filter((item) => item.compraId === purchase?.id).flatMap((item) => item.itemIds).map((id) => state.itemsRecepcion.find((item) => item.id === id)).filter((item): item is NonNullable<typeof item> => Boolean(item && item.productoId === productoId)).reduce((total, item) => total + item.cantidadRecibida, 0)
  const orderStatus = order ? selectEstadoOrdenCompra(state, order.id) : 'Anulada'
  const purchaseStatus = purchase ? selectEstadoCompra(state, purchase.id, state.fechaReferencia) : null
  const canReceive = Boolean(purchase && puede('Recepción', 'crear') && purchaseStatus !== 'Facturada' && purchaseStatus !== 'Anulada' && orderStatus !== 'Atendida' && orderStatus !== 'Anulada')
  const hasReceived = Boolean(purchase && state.recepciones.some((item) => item.compraId === purchase.id))
  const canInvoice = Boolean(purchase && puede('Facturación', 'crear') && purchase.estado === 'Ordenada' && hasReceived)
  const canCancel = Boolean(purchase && puede('Órdenes de compra', 'anular') && purchaseStatus !== 'Anulada')
  const purchaseSteps = ['Borrador', 'Ordenada', 'Recepción', 'Facturada', 'Pagada'] as const
  const receivedStage = ['Parcial', 'Atendida'].includes(orderStatus) || Boolean(purchase && state.recepciones.some((item) => item.compraId === purchase.id))
  const purchaseStepIndex = orderStatus === 'Borrador' ? 0 : purchaseStatus === 'Facturada' ? 3 : purchaseStatus === 'Pagada' ? 4 : receivedStage ? 2 : 1
  const purchaseCancelled = orderStatus === 'Anulada' || purchaseStatus === 'Anulada' ? 'Anulada' : undefined

  if (!order || !purchase) return <><PageHeader title="Recepción no encontrada" /><PageContent><EmptyState icon={PackageCheck} title="La orden todavía no está emitida" description="Emite la orden de compra para crear su Compra y poder registrar la recepción." /><div className="flex justify-center"><Button variant="secondary" leadingIcon={ArrowLeft} onClick={() => navigate('/inventario/recepciones')}>Volver a recepción</Button></div></PageContent></>

  const notify = (result: { ok: true } | { ok: false; error: string }, successMessage: string) => { if (!result.ok) { setToast({ message: result.error, tone: 'danger' }); return false }; setToast({ message: successMessage, tone: 'success' }); return true }
  const initialize = () => setLines(details.map((detail) => ({ productoId: detail.productoId, cantidadRecibida: Math.max(0, detail.cantidad - received(detail.productoId)), costoUnitario: detail.costoUnitario })))
  const updateLine = (index: number, changes: Partial<ReceiptLine>) => setLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, ...changes } : line))
  const receive = () => { if (!state.usuarioActualId || !purchase) return; const result = state.recibirCompra({ compraId: purchase.id, almacenId: purchase.almacenId, items: lines.filter((line) => line.cantidadRecibida > 0), usuarioId: state.usuarioActualId }); if (notify(result, 'Recepción registrada y kardex actualizado.')) setLines([]) }
  const invoice = () => { if (!state.usuarioActualId || !purchase) return; const result = state.facturarCompra({ compraId: purchase.id, tipoComprobante: 'Factura', usuarioId: state.usuarioActualId }); notify(result, 'Compra facturada y cuenta por pagar creada.') }
  const cancel = () => { if (!state.usuarioActualId || !purchase || !motivo.trim()) return; if (notify(state.anularCompra(purchase.id, motivo, state.usuarioActualId), 'Compra anulada correctamente.')) { setCancelOpen(false); setMotivo('') } }

  return <>
    <PageHeader title={`Recepción · ${order.numero}`} description={`${state.proveedores.find((item) => item.id === order.proveedorId)?.razonSocial ?? 'Proveedor'} · ${date(order.fecha)}`} actions={<Button variant="secondary" leadingIcon={ArrowLeft} onClick={() => navigate('/inventario/recepciones')}>Volver</Button>} />
    <PageContent>
      <div className="space-y-6"><section className="rounded-2xl bg-surface p-5"><WorkflowStepper steps={purchaseSteps} currentIndex={purchaseStepIndex} currentDescription={orderStatus === 'Parcial' ? 'Recepción parcial' : undefined} exception={purchaseCancelled ? { label: purchaseCancelled, description: 'La compra quedó fuera del flujo activo.' } : undefined} ariaLabel="Flujo de compra" /></section><div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-surface p-5"><div className="flex items-center gap-3"><StatusPill label={orderStatus} tone={statusTone(orderStatus)} /><span className="text-sm text-text-muted">{state.almacenes.find((item) => item.id === order.almacenDestinoId)?.nombre ?? 'Almacén no encontrado'}</span></div><div className="flex flex-wrap gap-2">{canReceive ? <Button leadingIcon={Check} onClick={initialize}>Preparar recepción</Button> : null}{canInvoice ? <Button leadingIcon={FileCheck2} onClick={invoice}>Facturar compra</Button> : null}{canCancel ? <Button variant="danger" leadingIcon={XCircle} onClick={() => setCancelOpen(true)}>Anular compra</Button> : null}</div></div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]"><section className="rounded-2xl bg-surface p-6"><div className="flex items-start justify-between gap-4"><div><h2 className="text-base font-semibold text-text">Detalle de la orden</h2><p className="mt-1 text-sm text-text-muted">{details.length} línea{details.length === 1 ? '' : 's'} · recepción parcial o total.</p></div><p className="text-xl font-semibold tabular-nums text-text">{money(selectTotalCompra(state, purchase.id))}</p></div><div className="mt-6 divide-y divide-border/60">{details.map((detail) => { const quantityReceived = received(detail.productoId); const pending = Math.max(0, detail.cantidad - quantityReceived); return <div key={detail.id} className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_6rem_6rem_7rem] sm:items-center"><div><p className="text-sm font-medium text-text">{detail.descripcionProducto}</p><p className="mt-1 text-xs text-text-muted">Ordenadas {detail.cantidad} · recibidas {quantityReceived} · pendientes {pending}</p></div><span className="text-sm text-text-muted sm:text-right">{money(detail.costoUnitario)} c/u</span><span className="text-sm text-text-muted sm:text-right">{detail.tasaImpuesto * 100}% IGV</span><span className="text-sm font-semibold tabular-nums text-text sm:text-right">{money(detail.cantidad * detail.costoUnitario * (1 + detail.tasaImpuesto))}</span></div> })}</div></section><aside className="rounded-2xl bg-surface-muted p-6"><p className="text-xs font-medium text-text-muted">Estado de la compra</p><div className="mt-3 flex items-center justify-between gap-3"><span className="text-sm text-text-soft">Compra</span>{purchaseStatus ? <StatusPill label={purchaseStatus} tone={statusTone(purchaseStatus)} /> : null}</div><dl className="mt-5 space-y-3 text-sm"><div className="flex justify-between gap-4"><dt className="text-text-muted">Proveedor</dt><dd className="text-right font-medium text-text">{state.proveedores.find((item) => item.id === order.proveedorId)?.razonSocial ?? '—'}</dd></div><div className="flex justify-between gap-4"><dt className="text-text-muted">Entrega</dt><dd className="font-medium text-text">{date(order.fechaEntregaEsperada ?? order.fecha)}</dd></div><div className="flex justify-between gap-4"><dt className="text-text-muted">Total</dt><dd className="font-medium tabular-nums text-text">{money(selectTotalCompra(state, purchase.id))}</dd></div></dl></aside></div>
      {lines.length > 0 ? <section className="mt-6 rounded-2xl bg-surface p-6"><div><h2 className="text-base font-semibold text-text">Registrar cantidades recibidas</h2><p className="mt-1 text-sm text-text-muted">Solo se agregan entradas al kardex por cantidades mayores que cero.</p></div><div className="mt-5 space-y-3">{lines.map((line, index) => { const detail = details.find((item) => item.productoId === line.productoId); return <div key={line.productoId} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem_8rem] sm:items-end"><div><p className="text-sm font-medium text-text">{detail?.descripcionProducto ?? line.productoId}</p><p className="mt-1 text-xs text-text-muted">Máximo pendiente: {Math.max(0, (detail?.cantidad ?? 0) - received(line.productoId))}</p></div><Input label="Cantidad" type="number" min="0" step="1" value={line.cantidadRecibida} onChange={(event) => updateLine(index, { cantidadRecibida: Number(event.target.value) })} /><Input label="Costo unitario" type="number" min="0" step="0.01" value={line.costoUnitario} onChange={(event) => updateLine(index, { costoUnitario: Number(event.target.value) })} /></div> })}</div><div className="mt-6 flex justify-end gap-2 border-t border-border pt-5"><Button variant="secondary" onClick={() => setLines([])}>Cancelar</Button><Button onClick={receive}>Confirmar recepción</Button></div></section> : null}</div>
    </PageContent>
    <ConfirmActionModal open={cancelOpen} title="Anular compra" description="La anulación queda registrada en auditoría y marca la cuenta por pagar como anulada cuando existe." confirmLabel="Confirmar anulación" confirmDisabled={!motivo.trim()} onClose={() => setCancelOpen(false)} onConfirm={cancel}><Input label="Motivo de anulación" placeholder="Ej. Orden cancelada por el proveedor" value={motivo} onChange={(event) => setMotivo(event.target.value)} /></ConfirmActionModal>
    {toast ? <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} /> : null}
  </>
}
