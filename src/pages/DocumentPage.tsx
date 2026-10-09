import { ArrowLeft, Download, Eye, FileText, FolderOpen, Plus, Upload } from 'lucide-react'
import { jsPDF } from 'jspdf'
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { DataTable, type DataTableColumn } from '../components/data-display/DataTable'
import { PageContent, PageHeader } from '../components/layout/PageLayout'
import { Button, Drawer, Dropdown, EmptyState, Input, Modal, Select, StatusPill, Toast } from '../components/ui'
import { usePermisos } from '../hooks'
import { useERPStore } from '../store'
import { selectTotalCompra, selectTotalVenta } from '../store/selectors'
import { redondearDosDecimales } from '../utils'
import type { Documento, TipoDocumento, TipoEntidadDocumento } from '../types'

type ToastState = { message: string; tone: 'success' | 'danger' }
type EntityType = TipoEntidadDocumento

const date = (value: string) => new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium' }).format(new Date(value))
const money = (value: number) => `S/ ${redondearDosDecimales(Math.abs(value)).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const bytes = (value: number) => value < 1024 * 1024 ? `${Math.max(1, Math.round(value / 1024))} KB` : `${(value / (1024 * 1024)).toFixed(1)} MB`
const documentTypes: TipoDocumento[] = ['Cotización', 'Orden de compra', 'Comprobante de venta', 'Comprobante de compra', 'Guía de remisión', 'Contrato', 'Otro']
const entityTypes: EntityType[] = ['Venta', 'Compra', 'Cliente', 'Proveedor', 'Cotización', 'OrdenCompra']

function entityName(state: ReturnType<typeof useERPStore.getState>, type: EntityType, id: string): string {
  if (type === 'Venta') return state.ventas.find((item) => item.id === id)?.numero ?? id
  if (type === 'Compra') return state.compras.find((item) => item.id === id)?.numero ?? id
  if (type === 'Cliente') return state.clientes.find((item) => item.id === id)?.razonSocial ?? id
  if (type === 'Proveedor') return state.proveedores.find((item) => item.id === id)?.razonSocial ?? id
  if (type === 'Cotización') return state.cotizaciones.find((item) => item.id === id)?.numero ?? id
  return state.ordenesCompra.find((item) => item.id === id)?.numero ?? id
}

function entityOptions(state: ReturnType<typeof useERPStore.getState>, type: EntityType): Array<{ value: string; label: string }> {
  if (type === 'Venta') return state.ventas.map((item) => ({ value: item.id, label: `${item.numero} · ${state.clientes.find((client) => client.id === item.clienteId)?.razonSocial ?? 'Cliente'}` }))
  if (type === 'Compra') return state.compras.map((item) => ({ value: item.id, label: `${item.numero} · ${state.proveedores.find((supplier) => supplier.id === item.proveedorId)?.razonSocial ?? 'Proveedor'}` }))
  if (type === 'Cliente') return state.clientes.map((item) => ({ value: item.id, label: item.razonSocial }))
  if (type === 'Proveedor') return state.proveedores.map((item) => ({ value: item.id, label: item.razonSocial }))
  if (type === 'Cotización') return state.cotizaciones.map((item) => ({ value: item.id, label: `${item.numero} · ${state.clientes.find((client) => client.id === item.clienteId)?.razonSocial ?? 'Cliente'}` }))
  return state.ordenesCompra.map((item) => ({ value: item.id, label: `${item.numero} · ${state.proveedores.find((supplier) => supplier.id === item.proveedorId)?.razonSocial ?? 'Proveedor'}` }))
}

function documentColumns(state: ReturnType<typeof useERPStore.getState>, onOpen: (id: string) => void, onPreview: (id: string) => void): DataTableColumn<Documento>[] {
  return [
    { key: 'file', header: 'Archivo', sortable: true, sortValue: (row) => row.nombreArchivo, render: (row) => <div><span className="block truncate font-medium text-text">{row.nombreArchivo}</span><span className="mt-0.5 block text-xs text-text-muted">{row.mimeType}</span></div> },
    { key: 'type', header: 'Tipo', sortable: true, sortValue: (row) => row.tipo, render: (row) => <StatusPill label={row.tipo} tone={row.tipo.includes('Comprobante') ? 'accent' : 'neutral'} /> },
    { key: 'entity', header: 'Asociado a', sortable: true, sortValue: (row) => entityName(state, row.entidadTipo, row.entidadId), render: (row) => <div><span className="block truncate font-medium text-text">{entityName(state, row.entidadTipo, row.entidadId)}</span><span className="mt-0.5 block text-xs text-text-muted">{row.entidadTipo}</span></div> },
    { key: 'size', header: 'Tamaño', align: 'right', sortable: true, sortValue: (row) => row.tamanoBytes, render: (row) => <span className="tabular-nums text-text-soft">{bytes(row.tamanoBytes)}</span> },
    { key: 'date', header: 'Subido', hideOnMobile: true, sortable: true, sortValue: (row) => row.creadoEn, render: (row) => <span className="whitespace-nowrap text-text-soft">{date(row.creadoEn)}</span> },
    { key: 'actions', header: '', align: 'right', render: (row) => <Dropdown items={[{ label: 'Vista previa', icon: Eye, onSelect: () => onPreview(row.id) }, { label: 'Ver detalle', icon: FileText, onSelect: () => onOpen(row.id) }]} /> },
  ]
}

type PreviewLine = { description: string; quantity: number; unitPrice: number; total: number }

function previewData(state: ReturnType<typeof useERPStore.getState>, document: Documento): { title: string; number: string; date: string; partyLabel: string; party: string; lines: PreviewLine[]; total: number } {
  if (document.entidadTipo === 'Venta') {
    const sale = state.ventas.find((item) => item.id === document.entidadId)
    const client = sale ? state.clientes.find((item) => item.id === sale.clienteId) : undefined
    const details = sale ? state.detallesVenta.filter((item) => sale.detalleIds.includes(item.id)) : []
    const comprobante = state.comprobantes.find((item) => 'ventaId' in item && item.ventaId === document.entidadId && item.tipo !== 'Nota de crédito')
    return { title: comprobante?.tipo === 'Boleta' ? 'BOLETA DE VENTA' : 'FACTURA DE VENTA', number: comprobante ? `${comprobante.serie}-${comprobante.numero}` : sale?.numero ?? document.entidadId, date: sale?.fecha ?? document.creadoEn, partyLabel: 'Cliente', party: client?.razonSocial ?? 'Cliente no encontrado', lines: details.map((item) => ({ description: item.descripcionProducto, quantity: item.cantidad, unitPrice: item.precioUnitario, total: redondearDosDecimales((item.cantidad * item.precioUnitario - item.descuento) * (1 + item.tasaImpuesto)) })), total: sale ? selectTotalVenta(state, sale.id) : 0 }
  }
  if (document.entidadTipo === 'Compra') {
    const purchase = state.compras.find((item) => item.id === document.entidadId)
    const supplier = purchase ? state.proveedores.find((item) => item.id === purchase.proveedorId) : undefined
    const details = purchase ? state.detallesCompra.filter((item) => purchase.detalleIds.includes(item.id)) : []
    const comprobante = state.comprobantes.find((item) => 'compraId' in item && item.compraId === document.entidadId)
    return { title: 'FACTURA DE COMPRA', number: comprobante ? `${comprobante.serie}-${comprobante.numero}` : purchase?.numero ?? document.entidadId, date: purchase?.fecha ?? document.creadoEn, partyLabel: 'Proveedor', party: supplier?.razonSocial ?? 'Proveedor no encontrado', lines: details.map((item) => ({ description: item.descripcionProducto, quantity: item.cantidad, unitPrice: item.costoUnitario, total: redondearDosDecimales(item.cantidad * item.costoUnitario * (1 + item.tasaImpuesto)) })), total: purchase ? selectTotalCompra(state, purchase.id) : 0 }
  }
  if (document.entidadTipo === 'Cotización') {
    const quote = state.cotizaciones.find((item) => item.id === document.entidadId)
    const client = quote ? state.clientes.find((item) => item.id === quote.clienteId) : undefined
    const lines = quote?.items.map((item) => ({ description: item.descripcionProducto, quantity: item.cantidad, unitPrice: item.precioUnitario, total: redondearDosDecimales((item.cantidad * item.precioUnitario - item.descuento) * (1 + item.tasaImpuesto)) })) ?? []
    return { title: 'COTIZACIÓN COMERCIAL', number: quote?.numero ?? document.entidadId, date: quote?.fecha ?? document.creadoEn, partyLabel: 'Cliente', party: client?.razonSocial ?? 'Cliente no encontrado', lines, total: redondearDosDecimales(lines.reduce((sum, item) => sum + item.total, 0)) }
  }
  const order = state.ordenesCompra.find((item) => item.id === document.entidadId)
  const supplier = order ? state.proveedores.find((item) => item.id === order.proveedorId) : undefined
  const lines = order?.items.map((item) => ({ description: state.productos.find((product) => product.id === item.productoId)?.nombre ?? item.productoId, quantity: item.cantidad, unitPrice: item.costoUnitario, total: redondearDosDecimales(item.cantidad * item.costoUnitario) })) ?? []
  return { title: 'ORDEN DE COMPRA', number: order?.numero ?? document.entidadId, date: order?.fecha ?? document.creadoEn, partyLabel: 'Proveedor', party: supplier?.razonSocial ?? 'Proveedor no encontrado', lines, total: redondearDosDecimales(lines.reduce((sum, item) => sum + item.total, 0)) }
}

function DocumentPreview({ state, document }: { state: ReturnType<typeof useERPStore.getState>; document: Documento }) {
  const preview = previewData(state, document)
  const company = state.configuracion.datosEmpresa
  return <div className="mt-6 rounded-2xl bg-surface-muted p-3 sm:p-6"><div className="mx-auto max-w-3xl bg-surface p-5 ring-1 ring-border/70 sm:p-8"><div className="flex flex-wrap items-start justify-between gap-6 border-b border-border pb-6"><div><p className="text-lg font-semibold tracking-tight text-text">{company.nombreComercial ?? company.razonSocial}</p><p className="mt-1 max-w-xs text-xs leading-5 text-text-muted">{company.razonSocial} · {company.tipoDocumento} {company.numeroDocumento}<br />{company.direccion}</p></div><div className="min-w-44 rounded-xl border border-border p-4 text-center"><p className="text-[10px] font-semibold tracking-[0.18em] text-text-muted">{preview.title}</p><p className="mt-2 text-base font-semibold tabular-nums text-text">{preview.number}</p><p className="mt-1 text-xs text-text-muted">Moneda: PEN</p></div></div><div className="grid gap-4 border-b border-border py-5 text-sm sm:grid-cols-2"><div><p className="text-xs text-text-muted">{preview.partyLabel}</p><p className="mt-1 font-medium text-text">{preview.party}</p></div><div className="sm:text-right"><p className="text-xs text-text-muted">Fecha de emisión</p><p className="mt-1 font-medium text-text">{date(preview.date)}</p></div></div><div className="mt-6 overflow-hidden rounded-lg ring-1 ring-border/70"><div className="grid grid-cols-[minmax(0,1fr)_4rem_6rem_6rem] gap-3 bg-surface-muted px-3 py-2 text-[11px] font-medium text-text-muted sm:grid-cols-[minmax(0,1fr)_5rem_7rem_7rem]"><span>Descripción</span><span className="text-right">Cant.</span><span className="text-right">P. unit.</span><span className="text-right">Importe</span></div>{preview.lines.length ? preview.lines.map((line, index) => <div key={`${line.description}-${index}`} className="grid grid-cols-[minmax(0,1fr)_4rem_6rem_6rem] gap-3 border-t border-border/60 px-3 py-3 text-xs text-text sm:grid-cols-[minmax(0,1fr)_5rem_7rem_7rem]"><span className="truncate">{line.description}</span><span className="text-right tabular-nums">{line.quantity}</span><span className="text-right tabular-nums">{money(line.unitPrice)}</span><span className="text-right tabular-nums">{money(line.total)}</span></div>) : <p className="px-3 py-8 text-center text-xs text-text-muted">No hay líneas comerciales para previsualizar.</p>}</div><div className="mt-6 flex justify-end"><div className="w-full max-w-xs space-y-2 text-sm"><div className="flex justify-between gap-4 text-text-muted"><span>Subtotal</span><span className="tabular-nums">{money(preview.total / 1.18)}</span></div><div className="flex justify-between gap-4 text-text-muted"><span>IGV 18%</span><span className="tabular-nums">{money(preview.total - preview.total / 1.18)}</span></div><div className="flex justify-between gap-4 border-t border-border pt-3 text-base font-semibold text-text"><span>Total</span><span className="tabular-nums">{money(preview.total)}</span></div></div></div><p className="mt-8 border-t border-border pt-4 text-[11px] leading-5 text-text-muted">Documento comercial generado para la demostración de ERP EnterpriseCloud.</p></div></div>
}

function generateDocumentPdf(state: ReturnType<typeof useERPStore.getState>, document: Documento) {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
  const preview = previewData(state, document)
  const company = state.configuracion.datosEmpresa
  const width = pdf.internal.pageSize.getWidth()
  const bottom = pdf.internal.pageSize.getHeight() - 20
  const taxRate = state.configuracion.igvPorDefecto > 1 ? state.configuracion.igvPorDefecto / 100 : state.configuracion.igvPorDefecto
  const subtotal = redondearDosDecimales(preview.total / (1 + taxRate))
  const tax = redondearDosDecimales(preview.total - subtotal)
  let y = 20

  const color = (hex: string) => {
    const value = hex.replace('#', '')
    return [Number.parseInt(value.slice(0, 2), 16), Number.parseInt(value.slice(2, 4), 16), Number.parseInt(value.slice(4, 6), 16)] as [number, number, number]
  }
  const text = color('#111318')
  const muted = color('#6B7280')
  const border = color('#D9DCE2')
  const blue = color('#2F6BFF')
  const pdfMoney = (value: number) => `S/ ${redondearDosDecimales(Math.abs(value)).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const ensureSpace = (amount: number) => {
    if (y + amount > bottom) {
      pdf.addPage()
      y = 20
    }
  }
  const line = (x1: number, y1: number, x2: number, y2: number) => {
    pdf.setDrawColor(...border)
    pdf.setLineWidth(0.25)
    pdf.line(x1, y1, x2, y2)
  }

  pdf.setFillColor(...blue)
  pdf.roundedRect(20, y - 6, 8, 8, 2, 2, 'F')
  pdf.setTextColor(...text)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(15)
  pdf.text(company.nombreComercial ?? company.razonSocial, 32, y)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8.5)
  pdf.setTextColor(...muted)
  pdf.text(`${company.razonSocial} · ${company.tipoDocumento} ${company.numeroDocumento}`, 32, y + 6)
  pdf.text(company.direccion, 32, y + 11)

  const boxX = width - 78
  pdf.setDrawColor(...border)
  pdf.roundedRect(boxX, 14, 58, 30, 3, 3, 'S')
  pdf.setTextColor(...blue)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(8)
  pdf.text(preview.title, boxX + 29, 22, { align: 'center' })
  pdf.setTextColor(...text)
  pdf.setFontSize(12)
  pdf.text(preview.number, boxX + 29, 30, { align: 'center' })
  pdf.setTextColor(...muted)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8)
  pdf.text('Moneda: PEN', boxX + 29, 37, { align: 'center' })
  y = 55
  line(20, y, width - 20, y)

  pdf.setTextColor(...muted)
  pdf.setFontSize(8)
  pdf.text(preview.partyLabel.toUpperCase(), 20, y + 9)
  pdf.setTextColor(...text)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(10)
  pdf.text(preview.party, 20, y + 16)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(...muted)
  pdf.setFontSize(8)
  pdf.text('FECHA DE EMISIÓN', width - 75, y + 9)
  pdf.setTextColor(...text)
  pdf.setFontSize(10)
  pdf.text(date(preview.date), width - 75, y + 16)
  y += 29

  pdf.setFillColor(245, 245, 247)
  pdf.roundedRect(20, y, width - 40, 9, 2, 2, 'F')
  pdf.setTextColor(...muted)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(8)
  pdf.text('DESCRIPCIÓN', 24, y + 6)
  pdf.text('CANT.', width - 102, y + 6, { align: 'right' })
  pdf.text('P. UNIT.', width - 67, y + 6, { align: 'right' })
  pdf.text('IMPORTE', width - 24, y + 6, { align: 'right' })
  y += 9

  for (const item of preview.lines) {
    const description = pdf.splitTextToSize(item.description, width - 112)
    const rowHeight = Math.max(8, description.length * 4 + 5)
    ensureSpace(rowHeight + 2)
    pdf.setTextColor(...text)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8.5)
    pdf.text(description, 24, y + 5)
    pdf.text(String(item.quantity), width - 102, y + 5, { align: 'right' })
    pdf.text(pdfMoney(item.unitPrice), width - 67, y + 5, { align: 'right' })
    pdf.text(pdfMoney(item.total), width - 24, y + 5, { align: 'right' })
    y += rowHeight
    line(20, y, width - 20, y)
  }
  if (!preview.lines.length) {
    pdf.setTextColor(...muted)
    pdf.setFontSize(9)
    pdf.text('No hay líneas comerciales para previsualizar.', width / 2, y + 8, { align: 'center' })
    y += 16
  }

  ensureSpace(43)
  const totalsX = width - 82
  y += 12
  pdf.setFontSize(9)
  pdf.setTextColor(...muted)
  pdf.text('Subtotal referencial', totalsX, y)
  pdf.text(pdfMoney(subtotal), width - 24, y, { align: 'right' })
  y += 7
  pdf.text(`IGV referencial (${Math.round(taxRate * 100)}%)`, totalsX, y)
  pdf.text(pdfMoney(tax), width - 24, y, { align: 'right' })
  y += 4
  line(totalsX, y, width - 20, y)
  y += 9
  pdf.setTextColor(...text)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(11)
  pdf.text('TOTAL', totalsX, y)
  pdf.text(pdfMoney(preview.total), width - 24, y, { align: 'right' })
  const pageCount = pdf.getNumberOfPages()
  for (let page = 1; page <= pageCount; page += 1) {
    pdf.setPage(page)
    const footerY = pdf.internal.pageSize.getHeight() - 18
    line(20, footerY, width - 20, footerY)
    pdf.setTextColor(...muted)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(7.5)
    pdf.text('Vista previa comercial generada para ERP EnterpriseCloud. Documento referencial de la demo frontend.', 20, footerY + 7)
    pdf.text(`Página ${page} de ${pageCount}`, width - 20, footerY + 7, { align: 'right' })
  }
  pdf.save(`${preview.number.replace(/[^a-zA-Z0-9-]+/g, '-')}.pdf`)
}

export function DocumentsPage() {
  const state = useERPStore()
  const navigate = useNavigate()
  const { puede } = usePermisos()
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [previewDocumentId, setPreviewDocumentId] = useState<string | null>(null)
  const [type, setType] = useState<TipoDocumento>('Comprobante de venta')
  const [entityType, setEntityType] = useState<EntityType>('Venta')
  const [entityId, setEntityId] = useState(state.ventas[0]?.id ?? '')
  const [file, setFile] = useState<File | null>(null)
  const [toast, setToast] = useState<ToastState | null>(null)
  const canUpload = puede('Documentos', 'crear')
  const rows = useMemo(() => { const normalized = query.trim().toLowerCase(); return state.documentos.filter((document) => !normalized || [document.nombreArchivo, document.tipo, document.entidadTipo, entityName(state, document.entidadTipo, document.entidadId)].some((value) => value.toLowerCase().includes(normalized))) }, [query, state])
  const options = entityOptions(state, entityType)
  const notify = (result: { ok: true } | { ok: false; error: string }) => { if (!result.ok) { setToast({ message: result.error, tone: 'danger' }); return false }; setToast({ message: 'Documento registrado correctamente.', tone: 'success' }); return true }
  const closeDrawer = () => { setDrawerOpen(false); setFile(null) }
  const upload = () => { if (!file || !state.usuarioActualId || !entityId) return; const result = state.subirDocumentoSimulado({ tipo: type, nombreArchivo: file.name, mimeType: file.type || 'application/octet-stream', tamanoBytes: file.size, entidadTipo: entityType, entidadId: entityId, urlSimulada: '#', subidoPorUsuarioId: state.usuarioActualId, usuarioId: state.usuarioActualId }); if (notify(result)) closeDrawer() }
  const changeEntityType = (value: EntityType) => { setEntityType(value); setEntityId(entityOptions(state, value)[0]?.value ?? '') }

  return <>
    <PageHeader title="Gesti?n documental" description="Repositorio de archivos asociados a las operaciones del ERP." actions={canUpload ? <Button leadingIcon={Plus} onClick={() => setDrawerOpen(true)}>Subir documento</Button> : undefined} />
    <PageContent>
      <div className="mb-5 flex items-center gap-3 rounded-xl bg-surface-muted px-4 py-3 text-sm text-text-soft"><FolderOpen size={17} strokeWidth={1.5} className="text-text-muted" /><span>{state.documentos.length} documentos registrados</span><span className="hidden text-xs text-text-muted sm:block">Cada archivo está vinculado a una operación o maestro existente.</span></div>
      <DataTable rows={rows} columns={documentColumns(state, (id) => navigate(`/documentos/${id}`), setPreviewDocumentId)} getRowId={(row) => row.id} selectedIds={selectedIds} onSelectedIdsChange={setSelectedIds} searchValue={query} onSearchChange={(value) => { setQuery(value); setPage(1) }} page={page} pageSize={10} onPageChange={setPage} totalCount={rows.length} responsive showSelectionSummary={false} emptyTitle="No encontramos documentos" emptyDescription="Adjunta un archivo o prueba con otra búsqueda." />
    </PageContent>
    <Drawer open={drawerOpen} title="Subir documento" onClose={closeDrawer}><div className="space-y-5"><p className="text-sm leading-6 text-text-muted">Selecciona un archivo local y vincúlalo con una operación o maestro existente para consultarlo desde el ERP.</p><Input label="Archivo" type="file" accept=".pdf,.jpg,.jpeg,.png,.xlsx,.docx" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /><Select label="Tipo de documento" value={type} onChange={(event) => setType(event.target.value as TipoDocumento)} options={documentTypes.map((value) => ({ value, label: value }))} /><Select label="Asociar a" value={entityType} onChange={(event) => changeEntityType(event.target.value as EntityType)} options={entityTypes.map((value) => ({ value, label: value === 'OrdenCompra' ? 'Orden de compra' : value }))} /><Select label="Entidad" value={entityId} onChange={(event) => setEntityId(event.target.value)} options={options} /><div className="flex justify-end gap-2 border-t border-border pt-5"><Button variant="secondary" onClick={closeDrawer}>Cancelar</Button><Button leadingIcon={Upload} disabled={!file || !entityId} onClick={upload}>Subir documento</Button></div></div></Drawer>
    <Modal open={Boolean(previewDocumentId)} title={previewDocumentId ? `Vista previa · ${state.documentos.find((item) => item.id === previewDocumentId)?.nombreArchivo ?? 'Documento'}` : 'Vista previa'} size="xl" onClose={() => setPreviewDocumentId(null)}>{previewDocumentId ? <DocumentPreview state={state} document={state.documentos.find((item) => item.id === previewDocumentId)!} /> : null}</Modal>
    {toast ? <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} /> : null}
  </>
}

export function DocumentDetailPage() {
  const { documentoId } = useParams<{ documentoId: string }>()
  const navigate = useNavigate()
  const state = useERPStore()
  const { puede } = usePermisos()
  const document = state.documentos.find((item) => item.id === documentoId)
  const [previewOpen, setPreviewOpen] = useState(false)
  if (!document) return <><PageHeader title="Documento no encontrado" /><PageContent><EmptyState title="No encontramos este documento" description="El registro puede haber sido eliminado o el enlace no es válido." /><div className="flex justify-center"><Button variant="secondary" leadingIcon={ArrowLeft} onClick={() => navigate('/documentos')}>Volver a documentos</Button></div></PageContent></>
  const uploader = state.usuarios.find((item) => item.id === document.subidoPorUsuarioId)
  return <><PageHeader title={document.nombreArchivo} description={`${document.tipo} · ${date(document.creadoEn)}`} actions={<div className="flex flex-wrap gap-2"><Button variant="secondary" leadingIcon={Eye} onClick={() => setPreviewOpen(true)}>Vista previa</Button>{puede('Documentos', 'exportar') ? <Button variant="secondary" leadingIcon={Download} onClick={() => generateDocumentPdf(state, document)}>Descargar PDF</Button> : null}<Button variant="secondary" leadingIcon={ArrowLeft} onClick={() => navigate('/documentos')}>Volver</Button></div>} /><PageContent><section className="max-w-2xl rounded-2xl bg-surface p-6"><div className="flex items-start gap-4"><span className="grid size-12 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent"><FileText size={22} strokeWidth={1.5} /></span><div className="min-w-0"><h2 className="truncate text-base font-semibold text-text">{document.nombreArchivo}</h2><p className="mt-1 text-sm text-text-muted">{document.mimeType} · {bytes(document.tamanoBytes)}</p></div></div><dl className="mt-6 divide-y divide-border/60 text-sm"><div className="flex justify-between gap-4 py-3"><dt className="text-text-muted">Tipo de documento</dt><dd className="font-medium text-text">{document.tipo}</dd></div><div className="flex justify-between gap-4 py-3"><dt className="text-text-muted">Entidad asociada</dt><dd className="text-right font-medium text-text">{document.entidadTipo} · {entityName(state, document.entidadTipo, document.entidadId)}</dd></div><div className="flex justify-between gap-4 py-3"><dt className="text-text-muted">Identificador relacionado</dt><dd className="text-right font-mono text-xs text-text-soft">{document.entidadId}</dd></div><div className="flex justify-between gap-4 py-3"><dt className="text-text-muted">Subido por</dt><dd className="text-right font-medium text-text">{uploader ? `${uploader.nombres} ${uploader.apellidos}` : 'Usuario no encontrado'}</dd></div><div className="flex justify-between gap-4 py-3"><dt className="text-text-muted">Fecha de registro</dt><dd className="font-medium text-text">{date(document.creadoEn)}</dd></div><div className="flex justify-between gap-4 py-3"><dt className="text-text-muted">Última actualización</dt><dd className="font-medium text-text">{date(document.actualizadoEn)}</dd></div></dl><div className="mt-6 rounded-xl bg-surface-muted p-4 text-sm leading-6 text-text-muted">El archivo está vinculado a la entidad indicada y su contenido comercial se puede consultar con `Vista previa`.</div></section></PageContent><Modal open={previewOpen} title={`Vista previa · ${document.nombreArchivo}`} size="xl" onClose={() => setPreviewOpen(false)}><DocumentPreview state={state} document={document} /></Modal></>
}
