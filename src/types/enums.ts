export type RolSistema = 'Administrador' | 'Vendedor' | 'Almacenero' | 'Contador'

export type ModuloSistema =
  | 'Dashboard'
  | 'Comercial'
  | 'Compras'
  | 'Inventario'
  | 'Finanzas'
  | 'Datos maestros'
  | 'Documentos'
  | 'Reportes'
  | 'Administración'
  | 'Configuración'

export type RecursoSistema =
  | 'Dashboard'
  | 'Clientes'
  | 'Cotizaciones'
  | 'Ventas'
  | 'Facturación'
  | 'Proveedores'
  | 'Solicitudes de compra'
  | 'Órdenes de compra'
  | 'Recepción'
  | 'Despachos'
  | 'Productos'
  | 'Almacenes'
  | 'Kardex'
  | 'Transferencias'
  | 'Ajustes de inventario'
  | 'Cuentas por cobrar'
  | 'Cuentas por pagar'
  | 'Caja'
  | 'Bancos'
  | 'Documentos'
  | 'Reportes'
  | 'Usuarios'
  | 'Roles'
  | 'Permisos'
  | 'Auditoría'
  | 'Configuración'

export type AccionPermiso =
  | 'ver'
  | 'crear'
  | 'editar'
  | 'aprobar'
  | 'anular'
  | 'exportar'

export type EstadoVenta =
  | 'Borrador'
  | 'Pendiente'
  | 'Aprobado'
  | 'Facturado'
  | 'Cobrado'
  | 'Anulado'

/** Estados persistidos; Cobrado se deriva de la cuenta por cobrar y sus pagos. */
export type EstadoVentaPersistido = Exclude<EstadoVenta, 'Cobrado'>

export type EstadoCompra =
  | 'Solicitada'
  | 'Ordenada'
  | 'Recibida'
  | 'Facturada'
  | 'Pagada'
  | 'Anulada'

/** Recibida y Pagada se derivan de recepciones, comprobantes y pagos. */
export type EstadoCompraPersistido = Exclude<EstadoCompra, 'Solicitada' | 'Recibida' | 'Pagada'>

export type TipoMovimientoInventario =
  | 'Saldo inicial'
  | 'Entrada por compra'
  | 'Salida por venta'
  | 'Entrada por devolución'
  | 'Transferencia salida'
  | 'Transferencia entrada'
  | 'Ajuste entrada'
  | 'Ajuste salida'

export type EstadoCotizacion = 'Borrador' | 'Enviada' | 'Aceptada' | 'Rechazada' | 'Vencida' | 'Anulada'

export type EstadoSolicitudCompra = 'Borrador' | 'Solicitada' | 'Aprobada' | 'Atendida' | 'Anulada'

/** Atendida se deriva de las órdenes y cantidades asociadas. */
export type EstadoSolicitudCompraPersistido = Exclude<EstadoSolicitudCompra, 'Atendida'>

export type EstadoOrdenCompra = 'Borrador' | 'Ordenada' | 'Parcial' | 'Atendida' | 'Anulada'

/** Parcial y Atendida se derivan de recepciones. */
export type EstadoOrdenCompraPersistido = Exclude<EstadoOrdenCompra, 'Parcial' | 'Atendida'>

export type EstadoRecepcion = 'Pendiente' | 'Parcial' | 'Completa' | 'Anulada'

export type EstadoTransferencia = 'Borrador' | 'Solicitada' | 'Completada' | 'Anulada'

/** Completada se deriva de la pareja de movimientos de salida y entrada. */
export type EstadoTransferenciaPersistido = Exclude<EstadoTransferencia, 'Completada'>

export type EstadoSolicitudAjuste = 'Pendiente' | 'Aprobada' | 'Rechazada' | 'Anulada'

export type EstadoComprobante = 'Emitido' | 'Anulado'

export type EstadoCuenta = 'Pendiente' | 'Vencida' | 'Pagada' | 'Anulada'

export type TipoMovimientoCaja = 'Ingreso' | 'Egreso'

export type TipoPago = 'Cobro cliente' | 'Pago proveedor'

export type TipoDocumento =
  | 'Cotización'
  | 'Orden de compra'
  | 'Comprobante de venta'
  | 'Comprobante de compra'
  | 'Guía de remisión'
  | 'Contrato'
  | 'Otro'

export type TipoEntidadDocumento = 'Venta' | 'Compra' | 'Cliente' | 'Proveedor' | 'Cotización' | 'OrdenCompra'

export type TipoEntidadAuditable =
  | 'Usuario'
  | 'Rol'
  | 'Permiso'
  | 'Cliente'
  | 'Proveedor'
  | 'Producto'
  | 'Categoría'
  | 'Almacén'
  | 'MovimientoInventario'
  | 'SolicitudAjusteInventario'
  | 'Cotización'
  | 'Venta'
  | 'Comprobante'
  | 'SolicitudCompra'
  | 'OrdenCompra'
  | 'Compra'
  | 'Recepción'
  | 'Transferencia'
  | 'CuentaCobrar'
  | 'CuentaPagar'
  | 'CuentaBancaria'
  | 'MovimientoCaja'
  | 'Pago'
  | 'Documento'
  | 'Configuración'
