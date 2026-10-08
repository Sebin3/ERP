import { beforeEach, describe, expect, it, vi } from 'vitest'
import { contadoresSidebarVisiblesParaRol, gruposVisiblesParaRol, navigationGroups, navigationRoutes, navigationSidebar, rutaPermitidaParaRol, rutasVisiblesParaRol } from '../../modules/navigation'
import { puede, puedeEnEstado } from '../permissions'
import { selectCuentasCobrarVencidas, selectCuentasVencidas, selectProductosStockCritico, selectVentasPendientesAprobacion } from '../selectors'
import { createERPStore, SEED_VERSION, STORAGE_KEY } from '../store'
import type { StateStorage } from 'zustand/middleware'

function storage(): StateStorage & { values: Map<string, string> } {
  const values = new Map<string, string>()
  return {
    values,
    getItem: (name) => values.get(name) ?? null,
    setItem: (name, value) => { values.set(name, value) },
    removeItem: (name) => { values.delete(name) },
  }
}

const reloj = (fecha: string) => () => `${fecha}T12:00:00.000Z`

describe('store de Zustand', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('persiste y rehidrata sin regenerar la fecha de referencia', () => {
    const local = storage()
    const first = createERPStore({ storage: local, reloj: reloj('2026-10-07') })
    expect(first.getState().iniciarSesion('usr-001').ok).toBe(true)
    const fecha = first.getState().fechaReferencia
    const second = createERPStore({ storage: local, reloj: reloj('2027-03-15') })

    expect(fecha).toBe('2026-10-07')
    expect(second.getState().fechaReferencia).toBe(fecha)
    expect(second.getState().seedVersion).toBe(SEED_VERSION)
  })

  it('restablece la semilla con otra fecha y cierra la sesión', () => {
    const local = storage()
    let fecha = '2026-10-07'
    const store = createERPStore({ storage: local, reloj: () => `${fecha}T12:00:00.000Z` })
    expect(store.getState().iniciarSesion('usr-001').ok).toBe(true)
    fecha = '2027-03-15'
    const reset = store.getState().restablecerDatosEjemplo()

    expect(reset.ok).toBe(true)
    expect(store.getState().fechaReferencia).toBe('2027-03-15')
    expect(store.getState().usuarioActualId).toBeNull()
  })

  it('reinicia sin error ante JSON corrupto o una versión de semilla distinta', () => {
    const corrupto = storage()
    corrupto.values.set(STORAGE_KEY, '{no es json')
    expect(() => createERPStore({ storage: corrupto, reloj: reloj('2027-03-15') })).not.toThrow()
    expect(createERPStore({ storage: corrupto, reloj: reloj('2027-03-15') }).getState().fechaReferencia).toBe('2027-03-15')

    const versionado = storage()
    const original = createERPStore({ storage: versionado, reloj: reloj('2026-10-07') })
    expect(original.getState().iniciarSesion('usr-001').ok).toBe(true)
    const persisted = JSON.parse(versionado.values.get(STORAGE_KEY) ?? '{}') as { state: Record<string, unknown>; version: number }
    persisted.state.seedVersion = 'semilla-antigua'
    versionado.values.set(STORAGE_KEY, JSON.stringify(persisted))
    const reset = createERPStore({ storage: versionado, reloj: reloj('2027-03-15') })

    expect(original.getState().fechaReferencia).toBe('2026-10-07')
    expect(reset.getState().fechaReferencia).toBe('2027-03-15')
  })

  it('tolera el error de cuota y expone un aviso sin romper el store', () => {
    const quota: StateStorage = {
      getItem: () => null,
      setItem: () => { throw new Error('QuotaExceededError') },
      removeItem: () => undefined,
    }
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const store = createERPStore({ storage: quota, reloj: reloj('2026-10-07') })
    expect(() => store.getState().iniciarSesion('usr-001')).not.toThrow()
    expect(warning).toHaveBeenCalled()
    expect(store.getState().persistenciaAviso).toContain('cuota')
  })

  it('login y logout generan auditoría y no dejan usuario actual al cerrar sesión', () => {
    const store = createERPStore({ storage: storage(), reloj: reloj('2026-10-07') })
    expect(store.getState().usuarioActualId).toBeNull()
    expect(store.getState().iniciarSesion('usr-001').ok).toBe(true)
    expect(store.getState().auditoria.at(-1)?.accion).toBe('Iniciar sesión')
    expect(store.getState().cerrarSesion().ok).toBe(true)
    expect(store.getState().usuarioActualId).toBeNull()
    expect(store.getState().auditoria.at(-1)?.accion).toBe('Cerrar sesión')
  })

  it('una acción fallida desde el store conserva estado y auditoría', () => {
    const store = createERPStore({ storage: storage(), reloj: reloj('2026-10-07') })
    const before = store.getState()
    const result = store.getState().aprobarVenta('venta-inexistente', 'usr-001')

    expect(result.ok).toBe(false)
    expect(store.getState().ventas).toBe(before.ventas)
    expect(store.getState().auditoria).toBe(before.auditoria)
  })

  it('usa la matriz completa para menú y guarda de cada ruta', () => {
    const roles = ['Administrador', 'Vendedor', 'Almacenero', 'Contador'] as const
    for (const rol of roles) {
      const menuIds = new Set(rutasVisiblesParaRol(rol).map((route) => route.id))
      for (const route of navigationRoutes) {
        expect(menuIds.has(route.id)).toBe(route.showInSidebar === true && puede(rol, route.resource, 'ver'))
        expect(rutaPermitidaParaRol(rol, route)).toBe(puede(rol, route.resource, 'ver'))
      }
    }
  })

  it('permite configurar permisos por rol y refleja el cambio en menú, guarda y persistencia', () => {
    const local = storage()
    const store = createERPStore({ storage: local, reloj: reloj('2026-10-07') })
    const state = store.getState()
    const role = state.roles.find((item) => item.nombre === 'Administrador')
    expect(role).toBeDefined()
    if (!role) return
    const reportPermissionIds = new Set(state.permisos.filter((item) => item.recurso === 'Reportes').map((item) => item.id))
    const withoutReports = role.permisoIds.filter((id) => !reportPermissionIds.has(id))
    const result = store.getState().editarPermisosRol({ usuarioId: 'usr-001', rolId: role.id, permisoIds: withoutReports })

    expect(result.ok).toBe(true)
    expect(puedeEnEstado(store.getState(), 'Administrador', 'Reportes', 'ver')).toBe(false)
    expect(rutasVisiblesParaRol('Administrador', store.getState()).some((route) => route.id === 'reportes')).toBe(false)
    expect(rutaPermitidaParaRol('Administrador', navigationRoutes.find((route) => route.id === 'reportes')!, store.getState())).toBe(false)
    expect(store.getState().auditoria.at(-1)?.accion).toBe('Cambiar permisos')

    const rehydrated = createERPStore({ storage: local, reloj: reloj('2027-03-15') })
    expect(puedeEnEstado(rehydrated.getState(), 'Administrador', 'Reportes', 'ver')).toBe(false)

    const auditBefore = rehydrated.getState().auditoria.length
    const failed = rehydrated.getState().editarPermisosRol({ usuarioId: 'usr-001', rolId: role.id, permisoIds: ['permiso-inexistente'] })
    expect(failed.ok).toBe(false)
    expect(rehydrated.getState().auditoria).toHaveLength(auditBefore)
  })

  it('muestra exactamente los hijos permitidos de cada grupo por rol', () => {
    const expected = {
      Administrador: {
        comercial: ['Cotizaciones', 'Ventas'], compras: ['Solicitudes', 'Órdenes'], inventario: ['Recepción', 'Despachos', 'Kardex', 'Transferencias', 'Ajustes'], finanzas: ['Facturación', 'Cuentas por cobrar', 'Cuentas por pagar', 'Caja', 'Bancos'], maestros: ['Clientes', 'Proveedores', 'Productos', 'Almacenes'], administracion: ['Usuarios', 'Roles', 'Permisos', 'Auditoría'],
      },
      Vendedor: {
        comercial: ['Cotizaciones', 'Ventas'], compras: [], inventario: ['Despachos', 'Kardex', 'Ajustes'], finanzas: ['Facturación', 'Cuentas por cobrar'], maestros: ['Clientes', 'Proveedores', 'Productos', 'Almacenes'], administracion: [],
      },
      Almacenero: {
        comercial: ['Ventas'], compras: ['Solicitudes', 'Órdenes'], inventario: ['Recepción', 'Despachos', 'Kardex', 'Transferencias', 'Ajustes'], finanzas: [], maestros: ['Clientes', 'Proveedores', 'Productos', 'Almacenes'], administracion: [],
      },
      Contador: {
        comercial: ['Cotizaciones', 'Ventas'], compras: ['Solicitudes', 'Órdenes'], inventario: ['Recepción', 'Despachos', 'Kardex', 'Transferencias', 'Ajustes'], finanzas: ['Facturación', 'Cuentas por cobrar', 'Cuentas por pagar', 'Caja', 'Bancos'], maestros: ['Clientes', 'Proveedores', 'Productos', 'Almacenes'], administracion: ['Auditoría'],
      },
    } as const
    for (const [rol, groups] of Object.entries(expected)) {
      const actual = Object.fromEntries(gruposVisiblesParaRol(rol as keyof typeof expected).map((group) => [group.id, group.routes.map((route) => route.label)]))
      expect(actual).toEqual(Object.fromEntries(Object.entries(groups).filter(([, labels]) => labels.length > 0)))
    }
  })

  it('mantiene Maestros después de Documentos en el orden visual del sidebar', () => {
    expect(navigationSidebar).toEqual([
      { type: 'group', id: 'comercial' },
      { type: 'group', id: 'compras' },
      { type: 'group', id: 'inventario' },
      { type: 'group', id: 'finanzas' },
      { type: 'route', id: 'documentos' },
      { type: 'route', id: 'reportes' },
      { type: 'group', id: 'maestros' },
      { type: 'group', id: 'administracion' },
      { type: 'route', id: 'configuracion' },
    ])
  })

  it('los contadores del sidebar coinciden con selectores y solo se muestran con permiso de ver', () => {
    const store = createERPStore({ storage: storage(), reloj: reloj('2026-10-07') })
    const state = store.getState()
    const sales = selectVentasPendientesAprobacion(state)
    const critical = selectProductosStockCritico(state).length
    const overdue = selectCuentasCobrarVencidas(state, state.fechaReferencia)

    expect(sales).toBe(state.ventas.filter((venta) => venta.estado === 'Pendiente').length)
    expect(critical).toBe(selectProductosStockCritico(state).length)
    expect(overdue).toBe(selectCuentasVencidas(state, state.fechaReferencia).filter((id) => state.cuentasCobrar.some((cuenta) => cuenta.id === id)).length)
    expect(puede('Administrador', 'Ventas', 'ver')).toBe(true)
    expect(puede('Vendedor', 'Ventas', 'aprobar')).toBe(true)
    expect(puede('Contador', 'Ventas', 'aprobar')).toBe(false)
    expect(puede('Administrador', 'Cuentas por cobrar', 'ver')).toBe(true)
    expect(puede('Almacenero', 'Cuentas por cobrar', 'ver')).toBe(false)
    expect(contadoresSidebarVisiblesParaRol('Almacenero')).not.toContain('cuentasCobrarVencidas')
    expect(contadoresSidebarVisiblesParaRol('Vendedor')).toContain('ventasPendientes')
    expect(contadoresSidebarVisiblesParaRol('Vendedor')).toContain('productosStockCritico')
    expect(contadoresSidebarVisiblesParaRol('Almacenero')).toContain('productosStockCritico')
    expect(contadoresSidebarVisiblesParaRol('Almacenero')).not.toContain('ventasPendientes')
    expect(contadoresSidebarVisiblesParaRol('Contador')).not.toContain('ventasPendientes')
    expect(navigationGroups.find((group) => group.id === 'inventario')).toMatchObject({ counter: 'productosStockCritico', counterResource: 'Productos' })
    expect(navigationGroups.find((group) => group.id === 'maestros')?.counter).toBeUndefined()
  })
})
