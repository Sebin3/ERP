import { ArrowRight, MapPin, Pencil, Store } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DataTable, type DataTableColumn } from '../../components/data-display/DataTable'
import { PageContent, PageHeader } from '../../components/layout/PageLayout'
import { Avatar, Dropdown, StatusPill } from '../../components/ui'
import { usePermisos } from '../../hooks'
import { useERPStore } from '../../store'
import type { Proveedor } from '../../types'

function statusTone(status: Proveedor['estado']) {
  return status === 'Activo' ? 'success' as const : 'neutral' as const
}

function supplierColumns(onOpen: (id: string) => void, onEdit: (id: string) => void, canEdit: boolean): DataTableColumn<Proveedor>[] {
  return [
    { key: 'supplier', header: 'Proveedor', sortable: true, sortValue: (row) => row.razonSocial, render: (row) => <div className="flex items-center gap-3"><Avatar name={row.razonSocial} size="sm" /><div className="min-w-0"><span className="block truncate font-medium text-text">{row.razonSocial}</span><span className="mt-0.5 block truncate text-xs text-text-muted">{row.contactoNombre ?? row.nombreComercial ?? 'Sin contacto asignado'}</span></div></div> },
    { key: 'document', header: 'Documento', sortable: true, sortValue: (row) => row.numeroDocumento, render: (row) => <span className="tabular-nums">{row.tipoDocumento} {row.numeroDocumento}</span> },
    { key: 'location', header: 'Ubicación', hideOnMobile: true, sortable: true, sortValue: (row) => row.provincia, render: (row) => <span className="inline-flex items-center gap-1.5"><MapPin size={14} strokeWidth={1.5} className="text-text-muted" />{row.provincia}</span> },
    { key: 'terms', header: 'Condición', hideOnMobile: true, sortable: true, sortValue: (row) => row.diasCredito, render: (row) => row.diasCredito > 0 ? `Crédito ${row.diasCredito} días` : 'Contado' },
    { key: 'status', header: 'Estado', sortable: true, sortValue: (row) => row.estado, render: (row) => <StatusPill label={row.estado} tone={statusTone(row.estado)} /> },
    { key: 'actions', header: '', align: 'right', render: (row) => <Dropdown items={[{ label: 'Ver ficha', icon: ArrowRight, onSelect: () => onOpen(row.id) }, ...(canEdit ? [{ label: 'Editar ficha', icon: Pencil, onSelect: () => onEdit(row.id) }] : [])]} /> },
  ]
}

export function SuppliersPage() {
  const navigate = useNavigate()
  const state = useERPStore()
  const { puede } = usePermisos()
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const canEdit = puede('Proveedores', 'editar')

  const rows = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return state.proveedores
    return state.proveedores.filter((proveedor) => [proveedor.razonSocial, proveedor.nombreComercial, proveedor.contactoNombre, proveedor.numeroDocumento, proveedor.provincia, proveedor.estado].some((value) => value?.toLowerCase().includes(normalized)))
  }, [query, state.proveedores])

  useEffect(() => setPage(1), [query])

  return <>
    <PageHeader title="Proveedores" description="Consulta y mantenimiento del maestro de proveedores." />
    <PageContent>
      <div className="mb-5 flex items-center justify-between gap-4 rounded-xl bg-surface-muted px-4 py-3 text-sm text-text-soft"><div className="flex items-center gap-2"><Store size={17} strokeWidth={1.5} className="text-text-muted" /><span>{state.proveedores.length} proveedores registrados</span></div><span className="hidden text-xs text-text-muted sm:block">Las compras seleccionan proveedores existentes.</span></div>
      <DataTable rows={rows} columns={supplierColumns((id) => navigate(`/compras/proveedores/${id}`), (id) => navigate(`/compras/proveedores/${id}?editar=1`), canEdit)} getRowId={(row) => row.id} selectedIds={selectedIds} onSelectedIdsChange={setSelectedIds} searchValue={query} onSearchChange={(value) => { setQuery(value); setPage(1) }} page={page} pageSize={10} onPageChange={setPage} totalCount={rows.length} responsive showSelectionSummary={false} emptyTitle="No encontramos proveedores" emptyDescription="Prueba con otro documento, nombre o ubicación." />
    </PageContent>
  </>
}
