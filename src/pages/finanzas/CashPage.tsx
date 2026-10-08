import { WalletCards } from 'lucide-react'
import { useMemo, useState } from 'react'
import { DataTable, type DataTableColumn } from '../../components/data-display/DataTable'
import { PageContent, PageHeader } from '../../components/layout/PageLayout'
import { StatusPill } from '../../components/ui'
import { useERPStore } from '../../store'
import { selectSaldoCaja } from '../../store/selectors'
import type { MovimientoCaja } from '../../types'

const date = (value: string) => new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium' }).format(new Date(value))
const money = (value: number) => `S/ ${value.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function referenceLabel(state: ReturnType<typeof useERPStore.getState>, movement: MovimientoCaja): string {
  if (movement.referenciaTipo === 'Cobro') {
    const account = state.cuentasCobrar.find((item) => item.id === movement.referenciaId)
    return account ? state.clientes.find((item) => item.id === account.clienteId)?.razonSocial ?? 'Cobro de cliente' : 'Cobro de cliente'
  }
  if (movement.referenciaTipo === 'Pago') {
    const account = state.cuentasPagar.find((item) => item.id === movement.referenciaId)
    return account ? state.proveedores.find((item) => item.id === account.proveedorId)?.razonSocial ?? 'Pago a proveedor' : 'Pago a proveedor'
  }
  return movement.descripcion ?? movement.referenciaTipo
}

function cashColumns(state: ReturnType<typeof useERPStore.getState>): DataTableColumn<MovimientoCaja>[] {
  return [
    { key: 'date', header: 'Fecha', sortable: true, sortValue: (row) => row.fecha, render: (row) => <span className="whitespace-nowrap">{date(row.fecha)}</span> },
    { key: 'type', header: 'Tipo', sortable: true, sortValue: (row) => row.tipo, render: (row) => <StatusPill label={row.tipo} tone={row.tipo === 'Ingreso' ? 'success' : 'danger'} /> },
    { key: 'reference', header: 'Concepto', sortable: true, sortValue: (row) => referenceLabel(state, row), render: (row) => <div><span className="block font-medium text-text">{referenceLabel(state, row)}</span><span className="mt-0.5 block text-xs text-text-muted">{row.referenciaTipo} · {row.referenciaId}</span></div> },
    { key: 'method', header: 'Método', hideOnMobile: true, sortable: true, sortValue: (row) => row.metodoPago, render: (row) => <span className="text-text-soft">{row.metodoPago}</span> },
    { key: 'amount', header: 'Importe', align: 'right', sortable: true, sortValue: (row) => row.monto, render: (row) => <span className={row.tipo === 'Ingreso' ? 'font-semibold tabular-nums text-success' : 'font-semibold tabular-nums text-danger'}>{row.tipo === 'Ingreso' ? '+' : '−'} {money(row.monto)}</span> },
  ]
}

export function CashPage() {
  const state = useERPStore()
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const rows = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return state.movimientosCaja.filter((movement) => !movement.cuentaBancariaId).filter((movement) => !normalized || [movement.tipo, movement.metodoPago, movement.referenciaTipo, movement.referenciaId, referenceLabel(state, movement)].some((value) => value.toLowerCase().includes(normalized))).sort((a, b) => b.fecha.localeCompare(a.fecha))
  }, [query, state])
  const ingresos = rows.filter((movement) => movement.tipo === 'Ingreso').reduce((total, movement) => total + movement.monto, 0)
  const egresos = rows.filter((movement) => movement.tipo === 'Egreso').reduce((total, movement) => total + movement.monto, 0)
  const saldoCaja = selectSaldoCaja(state)

  return <>
    <PageHeader title="Caja" description="Movimientos de efectivo generados por las operaciones del ERP." />
    <PageContent>
      <div className="mb-6 grid gap-3 sm:grid-cols-3"><div className={saldoCaja < 0 ? 'rounded-xl bg-danger-soft px-4 py-3' : 'rounded-xl bg-accent-soft px-4 py-3'}><p className={saldoCaja < 0 ? 'text-xs text-danger' : 'text-xs text-accent'}>{saldoCaja < 0 ? 'Saldo negativo' : 'Saldo actual'}</p><p className="mt-1 text-xl font-semibold tabular-nums text-text">{money(saldoCaja)}</p></div><div className="rounded-xl bg-success-soft px-4 py-3"><p className="text-xs text-success">Ingresos mostrados</p><p className="mt-1 text-xl font-semibold tabular-nums text-text">{money(ingresos)}</p></div><div className="rounded-xl bg-danger-soft px-4 py-3"><p className="text-xs text-danger">Egresos mostrados</p><p className="mt-1 text-xl font-semibold tabular-nums text-text">{money(egresos)}</p></div></div>
      <div className="mb-5 flex items-center gap-3 rounded-xl bg-surface-muted px-4 py-3 text-sm text-text-soft"><WalletCards size={17} strokeWidth={1.5} className="text-text-muted" /><span>El saldo se deriva de los movimientos de caja.</span><span className="hidden text-xs text-text-muted sm:block">Los cobros y pagos se registran desde sus cuentas.</span></div>
      <DataTable rows={rows} columns={cashColumns(state)} getRowId={(row) => row.id} selectedIds={selectedIds} onSelectedIdsChange={setSelectedIds} searchValue={query} onSearchChange={(value) => { setQuery(value); setPage(1) }} page={page} pageSize={10} onPageChange={setPage} totalCount={rows.length} responsive showSelectionSummary={false} emptyTitle="No hay movimientos de caja" emptyDescription="Los movimientos aparecerán al registrar cobros, pagos o saldos iniciales en efectivo." />
    </PageContent>
  </>
}
