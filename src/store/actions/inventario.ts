import type { ID } from '../../types'
import type { ActionContext, ActionResult, ERPState } from '../state'
import { selectCostoPromedio, selectEstadoTransferencia, selectStock, selectStockDisponible } from '../selectors'
import { activo, auditFields, auditoria, error, fechaSolo, numeroOperacion, ok, permiso, positivo } from './helpers'

interface SaldoInicialInput {
  productoId: ID
  almacenId: ID
  cantidad: number
  costoUnitario: number
  usuarioId: ID
  fecha?: string
}

export function registrarSaldoInicial(estado: ERPState, input: SaldoInicialInput, contexto: ActionContext): ActionResult {
  const permisoError = permiso(estado, input.usuarioId, 'Ajustes de inventario', 'crear')
  if (permisoError) return error(permisoError)
  const producto = estado.productos.find((item) => item.id === input.productoId)
  if (!producto) return error('El producto indicado no existe.')
  const productoActivo = activo(producto.estado, 'El producto')
  if (productoActivo) return error(productoActivo)
  if (!estado.almacenes.some((item) => item.id === input.almacenId && item.estado === 'Activo')) return error('El almacén indicado no existe o está inactivo.')
  const cantidadError = positivo(input.cantidad, 'La cantidad del saldo inicial')
  if (cantidadError) return error(cantidadError)
  const costoError = positivo(input.costoUnitario, 'El costo unitario')
  if (costoError) return error(costoError)
  const id = contexto.idGenerador('mov')
  const movimiento = { id, tipo: 'Saldo inicial' as const, productoId: input.productoId, almacenId: input.almacenId, cantidad: input.cantidad, costoUnitario: input.costoUnitario, fecha: input.fecha ?? contexto.reloj(), referenciaTipo: 'Saldo inicial' as const, referenciaId: id, ...auditFields(contexto, input.usuarioId) }
  const registro = auditoria(contexto, input.usuarioId, 'Crear', 'Inventario', 'MovimientoInventario', id, 'Saldo inicial registrado en el kardex.')
  return ok({ ...estado, movimientosInventario: [...estado.movimientosInventario, movimiento] }, registro)
}

interface TransferItemInput {
  productoId: ID
  cantidad: number
  costoUnitario?: number
}

interface TransferInput {
  transferenciaId?: ID
  almacenOrigenId: ID
  almacenDestinoId: ID
  items: TransferItemInput[]
  usuarioId: ID
  solicitanteUsuarioId?: ID
}

export function crearTransferencia(estado: ERPState, input: TransferInput, contexto: ActionContext): ActionResult {
  const permisoError = permiso(estado, input.usuarioId, 'Transferencias', 'crear')
  if (permisoError) return error(permisoError)
  if (input.almacenOrigenId === input.almacenDestinoId) return error('El almacén de origen y destino deben ser diferentes.')
  if (!estado.almacenes.some((item) => item.id === input.almacenOrigenId && item.estado === 'Activo')) return error('El almacén de origen no existe o está inactivo.')
  if (!estado.almacenes.some((item) => item.id === input.almacenDestinoId && item.estado === 'Activo')) return error('El almacén de destino no existe o está inactivo.')
  if (input.items.length === 0) return error('La transferencia debe tener al menos una línea.')
  const vistos = new Set<ID>()
  for (const item of input.items) {
    if (vistos.has(item.productoId)) return error(`El producto ${item.productoId} está repetido en la transferencia.`)
    vistos.add(item.productoId)
    const cantidadError = positivo(item.cantidad, `La cantidad del producto ${item.productoId}`)
    if (cantidadError) return error(cantidadError)
    if (!estado.productos.some((producto) => producto.id === item.productoId && producto.estado === 'Activo')) return error(`El producto ${item.productoId} no existe o está inactivo.`)
  }
  const id = input.transferenciaId ?? contexto.idGenerador('trans')
  if (estado.transferencias.some((item) => item.id === id)) return error('La transferencia indicada ya existe.')
  const itemIds = input.items.map(() => contexto.idGenerador('item-trans'))
  const transferencia = { id, numero: numeroOperacion('TR', id), almacenOrigenId: input.almacenOrigenId, almacenDestinoId: input.almacenDestinoId, solicitanteUsuarioId: input.solicitanteUsuarioId ?? input.usuarioId, fecha: fechaSolo(contexto), estado: 'Borrador' as const, itemIds, ...auditFields(contexto, input.usuarioId) }
  const items = input.items.map((item, index) => ({ id: itemIds[index], transferenciaId: id, productoId: item.productoId, cantidad: item.cantidad, costoUnitario: item.costoUnitario ?? 0 }))
  const registro = auditoria(contexto, input.usuarioId, 'Crear', 'Inventario', 'Transferencia', id, 'Transferencia creada en estado Borrador.')
  return ok({ ...estado, transferencias: [...estado.transferencias, transferencia], itemsTransferencia: [...estado.itemsTransferencia, ...items] }, registro)
}

export function solicitarTransferencia(estado: ERPState, transferenciaId: ID, usuarioId: ID, contexto: ActionContext): ActionResult {
  const permisoError = permiso(estado, usuarioId, 'Transferencias', 'editar')
  if (permisoError) return error(permisoError)
  const transferencia = estado.transferencias.find((item) => item.id === transferenciaId)
  if (!transferencia) return error('La transferencia indicada no existe.')
  if (transferencia.estado !== 'Borrador') return error('La transferencia debe estar en Borrador.')
  const actualizada = { ...transferencia, estado: 'Solicitada' as const, actualizadoEn: contexto.reloj(), actualizadoPorUsuarioId: usuarioId }
  const registro = auditoria(contexto, usuarioId, 'Emitir', 'Inventario', 'Transferencia', transferenciaId, 'Transferencia solicitada.', 'Borrador', 'Solicitada')
  return ok({ ...estado, transferencias: estado.transferencias.map((item) => item.id === transferenciaId ? actualizada : item) }, registro)
}

function validarEjecucionTransferencia(estado: ERPState, input: TransferInput): string | undefined {
  if (input.almacenOrigenId === input.almacenDestinoId) return 'El almacén de origen y destino deben ser diferentes.'
  if (!estado.almacenes.some((item) => item.id === input.almacenOrigenId && item.estado === 'Activo')) return 'El almacén de origen no existe o está inactivo.'
  if (!estado.almacenes.some((item) => item.id === input.almacenDestinoId && item.estado === 'Activo')) return 'El almacén de destino no existe o está inactivo.'
  if (input.items.length === 0) return 'La transferencia debe tener al menos una línea.'
  const vistos = new Set<ID>()
  for (const item of input.items) {
    if (vistos.has(item.productoId)) return `El producto ${item.productoId} está repetido en la transferencia.`
    vistos.add(item.productoId)
    const cantidadError = positivo(item.cantidad, `La cantidad del producto ${item.productoId}`)
    if (cantidadError) return cantidadError
    const producto = estado.productos.find((actual) => actual.id === item.productoId)
    if (!producto) return `El producto ${item.productoId} no existe.`
    const productoActivo = activo(producto.estado, `El producto ${producto.nombre}`)
    if (productoActivo) return productoActivo
    if (selectStockDisponible(estado, item.productoId, input.almacenOrigenId) < item.cantidad) return `No hay stock disponible suficiente para transferir el producto ${item.productoId}.`
  }
  return undefined
}

export function ejecutarTransferencia(estado: ERPState, input: TransferInput, contexto: ActionContext): ActionResult {
  const permisoError = permiso(estado, input.usuarioId, 'Transferencias', 'aprobar')
  if (permisoError) return error(permisoError)
  if (!input.transferenciaId) return error('La ejecución requiere una transferencia Solicitada.')
  const transferencia = estado.transferencias.find((item) => item.id === input.transferenciaId)
  if (!transferencia) return error('La transferencia indicada no existe.')
  const estadoDerivado = selectEstadoTransferencia(estado, transferencia.id)
  if (estadoDerivado !== 'Solicitada') return error(`La transferencia ${transferencia.numero} no puede ejecutarse porque está ${estadoDerivado}. Solo se puede ejecutar una transferencia Solicitada.`)
  const validacion = validarEjecucionTransferencia(estado, input)
  if (validacion) return error(validacion)
  if (transferencia.almacenOrigenId !== input.almacenOrigenId || transferencia.almacenDestinoId !== input.almacenDestinoId) return error('Los almacenes no coinciden con la transferencia solicitada.')
  const itemIds = transferencia.itemIds
  if (input.items.length !== itemIds.length) return error('Los ítems no coinciden con la transferencia solicitada.')
  const items = input.items.map((item, index) => ({ id: itemIds[index], transferenciaId: transferencia.id, productoId: item.productoId, cantidad: item.cantidad, costoUnitario: item.costoUnitario ?? selectCostoPromedio(estado, item.productoId, input.almacenOrigenId) }))
  const transferenciaId = transferencia.id
  const movimientos = items.flatMap((item) => {
    const base = { productoId: item.productoId, cantidad: item.cantidad, costoUnitario: item.costoUnitario, transferenciaId, referenciaTipo: 'Transferencia' as const, referenciaId: transferenciaId, fecha: contexto.reloj(), ...auditFields(contexto, input.usuarioId) }
    return [
      { ...base, id: contexto.idGenerador('mov'), tipo: 'Transferencia salida' as const, almacenId: input.almacenOrigenId },
      { ...base, id: contexto.idGenerador('mov'), tipo: 'Transferencia entrada' as const, almacenId: input.almacenDestinoId },
    ]
  })
  const registro = auditoria(contexto, input.usuarioId, 'Transferir', 'Inventario', 'Transferencia', transferenciaId, 'Transferencia ejecutada con salida y entrada emparejadas.')
  return ok({ ...estado, movimientosInventario: [...estado.movimientosInventario, ...movimientos] }, registro)
}

/** Compatibilidad con la acción atómica de 2A: usa el único flujo oficial internamente. */
export function transferirStock(estado: ERPState, input: TransferInput, contexto: ActionContext): ActionResult {
  if (input.transferenciaId) return ejecutarTransferencia(estado, input, contexto)
  const creada = crearTransferencia(estado, input, contexto)
  if (!creada.ok) return creada
  const transferencia = creada.estado.transferencias.at(-1)
  if (!transferencia) return error('No se pudo crear la transferencia.')
  const solicitada = solicitarTransferencia(creada.estado, transferencia.id, input.usuarioId, contexto)
  if (!solicitada.ok) return solicitada
  return ejecutarTransferencia(solicitada.estado, { ...input, transferenciaId: transferencia.id }, contexto)
}

export function anularTransferencia(estado: ERPState, transferenciaId: ID, motivo: string, usuarioId: ID, contexto: ActionContext): ActionResult {
  const permisoError = permiso(estado, usuarioId, 'Transferencias', 'anular')
  if (permisoError) return error(permisoError)
  if (!motivo.trim()) return error('El motivo de anulación es obligatorio.')
  const transferencia = estado.transferencias.find((item) => item.id === transferenciaId)
  if (!transferencia) return error('La transferencia indicada no existe.')
  const estadoDerivado = selectEstadoTransferencia(estado, transferenciaId)
  if (estadoDerivado === 'Completada') return error('No se puede anular una transferencia Completada porque ya tiene movimientos de inventario.')
  if (transferencia.estado === 'Anulada') return error('La transferencia ya está anulada.')
  const actualizada = { ...transferencia, estado: 'Anulada' as const, actualizadoEn: contexto.reloj(), actualizadoPorUsuarioId: usuarioId }
  const registro = auditoria(contexto, usuarioId, 'Anular', 'Inventario', 'Transferencia', transferenciaId, motivo, transferencia.estado, 'Anulada')
  return ok({ ...estado, transferencias: estado.transferencias.map((item) => item.id === transferenciaId ? actualizada : item) }, registro)
}

interface SolicitudAjusteInput {
  productoId: ID
  almacenId: ID
  cantidadEsperada: number
  motivo: string
  usuarioId: ID
}

export function solicitarAjuste(estado: ERPState, input: SolicitudAjusteInput, contexto: ActionContext): ActionResult {
  const permisoError = permiso(estado, input.usuarioId, 'Ajustes de inventario', 'crear')
  if (permisoError) return error(permisoError)
  const producto = estado.productos.find((item) => item.id === input.productoId)
  if (!producto) return error('El producto indicado no existe.')
  const productoActivo = activo(producto.estado, 'El producto')
  if (productoActivo) return error(productoActivo)
  if (!estado.almacenes.some((item) => item.id === input.almacenId && item.estado === 'Activo')) return error('El almacén indicado no existe o está inactivo.')
  if (input.cantidadEsperada < 0 || !Number.isFinite(input.cantidadEsperada)) return error('La cantidad esperada no puede ser negativa.')
  if (!input.motivo.trim()) return error('El motivo del ajuste es obligatorio.')
  if (selectStock(estado, input.productoId, input.almacenId) === input.cantidadEsperada) return error('La cantidad esperada no genera ninguna diferencia.')
  const id = contexto.idGenerador('ajuste')
  const solicitud = { id, productoId: input.productoId, almacenId: input.almacenId, cantidadEsperada: input.cantidadEsperada, motivo: input.motivo.trim(), solicitadoPorUsuarioId: input.usuarioId, estado: 'Pendiente' as const, ...auditFields(contexto, input.usuarioId) }
  const registro = auditoria(contexto, input.usuarioId, 'Crear', 'Inventario', 'SolicitudAjusteInventario', id, 'Solicitud de ajuste creada en estado Pendiente.')
  return ok({ ...estado, solicitudesAjuste: [...estado.solicitudesAjuste, solicitud] }, registro)
}

export function aprobarAjuste(estado: ERPState, solicitudId: ID, usuarioId: ID, contexto: ActionContext): ActionResult {
  const permisoError = permiso(estado, usuarioId, 'Ajustes de inventario', 'aprobar')
  if (permisoError) return error(permisoError)
  const solicitud = estado.solicitudesAjuste.find((item) => item.id === solicitudId)
  if (!solicitud) return error('La solicitud de ajuste indicada no existe.')
  if (solicitud.estado !== 'Pendiente') return error('La solicitud de ajuste ya fue procesada.')
  const actual = selectStock(estado, solicitud.productoId, solicitud.almacenId)
  const diferencia = solicitud.cantidadEsperada - actual
  if (diferencia === 0) return error('La solicitud ya no tiene diferencia que ajustar.')
  const movimientoId = contexto.idGenerador('mov')
  const movimiento = { id: movimientoId, tipo: diferencia > 0 ? 'Ajuste entrada' as const : 'Ajuste salida' as const, productoId: solicitud.productoId, almacenId: solicitud.almacenId, cantidad: Math.abs(diferencia), costoUnitario: selectCostoPromedio(estado, solicitud.productoId, solicitud.almacenId), fecha: contexto.reloj(), referenciaTipo: 'Ajuste' as const, referenciaId: solicitud.id, solicitudAjusteId: solicitud.id, motivo: solicitud.motivo, ...auditFields(contexto, usuarioId) }
  const actualizada = { ...solicitud, estado: 'Aprobada' as const, aprobadoPorUsuarioId: usuarioId, aprobadoEn: contexto.reloj(), actualizadoEn: contexto.reloj(), actualizadoPorUsuarioId: usuarioId }
  const registro = auditoria(contexto, usuarioId, 'Aprobar', 'Inventario', 'SolicitudAjusteInventario', solicitud.id, `Ajuste aprobado: ${diferencia > 0 ? 'entrada' : 'salida'}.`, 'Pendiente', 'Aprobada')
  return ok({ ...estado, solicitudesAjuste: estado.solicitudesAjuste.map((item) => item.id === solicitud.id ? actualizada : item), movimientosInventario: [...estado.movimientosInventario, movimiento] }, registro)
}

export function rechazarAjuste(estado: ERPState, solicitudId: ID, motivo: string, usuarioId: ID, contexto: ActionContext): ActionResult {
  const permisoError = permiso(estado, usuarioId, 'Ajustes de inventario', 'aprobar')
  if (permisoError) return error(permisoError)
  if (!motivo.trim()) return error('El motivo de rechazo es obligatorio.')
  const solicitud = estado.solicitudesAjuste.find((item) => item.id === solicitudId)
  if (!solicitud) return error('La solicitud de ajuste indicada no existe.')
  if (solicitud.estado !== 'Pendiente') return error('La solicitud de ajuste ya fue procesada.')
  const actualizada = { ...solicitud, estado: 'Rechazada' as const, motivo: `${solicitud.motivo} · Rechazo: ${motivo.trim()}`, actualizadoEn: contexto.reloj(), actualizadoPorUsuarioId: usuarioId }
  const registro = auditoria(contexto, usuarioId, 'Aprobar', 'Inventario', 'SolicitudAjusteInventario', solicitud.id, `Solicitud de ajuste rechazada: ${motivo.trim()}.`, 'Pendiente', 'Rechazada')
  return ok({ ...estado, solicitudesAjuste: estado.solicitudesAjuste.map((item) => item.id === solicitud.id ? actualizada : item) }, registro)
}

export function anularAjuste(estado: ERPState, solicitudId: ID, motivo: string, usuarioId: ID, contexto: ActionContext): ActionResult {
  const permisoError = permiso(estado, usuarioId, 'Ajustes de inventario', 'anular')
  if (permisoError) return error(permisoError)
  if (!motivo.trim()) return error('El motivo de anulación es obligatorio.')
  const solicitud = estado.solicitudesAjuste.find((item) => item.id === solicitudId)
  if (!solicitud) return error('La solicitud de ajuste indicada no existe.')
  if (solicitud.estado !== 'Pendiente') return error('Solo se puede anular una solicitud de ajuste Pendiente.')
  const actualizada = { ...solicitud, estado: 'Anulada' as const, motivo: `${solicitud.motivo} · Anulación: ${motivo.trim()}`, actualizadoEn: contexto.reloj(), actualizadoPorUsuarioId: usuarioId }
  const registro = auditoria(contexto, usuarioId, 'Anular', 'Inventario', 'SolicitudAjusteInventario', solicitud.id, `Solicitud de ajuste anulada: ${motivo.trim()}.`, 'Pendiente', 'Anulada')
  return ok({ ...estado, solicitudesAjuste: estado.solicitudesAjuste.map((item) => item.id === solicitud.id ? actualizada : item) }, registro)
}

export const solicitarAjusteStock = solicitarAjuste
export const aprobarAjusteStock = aprobarAjuste
