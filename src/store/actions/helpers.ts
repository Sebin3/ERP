import type {
  AccionPermiso,
  CamposAuditoria,
  Comprobante,
  Configuracion,
  EstadoRegistro,
  EstadoVentaPersistido,
  ID,
  ModuloSistema,
  RegistroAuditoria,
  RecursoSistema,
  TipoComprobante,
  TipoEntidadAuditable,
} from '../../types'
import type { ActionContext, ActionResult, ActionSuccess, ERPState } from '../state'
import { exigirPermiso } from '../permissions'

export function auditFields(contexto: ActionContext, usuarioId: ID): CamposAuditoria {
  const fecha = contexto.reloj()
  return { creadoEn: fecha, creadoPorUsuarioId: usuarioId, actualizadoEn: fecha, actualizadoPorUsuarioId: usuarioId }
}

export function permiso(estado: ERPState, usuarioId: ID, recurso: RecursoSistema, accion: AccionPermiso): string | undefined {
  return exigirPermiso(estado, usuarioId, recurso, accion)
}

export function auditoria(contexto: ActionContext, usuarioId: ID, accion: RegistroAuditoria['accion'], modulo: ModuloSistema, entidadTipo: TipoEntidadAuditable, entidadId: ID, descripcion: string, estadoAnterior?: string, estadoPosterior?: string): RegistroAuditoria {
  return {
    id: contexto.idGenerador('aud'), fecha: contexto.reloj(), usuarioId, accion, modulo, entidadTipo, entidadId,
    descripcion, estadoAnterior, estadoPosterior,
  }
}

export function ok<T>(estado: ERPState, registro: RegistroAuditoria, resultado?: T): ActionSuccess<T> {
  return { ok: true, estado: { ...estado, auditoria: [...estado.auditoria, registro] }, auditoria: [registro], ...(resultado === undefined ? {} : { resultado }) }
}

export function error(mensaje: string): ActionResult<never> {
  return { ok: false, error: mensaje }
}

export function fechaSolo(contexto: ActionContext): string {
  return contexto.reloj().slice(0, 10)
}

export function numeroOperacion(prefijo: string, id: ID): string {
  const correlativo = id.match(/(\d{6})$/)?.[1] ?? id
  return `${prefijo}-${correlativo}`
}

export function positivo(valor: number, campo: string): string | undefined {
  return valor > 0 && Number.isFinite(valor) ? undefined : `${campo} debe ser mayor que cero.`
}

export function activo(estado: EstadoRegistro, entidad: string): string | undefined {
  return estado === 'Activo' ? undefined : `${entidad} está inactivo.`
}

export function nextSerie(estado: ERPState, tipo: TipoComprobante, serieSolicitada?: string): { configuracion: Configuracion; serie: string; numero: string } | string {
  const actual = estado.configuracion.series[tipo]
  if (!actual) return `No existe una serie configurada para ${tipo}.`
  if (serieSolicitada && serieSolicitada !== actual.serie) return `La serie ${serieSolicitada} no coincide con la serie configurada ${actual.serie} para ${tipo}.`
  const correlativo = actual.correlativo + 1
  return {
    configuracion: { ...estado.configuracion, series: { ...estado.configuracion.series, [tipo]: { ...actual, correlativo } } },
    serie: actual.serie,
    numero: String(correlativo).padStart(5, '0'),
  }
}

export function comprobanteVenta(estado: ERPState, ventaId: ID): Comprobante | undefined {
  return estado.comprobantes.find((comprobante) => 'ventaId' in comprobante && comprobante.ventaId === ventaId && comprobante.tipo !== 'Nota de crédito')
}

export function estadoVentaPersistido(estado: ERPState, ventaId: ID): EstadoVentaPersistido | undefined {
  return estado.ventas.find((venta) => venta.id === ventaId)?.estado
}
