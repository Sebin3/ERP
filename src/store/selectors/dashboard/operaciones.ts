import type { ID } from '../../../types'
import type { ERPState } from '../../state'
import { redondearDosDecimales } from '../../../utils'
import { esPagoCobro, comprobantesVenta } from './common'
import type { OperacionRecienteTipo } from './common'
import { sumarDiasISO } from './periodo'
import { selectSaldoCuenta, selectTotalVenta } from '../index'

export interface CuentaPorVencerDashboard {
  cuentaId: ID
  clienteId: ID
  cliente: string
  documento: string
  importe: number
  pagado: number
  saldo: number
  fechaVencimiento: string
  diasParaVencer: number
  urgencia: 'urgente' | 'aviso' | 'info'
}

function comprobanteDeCuenta(estado: ERPState, cuentaId: ID): string {
  const cuenta = estado.cuentasCobrar.find((item) => item.id === cuentaId)
  const cuentaPagar = estado.cuentasPagar.find((item) => item.id === cuentaId)
  const comprobanteId = cuenta?.comprobanteId ?? cuentaPagar?.comprobanteId
  const comprobante = estado.comprobantes.find((item) => item.id === comprobanteId)
  return comprobante ? `${comprobante.serie}-${comprobante.numero}` : cuentaId
}

function calcularDias(fechaVencimiento: string, fechaReferencia: string): number {
  return Math.floor((Date.parse(`${fechaVencimiento}T12:00:00.000Z`) - Date.parse(`${fechaReferencia}T12:00:00.000Z`)) / 86_400_000)
}

export function cuentasPorVencer(estado: ERPState, limite: number): CuentaPorVencerDashboard[]
export function cuentasPorVencer(estado: ERPState, fechaReferencia: string, limite: number): CuentaPorVencerDashboard[]
export function cuentasPorVencer(estado: ERPState, fechaOlimite: string | number, limiteOpcional?: number): CuentaPorVencerDashboard[] {
  const fechaReferencia = typeof fechaOlimite === 'number' ? estado.fechaReferencia : fechaOlimite
  const limite = typeof fechaOlimite === 'number' ? fechaOlimite : (limiteOpcional ?? 5)
  const hasta = sumarDiasISO(fechaReferencia, 7)
  return estado.cuentasCobrar.map((cuenta) => {
    const saldo = selectSaldoCuenta(estado, cuenta.id)
    const diasParaVencer = calcularDias(cuenta.fechaVencimiento, fechaReferencia)
    const importe = selectTotalVenta(estado, cuenta.ventaId)
    return { cuentaId: cuenta.id, clienteId: cuenta.clienteId, cliente: estado.clientes.find((item) => item.id === cuenta.clienteId)?.razonSocial ?? cuenta.clienteId, documento: comprobanteDeCuenta(estado, cuenta.id), importe, pagado: redondearDosDecimales(importe - saldo), saldo, fechaVencimiento: cuenta.fechaVencimiento, diasParaVencer, urgencia: diasParaVencer < 0 ? 'urgente' as const : diasParaVencer <= 7 ? 'aviso' as const : 'info' as const }
  }).filter((item) => item.saldo > 0 && item.fechaVencimiento <= hasta).sort((a, b) => a.diasParaVencer - b.diasParaVencer).slice(0, limite)
}

export interface OperacionRecienteDashboard {
  id: ID
  tipo: OperacionRecienteTipo
  documento: string
  tercero: string
  monto: number
  fecha: string
}

function montoRecepcion(estado: ERPState, recepcionId: ID): number {
  const recepcion = estado.recepciones.find((item) => item.id === recepcionId)
  return redondearDosDecimales((recepcion?.itemIds ?? []).map((id) => estado.itemsRecepcion.find((item) => item.id === id)).reduce((total, item) => total + (item?.cantidadRecibida ?? 0) * (item?.costoUnitario ?? 0), 0))
}

export function operacionesRecientes(estado: ERPState, limite: number, tiposPermitidos: readonly OperacionRecienteTipo[]): OperacionRecienteDashboard[] {
  const operaciones: OperacionRecienteDashboard[] = []
  if (tiposPermitidos.includes('Venta')) for (const comprobante of comprobantesVenta(estado)) operaciones.push({ id: comprobante.id, tipo: 'Venta', documento: `${comprobante.serie}-${comprobante.numero}`, tercero: estado.clientes.find((item) => item.id === comprobante.clienteId)?.razonSocial ?? comprobante.clienteId, monto: selectTotalVenta(estado, comprobante.ventaId), fecha: comprobante.fechaEmision })
  if (tiposPermitidos.includes('Compra')) for (const recepcion of estado.recepciones) {
    const compra = estado.compras.find((item) => item.id === recepcion.compraId)
    operaciones.push({ id: recepcion.id, tipo: 'Compra', documento: recepcion.numero, tercero: estado.proveedores.find((item) => item.id === compra?.proveedorId)?.razonSocial ?? compra?.proveedorId ?? 'Proveedor', monto: montoRecepcion(estado, recepcion.id), fecha: recepcion.fecha })
  }
  for (const pago of estado.pagos) {
    const tipo = esPagoCobro(pago) ? 'Cobro' : 'Pago'
    if (!tiposPermitidos.includes(tipo)) continue
    const cuentaId = esPagoCobro(pago) ? pago.cuentaCobrarId : pago.cuentaPagarId
    const tercero = esPagoCobro(pago)
      ? estado.clientes.find((cliente) => cliente.id === estado.cuentasCobrar.find((cuenta) => cuenta.id === cuentaId)?.clienteId)?.razonSocial
      : estado.proveedores.find((proveedor) => proveedor.id === estado.cuentasPagar.find((cuenta) => cuenta.id === cuentaId)?.proveedorId)?.razonSocial
    operaciones.push({ id: pago.id, tipo, documento: comprobanteDeCuenta(estado, cuentaId), tercero: tercero ?? cuentaId, monto: pago.monto, fecha: pago.fecha })
  }
  return operaciones.sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id.localeCompare(a.id)).slice(0, limite)
}
