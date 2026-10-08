/**
 * Servicio temporal de datos simulados. Reemplaza a una futura API durante la demo.
 * La semilla se construye exclusivamente mediante las acciones de negocio.
 */
import type {
  AccionPermiso,
  Almacen,
  Categoria,
  Cliente,
  Configuracion,
  CuentaBancaria,
  DatosEmpresa,
  ID,
  Permiso,
  Producto,
  Proveedor,
  Rol,
  Usuario,
} from '../../types'
import type { ActionContext, ActionResult, ERPState } from '../../store/state'
import { matrizPermisos } from '../../store/permissions'
import {
  aceptarCotizacion,
  aprobarAjuste,
  aprobarSolicitudCompra,
  aprobarVenta,
  anularCompra,
  anularVenta,
  crearCotizacion,
  crearOrdenCompra,
  crearSolicitudCompra,
  crearTransferencia,
  crearVenta,
  emitirOrdenCompra,
  enviarCotizacion,
  enviarVenta,
  facturarCompra,
  facturarVenta,
  recibirCompra,
  registrarCobro,
  registrarPagoProveedor,
  registrarSaldoInicial,
  solicitarAjuste,
  solicitarCompra,
  solicitarTransferencia,
  subirDocumentoSimulado,
  transferirStock,
} from '../../store/actions'
import { selectSaldoCuenta, selectStock, selectTotalVenta } from '../../store/selectors'
import { redondearDosDecimales } from '../../utils'
import { crearPrng } from './prng'
import { ubicacionCliente } from '../../data/peruLocations'

export const SEED_VERSION = '2026.10.07.v4'

const SEMILLA = 0xec202610
const ADMIN_ID = 'usr-001'
const VENDEDOR_ID = 'usr-003'
const ALMACENERO_ID = 'usr-004'
const CONTADOR_ID = 'usr-005'
const ALMACEN_LIMA = 'alm-001'
const ALMACEN_AREQUIPA = 'alm-002'
const ALMACEN_TRUJILLO = 'alm-003'

interface GeneradorContexto extends ActionContext {
  fijarFecha(fecha: string): void
}

function fechaUtc(fechaReferencia: string, mesesAtras: number, dia: number): string {
  const fecha = new Date(`${fechaReferencia}T12:00:00.000Z`)
  fecha.setUTCDate(1)
  fecha.setUTCMonth(fecha.getUTCMonth() - mesesAtras)
  const maximo = new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth() + 1, 0)).getUTCDate()
  fecha.setUTCDate(Math.min(dia, maximo))
  return fecha.toISOString().slice(0, 10)
}

function fechaDiasDesdeReferencia(fechaReferencia: string, dias: number): string {
  const fecha = new Date(`${fechaReferencia}T12:00:00.000Z`)
  fecha.setUTCDate(fecha.getUTCDate() + dias)
  return fecha.toISOString().slice(0, 10)
}

function timestamp(fecha: string): string {
  return `${fecha}T12:00:00.000Z`
}

function audit(fecha: string, usuarioId: ID) {
  return { creadoEn: timestamp(fecha), creadoPorUsuarioId: usuarioId, actualizadoEn: timestamp(fecha), actualizadoPorUsuarioId: usuarioId }
}

function crearContexto(fechaReferencia: string): GeneradorContexto {
  let fechaActual = fechaReferencia
  let secuencia = 1
  return {
    reloj: () => timestamp(fechaActual),
    idGenerador: (prefijo) => `${prefijo}-${String(secuencia++).padStart(6, '0')}`,
    fijarFecha(fecha) {
      fechaActual = fecha
    },
  }
}

function aplicar<T>(_estado: ERPState, etiqueta: string, resultado: ActionResult<T>): ERPState {
  if (!resultado.ok) throw new Error(`[seed] ${etiqueta}: ${resultado.error}`)
  return resultado.estado
}

function idsExistentes(estado: ERPState): Set<ID> {
  const colecciones: Array<ReadonlyArray<{ id: ID }>> = [
    estado.usuarios, estado.roles, estado.permisos, estado.clientes, estado.proveedores, estado.productos, estado.categorias,
    estado.almacenes, estado.cotizaciones, estado.ventas, estado.detallesVenta, estado.comprobantes, estado.solicitudesCompra,
    estado.ordenesCompra, estado.compras, estado.detallesCompra, estado.recepciones, estado.itemsRecepcion, estado.transferencias,
    estado.itemsTransferencia, estado.movimientosInventario, estado.solicitudesAjuste, estado.cuentasCobrar, estado.cuentasPagar,
    estado.cuentasBancarias, estado.movimientosCaja, estado.pagos, estado.documentos,
  ]
  return new Set(colecciones.flatMap((coleccion) => coleccion.map((item) => item.id)).concat(estado.configuracion.id))
}

function crearBase(fechaReferencia: string): ERPState {
  const auditoriaBase = audit(fechaReferencia, ADMIN_ID)
  const roles: Rol[] = [
    { id: 'rol-admin', nombre: 'Administrador', descripcion: 'Acceso total al ERP.', permisoIds: [], estado: 'Activo', ...auditoriaBase },
    { id: 'rol-ven', nombre: 'Vendedor', descripcion: 'Gestión comercial y cobranzas.', permisoIds: [], estado: 'Activo', ...auditoriaBase },
    { id: 'rol-alm', nombre: 'Almacenero', descripcion: 'Gestión física del inventario y recepción.', permisoIds: [], estado: 'Activo', ...auditoriaBase },
    { id: 'rol-cont', nombre: 'Contador', descripcion: 'Gestión financiera y tributaria.', permisoIds: [], estado: 'Activo', ...auditoriaBase },
  ]
  const permisos: Permiso[] = []
  const rolesConPermisos = roles.map((rol) => {
    const permisoIds: ID[] = []
    const recursos = Object.entries(matrizPermisos[rol.nombre]) as Array<[string, readonly AccionPermiso[]]>
    for (const [recurso, acciones] of recursos) {
      for (const accion of acciones) {
        const id = `perm-${rol.id}-${recurso.toLowerCase().replaceAll(' ', '-')}-${accion}`
        permisos.push({ id, recurso: recurso as Permiso['recurso'], accion, descripcion: `${accion} en ${recurso}`, ...auditoriaBase })
        permisoIds.push(id)
      }
    }
    return { ...rol, permisoIds }
  })
  const usuarios: Usuario[] = [
    ['usr-001', 'Ana', 'Torres', 'ana.torres', 'rol-admin'],
    ['usr-002', 'Luis', 'Quispe', 'luis.quispe', 'rol-admin'],
    ['usr-003', 'Rosa', 'Medina', 'rosa.medina', 'rol-ven'],
    ['usr-004', 'Marco', 'Salazar', 'marco.salazar', 'rol-alm'],
    ['usr-005', 'Elena', 'Paredes', 'elena.paredes', 'rol-cont'],
    ['usr-006', 'Jorge', 'Vega', 'jorge.vega', 'rol-ven'],
    ['usr-007', 'Paola', 'Ríos', 'paola.rios', 'rol-alm'],
    ['usr-008', 'Diego', 'Cárdenas', 'diego.cardenas', 'rol-cont'],
  ].map(([id, nombres, apellidos, nombreUsuario, rolId]) => ({ id, nombres, apellidos, nombreUsuario, email: `${nombreUsuario}@enterprisecloud.pe`, rolId, estado: 'Activo', ...auditoriaBase }))
  const config: Configuracion = {
    id: 'config-001',
    igvPorDefecto: 0.18,
    series: {
      Factura: { serie: 'F001', correlativo: 0 },
      Boleta: { serie: 'B001', correlativo: 0 },
      'Nota de crédito': { serie: 'NC01', correlativo: 0 },
    },
    almacenPorDefectoId: ALMACEN_LIMA,
    datosEmpresa: {
      razonSocial: 'EnterpriseCloud Distribuciones SAC',
      nombreComercial: 'EnterpriseCloud',
      tipoDocumento: 'RUC',
      numeroDocumento: '20609988771',
      direccion: 'Av. República de Panamá 3555, Lima',
    } satisfies DatosEmpresa,
    estado: 'Activo',
    ...auditoriaBase,
  }
  const almacenes: Almacen[] = [
    ['alm-001', 'LIM', 'Lima Centro', 'Jr. Paruro 1250, Lima'],
    ['alm-002', 'AQP', 'Arequipa', 'Av. Parra 215, Arequipa'],
    ['alm-003', 'TRU', 'Trujillo', 'Av. España 780, Trujillo'],
  ].map(([id, codigo, nombre, direccion]) => ({ id, codigo, nombre, direccion, responsableUsuarioId: ALMACENERO_ID, estado: 'Activo', ...auditoriaBase }))
  const cuentasBancarias: CuentaBancaria[] = [
    { id: 'ban-001', banco: 'BCP', nombre: 'Cuenta corriente principal', numeroEnmascarado: '****1234', moneda: 'PEN', estado: 'Activo', ...auditoriaBase },
    { id: 'ban-002', banco: 'Interbank', nombre: 'Cuenta corriente secundaria', numeroEnmascarado: '****5678', moneda: 'PEN', estado: 'Activo', ...auditoriaBase },
  ]
  return {
    fechaReferencia,
    seedVersion: SEED_VERSION,
    usuarios, roles: rolesConPermisos, permisos, clientes: [], proveedores: [], productos: [], categorias: [], almacenes,
    configuracion: config, cotizaciones: [], ventas: [], detallesVenta: [], comprobantes: [], solicitudesCompra: [], ordenesCompra: [],
    compras: [], detallesCompra: [], recepciones: [], itemsRecepcion: [], transferencias: [], itemsTransferencia: [], movimientosInventario: [],
    solicitudesAjuste: [], cuentasCobrar: [], cuentasPagar: [], cuentasBancarias, movimientosCaja: [], pagos: [], documentos: [], auditoria: [],
  }
}

function crearMaestros(estado: ERPState, fechaReferencia: string): ERPState {
  const prng = crearPrng(SEMILLA)
  const categories = ['Abarrotes', 'Bebidas', 'Limpieza', 'Cuidado personal', 'Ferretería ligera', 'Descartables']
  const categorias: Categoria[] = categories.map((nombre, index) => ({ id: `cat-${String(index + 1).padStart(3, '0')}`, nombre, descripcion: `Categoría ${nombre.toLowerCase()}.`, estado: 'Activo', ...audit(fechaReferencia, ADMIN_ID) }))
  const nombres = ['Arroz Extra', 'Azúcar Rubia', 'Fideos Spaghetti', 'Atún en aceite', 'Aceite vegetal', 'Agua sin gas', 'Gaseosa cola', 'Jugo de naranja', 'Bebida energizante', 'Café tostado', 'Detergente polvo', 'Lavavajilla limón', 'Lejía 1L', 'Limpiavidrios', 'Desinfectante', 'Jabón líquido', 'Shampoo familiar', 'Pasta dental', 'Papel higiénico', 'Toallas húmedas', 'Clavos 2 pulgadas', 'Tornillos multiuso', 'Cinta aislante', 'Pegamento universal', 'Lija fina', 'Vasos descartables', 'Platos descartables', 'Cubiertos descartables', 'Bolsas camiseta', 'Film transparente', 'Servilletas', 'Guantes nitrilo', 'Escoba doméstica', 'Trapeador algodón', 'Esponja multiuso', 'Pilas AA', 'Foco LED', 'Extensión eléctrica', 'Cinta embalaje', 'Caja cartón']
  const unidades = ['UND', 'KG', 'LT', 'CJ', 'MT', 'PAQ'] as const
  const productos: Producto[] = nombres.map((nombre, index) => {
    const multiplicadores = [1.24, 1.24, 1.38, 1.38, 1.38, 1.30]
    const costo = redondearDosDecimales(32 + index * 2.6 + prng.int(0, 4))
    const precio = redondearDosDecimales(costo * multiplicadores[index % multiplicadores.length])
    return {
      id: `prd-${String(index + 1).padStart(3, '0')}`, sku: `SKU-${String(index + 1).padStart(4, '0')}`, codigoBarras: `775${String(1000000 + index).padStart(7, '0')}`,
      nombre, descripcion: `${nombre} para distribución nacional.`, categoriaId: categorias[index % categorias.length].id, unidadMedida: unidades[index % unidades.length],
      precioVenta: precio, costoReferencial: costo, tasaImpuesto: 0.18, stockMinimo: index < 5 ? 10 : 0, estado: 'Activo', ...audit(fechaReferencia, ADMIN_ID),
    }
  })
  const empresas = ['Comercial Andina SAC', 'Bodega El Sol SAC', 'Ferretería Norte EIRL', 'Mercados del Pacífico SAC', 'Distribuciones Santa Rosa SAC', 'Hoteles del Valle SAC', 'Restaurante La Casona SAC', 'Minimarket Los Cedros SAC', 'Servicios Generales Lima SAC', 'Constructora Horizonte SAC', 'Importadora Costa Azul SAC', 'Corporación Buen Día SAC']
  const personas = ['Carlos Huamán', 'Lucía Salas', 'Miguel Ponce', 'Rosa Valdivia', 'Daniela León', 'Óscar Campos']
  const clientes: Cliente[] = [
    ...empresas.map((razonSocial, index) => {
      const ubicacion = ubicacionCliente(index)
      return {
        id: `cli-${String(index + 1).padStart(3, '0')}`, tipoDocumento: 'RUC' as const, numeroDocumento: `20${100000000 + index}`, razonSocial,
        nombreComercial: razonSocial.split(' ')[0], direccion: `Av. Los Negocios ${100 + index}`, distrito: ubicacion.distrito, provincia: ubicacion.provincia, departamento: ubicacion.departamento,
        telefono: `01${4000000 + index}`, email: `contacto${index + 1}@empresa.pe`, limiteCredito: 12000, diasCredito: index % 3 === 0 ? 45 : 30, estado: 'Activo' as const, ...audit(fechaReferencia, ADMIN_ID),
      }
    }),
    ...personas.map((razonSocial, index) => {
      const ubicacion = ubicacionCliente(index + empresas.length)
      return {
        id: `cli-${String(index + 13).padStart(3, '0')}`, tipoDocumento: 'DNI' as const, numeroDocumento: `${45678901 + index}`, razonSocial,
        direccion: `Jr. Los Negocios ${20 + index}`, distrito: ubicacion.distrito, provincia: ubicacion.provincia, departamento: ubicacion.departamento,
        telefono: `987${String(100000 + index)}`, email: `cliente${index + 13}@correo.pe`, limiteCredito: 2500, diasCredito: 0, estado: 'Activo' as const, ...audit(fechaReferencia, ADMIN_ID),
      }
    }),
  ]
  const proveedores: Proveedor[] = Array.from({ length: 12 }, (_, index) => ({
    id: `prov-${String(index + 1).padStart(3, '0')}`, tipoDocumento: 'RUC' as const, numeroDocumento: `20${400000000 + index}`, razonSocial: ['Importaciones Pacífico SAC', 'Distribuciones Lima EIRL', 'Envases del Sur SAC', 'Alimentos del Centro SAC', 'Higiene Total SAC', 'Aceros y Más EIRL', 'Bebidas Nacionales SAC', 'Química Andina SAC', 'Comercializadora Norte SAC', 'Papelera Peruana SAC', 'Ferretería Central SAC', 'Logística del Sur SAC'][index], direccion: `Av. Industrial ${200 + index}`, distrito: index % 2 ? 'Ate' : 'Callao', provincia: 'Lima', departamento: 'Lima', contactoNombre: ['María Soto', 'Pedro Rojas', 'Andrea Núñez'][index % 3], telefono: `01${5000000 + index}`, email: `ventas${index + 1}@proveedor.pe`, diasCredito: index % 3 === 0 ? 45 : 30, estado: 'Activo' as const, ...audit(fechaReferencia, ADMIN_ID),
  }))
  return { ...estado, categorias, productos, clientes, proveedores }
}

function cantidadVenta(index: number): number {
  if (index >= 6 && index <= 9) return 2 + (index % 2)
  if (index === 10) return 12
  return 34 + (index % 11)
}

function productoVentaId(index: number): ID {
  return `prd-${String(6 + ((index * 7) % 35)).padStart(3, '0')}`
}

function almacenVentaId(index: number): ID {
  return [ALMACEN_LIMA, ALMACEN_AREQUIPA, ALMACEN_TRUJILLO][index % 3]
}

function fechaVentaPlan(fechaReferencia: string, index: number): string {
  const fechasAntiguedad: Record<number, number> = {
    12: -27, 13: -24, 14: -21, 15: -18, 16: -25, 17: 0, 20: -43, 21: -17,
    22: -74, 23: -58, 24: -74, 25: -98, 26: -109, 27: -98, 28: -11, 29: -7, 30: -3, 31: 0,
  }
  if (index in fechasAntiguedad) return fechaDiasDesdeReferencia(fechaReferencia, fechasAntiguedad[index])
  const mesesAtras = index % 12
  const dia = mesesAtras === 0 ? 3 + ((index * 3) % 5) : 12 + ((index * 3) % 12)
  return fechaUtc(fechaReferencia, mesesAtras, dia)
}

function productoCompraId(index: number): ID {
  return productoVentaId(indiceCeldaCompra(index))
}

function almacenCompraId(index: number): ID {
  return almacenVentaId(indiceCeldaCompra(index))
}

function cantidadCompra(index: number): number {
  const compraEnTrimestreActual = index === 2 || index === 12 || (index >= 17 && index <= 21)
  return compraEnTrimestreActual ? 49 + (index % 9) : 67 + (index % 13)
}

function cantidadRecibidaCompra(index: number): number {
  const cantidad = cantidadCompra(index)
  return index === 2 ? Math.floor(cantidad / 2) : cantidad
}

function indiceCeldaCompra(index: number): number {
  return 15 + (((index - 2) % 15 + 15) % 15)
}

function fechaCompraPlan(fechaReferencia: string, index: number): string {
  const fechasAntiguedad: Record<number, number> = { 16: -10, 17: 0, 18: 0, 19: 0, 20: -20, 21: -25, 22: -45, 23: -50, 24: -80 }
  if (index in fechasAntiguedad) return fechaDiasDesdeReferencia(fechaReferencia, fechasAntiguedad[index])
  if (index >= 2 && index <= 16) {
    const productoId = productoCompraId(index)
    const almacenId = almacenCompraId(index)
    const fechasVentas = Array.from({ length: 49 }, (_, offset) => 11 + offset)
      .filter((ventaIndex) => productoVentaId(ventaIndex) === productoId && almacenVentaId(ventaIndex) === almacenId)
      .map((ventaIndex) => fechaVentaPlan(fechaReferencia, ventaIndex))
      .sort()
    if (fechasVentas[0]) return fechaDiasDesdeReferencia(fechasVentas[0], -1)
  }
  return fechaUtc(fechaReferencia, index % 12, 2)
}

function fechaCompraRegistroPlan(fechaReferencia: string, index: number): string {
  const fechasAntiguedad: Record<number, number> = { 17: 0, 18: 0, 19: 0, 20: -20, 21: -25, 22: -45, 23: -50, 24: -80 }
  if (index in fechasAntiguedad) return fechaDiasDesdeReferencia(fechaReferencia, fechasAntiguedad[index])
  return fechaUtc(fechaReferencia, index % 12, 2)
}

function fechaPagoProveedorPlan(fechaReferencia: string, index: number, fechaCompra: string): string {
  const fechasRecientes: Record<number, number> = { 17: -28, 18: -24, 19: -20, 20: -16, 21: -12, 22: -8, 23: -4, 24: -1 }
  if (index in fechasRecientes) return fechaDiasDesdeReferencia(fechaReferencia, fechasRecientes[index])
  if (index === 12) return fechaDiasDesdeReferencia(fechaReferencia, -2)
  if (index >= 2 && index <= 16) return fechaDiasDesdeReferencia(fechaReferencia, -31)
  return fechaDiasDesdeReferencia(fechaCompra, 3)
}

interface EventoInventarioPlan {
  fecha: string
  orden: number
  delta: number
}

function stockInicialPlanificado(productoId: ID, almacenId: ID, fechaReferencia: string): number {
  const eventos: EventoInventarioPlan[] = []
  const agregar = (fecha: string, orden: number, delta: number) => eventos.push({ fecha, orden, delta })
  let comprasPlanificadas = 0
  let maximoRequeridoEnAcciones = 0

  for (let index = 2; index < 25; index += 1) {
    if (productoCompraId(index) === productoId && almacenCompraId(index) === almacenId) {
      comprasPlanificadas += cantidadRecibidaCompra(index)
      agregar(fechaCompraPlan(fechaReferencia, index), index, cantidadRecibidaCompra(index))
    }
  }
  for (let index = 11; index < 60; index += 1) {
    if (productoVentaId(index) !== productoId || almacenVentaId(index) !== almacenId) continue
    const fecha = fechaVentaPlan(fechaReferencia, index)
    agregar(fecha, 100 + index * 2, -cantidadVenta(index))
    if (index === 11) agregar(fecha, 101 + index * 2, cantidadVenta(index))
  }
  let salidasEnAcciones = 0
  let reservasEnAcciones = 0
  for (let index = 6; index < 60; index += 1) {
    if (productoVentaId(index) !== productoId || almacenVentaId(index) !== almacenId) continue
    const cantidad = cantidadVenta(index)
    maximoRequeridoEnAcciones = Math.max(maximoRequeridoEnAcciones, salidasEnAcciones + reservasEnAcciones + cantidad)
    if (index === 8 || index === 9) continue
    salidasEnAcciones += cantidad
    if (index === 11) salidasEnAcciones -= cantidad
  }
  const transferencias = [
    { fecha: fechaUtc(fechaReferencia, 1, 15), productoId: 'prd-006', origen: ALMACEN_LIMA, destino: ALMACEN_AREQUIPA, cantidad: 12 },
    { fecha: fechaUtc(fechaReferencia, 2, 15), productoId: 'prd-007', origen: ALMACEN_AREQUIPA, destino: ALMACEN_TRUJILLO, cantidad: 10 },
  ]
  for (const transferencia of transferencias) {
    if (transferencia.productoId !== productoId) continue
    if (transferencia.origen === almacenId) agregar(transferencia.fecha, 300, -transferencia.cantidad)
    if (transferencia.destino === almacenId) agregar(transferencia.fecha, 301, transferencia.cantidad)
  }
  const ajustes = [
    { fecha: fechaUtc(fechaReferencia, 0, 18), productoId: 'prd-009', almacenId: ALMACEN_LIMA, cantidad: 5 },
    { fecha: fechaUtc(fechaReferencia, 1, 18), productoId: 'prd-010', almacenId: ALMACEN_AREQUIPA, cantidad: -3 },
  ]
  for (const ajuste of ajustes) {
    if (ajuste.productoId === productoId && ajuste.almacenId === almacenId) agregar(ajuste.fecha, 400, ajuste.cantidad)
  }
  eventos.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.orden - b.orden)
  let acumulado = 0
  let minimo = 0
  for (const evento of eventos) {
    acumulado += evento.delta
    minimo = Math.min(minimo, acumulado)
  }
  return Math.max(1, -minimo + 1, maximoRequeridoEnAcciones - comprasPlanificadas + 1)
}

function registrarSaldos(estado: ERPState, fechaReferencia: string, contexto: GeneradorContexto): ERPState {
  const fecha = fechaUtc(fechaReferencia, 11, 7)
  let actual = estado
  for (const producto of actual.productos) {
    for (const almacen of actual.almacenes) {
      const esCritico = producto.id <= 'prd-005'
      const cantidad = esCritico && almacen.id === ALMACEN_LIMA ? 4 : esCritico ? producto.stockMinimo + 1 : stockInicialPlanificado(producto.id, almacen.id, fechaReferencia)
      contexto.fijarFecha(fecha)
      actual = aplicar(actual, `saldo inicial ${producto.id}/${almacen.id}`, registrarSaldoInicial(actual, { productoId: producto.id, almacenId: almacen.id, cantidad, costoUnitario: producto.costoReferencial, usuarioId: ADMIN_ID, fecha }, contexto))
    }
  }
  return actual
}

function generarCotizaciones(estado: ERPState, fechaReferencia: string, contexto: GeneradorContexto): ERPState {
  let actual = estado
  for (let index = 0; index < 36; index += 1) {
    const fecha = fechaUtc(fechaReferencia, index % 12, 4 + (index % 20))
    const producto = actual.productos[5 + ((index * 3) % 35)]
    contexto.fijarFecha(fecha)
    actual = aplicar(actual, `crear cotización ${index + 1}`, crearCotizacion(actual, {
      clienteId: actual.clientes[index % actual.clientes.length].id, vendedorId: VENDEDOR_ID, validezHasta: fechaUtc(fechaReferencia, Math.max(0, (index % 12) - 1), 25),
      items: [{ productoId: producto.id, descripcionProducto: producto.nombre, cantidad: 5 + (index % 12), precioUnitario: producto.precioVenta, descuento: 0, tasaImpuesto: 0.18 }], usuarioId: VENDEDOR_ID,
    }, contexto))
    const cotizacion = actual.cotizaciones[actual.cotizaciones.length - 1]
    if (index % 3 !== 0) {
      actual = aplicar(actual, `enviar cotización ${cotizacion.id}`, enviarCotizacion(actual, cotizacion.id, VENDEDOR_ID, contexto))
      if (index % 3 === 2) actual = aplicar(actual, `aceptar cotización ${cotizacion.id}`, aceptarCotizacion(actual, cotizacion.id, ADMIN_ID, contexto))
    }
  }
  return actual
}

function generarVentas(estado: ERPState, fechaReferencia: string, contexto: GeneradorContexto): ERPState {
  let actual = estado
  const ventasParaFacturar: Array<{ id: ID; index: number; fecha: string }> = []
  for (let index = 0; index < 60; index += 1) {
    const fecha = fechaVentaPlan(fechaReferencia, index)
    const producto = actual.productos.find((item) => item.id === productoVentaId(index))
    if (!producto) throw new Error(`[seed] No existe el producto planificado para la venta ${index + 1}.`)
    const esEmpresa = index % 2 === 0
    const cliente = actual.clientes[(esEmpresa ? index % 12 : 12 + (index % 6))]
    const almacenId = actual.almacenes[index % actual.almacenes.length].id
    const cotizacionesAceptadas = actual.cotizaciones.filter((cotizacion) => cotizacion.estado === 'Aceptada' && cotizacion.clienteId === cliente.id && !actual.ventas.some((venta) => venta.cotizacionId === cotizacion.id))
    const cotizacionId = index % 4 === 0 ? cotizacionesAceptadas[Math.floor(index / 4) % cotizacionesAceptadas.length]?.id : undefined
    contexto.fijarFecha(fecha)
    actual = aplicar(actual, `crear venta ${index + 1}`, crearVenta(actual, {
      clienteId: cliente.id, vendedorId: VENDEDOR_ID, almacenId, cotizacionId, condicionPago: esEmpresa ? 'Crédito' : 'Contado', plazoCreditoDias: esEmpresa ? 30 : 0,
      items: [{ productoId: producto.id, descripcionProducto: producto.nombre, cantidad: cantidadVenta(index), precioUnitario: producto.precioVenta, descuento: 0, tasaImpuesto: 0.18 }], usuarioId: VENDEDOR_ID,
    }, contexto))
    const venta = actual.ventas[actual.ventas.length - 1]
    if (index < 3) continue
    actual = aplicar(actual, `enviar venta ${venta.id}`, enviarVenta(actual, venta.id, VENDEDOR_ID, contexto))
    if (index < 6) continue
    actual = aplicar(actual, `aprobar venta ${venta.id} (índice ${index})`, aprobarVenta(actual, venta.id, ADMIN_ID, contexto))
    if (index === 8 || index === 9) {
      actual = aplicar(actual, `anular venta aprobada ${venta.id}`, anularVenta(actual, venta.id, 'Anulación de prueba comercial.', ADMIN_ID, contexto))
      continue
    }
    if (index < 11) continue
    const clienteVenta = actual.clientes.find((item) => item.id === venta.clienteId)
    const tipo = clienteVenta?.tipoDocumento === 'RUC' ? 'Factura' : 'Boleta'
    contexto.fijarFecha(fecha)
    actual = aplicar(actual, `facturar venta ${venta.id}`, facturarVenta(actual, { ventaId: venta.id, tipoComprobante: tipo, usuarioId: ADMIN_ID, fecha }, contexto))
    if (index === 11) {
      actual = aplicar(actual, `anular venta facturada ${venta.id}`, anularVenta(actual, venta.id, 'Nota de crédito de prueba.', ADMIN_ID, contexto))
    } else {
      ventasParaFacturar.push({ id: venta.id, index, fecha })
    }
  }
  for (const ventaPendiente of ventasParaFacturar) {
    if (ventaPendiente.index === 11 || (ventaPendiente.index >= 20 && ventaPendiente.index <= 27)) continue
    const venta = actual.ventas.find((item) => item.id === ventaPendiente.id)
    if (!venta) throw new Error(`[seed] No existe la venta ${ventaPendiente.id} para cobrar.`)
    const cuenta = actual.cuentasCobrar.find((item) => item.ventaId === venta.id)
    if (!cuenta) throw new Error(`[seed] La venta ${venta.id} fue facturada sin cuenta por cobrar.`)
    const total = selectTotalVenta(actual, venta.id)
    const monto = ventaPendiente.index >= 12 && ventaPendiente.index <= 17 ? redondearDosDecimales(total * 0.45) : selectSaldoCuenta(actual, cuenta.id)
    const fechaCobro = ventaPendiente.index >= 12 && ventaPendiente.index <= 17 ? fechaDiasDesdeReferencia(fechaReferencia, -25 + (ventaPendiente.index - 12) * 4) : ventaPendiente.fecha
    contexto.fijarFecha(fechaCobro)
    actual = aplicar(actual, `registrar cobro ${venta.id}`, registrarCobro(actual, { cuentaCobrarId: cuenta.id, monto, metodoPago: ventaPendiente.index % 3 === 0 ? 'Efectivo' : 'Transferencia bancaria', cuentaBancariaId: ventaPendiente.index % 3 === 0 ? undefined : 'ban-001', usuarioId: VENDEDOR_ID }, contexto))
  }
  return actual
}

function generarSolicitudes(estado: ERPState, fechaReferencia: string, contexto: GeneradorContexto): ERPState {
  let actual = estado
  for (let index = 0; index < 20; index += 1) {
    const producto = actual.productos[5 + ((index * 5) % 35)]
    contexto.fijarFecha(fechaUtc(fechaReferencia, index % 12, 5 + (index % 20)))
    actual = aplicar(actual, `crear solicitud ${index + 1}`, crearSolicitudCompra(actual, {
      solicitanteUsuarioId: ALMACENERO_ID, almacenDestinoId: actual.almacenes[index % 3].id,
      items: [{ productoId: producto.id, cantidadSolicitada: 30 + (index % 15), observacion: 'Reposición programada' }], motivo: 'Planificación de inventario.', usuarioId: ALMACENERO_ID,
    }, contexto))
    const solicitud = actual.solicitudesCompra[actual.solicitudesCompra.length - 1]
    actual = aplicar(actual, `solicitar compra ${solicitud.id}`, solicitarCompra(actual, solicitud.id, ALMACENERO_ID, contexto))
    actual = aplicar(actual, `aprobar solicitud ${solicitud.id}`, aprobarSolicitudCompra(actual, solicitud.id, ADMIN_ID, contexto))
  }
  return actual
}

function generarCompras(estado: ERPState, fechaReferencia: string, contexto: GeneradorContexto): ERPState {
  let actual = estado
  const comprasParaProcesar: Array<{ id: ID; index: number; fecha: string }> = []
  for (let index = 0; index < 25; index += 1) {
    const producto = actual.productos.find((item) => item.id === productoCompraId(index))
    if (!producto) throw new Error(`[seed] No existe el producto planificado para la compra ${index + 1}.`)
    const fecha = fechaCompraRegistroPlan(fechaReferencia, index)
    const fechaRecepcion = fechaCompraPlan(fechaReferencia, index)
    const proveedor = actual.proveedores[index % actual.proveedores.length]
    const almacenId = almacenCompraId(index)
    const cantidad = cantidadCompra(index)
    const costo = producto.costoReferencial
    contexto.fijarFecha(fecha)
    actual = aplicar(actual, `crear orden ${index + 1}`, crearOrdenCompra(actual, {
      solicitudCompraId: index < 20 ? actual.solicitudesCompra[index].id : undefined, proveedorId: proveedor.id, compradorUsuarioId: ADMIN_ID, almacenDestinoId: almacenId,
      items: [{ productoId: producto.id, cantidad, costoUnitario: costo }], fechaEntregaEsperada: fechaUtc(fechaReferencia, Math.max(0, (index % 12) - 1), 20), usuarioId: ADMIN_ID,
    }, contexto))
    const orden = actual.ordenesCompra[actual.ordenesCompra.length - 1]
    actual = aplicar(actual, `emitir orden ${orden.id}`, emitirOrdenCompra(actual, orden.id, ADMIN_ID, contexto))
    const compra = actual.compras[actual.compras.length - 1]
    if (index < 2) {
      actual = aplicar(actual, `anular compra ${compra.id}`, anularCompra(actual, compra.id, 'Anulación de orden simulada.', ADMIN_ID, contexto))
      continue
    }
    if (index === 2) {
      contexto.fijarFecha(fechaRecepcion)
      actual = aplicar(actual, `recibir compra parcial ${compra.id}`, recibirCompra(actual, { compraId: compra.id, almacenId, items: [{ productoId: producto.id, cantidadRecibida: Math.floor(cantidad / 2), costoUnitario: costo }], usuarioId: ALMACENERO_ID }, contexto))
    } else if (index === 3) {
      contexto.fijarFecha(fechaRecepcion)
      actual = aplicar(actual, `recibir primera parte ${compra.id}`, recibirCompra(actual, { compraId: compra.id, almacenId, items: [{ productoId: producto.id, cantidadRecibida: Math.floor(cantidad / 2), costoUnitario: costo }], usuarioId: ALMACENERO_ID }, contexto))
      contexto.fijarFecha(fechaRecepcion)
      actual = aplicar(actual, `recibir segunda parte ${compra.id}`, recibirCompra(actual, { compraId: compra.id, almacenId, items: [{ productoId: producto.id, cantidadRecibida: cantidad - Math.floor(cantidad / 2), costoUnitario: redondearDosDecimales(costo * 1.06) }], usuarioId: ALMACENERO_ID }, contexto))
    } else {
      contexto.fijarFecha(fechaRecepcion)
      actual = aplicar(actual, `recibir compra ${compra.id}`, recibirCompra(actual, { compraId: compra.id, almacenId, items: [{ productoId: producto.id, cantidadRecibida: cantidad, costoUnitario: costo }], usuarioId: ALMACENERO_ID }, contexto))
    }
    comprasParaProcesar.push({ id: compra.id, index, fecha })
  }
  for (const compraPendiente of comprasParaProcesar) {
    contexto.fijarFecha(compraPendiente.fecha)
    actual = aplicar(actual, `facturar compra ${compraPendiente.id}`, facturarCompra(actual, { compraId: compraPendiente.id, tipoComprobante: 'Factura', fecha: compraPendiente.fecha, usuarioId: ADMIN_ID }, contexto))
  }
  for (const compraPendiente of comprasParaProcesar) {
    const compra = actual.compras.find((item) => item.id === compraPendiente.id)
    if (!compra) throw new Error(`[seed] No existe la compra ${compraPendiente.id} para pagar.`)
    const cuenta = actual.cuentasPagar.find((item) => item.compraId === compra.id)
    if (!cuenta) throw new Error(`[seed] La compra ${compra.id} fue facturada sin cuenta por pagar.`)
    const fechaPago = fechaPagoProveedorPlan(fechaReferencia, compraPendiente.index, compraPendiente.fecha)
    contexto.fijarFecha(fechaPago)
    const esPagoParcial = compraPendiente.index === 17 || compraPendiente.index === 18
    const monto = esPagoParcial || compraPendiente.index > 18
      ? redondearDosDecimales(selectSaldoCuenta(actual, cuenta.id) * (esPagoParcial ? 0.5 : 0.25))
      : selectSaldoCuenta(actual, cuenta.id)
    actual = aplicar(actual, `pagar compra ${compra.id}`, registrarPagoProveedor(actual, { cuentaPagarId: cuenta.id, monto, metodoPago: 'Transferencia bancaria', cuentaBancariaId: 'ban-001', usuarioId: CONTADOR_ID }, contexto))
  }
  return actual
}

function generarTransferencias(estado: ERPState, fechaReferencia: string, contexto: GeneradorContexto): ERPState {
  let actual = estado
  const casos = [
    { origen: ALMACEN_LIMA, destino: ALMACEN_AREQUIPA, producto: 'prd-006', cantidad: 12 },
    { origen: ALMACEN_AREQUIPA, destino: ALMACEN_TRUJILLO, producto: 'prd-007', cantidad: 10 },
    { origen: ALMACEN_LIMA, destino: ALMACEN_TRUJILLO, producto: 'prd-008', cantidad: 8 },
  ]
  casos.forEach((caso, index) => {
    contexto.fijarFecha(fechaUtc(fechaReferencia, index + 1, 15))
    actual = aplicar(actual, `crear transferencia ${index + 1}`, crearTransferencia(actual, { almacenOrigenId: caso.origen, almacenDestinoId: caso.destino, items: [{ productoId: caso.producto, cantidad: caso.cantidad, costoUnitario: actual.productos.find((p) => p.id === caso.producto)?.costoReferencial ?? 1 }], usuarioId: ALMACENERO_ID, solicitanteUsuarioId: ALMACENERO_ID }, contexto))
    const transferencia = actual.transferencias[actual.transferencias.length - 1]
    actual = aplicar(actual, `solicitar transferencia ${transferencia.id}`, solicitarTransferencia(actual, transferencia.id, ALMACENERO_ID, contexto))
    if (index < 2) actual = aplicar(actual, `ejecutar transferencia ${transferencia.id}`, transferirStock(actual, { transferenciaId: transferencia.id, almacenOrigenId: caso.origen, almacenDestinoId: caso.destino, items: [{ productoId: caso.producto, cantidad: caso.cantidad, costoUnitario: actual.productos.find((p) => p.id === caso.producto)?.costoReferencial ?? 1 }], usuarioId: ADMIN_ID }, contexto))
  })
  return actual
}

function generarAjustes(estado: ERPState, fechaReferencia: string, contexto: GeneradorContexto): ERPState {
  let actual = estado
  const solicitudes = [
    { productoId: 'prd-009', almacenId: ALMACEN_LIMA, delta: 5 },
    { productoId: 'prd-010', almacenId: ALMACEN_AREQUIPA, delta: -3 },
    { productoId: 'prd-011', almacenId: ALMACEN_TRUJILLO, delta: 4 },
  ]
  solicitudes.forEach((item, index) => {
    contexto.fijarFecha(fechaUtc(fechaReferencia, index, 18))
    const cantidadEsperada = selectStock(actual, item.productoId, item.almacenId) + item.delta
    actual = aplicar(actual, `solicitar ajuste ${index + 1}`, solicitarAjuste(actual, { productoId: item.productoId, almacenId: item.almacenId, cantidadEsperada, motivo: `Conteo físico de control ${index + 1}.`, usuarioId: ALMACENERO_ID }, contexto))
    const solicitud = actual.solicitudesAjuste[actual.solicitudesAjuste.length - 1]
    if (index < 2) actual = aplicar(actual, `aprobar ajuste ${solicitud.id}`, aprobarAjuste(actual, solicitud.id, ADMIN_ID, contexto))
  })
  return actual
}

function generarDocumentos(estado: ERPState, fechaReferencia: string, contexto: GeneradorContexto): ERPState {
  let actual = estado
  const referencias: Array<{ entidadTipo: 'Venta' | 'Compra' | 'Cliente' | 'Proveedor'; entidadId: ID; tipo: 'Comprobante de venta' | 'Comprobante de compra' | 'Contrato' }> = [
    ...actual.ventas.slice(12, 16).map((venta) => ({ entidadTipo: 'Venta' as const, entidadId: venta.id, tipo: 'Comprobante de venta' as const })),
    ...actual.compras.slice(2, 5).map((compra) => ({ entidadTipo: 'Compra' as const, entidadId: compra.id, tipo: 'Comprobante de compra' as const })),
    ...actual.clientes.slice(0, 3).map((cliente) => ({ entidadTipo: 'Cliente' as const, entidadId: cliente.id, tipo: 'Contrato' as const })),
    ...actual.proveedores.slice(0, 2).map((proveedor) => ({ entidadTipo: 'Proveedor' as const, entidadId: proveedor.id, tipo: 'Contrato' as const })),
  ]
  referencias.forEach((referencia, index) => {
    if (!idsExistentes(actual).has(referencia.entidadId)) throw new Error(`[seed] No existe entidad para documento ${index + 1}.`)
    contexto.fijarFecha(fechaUtc(fechaReferencia, index % 12, 20))
    actual = aplicar(actual, `subir documento ${index + 1}`, subirDocumentoSimulado(actual, { tipo: referencia.tipo, nombreArchivo: `soporte-${String(index + 1).padStart(3, '0')}.pdf`, mimeType: 'application/pdf', tamanoBytes: 12000 + index * 700, entidadTipo: referencia.entidadTipo, entidadId: referencia.entidadId, urlSimulada: `/simulados/soporte-${index + 1}.pdf`, subidoPorUsuarioId: ADMIN_ID, usuarioId: ADMIN_ID }, contexto))
  })
  return actual
}

export function crearEstadoInicial(fechaReferencia: string): ERPState {
  const contexto = crearContexto(fechaReferencia)
  let estado = crearBase(fechaReferencia)
  estado = crearMaestros(estado, fechaReferencia)
  estado = registrarSaldos(estado, fechaReferencia, contexto)
  estado = generarCotizaciones(estado, fechaReferencia, contexto)
  estado = generarSolicitudes(estado, fechaReferencia, contexto)
  estado = generarCompras(estado, fechaReferencia, contexto)
  estado = generarVentas(estado, fechaReferencia, contexto)
  estado = generarTransferencias(estado, fechaReferencia, contexto)
  estado = generarAjustes(estado, fechaReferencia, contexto)
  estado = generarDocumentos(estado, fechaReferencia, contexto)
  return estado
}
