# ERP EnterpriseCloud

Frontend simulado de un ERP para una distribuidora peruana. Está construido con React, TypeScript, Vite, Tailwind y Zustand. Incluye datos deterministas, permisos por rol, flujos comerciales, inventario derivado del kardex, finanzas, reportes y auditoría.

## Guía de uso

Consulta el manual completo en [docs/GUIA_USO.md](docs/GUIA_USO.md). Ahí se explica cómo iniciar la demo, qué puede hacer cada rol, cómo funcionan ventas, compras, inventario, finanzas, documentos y reportes, y cuál es el flujo recomendado para presentarla.

## Comandos

```bash
pnpm install
pnpm run dev
pnpm exec tsc -b
pnpm test
pnpm run build
```

La demo no requiere backend ni credenciales: el Login permite seleccionar un usuario de ejemplo. Los cambios se guardan en el `localStorage` del navegador.

## Alcance

Este repositorio valida la experiencia y los flujos del frontend antes de construir la API y la base de datos. No representa todavía un ERP de producción ni integra SUNAT, bancos o autenticación real.
