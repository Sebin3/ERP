import type {
  AccionPermiso,
  EstadoComprobante,
  EstadoCompraPersistido,
  EstadoCotizacion,
  EstadoOrdenCompraPersistido,
  EstadoSolicitudCompraPersistido,
  EstadoSolicitudAjuste,
  EstadoTransferenciaPersistido,
  EstadoVentaPersistido,
  ModuloSistema,
  RecursoSistema,
  RolSistema,
  TipoDocumento,
  TipoEntidadAuditable,
  TipoEntidadDocumento,
  TipoMovimientoCaja,
  TipoMovimientoInventario,
  TipoPago,
} from './enums'
import type {
  CamposAuditoria,
  CondicionPago,
  Decimal,
  EstadoRegistro,
  ID,
  ISODate,
  ISODateOnly,
  MetodoPago,
  Moneda,
  Money,
  TipoComprobante,
  TipoDocumentoIdentidad,
  TipoReferencia,
  UnidadMedida,
} from './common'

export interface Usuario extends CamposAuditoria {
  id: ID
  nombres: string
  apellidos: string
  nombreUsuario: string
  email: string
  rolId: ID
  estado: EstadoRegistro
  ultimoAccesoEn?: ISODate
}

export interface Rol extends CamposAuditoria {
  id: ID
  nombre: RolSistema
  descripcion: string
  permisoIds: ID[]
  estado: EstadoRegistro
}

export interface Permiso extends CamposAuditoria {
  id: ID
  recurso: RecursoSistema
  accion: AccionPermiso
  descripcion: string
}

export interface Cliente extends CamposAuditoria {
  id: ID
  tipoDocumento: TipoDocumentoIdentidad
  numeroDocumento: string
  razonSocial: string
  nombreComercial?: string
  direccion: string
  distrito: string
  provincia: string
  departamento: string
  telefono?: string
  email?: string
  limiteCredito: Money
  diasCredito: number
  estado: EstadoRegistro
}

export interface Proveedor extends CamposAuditoria {
  id: ID
  tipoDocumento: TipoDocumentoIdentidad
  numeroDocumento: string
  razonSocial: string
  nombreComercial?: string
  direccion: string
  distrito: string
  provincia: string
  departamento: string
  contactoNombre?: string
  telefono?: string
  email?: string
  diasCredito: number
  estado: EstadoRegistro
}

export interface Categoria extends CamposAuditoria {
  id: ID
  nombre: string
  descripcion?: string
  categoriaPadreId?: ID
  estado: EstadoRegistro
}

export interface Producto extends CamposAuditoria {
  id: ID
  sku: string
  codigoBarras?: string
  nombre: string
  descripcion?: string
  categoriaId: ID
  unidadMedida: UnidadMedida
  precioVenta: Money
  costoReferencial: Money
  tasaImpuesto: Decimal
  stockMinimo: Decimal
  estado: EstadoRegistro
}

/** Proyección derivada: no es una fuente editable ni un saldo persistido. */
export interface StockPorAlmacen {
  productoId: ID
  almacenId: ID
  cantidad: Decimal
  reservado: Decimal
  disponible: Decimal
  valorCosto: Money
  ultimaActualizacionEn?: ISODate
}

export interface MovimientoInventario extends CamposAuditoria {
  id: ID
  tipo: TipoMovimientoInventario
  productoId: ID
  almacenId: ID
  cantidad: Decimal
  costoUnitario: Money
  fecha: ISODate
  referenciaTipo: TipoReferencia
  referenciaId: ID
  transferenciaId?: ID
  solicitudAjusteId?: ID
  motivo?: string
}

/** Solicitud de ajuste; el movimiento solo existe después de la aprobación. */
export interface SolicitudAjusteInventario extends CamposAuditoria {
  id: ID
  productoId: ID
  almacenId: ID
  cantidadEsperada: Decimal
  motivo: string
  solicitadoPorUsuarioId: ID
  estado: EstadoSolicitudAjuste
  aprobadoPorUsuarioId?: ID
  aprobadoEn?: ISODate
}

export interface Almacen extends CamposAuditoria {
  id: ID
  codigo: string
  nombre: string
  direccion: string
  responsableUsuarioId?: ID
  estado: EstadoRegistro
}

export interface ItemCotizacion {
  id: ID
  productoId: ID
  descripcionProducto: string
  cantidad: Decimal
  precioUnitario: Money
  descuento: Money
  tasaImpuesto: Decimal
}

export interface Cotizacion extends CamposAuditoria {
  id: ID
  numero: string
  clienteId: ID
  vendedorId: ID
  fecha: ISODateOnly
  validezHasta: ISODateOnly
  moneda: Moneda
  estado: EstadoCotizacion
  items: ItemCotizacion[]
  observaciones?: string
}

export interface DetalleVenta {
  id: ID
  ventaId: ID
  productoId: ID
  descripcionProducto: string
  cantidad: Decimal
  precioUnitario: Money
  descuento: Money
  tasaImpuesto: Decimal
}

export interface Venta extends CamposAuditoria {
  id: ID
  numero: string
  clienteId: ID
  vendedorId: ID
  almacenId: ID
  cotizacionId?: ID
  fecha: ISODateOnly
  moneda: Moneda
  condicionPago: CondicionPago
  plazoCreditoDias: number
  estado: EstadoVentaPersistido
  detalleIds: ID[]
  observaciones?: string
}

export interface ComprobanteBase extends CamposAuditoria {
  id: ID
  tipo: TipoComprobante
  serie: string
  numero: string
  fechaEmision: ISODateOnly
  moneda: Moneda
  estado: EstadoComprobante
  comprobanteRelacionadoId?: ID
}

export interface ComprobanteVenta extends ComprobanteBase {
  tipo: Exclude<TipoComprobante, 'Nota de crédito'>
  ventaId: ID
  clienteId: ID
  proveedorId?: never
  compraId?: never
}

export interface NotaCreditoVenta extends ComprobanteBase {
  tipo: 'Nota de crédito'
  ventaId: ID
  clienteId: ID
  comprobanteRelacionadoId: ID
  motivo: string
  proveedorId?: never
  compraId?: never
}

export interface ComprobanteCompra extends ComprobanteBase {
  compraId: ID
  proveedorId: ID
  clienteId?: never
  ventaId?: never
}

export type Comprobante = ComprobanteVenta | NotaCreditoVenta | ComprobanteCompra

export interface ItemSolicitudCompra {
  id: ID
  productoId: ID
  cantidadSolicitada: Decimal
  observacion?: string
}

export interface SolicitudCompra extends CamposAuditoria {
  id: ID
  numero: string
  solicitanteUsuarioId: ID
  almacenDestinoId: ID
  fecha: ISODateOnly
  estado: EstadoSolicitudCompraPersistido
  items: ItemSolicitudCompra[]
  motivo?: string
}

export interface ItemOrdenCompra {
  id: ID
  productoId: ID
  cantidad: Decimal
  costoUnitario: Money
}

export interface OrdenCompra extends CamposAuditoria {
  id: ID
  numero: string
  solicitudCompraId?: ID
  proveedorId: ID
  compradorUsuarioId: ID
  almacenDestinoId: ID
  fecha: ISODateOnly
  fechaEntregaEsperada?: ISODateOnly
  estado: EstadoOrdenCompraPersistido
  items: ItemOrdenCompra[]
  observaciones?: string
}

export interface DetalleCompra {
  id: ID
  compraId: ID
  productoId: ID
  descripcionProducto: string
  cantidad: Decimal
  costoUnitario: Money
  tasaImpuesto: Decimal
}

export interface Compra extends CamposAuditoria {
  id: ID
  numero: string
  ordenCompraId: ID
  proveedorId: ID
  almacenId: ID
  fecha: ISODateOnly
  moneda: Moneda
  condicionPago: CondicionPago
  plazoCreditoDias: number
  estado: EstadoCompraPersistido
  detalleIds: ID[]
}

export interface ItemRecepcion {
  id: ID
  recepcionId: ID
  productoId: ID
  cantidadRecibida: Decimal
  costoUnitario: Money
}

export interface Recepcion extends CamposAuditoria {
  id: ID
  numero: string
  compraId: ID
  almacenId: ID
  recibidoPorUsuarioId: ID
  fecha: ISODateOnly
  itemIds: ID[]
  observaciones?: string
}

export interface ItemTransferencia {
  id: ID
  transferenciaId: ID
  productoId: ID
  cantidad: Decimal
  costoUnitario: Money
}

export interface Transferencia extends CamposAuditoria {
  id: ID
  numero: string
  almacenOrigenId: ID
  almacenDestinoId: ID
  solicitanteUsuarioId: ID
  fecha: ISODateOnly
  estado: EstadoTransferenciaPersistido
  itemIds: ID[]
  observaciones?: string
}

export interface CuentaCobrar extends CamposAuditoria {
  id: ID
  clienteId: ID
  ventaId: ID
  comprobanteId: ID
  fechaEmision: ISODateOnly
  fechaVencimiento: ISODateOnly
  moneda: Moneda
  anuladaEn?: ISODate
}

export interface CuentaPagar extends CamposAuditoria {
  id: ID
  proveedorId: ID
  compraId: ID
  comprobanteId: ID
  fechaEmision: ISODateOnly
  fechaVencimiento: ISODateOnly
  moneda: Moneda
  anuladaEn?: ISODate
}

export interface SerieComprobante {
  serie: string
  correlativo: number
}

export interface DatosEmpresa {
  razonSocial: string
  nombreComercial?: string
  tipoDocumento: TipoDocumentoIdentidad
  numeroDocumento: string
  direccion: string
}

export interface Configuracion extends CamposAuditoria {
  id: ID
  igvPorcentaje?: Decimal
  seriesComprobantes?: Record<TipoComprobante, string>
  igvPorDefecto: Decimal
  series: Partial<Record<TipoComprobante, SerieComprobante>>
  almacenPorDefectoId: ID
  datosEmpresa: DatosEmpresa
  estado: EstadoRegistro
}

export interface CuentaBancaria extends CamposAuditoria {
  id: ID
  banco: string
  nombre: string
  numeroEnmascarado: string
  moneda: Moneda
  estado: EstadoRegistro
}

export interface MovimientoCaja extends CamposAuditoria {
  id: ID
  tipo: TipoMovimientoCaja
  fecha: ISODate
  moneda: Moneda
  monto: Money
  metodoPago: MetodoPago
  cuentaBancariaId?: ID
  referenciaTipo: TipoReferencia
  referenciaId: ID
  descripcion?: string
}

export interface PagoBase extends CamposAuditoria {
  id: ID
  tipo: TipoPago
  fecha: ISODateOnly
  moneda: Moneda
  monto: Money
  metodoPago: MetodoPago
  movimientoCajaId: ID
  cuentaBancariaId?: ID
  usuarioId: ID
  referenciaExterna?: string
}

export interface PagoCobro extends PagoBase {
  tipo: 'Cobro cliente'
  cuentaCobrarId: ID
  cuentaPagarId?: never
}

export interface PagoProveedor extends PagoBase {
  tipo: 'Pago proveedor'
  cuentaPagarId: ID
  cuentaCobrarId?: never
}

export type Pago = PagoCobro | PagoProveedor

export interface Documento extends CamposAuditoria {
  id: ID
  tipo: TipoDocumento
  nombreArchivo: string
  mimeType: string
  tamanoBytes: number
  entidadTipo: TipoEntidadDocumento
  entidadId: ID
  urlSimulada: string
  subidoPorUsuarioId: ID
}

export interface RegistroAuditoria {
  id: ID
  fecha: ISODate
  usuarioId: ID
  accion:
    | 'Crear'
    | 'Editar'
    | 'Aprobar'
    | 'Anular'
    | 'Emitir'
    | 'Registrar pago'
    | 'Registrar cobro'
    | 'Ajustar'
    | 'Iniciar sesión'
    | 'Cerrar sesión'
    | 'Recibir'
    | 'Transferir'
    | 'Facturar'
    | 'Exportar'
    | 'Subir'
    | 'Cambiar permisos'
  modulo: ModuloSistema
  entidadTipo: TipoEntidadAuditable
  entidadId: ID
  descripcion: string
  estadoAnterior?: string
  estadoPosterior?: string
  datosAntes?: unknown
  datosDespues?: unknown
}

export type EntidadMaestra = Cliente | Proveedor | Producto | Categoria | Almacen
export type EntidadTransaccional =
  | Cotizacion
  | Venta
  | Comprobante
  | SolicitudCompra
  | OrdenCompra
  | Compra
  | Recepcion
  | Transferencia
  | Pago
