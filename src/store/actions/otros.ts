import type { Almacen, Cliente, Cotizacion, EstadoCotizacion, ID, ItemCotizacion, Producto, Proveedor, TipoEntidadDocumento } from '../../types'
import type { ActionContext, ActionResult, ERPState } from '../state'
import { auditFields, auditoria, error, fechaSolo, numeroOperacion, ok, permiso } from './helpers'

interface CotizacionInput {
  clienteId: ID
  vendedorId: ID
  validezHasta: string
  items: Array<Omit<ItemCotizacion, 'id'>>
  observaciones?: string
  usuarioId: ID
}

function clienteValido(estado: ERPState, clienteId: ID): string | undefined {
  const cliente = estado.clientes.find((item) => item.id === clienteId)
  if (!cliente) return 'El cliente indicado no existe.'
  return cliente.estado === 'Activo' ? undefined : 'El cliente está inactivo.'
}

export function crearCotizacion(estado: ERPState, input: CotizacionInput, contexto: ActionContext): ActionResult {
  const permisoError = permiso(estado, input.usuarioId, 'Cotizaciones', 'crear')
  if (permisoError) return error(permisoError)
  const clienteError = clienteValido(estado, input.clienteId)
  if (clienteError) return error(clienteError)
  if (input.items.length === 0) return error('La cotización debe tener al menos una línea.')
  for (const item of input.items) {
    if (!estado.productos.some((producto) => producto.id === item.productoId && producto.estado === 'Activo')) return error(`El producto ${item.productoId} no existe o está inactivo.`)
    if (item.cantidad <= 0 || item.precioUnitario < 0 || item.descuento < 0) return error(`La línea del producto ${item.productoId} tiene valores inválidos.`)
  }
  const id = contexto.idGenerador('cot')
  const items = input.items.map((item) => ({ ...item, id: contexto.idGenerador('item-cot') }))
  const cotizacion: Cotizacion = { id, numero: numeroOperacion('C', id), clienteId: input.clienteId, vendedorId: input.vendedorId, fecha: fechaSolo(contexto), validezHasta: input.validezHasta, moneda: 'PEN', estado: 'Borrador', items, observaciones: input.observaciones, ...auditFields(contexto, input.usuarioId) }
  const registro = auditoria(contexto, input.usuarioId, 'Crear', 'Comercial', 'Cotización', id, 'Cotización creada en estado Borrador.')
  return ok({ ...estado, cotizaciones: [...estado.cotizaciones, cotizacion] }, registro)
}

export function actualizarCotizacion(estado: ERPState, cotizacionId: ID, cambios: Partial<Pick<Cotizacion, 'validezHasta' | 'items' | 'observaciones'>>, usuarioId: ID, contexto: ActionContext): ActionResult {
  const permisoError = permiso(estado, usuarioId, 'Cotizaciones', 'editar')
  if (permisoError) return error(permisoError)
  const cotizacion = estado.cotizaciones.find((item) => item.id === cotizacionId)
  if (!cotizacion) return error('La cotización indicada no existe.')
  if (cotizacion.estado !== 'Borrador') return error('Solo se puede editar una cotización en Borrador.')
  if (cambios.items && cambios.items.length === 0) return error('La cotización debe conservar al menos una línea.')
  const actualizada = { ...cotizacion, ...cambios, actualizadoEn: contexto.reloj(), actualizadoPorUsuarioId: usuarioId }
  const registro = auditoria(contexto, usuarioId, 'Editar', 'Comercial', 'Cotización', cotizacionId, 'Cotización actualizada.', 'Borrador', 'Borrador')
  return ok({ ...estado, cotizaciones: estado.cotizaciones.map((item) => item.id === cotizacionId ? actualizada : item) }, registro)
}

function cambiarEstadoCotizacion(estado: ERPState, cotizacionId: ID, usuarioId: ID, contexto: ActionContext, desde: EstadoCotizacion, hasta: EstadoCotizacion): ActionResult {
  const permisoError = permiso(estado, usuarioId, 'Cotizaciones', hasta === 'Aceptada' ? 'aprobar' : 'editar')
  if (permisoError) return error(permisoError)
  const cotizacion = estado.cotizaciones.find((item) => item.id === cotizacionId)
  if (!cotizacion) return error('La cotización indicada no existe.')
  if (cotizacion.estado !== desde) return error(`La cotización debe estar en ${desde}.`)
  const actualizada = { ...cotizacion, estado: hasta, actualizadoEn: contexto.reloj(), actualizadoPorUsuarioId: usuarioId }
  const registro = auditoria(contexto, usuarioId, hasta === 'Aceptada' ? 'Aprobar' : 'Emitir', 'Comercial', 'Cotización', cotizacionId, `Cotización: ${desde} → ${hasta}.`, desde, hasta)
  return ok({ ...estado, cotizaciones: estado.cotizaciones.map((item) => item.id === cotizacionId ? actualizada : item) }, registro)
}

export function enviarCotizacion(estado: ERPState, cotizacionId: ID, usuarioId: ID, contexto: ActionContext): ActionResult {
  return cambiarEstadoCotizacion(estado, cotizacionId, usuarioId, contexto, 'Borrador', 'Enviada')
}

export function aceptarCotizacion(estado: ERPState, cotizacionId: ID, usuarioId: ID, contexto: ActionContext): ActionResult {
  return cambiarEstadoCotizacion(estado, cotizacionId, usuarioId, contexto, 'Enviada', 'Aceptada')
}

type ClienteChanges = Partial<Pick<Cliente, 'tipoDocumento' | 'numeroDocumento' | 'razonSocial' | 'nombreComercial' | 'direccion' | 'distrito' | 'provincia' | 'departamento' | 'telefono' | 'email' | 'limiteCredito' | 'diasCredito' | 'estado'>>
type ProveedorChanges = Partial<Pick<Proveedor, 'tipoDocumento' | 'numeroDocumento' | 'razonSocial' | 'nombreComercial' | 'direccion' | 'distrito' | 'provincia' | 'departamento' | 'contactoNombre' | 'telefono' | 'email' | 'diasCredito' | 'estado'>>
type ProductoChanges = Partial<Pick<Producto, 'sku' | 'codigoBarras' | 'nombre' | 'descripcion' | 'categoriaId' | 'unidadMedida' | 'precioVenta' | 'costoReferencial' | 'tasaImpuesto' | 'stockMinimo' | 'estado'>>
type AlmacenChanges = Partial<Pick<Almacen, 'codigo' | 'nombre' | 'direccion' | 'responsableUsuarioId' | 'estado'>>

function editarMaestro<T extends { id: ID; actualizadoEn: string; actualizadoPorUsuarioId: ID }, C extends object>(estado: ERPState, collection: T[], id: ID, cambios: C, usuarioId: ID, contexto: ActionContext, recurso: 'Clientes' | 'Proveedores' | 'Productos' | 'Almacenes', entidadTipo: 'Cliente' | 'Proveedor' | 'Producto' | 'Almacén'): ActionResult {
  const permisoError = permiso(estado, usuarioId, recurso, 'editar')
  if (permisoError) return error(permisoError)
  if (!collection.some((item) => item.id === id)) return error(`La entidad ${id} no existe.`)
  const actualizados = collection.map((item) => item.id === id ? { ...item, ...cambios, actualizadoEn: contexto.reloj(), actualizadoPorUsuarioId: usuarioId } : item)
  const registro = auditoria(contexto, usuarioId, 'Editar', 'Administración', entidadTipo, id, `${entidadTipo} actualizado.`)
  const key = recurso === 'Clientes' ? 'clientes' : recurso === 'Proveedores' ? 'proveedores' : recurso === 'Productos' ? 'productos' : 'almacenes'
  return ok({ ...estado, [key]: actualizados }, registro)
}

export function editarCliente(estado: ERPState, id: ID, cambios: ClienteChanges, usuarioId: ID, contexto: ActionContext): ActionResult { return editarMaestro(estado, estado.clientes, id, cambios, usuarioId, contexto, 'Clientes', 'Cliente') }
export function editarProveedor(estado: ERPState, id: ID, cambios: ProveedorChanges, usuarioId: ID, contexto: ActionContext): ActionResult { return editarMaestro(estado, estado.proveedores, id, cambios, usuarioId, contexto, 'Proveedores', 'Proveedor') }
export function editarProducto(estado: ERPState, id: ID, cambios: ProductoChanges, usuarioId: ID, contexto: ActionContext): ActionResult { return editarMaestro(estado, estado.productos, id, cambios, usuarioId, contexto, 'Productos', 'Producto') }
export function editarAlmacen(estado: ERPState, id: ID, cambios: AlmacenChanges, usuarioId: ID, contexto: ActionContext): ActionResult { return editarMaestro(estado, estado.almacenes, id, cambios, usuarioId, contexto, 'Almacenes', 'Almacén') }

interface DocumentoInput {
  tipo: 'Cotización' | 'Orden de compra' | 'Comprobante de venta' | 'Comprobante de compra' | 'Guía de remisión' | 'Contrato' | 'Otro'
  nombreArchivo: string
  mimeType: string
  tamanoBytes: number
  entidadTipo: TipoEntidadDocumento
  entidadId: ID
  urlSimulada: string
  subidoPorUsuarioId: ID
  usuarioId: ID
}

export function subirDocumentoSimulado(estado: ERPState, input: DocumentoInput, contexto: ActionContext): ActionResult {
  const permisoError = permiso(estado, input.usuarioId, 'Documentos', 'crear')
  if (permisoError) return error(permisoError)
  if (!input.nombreArchivo.trim() || input.tamanoBytes < 0) return error('El documento debe tener nombre y tamaño válidos.')
  const entidadExiste = input.entidadTipo === 'Venta' ? estado.ventas.some((item) => item.id === input.entidadId)
    : input.entidadTipo === 'Compra' ? estado.compras.some((item) => item.id === input.entidadId)
      : input.entidadTipo === 'Cliente' ? estado.clientes.some((item) => item.id === input.entidadId)
        : input.entidadTipo === 'Proveedor' ? estado.proveedores.some((item) => item.id === input.entidadId)
          : input.entidadTipo === 'Cotización' ? estado.cotizaciones.some((item) => item.id === input.entidadId)
            : estado.ordenesCompra.some((item) => item.id === input.entidadId)
  if (!entidadExiste) return error(`La entidad ${input.entidadTipo} ${input.entidadId} no existe.`)
  if (!estado.usuarios.some((item) => item.id === input.subidoPorUsuarioId)) return error('El usuario que sube el documento no existe.')
  const id = contexto.idGenerador('doc')
  const documento = { id, tipo: input.tipo, nombreArchivo: input.nombreArchivo, mimeType: input.mimeType, tamanoBytes: input.tamanoBytes, entidadTipo: input.entidadTipo, entidadId: input.entidadId, urlSimulada: input.urlSimulada, subidoPorUsuarioId: input.subidoPorUsuarioId, ...auditFields(contexto, input.usuarioId) }
  const registro = auditoria(contexto, input.usuarioId, 'Subir', 'Documentos', 'Documento', id, `Documento ${input.nombreArchivo} subido.`)
  return ok({ ...estado, documentos: [...estado.documentos, documento] }, registro)
}

export function exportarReporte(estado: ERPState, tipo: string, usuarioId: ID, contexto: ActionContext): ActionResult<{ tipo: string }> {
  const permisoError = permiso(estado, usuarioId, 'Reportes', 'exportar')
  if (permisoError) return error(permisoError)
  const registro = auditoria(contexto, usuarioId, 'Exportar', 'Reportes', 'Documento', contexto.idGenerador('reporte'), `Reporte ${tipo} exportado.`)
  return ok(estado, registro, { tipo })
}

export function restablecerDatosEjemplo(estado: ERPState, semilla: ERPState, usuarioId: ID, contexto: ActionContext): ActionResult {
  const permisoError = permiso(estado, usuarioId, 'Configuración', 'editar')
  if (permisoError) return error(permisoError)
  const registro = auditoria(contexto, usuarioId, 'Editar', 'Configuración', 'Configuración', semilla.configuracion.id, 'Datos de ejemplo restablecidos.')
  return ok({ ...semilla }, registro)
}
