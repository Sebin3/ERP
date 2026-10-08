import { Building2, Landmark } from 'lucide-react'
import { useMemo, useState } from 'react'
import { DataTable, type DataTableColumn } from '../../components/data-display/DataTable'
import { PageContent, PageHeader } from '../../components/layout/PageLayout'
import { StatusPill } from '../../components/ui'
import { useERPStore } from '../../store'
import { selectSaldoBanco } from '../../store/selectors'
import type { CuentaBancaria, MovimientoCaja } from '../../types'

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

function bankColumns(state: ReturnType<typeof useERPStore.getState>): DataTableColumn<MovimientoCaja>[] {
  return [
    { key: 'date', header: 'Fecha', sortable: true, sortValue: (row) => row.fecha, render: (row) => <span className="whitespace-nowrap">{date(row.fecha)}</span> },
    { key: 'type', header: 'Tipo', sortable: true, sortValue: (row) => row.tipo, render: (row) => <StatusPill label={row.tipo} tone={row.tipo === 'Ingreso' ? 'success' : 'danger'} /> },
    { key: 'reference', header: 'Concepto', sortable: true, sortValue: (row) => referenceLabel(state, row), render: (row) => <div><span className="block font-medium text-text">{referenceLabel(state, row)}</span><span className="mt-0.5 block text-xs text-text-muted">{row.referenciaTipo} · {row.referenciaId}</span></div> },
    { key: 'method', header: 'Método', hideOnMobile: true, sortable: true, sortValue: (row) => row.metodoPago, render: (row) => <span className="text-text-soft">{row.metodoPago}</span> },
    { key: 'amount', header: 'Importe', align: 'right', sortable: true, sortValue: (row) => row.monto, render: (row) => <span className={row.tipo === 'Ingreso' ? 'font-semibold tabular-nums text-success' : 'font-semibold tabular-nums text-danger'}>{row.tipo === 'Ingreso' ? '+' : '−'} {money(row.monto)}</span> },
  ]
}

export function BanksPage() {
  const state = useERPStore()
  const activeBanks = state.cuentasBancarias.filter((bank) => bank.estado === 'Activo')
  const [selectedBankId, setSelectedBankId] = useState(activeBanks[0]?.id ?? '')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const selectedBank = activeBanks.find((bank) => bank.id === selectedBankId) ?? activeBanks[0]
  const rows = useMemo(() => {
    if (!selectedBank) return []
    const normalized = query.trim().toLowerCase()
    return state.movimientosCaja.filter((movement) => movement.cuentaBancariaId === selectedBank.id).filter((movement) => !normalized || [movement.tipo, movement.metodoPago, movement.referenciaTipo, movement.referenciaId, referenceLabel(state, movement)].some((value) => value.toLowerCase().includes(normalized))).sort((a, b) => b.fecha.localeCompare(a.fecha))
  }, [query, selectedBank, state])
  const totalBancos = activeBanks.reduce((total, bank) => total + selectSaldoBanco(state, bank.id), 0)
  const ingresos = rows.filter((movement) => movement.tipo === 'Ingreso').reduce((total, movement) => total + movement.monto, 0)
  const egresos = rows.filter((movement) => movement.tipo === 'Egreso').reduce((total, movement) => total + movement.monto, 0)
  const selectBank = (bank: CuentaBancaria) => { setSelectedBankId(bank.id); setPage(1); setQuery(''); setSelectedIds([]) }

  return <>
    <PageHeader title="Bancos" description="Saldos y movimientos de las cuentas bancarias registradas." />
    <PageContent>
      <div className="mb-6 grid gap-3 sm:grid-cols-3"><div className={totalBancos < 0 ? 'rounded-xl bg-danger-soft px-4 py-3' : 'rounded-xl bg-accent-soft px-4 py-3'}><p className={totalBancos < 0 ? 'text-xs text-danger' : 'text-xs text-accent'}>{totalBancos < 0 ? 'Saldo bancario negativo' : 'Saldo bancario total'}</p><p className="mt-1 text-xl font-semibold tabular-nums text-text">{money(totalBancos)}</p></div><div className="rounded-xl bg-success-soft px-4 py-3"><p className="text-xs text-success">Ingresos mostrados</p><p className="mt-1 text-xl font-semibold tabular-nums text-text">{money(ingresos)}</p></div><div className="rounded-xl bg-danger-soft px-4 py-3"><p className="text-xs text-danger">Egresos mostrados</p><p className="mt-1 text-xl font-semibold tabular-nums text-text">{money(egresos)}</p></div></div>
      <section className="mb-6 grid gap-3 md:grid-cols-2">{activeBanks.map((bank) => { const balance = selectSaldoBanco(state, bank.id); const selected = bank.id === selectedBank?.id; return <button key={bank.id} type="button" onClick={() => selectBank(bank)} className={selected ? 'flex items-center justify-between gap-4 rounded-2xl bg-accent-soft p-5 text-left ring-2 ring-accent/20' : 'flex items-center justify-between gap-4 rounded-2xl bg-surface-muted p-5 text-left transition-colors hover:bg-border/40'} aria-pressed={selected}><span className="flex min-w-0 items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface text-accent"><Landmark size={18} strokeWidth={1.5} /></span><span className="min-w-0"><span className="block truncate text-sm font-semibold text-text">{bank.nombre}</span><span className="mt-1 block text-xs text-text-muted">{bank.banco} · {bank.numeroEnmascarado}</span></span></span><span className={balance < 0 ? 'shrink-0 text-right text-sm font-semibold tabular-nums text-danger' : 'shrink-0 text-right text-sm font-semibold tabular-nums text-text'}>{money(balance)}<span className="mt-1 block text-xs font-normal text-text-muted">Saldo disponible</span></span></button> })}</section>
      {selectedBank ? <><div className="mb-5 flex items-center gap-3 rounded-xl bg-surface-muted px-4 py-3 text-sm text-text-soft"><Building2 size={17} strokeWidth={1.5} className="text-text-muted" /><span>{selectedBank.nombre}</span><span className="hidden text-xs text-text-muted sm:block">Los movimientos se generan desde cobros y pagos.</span></div><DataTable rows={rows} columns={bankColumns(state)} getRowId={(row) => row.id} selectedIds={selectedIds} onSelectedIdsChange={setSelectedIds} searchValue={query} onSearchChange={(value) => { setQuery(value); setPage(1) }} page={page} pageSize={10} onPageChange={setPage} totalCount={rows.length} responsive showSelectionSummary={false} emptyTitle="No hay movimientos bancarios" emptyDescription="Los cobros y pagos asociados a esta cuenta aparecerán aquí." /></> : <div className="rounded-2xl bg-surface-muted p-8 text-center text-sm text-text-muted">No hay cuentas bancarias activas.</div>}
    </PageContent>
  </>
}
