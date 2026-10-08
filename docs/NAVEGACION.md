# Navegación

Los nombres de ruta son estables y los identificadores de entidades viajan como parámetros. Los contadores son derivados del store y solo muestran pendientes accionables. Los roles de acceso no se definen aquí: esta tabla se genera desde la acción `ver` de [PERMISOS.md](./PERMISOS.md), que es la única fuente de acceso para router, guards y sidebar.

## Jerarquía visual del sidebar

La navegación separa los procesos de negocio de los registros maestros. Esta clasificación es visual y no cambia las URLs históricas ni los recursos de permisos. El orden recomendado del sidebar prioriza el trabajo operativo y deja **Maestros al final**, porque sus registros se reutilizan desde todos los procesos:

- **Comercial:** Cotizaciones y Ventas.
- **Compras:** Solicitudes y Órdenes.
- **Inventario:** Recepción, Despachos, Kardex, Transferencias y Ajustes.
- **Finanzas:** Facturación, Cuentas por cobrar, Cuentas por pagar, Caja y Bancos.
- **Maestros:** Clientes, Proveedores, Productos y Almacenes.
- **Administración:** Usuarios, Roles, Permisos y Auditoría.
- **Accesos directos:** Dashboard, Documentos, Reportes y Configuración.

Orden visual: Dashboard → Comercial → Compras → Inventario → Finanzas → Documentos → Reportes → Maestros → Administración → Configuración.

Clientes, proveedores, productos y almacenes son fichas maestras existentes en la empresa: se consultan y mantienen desde este grupo, pero no representan procesos de venta, compra o movimiento de inventario. El sidebar, los grupos visibles y las guardas se generan desde `navigation.ts` usando únicamente el permiso `ver` definido en [PERMISOS.md](./PERMISOS.md).

| Path | Pantalla | Roles con acceso | Contador en sidebar |
| --- | --- | --- | --- |
| `/` | Dashboard | Administrador, Vendedor, Almacenero, Contador | No |
| `/comercial/clientes` | Clientes | Administrador, Vendedor, Almacenero, Contador | No |
| `/comercial/clientes/:clienteId` | Ficha de cliente | Administrador, Vendedor, Almacenero, Contador | No |
| `/comercial/cotizaciones` | Cotizaciones | Administrador, Vendedor, Contador | No |
| `/comercial/cotizaciones/nueva` | Nueva cotización | Administrador, Vendedor | No |
| `/comercial/cotizaciones/:cotizacionId` | Detalle de cotización | Administrador, Vendedor, Contador | No |
| `/comercial/ventas` | Ventas | Administrador, Vendedor, Almacenero, Contador | Sí: pendientes de aprobación |
| `/comercial/ventas/nueva` | Nueva venta | Administrador, Vendedor | No |
| `/comercial/ventas/:ventaId` | Detalle de venta | Administrador, Vendedor, Almacenero, Contador | No |
| `/comercial/facturacion` | Facturación | Administrador, Vendedor, Contador | No |
| `/compras/proveedores` | Proveedores | Administrador, Vendedor, Almacenero, Contador | No |
| `/compras/proveedores/:proveedorId` | Ficha de proveedor | Administrador, Vendedor, Almacenero, Contador | No |
| `/compras/solicitudes` | Solicitudes de compra | Administrador, Almacenero, Contador | No |
| `/compras/solicitudes/nueva` | Nueva solicitud | Administrador, Almacenero | No |
| `/compras/ordenes` | Órdenes de compra | Administrador, Almacenero, Contador | No |
| `/compras/ordenes/:ordenCompraId` | Detalle de orden | Administrador, Almacenero, Contador | No |
| `/compras/recepcion` | Recepción de compras | Administrador, Almacenero, Contador | No |
| `/compras/recepcion/:ordenCompraId` | Registrar recepción | Administrador, Almacenero, Contador | No |
| `/inventario/despachos` | Despachos | Administrador, Vendedor, Almacenero, Contador | No |
| `/inventario/ajustes` | Ajustes de inventario | Administrador, Vendedor, Almacenero, Contador | No |
| `/inventario/productos` | Productos | Administrador, Almacenero, Vendedor, Contador | Sí: productos con stock crítico |
| `/inventario/productos/:productoId` | Ficha de producto; allí se solicitan ajustes | Administrador, Vendedor, Almacenero, Contador | No |
| `/inventario/almacenes` | Almacenes | Administrador, Vendedor, Almacenero, Contador | No |
| `/inventario/almacenes/:almacenId` | Ficha de almacén | Administrador, Vendedor, Almacenero, Contador | No |
| `/inventario/kardex` | Kardex | Administrador, Vendedor, Almacenero, Contador | No |
| `/inventario/transferencias` | Transferencias | Administrador, Almacenero, Contador | No |
| `/inventario/transferencias/nueva` | Nueva transferencia | Administrador, Almacenero | No |
| `/finanzas/cuentas-cobrar` | Cuentas por cobrar | Administrador, Contador, Vendedor | Sí: vencidas |
| `/finanzas/cuentas-pagar` | Cuentas por pagar | Administrador, Contador | Sí: vencidas |
| `/finanzas/caja` | Caja | Administrador, Contador | No |
| `/finanzas/bancos` | Bancos | Administrador, Contador | No |
| `/documentos` | Documentos | Administrador, Vendedor, Almacenero, Contador | No |
| `/documentos/:documentoId` | Detalle de documento | Administrador, Vendedor, Almacenero, Contador | No |
| `/reportes` | Centro de reportes | Administrador, Vendedor, Almacenero, Contador | No |
| `/reportes/ventas` | Reporte de ventas | Administrador, Vendedor, Almacenero, Contador | No |
| `/reportes/compras` | Reporte de compras | Administrador, Vendedor, Almacenero, Contador | No |
| `/reportes/inventario` | Reporte de inventario y kardex | Administrador, Vendedor, Almacenero, Contador | No |
| `/reportes/finanzas` | Reporte financiero | Administrador, Vendedor, Almacenero, Contador | No |
| `/administracion/usuarios` | Usuarios | Administrador | No |
| `/administracion/roles` | Roles | Administrador | No |
| `/administracion/permisos` | Permisos | Administrador | No |
| `/administracion/auditoria` | Auditoría | Administrador, Contador | Sí: eventos recientes críticos |
| `/configuracion` | Configuración general | Administrador | No |

## Reglas de navegación

- El router, los guards y el sidebar se generan desde `PERMISOS.md`; no se mantiene una segunda lista manual de roles en las páginas.
- El router oculta y protege rutas según la combinación de rol y acción `ver`; ocultar un enlace no reemplaza la guarda de acceso.
- El recurso `Reportes` es único en la matriz; por eso sus rutas derivadas comparten el mismo acceso `ver`.
- `:clienteId`, `:proveedorId`, `:productoId`, `:almacenId`, `:ventaId` y demás parámetros se validan contra el store antes de cargar una ficha.
- Un contador no es un dato persistido: se calcula filtrando estados y fechas del store.
- Los únicos contadores del sidebar son Ventas pendientes, Inventario con stock crítico y Cuentas por cobrar vencidas; cada uno se muestra solo si el rol puede ver su `counterResource`.
- El acceso a `/comercial/facturacion` no permite crear una venta; solo toma ventas aprobadas y ejecuta `facturarVenta`.
