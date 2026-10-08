# Flujos de negocio

## Convenciones

- Los estados indicados son transiciones permitidas; cualquier otra transición produce error y no cambia el store.
- El stock físico es la suma neta de movimientos del kardex. El stock disponible es `stock físico − stock reservado`.
- Una reserva se deriva de las líneas de ventas con estado persistido `Aprobado` que aún no tienen comprobante de venta. No se guarda una reserva separada.
- Aprobar una venta reserva stock, pero no agrega movimientos. Facturar valida de nuevo la reserva, agrega la salida y libera la reserva en la misma acción.
- No se puede anular una venta facturada si su cuenta por cobrar ya tiene cobros aplicados; el flujo de devolución al cliente queda fuera del alcance.
- Cada acción crítica valida todo antes de publicar cambios y agrega auditoría. Si falla, no persiste ninguna parte.

## Venta

1. Crear venta en `Borrador` con cliente activo, almacén, vendedor y líneas positivas.
2. Enviar a revisión: `Borrador → Pendiente`.
3. Aprobar: `Pendiente → Aprobado`. Se valida producto activo y `stock disponible ≥ cantidad solicitada`. No se agrega movimiento; las líneas de la venta pasan a contar como reserva derivada.
4. Facturar: `Aprobado → Facturado`. Se valida que la reserva siga disponible, se crea una `Salida por venta` por línea, se crea el `Comprobante` y se genera la CxC. La reserva desaparece porque la venta ya está facturada.
5. Cobrar: se ejecuta el flujo de cobro. Si el saldo de la CxC queda en cero, el estado visible de la venta se deriva como `Cobrado`.

Errores: cliente inactivo, venta sin líneas, cantidad cero/negativa, producto inexistente, stock disponible insuficiente, reserva que ya no alcanza al facturar, comprobante duplicado o usuario sin permiso. En todos los casos no se agrega movimiento ni auditoría de éxito.

## Cobro

1. Seleccionar una `CuentaCobrar` con estado derivado `Pendiente` o `Vencida`.
2. Validar monto positivo, moneda PEN, que no supere el saldo derivado y que el método bancario tenga cuenta cuando corresponda.
3. Crear `Pago` de tipo `Cobro cliente` y su `MovimientoCaja` de tipo `Ingreso`.
4. El estado de la cuenta se deriva: `Pagada` si saldo es cero; `Vencida` si el saldo es mayor que cero y pasó la fecha de vencimiento; en otro caso `Pendiente`.
5. La venta se muestra como `Cobrado` solo cuando su cuenta queda pagada.

Errores: cuenta inexistente/anulada, pago mayor al saldo, método sin cuenta bancaria, monto inválido o doble aplicación del mismo pago.

## Anulación de venta

1. Una venta `Borrador` o `Pendiente` pasa a `Anulado` sin efecto en stock.
2. Una venta `Aprobado` pasa a `Anulado` y libera automáticamente la reserva derivada; no crea movimiento de kardex.
3. Una venta `Facturado` sin cobros aplicados genera una `Nota de crédito` vinculada al comprobante original y a la venta.
4. La nota de crédito genera una `Entrada por devolución` por las líneas devueltas y revierte el importe de la CxC derivado del comprobante. Si la CxC ya tiene cobros aplicados, la anulación falla; la devolución al cliente queda fuera del alcance.
5. La venta queda `Anulado` y se auditan venta, nota de crédito, devolución y reversión financiera.

Errores: falta de motivo, venta ya anulada, comprobante original inexistente, inconsistencias entre líneas y kardex, devolución superior a lo facturado o ausencia de permiso.

## Compra

1. Crear `SolicitudCompra` en `Borrador`; enviarla `Borrador → Solicitada`.
2. Aprobar solicitud `Solicitada → Aprobada`, validando líneas y almacén destino.
3. Crear `OrdenCompra` en `Borrador` con proveedor, solicitud opcional e ítems.
4. Emitir la orden: `OrdenCompra Borrador → Ordenada` y crear `Compra` en el mismo acto con estado persistido `Ordenada`. No existe una acción independiente para crear la compra.
5. Recibir cantidades: las recepciones y el avance de la compra se derivan de lo recibido frente a lo ordenado. Una recepción completa expone `Compra Recibida`.
6. Facturar la compra crea el comprobante de proveedor y lleva la compra a `Facturada`.
7. El pago se aplica a la CxP; con saldo cero la compra se muestra como `Pagada`.

Errores: proveedor inactivo, solicitud sin aprobación, orden sin proveedor, cantidades incoherentes, orden ya anulada o duplicidad de compra.

## Recepción

1. Seleccionar una `OrdenCompra` emitida y su `Compra`, con almacén destino autorizado.
2. Validar que lo recibido no supere lo pendiente por producto, que cada cantidad sea positiva y que el costo coincida o tenga justificación.
3. Crear `Recepcion` e `ItemRecepcion`; por cada ítem agregar `Entrada por compra` al almacén.
4. El estado de la recepción y de la orden se deriva comparando cantidades ordenadas, recibidas y pendientes: `Pendiente`, `Parcial` o `Completa`.
5. Auditar la recepción y cada movimiento agregado.

Errores: recepción sin compra, excedente, producto no incluido, almacén inactivo o recepción duplicada. No se ingresa stock si alguna línea no pasa validación.

## Pago a proveedor

1. Seleccionar una `CuentaPagar` con estado derivado `Pendiente` o `Vencida` originada por una compra facturada.
2. Validar monto, moneda, saldo pendiente y método/cuenta bancaria.
3. Crear `Pago` de tipo `Pago proveedor` y `MovimientoCaja` de tipo `Egreso`.
4. La cuenta queda `Pagada` solo cuando el saldo derivado llega a cero; el estado visible de la compra se actualiza por selector.
5. Auditar el pago, el movimiento de caja y la liquidación de la cuenta.

Errores: cuenta anulada, pago superior, compra no facturada, cuenta bancaria inválida o pago duplicado.

## Transferencia

1. Crear transferencia `Borrador` con almacén origen y destino diferentes.
2. Solicitar `Borrador → Solicitada`, validando productos y cantidades positivas.
3. Ejecutar `transferirStock`: comprobar stock físico disponible en origen y crear, como unidad lógica, una `Transferencia salida` en origen y una `Transferencia entrada` en destino por cada ítem.
4. El estado `Completada` se deriva de la existencia de ambas parejas de movimientos; no se guarda como estado mutable.

Errores: almacenes iguales/inactivos, stock disponible insuficiente, productos repetidos o cantidades que no cuadran. No se crea solo una mitad de la transferencia.

## Ajuste de inventario

1. El Almacenero solicita el ajuste desde la ficha del producto (`/inventario/productos/:productoId`), seleccionando almacén, cantidad esperada y motivo.
2. La solicitud queda pendiente de aprobación. El Administrador revisa y aprueba; la UI no edita stock directamente.
3. Al aprobar, calcular `diferencia = cantidadEsperada − stock físico derivado actual`.
4. Si la diferencia es mayor que cero, crear un movimiento `Ajuste entrada` con cantidad positiva. Si es menor que cero, crear `Ajuste salida` con la cantidad absoluta. La dirección queda expresada en el tipo del movimiento.
5. Auditar solicitud, aprobación, valor anterior, valor posterior, motivo y movimiento generado.

Errores: motivo vacío, diferencia cero, cantidad negativa, producto/almacén inactivo, solicitud ya procesada o usuario sin permiso. El ajuste no se permite sobre un periodo cerrado.

## Efectos resumidos

| Proceso | Stock/kardex | CxC/CxP | Caja/bancos | Auditoría |
| --- | --- | --- | --- | --- |
| Aprobar venta | Reserva derivada; no mueve kardex | Ninguno | Ninguno | Sí |
| Facturar venta | Salida por venta y liberación de reserva | Crea CxC | Ninguno | Sí |
| Cobrar | Ninguno | Reduce CxC | Ingreso | Sí |
| Anular venta aprobada | Libera reserva; no mueve kardex | Ninguno | Ninguno | Sí |
| Anular venta facturada/cobrada | Entrada por devolución | Nota de crédito revierte CxC | Según devolución futura | Sí |
| Recibir compra | Entrada por compra | Ninguno | Ninguno | Sí |
| Facturar compra | Ninguno | Crea CxP | Ninguno | Sí |
| Pagar proveedor | Ninguno | Reduce CxP | Egreso | Sí |
| Transferir | Salida + entrada | Ninguno | Ninguno | Sí |
| Ajustar | Ajuste entrada o Ajuste salida | Ninguno | Ninguno | Sí |
