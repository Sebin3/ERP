# Store de Zustand

El store global está implementado en `src/store/store.ts` y expuesto desde `src/store/index.ts`. Es una frontera delgada: no contiene reglas de negocio, cálculos de stock ni transiciones propias. Cada método delega en una acción pura de `src/store/actions/` y publica el estado únicamente cuando la acción devuelve `ok: true`.

## Forma real

`ERPStore` extiende `ERPState` con la sesión, el aviso de persistencia y los wrappers de acciones:

```ts
interface ERPStore extends ERPState {
  usuarioActualId: ID | null
  persistenciaAviso: string | null
  limpiarPersistenciaAviso(): void
  iniciarSesion(usuarioId: ID): ActionResult
  cerrarSesion(): ActionResult
  restablecerDatosEjemplo(): ActionResult
  // wrappers tipados de las acciones puras
}
```

Las colecciones de `ERPState` son las slices conceptuales del store:

| Slice conceptual | Colecciones | Regla |
| --- | --- | --- |
| Sesión | `usuarioActualId` | Un usuario de la semilla, sin contraseña real. |
| Maestros | `usuarios`, `roles`, `clientes`, `proveedores`, `productos`, `categorias`, `almacenes` | Se consultan y editan como fichas. Un usuario tiene un único `rolId`. |
| Configuración | `configuracion`, `fechaReferencia`, `seedVersion` | Contiene IGV, series con correlativo, datos de empresa y almacén por defecto. |
| Comercial | `cotizaciones`, `ventas`, `detallesVenta`, `comprobantes` | Las ventas reservan al aprobar y descuentan al facturar. |
| Compras | `solicitudesCompra`, `ordenesCompra`, `compras`, `detallesCompra`, `recepciones`, `itemsRecepcion` | `Compra` nace al emitir `OrdenCompra`. |
| Inventario | `movimientosInventario`, `transferencias`, `itemsTransferencia`, `solicitudesAjuste` | Stock, reserva y disponible son selectores; no son campos editables. |
| Finanzas | `cuentasCobrar`, `cuentasPagar`, `cuentasBancarias`, `movimientosCaja`, `pagos` | Saldos y estados se derivan de documentos, vencimientos y pagos. |
| Documentos | `documentos` | Cada documento mantiene su entidad vinculada. |
| Administración | `auditoria` y roles/permisos | La matriz de `src/store/permissions.ts` es la fuente de acceso. |

## Creación y persistencia

```ts
createERPStore({ reloj?, storage? })
useERPStore
```

La creación ejecuta `crearEstadoInicial(reloj().slice(0, 10))`. El reloj es inyectable para pruebas; la aplicación usa el reloj del navegador en este borde, no dentro de las acciones puras.

Se usa `persist` con:

- clave `erp-enterprisecloud-store-v1`;
- versión de esquema `1`;
- `localStorage` cuando está disponible y un almacenamiento en memoria como fallback;
- `fechaReferencia` y `seedVersion` persistidos, por lo que una recarga válida no regenera la semilla;
- JSON corrupto o `seedVersion` diferente: se descarta lo guardado y se crea una semilla nueva;
- migración simple: versiones distintas se tratan como estado inválido y parten de la semilla actual;
- `permisos` no se persiste; se reconstruye desde la matriz al crear el estado. En la rehidratación también se conservan los roles base actuales de la semilla;
- los datos derivados (`stock`, `reservado`, `disponible`, saldos y estados derivados) no son colecciones persistidas porque nunca forman parte de `ERPState`;
- si el navegador rechaza `setItem` por cuota, se registra un aviso en consola y se expone `persistenciaAviso` para mostrar un `Toast`, sin lanzar la excepción a la interfaz.

`restablecerDatosEjemplo()` exige una sesión de Administrador, ejecuta una semilla nueva con la fecha entregada por el reloj, conserva la auditoría de la acción y cierra la sesión. La pantalla de Configuración solicita confirmación antes de invocarla.

## Acciones publicadas

Los wrappers reciben los parámetros de negocio de la acción pura; el store inyecta el contexto de reloj e ids. Las acciones de crear reciben `usuarioId` dentro de su input. Las acciones de transición reciben normalmente `(entidadId, usuarioId)`. Las operaciones compuestas reciben su input completo:

- Comercial: `crearCotizacion`, `actualizarCotizacion`, `enviarCotizacion`, `aceptarCotizacion`, `crearVenta`, `enviarVenta`, `aprobarVenta`, `facturarVenta`, `registrarCobro`, `anularVenta`.
- Compras: `crearSolicitudCompra`, `solicitarCompra`, `aprobarSolicitudCompra`, `crearOrdenCompra`, `emitirOrdenCompra`, `recibirCompra`, `facturarCompra`, `registrarPagoProveedor`, `anularCompra`.
- Inventario: `registrarSaldoInicial`, `crearTransferencia`, `solicitarTransferencia`, `ejecutarTransferencia`, `transferirStock`, `anularTransferencia`, `solicitarAjuste`, `aprobarAjuste`, `rechazarAjuste`, `anularAjuste`.
- Maestros y documentos: `editarCliente`, `editarProveedor`, `editarProducto`, `editarAlmacen`, `subirDocumentoSimulado`, `exportarReporte`.
- Sesión y configuración: `iniciarSesion`, `cerrarSesion`, `restablecerDatosEjemplo`.

En todos los casos:

1. se toma el estado actual;
2. se llama a una función pura de `src/store/actions/`;
3. si devuelve error, se retorna el error y no se llama a `set`;
4. si tiene éxito, se publica el `estado` devuelto, que ya contiene la auditoría producida por la acción.

## Selectores reactivos y puros

Las funciones viven en `src/store/selectors/index.ts`; no son campos de `ERPStore`. Las pantallas pueden consumirlas mediante hooks de `src/hooks/`.

Selectores disponibles:

`selectStock`, `selectReservado`, `selectStockDisponible`, `selectCostoPromedio`, `selectTotalVenta`, `selectTotalCompra`, `selectSaldoCuenta`, `selectEstadoCuenta`, `selectEstadoVenta`, `selectEstadoCompra`, `selectEstadoOrdenCompra`, `selectEstadoRecepcion`, `selectEstadoTransferencia`, `selectSaldoBanco`, `selectSaldoCaja`, `selectProductosStockCritico`, `selectCuentasVencidas`, `selectAntiguedadSaldos`, `selectVentasPendientesAprobacion` y `selectCuentasCobrarVencidas`.

Reglas principales:

```text
stock = entradas del kardex - salidas del kardex
reservado = cantidades de ventas Aprobado sin comprobante de venta
disponible = stock - reservado
saldo de cuenta = importe derivado - pagos aplicados
estado de cuenta = Anulada, Pagada, Vencida o Pendiente según anulación, saldo y vencimiento
```

El estado `Cobrado` de una venta, `Pagada` de una compra, `Recibida`, `Parcial`, `Atendida`, `Completa` y `Completada` se calculan desde las relaciones correspondientes, nunca se duplican como saldos mutables.

## Hooks de conexión

- `useSesion`: usuario actual, rol, autenticación y acciones de entrar/salir.
- `usePermisos`: función `puede(recurso, accion)` basada en la matriz de permisos.
- `useContadoresSidebar`: ventas pendientes de aprobación, productos con stock crítico y cuentas por cobrar vencidas; los componentes deciden mostrarlos solo si el rol puede ver el recurso.

La navegación usa `rutasVisiblesParaRol` y `gruposVisiblesParaRol` desde `src/modules/navigation.ts`. No existe un selector temporal de rol.
