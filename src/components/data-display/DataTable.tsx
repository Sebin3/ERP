import { AlertCircle, ArrowUpDown, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Search } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { cn } from '../../utils'
import { Button, Checkbox, EmptyState, IconButton, Input, Skeleton } from '../ui'

export interface DataTableColumn<T> {
  key: string
  header: string
  sortable?: boolean
  hideOnMobile?: boolean
  align?: 'left' | 'right'
  sortValue?: (row: T) => string | number
  render: (row: T) => ReactNode
}

export interface DataTableProps<T> {
  rows: T[]
  columns: DataTableColumn<T>[]
  getRowId: (row: T) => string
  selectedIds: string[]
  onSelectedIdsChange: (ids: string[]) => void
  searchValue: string
  onSearchChange: (value: string) => void
  page: number
  pageSize?: number
  onPageChange: (page: number) => void
  totalCount?: number
  loading?: boolean
  error?: string
  bulkActions?: ReactNode
  toolbarActions?: ReactNode
  emptyTitle?: string
  emptyDescription?: string
  responsive?: boolean
  showSelectionSummary?: boolean
}

export function DataTable<T>({ rows, columns, getRowId, selectedIds, onSelectedIdsChange, searchValue, onSearchChange, page, pageSize = 11, onPageChange, totalCount, loading = false, error, bulkActions, toolbarActions, emptyTitle = 'No hay registros', emptyDescription = 'Cuando existan registros aparecerán aquí.', responsive = false, showSelectionSummary = true }: DataTableProps<T>) {
  const pageLimit = 11
  void pageSize
  const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)
  const sortedRows = useMemo(() => {
    if (!sort) return rows
    const column = columns.find((item) => item.key === sort.key)
    if (!column?.sortValue) return rows
    return [...rows].sort((first, second) => {
      const a = column.sortValue?.(first) ?? ''
      const b = column.sortValue?.(second) ?? ''
      const comparison = a < b ? -1 : a > b ? 1 : 0
      return sort.direction === 'asc' ? comparison : -comparison
    })
  }, [columns, rows, sort])

  const totalPages = Math.max(1, Math.ceil((totalCount ?? rows.length) / pageLimit))
  const firstRow = rows.length === 0 ? 0 : (page - 1) * pageLimit + 1
  const lastRow = Math.min(page * pageLimit, totalCount ?? rows.length)
  const pageRows = sortedRows.slice((page - 1) * pageLimit, page * pageLimit)
  const pageIds = pageRows.map(getRowId)
  const selectedOnPage = pageIds.filter((id) => selectedIds.includes(id))
  const allSelected = pageIds.length > 0 && selectedOnPage.length === pageIds.length
  const someSelected = selectedOnPage.length > 0 && !allSelected

  const toggleAll = (checked: boolean) => onSelectedIdsChange(checked ? Array.from(new Set([...selectedIds, ...pageIds])) : selectedIds.filter((id) => !pageIds.includes(id)))
  const toggleRow = (id: string, checked: boolean) => onSelectedIdsChange(checked ? Array.from(new Set([...selectedIds, id])) : selectedIds.filter((selectedId) => selectedId !== id))
  const toggleSort = (column: DataTableColumn<T>) => {
    if (!column.sortable) return
    setSort((current) => current?.key === column.key ? { key: column.key, direction: current.direction === 'asc' ? 'desc' : 'asc' } : { key: column.key, direction: 'asc' })
  }

  return (
    <div className="relative space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full max-w-xs"><Input value={searchValue} onChange={(event) => onSearchChange(event.target.value)} placeholder="Buscar..." aria-label="Buscar en la tabla" leadingIcon={Search} /></div>
        {toolbarActions ? <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">{toolbarActions}</div> : null}
      </div>

      {showSelectionSummary && selectedIds.length > 0 ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-accent-soft px-4 py-2.5 text-sm text-text"><span><strong>{selectedIds.length}</strong> seleccionados</span><div className="flex items-center gap-2">{bulkActions}<Button variant="ghost" size="sm" onClick={() => onSelectedIdsChange([])}>Limpiar</Button></div></div> : null}

      <div className={responsive ? 'overflow-visible' : 'overflow-x-auto'}>
        {error ? <div className="flex items-center gap-3 py-16 text-sm text-danger"><AlertCircle size={18} strokeWidth={1.5} />{error}</div> : loading ? <div className="space-y-px py-3">{Array.from({ length: pageLimit }).map((_, index) => <div key={index} className="flex h-[52px] items-center gap-5 px-3"><Skeleton className="size-4" /><Skeleton className="h-4 flex-1" /><Skeleton className="h-4 w-28" /><Skeleton className="h-4 w-20" /></div>)}</div> : pageRows.length === 0 ? <EmptyState title={emptyTitle} description={emptyDescription} /> : <table className={cn('w-full border-collapse', responsive ? 'table-fixed' : 'min-w-[820px]')}>
          <thead><tr className="h-10 border-b border-border/70 text-left text-xs font-medium text-text-muted">
            <th className="w-12 px-3 align-middle"><Checkbox aria-label="Seleccionar todos" checked={allSelected} indeterminate={someSelected} onChange={(event) => toggleAll(event.target.checked)} /></th>
            {columns.map((column) => { const active = sort?.key === column.key; return <th key={column.key} className={cn('px-3', column.hideOnMobile && 'hidden sm:table-cell', column.align === 'right' && 'text-right')}><button type="button" className={cn('inline-flex items-center gap-1.5 text-inherit focus-visible:ring-3 focus-visible:ring-accent-soft', column.sortable ? 'hover:text-text' : 'cursor-default')} onClick={() => toggleSort(column)} aria-label={column.sortable ? `Ordenar por ${column.header}` : undefined}>{column.header}{column.sortable ? active ? sort?.direction === 'asc' ? <ChevronUp size={13} strokeWidth={1.5} /> : <ChevronDown size={13} strokeWidth={1.5} /> : <ArrowUpDown size={13} strokeWidth={1.5} /> : null}</button></th> })}
          </tr></thead>
            <tbody className="divide-y divide-border/70">
            {pageRows.map((row) => { const id = getRowId(row); const selected = selectedIds.includes(id); return <tr key={id} className="h-[52px] text-sm text-text-soft transition-colors duration-150 hover:bg-surface-muted/60"><td className="px-3 align-middle"><Checkbox aria-label={`Seleccionar ${id}`} checked={selected} onChange={(event) => toggleRow(id, event.target.checked)} /></td>{columns.map((column) => <td key={column.key} className={cn('max-w-0 px-3 align-middle', column.hideOnMobile && 'hidden sm:table-cell', column.align === 'right' && 'text-right tabular-nums')}>{column.render(row)}</td>)}</tr> })}
          </tbody>
        </table>}
      </div>

      {!loading && !error && pageRows.length > 0 ? <div className="flex items-center justify-between px-1 text-xs text-text-muted"><span className="tabular-nums">Mostrando {firstRow}–{lastRow} de {totalCount ?? rows.length}</span><div className="flex items-center gap-1"><IconButton aria-label="Página anterior" disabled={page <= 1} onClick={() => onPageChange(Math.max(1, page - 1))}><ChevronLeft size={16} strokeWidth={1.5} /></IconButton><span className="min-w-16 text-center tabular-nums">Página {page} de {totalPages}</span><IconButton aria-label="Página siguiente" disabled={page >= totalPages} onClick={() => onPageChange(Math.min(totalPages, page + 1))}><ChevronRight size={16} strokeWidth={1.5} /></IconButton></div></div> : null}
    </div>
  )
}
