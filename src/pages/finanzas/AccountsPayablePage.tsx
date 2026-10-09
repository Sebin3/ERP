import { ArrowUpRight, Check, CreditCard, History } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DataTable, type DataTableColumn } from '../../components/data-display/DataTable'
import { PageContent, PageHeader } from '../../components/layout/PageLayout'
import { Button, Drawer, Dropdown, Input, Select, StatusPill, Toast } from '../../components/ui'
import { usePermisos } from '../../hooks'
import { useERPStore } from '../../store'
import { selectEstadoCuenta, selectSaldoCuenta, selectTotalCompra } from '../../store/selectors'
import type { CuentaPagar, EstadoCuenta, MetodoPago } from '../../types'

type ToastState = { message: string; tone: 'success' | 'danger' }

const date = (value: string) => new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${value}T12:00:00Z`))
const money = (value: number) => `S/ ${value.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const statusTone = (status: EstadoCuenta) => status === 'Pagada' ? 'success' as const : status === 'Vencida' ? 'danger' as const : status === 'Anulada' ? 'neutral' as const : 'warning' as const

function accountColumns(state: ReturnType<typeof useERPStore.getState>, onPay: (id: string) => void, onOpenDetail: (id: string) => void, onOpenPurchase: (id: string) => void, canPay: boolean): DataTableColumn<CuentaPagar>[] {
  return [
    { key: 'account', header: 'Cuenta', sortable: true, sortValue: (row) => row.id, render: (row) => { const comprobante = state.comprobantes.find((item) => item.id === row.comprobanteId); const purchase = state.compras.find((item) => item.id === row.compraId); const order = purchase ? state.ordenesCompra.find((item) => item.id === purchase.ordenCompraId) : undefined; return <div><span className="block font-medium text-text">{comprobante ? `${comprobante.serie}-${comprobante.numero}` : row.id}</span><span className="mt-0.5 block text-xs text-text-muted">Emitida {date(row.fechaEmision)}</span>{order ? <button type="button" className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-accent hover:text-accent-hover focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-accent-soft" onClick={() => onOpenPurchase(order.id)}>Ver compra <ArrowUpRight size={12} strokeWidth={1.5} /></button> : null}</div> } },
    { key: 'supplier', header: 'Proveedor', sortable: true, sortValue: (row) => state.proveedores.find((item) => item.id === row.proveedorId)?.razonSocial ?? '', render: (row) => state.proveedores.find((item) => item.id === row.proveedorId)?.razonSocial ?? 'No encontrado' },
    { key: 'due', header: 'Vencimiento', hideOnMobile: true, sortable: true, sortValue: (row) => row.fechaVencimiento, render: (row) => <span className="whitespace-nowrap">{date(row.fechaVencimiento)}</span> },
    { key: 'total', header: 'Importe', align: 'right', sortable: true, sortValue: (row) => selectTotalCompra(state, row.compraId), render: (row) => <span className="font-medium tabular-nums">{money(selectTotalCompra(state, row.compraId))}</span> },
    { key: 'balance', header: 'Saldo', align: 'right', sortable: true, sortValue: (row) => selectSaldoCuenta(state, row.id), render: (row) => <span className="font-semibold tabular-nums text-text">{money(selectSaldoCuenta(state, row.id))}</span> },
    { key: 'status', header: 'Estado', sortable: true, sortValue: (row) => selectEstadoCuenta(state, row.id, state.fechaReferencia), render: (row) => { const status = selectEstadoCuenta(state, row.id, state.fechaReferencia); return <StatusPill label={status} tone={statusTone(status)} /> } },
    { key: 'actions', header: '', align: 'right', render: (row) => { const status = selectEstadoCuenta(state, row.id, state.fechaReferencia); const hasPayments = state.pagos.some((payment) => payment.cuentaPagarId === row.id); const items = [{ label: 'Ver detalle', icon: History, onSelect: () => onOpenDetail(row.id) }, ...(canPay && (status === 'Pendiente' || status === 'Vencida') ? [{ label: 'Registrar pago', icon: Check, onSelect: () => onPay(row.id) }] : [])]; return hasPayments || items.length > 1 ? <Dropdown items={items} /> : null } },
  ]
}

export function AccountsPayablePage() {
  const state = useERPStore()
  const navigate = useNavigate()
  const { puede } = usePermisos()
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [statusFilter, setStatusFilter] = useState<'todos' | EstadoCuenta>('todos')
  const [accountId, setAccountId] = useState<string | null>(null)
  const [amount, setAmount] = useState(0)
  const [method, setMethod] = useState<MetodoPago>('Transferencia bancaria')
  const [bankId, setBankId] = useState(state.cuentasBancarias.find((item) => item.estado === 'Activo')?.id ?? '')
  const [toast, setToast] = useState<ToastState | null>(null)
  const canPay = puede('Cuentas por pagar', 'crear')
  const rows = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return state.cuentasPagar.filter((account) => {
      const status = selectEstadoCuenta(state, account.id, state.fechaReferencia)
      const matchesQuery = !normalized || [account.id, status, state.proveedores.find((item) => item.id === account.proveedorId)?.razonSocial, account.fechaVencimiento].some((value) => value?.toLowerCase().includes(normalized))
      return matchesQuery && (statusFilter === 'todos' || status === statusFilter)
    })
  }, [query, state, statusFilter])
  const pendingTotal = state.cuentasPagar.reduce((total, account) => total + selectSaldoCuenta(state, account.id), 0)
  const overdueCount = state.cuentasPagar.filter((account) => selectEstadoCuenta(state, account.id, state.fechaReferencia) === 'Vencida').length
  const selectedAccount = accountId ? state.cuentasPagar.find((account) => account.id === accountId) : undefined
  const selectedStatus = selectedAccount ? selectEstadoCuenta(state, selectedAccount.id, state.fechaReferencia) : null
  const canApplyToSelected = Boolean(selectedAccount && canPay && (selectedStatus === 'Pendiente' || selectedStatus === 'Vencida'))
  const notify = (result: { ok: true } | { ok: false; error: string }, successMessage: string) => { if (!result.ok) { setToast({ message: result.error, tone: 'danger' }); return false }; setToast({ message: successMessage, tone: 'success' }); return true }
  const openPayment = (id: string) => { const account = state.cuentasPagar.find((item) => item.id === id); if (!account) return; setAccountId(id); setAmount(selectSaldoCuenta(state, id)); setMethod('Transferencia bancaria'); setBankId(state.cuentasBancarias.find((item) => item.estado === 'Activo')?.id ?? '') }
  const closePayment = () => setAccountId(null)
  const pay = () => { if (!selectedAccount || !state.usuarioActualId) return; const result = state.registrarPagoProveedor({ cuentaPagarId: selectedAccount.id, monto: amount, metodoPago: method, cuentaBancariaId: method === 'Efectivo' ? undefined : bankId, usuarioId: state.usuarioActualId }); if (notify(result, 'Pago registrado correctamente.')) closePayment() }
  const supplierName = selectedAccount ? state.proveedores.find((item) => item.id === selectedAccount.proveedorId)?.razonSocial ?? 'Proveedor' : 'Proveedor'
  const resetStatus = (value: 'todos' | EstadoCuenta) => { setStatusFilter(value); setPage(1) }

  return <>
    <PageHeader title="Cuentas por pagar" description="Obligaciones derivadas de compras facturadas a proveedores." />
    <PageContent>
      <div className="mb-6 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-surface-muted px-4 py-3"><p className="text-xs text-text-muted">Saldo pendiente</p><p className="mt-1 text-xl font-semibold tabular-nums text-text">{money(pendingTotal)}</p></div><div className="rounded-xl bg-surface-muted px-4 py-3"><p className="text-xs text-text-muted">Cuentas registradas</p><p className="mt-1 text-xl font-semibold tabular-nums text-text">{state.cuentasPagar.length}</p><p className="mt-1 text-xs text-text-muted">{rows.length} en la vista actual</p></div><div className="rounded-xl bg-danger-soft px-4 py-3"><p className="text-xs text-danger">Vencidas</p><p className="mt-1 text-xl font-semibold tabular-nums text-danger">{overdueCount}</p></div></div>
      <DataTable rows={rows} columns={accountColumns(state, openPayment, openPayment, (id) => navigate(`/inventario/recepciones/${id}`), canPay)} getRowId={(row) => row.id} selectedIds={selectedIds} onSelectedIdsChange={setSelectedIds} searchValue={query} onSearchChange={(value) => { setQuery(value); setPage(1) }} page={page} pageSize={10} onPageChange={setPage} totalCount={rows.length} responsive showSelectionSummary={false} toolbarActions={<Select aria-label="Filtrar cuentas por pagar por estado" value={statusFilter} onChange={(event) => resetStatus(event.target.value as 'todos' | EstadoCuenta)} className="w-36"><option value="todos">Todos los estados</option>{(['Pendiente', 'Vencida', 'Pagada', 'Anulada'] as EstadoCuenta[]).map((status) => <option key={status} value={status}>{status}</option>)}</Select>} emptyTitle="No hay cuentas por pagar" emptyDescription="Las cuentas aparecerán cuando se facture una compra recibida." />
    </PageContent>
    <Drawer open={Boolean(selectedAccount)} title={canApplyToSelected ? 'Registrar pago a proveedor' : 'Detalle de cuenta por pagar'} onClose={closePayment}><div className="space-y-5"><div className="rounded-xl bg-surface-muted p-4"><p className="text-xs text-text-muted">Proveedor</p><p className="mt-1 font-medium text-text">{supplierName}</p><p className="mt-3 text-xs text-text-muted">Saldo pendiente</p><p className="mt-1 text-lg font-semibold tabular-nums text-text">{selectedAccount ? money(selectSaldoCuenta(state, selectedAccount.id)) : '—'}</p></div>{selectedAccount ? <PaymentHistory accountId={selectedAccount.id} state={state} /> : null}{canApplyToSelected ? <><Input label="Monto a pagar" type="number" min="0.01" max={selectedAccount ? selectSaldoCuenta(state, selectedAccount.id) : undefined} step="0.01" value={amount} onChange={(event) => setAmount(Number(event.target.value))} /><Select label="Método de pago" value={method} onChange={(event) => setMethod(event.target.value as MetodoPago)} options={['Efectivo', 'Yape', 'Plin', 'Transferencia bancaria', 'Tarjeta', 'Cheque'].map((value) => ({ value, label: value }))} />{method !== 'Efectivo' ? <Select label="Cuenta bancaria" value={bankId} onChange={(event) => setBankId(event.target.value)} options={state.cuentasBancarias.filter((item) => item.estado === 'Activo').map((item) => ({ value: item.id, label: `${item.nombre} · ${item.numeroEnmascarado}` }))} /> : null}<div className="flex justify-end gap-2 border-t border-border pt-5"><Button variant="secondary" onClick={closePayment}>Cancelar</Button><Button leadingIcon={CreditCard} onClick={pay}>Confirmar pago</Button></div></> : <p className="text-sm text-text-muted">Esta cuenta no admite nuevos pagos en su estado actual.</p>}</div></Drawer>
    {toast ? <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} /> : null}
  </>
}

function PaymentHistory({ accountId, state }: { accountId: string; state: ReturnType<typeof useERPStore.getState> }) {
  const payments = state.pagos.filter((payment) => payment.cuentaPagarId === accountId).sort((a, b) => b.fecha.localeCompare(a.fecha))
  return <section className="rounded-xl border border-border/70 bg-surface p-4"><div className="flex items-center gap-2"><History size={15} strokeWidth={1.5} className="text-text-muted" /><h2 className="text-xs font-semibold text-text">Pagos aplicados</h2><span className="text-xs text-text-muted">{payments.length}</span></div>{payments.length ? <div className="mt-3 divide-y divide-border/60">{payments.map((payment) => <div key={payment.id} className="flex items-center justify-between gap-3 py-2 text-xs"><span className="text-text-muted">{date(payment.fecha)} · {payment.metodoPago}</span><span className="font-semibold tabular-nums text-text">{money(payment.monto)}</span></div>)}</div> : <p className="mt-2 text-xs text-text-muted">Todavía no hay pagos aplicados.</p>}</section>
}
