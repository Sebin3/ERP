import type { ID, ItemOrdenCompra, ItemSolicitudCompra, MetodoPago } from '../../types'
import type { ActionContext, ActionResult, ERPState } from '../state'
import { selectEstadoCuenta, selectSaldoCuenta, selectTotalCompra } from '../selectors'
import { redondearDosDecimales } from '../../utils'
import { activo, auditFields, auditoria, error, fechaSolo, nextSerie, numeroOperacion, ok, permiso, positivo } from './helpers'

interface SolicitudInput {
  solicitanteUsuarioId: ID
  almacenDestinoId: ID
  items: Array<Omit<ItemSolicitudCompra, 'id'>>
  motivo?: string
  usuarioId: ID
}

export function crearSolicitudCompra(estado: ERPState, input: SolicitudInput, contexto: ActionContext): ActionResult {
  const permisoError = permiso(estado, input.usuarioId, 'Solicitudes de compra', 'crear')
  if (permisoError) return error(permisoError)
  if (!estado.almacenes.some((item) => item.id === input.almacenDestinoId && item.estado === 'Activo')) return error('El almacén destino no existe o está inactivo.')
  if (input.items.length === 0) return error('La solicitud debe tener al menos una línea.')
  for (const item of input.items) {
    if (!estado.productos.some((producto) => producto.id === item.productoId && producto.estado === 'Activo')) return error(`El producto ${item.productoId} no existe o está inactivo.`)
    const cantidadError = positivo(item.cantidadSolicitada, `La cantidad solicitada del producto ${item.productoId}`)
    if (cantidadError) return error(cantidadError)
  }
  const id = contexto.idGenerador('sol')
  const itemIds = input.items.map(() => contexto.idGenerador('item-sol'))
  const solicitud = { id, numero: numeroOperacion('SC', id), solicitanteUsuarioId: input.solicitanteUsuarioId, almacenDestinoId: input.almacenDestinoId, fecha: fechaSolo(contexto), estado: 'Borrador' as const, items: input.items.map((item, index) => ({ ...item, id: itemIds[index] })), motivo: input.motivo, ...auditFields(contexto, input.usuarioId) }
  const registro = auditoria(contexto, input.usuarioId, 'Crear', 'Compras', 'SolicitudCompra', id, 'Solicitud de compra creada en estado Borrador.')
  return ok({ ...estado, solicitudesCompra: [...estado.solicitudesCompra, solicitud] }, registro)
}

export function solicitarCompra(estado: ERPState, solicitudId: ID, usuarioId: ID, contexto: ActionContext): ActionResult {
  const permisoError = permiso(estado, usuarioId, 'Solicitudes de compra', 'editar')
  if (permisoError) return error(permisoError)
  const solicitud = estado.solicitudesCompra.find((item) => item.id === solicitudId)
  if (!solicitud) return error('La solicitud de compra indicada no existe.')
  if (solicitud.estado !== 'Borrador') return error('La solicitud de compra debe estar en Borrador.')
  const actualizada = { ...solicitud, estado: 'Solicitada' as const, actualizadoEn: contexto.reloj(), actualizadoPorUsuarioId: usuarioId }
  const registro = auditoria(contexto, usuarioId, 'Emitir', 'Compras', 'SolicitudCompra', solicitudId, 'Solicitud de compra enviada.', 'Borrador', 'Solicitada')
  return ok({ ...estado, solicitudesCompra: estado.solicitudesCompra.map((item) => item.id === solicitudId ? actualizada : item) }, registro)
}

export function aprobarSolicitudCompra(estado: ERPState, solicitudId: ID, usuarioId: ID, contexto: ActionContext): ActionResult {
  const permisoError = permiso(estado, usuarioId, 'Solicitudes de compra', 'aprobar')
  if (permisoError) return error(permisoError)
  const solicitud = estado.solicitudesCompra.find((item) => item.id === solicitudId)
  if (!solicitud) return error('La solicitud de compra indicada no existe.')
  if (solicitud.estado !== 'Solicitada') return error('La solicitud de compra debe estar Solicitada.')
  const actualizada = { ...solicitud, estado: 'Aprobada' as const, actualizadoEn: contexto.reloj(), actualizadoPorUsuarioId: usuarioId }
  const registro = auditoria(contexto, usuarioId, 'Aprobar', 'Compras', 'SolicitudCompra', solicitudId, 'Solicitud de compra aprobada.', 'Solicitada', 'Aprobada')
  return ok({ ...estado, solicitudesCompra: estado.solicitudesCompra.map((item) => item.id === solicitudId ? actualizada : item) }, registro)
}

interface OrdenInput {
  solicitudCompraId?: ID
  proveedorId: ID
  compradorUsuarioId: ID
  almacenDestinoId: ID
  items: Array<Omit<ItemOrdenCompra, 'id'>>
  fechaEntregaEsperada?: string
  observaciones?: string
  usuarioId: ID
}

export function crearOrdenCompra(estado: ERPState, input: OrdenInput, contexto: ActionContext): ActionResult {
  const permisoError = permiso(estado, input.usuarioId, 'Órdenes de compra', 'crear')
  if (permisoError) return error(permisoError)
  const proveedor = estado.proveedores.find((item) => item.id === input.proveedorId)
  if (!proveedor) return error('El proveedor indicado no existe.')
  const proveedorActivo = activo(proveedor.estado, 'El proveedor')
  if (proveedorActivo) return error(proveedorActivo)
  if (!estado.almacenes.some((item) => item.id === input.almacenDestinoId && item.estado === 'Activo')) return error('El almacén destino no existe o está inactivo.')
  if (input.solicitudCompraId) {
    const solicitud = estado.solicitudesCompra.find((item) => item.id === input.solicitudCompraId)
    if (!solicitud || solicitud.estado !== 'Aprobada') return error('La solicitud vinculada debe existir y estar Aprobada.')
  }
  if (input.items.length === 0) return error('La orden debe tener al menos una línea.')
  for (const item of input.items) {
    if (!estado.productos.some((producto) => producto.id === item.productoId && producto.estado === 'Activo')) return error(`El producto ${item.productoId} no existe o está inactivo.`)
    const cantidadError = positivo(item.cantidad, `La cantidad del producto ${item.productoId}`)
    if (cantidadError) return error(cantidadError)
    const costoError = positivo(item.costoUnitario, `El costo del producto ${item.productoId}`)
    if (costoError) return error(costoError)
  }
  const id = contexto.idGenerador('oc')
  const itemIds = input.items.map(() => contexto.idGenerador('item-oc'))
  const orden = { id, numero: numeroOperacion('OC', id), solicitudCompraId: input.solicitudCompraId, proveedorId: input.proveedorId, compradorUsuarioId: input.compradorUsuarioId, almacenDestinoId: input.almacenDestinoId, fecha: fechaSolo(contexto), fechaEntregaEsperada: input.fechaEntregaEsperada, estado: 'Borrador' as const, items: input.items.map((item, index) => ({ ...item, id: itemIds[index] })), observaciones: input.observaciones, ...auditFields(contexto, input.usuarioId) }
  const registro = auditoria(contexto, input.usuarioId, 'Crear', 'Compras', 'OrdenCompra', id, 'Orden de compra creada en estado Borrador.')
  return ok({ ...estado, ordenesCompra: [...estado.ordenesCompra, orden] }, registro)
}

export function emitirOrdenCompra(estado: ERPState, ordenCompraId: ID, usuarioId: ID, contexto: ActionContext): ActionResult {
  const permisoError = permiso(estado, usuarioId, 'Órdenes de compra', 'aprobar')
  if (permisoError) return error(permisoError)
  const orden = estado.ordenesCompra.find((item) => item.id === ordenCompraId)
  if (!orden) return error('La orden de compra indicada no existe.')
  if (orden.estado !== 'Borrador') return error('La orden de compra debe estar en Borrador para emitirse.')
  if (estado.compras.some((compra) => compra.ordenCompraId === orden.id)) return error('La orden de compra ya tiene una compra asociada.')
  const compraId = contexto.idGenerador('compra')
  const detalleIds = orden.items.map(() => contexto.idGenerador('det-com'))
  const detalles = orden.items.map((item, index) => ({ id: detalleIds[index], compraId, productoId: item.productoId, descripcionProducto: estado.productos.find((producto) => producto.id === item.productoId)?.nombre ?? item.productoId, cantidad: item.cantidad, costoUnitario: item.costoUnitario, tasaImpuesto: estado.configuracion.igvPorDefecto }))
  const compra = { id: compraId, numero: numeroOperacion('CO', compraId), ordenCompraId: orden.id, proveedorId: orden.proveedorId, almacenId: orden.almacenDestinoId, fecha: fechaSolo(contexto), moneda: 'PEN' as const, condicionPago: 'Crédito' as const, plazoCreditoDias: estado.proveedores.find((item) => item.id === orden.proveedorId)?.diasCredito ?? 0, estado: 'Ordenada' as const, detalleIds, ...auditFields(contexto, usuarioId) }
  const actualizada = { ...orden, estado: 'Ordenada' as const, actualizadoEn: contexto.reloj(), actualizadoPorUsuarioId: usuarioId }
  const registro = auditoria(contexto, usuarioId, 'Emitir', 'Compras', 'OrdenCompra', orden.id, 'Orden emitida y compra creada en el mismo acto.', 'Borrador', 'Ordenada')
  return ok({ ...estado, ordenesCompra: estado.ordenesCompra.map((item) => item.id === orden.id ? actualizada : item), compras: [...estado.compras, compra], detallesCompra: [...estado.detallesCompra, ...detalles] }, registro)
}

interface RecepcionInput {
  compraId: ID
  almacenId: ID
  items: Array<{ productoId: ID; cantidadRecibida: number; costoUnitario: number }>
  usuarioId: ID
}

function recibido(estado: ERPState, compraId: ID, productoId: ID): number {
  return estado.recepciones.filter((recepcion) => recepcion.compraId === compraId).flatMap((recepcion) => recepcion.itemIds).map((id) => estado.itemsRecepcion.find((item) => item.id === id)).filter((item): item is NonNullable<typeof item> => Boolean(item && item.productoId === productoId)).reduce((total, item) => total + item.cantidadRecibida, 0)
}

export function recibirCompra(estado: ERPState, input: RecepcionInput, contexto: ActionContext): ActionResult {
  const permisoError = permiso(estado, input.usuarioId, 'Recepción', 'crear')
  if (permisoError) return error(permisoError)
  const compra = estado.compras.find((item) => item.id === input.compraId)
  if (!compra) return error('La compra indicada no existe.')
  if (compra.estado === 'Anulada' || compra.estado === 'Facturada') return error('La compra no admite nuevas recepciones en su estado actual.')
  if (compra.almacenId !== input.almacenId) return error('El almacén de recepción no coincide con el almacén de la compra.')
  if (input.items.length === 0) return error('La recepción debe tener al menos una línea.')
  for (const item of input.items) {
    const detalle = estado.detallesCompra.find((actual) => actual.compraId === compra.id && actual.productoId === item.productoId)
    if (!detalle) return error(`El producto ${item.productoId} no pertenece a la compra.`)
    const cantidadError = positivo(item.cantidadRecibida, `La cantidad recibida del producto ${item.productoId}`)
    if (cantidadError) return error(cantidadError)
    if (recibido(estado, compra.id, item.productoId) + item.cantidadRecibida > detalle.cantidad) return error(`La recepción del producto ${item.productoId} supera la cantidad ordenada.`)
    if (item.costoUnitario < 0 || !Number.isFinite(item.costoUnitario)) return error(`El costo del producto ${item.productoId} no es válido.`)
  }
  const recepcionId = contexto.idGenerador('recep')
  const itemIds = input.items.map(() => contexto.idGenerador('item-recep'))
  const items = input.items.map((item, index) => ({ id: itemIds[index], recepcionId, ...item }))
  const recepcion = { id: recepcionId, numero: numeroOperacion('R', recepcionId), compraId: compra.id, almacenId: input.almacenId, recibidoPorUsuarioId: input.usuarioId, fecha: fechaSolo(contexto), itemIds, ...auditFields(contexto, input.usuarioId) }
  const movimientos = items.map((item) => ({ id: contexto.idGenerador('mov'), tipo: 'Entrada por compra' as const, productoId: item.productoId, almacenId: input.almacenId, cantidad: item.cantidadRecibida, costoUnitario: item.costoUnitario, fecha: contexto.reloj(), referenciaTipo: 'Recepción' as const, referenciaId: recepcionId, ...auditFields(contexto, input.usuarioId) }))
  const registro = auditoria(contexto, input.usuarioId, 'Recibir', 'Compras', 'Recepción', recepcionId, 'Recepción registrada y entradas agregadas al kardex.')
  return ok({ ...estado, recepciones: [...estado.recepciones, recepcion], itemsRecepcion: [...estado.itemsRecepcion, ...items], movimientosInventario: [...estado.movimientosInventario, ...movimientos] }, registro)
}

interface FacturarCompraInput {
  compraId: ID
  tipoComprobante: 'Factura' | 'Boleta'
  serie?: string
  fecha?: string
  usuarioId: ID
}

function sumarRecibido(estado: ERPState, compraId: ID): number {
  return estado.recepciones.filter((recepcion) => recepcion.compraId === compraId).flatMap((recepcion) => recepcion.itemIds).map((id) => estado.itemsRecepcion.find((item) => item.id === id)?.cantidadRecibida ?? 0).reduce((total, cantidad) => total + cantidad, 0)
}

export function facturarCompra(estado: ERPState, input: FacturarCompraInput, contexto: ActionContext): ActionResult {
  const permisoError = permiso(estado, input.usuarioId, 'Facturación', 'crear')
  if (permisoError) return error(permisoError)
  const compra = estado.compras.find((item) => item.id === input.compraId)
  if (!compra) return error('La compra indicada no existe.')
  if (compra.estado !== 'Ordenada') return error('La compra debe estar Ordenada para facturarse.')
  if (sumarRecibido(estado, compra.id) === 0) return error('No se puede facturar una compra que aún no tiene recepción.')
  const proveedor = estado.proveedores.find((item) => item.id === compra.proveedorId)
  if (!proveedor) return error('El proveedor de la compra no existe.')
  const serie = nextSerie(estado, input.tipoComprobante, input.serie)
  if (typeof serie === 'string') return error(serie)
  const fecha = input.fecha ?? fechaSolo(contexto)
  const comprobanteId = contexto.idGenerador('comp')
  const comprobante = { id: comprobanteId, tipo: input.tipoComprobante, serie: serie.serie, numero: serie.numero, fechaEmision: fecha, moneda: 'PEN' as const, estado: 'Emitido' as const, compraId: compra.id, proveedorId: compra.proveedorId, ...auditFields(contexto, input.usuarioId) }
  const cuenta = { id: contexto.idGenerador('cxp'), proveedorId: compra.proveedorId, compraId: compra.id, comprobanteId, fechaEmision: fecha, fechaVencimiento: fecha, moneda: 'PEN' as const, ...auditFields(contexto, input.usuarioId) }
  const actualizada = { ...compra, estado: 'Facturada' as const, actualizadoEn: contexto.reloj(), actualizadoPorUsuarioId: input.usuarioId }
  const registro = auditoria(contexto, input.usuarioId, 'Facturar', 'Compras', 'Comprobante', comprobanteId, `Compra facturada por S/ ${selectTotalCompra(estado, compra.id)}.`, 'Ordenada', 'Facturada')
  return ok({ ...estado, configuracion: serie.configuracion, compras: estado.compras.map((item) => item.id === compra.id ? actualizada : item), comprobantes: [...estado.comprobantes, comprobante], cuentasPagar: [...estado.cuentasPagar, cuenta] }, registro)
}

interface PagoProveedorInput {
  cuentaPagarId: ID
  monto: number
  metodoPago: MetodoPago
  cuentaBancariaId?: ID
  usuarioId: ID
}

export function registrarPagoProveedor(estado: ERPState, input: PagoProveedorInput, contexto: ActionContext): ActionResult {
  const permisoError = permiso(estado, input.usuarioId, 'Cuentas por pagar', 'crear')
  if (permisoError) return error(permisoError)
  const cuenta = estado.cuentasPagar.find((item) => item.id === input.cuentaPagarId)
  if (!cuenta) return error('La cuenta por pagar indicada no existe.')
  const estadoCuenta = selectEstadoCuenta(estado, cuenta.id, fechaSolo(contexto))
  if (estadoCuenta === 'Anulada' || estadoCuenta === 'Pagada') return error('La cuenta por pagar está anulada o ya fue pagada.')
  const monto = redondearDosDecimales(input.monto)
  const montoError = positivo(monto, 'El monto del pago')
  if (montoError) return error(montoError)
  if (monto > selectSaldoCuenta(estado, cuenta.id)) return error('El pago no puede superar el saldo pendiente de la cuenta.')
  if (input.metodoPago !== 'Efectivo' && !input.cuentaBancariaId) return error('El método de pago requiere una cuenta bancaria.')
  if (input.cuentaBancariaId && !estado.cuentasBancarias.some((banco) => banco.id === input.cuentaBancariaId && banco.estado === 'Activo')) return error('La cuenta bancaria indicada no existe o está inactiva.')
  const movimientoId = contexto.idGenerador('mc')
  const movimiento = { id: movimientoId, tipo: 'Egreso' as const, fecha: contexto.reloj(), moneda: 'PEN' as const, monto, metodoPago: input.metodoPago, cuentaBancariaId: input.cuentaBancariaId, referenciaTipo: 'Pago' as const, referenciaId: cuenta.id, ...auditFields(contexto, input.usuarioId) }
  const pago = { id: contexto.idGenerador('pago'), tipo: 'Pago proveedor' as const, fecha: fechaSolo(contexto), moneda: 'PEN' as const, monto, metodoPago: input.metodoPago, movimientoCajaId: movimientoId, cuentaBancariaId: input.cuentaBancariaId, usuarioId: input.usuarioId, cuentaPagarId: cuenta.id, ...auditFields(contexto, input.usuarioId) }
  const registro = auditoria(contexto, input.usuarioId, 'Registrar pago', 'Finanzas', 'CuentaPagar', cuenta.id, `Pago registrado por S/ ${monto}.`)
  return ok({ ...estado, movimientosCaja: [...estado.movimientosCaja, movimiento], pagos: [...estado.pagos, pago] }, registro)
}

export function anularCompra(estado: ERPState, compraId: ID, motivo: string, usuarioId: ID, contexto: ActionContext): ActionResult {
  const permisoError = permiso(estado, usuarioId, 'Órdenes de compra', 'anular')
  if (permisoError) return error(permisoError)
  if (!motivo.trim()) return error('El motivo de anulación es obligatorio.')
  const compra = estado.compras.find((item) => item.id === compraId)
  if (!compra) return error('La compra indicada no existe.')
  if (compra.estado === 'Anulada') return error('La compra ya está anulada.')
  const actualizada = { ...compra, estado: 'Anulada' as const, actualizadoEn: contexto.reloj(), actualizadoPorUsuarioId: usuarioId }
  const cuenta = estado.cuentasPagar.find((item) => item.compraId === compra.id)
  const cuentasPagar = cuenta ? estado.cuentasPagar.map((item) => item.id === cuenta.id ? { ...item, anuladaEn: contexto.reloj(), actualizadoEn: contexto.reloj(), actualizadoPorUsuarioId: usuarioId } : item) : estado.cuentasPagar
  const registro = auditoria(contexto, usuarioId, 'Anular', 'Compras', 'Compra', compra.id, motivo, compra.estado, 'Anulada')
  return ok({ ...estado, compras: estado.compras.map((item) => item.id === compra.id ? actualizada : item), cuentasPagar }, registro)
}
