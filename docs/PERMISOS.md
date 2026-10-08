# Matriz de permisos

Este archivo es la única fuente de verdad para el acceso. Las rutas, guards, sidebar y acciones se generan a partir de esta matriz; `NAVEGACION.md` solo documenta el resultado visible.

Leyenda: `V` ver, `C` crear, `E` editar, `A` aprobar, `N` anular, `X` exportar. `—` no permitido. Un permiso del store debe comprobarse también en la ruta y en la acción de negocio.

| Módulo | Administrador | Vendedor | Almacenero | Contador |
| --- | --- | --- | --- | --- |
| Dashboard | V X | V | V | V X |
| Clientes | V C E N X | V C E X | V X | V E X |
| Cotizaciones | V C E A N X | V C E A N X | — | V X |
| Ventas | V C E A N X | V C E A N X | V | V N X |
| Facturación | V C E A N X | V C A N X | — | V C A N X |
| Proveedores | V C E N X | V X | V X | V C E N X |
| Solicitudes de compra | V C E A N X | — | V C E A N X | V A N X |
| Órdenes de compra | V C E A N X | — | V X | V C E A N X |
| Recepción | V C E A N X | — | V C E A N X | V X |
| Despachos | V C E A N X | V X | V C E A N X | V X |
| Productos | V C E N X | V X | V C E X | V X |
| Almacenes | V C E N X | V X | V C E X | V X |
| Kardex | V X | V | V X | V X |
| Transferencias | V C E A N X | — | V C E A N X | V X |
| Ajustes de inventario | V C E A N X | V X | V C E X | V X |
| Cuentas por cobrar | V C E N X | V C X | — | V C E N X |
| Cuentas por pagar | V C E N X | — | — | V C E N X |
| Caja | V C E N X | — | — | V C E N X |
| Bancos | V C E N X | — | — | V C E N X |
| Documentos | V C E N X | V C E X | V C E X | V C E X |
| Reportes | V X | V X ventas | V X inventario | V X |
| Usuarios | V C E N X | — | — | — |
| Roles | V C E N X | — | — | — |
| Permisos | V C E X | — | — | — |
| Auditoría | V X | — | — | V X |
| Configuración | V C E X | — | — | — |

## Criterios especiales

- `Administrador` tiene acceso operativo completo, pero las acciones críticas siguen dejando auditoría.
- `Vendedor` puede editar maestros comerciales autorizados, pero no productos, almacenes, stock ni caja.
- `Almacenero` puede registrar recepción, transferencias y ajustes; no puede aprobar pagos ni modificar precios de venta.
- `Contador` puede operar comprobantes, cuentas, pagos, reportes y anulaciones financieras; no administra usuarios/roles ni altera stock a mano.
- Los ajustes pueden consultarse desde su módulo y solicitarse desde la ficha de producto. El Almacenero puede crear/editar la solicitud; la aprobación `A` corresponde al Administrador antes de crear el movimiento de kardex.
- Las acciones `N` sobre documentos facturados o pagados están limitadas por los flujos: se usa reversa documentaria, no borrado.
