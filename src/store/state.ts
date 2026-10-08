import type {
  Almacen,
  Categoria,
  Cliente,
  Compra,
  Configuracion,
  CuentaBancaria,
  CuentaCobrar,
  CuentaPagar,
  Cotizacion,
  DetalleCompra,
  DetalleVenta,
  Documento,
  MovimientoCaja,
  MovimientoInventario,
  OrdenCompra,
  Pago,
  Permiso,
  Producto,
  Proveedor,
  Recepcion,
  RegistroAuditoria,
  Rol,
  SolicitudAjusteInventario,
  SolicitudCompra,
  Transferencia,
  Usuario,
  Venta,
  Comprobante,
  ItemRecepcion,
  ItemTransferencia,
  ISODateOnly,
} from '../types'

export interface ERPState {
  fechaReferencia: ISODateOnly
  seedVersion: string
  usuarios: Usuario[]
  roles: Rol[]
  permisos: Permiso[]
  clientes: Cliente[]
  proveedores: Proveedor[]
  productos: Producto[]
  categorias: Categoria[]
  almacenes: Almacen[]
  configuracion: Configuracion
  cotizaciones: Cotizacion[]
  ventas: Venta[]
  detallesVenta: DetalleVenta[]
  comprobantes: Comprobante[]
  solicitudesCompra: SolicitudCompra[]
  ordenesCompra: OrdenCompra[]
  compras: Compra[]
  detallesCompra: DetalleCompra[]
  recepciones: Recepcion[]
  itemsRecepcion: ItemRecepcion[]
  transferencias: Transferencia[]
  itemsTransferencia: ItemTransferencia[]
  movimientosInventario: MovimientoInventario[]
  solicitudesAjuste: SolicitudAjusteInventario[]
  cuentasCobrar: CuentaCobrar[]
  cuentasPagar: CuentaPagar[]
  cuentasBancarias: CuentaBancaria[]
  movimientosCaja: MovimientoCaja[]
  pagos: Pago[]
  documentos: Documento[]
  auditoria: RegistroAuditoria[]
}

export interface ActionContext {
  reloj: () => string
  idGenerador: (prefijo: string) => string
}

export interface ActionSuccess<T = undefined> {
  ok: true
  estado: ERPState
  auditoria: RegistroAuditoria[]
  resultado?: T
}

export interface ActionFailure {
  ok: false
  error: string
}

export type ActionResult<T = undefined> = ActionSuccess<T> | ActionFailure
