import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageContent, PageHeader } from '../../components/layout/PageLayout'
import { Button, EmptyState, Input, Select, Toast } from '../../components/ui'
import { usePermisos } from '../../hooks'
import { useERPStore } from '../../store'
import { redondearDosDecimales } from '../../utils'

type SaleLine = { productoId: string; cantidad: number; precioUnitario: number; descuento: number; tasaImpuesto: number }
type ToastState = { message: string; tone: 'success' | 'danger' }

export function NewSalePage() {
  const state = useERPStore()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { puede } = usePermisos()
  const [clienteId, setClienteId] = useState(state.clientes.find((item) => item.estado === 'Activo')?.id ?? '')
  const [almacenId, setAlmacenId] = useState(state.configuracion.almacenPorDefectoId)
  const [condicionPago, setCondicionPago] = useState<'Contado' | 'Crédito'>('Contado')
  const [plazoCreditoDias, setPlazoCreditoDias] = useState(30)
  const [observaciones, setObservaciones] = useState('')
  const [lines, setLines] = useState<SaleLine[]>([])
  const [toast, setToast] = useState<ToastState | null>(null)
  const products = useMemo(() => state.productos.filter((item) => item.estado === 'Activo'), [state.productos])
  const cotizacionId = searchParams.get('cotizacionId')
  const cotizacion = useMemo(() => state.cotizaciones.find((item) => item.id === cotizacionId && item.estado === 'Aceptada'), [cotizacionId, state.cotizaciones])
  const convertedSale = useMemo(() => state.ventas.find((item) => item.cotizacionId === cotizacionId), [cotizacionId, state.ventas])
  const canCreate = puede('Ventas', 'crear')

  useEffect(() => {
    if (!cotizacion) return
    setClienteId(cotizacion.clienteId)
    setLines(cotizacion.items.map((item) => ({ productoId: item.productoId, cantidad: item.cantidad, precioUnitario: redondearDosDecimales(item.precioUnitario), descuento: item.descuento, tasaImpuesto: item.tasaImpuesto })))
  }, [cotizacion?.id])

  const addLine = () => {
    const product = products.find((item) => !lines.some((line) => line.productoId === item.id)) ?? products[0]
    if (!product) return
    setLines((current) => [...current, { productoId: product.id, cantidad: 1, precioUnitario: redondearDosDecimales(product.precioVenta), descuento: 0, tasaImpuesto: product.tasaImpuesto }])
  }
  const updateLine = (index: number, changes: Partial<SaleLine>) => setLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, ...changes } : line))
  const changeProduct = (index: number, productoId: string) => {
    const product = products.find((item) => item.id === productoId)
    if (product) updateLine(index, { productoId, precioUnitario: redondearDosDecimales(product.precioVenta), tasaImpuesto: product.tasaImpuesto })
  }
  const total = redondearDosDecimales(lines.reduce((sum, line) => {
    const base = line.cantidad * line.precioUnitario - line.descuento
    return sum + base + base * line.tasaImpuesto
  }, 0))
  const create = () => {
    if (!state.usuarioActualId) return
    const result = state.crearVenta({ clienteId, vendedorId: state.usuarioActualId, almacenId, condicionPago, plazoCreditoDias: condicionPago === 'Contado' ? 0 : plazoCreditoDias, cotizacionId: cotizacion?.id, items: lines.map((line) => ({ ...line, descripcionProducto: products.find((item) => item.id === line.productoId)?.nombre ?? '' })), observaciones: observaciones || undefined, usuarioId: state.usuarioActualId })
    if (!result.ok) { setToast({ message: result.error, tone: 'danger' }); return }
    const created = result.estado.ventas[result.estado.ventas.length - 1]
    setToast({ message: 'Venta creada en borrador.', tone: 'success' })
    navigate(`/comercial/ventas/${created.id}`)
  }

  if (!canCreate) return <><PageHeader title="Nueva venta" /><PageContent><EmptyState title="No tienes permiso para crear ventas" description="Solicita acceso a un Administrador para registrar una operación." /></PageContent></>
  if (convertedSale) return <><PageHeader title="Cotización ya convertida" actions={<Button variant="secondary" leadingIcon={ArrowLeft} onClick={() => navigate('/comercial/cotizaciones')}>Volver a cotizaciones</Button>} /><PageContent><EmptyState title="Esta cotización ya tiene una venta" description={`La cotización ya fue convertida en ${convertedSale.numero}. No se puede generar una segunda venta desde el mismo origen.`} /><div className="flex justify-center"><Button onClick={() => navigate(`/comercial/ventas/${convertedSale.id}`)}>Ver venta</Button></div></PageContent></>

  return <>
    <PageHeader title="Nueva venta" description="Registra el pedido comercial y envíalo a revisión cuando esté completo." actions={<Button variant="secondary" leadingIcon={ArrowLeft} onClick={() => navigate('/comercial/ventas')}>Volver a ventas</Button>} />
    <PageContent>
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-7">
          <section className="rounded-2xl bg-surface p-6">
            {cotizacion ? <p className="mb-4 rounded-xl bg-accent-soft px-4 py-3 text-sm text-accent">Venta basada en la cotización aceptada {cotizacion.numero}.</p> : null}<div className="grid gap-4 sm:grid-cols-2"><Select label="Cliente" value={clienteId} onChange={(event) => setClienteId(event.target.value)} options={state.clientes.filter((item) => item.estado === 'Activo').map((item) => ({ value: item.id, label: item.razonSocial }))} /><Select label="Almacén de salida" value={almacenId} onChange={(event) => setAlmacenId(event.target.value)} options={state.almacenes.filter((item) => item.estado === 'Activo').map((item) => ({ value: item.id, label: item.nombre }))} /></div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2"><Select label="Condición de pago" value={condicionPago} onChange={(event) => setCondicionPago(event.target.value as 'Contado' | 'Crédito')} options={[{ value: 'Contado', label: 'Contado' }, { value: 'Crédito', label: 'Crédito' }]} />{condicionPago === 'Crédito' ? <Input label="Plazo de crédito" type="number" min="1" value={plazoCreditoDias} onChange={(event) => setPlazoCreditoDias(Number(event.target.value))} /> : <div />}</div>
          </section>
          <section className="rounded-2xl bg-surface p-6"><div className="flex items-start justify-between gap-4"><div><h2 className="text-base font-semibold text-text">Productos</h2><p className="mt-1 text-sm text-text-muted">El stock se valida al aprobar la venta y se descuenta al facturar.</p></div><Button size="sm" variant="secondary" leadingIcon={Plus} onClick={addLine}>Agregar línea</Button></div><div className="mt-5 space-y-3">{lines.length === 0 ? <p className="rounded-xl bg-surface-muted px-4 py-5 text-sm text-text-muted">Agrega al menos un producto para comenzar.</p> : lines.map((line, index) => <div key={`${index}-${line.productoId}`} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_6rem_7rem_6rem_auto] sm:items-end"><Select label={index === 0 ? 'Producto' : undefined} value={line.productoId} onChange={(event) => changeProduct(index, event.target.value)} options={products.map((item) => ({ value: item.id, label: `${item.nombre} · ${item.sku}` }))} /><Input label={index === 0 ? 'Cantidad' : undefined} type="number" min="0.01" step="0.01" value={line.cantidad} onChange={(event) => updateLine(index, { cantidad: Number(event.target.value) })} /><Input label={index === 0 ? 'Precio' : undefined} type="number" min="0" step="0.01" value={line.precioUnitario} onChange={(event) => updateLine(index, { precioUnitario: Number(event.target.value) })} /><Input label={index === 0 ? 'Desc.' : undefined} type="number" min="0" step="0.01" value={line.descuento} onChange={(event) => updateLine(index, { descuento: Number(event.target.value) })} /><Button aria-label="Quitar línea" variant="ghost" size="sm" onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))}><Trash2 size={16} strokeWidth={1.5} /></Button></div>)}</div></section>
          <section className="rounded-2xl bg-surface p-6"><Input label="Observaciones" value={observaciones} onChange={(event) => setObservaciones(event.target.value)} placeholder="Información adicional para la operación" /></section>
        </div>
        <aside className="h-fit rounded-2xl bg-surface-muted p-6"><p className="text-xs font-medium text-text-muted">Resumen de venta</p><p className="mt-3 text-3xl font-semibold tracking-tight text-text tabular-nums">S/ {total.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</p><p className="mt-1 text-sm text-text-muted">Total estimado con IGV</p><div className="mt-6 flex gap-2"><Button variant="secondary" className="min-w-0 flex-1 whitespace-nowrap px-2 text-xs" onClick={() => navigate('/comercial/ventas')}>Cancelar</Button><Button className="min-w-0 flex-1 whitespace-nowrap px-2 text-xs" onClick={create} disabled={lines.length === 0}>Crear borrador</Button></div></aside>
      </div>
    </PageContent>
    {toast ? <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} /> : null}
  </>
}
