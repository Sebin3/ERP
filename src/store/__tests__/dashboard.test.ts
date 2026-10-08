import { describe, expect, it } from 'vitest'
import type { ERPState } from '../state'
import { crearEstadoInicial } from '../../services/seed'
import { construirCsvDashboard } from '../../modules/dashboard/csv'
import { dashboardWidgets, widgetsVisiblesParaRol } from '../../modules/dashboard/widgets'
import {
  cuentasPorCobrar,
  cuentasPorPagar,
  serieVentasCompras,
  stockCritico,
  utilidadDelMes,
  ventasDelMes,
  ventasPorCategoria,
} from '../selectors/dashboard/index'
import { selectProductosStockCritico, selectTotalCompra, selectTotalVenta, selectVentasPendientesAprobacion } from '../selectors'
import { redondearDosDecimales } from '../../utils'
import { resolverPeriodo, sumarDiasISO } from '../selectors/dashboard/periodo'
import { antiguedadCxC, antiguedadCxP } from '../selectors/dashboard/antiguedad'
import { bandejaAcciones } from '../selectors/dashboard/bandejaAcciones'
import { embudoPedidos } from '../selectors/dashboard/embudoPedidos'
import { conversionCotizaciones } from '../selectors/dashboard/conversionCotizaciones'
import { flujoCaja } from '../selectors/dashboard/flujoCaja'
import { kpisDashboard, ventasFacturadas } from '../selectors/dashboard/kpis'
import { serieVentasCompras as serieDashboard, sumaSerie } from '../selectors/dashboard/serieVentasCompras'
import { categoriasSumanVentasNetas, ventasPorCategoria as ventasPorCategoriaDashboard } from '../selectors/dashboard/ventasPorCategoria'
import { stockCritico as stockCriticoDashboard } from '../selectors/dashboard/inventario'
import { selectSaldoBanco, selectSaldoCaja, selectSaldoCuenta } from '../selectors'
import { totalFacturadoVentas } from '../selectors/dashboard/common'

const FECHA_REFERENCIA = '2026-10-07'

function sumaImportes(importes: number[]): number {
  return redondearDosDecimales(importes.reduce((total, importe) => total + importe, 0))
}

function estaEnRango(fecha: string, desde: string, hasta: string): boolean {
  return fecha >= desde && fecha <= hasta
}

function baseVenta(estado: ERPState, ventaId: string): number {
  const venta = estado.ventas.find((item) => item.id === ventaId)
  return redondearDosDecimales((venta?.detalleIds ?? []).map((id) => estado.detallesVenta.find((item) => item.id === id)).reduce((total, detalle) => total + (detalle ? detalle.cantidad * detalle.precioUnitario - detalle.descuento : 0), 0))
}

function ventasFacturadasEnRango(estado: ERPState, desde: string, hasta: string): number {
  return sumaImportes(estado.comprobantes.filter((comprobante) => comprobante.estado === 'Emitido' && comprobante.tipo !== 'Nota de crédito' && 'ventaId' in comprobante && estaEnRango(comprobante.fechaEmision, desde, hasta)).map((comprobante) => 'ventaId' in comprobante ? selectTotalVenta(estado, comprobante.ventaId) : 0))
}

function comprasFacturadasEnRango(estado: ERPState, desde: string, hasta: string): number {
  return sumaImportes(estado.comprobantes.filter((comprobante) => comprobante.estado === 'Emitido' && 'compraId' in comprobante && estaEnRango(comprobante.fechaEmision, desde, hasta)).map((comprobante) => 'compraId' in comprobante ? selectTotalCompra(estado, comprobante.compraId) : 0))
}

function baseNetaEnRango(estado: ERPState, desde: string, hasta: string): number {
  const facturado = estado.comprobantes.filter((comprobante) => comprobante.estado === 'Emitido' && comprobante.tipo !== 'Nota de crédito' && 'ventaId' in comprobante && estaEnRango(comprobante.fechaEmision, desde, hasta)).map((comprobante) => 'ventaId' in comprobante ? baseVenta(estado, comprobante.ventaId) : 0)
  const notas = estado.comprobantes.filter((comprobante) => comprobante.estado === 'Emitido' && comprobante.tipo === 'Nota de crédito' && estaEnRango(comprobante.fechaEmision, desde, hasta)).map((comprobante) => baseVenta(estado, comprobante.ventaId))
  return redondearDosDecimales(sumaImportes(facturado) - sumaImportes(notas))
}

function rangoMesActual(fecha: string): { desde: string; hasta: string } {
  return { desde: `${fecha.slice(0, 7)}-01`, hasta: fecha }
}

describe('selectores del dashboard', () => {
  it('resuelve los periodos contra la fecha de referencia sin fechas implícitas', () => {
    expect(resolverPeriodo('mes', FECHA_REFERENCIA)).toEqual({
      actual: { desde: '2026-10-01', hasta: FECHA_REFERENCIA },
      anterior: { desde: '2026-09-01', hasta: '2026-09-07' },
      granularidad: 'dia',
    })
    expect(resolverPeriodo('trimestre', FECHA_REFERENCIA)).toEqual({
      actual: { desde: '2026-08-01', hasta: FECHA_REFERENCIA },
      anterior: { desde: '2026-05-01', hasta: '2026-07-31' },
      granularidad: 'semana',
    })
    expect(resolverPeriodo('12meses', FECHA_REFERENCIA)).toEqual({
      actual: { desde: '2025-11-01', hasta: FECHA_REFERENCIA },
      anterior: null,
      granularidad: 'mes',
    })
  })

  it('suma la serie por día, semana y mes igual que los comprobantes', () => {
    const estado = crearEstadoInicial(FECHA_REFERENCIA)
    for (const periodo of ['mes', 'trimestre', '12meses'] as const) {
      const resuelto = resolverPeriodo(periodo, FECHA_REFERENCIA)
      const serie = serieDashboard(estado, periodo)
      expect(sumaSerie(serie, 'ventas')).toBe(ventasFacturadasEnRango(estado, resuelto.actual.desde, resuelto.actual.hasta))
      expect(sumaSerie(serie, 'compras')).toBe(comprasFacturadasEnRango(estado, resuelto.actual.desde, resuelto.actual.hasta))
      expect(serie.every((punto) => punto.desde <= punto.hasta)).toBe(true)
    }
  })

  it('marca como parcial el punto que todavía está en curso', () => {
    const estado = crearEstadoInicial(FECHA_REFERENCIA)
    for (const periodo of ['mes', 'trimestre', '12meses'] as const) {
      const serie = serieDashboard(estado, periodo)
      expect(serie.at(-1)?.parcial).toBe(true)
      expect(serie.slice(0, -1).every((punto) => punto.parcial === false)).toBe(true)
    }
  })

  it('mantiene coherentes los KPI, categorías, franjas y deltas', () => {
    const estado = crearEstadoInicial(FECHA_REFERENCIA)
    for (const periodo of ['mes', '12meses'] as const) {
      const kpis = kpisDashboard(estado, periodo)
      const rango = resolverPeriodo(periodo, FECHA_REFERENCIA).actual
      const costo = redondearDosDecimales(estado.movimientosInventario.filter((movimiento) => movimiento.tipo === 'Salida por venta' && estaEnRango(movimiento.fecha.slice(0, 10), rango.desde, rango.hasta)).reduce((total, movimiento) => total + movimiento.cantidad * movimiento.costoUnitario, 0))
      expect(kpis.ventasFacturadas.valor).toBe(ventasFacturadasEnRango(estado, rango.desde, rango.hasta))
      expect(kpis.utilidadBruta.valor).toBe(redondearDosDecimales(kpis.ventasNetas.valor - costo))
      expect(kpis.margenBrutoPct.valor).toBe(kpis.ventasNetas.valor === 0 ? 0 : redondearDosDecimales((kpis.utilidadBruta.valor / kpis.ventasNetas.valor) * 100))
      expect(categoriasSumanVentasNetas(estado, periodo)).toBe(kpis.ventasNetas.valor)
      for (const kpi of Object.values(kpis)) {
        expect(kpi.sparkline.length).toBeLessThanOrEqual(12)
        expect(kpi.deltaPct === null || Number.isFinite(kpi.deltaPct)).toBe(true)
        expect(Number.isFinite(kpi.valor)).toBe(true)
      }
    }
  })

  it('calcula el embudo de pedidos sin recortar datos y separa conversiones de cotizaciones', () => {
    const estado = crearEstadoInicial(FECHA_REFERENCIA)
    const embudo = embudoPedidos(estado, '12meses')
    for (let index = 1; index < embudo.length; index += 1) {
      expect(embudo[index].cantidad).toBeLessThanOrEqual(embudo[index - 1].cantidad)
      expect(embudo[index].monto).toBeLessThanOrEqual(embudo[index - 1].monto)
    }
    const conversion = conversionCotizaciones(estado, '12meses')
    const emitidas = estado.cotizaciones.filter((cotizacion) => cotizacion.estado === 'Enviada' || cotizacion.estado === 'Aceptada')
    const convertidas = emitidas.filter((cotizacion) => estado.ventas.some((venta) => venta.cotizacionId === cotizacion.id))
    expect(conversion.emitidas.cantidad).toBe(emitidas.length)
    expect(conversion.convertidas.cantidad).toBe(convertidas.length)
    expect(sumaImportes(antiguedadCxC(estado, '12meses').franjas.map((franja) => franja.monto))).toBe(antiguedadCxC(estado, '12meses').totalPendiente)
    expect(sumaImportes(antiguedadCxP(estado, '12meses').franjas.map((franja) => franja.monto))).toBe(antiguedadCxP(estado, '12meses').totalPendiente)
  })

  it('alinea inventario, bandeja y flujo de caja con los selectores base', () => {
    const estado = crearEstadoInicial(FECHA_REFERENCIA)
    const kpis = kpisDashboard(estado, '12meses')
    expect(stockCriticoDashboard(estado, 40)).toHaveLength(kpis.productosStockCritico.valor)
    const acciones = Object.fromEntries(bandejaAcciones(estado).map((accion) => [accion.id, accion.cantidad]))
    expect(acciones['ventas-pendientes']).toBe(selectVentasPendientesAprobacion(estado))
    expect(acciones['stock-critico']).toBe(selectProductosStockCritico(estado).length)
    const flujo = flujoCaja(estado, '12meses')
    const saldoActual = redondearDosDecimales(flujo.saldoCajaActual + flujo.saldoBancosActual)
    const saldoPorMovimientos = redondearDosDecimales(estado.movimientosCaja.reduce((total, movimiento) => total + (movimiento.tipo === 'Ingreso' ? movimiento.monto : -movimiento.monto), 0))
    expect(saldoActual).toBe(saldoPorMovimientos)
    expect(redondearDosDecimales(selectSaldoCaja(estado) + estado.cuentasBancarias.reduce((total, cuenta) => total + selectSaldoBanco(estado, cuenta.id), 0))).toBe(saldoActual)
  })

  it('calcula todos los selectores con una fecha de referencia distinta', () => {
    const estado = crearEstadoInicial('2027-03-15')
    expect(estado.fechaReferencia).toBe('2027-03-15')
    expect(serieDashboard(estado, '12meses')).toHaveLength(12)
    expect(() => kpisDashboard(estado, 'mes')).not.toThrow()
    expect(() => embudoPedidos(estado, '12meses')).not.toThrow()
    expect(() => conversionCotizaciones(estado, '12meses')).not.toThrow()
    expect(() => bandejaAcciones(estado)).not.toThrow()
    expect(() => flujoCaja(estado, 'trimestre')).not.toThrow()
  })

  it('mide los KPI del seed para la fecha de referencia', () => {
    const estado = crearEstadoInicial(FECHA_REFERENCIA)
    const mes = kpisDashboard(estado, 'mes')
    const trimestre = kpisDashboard(estado, 'trimestre')
    const anual = kpisDashboard(estado, '12meses')
    console.log('[dashboard KPI]', JSON.stringify({ mes, trimestre, '12meses': anual }))
  })

  it('mantiene la calibración del inventario y margen anual', () => {
    const estado = crearEstadoInicial(FECHA_REFERENCIA)
    const kpis = kpisDashboard(estado, '12meses')
    const costoVentas = redondearDosDecimales(kpis.ventasNetas.valor - kpis.utilidadBruta.valor)
    expect(kpis.margenBrutoPct.valor).toBeGreaterThanOrEqual(22)
    expect(kpis.margenBrutoPct.valor).toBeLessThanOrEqual(32)
    expect(kpis.rotacion.valor).toBeGreaterThanOrEqual(4)
    expect(kpis.rotacion.valor).toBeLessThanOrEqual(6)
    expect(kpis.coberturaDias.valor).toBeGreaterThanOrEqual(60)
    expect(kpis.coberturaDias.valor).toBeLessThanOrEqual(90)
    expect(kpis.valorInventario.valor).toBeGreaterThanOrEqual(30000)
    expect(kpis.valorInventario.valor).toBeLessThanOrEqual(50000)
    expect(kpis.valorInventario.valor).toBeLessThan(costoVentas)
    expect(kpis.dso.valor).toBeGreaterThanOrEqual(30)
    expect(kpis.dso.valor).toBeLessThanOrEqual(50)
    expect(kpis.ticketPromedio.valor).toBeGreaterThanOrEqual(4500)
    expect(kpis.ticketPromedio.valor).toBeLessThanOrEqual(6500)
    expect(kpis.porPagar.valor / kpis.comprasFacturadas.valor).toBeGreaterThanOrEqual(0.2)
    expect(kpis.porPagar.valor / kpis.comprasFacturadas.valor).toBeLessThanOrEqual(0.35)
  })

  it('calibra compras contra costo de ventas, caja y actividad trimestral', () => {
    const estado = crearEstadoInicial(FECHA_REFERENCIA)
    const anual = kpisDashboard(estado, '12meses')
    const trimestre = resolverPeriodo('trimestre', FECHA_REFERENCIA).actual
    const costoAnual = redondearDosDecimales(estado.movimientosInventario.filter((movimiento) => movimiento.tipo === 'Salida por venta' && estaEnRango(movimiento.fecha.slice(0, 10), '2025-11-01', FECHA_REFERENCIA)).reduce((total, movimiento) => total + movimiento.cantidad * movimiento.costoUnitario, 0))
    const costoTrimestral = redondearDosDecimales(estado.movimientosInventario.filter((movimiento) => movimiento.tipo === 'Salida por venta' && estaEnRango(movimiento.fecha.slice(0, 10), trimestre.desde, trimestre.hasta)).reduce((total, movimiento) => total + movimiento.cantidad * movimiento.costoUnitario, 0))
    expect(anual.comprasFacturadas.valor / costoAnual).toBeGreaterThanOrEqual(0.9)
    expect(anual.comprasFacturadas.valor / costoAnual).toBeLessThanOrEqual(1.1)
    expect(trimestre.desde).toBe('2026-08-01')
    expect(kpisDashboard(estado, 'trimestre').comprasFacturadas.valor / costoTrimestral).toBeGreaterThanOrEqual(0.55)
    expect(kpisDashboard(estado, 'trimestre').comprasFacturadas.valor / costoTrimestral).toBeLessThanOrEqual(0.9)
    for (let index = 0; index < 12; index += 1) {
      const mes = new Date(`${FECHA_REFERENCIA}T12:00:00.000Z`)
      mes.setUTCDate(1)
      mes.setUTCMonth(mes.getUTCMonth() - index)
      const etiqueta = mes.toISOString().slice(0, 7)
      expect(estado.comprobantes.some((comprobante) => 'compraId' in comprobante && comprobante.estado === 'Emitido' && comprobante.fechaEmision.startsWith(etiqueta))).toBe(true)
    }
    let acumulado = 0
    const movimientos = estado.movimientosCaja.map((movimiento, index) => ({ movimiento, index })).sort((a, b) => a.movimiento.fecha.localeCompare(b.movimiento.fecha) || a.index - b.index)
    for (const { movimiento } of movimientos) {
      acumulado = redondearDosDecimales(acumulado + (movimiento.tipo === 'Ingreso' ? movimiento.monto : -movimiento.monto))
      expect(acumulado).toBeGreaterThanOrEqual(0)
    }
    const saldoFinal = redondearDosDecimales(selectSaldoCaja(estado) + estado.cuentasBancarias.reduce((total, cuenta) => total + selectSaldoBanco(estado, cuenta.id), 0))
    expect(saldoFinal).toBeGreaterThanOrEqual(20000)
    expect(saldoFinal).toBeLessThanOrEqual(80000)
  })

  it('calcula el DSO con CxC pendiente y ventas con IGV de los últimos 90 días', () => {
    const estado = crearEstadoInicial(FECHA_REFERENCIA)
    const desde = sumarDiasISO(FECHA_REFERENCIA, -89)
    const numerador = estado.cuentasCobrar.reduce((total, cuenta) => total + selectSaldoCuenta(estado, cuenta.id), 0)
    const denominador = ventasFacturadasEnRango(estado, desde, FECHA_REFERENCIA)
    const esperado = denominador === 0 ? 0 : redondearDosDecimales((numerador / denominador) * 90)
    expect(kpisDashboard(estado, '12meses').dso.valor).toBe(esperado)
    expect(desde).toBe('2026-07-10')
    console.log('[dashboard DSO]', { numerador: redondearDosDecimales(numerador), denominador, desde, hasta: FECHA_REFERENCIA, dso: esperado })
  })

  it('usa el mismo selector base de ventas facturadas para ventanas iguales', () => {
    const estado = crearEstadoInicial(FECHA_REFERENCIA)
    const ventana = { desde: '2026-07-10', hasta: FECHA_REFERENCIA } as const
    const selectorBase = totalFacturadoVentas(estado, ventana)
    const kpiParaLaMismaVentana = ventasFacturadas(estado, { actual: ventana, anterior: null, granularidad: 'dia' }).valor
    expect(kpiParaLaMismaVentana).toBe(selectorBase)
  })

  it('mantiene actividad suficiente en los últimos 30 días para ambas fechas de referencia', () => {
    for (const fecha of ['2026-10-07', '2027-03-15'] as const) {
      const estado = crearEstadoInicial(fecha)
      const desde = new Date(`${fecha}T12:00:00.000Z`)
      desde.setUTCDate(desde.getUTCDate() - 30)
      const desdeISO = desde.toISOString().slice(0, 10)
      const enVentana = (valor: string) => valor >= desdeISO && valor <= fecha
      const ventas = estado.ventas.filter((venta) => enVentana(venta.fecha))
      const facturadas = estado.comprobantes.filter((comprobante) => comprobante.estado === 'Emitido' && comprobante.tipo !== 'Nota de crédito' && 'ventaId' in comprobante && enVentana(comprobante.fechaEmision))
      const comprasRecibidas = estado.recepciones.filter((recepcion) => enVentana(recepcion.fecha))
      const pagos = estado.pagos.filter((pago) => 'cuentaPagarId' in pago && enVentana(pago.fecha))
      const cobros = estado.pagos.filter((pago) => 'cuentaCobrarId' in pago && enVentana(pago.fecha))
      console.log('[dashboard actividad]', fecha, { ventas: ventas.length, facturadas: facturadas.length, cobros: cobros.length, comprasRecibidas: comprasRecibidas.length, pagosProveedor: pagos.length })
      expect(ventas.length).toBeGreaterThanOrEqual(8)
      expect(facturadas.length).toBeGreaterThanOrEqual(5)
      expect(cobros.length).toBeGreaterThanOrEqual(3)
      expect(comprasRecibidas.length).toBeGreaterThanOrEqual(6)
      expect(pagos.length).toBeGreaterThanOrEqual(3)
    }
  })

  it('mantiene las sumas de las series y calcula los KPI del mes', () => {
    const estado = crearEstadoInicial(FECHA_REFERENCIA)
    const mes = rangoMesActual(FECHA_REFERENCIA)
    const serieMensual = serieVentasCompras(estado, FECHA_REFERENCIA, 'mensual')

    expect(serieMensual).toHaveLength(12)
    for (const punto of serieMensual) {
      expect(punto.ventas).toBe(ventasFacturadasEnRango(estado, punto.desde, punto.hasta))
      expect(punto.compras).toBe(comprasFacturadasEnRango(estado, punto.desde, punto.hasta))
    }
    expect(sumaImportes(serieMensual.map((punto) => punto.ventas))).toBe(ventasFacturadasEnRango(estado, serieMensual[0].desde, FECHA_REFERENCIA))
    expect(ventasDelMes(estado, FECHA_REFERENCIA).importe).toBe(ventasFacturadasEnRango(estado, mes.desde, mes.hasta))
  })

  it('calcula utilidad bruta sin IGV y agrupa ventas por categoría', () => {
    const estado = crearEstadoInicial(FECHA_REFERENCIA)
    const mes = rangoMesActual(FECHA_REFERENCIA)
    const utilidad = utilidadDelMes(estado, FECHA_REFERENCIA)
    const costoDelMes = redondearDosDecimales(estado.movimientosInventario.filter((movimiento) => movimiento.tipo === 'Salida por venta' && estaEnRango(movimiento.fecha.slice(0, 10), mes.desde, mes.hasta)).reduce((total, movimiento) => total + movimiento.cantidad * movimiento.costoUnitario, 0))

    expect(utilidad.importe).toBe(redondearDosDecimales(baseNetaEnRango(estado, mes.desde, mes.hasta) - costoDelMes))
    expect(sumaImportes(ventasPorCategoria(estado, FECHA_REFERENCIA, '12meses').map((categoria) => categoria.importe))).toBe(baseNetaEnRango(estado, '2025-11-01', FECHA_REFERENCIA))
    expect(ventasPorCategoria(estado, FECHA_REFERENCIA, 'mes')).toHaveLength(estado.categorias.length)
    expect(ventasPorCategoria(estado, FECHA_REFERENCIA, '3meses')).toHaveLength(estado.categorias.length)
  })

  it('alinea stock crítico del dashboard con el contador del sidebar', () => {
    const estado = crearEstadoInicial(FECHA_REFERENCIA)
    expect(stockCritico(estado, 40).map((item) => item.productoId).sort()).toEqual(selectProductosStockCritico(estado).sort())
    expect(stockCritico(estado, 40)).toHaveLength(5)
  })

  it('distribuye los saldos pendientes en las cuatro franjas', () => {
    const estado = crearEstadoInicial(FECHA_REFERENCIA)
    for (const resumen of [cuentasPorCobrar(estado, FECHA_REFERENCIA), cuentasPorPagar(estado, FECHA_REFERENCIA)]) {
      expect(sumaImportes(Object.values(resumen.distribucion))).toBe(resumen.totalPendiente)
      expect(Object.values(resumen.cantidadPorFranja).every((cantidad) => cantidad > 0)).toBe(true)
    }
  })

  it('es determinista y recalcula la ventana con otra fecha de referencia', () => {
    const fecha = '2027-03-15'
    const primero = crearEstadoInicial(fecha)
    const segundo = crearEstadoInicial(fecha)
    const serie = serieVentasCompras(primero, fecha, 'mensual')
    expect(JSON.stringify(primero)).toBe(JSON.stringify(segundo))
    expect(serie).toHaveLength(12)
    expect(ventasDelMes(primero, fecha).importe).toBe(ventasFacturadasEnRango(primero, '2027-03-01', fecha))
    expect(Number.isFinite(utilidadDelMes(primero, fecha).deltaPorcentaje)).toBe(true)
  })
})

describe('visibilidad y exportación del dashboard', () => {
  it('expone los widgets según la matriz de permisos', () => {
    expect(widgetsVisiblesParaRol('Administrador')).toEqual(dashboardWidgets.map((widget) => widget.id))
    expect(widgetsVisiblesParaRol('Contador')).toEqual(dashboardWidgets.map((widget) => widget.id))
    expect(widgetsVisiblesParaRol('Vendedor')).toEqual(['ventasMes', 'stockCritico', 'cuentasPorCobrar', 'rotacionInventario', 'serieVentas', 'ventasPorCategoria', 'cuentasPorVencer', 'operacionesRecientes', 'embudoPedidos', 'topClientes', 'topProductos', 'antiguedadCxC', 'bandejaAcciones'])
    expect(widgetsVisiblesParaRol('Almacenero')).toEqual(['ventasMes', 'comprasMes', 'stockCritico', 'rotacionInventario', 'serieVentas', 'serieCompras', 'ventasPorCategoria', 'operacionesRecientes', 'embudoPedidos', 'topClientes', 'topProductos', 'bandejaAcciones'])
  })

  it('genera CSV con BOM, comas y decimales con punto', () => {
    const csv = construirCsvDashboard({
      ventas: { importe: 1234.5, deltaPorcentaje: 10.25 },
      compras: { importe: 456.78, deltaPorcentaje: -2.5 },
      utilidad: { importe: 777.72, deltaPorcentaje: 0 },
      stockCritico: 5,
      serieMensual: [{ etiqueta: 'octubre, 26', desde: '2026-10-01', hasta: '2026-10-07', ventas: 1234.5, compras: 456.78 }],
    })
    expect(csv.startsWith('\ufeff')).toBe(true)
    expect(csv).toContain('Ventas del mes,1234.50,10.25')
    expect(csv).toContain('"octubre, 26",2026-10-01,2026-10-07,1234.50,456.78')
  })
})
