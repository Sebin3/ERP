import { describe, expect, it } from 'vitest'
import type { ERPState } from '../../../store'
import type { RegistroAuditoria } from '../../../types'
import { selectReservado, selectSaldoCaja, selectSaldoCuenta, selectStock, selectStockDisponible, selectEstadoCuenta, selectEstadoTransferencia, selectProductosStockCritico } from '../../../store/selectors'
import { NATURALEZA_MOVIMIENTO_INVENTARIO, redondearDosDecimales } from '../../../utils'
import { crearEstadoInicial, SEED_VERSION } from '..'

const FECHA_REFERENCIA = '2026-10-07'

function semilla(): ERPState {
  return crearEstadoInicial(FECHA_REFERENCIA)
}

function idsDeEntidades(estado: ERPState): Set<string> {
  const colecciones: Array<ReadonlyArray<{ id: string }>> = [
    estado.usuarios, estado.roles, estado.permisos, estado.clientes, estado.proveedores, estado.productos, estado.categorias,
    estado.almacenes, estado.cotizaciones, estado.ventas, estado.detallesVenta, estado.comprobantes, estado.solicitudesCompra,
    estado.ordenesCompra, estado.compras, estado.detallesCompra, estado.recepciones, estado.itemsRecepcion, estado.transferencias,
    estado.itemsTransferencia, estado.movimientosInventario, estado.solicitudesAjuste, estado.cuentasCobrar, estado.cuentasPagar,
    estado.cuentasBancarias, estado.movimientosCaja, estado.pagos, estado.documentos,
  ]
  return new Set(colecciones.flatMap((coleccion) => coleccion.map((item) => item.id)).concat(estado.configuracion.id))
}

function entidadesDeVenta(estado: ERPState, ventaId: string) {
  const venta = estado.ventas.find((item) => item.id === ventaId)
  return estado.detallesVenta.filter((item) => venta?.detalleIds.includes(item.id))
}

function mesHace(mesesAtras: number, fechaReferencia = FECHA_REFERENCIA): string {
  const fecha = new Date(`${fechaReferencia}T12:00:00.000Z`)
  fecha.setUTCDate(1)
  fecha.setUTCMonth(fecha.getUTCMonth() - mesesAtras)
  return fecha.toISOString().slice(0, 7)
}

function entidadDeAuditoriaExiste(estado: ERPState, registro: RegistroAuditoria): boolean {
  switch (registro.entidadTipo) {
    case 'Usuario': return estado.usuarios.some((item) => item.id === registro.entidadId)
    case 'Rol': return estado.roles.some((item) => item.id === registro.entidadId)
    case 'Permiso': return estado.permisos.some((item) => item.id === registro.entidadId)
    case 'Cliente': return estado.clientes.some((item) => item.id === registro.entidadId)
    case 'Proveedor': return estado.proveedores.some((item) => item.id === registro.entidadId)
    case 'Producto': return estado.productos.some((item) => item.id === registro.entidadId)
    case 'Categoría': return estado.categorias.some((item) => item.id === registro.entidadId)
    case 'Almacén': return estado.almacenes.some((item) => item.id === registro.entidadId)
    case 'MovimientoInventario': return estado.movimientosInventario.some((item) => item.id === registro.entidadId)
    case 'SolicitudAjusteInventario': return estado.solicitudesAjuste.some((item) => item.id === registro.entidadId)
    case 'Cotización': return estado.cotizaciones.some((item) => item.id === registro.entidadId)
    case 'Venta': return estado.ventas.some((item) => item.id === registro.entidadId)
    case 'Comprobante': return estado.comprobantes.some((item) => item.id === registro.entidadId)
    case 'SolicitudCompra': return estado.solicitudesCompra.some((item) => item.id === registro.entidadId)
    case 'OrdenCompra': return estado.ordenesCompra.some((item) => item.id === registro.entidadId)
    case 'Compra': return estado.compras.some((item) => item.id === registro.entidadId)
    case 'Recepción': return estado.recepciones.some((item) => item.id === registro.entidadId)
    case 'Transferencia': return estado.transferencias.some((item) => item.id === registro.entidadId)
    case 'CuentaCobrar': return estado.cuentasCobrar.some((item) => item.id === registro.entidadId)
    case 'CuentaPagar': return estado.cuentasPagar.some((item) => item.id === registro.entidadId)
    case 'CuentaBancaria': return estado.cuentasBancarias.some((item) => item.id === registro.entidadId)
    case 'MovimientoCaja': return estado.movimientosCaja.some((item) => item.id === registro.entidadId)
    case 'Pago': return estado.pagos.some((item) => item.id === registro.entidadId)
    case 'Documento': return estado.documentos.some((item) => item.id === registro.entidadId)
    case 'Configuración': return estado.configuracion.id === registro.entidadId
  }
}

function franjasDeSaldo(estado: ERPState, tipo: 'cobrar' | 'pagar', fechaReferencia: string): Record<'Vigente' | '1-30' | '31-60' | '+60', number> {
  const cuentas = tipo === 'cobrar' ? estado.cuentasCobrar : estado.cuentasPagar
  const resultado = { Vigente: 0, '1-30': 0, '31-60': 0, '+60': 0 }
  for (const cuenta of cuentas) {
    if (selectSaldoCuenta(estado, cuenta.id) <= 0) continue
    const dias = Math.floor((Date.parse(`${fechaReferencia}T00:00:00Z`) - Date.parse(`${cuenta.fechaVencimiento}T00:00:00Z`)) / 86400000)
    if (dias <= 0) resultado.Vigente += 1
    else if (dias <= 30) resultado['1-30'] += 1
    else if (dias <= 60) resultado['31-60'] += 1
    else resultado['+60'] += 1
  }
  return resultado
}

describe(`semilla ${SEED_VERSION}`, () => {
  it('genera los volúmenes objetivo y la configuración inicial', () => {
    const estado = semilla()
    expect(estado.productos).toHaveLength(40)
    expect(estado.categorias).toHaveLength(6)
    expect(estado.clientes).toHaveLength(18)
    expect(estado.clientes.filter((item) => item.tipoDocumento === 'RUC')).toHaveLength(12)
    expect(estado.clientes.filter((item) => item.tipoDocumento === 'DNI')).toHaveLength(6)
    expect(estado.proveedores).toHaveLength(12)
    expect(estado.almacenes).toHaveLength(3)
    expect(estado.usuarios).toHaveLength(8)
    expect(estado.cuentasBancarias).toHaveLength(2)
    expect(estado.ventas).toHaveLength(60)
    expect(estado.compras).toHaveLength(25)
    expect(estado.transferencias).toHaveLength(3)
    expect(estado.solicitudesAjuste).toHaveLength(3)
    expect(estado.documentos).toHaveLength(12)
    expect(selectProductosStockCritico(estado)).toHaveLength(5)
    expect(estado.configuracion.igvPorDefecto).toBe(0.18)
    expect(estado.configuracion.almacenPorDefectoId).toBe('alm-001')
    expect(estado.configuracion.series.Factura?.serie).toBe('F001')
    expect(estado.configuracion.series.Boleta?.serie).toBe('B001')
    expect(estado.configuracion.series['Nota de crédito']?.serie).toBe('NC01')
  })

  it('es determinista para la misma fecha de referencia', () => {
    expect(JSON.stringify(semilla())).toBe(JSON.stringify(semilla()))
  })

  it('mantiene todas las referencias a entidades existentes', () => {
    const estado = semilla()
    const ids = idsDeEntidades(estado)
    for (const venta of estado.ventas) {
      expect(ids.has(venta.clienteId)).toBe(true)
      expect(ids.has(venta.vendedorId)).toBe(true)
      expect(ids.has(venta.almacenId)).toBe(true)
      for (const detalleId of venta.detalleIds) expect(ids.has(detalleId)).toBe(true)
    }
    for (const compra of estado.compras) {
      expect(ids.has(compra.ordenCompraId)).toBe(true)
      expect(ids.has(compra.proveedorId)).toBe(true)
      for (const detalleId of compra.detalleIds) expect(ids.has(detalleId)).toBe(true)
    }
    for (const comprobante of estado.comprobantes) {
      if ('ventaId' in comprobante) expect(ids.has(comprobante.ventaId)).toBe(true)
      if ('compraId' in comprobante) expect(ids.has(comprobante.compraId)).toBe(true)
      if ('comprobanteRelacionadoId' in comprobante) expect(ids.has(comprobante.comprobanteRelacionadoId)).toBe(true)
    }
    for (const documento of estado.documentos) expect(ids.has(documento.entidadId)).toBe(true)
    for (const auditoria of estado.auditoria) {
      expect(ids.has(auditoria.usuarioId)).toBe(true)
      expect(ids.has(auditoria.entidadId)).toBe(true)
    }
  })

  it('cada registro de auditoría apunta a una entidad y a un usuario existentes', () => {
    const estado = semilla()
    const accionesPermitidas: RegistroAuditoria['accion'][] = ['Crear', 'Editar', 'Aprobar', 'Anular', 'Emitir', 'Registrar pago', 'Registrar cobro', 'Ajustar', 'Iniciar sesión', 'Cerrar sesión', 'Recibir', 'Transferir', 'Facturar', 'Exportar', 'Subir', 'Cambiar permisos']
    for (const registro of estado.auditoria) {
      expect(estado.usuarios.some((usuario) => usuario.id === registro.usuarioId)).toBe(true)
      expect(entidadDeAuditoriaExiste(estado, registro)).toBe(true)
      expect(accionesPermitidas).toContain(registro.accion)
    }
  })

  it('no produce stock negativo al recorrer el kardex cronológicamente', () => {
    const estado = semilla()
    const acumulado = new Map<string, number>()
    const movimientos = estado.movimientosInventario.map((movimiento, index) => ({ movimiento, index })).sort((a, b) => a.movimiento.fecha.localeCompare(b.movimiento.fecha) || a.index - b.index)
    for (const { movimiento } of movimientos) {
      const clave = `${movimiento.productoId}:${movimiento.almacenId}`
      const entrada = NATURALEZA_MOVIMIENTO_INVENTARIO[movimiento.tipo] === 'entrada'
      const actual = (acumulado.get(clave) ?? 0) + (entrada ? movimiento.cantidad : -movimiento.cantidad)
      expect(actual).toBeGreaterThanOrEqual(0)
      acumulado.set(clave, redondearDosDecimales(actual))
    }
  })

  it('deriva stock, reservado y disponible exclusivamente desde movimientos y ventas', () => {
    const estado = semilla()
    for (const producto of estado.productos) {
      for (const almacen of estado.almacenes) {
        const reservadoEsperado = estado.ventas.filter((venta) => venta.estado === 'Aprobado' && venta.almacenId === almacen.id && !estado.comprobantes.some((comprobante) => 'ventaId' in comprobante && comprobante.ventaId === venta.id && comprobante.tipo !== 'Nota de crédito')).flatMap((venta) => entidadesDeVenta(estado, venta.id)).filter((detalle) => detalle.productoId === producto.id).reduce((total, detalle) => total + detalle.cantidad, 0)
        const stock = selectStock(estado, producto.id, almacen.id)
        expect(stock).toBeGreaterThanOrEqual(0)
        expect(selectReservado(estado, producto.id, almacen.id)).toBe(redondearDosDecimales(reservadoEsperado))
        expect(selectStockDisponible(estado, producto.id, almacen.id)).toBe(redondearDosDecimales(stock - reservadoEsperado))
      }
    }
  })

  it('mantiene comprobantes, cuentas, saldos y pagos coherentes', () => {
    const estado = semilla()
    for (const cuenta of estado.cuentasCobrar) {
      const comprobante = estado.comprobantes.find((item) => item.id === cuenta.comprobanteId)
      expect(comprobante && 'ventaId' in comprobante && comprobante.ventaId === cuenta.ventaId).toBe(true)
      expect(selectSaldoCuenta(estado, cuenta.id)).toBeGreaterThanOrEqual(0)
    }
    for (const cuenta of estado.cuentasPagar) {
      const comprobante = estado.comprobantes.find((item) => item.id === cuenta.comprobanteId)
      expect(comprobante && 'compraId' in comprobante && comprobante.compraId === cuenta.compraId).toBe(true)
      expect(selectSaldoCuenta(estado, cuenta.id)).toBeGreaterThanOrEqual(0)
    }
    for (const pago of estado.pagos) {
      const movimiento = estado.movimientosCaja.find((item) => item.id === pago.movimientoCajaId)
      expect(movimiento).toBeDefined()
      expect(movimiento?.monto).toBe(pago.monto)
      expect(movimiento?.moneda).toBe(pago.moneda)
      expect(movimiento?.referenciaId).toBe('cuentaCobrarId' in pago ? pago.cuentaCobrarId : pago.cuentaPagarId)
    }
  })

  it('relaciona salidas, recepciones y transferencias con sus efectos de kardex', () => {
    const estado = semilla()
    for (const venta of estado.ventas.filter((item) => item.estado === 'Facturado')) {
      expect(estado.movimientosInventario.some((item) => item.tipo === 'Salida por venta' && item.referenciaId === venta.id)).toBe(true)
    }
    for (const recepcion of estado.recepciones) {
      expect(estado.movimientosInventario.some((item) => item.tipo === 'Entrada por compra' && item.referenciaId === recepcion.id)).toBe(true)
    }
    for (const transferencia of estado.transferencias.filter((item) => item.estado !== 'Borrador')) {
      const salidas = estado.movimientosInventario.filter((item) => item.transferenciaId === transferencia.id && item.tipo === 'Transferencia salida')
      const entradas = estado.movimientosInventario.filter((item) => item.transferenciaId === transferencia.id && item.tipo === 'Transferencia entrada')
      if (selectEstadoTransferencia(estado, transferencia.id) === 'Solicitada') expect(salidas).toHaveLength(0)
      else expect(salidas.length).toBe(entradas.length)
    }
  })

  it('mantiene cantidades e importes positivos y no emite boletas a RUC', () => {
    const estado = semilla()
    expect(estado.movimientosInventario.every((item) => item.cantidad > 0 && item.costoUnitario > 0)).toBe(true)
    expect(estado.detallesVenta.every((item) => item.cantidad > 0 && item.precioUnitario > 0 && item.descuento >= 0)).toBe(true)
    expect(estado.detallesCompra.every((item) => item.cantidad > 0 && item.costoUnitario > 0)).toBe(true)
    expect(estado.pagos.every((item) => item.monto > 0)).toBe(true)
    for (const comprobante of estado.comprobantes.filter((item) => item.tipo === 'Boleta')) {
      const cliente = estado.clientes.find((item) => 'clienteId' in comprobante && item.id === comprobante.clienteId)
      expect(cliente?.tipoDocumento).not.toBe('RUC')
    }
  })

  it('conserva correlativos consecutivos y sincronizados con configuración', () => {
    const estado = semilla()
    for (const [tipo, serie] of Object.entries(estado.configuracion.series)) {
      if (!serie) continue
      const numeros = estado.comprobantes.filter((item) => item.tipo === tipo).map((item) => Number(item.numero)).sort((a, b) => a - b)
      expect(new Set(numeros).size).toBe(numeros.length)
      expect(numeros).toEqual(Array.from({ length: serie.correlativo }, (_, index) => index + 1))
    }
  })

  it('contiene ventas y compras en cada mes de los últimos doce meses', () => {
    const estado = semilla()
    const meses = Array.from({ length: 12 }, (_, index) => mesHace(index))
    for (const mes of meses) {
      expect(estado.ventas.some((item) => item.fecha.startsWith(mes))).toBe(true)
      expect(estado.compras.some((item) => item.fecha.startsWith(mes))).toBe(true)
    }
  })

  it('cumple ventas anuladas, cuentas vencidas, cobros y estados derivados', () => {
    const estado = semilla()
    expect(estado.ventas.filter((item) => item.estado === 'Anulado')).toHaveLength(3)
    expect(estado.comprobantes.filter((item) => item.tipo === 'Nota de crédito')).toHaveLength(1)
    expect(estado.cuentasCobrar.filter((item) => selectEstadoCuenta(estado, item.id, FECHA_REFERENCIA) === 'Vencida').length).toBeGreaterThanOrEqual(6)
    expect(estado.ventas.filter((item) => item.estado === 'Facturado').length).toBeGreaterThan(40)
    expect(estado.cuentasPagar.filter((item) => selectSaldoCuenta(estado, item.id) > 0)).not.toHaveLength(0)
  })

  it('cubre las cuatro franjas de antigüedad en CxC y CxP', () => {
    const estado = semilla()
    const cxc = franjasDeSaldo(estado, 'cobrar', FECHA_REFERENCIA)
    const cxp = franjasDeSaldo(estado, 'pagar', FECHA_REFERENCIA)
    expect(cxc).toEqual({ Vigente: 4, '1-30': 4, '31-60': 3, '+60': 3 })
    expect(cxp).toEqual({ Vigente: 3, '1-30': 2, '31-60': 2, '+60': 1 })
    const totalCxc = estado.cuentasCobrar.reduce((total, cuenta) => total + selectSaldoCuenta(estado, cuenta.id), 0)
    const totalCxp = estado.cuentasPagar.reduce((total, cuenta) => total + selectSaldoCuenta(estado, cuenta.id), 0)
    expect(Math.max(totalCxc, totalCxp) / Math.min(totalCxc, totalCxp)).toBeGreaterThanOrEqual(1.1)
    const cxpPendientes = estado.cuentasPagar.filter((cuenta) => selectSaldoCuenta(estado, cuenta.id) > 0)
    expect(cxpPendientes).toHaveLength(8)
    expect(cxpPendientes.every((cuenta) => Date.parse(`${FECHA_REFERENCIA}T00:00:00Z`) - Date.parse(`${cuenta.fechaVencimiento}T00:00:00Z`) <= 120 * 86400000)).toBe(true)
    expect(cxpPendientes.filter((cuenta) => estado.pagos.some((pago) => 'cuentaPagarId' in pago && pago.cuentaPagarId === cuenta.id) && selectSaldoCuenta(estado, cuenta.id) > 0).length).toBeGreaterThanOrEqual(2)
  })

  it('mantiene compras recibidas, pagadas, parciales y anuladas', () => {
    const estado = semilla()
    expect(estado.compras.filter((item) => item.estado === 'Anulada')).toHaveLength(2)
    expect(estado.recepciones.length).toBeGreaterThan(estado.compras.filter((item) => item.estado !== 'Anulada').length)
    expect(estado.cuentasPagar.some((item) => selectSaldoCuenta(estado, item.id) === 0)).toBe(true)
    expect(estado.cuentasPagar.some((item) => selectSaldoCuenta(estado, item.id) > 0)).toBe(true)
  })

  it('distribuye los pagos a proveedores recientes sin perder cuentas parciales', () => {
    const estado = semilla()
    const desde = '2026-09-07'
    const pagosRecientes = estado.pagos.filter((pago) => pago.tipo === 'Pago proveedor' && pago.fecha >= desde && pago.fecha <= FECHA_REFERENCIA)
    const cuentasRecientes = new Set(pagosRecientes.flatMap((pago) => 'cuentaPagarId' in pago ? [pago.cuentaPagarId] : []))
    const cuentasParciales = [...cuentasRecientes].filter((cuentaId) => selectSaldoCuenta(estado, cuentaId) > 0)
    expect(pagosRecientes.length).toBeGreaterThanOrEqual(6)
    expect(pagosRecientes.length).toBeLessThanOrEqual(10)
    expect(cuentasRecientes.size).toBe(pagosRecientes.length)
    expect(cuentasParciales.length).toBeGreaterThanOrEqual(2)
  })

  it('mantiene la caja no negativa al recorrer los movimientos', () => {
    for (const fecha of [FECHA_REFERENCIA, '2027-03-15']) {
      const estado = crearEstadoInicial(fecha)
      let saldo = 0
      const movimientos = estado.movimientosCaja
        .filter((movimiento) => !movimiento.cuentaBancariaId)
        .map((movimiento, index) => ({ movimiento, index }))
        .sort((a, b) => a.movimiento.fecha.localeCompare(b.movimiento.fecha) || a.index - b.index)
      for (const { movimiento } of movimientos) {
        saldo = redondearDosDecimales(saldo + (movimiento.tipo === 'Ingreso' ? movimiento.monto : -movimiento.monto))
        expect(saldo).toBeGreaterThanOrEqual(0)
      }
      expect(selectSaldoCaja(estado)).toBeGreaterThanOrEqual(0)
    }
  })

  it('crea dos transferencias completadas y una solicitada, más dos ajustes aprobados y uno pendiente', () => {
    const estado = semilla()
    expect(estado.transferencias.filter((item) => selectEstadoTransferencia(estado, item.id) === 'Solicitada')).toHaveLength(1)
    expect(estado.transferencias.filter((item) => selectEstadoTransferencia(estado, item.id) === 'Completada')).toHaveLength(2)
    expect(estado.movimientosInventario.filter((item) => item.tipo === 'Transferencia salida')).toHaveLength(2)
    expect(estado.solicitudesAjuste.filter((item) => item.estado === 'Aprobada')).toHaveLength(2)
    expect(estado.solicitudesAjuste.filter((item) => item.estado === 'Pendiente')).toHaveLength(1)
  })

  it('mantiene las invariantes clave con otra fecha de referencia', () => {
    const fecha = '2027-03-15'
    const estado = crearEstadoInicial(fecha)
    const ids = idsDeEntidades(estado)
    expect(estado.fechaReferencia).toBe(fecha)
    expect(estado.seedVersion).toBe(SEED_VERSION)
    expect(estado.productos).toHaveLength(40)
    expect(estado.clientes).toHaveLength(18)
    expect(estado.proveedores).toHaveLength(12)
    expect(estado.ventas).toHaveLength(60)
    expect(estado.compras).toHaveLength(25)
    for (const registro of estado.auditoria) {
      expect(ids.has(registro.usuarioId)).toBe(true)
      expect(entidadDeAuditoriaExiste(estado, registro)).toBe(true)
    }
    const acumulado = new Map<string, number>()
    const movimientos = estado.movimientosInventario.map((movimiento, index) => ({ movimiento, index })).sort((a, b) => a.movimiento.fecha.localeCompare(b.movimiento.fecha) || a.index - b.index)
    for (const { movimiento } of movimientos) {
      const clave = `${movimiento.productoId}:${movimiento.almacenId}`
      const delta = NATURALEZA_MOVIMIENTO_INVENTARIO[movimiento.tipo] === 'entrada' ? movimiento.cantidad : -movimiento.cantidad
      const stock = redondearDosDecimales((acumulado.get(clave) ?? 0) + delta)
      expect(stock).toBeGreaterThanOrEqual(0)
      acumulado.set(clave, stock)
    }
    for (const cuenta of [...estado.cuentasCobrar, ...estado.cuentasPagar]) expect(selectSaldoCuenta(estado, cuenta.id)).toBeGreaterThanOrEqual(0)
    expect(Object.values(franjasDeSaldo(estado, 'cobrar', fecha)).every((cantidad) => cantidad > 0)).toBe(true)
    expect(Object.values(franjasDeSaldo(estado, 'pagar', fecha)).every((cantidad) => cantidad > 0)).toBe(true)
    for (const [tipo, serie] of Object.entries(estado.configuracion.series)) {
      if (!serie) continue
      const numeros = estado.comprobantes.filter((item) => item.tipo === tipo).map((item) => Number(item.numero)).sort((a, b) => a - b)
      expect(numeros).toEqual(Array.from({ length: serie.correlativo }, (_, index) => index + 1))
    }
    for (let index = 0; index < 12; index += 1) {
      const mes = mesHace(index, fecha)
      expect(estado.ventas.some((item) => item.fecha.startsWith(mes))).toBe(true)
      expect(estado.compras.some((item) => item.fecha.startsWith(mes))).toBe(true)
    }
  })
})
