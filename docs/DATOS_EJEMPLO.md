# Plan de datos simulados

La versión vigente de la semilla es `2026.10.07.v1` y usa como fecha de referencia
`2026-10-07`. El generador determinista vive en `src/services/seed/`, usa un PRNG con
semilla fija y expone `crearEstadoInicial(fechaReferencia)`. Este servicio reemplaza a
una futura API durante la demo.

## Volumen inicial y coherencia

Todos los registros se distribuyen dentro de los últimos 12 meses respecto a la fecha de la demo. Los valores son ficticios y monetarios en PEN.

| Colección | Cantidad inicial | Regla de coherencia |
| --- | ---: | --- |
| Usuarios | 8 | Al menos dos Administradores y un usuario de cada rol operativo; cada usuario tiene un único `rolId`. |
| Roles | 4 | Coinciden con la matriz de permisos. |
| Permisos | Matriz completa | [PERMISOS.md](./PERMISOS.md) es la única fuente de acceso. |
| Clientes | 18 | DNI/RUC únicos; los clientes con RUC pueden recibir Factura y los de DNI pueden recibir Boleta. |
| Proveedores | 12 | RUC únicos y días de crédito definidos. |
| Categorías | 6 | Abarrotes, bebidas, limpieza, cuidado personal, ferretería ligera y descartables. |
| Productos | 40 | SKU único; todos apuntan a una categoría activa. |
| Almacenes | 3 | Lima, Arequipa y Trujillo; estados activos. |
| Movimientos de inventario | 200 | 120 saldos iniciales, 49 salidas por venta, 1 devolución, 24 entradas por recepción, 4 movimientos de transferencia y 2 ajustes. |
| Cotizaciones | 36 | Ítems apuntan a productos existentes y los estados son compatibles con las fechas. |
| Ventas | 60 | Cada venta tiene cliente, almacén y detalles existentes; los importes se derivan. |
| Detalles de venta | 60 | Una línea positiva por venta; sus `ventaId` y productos existen. |
| Comprobantes | 73 | 47 Facturas, 25 Boletas y 1 Nota de crédito; las series quedan en F001, B001 y NC01. |
| Solicitudes de compra | 20 | Almacén y solicitante existen; sus estados de atención se derivan cuando corresponde. |
| Órdenes de compra | 25 | Proveedor y solicitud opcional existentes. |
| Compras | 25 | Cada compra fue creada al emitir una OrdenCompra. |
| Detalles de compra | 25 | Una línea positiva por compra; sus `compraId` existen y cuadran con las órdenes. |
| Recepciones | 24 | Incluyen una recepción parcial y una compra recibida en dos partes; nunca exceden lo ordenado. |
| Transferencias | 3 | Dos completadas con salida/entrada emparejadas y una solicitada sin movimientos. |
| Cuentas por cobrar | 49 | Una por comprobante de venta, incluida la anulada; saldo y estado se derivan. 12 conservan saldo pendiente y 10 están vencidas a la fecha de referencia. |
| Cuentas por pagar | 23 | Una por compra facturada; 17 están pagadas y 6 conservan saldo pendiente. |
| Cuentas bancarias | 2 | BCP e Interbank, en PEN; los saldos son derivados. |
| Movimientos de caja | 59 | Uno por cada pago, con referencia y monto coincidentes. |
| Pagos | 59 | 42 cobros de clientes y 17 pagos a proveedores. |
| Documentos | 12 | Vinculados a ventas, compras, clientes y proveedores existentes. |
| Solicitudes de ajuste de inventario | 3 | Dos aprobadas producen movimientos y una permanece pendiente. |
| Configuración | 1 versión activa | IGV 18 %, almacén Lima Centro y series F001, B001 y NC01. |
| Registros de auditoría | 658 | Cada acción crítica de la carga inicial queda trazada. |

`StockPorAlmacen` no tiene filas sembradas. Se calcula siempre desde `MovimientoInventario`; tampoco se siembran reservas, saldos, totales ni estados derivados.

## Tres registros de referencia por entidad

Los identificadores siguientes son ejemplos mínimos. El generador puede crear el volumen restante, pero debe conservar las referencias y reglas mostradas.

### Seguridad, maestros y configuración

| Entidad | Registro 1 | Registro 2 | Registro 3 |
| --- | --- | --- | --- |
| Usuario | `usr-001` Ana Torres / `rol-admin` | `usr-002` Luis Quispe / `rol-ven` | `usr-003` Rosa Medina / `rol-alm` |
| Rol | `rol-admin` Administrador | `rol-ven` Vendedor | `rol-alm` Almacenero |
| Permiso | `perm-comercial-ver` Comercial/ver | `perm-ventas-aprobar` Comercial/aprobar | `perm-inv-ajustar-aprobar` Ajustes de inventario/aprobar |
| Cliente | `cli-001` Comercial Andina SAC / RUC 20100000001 | `cli-002` Bodega El Sol / DNI 45678901 | `cli-003` Ferretería Norte EIRL / RUC 20400000003 |
| Proveedor | `prov-001` Importaciones Pacífico SAC | `prov-002` Distribuciones Lima EIRL | `prov-003` Envases del Sur SAC |
| Categoría | `cat-001` Abarrotes | `cat-002` Limpieza | `cat-003` Bebidas |
| Producto | `prd-001` Arroz Extra 5 kg / `cat-001` / S/ 22.90 | `prd-002` Detergente 1 kg / `cat-002` / S/ 8.50 | `prd-003` Agua 625 ml / `cat-003` / S/ 1.80 |
| Almacén | `alm-001` Lima Centro | `alm-002` Arequipa | `alm-003` Trujillo |
| Configuración | `config-001` Activa / IGV 18 % / almacén `alm-001` / F001-B001-NC01 | — | — |

La semilla mantiene una sola configuración activa. La evolución histórica de configuración queda fuera de este seed para evitar duplicar valores que deben derivarse de la configuración vigente.

### Inventario y comercial

| Entidad | Registro 1 | Registro 2 | Registro 3 |
| --- | --- | --- | --- |
| MovimientoInventario | `mov-001` Saldo inicial / prd-001 / alm-001 / 190 entrada | `mov-002` Salida por venta / prd-003 / alm-002 / 30 / referencia `ven-002` | `mov-003` Entrada por compra / prd-001 / alm-001 / 60 / referencia `com-001` |
| SolicitudAjusteInventario | `aj-001` prd-001/alm-001 / 240 / Pendiente | `aj-002` prd-002/alm-001 / 175 / Aprobada | `aj-003` prd-003/alm-002 / 400 / Rechazada |
| ItemCotizacion | `ic-001` prd-001 × 20 a S/ 22.90 | `ic-002` prd-002 × 15 a S/ 8.50 | `ic-003` prd-003 × 50 a S/ 1.80 |
| Cotización | `cot-001` COT-0001 / cli-001 / Enviada | `cot-002` COT-0002 / cli-002 / Aceptada | `cot-003` COT-0003 / cli-003 / Vencida |
| DetalleVenta | `dv-001` ven-001 / prd-001 × 10 | `dv-002` ven-001 / prd-002 × 5 | `dv-003` ven-002 / prd-003 × 30 |
| Venta | `ven-001` V-0001 / cli-001 / Aprobado / sin comprobante, reserva activa | `ven-002` V-0002 / cli-002 / Facturado | `ven-003` V-0003 / cli-003 / Facturado / saldo cero: visible Cobrado |
| Comprobante | `cmp-001` Factura F001-000001 / venta `ven-002` | `cmp-002` Factura F001-000002 / venta `ven-003` | `cmp-003` Nota de crédito NC01-000001 / venta `ven-004` / relacionada a `cmp-004` / S/ 100.00 |

`ven-001` no tiene `Salida por venta`; solo reserva. `mov-002` corresponde a `ven-002`, que sí está facturada. No se usan Boletas con clientes cuyo documento sea RUC en estos ejemplos.

### Compras

| Entidad | Registro 1 | Registro 2 | Registro 3 |
| --- | --- | --- | --- |
| ItemSolicitudCompra | `isc-001` prd-001 × 100 | `isc-002` prd-002 × 80 | `isc-003` prd-003 × 300 |
| SolicitudCompra | `sol-001` SC-0001 / alm-001 / Solicitada | `sol-002` SC-0002 / alm-002 / Aprobada | `sol-003` SC-0003 / alm-003 / Atendida derivada |
| ItemOrdenCompra | `ioc-001` prd-001 × 100 a S/ 18.00 | `ioc-002` prd-002 × 80 a S/ 6.20 | `ioc-003` prd-003 × 300 a S/ 0.90 |
| OrdenCompra | `oc-001` OC-0001 / prov-001 / Ordenada | `oc-002` OC-0002 / prov-002 / Atendida derivada | `oc-003` OC-0003 / prov-003 / Anulada |
| DetalleCompra | `dc-001` `com-001` / prd-001 × 100 | `dc-002` `com-001` / prd-002 × 80 | `dc-003` `com-002` / prd-003 × 300 |
| Compra | `com-001` CMP-0001 / `oc-001` / Recibida derivada | `com-002` CMP-0002 / `oc-002` / Facturada | `com-003` CMP-0003 / `oc-003` / Anulada |
| ItemRecepcion | `ir-001` rec-001 / prd-001 × 100 | `ir-002` rec-001 / prd-002 × 80 | `ir-003` rec-002 / prd-003 × 300 |
| Recepcion | `rec-001` REC-0001 / `com-001` / Completa derivada | `rec-002` REC-0002 / `com-002` / Completa derivada | `rec-003` REC-0003 / `com-003` / Anulada por reversa |

La relación usa siempre los identificadores de compra `com-001`, `com-002`, `com-003`.

### Transferencias y finanzas

| Entidad | Registro 1 | Registro 2 | Registro 3 |
| --- | --- | --- | --- |
| ItemTransferencia | `it-001` trf-001 / prd-001 × 30 | `it-002` trf-001 / prd-002 × 20 | `it-003` trf-002 / prd-003 × 100 |
| Transferencia | `trf-001` TRF-0001 / Lima → Arequipa / Completada derivada | `trf-002` TRF-0002 / Arequipa → Trujillo / Solicitada | `trf-003` TRF-0003 / Lima → Trujillo / Anulada |
| CuentaCobrar | `cxc-001` cli-002 / venta `ven-002` / saldo derivado S/ 1,250.00 | `cxc-002` cli-003 / venta `ven-003` / saldo derivado S/ 0.00 | `cxc-003` cli-001 / venta `ven-004` / saldo derivado S/ 380.00 después de NC por S/ 100.00 |
| CuentaPagar | `cxp-001` prov-001 / compra `com-002` / saldo derivado S/ 2,180.00 | `cxp-002` prov-002 / compra `com-004` / saldo derivado S/ 0.00 | `cxp-003` prov-003 / compra `com-005` / saldo derivado S/ 760.00 |
| CuentaBancaria | `ban-001` BCP / ****1234 | `ban-002` Interbank / ****5678 | `ban-003` BBVA / ****9012 |
| MovimientoCaja | `mc-001` Ingreso / referencia `Pago/pag-002` / S/ 300.00 | `mc-002` Egreso / referencia `Pago/pag-001` / S/ 1,000.00 | `mc-003` Ingreso / referencia `Pago/pag-003` / S/ 850.00 |
| Pago | `pag-001` Pago proveedor / cxp-001 / S/ 1,000.00 | `pag-002` Cobro cliente / cxc-001 / S/ 300.00 | `pag-003` Cobro cliente / cxc-002 / S/ 850.00 |
| Documento | `doc-001` cotizacion-cot-001.pdf / cot-001 | `doc-002` factura-cmp-001.pdf / cmp-001 | `doc-003` orden-oc-001.pdf / oc-001 |
| RegistroAuditoria | `aud-001` Crear cliente cli-001 | `aud-002` Aprobar venta ven-001 | `aud-003` Registrar cobro pag-003 |

Los ejemplos `cxc-001` y `cxc-002` coinciden con los clientes de `ven-002` y `ven-003`. Los movimientos de caja referencian pagos existentes, no identificadores `cob-xxx` inexistentes.

## Reglas del generador

1. Con fecha de referencia `2026-10-07`, generar configuración, roles y permisos desde `src/store/permissions.ts`, usuarios, maestros, saldos iniciales, transacciones, comprobantes/cuentas, cobros/pagos y documentos, en ese orden. Las fechas históricas se inyectan mediante el contexto de reloj y los ids mediante su generador determinista.
2. Nunca generar un `StockPorAlmacen` independiente: calcularlo al consumir movimientos.
3. Nunca fijar reservas, saldos, estados ni totales: usar selectores y fórmulas del modelo.
4. Cada `Pago` debe tener un movimiento de caja con mismo monto, moneda, fecha de negocio y referencia.
5. Cada venta facturada debe tener una `Salida por venta`; una venta aprobada no facturada solo reserva stock. Cada compra recibida debe tener una `Entrada por compra`; cada transferencia completa debe tener una salida y una entrada emparejadas.
6. Un ajuste aprobado debe ser `Ajuste entrada` o `Ajuste salida` según la diferencia calculada; la dirección se almacena en `MovimientoInventario.tipo`.
7. `Compra` se crea al emitir `OrdenCompra`; `Recibida`, `Pagada`, `Parcial`, `Atendida`, `Cobrado` y estados de cuentas son resultados derivados.
8. No usar cantidades cero, importes negativos ni referencias a entidades inexistentes.

## Distribución final de procesos

- Ventas: 3 Borrador, 3 Pendiente, 3 Aprobadas sin facturar con reserva, 48 Facturadas y 3 Anuladas. Una de las anuladas fue facturada y produjo una Nota de crédito, devolución al kardex y reversión de su CxC.
- Compras: 25 creadas al emitir su OrdenCompra; 23 facturadas, 17 pagadas, 6 pendientes y 2 anuladas antes de recepción.
- Inventario: 5 productos quedan en stock crítico porque su saldo inicial en Lima Centro está por debajo del mínimo; no se escribe stock directamente.
- Importes de referencia: ventas facturadas activas por S/ 118,043.66, compras facturadas por S/ 65,897.45, CxC pendiente por S/ 17,077.14 y CxP pendiente por S/ 17,117.52.
