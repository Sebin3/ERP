# EnterpriseCloud: presentación académica

Documento explicativo basado en el estado actual del proyecto.

## 1. El proyecto y su propósito

Una aplicación integrada para una empresa distribuidora

### ¿Qué es un ERP?

ERP significa Enterprise Resource Planning: planificación de recursos empresariales. Es un sistema que conecta áreas como ventas, compras, almacén y finanzas para trabajar con información común. Su valor está en relacionar las operaciones y evitar registros aislados.

### ¿Qué presenta EnterpriseCloud?

El proyecto es un prototipo funcional de la interfaz de un ERP para una distribuidora peruana. Permite recorrer procesos comerciales, registrar operaciones simuladas, consultar inventario, controlar saldos y visualizar indicadores. Utiliza soles (S/) y parámetros de IGV configurables.

### Problema que busca resolver

Una empresa necesita saber qué vende, qué debe comprar, cuánta mercadería tiene, cuánto le deben sus clientes y cuánto debe a sus proveedores. EnterpriseCloud reúne estas preguntas en una misma aplicación y muestra cómo una operación afecta otras áreas.

### Objetivo académico

Demostrar diseño modular, control de acceso por roles, validaciones de negocio, trazabilidad e información derivada. La presentación muestra tanto la experiencia del usuario como la conexión entre documentos, movimientos y saldos.

### Alcance de la versión

Es una simulación en el navegador. Tiene datos de ejemplo y almacenamiento local; todavía no dispone de backend, base de datos compartida, contraseñas reales ni integraciones con SUNAT o bancos. Estas diferencias son parte de la explicación del proyecto.

> Idea para exponer: «El sistema conecta el proceso comercial con el inventario y el dinero, de modo que cada operación tiene efectos visibles en otras áreas».

## 2. Cómo se organiza la aplicación

Módulos, submódulos y navegación

### Módulo y submódulo

Un módulo agrupa un área funcional: por ejemplo, Comercial. Un submódulo resuelve una parte del proceso: Cotizaciones o Pedidos de venta. Las pantallas de listado, creación y detalle pertenecen al mismo submódulo.

### Mapa del menú

Comercial: Cotizaciones y Pedidos de venta.
Compras: Solicitudes de compra y Órdenes de compra.
Inventario: Existencias, Recepciones de compra, Salidas por venta, Transferencias, Ajustes de inventario y Kardex.
Finanzas: Comprobantes, Cuentas por cobrar, Cuentas por pagar, Caja y Bancos.
Datos maestros: Clientes, Proveedores, Productos y Almacenes.
Administración: Usuarios, Roles, Permisos y Auditoría.

### Accesos transversales

Inicio ofrece la visión general; Gestión documental organiza documentos relacionados; Reportes permite analizar resultados; Configuración reúne parámetros de la empresa. Son accesos compartidos por distintos procesos según los permisos.

### Elementos de las pantallas

Las tablas permiten buscar, ordenar y paginar; algunas incluyen filtros y selección de registros. Los estados indican el avance de la operación. Los formularios, paneles laterales y confirmaciones permiten registrar acciones con validaciones y mensajes de resultado.

### Menú adaptado al usuario

El sidebar y los botones se filtran según el rol. Los contadores señalan pedidos pendientes de aprobación, productos críticos y cuentas por cobrar vencidas. El menú puede contraerse y tiene navegación adaptable a móviles.

> No todos los usuarios ven todas las opciones: el acceso depende de los permisos efectivos de su rol.

## 3. Inicio: dashboard empresarial

Resumen del negocio y prioridades del usuario

### ¿Para qué sirve?

El dashboard resume la situación de la empresa sin abrir cada listado. Combina indicadores, gráficos, alertas y operaciones recientes. Su contenido se ajusta a lo que el usuario puede consultar.

### Indicadores y alertas

Muestra información comercial y financiera, como ventas, compras, utilidad y cuentas pendientes, según el perfil. La bandeja de acciones dirige al usuario a tareas que requieren atención. También aparecen productos con disponibilidad crítica y cuentas próximas a vencer o vencidas.

### Cómo interpretar los gráficos

Ventas vs. compras: compara importes facturados por periodo.
Ventas por categoría: identifica los grupos de productos con mayor participación.
Flujo de caja: compara ingresos y egresos registrados.
Embudo de pedidos: muestra el avance entre creación, aprobación, facturación y cobro.
Top clientes y productos: muestra los principales aportantes.
Antigüedad de cuentas: organiza saldos según su vencimiento.

### Interacción y lectura

Los controles permiten cambiar periodos. Las leyendas distinguen series y los tooltips muestran detalles al pasar el cursor o enfocar elementos. En gráficos de líneas se pueden activar o desactivar series. Los colores facilitan comparar valores y reconocer alertas.

### De dónde salen los resultados

Los indicadores se calculan desde las operaciones del sistema; no son totales editados de forma independiente. La fecha de referencia de la demo determina los periodos y vencimientos. Algunos usuarios pueden descargar el resumen del dashboard en CSV.

> Ventas facturadas y dinero cobrado son conceptos distintos. Una venta a crédito puede estar facturada y mantener un saldo pendiente.

## 4. Comercial

De la propuesta al pedido del cliente

### Cotizaciones: función

Permite preparar una propuesta para un cliente con productos, cantidades, precios, descuentos, validez y observaciones. Se utiliza antes de confirmar una operación. Una cotización no genera una cuenta por cobrar ni descuenta mercadería.

### Cotizaciones: acciones

Se puede crear un borrador, editarlo mientras permanece en borrador, enviarlo y aceptarlo con permiso de aprobación. Una cotización aceptada puede originar un pedido de venta. El sistema evita convertir la misma cotización dos veces.

### Pedidos de venta: función

Registra lo que el cliente solicita y organiza su revisión. Incluye cliente, almacén, productos, cantidades, precios, moneda y condiciones de pago. Puede crearse directamente o a partir de una cotización aceptada.

### Pedidos de venta: flujo

Borrador: la operación está en preparación.
Pendiente: se envió a revisión.
Aprobado: el pedido fue autorizado y su stock queda reservado.
Facturado: se emitió el comprobante y se creó la cuenta por cobrar.
Cobrado: se deriva cuando el saldo correspondiente llega a cero.
Anulado: la operación queda fuera del flujo activo.

### Validaciones y resultado

El sistema comprueba que existan cliente y almacén activos, que haya líneas válidas y que el stock disponible alcance al aprobar. Facturar genera el comprobante, la salida de inventario y la cuenta por cobrar en esta demo. Los cobros pueden ser parciales o totales.

> Ejemplo: cotizar 10 unidades, crear el pedido, aprobarlo, facturarlo y registrar el cobro. Cada paso deja un efecto diferente en el sistema.

## 5. Compras

Planificación y adquisición de mercadería

### Solicitudes de compra: función

Representan una necesidad interna de abastecimiento. Se registran el almacén destino, los productos requeridos, las cantidades y el motivo. En esta pantalla no se elige al proveedor: esa decisión corresponde a la orden de compra.

### Solicitudes: acciones y estados

Se crea un borrador, se envía y se aprueba con el permiso correspondiente. Una solicitud aprobada puede servir de base para una orden. El estado Atendida se deriva de las cantidades asociadas a las órdenes, no de un cambio manual de etiqueta.

### Órdenes de compra: función

Formalizan la compra prevista al proveedor. Permiten indicar proveedor, almacén destino, productos, cantidades, costos y datos de entrega. Relacionan la necesidad interna con el abastecimiento externo.

### Órdenes: resultado operativo

Al emitir una orden se crea la operación de compra asociada. Desde su detalle se consulta el avance y se accede a la recepción. Las recepciones parciales o completas permiten determinar cuánto falta por recibir. Emitir la orden no crea por sí solo una cuenta por pagar.

### Conexión con otras áreas

Inventario registra la mercadería recibida y genera entradas en el kardex. Cuando se registra la facturación de la compra, Finanzas obtiene la cuenta por pagar. Registrar el pago produce el movimiento financiero correspondiente.

> Solicitud = necesidad interna. Orden = compromiso con un proveedor. Recepción = mercadería recibida. Facturación = obligación registrada. Pago = salida de dinero.

## 6. Inventario: consulta y recepción

Control de existencias con trazabilidad

### Existencias

Muestra producto y almacén con tres cantidades separadas: existencia física, reservado y disponible. Permite buscar y filtrar por almacén o por disponibilidad bajo mínimo. El mínimo mostrado corresponde al configurado en el producto.

### Cómo leer las cantidades

Existencia física: saldo calculado desde entradas y salidas del kardex.
Reservado: unidades comprometidas por pedidos aprobados pendientes de facturación.
Disponible: existencia física menos reservado.
Ejemplo: 100 unidades físicas y 20 reservadas dejan 80 disponibles para nuevas operaciones.

### Recepciones de compra

Permite registrar la mercadería recibida contra una orden emitida. Se ingresan cantidades y se confirma la recepción. Admite recepciones parciales; no permite superar las cantidades ordenadas. Genera entradas en el kardex y participa en el cálculo del costo promedio.

### Salidas por venta

Es una consulta de las salidas generadas al facturar pedidos. Relaciona la venta con el cliente, almacén y unidades registradas en el kardex. Se puede filtrar y abrir la operación de origen. No es todavía un proceso independiente de preparación, transporte o entrega.

### Kardex

Es el historial de movimientos de cada producto y almacén: saldo inicial, entradas por compra, salidas por venta, devoluciones, transferencias y ajustes. Permite explicar de dónde sale el stock. La cantidad no se sobrescribe directamente en el catálogo.

> Regla principal: stock = entradas − salidas. Las reservas afectan la disponibilidad, pero no representan una salida física.

## 7. Inventario: transferencias y ajustes

Movimientos internos y correcciones controladas

### Transferencias: función

Trasladan mercadería entre dos almacenes diferentes sin representar una compra ni una venta. Se indican origen, destino, productos, cantidades y observaciones.

### Transferencias: flujo y resultado

Crear borrador, solicitar y ejecutar con autorización. La ejecución genera dos movimientos relacionados: salida en origen y entrada en destino. Si no hay stock suficiente, no se crea ninguna de las dos partes. El inventario total de la empresa se conserva.

### Ejemplo de transferencia

Antes: almacén A tiene 40 unidades y B tiene 10. Al transferir 5 de A a B, quedan 35 y 15. El total sigue siendo 50. Los dos movimientos permiten seguir el traslado en el kardex.

### Ajustes de inventario: función

Corrigen diferencias detectadas en una revisión física. La solicitud identifica producto, almacén, cantidad esperada y motivo. No cambia el stock al solicitarla: necesita aprobación.

### Ajustes: decisiones y trazabilidad

Aprobar produce una entrada o salida por ajuste según la diferencia. Rechazar o anular una solicitud pendiente no altera el inventario. La aprobación, el motivo y el movimiento permiten justificar la corrección. Es importante distinguir una corrección de un traslado entre almacenes.

> Ejemplo: si el sistema muestra 30 y el conteo confirma 28, un ajuste aprobado registra la salida de 2; no borra el historial anterior.

## 8. Finanzas: comprobantes y cuentas

Documentos económicos y saldos pendientes

### Comprobantes

Centraliza la consulta de documentos relacionados con ventas y compras: facturas, boletas y notas de crédito según los registros. Permite revisar origen, tercero, importe, estado y vista previa. La emisión o registro se realiza desde la operación de origen.

### Cuentas por cobrar

Organiza las obligaciones de los clientes generadas al facturar. Permite revisar saldo, fecha de vencimiento y pagos asociados, así como registrar cobros con permiso. Un cobro puede ser parcial; el saldo restante continúa pendiente.

### Cuentas por pagar

Organiza las obligaciones frente a proveedores surgidas de compras facturadas. Permite revisar vencimientos y registrar pagos parciales o totales. Vincula la compra, el comprobante y los movimientos de dinero.

### Estados de las cuentas

Pendiente: existe saldo y todavía no vence.
Vencida: existe saldo y pasó la fecha de vencimiento.
Pagada: el saldo se agotó con los pagos aplicados.
Anulada: la cuenta se revirtió mediante la anulación correspondiente.
Los estados se obtienen de las operaciones y fechas; no se asignan manualmente para ocultar una deuda.

### Ejemplo de cobro

Una cuenta de S/ 1.180 recibe un cobro de S/ 500: quedan S/ 680. Un segundo cobro de S/ 680 completa el saldo. El sistema impide cobrar por encima de lo pendiente y deriva el estado del pedido como Cobrado cuando corresponde.

> Los comprobantes son referenciales en esta versión. No equivalen a documentos electrónicos validados por una autoridad tributaria.

## 9. Finanzas: caja y bancos

Dónde se registra el movimiento de dinero

### Caja

Consulta los movimientos en efectivo generados por las operaciones. Muestra ingresos, egresos, conceptos, métodos de pago y saldo derivado. Los cobros y pagos se registran desde sus cuentas u operaciones relacionadas.

### Bancos

Permite consultar cuentas bancarias de ejemplo y movimientos asociados. Relaciona los cobros o pagos con la cuenta elegida. El saldo y el historial son cálculos del sistema; no se obtienen de una conexión en línea al banco.

### Métodos y validaciones

Al registrar un cobro o pago se selecciona el método. Cuando el método requiere una cuenta bancaria, debe indicarse una cuenta activa. El sistema valida importes y evita exceder el saldo pendiente de la obligación.

### Ejemplo integrado

Cobrar una factura en efectivo crea un ingreso en Caja. Cobrarla mediante transferencia, seleccionando una cuenta bancaria, crea un movimiento vinculado a esa cuenta. Ambos reducen el saldo por cobrar, pero se consultan en ubicaciones financieras diferentes.

### Qué cubre y qué falta

El módulo cubre principalmente tesorería y control de cuentas: obligaciones, cobros, pagos y movimientos. Todavía no implementa contabilidad general, conciliación de extractos bancarios ni cierres formales de caja. Por eso no se presenta como una contabilidad completa.

> Facturar y cobrar no son lo mismo: facturar registra el documento y la deuda; cobrar registra el ingreso de dinero y reduce esa deuda.

## 10. Datos maestros

Información compartida por toda la operación

### ¿Qué son los datos maestros?

Son registros de referencia que los procesos reutilizan. Un cliente puede aparecer en muchas cotizaciones y pedidos; un producto puede aparecer en compras, ventas y movimientos. Mantener su identidad común evita duplicar información en cada operación.

### Clientes

Permite consultar y editar fichas de clientes precargados. Incluye identificación, razón social, dirección, contacto y condiciones comerciales como crédito. Su información se utiliza en cotizaciones, pedidos y cuentas por cobrar.

### Proveedores

Permite consultar y editar proveedores de ejemplo, sus datos de identificación, ubicación, contacto y condiciones. Se relacionan con las órdenes de compra, las compras y las cuentas por pagar.

### Productos

Mantiene catálogo, SKU, categoría, unidad de medida, precio, costo referencial, impuesto y mínimo de stock. La ficha permite revisar información relacionada y solicitar ajustes según el permiso. La columna Disponible muestra disponibilidad, no necesariamente existencia física.

### Almacenes

Identifica las ubicaciones donde se controla la mercadería: código, nombre, dirección, responsable y estado. Las fichas permiten revisar información de la ubicación. Ventas, recepciones y transferencias se vinculan con almacenes concretos.

> Para la exposición se utilizan registros precargados y se editan sus fichas. No se debe prometer un alta completa de todos los maestros si la pantalla no la ofrece.

## 11. Administración y configuración

Acceso, responsabilidad y parámetros generales

### Usuarios

Consulta personas de ejemplo con acceso a la aplicación. Permite cambiar el rol asignado o el estado del usuario. En esta versión cada usuario tiene un rol; el inicio de sesión consiste en seleccionar un usuario de demostración.

### Roles y permisos

Administrador, Vendedor, Almacenero y Contador representan perfiles operativos. Roles permite modificar permisos; Permisos muestra la matriz efectiva por recurso y acción. Las acciones incluyen ver, crear, editar, aprobar, anular y exportar cuando están disponibles.

### Qué controla el acceso

Los permisos afectan menú, rutas, acciones y contadores. Ocultar un botón no es el único control: las acciones también revisan el permiso. Estas verificaciones del frontend sirven para demostrar la lógica, pero en producción deben existir controles equivalentes en el backend.

### Auditoría

Registra acciones relevantes con usuario, fecha, acción, entidad y descripción. Permite responder quién hizo qué y sobre cuál operación. Da trazabilidad a aprobaciones, anulaciones, ajustes, pagos y cambios de permisos, entre otras acciones.

### Configuración

Permite editar datos de la empresa, IGV y almacén por defecto; también consultar series y correlativos. Incluye la opción de restablecer datos de ejemplo: reemplaza el estado de la demo y cierra la sesión. Se utiliza para preparar una presentación limpia.

> Un rol es un perfil; un permiso es una autorización concreta. Los permisos pueden cambiar, por lo que el menú se calcula para la sesión actual.

## 12. Gestión documental y reportes

Soporte de las operaciones y análisis de resultados

### Gestión documental

Organiza registros de documentos y adjuntos vinculados a ventas, compras, clientes, proveedores, cotizaciones u órdenes. Permite localizar el soporte de una operación y abrir su detalle. En la demo, la carga registra metadatos simulados; no envía archivos a un servidor.

### Vista previa y PDF

Las vistas previas representan documentos empresariales basados en los datos del sistema. En el detalle de documentos se puede descargar un PDF cuando el usuario tiene permiso de exportación. Son documentos de demostración, no comprobantes oficiales.

### Reportes

Ofrece un resumen y vistas por área: ventas, compras, inventario y finanzas. Permite seleccionar mes, trimestre o doce meses. Los gráficos y tablas se recalculan a partir de las operaciones y de la fecha de referencia del sistema.

### Qué se analiza

Actividad comercial: facturación y avance de pedidos.
Abastecimiento: compras por periodo y egresos.
Inventario: distribución de valor por categoría y almacén.
Finanzas: antigüedad de cuentas y flujo de caja.
Los indicadores resumen resultados; las pantallas operativas permiten consultar sus registros de origen.

### Exportación: alcance exacto

El dashboard puede descargar CSV con el permiso correspondiente. El botón Exportar reporte de Reportes registra la solicitud y muestra un mensaje, pero no genera por sí mismo un archivo de reporte en la implementación actual. No debe confundirse con la descarga PDF de Gestión documental.

> Ejemplo para explicar: «La pantalla de pedidos permite operar; el reporte permite comparar el resultado de esas operaciones en un periodo».

## 13. Dos flujos que conectan los módulos

La integración como idea central del ERP

### Venta: secuencia integrada

1. Cotizar: preparar una propuesta para el cliente.
2. Crear pedido: registrar productos, almacén y condiciones.
3. Aprobar: validar disponibilidad y reservar unidades.
4. Facturar: generar comprobante, salida en kardex y cuenta por cobrar.
5. Cobrar: reducir el saldo y crear el ingreso en Caja o Bancos.
6. Consultar: revisar indicadores, documentos y auditoría.

### Ejemplo de stock en una venta

Si existen 100 unidades y se aprueba un pedido por 10, la existencia física sigue en 100, la reserva pasa a 10 y la disponibilidad a 90. Al facturar, la demo registra la salida: quedan 90 unidades físicas y desaparece la reserva de ese pedido.

### Compra: secuencia integrada

1. Solicitar: registrar una necesidad interna.
2. Ordenar: seleccionar proveedor y emitir la orden.
3. Recibir: registrar cantidades y generar entradas en kardex.
4. Facturar compra: crear el comprobante y la cuenta por pagar.
5. Pagar: reducir la obligación y generar el egreso financiero.
6. Consultar: revisar existencias, saldos y reportes.

### Anulaciones y límites

Anular un pedido sin facturación lo retira del proceso y libera su reserva. En la demo, anular una venta facturada sin cobros genera nota de crédito, retorno de stock y reversión de la cuenta. Una venta facturada con cobros aplicados no admite esa anulación.

> En producción conviene separar entrega física, facturación y devolución: emitir una nota de crédito no implica siempre que la mercadería regresó al almacén.

## 14. Guion para presentar al profesor

Recorrido sugerido de 10 a 12 minutos

### Minutos 0–2: introducción y menú

Explica qué significa ERP y el problema de una distribuidora. Aclara que se trata de un prototipo funcional. Ingresa con un administrador y presenta Inicio, los módulos y la diferencia entre procesos y datos maestros.

### Minutos 2–5: caso comercial

Selecciona un producto con suficiente disponibilidad. Crea un pedido o parte de una cotización aceptada. Envíalo a revisión y apruébalo. Abre Existencias para demostrar reserva y disponible. Factura y muestra comprobante, salida en kardex y cuenta por cobrar.

### Minutos 5–7: dinero y abastecimiento

Registra un cobro parcial y explica el saldo restante. Muestra Caja o Bancos según el método. Abre una orden emitida y registra una recepción permitida, o utiliza una recepción de ejemplo para mostrar la entrada en el kardex.

### Minutos 7–9: control y análisis

Revisa los gráficos del dashboard y los reportes. Abre Auditoría para mostrar acciones y responsables. Cierra sesión y selecciona otro rol para enseñar que el menú y las acciones cambian.

### Minutos 9–12: cierre y preguntas

Explica tecnologías y alcance pendiente. Destaca la integración, las validaciones y la trazabilidad. Concluye indicando que el siguiente paso es implementar backend, seguridad real y procesos logísticos independientes.

### Preparación antes de la exposición

Comprueba que la aplicación abra, que los datos de ejemplo estén disponibles y que el producto elegido tenga stock. Si necesitas restablecer la demo, hazlo antes del recorrido. Evita improvisar con un pedido sin disponibilidad o un registro que ya tenga cobros y quieras anular.

> Frase de apertura: «EnterpriseCloud demuestra cómo una distribuidora puede coordinar pedidos, compras, inventario y dinero desde una aplicación integrada».

## 15. Tecnología y preguntas frecuentes

Cómo está construido y cómo defender su alcance

### Arquitectura del prototipo

React organiza pantallas y componentes; TypeScript define tipos; Vite ejecuta y compila la aplicación; Tailwind aplica estilos; React Router conecta rutas; Zustand administra estado y persistencia local. Los cálculos de stock, reservas y saldos parten de los registros de operaciones.

### ¿Por qué es un proyecto de ERP?

Porque relaciona varias áreas mediante entidades comunes y procesos conectados. Un pedido genera consecuencias en inventario y finanzas. Esto demuestra una estructura de ERP, aunque la versión no sea todavía un producto empresarial de producción.

### ¿Dónde se guardan los datos y qué tan seguro es?

Se guardan en el almacenamiento local del navegador. No hay una base compartida entre usuarios o equipos ni autenticación por contraseña. El control de permisos demuestra reglas de acceso, pero requiere backend y seguridad adicional para un uso real.

### ¿Por qué no se edita el stock directamente?

Porque el stock debe poder explicarse mediante movimientos. Recepciones, ventas, transferencias y ajustes dejan una historia revisable. Es distinto cambiar un número sin justificación que registrar el motivo de una entrada o salida.

### ¿Qué falta para producción?

Backend y base de datos; autenticación y autorización del servidor; operación multiusuario; respaldo y controles de concurrencia; gestión independiente de despachos y devoluciones; contabilidad, conciliación y cierres; integraciones externas y pruebas de operación reales.

### Mensaje de cierre

El resultado académico es una aplicación con navegación modular, procesos simulados relacionados, reglas de negocio, gráficos, permisos y auditoría. La fortaleza del proyecto es demostrar cómo se organiza y conecta un ERP y reconocer con precisión los próximos pasos.

> Glosario: SKU = identificador de producto; CxC = cuentas por cobrar; CxP = cuentas por pagar; IGV = impuesto usado en la demo; kardex = historial de movimientos; KPI = indicador de desempeño.
