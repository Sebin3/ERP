import { ArrowLeft, Check, CreditCard, FileCheck2, Send, XCircle } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PageContent, PageHeader } from '../../components/layout/PageLayout'
import { WorkflowStepper } from '../../components/data-display/WorkflowStepper'
import { Button, ConfirmActionModal, Drawer, EmptyState, Input, Select, StatusPill, Toast } from '../../components/ui'
import { usePermisos } from '../../hooks'
import { useERPStore } from '../../store'
import { selectEstadoCuenta, selectEstadoVenta, selectSaldoCuenta, selectTotalVenta } from '../../store/selectors'
import type { EstadoVenta, MetodoPago } from '../../types'
import { redondearDosDecimales } from '../../utils'

const date = (value: string) => new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium' }).format(new Date(`${value}T12:00:00Z`))
const money = (value: number) => `S/ ${redondearDosDecimales(value).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`
const tone = (status: EstadoVenta) => status === 'Cobrado' ? 'success' as const : status === 'Anulado' ? 'danger' as const : status === 'Pendiente' ? 'warning' as const : status === 'Facturado' || status === 'Aprobado' ? 'accent' as const : 'neutral' as const
type ToastState = { message: string; tone: 'success' | 'danger' }

export function SaleDetailPage() {
  const { ventaId } = useParams<{ ventaId: string }>()
  const navigate = useNavigate()
  const state = useERPStore()
  const { puede } = usePermisos()
  const [invoiceOpen, setInvoiceOpen] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [comprobante, setComprobante] = useState<'Factura' | 'Boleta'>('Factura')
  const [monto, setMonto] = useState(0)
  const [motivo, setMotivo] = useState('')
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('Efectivo')
  const [cuentaBancariaId, setCuentaBancariaId] = useState(state.cuentasBancarias[0]?.id ?? '')
  const [toast, setToast] = useState<ToastState | null>(null)
  const venta = state.ventas.find((item) => item.id === ventaId)

  if (!venta) return <><PageHeader title="Venta no encontrada" /><PageContent><EmptyState title="No encontramos esta venta" description="La operación puede haber sido eliminada o el enlace no es válido." /><div className="flex justify-center"><Button onClick={() => navigate('/comercial/ventas')}>Volver a ventas</Button></div></PageContent></>

  const status = selectEstadoVenta(state, venta.id, state.fechaReferencia)
  const cliente = state.clientes.find((item) => item.id === venta.clienteId)
  const almacen = state.almacenes.find((item) => item.id === venta.almacenId)
  const detalles = state.detallesVenta.filter((item) => venta.detalleIds.includes(item.id))
  const total = selectTotalVenta(state, venta.id)
  const cuenta = state.cuentasCobrar.find((item) => item.ventaId === venta.id)
  const saldo = cuenta ? selectSaldoCuenta(state, cuenta.id) : 0
  const estadoCuenta = cuenta ? selectEstadoCuenta(state, cuenta.id, state.fechaReferencia) : null
  const saleSteps = ['Borrador', 'Pendiente', 'Aprobada', 'Facturada', 'Cobrado'] as const
  const saleStepIndex = saleSteps.indexOf(status as typeof saleSteps[number])
  const saleCancelled = status === 'Anulado' ? status : undefined
  const usuarioId = state.usuarioActualId
  const notify = (result: { ok: true } | { ok: false; error: string }, successMessage: string) => { if (!result.ok) { setToast({ message: result.error, tone: 'danger' }); return false } setToast({ message: successMessage, tone: 'success' }); return true }
  const send = () => { if (usuarioId) notify(state.enviarVenta(venta.id, usuarioId), 'Venta enviada a revisión.') }
  const approve = () => { if (usuarioId) notify(state.aprobarVenta(venta.id, usuarioId), 'Venta aprobada y stock reservado.') }
  const invoice = () => { if (usuarioId && notify(state.facturarVenta({ ventaId: venta.id, tipoComprobante: comprobante, usuarioId }), 'Venta facturada correctamente.')) setInvoiceOpen(false) }
  const collect = () => { if (!usuarioId || !cuenta) return; if (notify(state.registrarCobro({ cuentaCobrarId: cuenta.id, monto, metodoPago, cuentaBancariaId: metodoPago === 'Efectivo' ? undefined : cuentaBancariaId, usuarioId }), 'Cobro registrado correctamente.')) { setPaymentOpen(false); setMonto(0) } }
  const cancel = () => { if (!usuarioId || !motivo.trim()) return; if (notify(state.anularVenta(venta.id, motivo, usuarioId), 'Venta anulada correctamente.')) { setCancelOpen(false); setMotivo('') } }

  return <>
    <PageHeader title={venta.numero} description={`${cliente?.razonSocial ?? 'Cliente no encontrado'} · ${date(venta.fecha)}`} actions={<Button variant="secondary" leadingIcon={ArrowLeft} onClick={() => navigate('/comercial/ventas')}>Volver a ventas</Button>} />
    <PageContent>
      <div className="space-y-6"><section className="rounded-2xl bg-surface p-5"><WorkflowStepper steps={saleSteps} currentIndex={Math.max(0, saleStepIndex)} exception={saleCancelled ? { label: saleCancelled, description: 'La operación quedó fuera del flujo activo.' } : undefined} ariaLabel="Flujo de venta" /></section><div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-surface p-5"><div className="flex items-center gap-3"><StatusPill label={status} tone={tone(status)} /><span className="text-sm text-text-muted">{almacen?.nombre ?? 'Almacén no encontrado'}</span></div><div className="flex flex-wrap gap-2">{status === 'Borrador' && puede('Ventas', 'editar') ? <Button variant="secondary" leadingIcon={Send} onClick={send}>Enviar a revisión</Button> : null}{status === 'Pendiente' && puede('Ventas', 'aprobar') ? <Button leadingIcon={Check} onClick={approve}>Aprobar venta</Button> : null}{status === 'Aprobado' && puede('Facturación', 'crear') ? <Button leadingIcon={FileCheck2} onClick={() => setInvoiceOpen(true)}>Facturar</Button> : null}{status === 'Facturado' && cuenta && puede('Cuentas por cobrar', 'crear') ? <Button leadingIcon={CreditCard} onClick={() => { setMonto(saldo); setPaymentOpen(true) }}>Registrar cobro</Button> : null}{status !== 'Anulado' && puede('Ventas', 'anular') ? <Button variant="danger" leadingIcon={XCircle} onClick={() => setCancelOpen(true)}>Anular venta</Button> : null}</div></div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]"><section className="rounded-2xl bg-surface p-6"><div className="flex items-start justify-between gap-4"><div><h2 className="text-base font-semibold text-text">Detalle de productos</h2><p className="mt-1 text-sm text-text-muted">{detalles.length} línea{detalles.length === 1 ? '' : 's'} registradas en la operación.</p></div><p className="text-xl font-semibold text-text tabular-nums">{money(total)}</p></div><div className="mt-6 divide-y divide-border/60">{detalles.map((detalle) => <div key={detalle.id} className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_6rem_8rem_8rem] sm:items-center"><div><p className="text-sm font-medium text-text">{detalle.descripcionProducto}</p><p className="mt-1 text-xs text-text-muted">{detalle.cantidad} unidades · {money(detalle.precioUnitario)} c/u</p></div><span className="text-sm text-text-muted sm:text-right">Desc. {money(detalle.descuento)}</span><span className="text-sm text-text-muted sm:text-right">IGV {(detalle.tasaImpuesto * 100).toFixed(0)}%</span><span className="text-sm font-semibold text-text sm:text-right tabular-nums">{money((detalle.cantidad * detalle.precioUnitario - detalle.descuento) * (1 + detalle.tasaImpuesto))}</span></div>)}</div></section><aside className="space-y-6"><section className="rounded-2xl bg-surface-muted p-6"><p className="text-xs font-medium text-text-muted">Cuenta por cobrar</p><p className="mt-2 text-2xl font-semibold text-text tabular-nums">{cuenta ? money(saldo) : '—'}</p><p className="mt-1 text-sm text-text-muted">{estadoCuenta ? `Estado: ${estadoCuenta}` : 'Se crea al facturar.'}</p>{cuenta ? <p className="mt-4 text-xs text-text-muted">Vencimiento {date(cuenta.fechaVencimiento)}</p> : null}</section><section className="rounded-2xl bg-surface p-6"><p className="text-xs font-medium text-text-muted">Información comercial</p><dl className="mt-4 space-y-3 text-sm"><div className="flex justify-between gap-4"><dt className="text-text-muted">Cliente</dt><dd className="text-right font-medium text-text">{cliente?.razonSocial ?? '—'}</dd></div><div className="flex justify-between gap-4"><dt className="text-text-muted">Condición</dt><dd className="font-medium text-text">{venta.condicionPago}</dd></div><div className="flex justify-between gap-4"><dt className="text-text-muted">Moneda</dt><dd className="font-medium text-text">{venta.moneda}</dd></div></dl></section></aside></div></div>
    </PageContent>
    <Drawer open={invoiceOpen} title="Facturar venta" onClose={() => setInvoiceOpen(false)}><div className="space-y-5"><p className="text-sm leading-6 text-text-muted">La facturación descuenta la mercadería, genera el comprobante y crea la cuenta por cobrar.</p><Select label="Tipo de comprobante" value={comprobante} onChange={(event) => setComprobante(event.target.value as 'Factura' | 'Boleta')} options={[{ value: 'Factura', label: 'Factura' }, { value: 'Boleta', label: 'Boleta' }]} /><div className="flex justify-end gap-2 border-t border-border pt-5"><Button variant="secondary" onClick={() => setInvoiceOpen(false)}>Cancelar</Button><Button onClick={invoice}>Confirmar facturación</Button></div></div></Drawer>
    <Drawer open={paymentOpen} title="Registrar cobro" onClose={() => setPaymentOpen(false)}><div className="space-y-5"><p className="text-sm leading-6 text-text-muted">Saldo pendiente: <strong className="text-text">{money(saldo)}</strong></p><Input label="Monto" type="number" min="0.01" max={saldo} step="0.01" value={monto} onChange={(event) => setMonto(Number(event.target.value))} /><Select label="Método de pago" value={metodoPago} onChange={(event) => setMetodoPago(event.target.value as MetodoPago)} options={['Efectivo', 'Yape', 'Plin', 'Transferencia bancaria', 'Tarjeta', 'Cheque'].map((value) => ({ value, label: value }))} />{metodoPago !== 'Efectivo' ? <Select label="Cuenta bancaria" value={cuentaBancariaId} onChange={(event) => setCuentaBancariaId(event.target.value)} options={state.cuentasBancarias.filter((item) => item.estado === 'Activo').map((item) => ({ value: item.id, label: item.nombre }))} /> : null}<div className="flex justify-end gap-2 border-t border-border pt-5"><Button variant="secondary" onClick={() => setPaymentOpen(false)}>Cancelar</Button><Button onClick={collect}>Guardar cobro</Button></div></div></Drawer>
    <ConfirmActionModal open={cancelOpen} title="Anular venta" description="La anulación quedará registrada en auditoría. Si la venta ya fue facturada, se generará una nota de crédito y se devolverá el stock." confirmLabel="Confirmar anulación" confirmDisabled={!motivo.trim()} onClose={() => setCancelOpen(false)} onConfirm={cancel}><Input label="Motivo de anulación" placeholder="Ej. Solicitud del cliente" value={motivo} onChange={(event) => setMotivo(event.target.value)} /></ConfirmActionModal>
    {toast ? <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} /> : null}
  </>
}
