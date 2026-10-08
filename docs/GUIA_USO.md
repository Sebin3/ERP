# Guía de uso de ERP EnterpriseCloud

## 1. Alcance de esta demo

EnterpriseCloud es un frontend de ERP simulado para una distribuidora peruana. Permite recorrer maestros, procesos comerciales, compras, inventario, finanzas, documentos, reportes y administración con datos de ejemplo.

No existe backend todavía: los cambios se guardan en el `localStorage` del navegador y solo representan el comportamiento esperado del futuro sistema.

## 2. Cómo iniciar la demo

Desde la raíz del proyecto:

```bash
pnpm install
pnpm run dev
```

Abre la URL que indique Vite, normalmente `http://localhost:5173`.

También se puede validar el proyecto con:

```bash
pnpm exec tsc -b
pnpm test
pnpm run build
```

## 3. Inicio de sesión

La pantalla de Login no solicita contraseña. Elige un usuario de ejemplo para revisar la experiencia de cada rol:

| Usuario | Rol | Enfoque de la demo |
|---|---|---|
| Ana Torres | Administrador | Acceso completo, permisos, usuarios, configuración y auditoría |
| Luis Quispe | Administrador | Acceso completo |
| Rosa Medina | Vendedor | Cotizaciones, ventas, clientes y cobranzas permitidas |
| Marco Salazar | Almacenero | Recepción, stock, kardex, transferencias y ajustes |
| Elena Paredes | Contador | Facturación, cuentas, caja, bancos y reportes financieros |
| Jorge Vega | Vendedor | Experiencia comercial |
| Paola Ríos | Almacenero | Experiencia operativa de almacén |
| Diego Cárdenas | Contador | Experiencia financiera |

El usuario activo aparece en la tarjeta inferior del sidebar. Desde allí se puede cerrar sesión.

## 4. Cómo leer el sidebar

El menú se genera desde `src/modules/navigation.ts` y se filtra con la matriz de `src/store/permissions.ts`.

- `Dashboard` muestra el resumen permitido para el rol.
- `Comercial` contiene cotizaciones y ventas.
- `Compras` contiene solicitudes y órdenes.
- `Inventario` contiene recepción, despachos, kardex, transferencias y ajustes.
- `Finanzas` contiene facturación, cuentas por cobrar, cuentas por pagar, caja y bancos.
- `Documentos` y `Reportes` son accesos independientes.
- `Maestros` contiene clientes, proveedores, productos y almacenes.
- `Administración` contiene usuarios, roles, permisos y auditoría.
- `Configuración` contiene los parámetros generales de la empresa.

Los badges del sidebar son derivados del store:

- `Ventas`: ventas pendientes de aprobación.
- `Inventario`: productos con stock crítico.
- `Cuentas por cobrar`: cuentas vencidas.

En modo colapsado el número se reemplaza por un punto azul. En móvil el sidebar se abre desde el botón del topbar y cada grupo puede expandirse o contraerse.

## 5. Flujo comercial recomendado

### Cotización a venta

1. Entra a `Comercial → Cotizaciones`.
2. Abre una cotización existente o crea una nueva.
3. En estado Borrador puedes editarla.
4. Envíala para revisión.
5. Un usuario con permiso de aprobación la acepta.
6. Desde la cotización aceptada selecciona `Convertir en venta`.
7. La misma cotización no puede convertirse dos veces.

### Venta

1. Entra a `Comercial → Ventas`.
2. Crea una venta con cliente, almacén y líneas.
3. Envíala a revisión.
4. Apruébala: en este momento se reserva el stock, pero todavía no se descuenta.
5. Factúrala: se genera el comprobante, se crea la CxC y se registra la salida por venta en el kardex.
6. Registra uno o varios cobros desde el detalle de la venta o desde `Finanzas → Cuentas por cobrar`.
7. El estado `Cobrado` aparece automáticamente cuando el saldo llega a cero.

Reglas importantes:

- No se puede aprobar una venta si supera el stock disponible.
- Stock disponible = stock físico − reservas activas.
- Una boleta no se puede emitir a un cliente con RUC.
- Una venta facturada con cobros aplicados no se puede anular en esta demo.
- Una venta facturada sin cobros genera nota de crédito, devuelve stock y revierte la CxC.

## 6. Flujo de compras

1. Entra a `Compras → Solicitudes`.
2. Crea una solicitud de reposición y envíala.
3. Aprueba la solicitud si tu rol tiene permiso.
4. Desde una solicitud aprobada crea una orden de compra.
5. Emite la orden: en ese momento nace la Compra.
6. Entra a `Inventario → Recepción` o abre la recepción desde la orden.
7. Prepara una recepción parcial o total.
8. Confirma la recepción: se generan entradas en el kardex y se actualiza el costo promedio.
9. Factura la compra: se crea la CxP.
10. Registra pagos desde el detalle de recepción o `Finanzas → Cuentas por pagar`.

La recepción no puede superar las cantidades ordenadas. El estado `Recibida`, `Facturada` o `Pagada` se deriva de las recepciones y pagos.

## 7. Inventario

### Productos y almacenes

Productos y almacenes son datos maestros. Se consultan y editan desde sus fichas, pero el stock no se edita directamente.

### Kardex

El stock siempre se calcula como la suma de movimientos:

```text
entradas − salidas
```

El saldo inicial también es un movimiento de kardex. Las entradas y salidas pueden venir de compras, ventas, transferencias, devoluciones o ajustes aprobados.

### Transferencias

El flujo oficial es:

```text
Crear borrador → Solicitar → Ejecutar
```

Al ejecutar se genera una salida en el almacén origen y una entrada equivalente en el almacén destino. Si no hay stock suficiente, no se crea ninguna de las dos partes.

### Ajustes

Los ajustes se solicitan desde la ficha del producto o desde `Inventario → Ajustes`.

- Solicitar ajuste no modifica el stock.
- Aprobar ajuste crea `Ajuste entrada` o `Ajuste salida`.
- Rechazar o anular una solicitud no modifica el kardex.

## 8. Finanzas

- `Cuentas por cobrar`: documentos emitidos a clientes y sus cobros.
- `Cuentas por pagar`: compras facturadas y pagos a proveedores.
- `Caja`: movimientos en efectivo.
- `Bancos`: movimientos asociados a cuentas bancarias.
- `Facturación`: comprobantes de ventas y compras con vista previa.

Los estados de las cuentas no se editan manualmente:

- `Pendiente`: tiene saldo y aún no vence.
- `Vencida`: tiene saldo y ya pasó el vencimiento.
- `Pagada`: el saldo llegó a cero.
- `Anulada`: la cuenta fue revertida por una anulación.

## 9. Documentos y reportes

En `Documentos` se pueden subir archivos simulados y asociarlos a ventas, compras, clientes, proveedores, cotizaciones u órdenes de compra existentes.

En el detalle de un documento:

- `Vista previa` muestra el documento empresarial simulado.
- `Descargar PDF` aparece solo con el permiso `Documentos → exportar`.

`Reportes` ofrece vistas de ventas, compras, inventario y finanzas con periodos de mes, trimestre y doce meses. Los datos se derivan del store y no se escriben como totales independientes.

## 10. Administración y configuración

Solo los usuarios con permisos adecuados pueden acceder a estas áreas:

- `Usuarios`: cambia el rol único o el estado de un usuario.
- `Roles`: permite editar los permisos asignados a un rol.
- `Permisos`: consulta la matriz efectiva.
- `Auditoría`: muestra las acciones críticas realizadas.
- `Configuración`: edita IGV, empresa, almacén por defecto y consulta series.

El botón `Restablecer datos de ejemplo` reemplaza el estado actual por una semilla nueva, usando la fecha actual de la demo, y cierra la sesión. Debe usarse solo para reiniciar la demostración.

## 11. Recorrido recomendado para presentar el proyecto

1. Inicia sesión como Administrador y muestra el Dashboard.
2. Enseña el contador de ventas, stock crítico y CxC vencida.
3. Abre una ficha de producto y demuestra que el stock viene del kardex.
4. Revisa una cotización aceptada y conviértela en venta.
5. Aprueba la venta y muestra la reserva sin descuento físico.
6. Factúrala y muestra la salida, comprobante y CxC.
7. Registra un cobro parcial y luego uno total.
8. Revisa una orden de compra, registra una recepción y muestra la entrada al kardex.
9. Cambia de usuario y enseña cómo se filtran menú, acciones y contadores.
10. Finaliza con Reportes, Documentos y Auditoría.

## 12. Guion práctico para crear y demostrar operaciones

### Preparar una demostración limpia

1. Entra a `Configuración` con Ana Torres.
2. Usa `Restablecer datos de ejemplo` si hiciste pruebas anteriores.
3. Confirma la acción y vuelve a iniciar sesión.
4. Abre el Dashboard para mostrar los indicadores iniciales.

La semilla ya contiene clientes, proveedores, productos, almacenes y operaciones históricas. En esta versión esos maestros no se “compran” ni forman parte de una venta: se consultan y se editan en sus fichas. Para exponer el sistema, usa los registros precargados y crea operaciones nuevas sobre ellos.

### Crear una cotización

Ruta: `Comercial → Cotizaciones → Nueva cotización`.

1. Selecciona un cliente activo.
2. Define la fecha de validez.
3. Pulsa `Agregar línea` y selecciona un producto.
4. Ingresa cantidad, precio y descuento si corresponde.
5. Agrega observaciones opcionales.
6. Pulsa `Crear borrador`.
7. Abre la cotización creada y envíala a revisión.
8. Con un rol que tenga aprobación, acéptala y usa `Convertir en venta`.

Resultado esperado: la cotización queda relacionada con la venta y todavía no modifica stock ni crea una cuenta por cobrar.

### Crear y completar una venta

Ruta: `Comercial → Ventas → Nueva venta`.

1. Selecciona cliente y almacén.
2. Agrega uno o más productos.
3. Indica cantidades y precios.
4. Revisa el total estimado con IGV.
5. Pulsa `Crear borrador`.
6. En el detalle, pulsa `Enviar a revisión`.
7. Con un usuario autorizado, pulsa `Aprobar venta`.
8. Comprueba en el kardex que el stock físico todavía no disminuyó y que existe una reserva.
9. Pulsa `Facturar` y selecciona Factura para una empresa o Boleta para una persona sin RUC.
10. Comprueba el comprobante, la salida por venta y la cuenta por cobrar.
11. Pulsa `Registrar cobro`, ingresa un monto parcial y guarda.
12. Registra el saldo restante para que la cuenta pase a Pagada y la venta derive a Cobrado.

Resultado esperado: cada paso deja auditoría. Si se intenta reservar más que el disponible, la acción falla y el estado permanece intacto.

### Crear una solicitud y una orden de compra

Ruta: `Compras → Solicitudes → Nueva solicitud`.

1. Selecciona proveedor, almacén y productos necesarios.
2. Ingresa cantidades y observaciones.
3. Guarda la solicitud en borrador.
4. Envíala y apruébala con un usuario autorizado.
5. Desde la solicitud aprobada crea una orden.
6. Revisa las líneas y emite la orden.

> Emitir la orden es el momento en que nace la Compra. Antes de emitirla no debe existir una compra contable ni una cuenta por pagar.

### Recibir, facturar y pagar una compra

Ruta: `Compras → Recepción` o detalle de la orden emitida.

1. Selecciona la orden pendiente de recibir.
2. Ingresa cantidades recibidas; puedes hacer una recepción parcial.
3. Confirma la recepción.
4. Comprueba la entrada en el kardex y el costo promedio actualizado.
5. Cuando corresponda, factura la compra.
6. Entra a `Finanzas → Cuentas por pagar`.
7. Abre la cuenta y registra un pago parcial o total.

Resultado esperado: la recepción cambia el inventario; la facturación crea la CxP; el pago genera el movimiento de caja o banco relacionado.

### Transferir stock entre almacenes

Ruta: `Inventario → Transferencias → Nueva transferencia`.

1. Selecciona almacén origen y destino; deben ser diferentes.
2. Agrega productos y cantidades mayores que cero.
3. Pulsa `Crear borrador`.
4. Solicita la transferencia.
5. Ejecútala con un usuario autorizado.
6. Revisa el kardex de ambos almacenes.

Resultado esperado: se crea una salida en origen y una entrada equivalente en destino. Si falta stock, no se crea ninguna mitad.

### Solicitar y aprobar un ajuste

Ruta: `Inventario → Ajustes` o ficha de un producto.

1. Selecciona producto y almacén.
2. Indica la diferencia y el motivo.
3. Solicita el ajuste.
4. Comprueba que todavía no cambió el stock.
5. Aprueba la solicitud con un usuario autorizado.
6. Revisa que el kardex tenga `Ajuste entrada` o `Ajuste salida`.

### Recorrido rápido por roles

Para mostrar control de acceso, cierra sesión desde la tarjeta de perfil y prueba:

| Usuario | Qué conviene demostrar |
|---|---|
| Ana Torres | Dashboard, creación de venta, compras, configuración y auditoría |
| Rosa Medina | Cotizaciones, ventas, clientes y CxC; no ve las acciones no permitidas |
| Marco Salazar | Productos, almacenes, kardex, recepción, transferencias y ajustes |
| Elena Paredes | Facturación, CxC, CxP, caja, bancos y reportes |

El menú, las rutas, los botones y los badges se calculan con el permiso efectivo del rol. Si un grupo no tiene ningún hijo autorizado, no aparece.

## 13. Límites conocidos de la simulación

- No hay contraseñas ni usuarios remotos.
- No hay backend ni base de datos compartida.
- El localStorage pertenece al navegador actual.
- Los archivos subidos son metadatos simulados; no se envían a un servidor.
- Los comprobantes PDF son vistas previas referenciales.
- No hay integración con SUNAT, bancos, correo ni servicios externos.
- La seguridad real deberá implementarse nuevamente en el backend.
