# Organización funcional

Los grupos del sidebar representan áreas funcionales. Sus opciones son submódulos; las pantallas de creación y detalle pertenecen al mismo submódulo y comparten su recurso de permisos.

| Área | Submódulos |
| --- | --- |
| Comercial | Cotizaciones, Pedidos de venta |
| Compras | Solicitudes de compra, Órdenes de compra |
| Inventario | Existencias, Recepciones de compra, Salidas por venta, Transferencias, Ajustes de inventario, Kardex |
| Finanzas | Comprobantes, Cuentas por cobrar, Cuentas por pagar, Caja, Bancos |
| Datos maestros | Clientes, Proveedores, Productos, Almacenes |
| Administración | Usuarios, Roles, Permisos, Auditoría |

Inicio, Gestión documental, Reportes y Configuración son accesos transversales.

Existencias separa existencia física, reservas y disponibilidad por producto y almacén. Productos mantiene el catálogo. La disponibilidad mostrada en el catálogo no debe confundirse con la existencia física.

Comprobantes reúne documentos de ventas y compras. La emisión se realiza desde la operación de origen. Recepciones pertenece a Inventario y enlaza con la orden de compra.

## Compatibilidad

Se conservan los identificadores de permisos y de entidades para mantener las configuraciones guardadas. La administración obtiene sus recursos y nombres visibles de la navegación, incluyendo Salidas por venta. Existencias utiliza el permiso de consulta de Productos.

Las rutas anteriores de facturación, recepción y despachos redirigen a sus nuevas ubicaciones. Los permisos se verifican al acceder al destino.

## Alcance pendiente para producción

Esta reorganización no implementa contabilidad general, conciliación bancaria, cierres de caja, autenticación real ni backend. El estado continúa almacenado localmente.

La salida de inventario todavía se genera al facturar. Salidas por venta es una consulta del kardex, no una gestión independiente de entregas. La anulación de una venta facturada sigue generando nota de crédito y devolución de stock en el flujo simulado. Para producción deben separarse despacho físico, facturación y recepción de devoluciones, con cantidades parciales y trazabilidad propia.
