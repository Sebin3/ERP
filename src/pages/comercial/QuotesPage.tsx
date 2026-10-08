import { FileText, Plus, ReceiptText } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DataTable, type DataTableColumn } from '../../components/data-display/DataTable'
import { PageContent, PageHeader } from '../../components/layout/PageLayout'
import { Avatar, Button, Dropdown, StatusPill } from '../../components/ui'
import { usePermisos } from '../../hooks'
import { useERPStore } from '../../store'
import type { Cotizacion, EstadoCotizacion } from '../../types'
import { redondearDosDecimales } from '../../utils'

const date = (value: string) => new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium' }).format(new Date(`${value}T12:00:00Z`))
const money = (value: number) => `S/ ${value.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`
const total = (quote: Cotizacion) => redondearDosDecimales(quote.items.reduce((sum, item) => { const base = item.cantidad * item.precioUnitario - item.descuento; return sum + base + base * item.tasaImpuesto }, 0))
const tone = (status: EstadoCotizacion) => status === 'Aceptada' ? 'success' as const : status === 'Anulada' || status === 'Rechazada' ? 'danger' as const : status === 'Enviada' ? 'warning' as const : 'neutral' as const

interface QuoteRow { id: string; quote: Cotizacion; client: string; seller: string; total: number }

const columns = (onOpen: (id: string) => void): DataTableColumn<QuoteRow>[] => [
  { key: 'quote', header: 'Cotización', sortable: true, sortValue: (row) => row.quote.numero, render: (row) => <div><span className="block font-medium text-text">{row.quote.numero}</span><span className="mt-0.5 block text-xs text-text-muted">{date(row.quote.fecha)}</span></div> },
  { key: 'client', header: 'Cliente', sortable: true, sortValue: (row) => row.client, render: (row) => <div className="flex items-center gap-3"><Avatar name={row.client} size="sm" /><span className="font-medium text-text">{row.client}</span></div> },
  { key: 'seller', header: 'Vendedor', hideOnMobile: true, sortable: true, sortValue: (row) => row.seller, render: (row) => row.seller },
  { key: 'validity', header: 'Válida hasta', hideOnMobile: true, sortable: true, sortValue: (row) => row.quote.validezHasta, render: (row) => date(row.quote.validezHasta) },
  { key: 'status', header: 'Estado', sortable: true, sortValue: (row) => row.quote.estado, render: (row) => <StatusPill label={row.quote.estado} tone={tone(row.quote.estado)} /> },
  { key: 'total', header: 'Total', align: 'right', sortable: true, sortValue: (row) => row.total, render: (row) => <span className="font-semibold text-text tabular-nums">{money(row.total)}</span> },
  { key: 'actions', header: '', align: 'right', render: (row) => <Dropdown items={[{ label: 'Ver detalle', icon: ReceiptText, onSelect: () => onOpen(row.id) }]} /> },
]

export function QuotesPage() {
  const state = useERPStore()
  const navigate = useNavigate()
  const { puede } = usePermisos()
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const rows = useMemo<QuoteRow[]>(() => state.cotizaciones.map((quote) => { const seller = state.usuarios.find((item) => item.id === quote.vendedorId); return { id: quote.id, quote, client: state.clientes.find((item) => item.id === quote.clienteId)?.razonSocial ?? 'Cliente no encontrado', seller: seller ? `${seller.nombres} ${seller.apellidos}` : 'Usuario no encontrado', total: total(quote) } }).filter((row) => { const term = query.trim().toLowerCase(); return !term || [row.quote.numero, row.client, row.seller, row.quote.estado].some((value) => value.toLowerCase().includes(term)) }), [query, state.clientes, state.cotizaciones, state.usuarios])
  return <><PageHeader title="Cotizaciones" description="Propuestas comerciales antes de convertirlas en una venta." actions={puede('Cotizaciones', 'crear') ? <Button leadingIcon={Plus} onClick={() => navigate('/comercial/cotizaciones/nueva')}>Nueva cotización</Button> : undefined} /><PageContent><div className="mb-5 flex items-center gap-3 rounded-xl bg-surface-muted px-4 py-3 text-sm text-text-soft"><FileText size={17} strokeWidth={1.5} className="text-text-muted" /><span>{state.cotizaciones.length} cotizaciones registradas</span><span className="hidden text-xs text-text-muted sm:block">Una cotización aceptada puede convertirse en venta.</span></div><DataTable rows={rows} columns={columns((id) => navigate(`/comercial/cotizaciones/${id}`))} getRowId={(row) => row.id} selectedIds={selectedIds} onSelectedIdsChange={setSelectedIds} searchValue={query} onSearchChange={(value) => { setQuery(value); setPage(1) }} page={page} pageSize={10} onPageChange={setPage} totalCount={rows.length} responsive showSelectionSummary={false} emptyTitle="No encontramos cotizaciones" emptyDescription="Crea una propuesta para iniciar una oportunidad comercial." /></PageContent></>
}
