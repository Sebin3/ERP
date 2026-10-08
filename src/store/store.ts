import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import type { ID, ISODateOnly, RolSistema } from '../types'
import { crearEstadoInicial, SEED_VERSION } from '../services/seed'
import {
  aceptarCotizacion,
  editarConfiguracion,
  editarPermisosRol,
  editarUsuario,
  aprobarAjuste,
  anularAjuste,
  rechazarAjuste,
  aprobarSolicitudCompra,
  aprobarVenta,
  anularCompra,
  anularTransferencia,
  anularVenta,
  actualizarCotizacion,
  cerrarSesion as cerrarSesionPuro,
  crearCotizacion,
  crearOrdenCompra,
  crearSolicitudCompra,
  crearTransferencia,
  crearVenta,
  editarAlmacen,
  editarCliente,
  editarProducto,
  editarProveedor,
  emitirOrdenCompra,
  ejecutarTransferencia,
  enviarCotizacion,
  enviarVenta,
  facturarCompra,
  facturarVenta,
  iniciarSesion as iniciarSesionPuro,
  recibirCompra,
  registrarCobro,
  registrarPagoProveedor,
  registrarSaldoInicial,
  solicitarAjuste,
  solicitarCompra,
  solicitarTransferencia,
  subirDocumentoSimulado,
  transferirStock,
  exportarReporte,
  restablecerDatosEjemplo as restablecerDatosEjemploPuro,
} from './actions'
import type { ActionContext, ActionResult, ERPState } from './state'

const STORAGE_KEY = 'erp-enterprisecloud-store-v1'

export interface ERPStore extends ERPState {
  usuarioActualId: ID | null
  persistenciaAviso: string | null
  limpiarPersistenciaAviso: () => void
  iniciarSesion: (usuarioId: ID) => ActionResult
  cerrarSesion: () => ActionResult
  restablecerDatosEjemplo: () => ActionResult
  crearCotizacion: (...args: Parameters<typeof crearCotizacion> extends [ERPState, infer I, ActionContext] ? [I] : never) => ActionResult
  actualizarCotizacion: (...args: Parameters<typeof actualizarCotizacion> extends [ERPState, infer I, infer C, infer U, ActionContext] ? [I, C, U] : never) => ActionResult
  enviarCotizacion: (cotizacionId: ID, usuarioId: ID) => ActionResult
  aceptarCotizacion: (cotizacionId: ID, usuarioId: ID) => ActionResult
  crearVenta: (...args: Parameters<typeof crearVenta> extends [ERPState, infer I, ActionContext] ? [I] : never) => ActionResult
  enviarVenta: (ventaId: ID, usuarioId: ID) => ActionResult
  aprobarVenta: (ventaId: ID, usuarioId: ID) => ActionResult
  facturarVenta: (...args: Parameters<typeof facturarVenta> extends [ERPState, infer I, ActionContext] ? [I] : never) => ActionResult
  registrarCobro: (...args: Parameters<typeof registrarCobro> extends [ERPState, infer I, ActionContext] ? [I] : never) => ActionResult
  anularVenta: (ventaId: ID, motivo: string, usuarioId: ID) => ActionResult
  editarUsuario: (...args: Parameters<typeof editarUsuario> extends [ERPState, infer I, ActionContext] ? [I] : never) => ActionResult
  editarConfiguracion: (...args: Parameters<typeof editarConfiguracion> extends [ERPState, infer I, ActionContext] ? [I] : never) => ActionResult
  editarPermisosRol: (...args: Parameters<typeof editarPermisosRol> extends [ERPState, infer I, ActionContext] ? [I] : never) => ActionResult
  crearSolicitudCompra: (...args: Parameters<typeof crearSolicitudCompra> extends [ERPState, infer I, ActionContext] ? [I] : never) => ActionResult
  solicitarCompra: (solicitudId: ID, usuarioId: ID) => ActionResult
  aprobarSolicitudCompra: (solicitudId: ID, usuarioId: ID) => ActionResult
  crearOrdenCompra: (...args: Parameters<typeof crearOrdenCompra> extends [ERPState, infer I, ActionContext] ? [I] : never) => ActionResult
  emitirOrdenCompra: (ordenCompraId: ID, usuarioId: ID) => ActionResult
  recibirCompra: (...args: Parameters<typeof recibirCompra> extends [ERPState, infer I, ActionContext] ? [I] : never) => ActionResult
  facturarCompra: (...args: Parameters<typeof facturarCompra> extends [ERPState, infer I, ActionContext] ? [I] : never) => ActionResult
  registrarPagoProveedor: (...args: Parameters<typeof registrarPagoProveedor> extends [ERPState, infer I, ActionContext] ? [I] : never) => ActionResult
  anularCompra: (compraId: ID, motivo: string, usuarioId: ID) => ActionResult
  registrarSaldoInicial: (...args: Parameters<typeof registrarSaldoInicial> extends [ERPState, infer I, ActionContext] ? [I] : never) => ActionResult
  crearTransferencia: (...args: Parameters<typeof crearTransferencia> extends [ERPState, infer I, ActionContext] ? [I] : never) => ActionResult
  solicitarTransferencia: (transferenciaId: ID, usuarioId: ID) => ActionResult
  ejecutarTransferencia: (...args: Parameters<typeof ejecutarTransferencia> extends [ERPState, infer I, ActionContext] ? [I] : never) => ActionResult
  transferirStock: (...args: Parameters<typeof transferirStock> extends [ERPState, infer I, ActionContext] ? [I] : never) => ActionResult
  anularTransferencia: (transferenciaId: ID, motivo: string, usuarioId: ID) => ActionResult
  solicitarAjuste: (...args: Parameters<typeof solicitarAjuste> extends [ERPState, infer I, ActionContext] ? [I] : never) => ActionResult
  aprobarAjuste: (solicitudId: ID, usuarioId: ID) => ActionResult
  rechazarAjuste: (solicitudId: ID, motivo: string, usuarioId: ID) => ActionResult
  anularAjuste: (solicitudId: ID, motivo: string, usuarioId: ID) => ActionResult
  editarCliente: (...args: Parameters<typeof editarCliente> extends [ERPState, infer I, infer C, infer U, ActionContext] ? [I, C, U] : never) => ActionResult
  editarProveedor: (...args: Parameters<typeof editarProveedor> extends [ERPState, infer I, infer C, infer U, ActionContext] ? [I, C, U] : never) => ActionResult
  editarProducto: (...args: Parameters<typeof editarProducto> extends [ERPState, infer I, infer C, infer U, ActionContext] ? [I, C, U] : never) => ActionResult
  editarAlmacen: (...args: Parameters<typeof editarAlmacen> extends [ERPState, infer I, infer C, infer U, ActionContext] ? [I, C, U] : never) => ActionResult
  subirDocumentoSimulado: (...args: Parameters<typeof subirDocumentoSimulado> extends [ERPState, infer I, ActionContext] ? [I] : never) => ActionResult
  exportarReporte: (tipo: string, usuarioId: ID) => ActionResult<{ tipo: string }>
}

export interface ERPStoreOptions {
  reloj?: () => string
  storage?: StateStorage
}

function memoryStorage(): StateStorage {
  const values = new Map<string, string>()
  return {
    getItem: (name) => values.get(name) ?? null,
    setItem: (name, value) => { values.set(name, value) },
    removeItem: (name) => { values.delete(name) },
  }
}

function localStorageOrMemory(): StateStorage {
  try {
    if (typeof globalThis.localStorage !== 'undefined') return globalThis.localStorage
  } catch {
    // Algunos navegadores bloquean localStorage incluso cuando existe la propiedad.
  }
  return memoryStorage()
}

function safeStorage(storage: StateStorage, onQuota: () => void): StateStorage {
  return {
    getItem: (name) => {
      try {
        const value = storage.getItem(name)
        if (typeof value !== 'string') return null
        if (value) JSON.parse(value)
        return value
      } catch (cause) {
        console.warn('[EnterpriseCloud] Persistencia corrupta; se usarán datos nuevos.', cause)
        return null
      }
    },
    setItem: (name, value) => {
      try {
        storage.setItem(name, value)
      } catch (cause) {
        console.warn('[EnterpriseCloud] No se pudo guardar el estado local por límite de cuota.', cause)
        onQuota()
      }
    },
    removeItem: (name) => {
      try {
        storage.removeItem(name)
      } catch (cause) {
        console.warn('[EnterpriseCloud] No se pudo limpiar el estado local.', cause)
      }
    },
  }
}

function isoDate(reloj: () => string): ISODateOnly {
  return reloj().slice(0, 10)
}

function rolActual(estado: ERPState, usuarioId: ID | null): RolSistema | undefined {
  const usuario = estado.usuarios.find((item) => item.id === usuarioId)
  return estado.roles.find((item) => item.id === usuario?.rolId)?.nombre
}

export function createERPStore(options: ERPStoreOptions = {}) {
  const reloj = options.reloj ?? (() => new Date().toISOString())
  const initialState = crearEstadoInicial(isoDate(reloj))
  let sequence = 1
  let setStoreState: ((partial: Partial<ERPStore>) => void) | undefined
  let notifyQuota = () => {}
  let notifyingQuota = false

  const contexto = (): ActionContext => ({
    reloj,
    idGenerador: (prefijo) => `${prefijo}-store-${String(sequence++).padStart(6, '0')}`,
  })

  const commit = <T>(result: ActionResult<T>): ActionResult<T> => {
    if (result.ok) setStoreState?.(result.estado)
    return result
  }

  const persistOptions = {
    name: STORAGE_KEY,
    version: 1,
    storage: createJSONStorage(() => safeStorage(options.storage ?? localStorageOrMemory(), () => notifyQuota())),
    partialize: (state: ERPStore) => {
      const { permisos: _permisos, ...persisted } = state
      return persisted
    },
    merge: (persisted: unknown, current: ERPStore): ERPStore => {
      if (!persisted || typeof persisted !== 'object') return current
      const candidate = persisted as Partial<ERPStore>
      if (candidate.seedVersion !== SEED_VERSION) return current
      return { ...current, ...candidate, permisos: current.permisos, roles: Array.isArray(candidate.roles) ? candidate.roles : current.roles }
    },
    migrate: (persisted: unknown, version: number) => version === 1 ? persisted : {},
  }

  const storeHook = create<ERPStore>()(persist((set, get) => ({
    ...initialState,
    usuarioActualId: null,
    persistenciaAviso: null,
    limpiarPersistenciaAviso: () => set({ persistenciaAviso: null }),
    iniciarSesion: (usuarioId) => {
      const result = iniciarSesionPuro(get(), usuarioId, contexto())
      if (!result.ok) return result
      set({ ...result.estado, usuarioActualId: usuarioId })
      return result
    },
    cerrarSesion: () => {
      const usuarioId = get().usuarioActualId
      if (!usuarioId) return { ok: false, error: 'No hay una sesión iniciada.' }
      const result = cerrarSesionPuro(get(), usuarioId, contexto())
      if (!result.ok) return result
      set({ ...result.estado, usuarioActualId: null })
      return result
    },
    restablecerDatosEjemplo: () => {
      const current = get()
      if (!current.usuarioActualId) return { ok: false, error: 'Debes iniciar sesión para restablecer los datos de ejemplo.' }
      if (rolActual(current, current.usuarioActualId) !== 'Administrador') return { ok: false, error: 'Solo un Administrador puede restablecer los datos de ejemplo.' }
      const semilla = crearEstadoInicial(isoDate(reloj))
      const result = restablecerDatosEjemploPuro(current, semilla, current.usuarioActualId, contexto())
      if (!result.ok) return result
      set({ ...result.estado, usuarioActualId: null })
      return result
    },
    crearCotizacion: (input) => commit(crearCotizacion(get(), input, contexto())),
    actualizarCotizacion: (id, cambios, usuarioId) => commit(actualizarCotizacion(get(), id, cambios, usuarioId, contexto())),
    enviarCotizacion: (id, usuarioId) => commit(enviarCotizacion(get(), id, usuarioId, contexto())),
    aceptarCotizacion: (id, usuarioId) => commit(aceptarCotizacion(get(), id, usuarioId, contexto())),
    crearVenta: (input) => commit(crearVenta(get(), input, contexto())),
    enviarVenta: (id, usuarioId) => commit(enviarVenta(get(), id, usuarioId, contexto())),
    aprobarVenta: (id, usuarioId) => commit(aprobarVenta(get(), id, usuarioId, contexto())),
    facturarVenta: (input) => commit(facturarVenta(get(), input, contexto())),
    registrarCobro: (input) => commit(registrarCobro(get(), input, contexto())),
    anularVenta: (id, motivo, usuarioId) => commit(anularVenta(get(), id, motivo, usuarioId, contexto())),
    editarUsuario: (input) => commit(editarUsuario(get(), input, contexto())),
    editarConfiguracion: (input) => commit(editarConfiguracion(get(), input, contexto())),
    editarPermisosRol: (input) => commit(editarPermisosRol(get(), input, contexto())),
    crearSolicitudCompra: (input) => commit(crearSolicitudCompra(get(), input, contexto())),
    solicitarCompra: (id, usuarioId) => commit(solicitarCompra(get(), id, usuarioId, contexto())),
    aprobarSolicitudCompra: (id, usuarioId) => commit(aprobarSolicitudCompra(get(), id, usuarioId, contexto())),
    crearOrdenCompra: (input) => commit(crearOrdenCompra(get(), input, contexto())),
    emitirOrdenCompra: (id, usuarioId) => commit(emitirOrdenCompra(get(), id, usuarioId, contexto())),
    recibirCompra: (input) => commit(recibirCompra(get(), input, contexto())),
    facturarCompra: (input) => commit(facturarCompra(get(), input, contexto())),
    registrarPagoProveedor: (input) => commit(registrarPagoProveedor(get(), input, contexto())),
    anularCompra: (id, motivo, usuarioId) => commit(anularCompra(get(), id, motivo, usuarioId, contexto())),
    registrarSaldoInicial: (input) => commit(registrarSaldoInicial(get(), input, contexto())),
    crearTransferencia: (input) => commit(crearTransferencia(get(), input, contexto())),
    solicitarTransferencia: (id, usuarioId) => commit(solicitarTransferencia(get(), id, usuarioId, contexto())),
    ejecutarTransferencia: (input) => commit(ejecutarTransferencia(get(), input, contexto())),
    transferirStock: (input) => commit(transferirStock(get(), input, contexto())),
    anularTransferencia: (id, motivo, usuarioId) => commit(anularTransferencia(get(), id, motivo, usuarioId, contexto())),
    solicitarAjuste: (input) => commit(solicitarAjuste(get(), input, contexto())),
    aprobarAjuste: (id, usuarioId) => commit(aprobarAjuste(get(), id, usuarioId, contexto())),
    rechazarAjuste: (id, motivo, usuarioId) => commit(rechazarAjuste(get(), id, motivo, usuarioId, contexto())),
    anularAjuste: (id, motivo, usuarioId) => commit(anularAjuste(get(), id, motivo, usuarioId, contexto())),
    editarCliente: (id, cambios, usuarioId) => commit(editarCliente(get(), id, cambios, usuarioId, contexto())),
    editarProveedor: (id, cambios, usuarioId) => commit(editarProveedor(get(), id, cambios, usuarioId, contexto())),
    editarProducto: (id, cambios, usuarioId) => commit(editarProducto(get(), id, cambios, usuarioId, contexto())),
    editarAlmacen: (id, cambios, usuarioId) => commit(editarAlmacen(get(), id, cambios, usuarioId, contexto())),
    subirDocumentoSimulado: (input) => commit(subirDocumentoSimulado(get(), input, contexto())),
    exportarReporte: (tipo, usuarioId) => commit(exportarReporte(get(), tipo, usuarioId, contexto())),
  }), persistOptions))

  setStoreState = storeHook.setState
  notifyQuota = () => {
    if (notifyingQuota) return
    notifyingQuota = true
    setStoreState?.({ persistenciaAviso: 'No se pudo guardar el estado local: se alcanzó la cuota del almacenamiento del navegador.' })
    notifyingQuota = false
  }
  return storeHook
}

export const useERPStore = createERPStore()

export { STORAGE_KEY, SEED_VERSION }
