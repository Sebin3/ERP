# Arquitectura frontend de ERP EnterpriseCloud

Fase 0 — documento de diseño técnico. Esta estructura describe el frontend previsto; en esta fase no se implementan pantallas, componentes visuales, estilos ni lógica de negocio.

## Árbol completo propuesto

```text
.
├── docs/
│   ├── ARQUITECTURA.md
│   ├── NAVEGACION.md
│   ├── MODELO_DATOS.md
│   ├── FLUJOS.md
│   ├── PERMISOS.md
│   ├── STORE.md
│   └── DATOS_EJEMPLO.md
├── public/
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── data-display/
│   │   ├── feedback/
│   │   ├── forms/
│   │   ├── navigation/
│   │   └── ui/
│   ├── layouts/
│   ├── pages/
│   │   ├── DashboardPage.tsx
│   │   ├── comercial/
│   │   ├── compras/
│   │   ├── inventario/
│   │   ├── finanzas/
│   │   ├── documentos/
│   │   ├── reportes/
│   │   ├── administracion/
│   │   └── configuracion/
│   ├── modules/
│   │   ├── ventas/
│   │   ├── compras/
│   │   ├── inventario/
│   │   ├── clientes/
│   │   ├── proveedores/
│   │   ├── finanzas/
│   │   ├── documentos/
│   │   ├── reportes/
│   │   └── administracion/
│   ├── services/
│   ├── store/
│   ├── hooks/
│   ├── types/
│   ├── utils/
│   ├── App.tsx
│   └── main.tsx
├── package.json
├── tsconfig.app.json
└── vite.config.ts
```

## Responsabilidades y límites

| Carpeta | Responsabilidad | No debe contener |
| --- | --- | --- |
| `components/` | Piezas reutilizables y agnósticas del dominio: campos, tablas, modales, estados vacíos y navegación. | Reglas de venta/compra, llamadas al store de un módulo concreto, consultas directas a datos simulados o páginas completas. |
| `components/data-display/` | Presentación reutilizable de tablas, tarjetas, badges, métricas y timelines. | Cálculo de saldos, decisiones de permisos o mutaciones. |
| `components/forms/` | Controles y agrupaciones de formulario reutilizables. | Persistencia, aprobación de documentos o reglas que solo aplican a un módulo. |
| `components/feedback/` | Alertas, confirmaciones, errores y notificaciones. | Auditoría de negocio o navegación específica. |
| `components/navigation/` | Sidebar, breadcrumbs, tabs y enlaces según una configuración recibida. | Definición dispersa de rutas o permisos. |
| `components/ui/` | Primitivas visuales sin conocimiento del ERP. | Entidades, estados de negocio y datos simulados. |
| `layouts/` | Composición de estructura de página, protección de sesión y regiones comunes. | Formularios de entidades o reglas de inventario. |
| `pages/` | Entrada de cada ruta; conecta layout, módulo y parámetros de navegación. | Cálculos, mutaciones directas y definición duplicada de entidades. |
| `modules/ventas/` | Casos de uso y piezas específicas de cotizaciones, ventas, facturación y cobro comercial. | Componentes genéricos o datos maestros de clientes/productos. |
| `modules/compras/` | Solicitudes, órdenes, compras y recepción. | Pago financiero genérico o edición manual de stock. |
| `modules/inventario/` | Productos como maestro operativo, almacenes, kardex, transferencias y ajustes controlados. | Asignar stock directamente o recalcular totales en la UI. |
| `modules/clientes/` | Ficha, consulta y edición del maestro de clientes. | Crear una venta dentro de la ficha. |
| `modules/proveedores/` | Ficha, consulta y edición del maestro de proveedores. | Crear una compra dentro de la ficha. |
| `modules/finanzas/` | Cuentas por cobrar/pagar, caja, bancos y pagos/cobros. | Cambiar estados comerciales sin acción de negocio. |
| `modules/documentos/` | Repositorio simulado de documentos vinculados a entidades. | Datos binarios reales o emisión fiscal real. |
| `modules/reportes/` | Consultas, filtros y exportaciones derivadas del store. | Guardar copias de saldos o totales calculados. |
| `modules/administracion/` | Usuarios, roles, permisos y auditoría. | Autorizarse a sí mismo o saltarse guardas. |
| `services/` | Adaptadores de datos simulados, importación/exportación y reloj/identificadores aislados. | Estado React, JSX, reglas de transición o duplicar el store. |
| `store/` | Store de Zustand, slices, selectores y acciones de negocio transaccionales. | Componentes visuales o acceso directo desde servicios a entidades sin acción. |
| `hooks/` | Hooks de sesión, permisos, navegación y selectores derivados. | Estado global paralelo o mutaciones fuera del store. |
| `types/` | Contratos TypeScript del dominio y tipos auxiliares. | Funciones, efectos secundarios, valores iniciales o lógica. |
| `utils/` | Formateo de soles/fechas, validaciones puras y helpers sin estado. | Reglas que cambian estados, persistencia o efectos de auditoría. |

## Reglas transversales

1. Clientes, proveedores, productos y almacenes se consultan y editan como maestros; no se crean como efecto incidental de una venta o compra.
2. `MovimientoInventario[]` es la única fuente del stock. `StockPorAlmacen` es solo una proyección calculada.
3. Los totales de ventas, compras, cuentas y dashboard se calculan desde líneas, comprobantes, pagos y movimientos; no se almacenan como copias editables.
4. Cada acción crítica pasa por una acción del store que valida, muta las colecciones relacionadas y agrega un `RegistroAuditoria`.
5. `docs/PERMISOS.md` es la única fuente de verdad para acceso; router, guards y sidebar se generan desde ella.
6. La UI solicita datos mediante selectores; no modifica arrays del store ni decide transiciones por su cuenta.
