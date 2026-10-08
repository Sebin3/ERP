/** Identificadores y tipos primitivos compartidos por todo el dominio. */
export type ID = string

/** Fecha y hora en formato ISO 8601. */
export type ISODate = string

/** Fecha de negocio sin hora, en formato ISO 8601 (YYYY-MM-DD). */
export type ISODateOnly = string

/** Importe monetario expresado en soles, sin formato de presentación. */
export type Money = number

/** Cantidad física o monetaria con precisión decimal. */
export type Decimal = number

export type Moneda = 'PEN'

export type EstadoRegistro = 'Activo' | 'Inactivo'

export type TipoDocumentoIdentidad = 'DNI' | 'RUC' | 'CE' | 'Pasaporte'

export type UnidadMedida = 'UND' | 'KG' | 'LT' | 'CJ' | 'MT' | 'PAQ'

export type CondicionPago = 'Contado' | 'Crédito'

export type MetodoPago =
  | 'Efectivo'
  | 'Yape'
  | 'Plin'
  | 'Transferencia bancaria'
  | 'Tarjeta'
  | 'Cheque'

export type TipoComprobante =
  | 'Factura'
  | 'Boleta'
  | 'Nota de crédito'
  

export type TipoReferencia =
  | 'Saldo inicial'
  | 'Venta'
  | 'Compra'
  | 'Recepción'
  | 'Transferencia'
  | 'Ajuste'
  | 'Pago'
  | 'Cobro'
  | 'Comprobante'
  | 'Cuenta bancaria'

export interface CamposAuditoria {
  creadoEn: ISODate
  creadoPorUsuarioId: ID
  actualizadoEn: ISODate
  actualizadoPorUsuarioId: ID
}
