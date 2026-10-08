# Dashboard

## Alcance

El dashboard es una lectura pura de `ERPState`. No guarda totales, saldos, stock ni estados propios. La implementación está organizada en `src/store/selectors/dashboard/`, con `index.ts` como punto de entrada único.

Todos los selectores reciben el estado y consultan `estado.fechaReferencia`. No usan `Date.now()` ni fechas actuales implícitas.

## Periodos

`resolverPeriodo(periodo, fechaReferencia)` devuelve `actual`, `anterior` y `granularidad`:

| Periodo | Actual | Comparación | Granularidad |
| --- | --- | --- | --- |
| `mes` | Desde el primer día del mes hasta la fecha de referencia | Mismo tramo del mes anterior | `dia` |
| `trimestre` | Los tres meses que terminan en la fecha de referencia | Los tres meses inmediatamente anteriores | `semana` |
| `12meses` | Desde el primer día de hace 11 meses hasta la fecha de referencia | `null` cuando no se solicita una ventana previa | `mes` |

Las fechas son inclusivas. La UI debe ocultar la comparación cuando `anterior` sea `null`.

## Selectores y fórmulas

### KPI

`kpisDashboard` agrupa los siguientes selectores. Cada resultado tiene `{ valor, anterior, deltaPct, sparkline }`; el delta es `null` si el valor anterior es cero o no existe y la sparkline tiene como máximo 12 puntos.

| KPI | Fórmula |
| --- | --- |
| `ventasFacturadas` | Suma de comprobantes de venta emitidos, incluido IGV. Las notas de crédito no se cuentan como ventas. |
| `ventasNetas` | Base de ventas facturadas menos la base de notas de crédito emitidas, sin IGV. |
| `comprasFacturadas` | Suma de comprobantes de compra emitidos, incluido IGV. |
| `utilidadBruta` | `ventasNetas - costoVentas`; el costo sale de movimientos `Salida por venta`. |
| `margenBrutoPct` | `utilidadBruta / ventasNetas * 100`; cero si no hay ventas netas. |
| `ticketPromedio` | `ventasFacturadas / cantidad de comprobantes de venta`. |
| `nVentas` | Cantidad de comprobantes de venta emitidos del periodo. |
| `cobrado` | Suma de pagos de tipo `Cobro cliente` registrados en el periodo. |
| `porCobrar` | Suma actual de saldos positivos de CxC. |
| `dso` | `saldo CxC pendiente a la fecha de referencia / ventas facturadas con IGV desde fechaReferencia - 89 días hasta fechaReferencia * 90`; la ventana es inclusiva y tiene exactamente 90 días. Si el denominador es cero, devuelve cero. |
| `porPagar` | Suma actual de saldos positivos de CxP. |
| `productosStockCritico` | Cantidad de productos activos con disponibilidad bajo su mínimo en algún almacén. |
| `valorInventario` | Suma de `stock físico * costo promedio` por producto y almacén. |
| `rotacion` | Costo de ventas de los últimos 12 meses dividido entre el valor actual del inventario. |
| `coberturaDias` | `valorInventario / costo de ventas de 12 meses * 365`; cero si no existe costo. |

### Series y composición comercial

- `serieVentasCompras` crea puntos diarios, semanales o mensuales según el periodo y suma comprobantes emitidos. Cada punto incluye `ventasAnterior` cuando existe una ventana anterior y `parcial`, que es `true` para el día, semana o mes que todavía está en curso respecto a `fechaReferencia`.
- `flujoCaja` agrupa `MovimientoCaja` en ingresos, egresos, neto y saldo acumulado; también devuelve el saldo actual de caja y la suma de bancos.
- `embudoPedidos(estado, periodo)` expone pedidos creados, aprobados, facturados y cobrados derivados de las ventas del periodo. Cada etapa incluye cantidad, monto y porcentaje de conversión. No recorta datos: cada etapa es un subconjunto de la anterior.
- `conversionCotizaciones(estado, periodo)` es independiente del embudo de pedidos. Devuelve cotizaciones emitidas, aceptadas y convertidas a venta —una cotización convertida tiene una venta con `cotizacionId`—, además de las tasas de aceptación y conversión.
- `ventasPorCategoria` calcula ventas netas por categoría, conserva las cinco mayores y agrupa el resto como `Otras`.
- `topClientes` ordena clientes por monto facturado y `topProductos` por monto facturado, incluyendo unidades. Ambos aceptan un límite de cinco por defecto.

### Saldos e inventario

- `antiguedadCxC` y `antiguedadCxP` devuelven las franjas `Vigente`, `1-30`, `31-60` y `+60`, con monto y cantidad. Solo consideran cuentas con saldo positivo.
- `valorInventarioPorCategoria` y `valorInventarioPorAlmacen` calculan valor y porcentaje sobre el total.
- `stockCritico` devuelve producto, disponibilidad (`stock - reservado`), mínimo, ratio disponibilidad/mínimo y el almacén con mayor existencia. El stock siempre proviene del kardex y la reserva de ventas aprobadas no facturadas.
- `cuentasPorVencer` lista CxC con saldo positivo vencidas o con vencimiento dentro de los siguientes siete días, ordenadas por urgencia.

### Bandeja y actividad

`bandejaAcciones` devuelve solo ítems con cantidad mayor a cero: ventas por aprobar, ventas por facturar, CxC vencida, CxP vencida, solicitudes por aprobar, órdenes por recibir, transferencias solicitadas, ajustes pendientes y stock crítico. Cada ítem declara `ruta`, `recurso` y `accion`; quien lo consume debe aplicar `puede(rol, recurso, accion)`.

`operacionesRecientes` combina ventas facturadas, recepciones, cobros y pagos según `tiposPermitidos`, con tipo, documento, tercero, monto y fecha.

## Permisos y presentación

La visibilidad de widgets, acciones y contadores se decide fuera de estos selectores mediante `puede(rol, recurso, accion)`. Los selectores no conocen React, Zustand ni la sesión actual.

Los contadores del sidebar usan estos criterios: ventas pendientes requiere `Ventas/aprobar`; stock crítico requiere `Productos/ver`; cuentas por cobrar vencidas requiere `Cuentas por cobrar/ver`.

La exportación CSV y los widgets existentes consumen la fachada compatible sin duplicar cálculos de negocio.
