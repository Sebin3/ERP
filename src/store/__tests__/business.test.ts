import { describe, expect, it } from 'vitest'
import type { ActionContext, ActionResult, ERPState } from '../state'
import { aceptarCotizacion, aprobarAjuste, aprobarVenta, anularAjuste, anularTransferencia, anularVenta, crearCotizacion, crearOrdenCompra, crearTransferencia, crearVenta, editarConfiguracion, editarUsuario, emitirOrdenCompra, enviarCotizacion, enviarVenta, facturarCompra, facturarVenta, recibirCompra, rechazarAjuste, registrarCobro, registrarPagoProveedor, registrarSaldoInicial, solicitarAjuste, solicitarTransferencia, subirDocumentoSimulado, transferirStock } from '../actions'
import { selectCostoPromedio, selectEstadoCuenta, selectEstadoRecepcion, selectEstadoTransferencia, selectEstadoVenta, selectReservado, selectSaldoCuenta, selectStock, selectStockDisponible } from '../selectors'
import { redondearDosDecimales } from '../../utils'
import type { Almacen, Cliente, Configuracion, CuentaBancaria, Producto, Proveedor, Rol, Usuario } from '../../types'

const fields = (userId = 'usr-admin') => ({ creadoEn: '2026-01-01T00:00:00.000Z', creadoPorUsuarioId: userId, actualizadoEn: '2026-01-01T00:00:00.000Z', actualizadoPorUsuarioId: userId })

function context(): ActionContext {
  let sequence = 0
  return { reloj: () => '2026-01-15T12:00:00.000Z', idGenerador: (prefix) => `${prefix}-${++sequence}` }
}

const adminRole: Rol = { id: 'rol-admin', nombre: 'Administrador', descripcion: 'Administrador', permisoIds: [], estado: 'Activo', ...fields() }
const sellerRole: Rol = { id: 'rol-seller', nombre: 'Vendedor', descripcion: 'Vendedor', permisoIds: [], estado: 'Activo', ...fields() }
const warehouseRole: Rol = { id: 'rol-warehouse', nombre: 'Almacenero', descripcion: 'Almacenero', permisoIds: [], estado: 'Activo', ...fields() }
const accountantRole: Rol = { id: 'rol-accountant', nombre: 'Contador', descripcion: 'Contador', permisoIds: [], estado: 'Activo', ...fields() }
const users: Usuario[] = [
  { id: 'usr-admin', nombres: 'Ana', apellidos: 'Admin', nombreUsuario: 'admin', email: 'admin@test.pe', rolId: adminRole.id, estado: 'Activo', ...fields() },
  { id: 'usr-seller', nombres: 'Vendedor', apellidos: 'Demo', nombreUsuario: 'seller', email: 'seller@test.pe', rolId: sellerRole.id, estado: 'Activo', ...fields() },
  { id: 'usr-warehouse', nombres: 'Almacenero', apellidos: 'Demo', nombreUsuario: 'warehouse', email: 'warehouse@test.pe', rolId: warehouseRole.id, estado: 'Activo', ...fields() },
  { id: 'usr-accountant', nombres: 'Contador', apellidos: 'Demo', nombreUsuario: 'accountant', email: 'accountant@test.pe', rolId: accountantRole.id, estado: 'Activo', ...fields() },
]
const client: Cliente = { id: 'cli-1', tipoDocumento: 'DNI', numeroDocumento: '12345678', razonSocial: 'Cliente Demo', direccion: 'Jr. Demo 1', distrito: 'Lima', provincia: 'Lima', departamento: 'Lima', limiteCredito: 10000, diasCredito: 30, estado: 'Activo', ...fields() }
const rucClient: Cliente = { ...client, id: 'cli-ruc', tipoDocumento: 'RUC', numeroDocumento: '20123456789', razonSocial: 'Empresa Demo SAC' }
const supplier: Proveedor = { id: 'prov-1', tipoDocumento: 'RUC', numeroDocumento: '20456789012', razonSocial: 'Proveedor Demo SAC', direccion: 'Av. Demo 2', distrito: 'Lima', provincia: 'Lima', departamento: 'Lima', diasCredito: 30, estado: 'Activo', ...fields() }
const product: Producto = { id: 'prod-1', sku: 'SKU-1', nombre: 'Producto Demo', categoriaId: 'cat-1', unidadMedida: 'UND', precioVenta: 10, costoReferencial: 10, tasaImpuesto: 0.18, stockMinimo: 2, estado: 'Activo', ...fields() }
const warehouse: Almacen = { id: 'alm-1', codigo: 'ALM-1', nombre: 'Almacén Lima', direccion: 'Av. Lima 1', estado: 'Activo', ...fields() }
const warehouseTwo: Almacen = { id: 'alm-2', codigo: 'ALM-2', nombre: 'Almacén Callao', direccion: 'Av. Callao 1', estado: 'Activo', ...fields() }
const bank: CuentaBancaria = { id: 'bank-1', banco: 'Banco Demo', nombre: 'Cuenta corriente', numeroEnmascarado: '****1234', moneda: 'PEN', estado: 'Activo', ...fields() }
const configuration: Configuracion = { id: 'config-1', igvPorDefecto: 0.18, series: { Factura: { serie: 'F001', correlativo: 44 }, Boleta: { serie: 'B001', correlativo: 8 }, 'Nota de crédito': { serie: 'FC01', correlativo: 2 } }, almacenPorDefectoId: warehouse.id, datosEmpresa: { razonSocial: 'Empresa Demo SAC', tipoDocumento: 'RUC', numeroDocumento: '20111111111', direccion: 'Av. Empresa 3' }, estado: 'Activo', ...fields() }

function baseState(): ERPState {
  return { fechaReferencia: '2026-01-15', seedVersion: 'test', usuarios: users, roles: [adminRole, sellerRole, warehouseRole, accountantRole], permisos: [], clientes: [client, rucClient], proveedores: [supplier], productos: [product], categorias: [], almacenes: [warehouse, warehouseTwo], configuracion: structuredClone(configuration), cotizaciones: [], ventas: [], detallesVenta: [], comprobantes: [], solicitudesCompra: [], ordenesCompra: [], compras: [], detallesCompra: [], recepciones: [], itemsRecepcion: [], transferencias: [], itemsTransferencia: [], movimientosInventario: [], solicitudesAjuste: [], cuentasCobrar: [], cuentasPagar: [], cuentasBancarias: [bank], movimientosCaja: [], pagos: [], documentos: [], auditoria: [] }
}

function unwrap<T>(result: ActionResult<T>): ERPState {
  expect(result.ok).toBe(true)
  if (!result.ok) throw new Error(result.error)
  expect(result.auditoria.length).toBeGreaterThan(0)
  return result.estado
}

function initialStock(estado: ERPState, cantidad = 10, almacenId = warehouse.id, contexto = context()): ERPState {
  return unwrap(registrarSaldoInicial(estado, { productoId: product.id, almacenId, cantidad, costoUnitario: 10, usuarioId: 'usr-warehouse' }, contexto))
}

function createPendingSale(estado: ERPState, clienteId = client.id, cantidad = 4, usuarioId = 'usr-seller', contexto = context()): { estado: ERPState; ventaId: string } {
  const created = unwrap(crearVenta(estado, { clienteId, vendedorId: usuarioId, almacenId: warehouse.id, condicionPago: 'Crédito', plazoCreditoDias: 30, items: [{ productoId: product.id, descripcionProducto: product.nombre, cantidad, precioUnitario: 10, descuento: 0, tasaImpuesto: 0.18 }], usuarioId }, contexto))
  const ventaId = created.ventas.at(-1)?.id ?? ''
  return { estado: unwrap(enviarVenta(created, ventaId, usuarioId, contexto)), ventaId }
}

function createApprovedSale(estado: ERPState, clienteId = client.id, cantidad = 4, usuarioId = 'usr-seller', contexto = context()): { estado: ERPState; ventaId: string } {
  const pending = createPendingSale(estado, clienteId, cantidad, usuarioId, contexto)
  return { estado: unwrap(aprobarVenta(pending.estado, pending.ventaId, usuarioId, contexto)), ventaId: pending.ventaId }
}

describe('selectores de inventario y redondeo', () => {
  it('calcula stock como suma de movimientos y trata el saldo inicial como entrada', () => {
    let estado = initialStock(baseState(), 10)
    estado = unwrap(transferirStock(estado, { almacenOrigenId: warehouse.id, almacenDestinoId: warehouseTwo.id, items: [{ productoId: product.id, cantidad: 3 }], usuarioId: 'usr-admin' }, context()))
    expect(selectStock(estado, product.id, warehouse.id)).toBe(7)
    expect(selectStock(estado, product.id, warehouseTwo.id)).toBe(3)
  })

  it('redondea 1.005 a 1.01', () => {
    expect(redondearDosDecimales(1.005)).toBe(1.01)
  })
})

describe('ventas y reservas', () => {
  it('impide convertir una cotización aceptada en más de una venta', () => {
    const scenarioContext = context()
    const quotation = unwrap(crearCotizacion(baseState(), { clienteId: client.id, vendedorId: 'usr-seller', validezHasta: '2026-02-15', items: [{ productoId: product.id, descripcionProducto: product.nombre, cantidad: 2, precioUnitario: 10, descuento: 0, tasaImpuesto: 0.18 }], usuarioId: 'usr-seller' }, scenarioContext))
    const quotationId = quotation.cotizaciones[0].id
    const sent = unwrap(enviarCotizacion(quotation, quotationId, 'usr-seller', scenarioContext))
    const accepted = unwrap(aceptarCotizacion(sent, quotationId, 'usr-seller', scenarioContext))
    const input = { clienteId: client.id, vendedorId: 'usr-seller', almacenId: warehouse.id, condicionPago: 'Contado' as const, plazoCreditoDias: 0, cotizacionId: quotationId, items: [{ productoId: product.id, descripcionProducto: product.nombre, cantidad: 2, precioUnitario: 10, descuento: 0, tasaImpuesto: 0.18 }], usuarioId: 'usr-seller' }
    const first = unwrap(crearVenta(accepted, input, scenarioContext))
    const auditBefore = first.auditoria.length
    const repeated = crearVenta(first, input, scenarioContext)
    expect(repeated.ok).toBe(false)
    if (!repeated.ok) expect(repeated.error).toBe('La cotización indicada ya fue convertida en una venta.')
    expect(first.ventas.filter((sale) => sale.cotizacionId === quotationId)).toHaveLength(1)
    expect(first.auditoria).toHaveLength(auditBefore)
  })

  it('aprueba una venta reservando stock sin descontarlo y evita reservas que exceden el disponible', () => {
    const scenarioContext = context()
    let estado = initialStock(baseState(), 5, warehouse.id, scenarioContext)
    const first = createApprovedSale(estado, client.id, 4, 'usr-seller', scenarioContext)
    estado = first.estado
    expect(selectStock(estado, product.id, warehouse.id)).toBe(5)
    expect(selectReservado(estado, product.id, warehouse.id)).toBe(4)
    expect(selectStockDisponible(estado, product.id, warehouse.id)).toBe(1)
    const second = createPendingSale(estado, client.id, 2, 'usr-seller', scenarioContext)
    const auditBefore = second.estado.auditoria.length
    const failed = aprobarVenta(second.estado, second.ventaId, 'usr-seller', scenarioContext)
    expect(failed.ok).toBe(false)
    expect(second.estado.ventas.find((item) => item.id === second.ventaId)?.estado).toBe('Pendiente')
    expect(second.estado.auditoria.length).toBe(auditBefore)
  })

  it('rechaza vender sin stock disponible y conserva el estado intacto', () => {
    const pending = createPendingSale(initialStock(baseState(), 2), client.id, 3)
    const before = JSON.stringify(pending.estado)
    const auditBefore = pending.estado.auditoria.length
    const failed = aprobarVenta(pending.estado, pending.ventaId, 'usr-seller', context())
    expect(failed.ok).toBe(false)
    expect(JSON.stringify(pending.estado)).toBe(before)
    expect(pending.estado.auditoria.length).toBe(auditBefore)
  })

  it('factura, descuenta stock, crea comprobante y CxC, libera la reserva y usa el correlativo', () => {
    const approved = createApprovedSale(initialStock(baseState()), client.id, 4)
    const estado = unwrap(facturarVenta(approved.estado, { ventaId: approved.ventaId, tipoComprobante: 'Factura', usuarioId: 'usr-seller' }, context()))
    expect(selectStock(estado, product.id, warehouse.id)).toBe(6)
    expect(selectReservado(estado, product.id, warehouse.id)).toBe(0)
    expect(estado.comprobantes.at(-1)?.numero).toBe('00045')
    expect(estado.cuentasCobrar).toHaveLength(1)
  })

  it('no permite emitir boleta a un cliente con RUC', () => {
    const approved = createApprovedSale(initialStock(baseState()), rucClient.id)
    const failed = facturarVenta(approved.estado, { ventaId: approved.ventaId, tipoComprobante: 'Boleta', usuarioId: 'usr-seller' }, context())
    expect(failed.ok).toBe(false)
    expect(approved.estado.comprobantes).toHaveLength(0)
  })

  it('deja saldo pendiente en cobro parcial, paga al completar y deriva Cobrado', () => {
    const approved = createApprovedSale(initialStock(baseState()), client.id, 4)
    const invoiced = unwrap(facturarVenta(approved.estado, { ventaId: approved.ventaId, tipoComprobante: 'Factura', usuarioId: 'usr-seller' }, context()))
    const accountId = invoiced.cuentasCobrar[0].id
    const partial = unwrap(registrarCobro(invoiced, { cuentaCobrarId: accountId, monto: 20, metodoPago: 'Efectivo', usuarioId: 'usr-accountant' }, context()))
    expect(selectEstadoCuenta(partial, accountId, '2026-01-15')).toBe('Pendiente')
    const remaining = selectSaldoCuenta(partial, accountId)
    const paid = unwrap(registrarCobro(partial, { cuentaCobrarId: accountId, monto: remaining, metodoPago: 'Efectivo', usuarioId: 'usr-accountant' }, context()))
    expect(selectEstadoCuenta(paid, accountId, '2026-01-15')).toBe('Pagada')
    expect(selectEstadoVenta(paid, approved.ventaId, '2026-01-15')).toBe('Cobrado')
    expect(registrarCobro(paid, { cuentaCobrarId: accountId, monto: 1, metodoPago: 'Efectivo', usuarioId: 'usr-accountant' }, context()).ok).toBe(false)
  })

  it('anula una venta aprobada liberando la reserva y una facturada con nota, devolución y reversión de CxC', () => {
    const approved = createApprovedSale(initialStock(baseState()), client.id, 4)
    const released = unwrap(anularVenta(approved.estado, approved.ventaId, 'Cliente canceló', 'usr-admin', context()))
    expect(selectReservado(released, product.id, warehouse.id)).toBe(0)
    expect(released.movimientosInventario).toHaveLength(1)
    const approvedForInvoice = createApprovedSale(initialStock(baseState()), client.id, 4)
    const invoiced = unwrap(facturarVenta(approvedForInvoice.estado, { ventaId: approvedForInvoice.ventaId, tipoComprobante: 'Factura', usuarioId: 'usr-seller' }, context()))
    const reversed = unwrap(anularVenta(invoiced, approvedForInvoice.ventaId, 'Devolución completa', 'usr-admin', context()))
    expect(reversed.comprobantes.at(-1)?.tipo).toBe('Nota de crédito')
    expect(reversed.movimientosInventario.at(-1)?.tipo).toBe('Entrada por devolución')
    expect(reversed.cuentasCobrar[0].anuladaEn).toBeDefined()
  })

  it('rechaza anular una venta facturada con cobros aplicados y conserva el estado sin auditoría', () => {
    const approved = createApprovedSale(initialStock(baseState()), client.id, 4)
    const invoiced = unwrap(facturarVenta(approved.estado, { ventaId: approved.ventaId, tipoComprobante: 'Factura', usuarioId: 'usr-seller' }, context()))
    const paidPart = unwrap(registrarCobro(invoiced, { cuentaCobrarId: invoiced.cuentasCobrar[0].id, monto: 1, metodoPago: 'Efectivo', usuarioId: 'usr-accountant' }, context()))
    const before = JSON.stringify(paidPart)
    const auditBefore = paidPart.auditoria.length
    const failed = anularVenta(paidPart, approved.ventaId, 'Devolución solicitada', 'usr-admin', context())
    expect(failed.ok).toBe(false)
    if (!failed.ok) expect(failed.error).toBe('No se puede anular una venta facturada si su cuenta por cobrar ya tiene cobros aplicados; el flujo de devolución al cliente queda fuera del alcance.')
    expect(JSON.stringify(paidPart)).toBe(before)
    expect(paidPart.auditoria.length).toBe(auditBefore)
  })
})

describe('compras, pagos y transferencias', () => {
  it('recibe una compra parcial y total, rechaza excedentes y calcula costo promedio ponderado', () => {
    const scenarioContext = context()
    const order = unwrap(crearOrdenCompra(baseState(), { proveedorId: supplier.id, compradorUsuarioId: 'usr-admin', almacenDestinoId: warehouse.id, items: [{ productoId: product.id, cantidad: 10, costoUnitario: 10 }], usuarioId: 'usr-admin' }, scenarioContext))
    const orderId = order.ordenesCompra.at(-1)?.id ?? ''
    const emitted = unwrap(emitirOrdenCompra(order, orderId, 'usr-admin', scenarioContext))
    const compraId = emitted.compras[0].id
    const partial = unwrap(recibirCompra(emitted, { compraId, almacenId: warehouse.id, items: [{ productoId: product.id, cantidadRecibida: 4, costoUnitario: 10 }], usuarioId: 'usr-warehouse' }, scenarioContext))
    expect(selectEstadoRecepcion(partial, partial.recepciones[0].id)).toBe('Parcial')
    expect(selectCostoPromedio(partial, product.id, warehouse.id)).toBe(10)
    expect(recibirCompra(partial, { compraId, almacenId: warehouse.id, items: [{ productoId: product.id, cantidadRecibida: 7, costoUnitario: 14 }], usuarioId: 'usr-warehouse' }, scenarioContext).ok).toBe(false)
    const complete = unwrap(recibirCompra(partial, { compraId, almacenId: warehouse.id, items: [{ productoId: product.id, cantidadRecibida: 6, costoUnitario: 14 }], usuarioId: 'usr-warehouse' }, scenarioContext))
    expect(selectEstadoRecepcion(complete, complete.recepciones[1].id)).toBe('Completa')
    expect(selectCostoPromedio(complete, product.id, warehouse.id)).toBe(12.4)
  })

  it('factura una compra y registra pago parcial y total a proveedor', () => {
    const order = unwrap(emitirOrdenCompra(unwrap(crearOrdenCompra(baseState(), { proveedorId: supplier.id, compradorUsuarioId: 'usr-admin', almacenDestinoId: warehouse.id, items: [{ productoId: product.id, cantidad: 2, costoUnitario: 10 }], usuarioId: 'usr-admin' }, context())), 'oc-1', 'usr-admin', context()))
    const received = unwrap(recibirCompra(order, { compraId: order.compras[0].id, almacenId: warehouse.id, items: [{ productoId: product.id, cantidadRecibida: 2, costoUnitario: 10 }], usuarioId: 'usr-warehouse' }, context()))
    const invoiced = unwrap(facturarCompra(received, { compraId: order.compras[0].id, tipoComprobante: 'Factura', usuarioId: 'usr-accountant' }, context()))
    const accountId = invoiced.cuentasPagar[0].id
    const partial = unwrap(registrarPagoProveedor(invoiced, { cuentaPagarId: accountId, monto: 10, metodoPago: 'Transferencia bancaria', cuentaBancariaId: bank.id, usuarioId: 'usr-accountant' }, context()))
    expect(selectEstadoCuenta(partial, accountId, '2026-01-15')).toBe('Pendiente')
    const paid = unwrap(registrarPagoProveedor(partial, { cuentaPagarId: accountId, monto: selectSaldoCuenta(partial, accountId), metodoPago: 'Transferencia bancaria', cuentaBancariaId: bank.id, usuarioId: 'usr-accountant' }, context()))
    expect(selectEstadoCuenta(paid, accountId, '2026-01-15')).toBe('Pagada')
  })

  it('crea salida y entrada de transferencia de forma atómica', () => {
    const state = initialStock(baseState(), 5)
    const moved = unwrap(transferirStock(state, { almacenOrigenId: warehouse.id, almacenDestinoId: warehouseTwo.id, items: [{ productoId: product.id, cantidad: 2 }], usuarioId: 'usr-admin' }, context()))
    expect(moved.movimientosInventario.filter((item) => item.tipo.startsWith('Transferencia'))).toHaveLength(2)
    const before = JSON.stringify(state)
    const auditBefore = state.auditoria.length
    const failed = transferirStock(state, { almacenOrigenId: warehouse.id, almacenDestinoId: warehouseTwo.id, items: [{ productoId: product.id, cantidad: 20 }], usuarioId: 'usr-admin' }, context())
    expect(failed.ok).toBe(false)
    expect(JSON.stringify(state)).toBe(before)
    expect(state.auditoria.length).toBe(auditBefore)
  })

  it('crea una transferencia en Borrador sin movimientos, la solicita y la ejecuta como Completada', () => {
    const scenarioContext = context()
    const initial = initialStock(baseState(), 8, warehouse.id, scenarioContext)
    const created = unwrap(crearTransferencia(initial, { almacenOrigenId: warehouse.id, almacenDestinoId: warehouseTwo.id, items: [{ productoId: product.id, cantidad: 3, costoUnitario: 10 }], usuarioId: 'usr-warehouse', solicitanteUsuarioId: 'usr-warehouse' }, scenarioContext))
    const transferId = created.transferencias.at(-1)?.id ?? ''
    expect(created.transferencias.at(-1)?.estado).toBe('Borrador')
    expect(created.movimientosInventario).toHaveLength(1)
    const requested = unwrap(solicitarTransferencia(created, transferId, 'usr-warehouse', scenarioContext))
    expect(requested.transferencias.at(-1)?.estado).toBe('Solicitada')
    expect(requested.movimientosInventario).toHaveLength(1)
    const executed = unwrap(transferirStock(requested, { transferenciaId: transferId, almacenOrigenId: warehouse.id, almacenDestinoId: warehouseTwo.id, items: [{ productoId: product.id, cantidad: 3, costoUnitario: 10 }], usuarioId: 'usr-admin' }, scenarioContext))
    expect(selectEstadoTransferencia(executed, transferId)).toBe('Completada')
    const movements = executed.movimientosInventario.filter((item) => item.transferenciaId === transferId)
    expect(movements).toHaveLength(2)
    expect(movements.map((item) => item.tipo).sort()).toEqual(['Transferencia entrada', 'Transferencia salida'])
    expect(movements[0].cantidad).toBe(movements[1].cantidad)
    expect(movements[0].costoUnitario).toBe(movements[1].costoUnitario)
  })

  it('rechaza transferencias inválidas sin movimiento ni auditoría adicional', () => {
    const cases = [
      { almacenOrigenId: warehouse.id, almacenDestinoId: warehouse.id, items: [{ productoId: product.id, cantidad: 1, costoUnitario: 10 }] },
      { almacenOrigenId: warehouse.id, almacenDestinoId: warehouseTwo.id, items: [{ productoId: product.id, cantidad: 1 }, { productoId: product.id, cantidad: 2 }] },
      { almacenOrigenId: warehouse.id, almacenDestinoId: warehouseTwo.id, items: [{ productoId: product.id, cantidad: 0, costoUnitario: 10 }] },
      { almacenOrigenId: warehouse.id, almacenDestinoId: warehouseTwo.id, items: [{ productoId: product.id, cantidad: -1, costoUnitario: 10 }] },
    ]
    for (const input of cases) {
      const state = baseState()
      const auditBefore = state.auditoria.length
      const failed = crearTransferencia(state, { ...input, usuarioId: 'usr-admin' }, context())
      expect(failed.ok).toBe(false)
      expect(state.movimientosInventario).toHaveLength(0)
      expect(state.auditoria.length).toBe(auditBefore)
    }
  })

  it('rechaza ejecutar una transferencia sin stock, por permiso o por segunda ejecución', () => {
    const scenarioContext = context()
    const empty = baseState()
    const created = unwrap(crearTransferencia(empty, { almacenOrigenId: warehouse.id, almacenDestinoId: warehouseTwo.id, items: [{ productoId: product.id, cantidad: 2, costoUnitario: 10 }], usuarioId: 'usr-warehouse' }, scenarioContext))
    const transferId = created.transferencias[0].id
    const requested = unwrap(solicitarTransferencia(created, transferId, 'usr-warehouse', scenarioContext))
    const auditBefore = requested.auditoria.length
    const noStock = transferirStock(requested, { transferenciaId: transferId, almacenOrigenId: warehouse.id, almacenDestinoId: warehouseTwo.id, items: [{ productoId: product.id, cantidad: 2, costoUnitario: 10 }], usuarioId: 'usr-admin' }, scenarioContext)
    expect(noStock.ok).toBe(false)
    expect(requested.movimientosInventario).toHaveLength(0)
    expect(requested.auditoria.length).toBe(auditBefore)

    const withStock = initialStock(baseState(), 5, warehouse.id, scenarioContext)
    const unauthorized = transferirStock(withStock, { almacenOrigenId: warehouse.id, almacenDestinoId: warehouseTwo.id, items: [{ productoId: product.id, cantidad: 1, costoUnitario: 10 }], usuarioId: 'usr-seller' }, scenarioContext)
    expect(unauthorized.ok).toBe(false)
    expect(withStock.movimientosInventario).toHaveLength(1)

    const createdWithStock = unwrap(crearTransferencia(withStock, { almacenOrigenId: warehouse.id, almacenDestinoId: warehouseTwo.id, items: [{ productoId: product.id, cantidad: 2, costoUnitario: 10 }], usuarioId: 'usr-warehouse' }, scenarioContext))
    const secondId = createdWithStock.transferencias.at(-1)?.id ?? ''
    const requestedWithStock = unwrap(solicitarTransferencia(createdWithStock, secondId, 'usr-warehouse', scenarioContext))
    const executed = unwrap(transferirStock(requestedWithStock, { transferenciaId: secondId, almacenOrigenId: warehouse.id, almacenDestinoId: warehouseTwo.id, items: [{ productoId: product.id, cantidad: 2, costoUnitario: 10 }], usuarioId: 'usr-admin' }, scenarioContext))
    const auditAfterFirstExecution = executed.auditoria.length
    const movementsAfterFirstExecution = executed.movimientosInventario.length
    const repeated = transferirStock(executed, { transferenciaId: secondId, almacenOrigenId: warehouse.id, almacenDestinoId: warehouseTwo.id, items: [{ productoId: product.id, cantidad: 2, costoUnitario: 10 }], usuarioId: 'usr-admin' }, scenarioContext)
    expect(repeated.ok).toBe(false)
    expect(executed.movimientosInventario).toHaveLength(movementsAfterFirstExecution)
    expect(executed.auditoria.length).toBe(auditAfterFirstExecution)
    const cancelCompleted = anularTransferencia(executed, secondId, 'Cancelación tardía', 'usr-admin', scenarioContext)
    expect(cancelCompleted.ok).toBe(false)
    expect(executed.movimientosInventario).toHaveLength(movementsAfterFirstExecution)
    expect(executed.auditoria.length).toBe(auditAfterFirstExecution)
  })
})

describe('ajustes, permisos y auditoría', () => {
  it('no crea movimiento al solicitar ajuste y crea entrada o salida al aprobarlo', () => {
    const scenarioContext = context()
    const initial = initialStock(baseState(), 10, warehouse.id, scenarioContext)
    const requested = unwrap(solicitarAjuste(initial, { productoId: product.id, almacenId: warehouse.id, cantidadEsperada: 12, motivo: 'Conteo físico', usuarioId: 'usr-warehouse' }, scenarioContext))
    expect(requested.movimientosInventario).toHaveLength(1)
    const approved = unwrap(aprobarAjuste(requested, requested.solicitudesAjuste[0].id, 'usr-admin', scenarioContext))
    expect(approved.movimientosInventario.at(-1)?.tipo).toBe('Ajuste entrada')
    const requestedExit = unwrap(solicitarAjuste(approved, { productoId: product.id, almacenId: warehouse.id, cantidadEsperada: 8, motivo: 'Segundo conteo', usuarioId: 'usr-warehouse' }, scenarioContext))
    const approvedExit = unwrap(aprobarAjuste(requestedExit, requestedExit.solicitudesAjuste[1].id, 'usr-admin', scenarioContext))
    expect(approvedExit.movimientosInventario.at(-1)?.tipo).toBe('Ajuste salida')
  })

  it('rechaza un ajuste con motivo sin crear movimiento de kardex', () => {
    const scenarioContext = context()
    const initial = initialStock(baseState(), 10, warehouse.id, scenarioContext)
    const requested = unwrap(solicitarAjuste(initial, { productoId: product.id, almacenId: warehouse.id, cantidadEsperada: 12, motivo: 'Conteo físico', usuarioId: 'usr-warehouse' }, scenarioContext))
    const movementsBefore = requested.movimientosInventario.length
    const rejected = unwrap(rechazarAjuste(requested, requested.solicitudesAjuste[0].id, 'Evidencia insuficiente', 'usr-admin', scenarioContext))
    expect(rejected.solicitudesAjuste[0].estado).toBe('Rechazada')
    expect(rejected.movimientosInventario).toHaveLength(movementsBefore)
    expect(rejected.auditoria.at(-1)?.entidadTipo).toBe('SolicitudAjusteInventario')
  })

  it('anula una solicitud pendiente sin modificar el stock', () => {
    const scenarioContext = context()
    const initial = initialStock(baseState(), 10, warehouse.id, scenarioContext)
    const requested = unwrap(solicitarAjuste(initial, { productoId: product.id, almacenId: warehouse.id, cantidadEsperada: 12, motivo: 'Conteo duplicado', usuarioId: 'usr-warehouse' }, scenarioContext))
    const movementsBefore = requested.movimientosInventario.length
    const annulled = unwrap(anularAjuste(requested, requested.solicitudesAjuste[0].id, 'Solicitud duplicada', 'usr-admin', scenarioContext))
    expect(annulled.solicitudesAjuste[0].estado).toBe('Anulada')
    expect(annulled.movimientosInventario).toHaveLength(movementsBefore)
    expect(annulled.auditoria.at(-1)?.accion).toBe('Anular')
  })

  it('rechaza una acción cuando el rol no tiene permiso y no agrega auditoría', () => {
    const state = initialStock(baseState())
    const pending = createPendingSale(state)
    const auditBefore = pending.estado.auditoria.length
    const failed = facturarVenta(pending.estado, { ventaId: pending.ventaId, tipoComprobante: 'Factura', usuarioId: 'usr-warehouse' }, context())
    expect(failed.ok).toBe(false)
    expect(pending.estado.auditoria.length).toBe(auditBefore)
    if (!failed.ok) expect(failed.error).toContain('no tiene permiso')
  })

  it('devuelve auditoría en acciones exitosas y ninguna en fallidas', () => {
    const state = baseState()
    const successful = registrarSaldoInicial(state, { productoId: product.id, almacenId: warehouse.id, cantidad: 1, costoUnitario: 1, usuarioId: 'usr-warehouse' }, context())
    expect(successful.ok).toBe(true)
    const failed = registrarSaldoInicial(state, { productoId: product.id, almacenId: warehouse.id, cantidad: 0, costoUnitario: 1, usuarioId: 'usr-warehouse' }, context())
    expect(failed.ok).toBe(false)
    if (!failed.ok) expect('auditoria' in failed).toBe(false)
  })
})

describe('documentos y trazabilidad', () => {
  it('rechaza documentos con una entidad inexistente sin mutar el estado ni auditar', () => {
    const state = baseState()
    const before = JSON.stringify(state)
    const result = subirDocumentoSimulado(state, {
      tipo: 'Otro',
      nombreArchivo: 'archivo.pdf',
      mimeType: 'application/pdf',
      tamanoBytes: 128,
      entidadTipo: 'Cliente',
      entidadId: 'cliente-inexistente',
      urlSimulada: '#',
      subidoPorUsuarioId: 'usr-admin',
      usuarioId: 'usr-admin',
    }, context())

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('no existe')
    expect(JSON.stringify(state)).toBe(before)
    expect(state.auditoria).toHaveLength(0)
  })

  it('acepta un documento cuando la entidad y el usuario existen', () => {
    const state = baseState()
    const result = subirDocumentoSimulado(state, {
      tipo: 'Otro',
      nombreArchivo: 'archivo.pdf',
      mimeType: 'application/pdf',
      tamanoBytes: 128,
      entidadTipo: 'Cliente',
      entidadId: client.id,
      urlSimulada: '#',
      subidoPorUsuarioId: 'usr-admin',
      usuarioId: 'usr-admin',
    }, context())

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.estado.documentos).toHaveLength(1)
      expect(result.estado.documentos[0].entidadId).toBe(client.id)
      expect(result.auditoria[0].accion).toBe('Subir')
    }
  })
})

describe('administración', () => {
  it('edita un usuario, valida el rol y registra auditoría', () => {
    const state = baseState()
    const result = editarUsuario(state, { usuarioId: 'usr-admin', objetivoUsuarioId: 'usr-seller', rolId: accountantRole.id, estado: 'Inactivo' }, context())

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.estado.usuarios.find((item) => item.id === 'usr-seller')).toMatchObject({ rolId: accountantRole.id, estado: 'Inactivo' })
    expect(result.auditoria.at(-1)).toMatchObject({ accion: 'Editar', entidadTipo: 'Usuario', entidadId: 'usr-seller' })

    const before = JSON.stringify(state)
    const failed = editarUsuario(state, { usuarioId: 'usr-seller', objetivoUsuarioId: 'usr-admin', estado: 'Inactivo' }, context())
    expect(failed.ok).toBe(false)
    expect(JSON.stringify(state)).toBe(before)
    expect(state.auditoria).toHaveLength(0)
  })

  it('actualiza configuración y valida IGV y almacén', () => {
    const state = baseState()
    const result = editarConfiguracion(state, { usuarioId: 'usr-admin', igvPorDefecto: 0.2, almacenPorDefectoId: warehouseTwo.id, datosEmpresa: { direccion: 'Av. Nueva 10' } }, context())

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.estado.configuracion.igvPorDefecto).toBe(0.2)
    expect(result.estado.configuracion.almacenPorDefectoId).toBe(warehouseTwo.id)
    expect(result.estado.configuracion.datosEmpresa.direccion).toBe('Av. Nueva 10')
    expect(result.auditoria.at(-1)).toMatchObject({ accion: 'Editar', entidadTipo: 'Configuración', entidadId: configuration.id })

    const before = JSON.stringify(state)
    const failed = editarConfiguracion(state, { usuarioId: 'usr-seller', igvPorDefecto: 0.2 }, context())
    expect(failed.ok).toBe(false)
    expect(JSON.stringify(state)).toBe(before)
    expect(state.auditoria).toHaveLength(0)
  })

  it('rechaza cambios administrativos inválidos sin modificar el estado', () => {
    const state = baseState()
    const unknownUser = editarUsuario(state, { usuarioId: 'usr-admin', objetivoUsuarioId: 'usr-missing', rolId: adminRole.id }, context())
    const invalidIgv = editarConfiguracion(state, { usuarioId: 'usr-admin', igvPorDefecto: 1.2 }, context())

    expect(unknownUser.ok).toBe(false)
    expect(invalidIgv.ok).toBe(false)
    expect(state.auditoria).toHaveLength(0)
    expect(state.configuracion.igvPorDefecto).toBe(0.18)
  })
})
