import { ArrowRight, MapPin, Pencil, UsersRound } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DataTable, type DataTableColumn } from '../../components/data-display/DataTable'
import { PageContent, PageHeader } from '../../components/layout/PageLayout'
import { Avatar, Dropdown, StatusPill } from '../../components/ui'
import { usePermisos } from '../../hooks'
import { useERPStore } from '../../store'
import type { Cliente } from '../../types'

function statusTone(status: Cliente['estado']) {
  return status === 'Activo' ? 'success' as const : 'neutral' as const
}

function documentLabel(cliente: Cliente) {
  return `${cliente.tipoDocumento} ${cliente.numeroDocumento}`
}

function customerColumns(onOpen: (id: string) => void, onEdit: (id: string) => void, canEdit: boolean): DataTableColumn<Cliente>[] {
  return [
    { key: 'customer', header: 'Cliente', sortable: true, sortValue: (row) => row.razonSocial, render: (row) => <div className="flex items-center gap-3"><Avatar name={row.razonSocial} size="sm" /><div className="min-w-0"><span className="block truncate font-medium text-text">{row.razonSocial}</span><span className="mt-0.5 block text-xs text-text-muted">{row.nombreComercial ?? 'Sin nombre comercial'}</span></div></div> },
    { key: 'document', header: 'Documento', sortable: true, sortValue: (row) => row.numeroDocumento, render: (row) => <span className="tabular-nums">{documentLabel(row)}</span> },
    { key: 'location', header: 'Ubicación', hideOnMobile: true, sortable: true, sortValue: (row) => row.provincia, render: (row) => <span className="inline-flex items-center gap-1.5"><MapPin size={14} strokeWidth={1.5} className="text-text-muted" />{row.provincia}</span> },
    { key: 'credit', header: 'Crédito', hideOnMobile: true, align: 'right', sortable: true, sortValue: (row) => row.limiteCredito, render: (row) => <div className="text-right"><span className="block font-medium text-text tabular-nums">S/ {row.limiteCredito.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span><span className="mt-0.5 block text-xs text-text-muted">{row.diasCredito} días</span></div> },
    { key: 'status', header: 'Estado', sortable: true, sortValue: (row) => row.estado, render: (row) => <StatusPill label={row.estado} tone={statusTone(row.estado)} /> },
    { key: 'actions', header: '', align: 'right', render: (row) => <Dropdown items={[{ label: 'Ver ficha', icon: ArrowRight, onSelect: () => onOpen(row.id) }, ...(canEdit ? [{ label: 'Editar ficha', icon: Pencil, onSelect: () => onEdit(row.id) }] : [])]} /> },
  ]
}

export function ClientsPage() {
  const navigate = useNavigate()
  const state = useERPStore()
  const { puede } = usePermisos()
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const canEdit = puede('Clientes', 'editar')

  const rows = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return state.clientes
    return state.clientes.filter((cliente) => [cliente.razonSocial, cliente.nombreComercial, cliente.numeroDocumento, cliente.provincia, cliente.estado].some((value) => value?.toLowerCase().includes(normalized)))
  }, [query, state.clientes])

  useEffect(() => setPage(1), [query])

  const editFromList = (id: string) => navigate(`/comercial/clientes/${id}?editar=1`)
  return <>
    <PageHeader title="Clientes" description="Consulta y mantenimiento del maestro de clientes." />
    <PageContent>
      <div className="mb-5 flex items-center justify-between gap-4 rounded-xl bg-surface-muted px-4 py-3 text-sm text-text-soft">
        <div className="flex items-center gap-2"><UsersRound size={17} strokeWidth={1.5} className="text-text-muted" /><span>{state.clientes.length} clientes registrados</span></div>
        <span className="hidden text-xs text-text-muted sm:block">Los clientes se seleccionan desde las operaciones comerciales.</span>
      </div>
      <DataTable rows={rows} columns={customerColumns((id) => navigate(`/comercial/clientes/${id}`), editFromList, canEdit)} getRowId={(row) => row.id} selectedIds={selectedIds} onSelectedIdsChange={setSelectedIds} searchValue={query} onSearchChange={(value) => { setQuery(value); setPage(1) }} page={page} pageSize={10} onPageChange={setPage} totalCount={rows.length} responsive showSelectionSummary={false} emptyTitle="No encontramos clientes" emptyDescription="Prueba con otro documento, nombre o ubicación." />
    </PageContent>
  </>
}
