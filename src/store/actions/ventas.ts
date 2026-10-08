import type { AccionPermiso, CondicionPago, DetalleVenta, ID, MetodoPago, Venta } from '../../types'
import type { ActionContext, ActionResult, ERPState } from '../state'
import { exigirPermiso } from '../permissions'
import { selectCostoPromedio, selectEstadoCuenta, selectSaldoCuenta, selectStock, selectStockDisponible } from '../selectors'
import { redondearDosDecimales } from '../../utils'
import { activo, auditFields, auditoria, comprobanteVenta, error, fechaSolo, nextSerie, numeroOperacion, ok, permiso, positivo } from './helpers'

interface VentaItemInput {
  productoId: ID
  descripcionProducto: string
  cantidad: number
  precioUnitario: number
  descuento: number
  tasaImpuesto: number
}

interface VentaBaseInput {
  clienteId: ID
  vendedorId: ID
  almacenId: ID
  condicionPago: CondicionPago
  plazoCreditoDias: number
  items: VentaItemInput[]
  cotizacionId?: ID
  observaciones?: string
  usuarioId: ID
}

function validateVentaBase(estado: ERPState, input: VentaBaseInput): string | undefined {
  const cliente = estado.clientes.find((item) => item.id === input.clienteId)
  if (!cliente) return 'El cliente indicado no existe.'
  const clienteActivo = activo(cliente.estado, 'El cliente')
  if (clienteActivo) return clienteActivo
  if (!estado.almacenes.some((item) => item.id === input.almacenId && item.estado === 'Activo')) return 'El almacén indicado no existe o está inactivo.'
  if (input.cotizacionId) {
    const cotizacion = estado.cotizaciones.find((item) => item.id === input.cotizacionId)
    if (!cotizacion) return 'La cotización indicada no existe.'
    if (cotizacion.estado !== 'Aceptada') return 'Solo una cotización Aceptada puede convertirse en venta.'
    if (cotizacion.clienteId !== input.clienteId) return 'El cliente de la venta no coincide con el cliente de la cotización.'
    if (estado.ventas.some((item) => item.cotizacionId === input.cotizacionId)) return 'La cotización indicada ya fue convertida en una venta.'
  }
  if (input.items.length === 0) return 'La venta debe tener al menos una línea.'
  for (const item of input.items) {
    const producto = estado.productos.find((productoActual) => productoActual.id === item.productoId)
    if (!producto) return `El producto ${item.productoId} no existe.`
    const productoActivo = activo(producto.estado, `El producto ${producto.nombre}`)
    if (productoActivo) return productoActivo
    const cantidadError = positivo(item.cantidad, `La cantidad del producto ${producto.nombre}`)
    if (cantidadError) return cantidadError
    if (item.precioUnitario < 0 || item.descuento < 0 || item.tasaImpuesto < 0) return `Los importes de ${producto.nombre} no pueden ser negativos.`
  }
  return undefined
}

export function crearVenta(estado: ERPState, input: VentaBaseInput, contexto: ActionContext): ActionResult {
  const permisoError = permiso(estado, input.usuarioId, 'Ventas', 'crear')
  if (permisoError) return error(permisoError)
  const validacion = validateVentaBase(estado, input)
  if (validacion) return error(validacion)
  const ventaId = contexto.idGenerador('ven')
  const fecha = fechaSolo(contexto)
  const detalleIds = input.items.map(() => contexto.idGenerador('det-ven'))
  const venta: Venta = {
    id: ventaId, numero: numeroOperacion('V', ventaId), clienteId: input.clienteId, vendedorId: input.vendedorId, almacenId: input.almacenId,
    cotizacionId: input.cotizacionId, fecha, moneda: 'PEN', condicionPago: input.condicionPago, plazoCreditoDias: input.plazoCreditoDias,
    estado: 'Borrador', detalleIds, observaciones: input.observaciones, ...auditFields(contexto, input.usuarioId),
  }
  const detalles: DetalleVenta[] = input.items.map((item, index) => ({ id: detalleIds[index], ventaId, ...item }))
  const registro = auditoria(contexto, input.usuarioId, 'Crear', 'Comercial', 'Venta', ventaId, 'Venta creada en estado Borrador', undefined, 'Borrador')
  return ok({ ...estado, ventas: [...estado.ventas, venta], detallesVenta: [...estado.detallesVenta, ...detalles] }, registro)
}

export function enviarVenta(estado: ERPState, ventaId: ID, usuarioId: ID, contexto: ActionContext): ActionResult {
  const permisoError = permiso(estado, usuarioId, 'Ventas', 'editar')
  if (permisoError) return error(permisoError)
  const venta = estado.ventas.find((item) => item.id === ventaId)
  if (!venta) return error('La venta indicada no existe.')
  if (venta.estado !== 'Borrador') return error(`La venta ${venta.numero} debe estar en Borrador para enviarse a revisión.`)
  const actualizada = { ...venta, estado: 'Pendiente' as const, actualizadoEn: contexto.reloj(), actualizadoPorUsuarioId: usuarioId }
  const registro = auditoria(contexto, usuarioId, 'Emitir', 'Comercial', 'Venta', ventaId, 'Venta enviada a revisión', 'Borrador', 'Pendiente')
  return ok({ ...estado, ventas: estado.ventas.map((item) => item.id === ventaId ? actualizada : item) }, registro)
}

function permisoAprobacion(estado: ERPState, usuarioId: ID, recurso: 'Ventas' | 'Facturación', accion: AccionPermiso): string | undefined {
  return exigirPermiso(estado, usuarioId, recurso, accion)
}

export function aprobarVenta(estado: ERPState, ventaId: ID, usuarioId: ID, contexto: ActionContext): ActionResult {
  const permisoError = permisoAprobacion(estado, usuarioId, 'Ventas', 'aprobar')
  if (permisoError) return error(permisoError)
  const venta = estado.ventas.find((item) => item.id === ventaId)
  if (!venta) return error('La venta indicada no existe.')
  if (venta.estado !== 'Pendiente') return error(`La venta ${venta.numero} debe estar Pendiente para aprobarse.`)
  const detalles = estado.detallesVenta.filter((item) => venta.detalleIds.includes(item.id))
  const cantidades = new Map<ID, number>()
  detalles.forEach((detalle) => cantidades.set(detalle.productoId, (cantidades.get(detalle.productoId) ?? 0) + detalle.cantidad))
  for (const [productoId, cantidad] of cantidades) {
    if (selectStockDisponible(estado, productoId, venta.almacenId) < cantidad) return error(`No hay stock disponible suficiente para el producto ${productoId}.`)
  }
  const actualizada = { ...venta, estado: 'Aprobado' as const, actualizadoEn: contexto.reloj(), actualizadoPorUsuarioId: usuarioId }
  const registro = auditoria(contexto, usuarioId, 'Aprobar', 'Comercial', 'Venta', ventaId, 'Venta aprobada y stock reservado de forma derivada', 'Pendiente', 'Aprobado')
  return ok({ ...estado, ventas: estado.ventas.map((item) => item.id === ventaId ? actualizada : item) }, registro)
}

interface FacturarVentaInput {
  ventaId: ID
  tipoComprobante: 'Factura' | 'Boleta'
  serie?: string
  fecha?: string
  usuarioId: ID
}

function vencimiento(fecha: string, dias: number): string {
  const resultado = new Date(`${fecha}T00:00:00Z`)
  resultado.setUTCDate(resultado.getUTCDate() + dias)
  return resultado.toISOString().slice(0, 10)
}

export function facturarVenta(estado: ERPState, input: FacturarVentaInput, contexto: ActionContext): ActionResult {
  const permisoError = permisoAprobacion(estado, input.usuarioId, 'Facturación', 'crear')
  if (permisoError) return error(permisoError)
  const venta = estado.ventas.find((item) => item.id === input.ventaId)
  if (!venta) return error('La venta indicada no existe.')
  if (venta.estado !== 'Aprobado') return error(`La venta ${venta.numero} debe estar Aprobada para facturarse.`)
  const cliente = estado.clientes.find((item) => item.id === venta.clienteId)
  if (!cliente) return error('El cliente de la venta no existe.')
  if (input.tipoComprobante === 'Boleta' && cliente.tipoDocumento === 'RUC') return error('No se puede emitir una boleta a un cliente con RUC.')
  const serie = nextSerie(estado, input.tipoComprobante, input.serie)
  if (typeof serie === 'string') return error(serie)
  const detalles = estado.detallesVenta.filter((item) => venta.detalleIds.includes(item.id))
  const cantidades = new Map<ID, number>()
  detalles.forEach((detalle) => cantidades.set(detalle.productoId, (cantidades.get(detalle.productoId) ?? 0) + detalle.cantidad))
  for (const [productoId, cantidad] of cantidades) {
    const reservaPropia = estado.ventas.filter((item) => item.id === venta.id).flatMap((item) => estado.detallesVenta.filter((detalle) => item.detalleIds.includes(detalle.id) && detalle.productoId === productoId)).reduce((total, detalle) => total + detalle.cantidad, 0)
    if (selectStockDisponible(estado, productoId, venta.almacenId) + reservaPropia < cantidad || selectStock(estado, productoId, venta.almacenId) < cantidad) return error(`La reserva del producto ${productoId} ya no está disponible para facturar.`)
  }
  const fecha = input.fecha ?? fechaSolo(contexto)
  const comprobanteId = contexto.idGenerador('comp')
  const comprobante = {
    id: comprobanteId, tipo: input.tipoComprobante, serie: serie.serie, numero: serie.numero, fechaEmision: fecha, moneda: 'PEN' as const,
    estado: 'Emitido' as const, ventaId: venta.id, clienteId: venta.clienteId, ...auditFields(contexto, input.usuarioId),
  }
  const movimientos = detalles.map((detalle) => ({
    id: contexto.idGenerador('mov'), tipo: 'Salida por venta' as const, productoId: detalle.productoId, almacenId: venta.almacenId,
    cantidad: detalle.cantidad, costoUnitario: selectCostoPromedio(estado, detalle.productoId, venta.almacenId), fecha: contexto.reloj(),
    referenciaTipo: 'Venta' as const, referenciaId: venta.id, motivo: undefined, ...auditFields(contexto, input.usuarioId),
  }))
  const cuentaId = contexto.idGenerador('cxc')
  const cuenta = {
    id: cuentaId, clienteId: venta.clienteId, ventaId: venta.id, comprobanteId, fechaEmision: fecha,
    fechaVencimiento: vencimiento(fecha, venta.condicionPago === 'Contado' ? 0 : venta.plazoCreditoDias), moneda: 'PEN' as const,
    ...auditFields(contexto, input.usuarioId),
  }
  const actualizada = { ...venta, estado: 'Facturado' as const, actualizadoEn: contexto.reloj(), actualizadoPorUsuarioId: input.usuarioId }
  const registro = auditoria(contexto, input.usuarioId, 'Facturar', 'Comercial', 'Venta', venta.id, `Venta facturada con ${input.tipoComprobante} ${serie.serie}-${serie.numero}`, 'Aprobado', 'Facturado')
  return ok({ ...estado, configuracion: serie.configuracion, ventas: estado.ventas.map((item) => item.id === venta.id ? actualizada : item), comprobantes: [...estado.comprobantes, comprobante], movimientosInventario: [...estado.movimientosInventario, ...movimientos], cuentasCobrar: [...estado.cuentasCobrar, cuenta] }, registro)
}

interface CobroInput {
  cuentaCobrarId: ID
  monto: number
  metodoPago: MetodoPago
  cuentaBancariaId?: ID
  usuarioId: ID
}

function requiereCuentaBancaria(metodo: MetodoPago): boolean {
  return metodo === 'Yape' || metodo === 'Plin' || metodo === 'Transferencia bancaria' || metodo === 'Tarjeta'
}

export function registrarCobro(estado: ERPState, input: CobroInput, contexto: ActionContext): ActionResult {
  const permisoError = permiso(estado, input.usuarioId, 'Cuentas por cobrar', 'crear')
  if (permisoError) return error(permisoError)
  const cuenta = estado.cuentasCobrar.find((item) => item.id === input.cuentaCobrarId)
  if (!cuenta) return error('La cuenta por cobrar indicada no existe.')
  const estadoCuenta = selectEstadoCuenta(estado, cuenta.id, fechaSolo(contexto))
  if (estadoCuenta === 'Anulada' || estadoCuenta === 'Pagada') return error('La cuenta por cobrar está anulada o ya fue pagada.')
  const monto = redondearDosDecimales(input.monto)
  const montoError = positivo(monto, 'El monto del cobro')
  if (montoError) return error(montoError)
  if (monto > selectSaldoCuenta(estado, cuenta.id)) return error('El cobro no puede superar el saldo pendiente de la cuenta.')
  if (requiereCuentaBancaria(input.metodoPago) && !input.cuentaBancariaId) return error('El método de pago requiere una cuenta bancaria.')
  if (input.cuentaBancariaId && !estado.cuentasBancarias.some((banco) => banco.id === input.cuentaBancariaId && banco.estado === 'Activo')) return error('La cuenta bancaria indicada no existe o está inactiva.')
  const movimientoId = contexto.idGenerador('mc')
  const movimiento = { id: movimientoId, tipo: 'Ingreso' as const, fecha: contexto.reloj(), moneda: 'PEN' as const, monto, metodoPago: input.metodoPago, cuentaBancariaId: input.cuentaBancariaId, referenciaTipo: 'Cobro' as const, referenciaId: cuenta.id, ...auditFields(contexto, input.usuarioId) }
  const pago = { id: contexto.idGenerador('pago'), tipo: 'Cobro cliente' as const, fecha: fechaSolo(contexto), moneda: 'PEN' as const, monto, metodoPago: input.metodoPago, movimientoCajaId: movimientoId, cuentaBancariaId: input.cuentaBancariaId, usuarioId: input.usuarioId, cuentaCobrarId: cuenta.id, ...auditFields(contexto, input.usuarioId) }
  const registro = auditoria(contexto, input.usuarioId, 'Registrar cobro', 'Finanzas', 'CuentaCobrar', cuenta.id, `Cobro registrado por S/ ${monto}.`)
  return ok({ ...estado, movimientosCaja: [...estado.movimientosCaja, movimiento], pagos: [...estado.pagos, pago] }, registro)
}

export function anularVenta(estado: ERPState, ventaId: ID, motivo: string, usuarioId: ID, contexto: ActionContext): ActionResult {
  const permisoError = permiso(estado, usuarioId, 'Ventas', 'anular')
  if (permisoError) return error(permisoError)
  if (!motivo.trim()) return error('El motivo de anulación es obligatorio.')
  const venta = estado.ventas.find((item) => item.id === ventaId)
  if (!venta) return error('La venta indicada no existe.')
  if (venta.estado === 'Anulado') return error('La venta ya está anulada.')
  const actualizada = { ...venta, estado: 'Anulado' as const, actualizadoEn: contexto.reloj(), actualizadoPorUsuarioId: usuarioId }
  if (venta.estado === 'Borrador' || venta.estado === 'Pendiente' || venta.estado === 'Aprobado') {
    const registro = auditoria(contexto, usuarioId, 'Anular', 'Comercial', 'Venta', ventaId, motivo, venta.estado, 'Anulado')
    return ok({ ...estado, ventas: estado.ventas.map((item) => item.id === ventaId ? actualizada : item) }, registro)
  }
  const cuenta = estado.cuentasCobrar.find((item) => item.ventaId === ventaId)
  if (cuenta && estado.pagos.some((pago) => 'cuentaCobrarId' in pago && pago.cuentaCobrarId === cuenta.id)) return error('No se puede anular una venta facturada si su cuenta por cobrar ya tiene cobros aplicados; el flujo de devolución al cliente queda fuera del alcance.')
  const original = comprobanteVenta(estado, ventaId)
  if (!original) return error('No existe el comprobante original de la venta.')
  const serie = nextSerie(estado, 'Nota de crédito')
  if (typeof serie === 'string') return error(serie)
  const notaId = contexto.idGenerador('comp')
  const nota = { id: notaId, tipo: 'Nota de crédito' as const, serie: serie.serie, numero: serie.numero, fechaEmision: fechaSolo(contexto), moneda: 'PEN' as const, estado: 'Emitido' as const, ventaId, clienteId: venta.clienteId, comprobanteRelacionadoId: original.id, motivo, ...auditFields(contexto, usuarioId) }
  const devoluciones = estado.detallesVenta.filter((detalle) => venta.detalleIds.includes(detalle.id)).map((detalle) => ({ id: contexto.idGenerador('mov'), tipo: 'Entrada por devolución' as const, productoId: detalle.productoId, almacenId: venta.almacenId, cantidad: detalle.cantidad, costoUnitario: selectCostoPromedio(estado, detalle.productoId, venta.almacenId), fecha: contexto.reloj(), referenciaTipo: 'Venta' as const, referenciaId: ventaId, motivo, ...auditFields(contexto, usuarioId) }))
  const cuentasCobrar = cuenta ? estado.cuentasCobrar.map((item) => item.id === cuenta.id ? { ...item, anuladaEn: contexto.reloj(), actualizadoEn: contexto.reloj(), actualizadoPorUsuarioId: usuarioId } : item) : estado.cuentasCobrar
  const registro = auditoria(contexto, usuarioId, 'Anular', 'Comercial', 'Venta', ventaId, `Venta anulada: ${motivo}. Se generó nota de crédito y devolución.`, venta.estado, 'Anulado')
  return ok({ ...estado, configuracion: serie.configuracion, ventas: estado.ventas.map((item) => item.id === ventaId ? actualizada : item), comprobantes: [...estado.comprobantes, nota], movimientosInventario: [...estado.movimientosInventario, ...devoluciones], cuentasCobrar }, registro)
}
