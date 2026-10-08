import { lazy, Suspense } from 'react'
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { navigationRoutes, rutaPermitidaParaRol, type NavigationRoute } from './modules/navigation'
import { useERPStore } from './store'
import { rolDelUsuario } from './store/permissions'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { ConfigurationPage, NoAccessPage, NotFoundPage, PlaceholderPage } from './pages/PageStates'
const SalesDemoPage = lazy(() => import('./pages/comercial/SalesDemoPage').then((module) => ({ default: module.SalesDemoPage })))
const NewSalePage = lazy(() => import('./pages/comercial/NewSalePage').then((module) => ({ default: module.NewSalePage })))
const SaleDetailPage = lazy(() => import('./pages/comercial/SaleDetailPage').then((module) => ({ default: module.SaleDetailPage })))
const QuotesPage = lazy(() => import('./pages/comercial/QuotesPage').then((module) => ({ default: module.QuotesPage })))
const NewQuotePage = lazy(() => import('./pages/comercial/NewQuotePage').then((module) => ({ default: module.NewQuotePage })))
const QuoteDetailPage = lazy(() => import('./pages/comercial/QuoteDetailPage').then((module) => ({ default: module.QuoteDetailPage })))
const ClientsPage = lazy(() => import('./pages/comercial/ClientsPage').then((module) => ({ default: module.ClientsPage })))
const ClientDetailPage = lazy(() => import('./pages/comercial/ClientDetailPage').then((module) => ({ default: module.ClientDetailPage })))
const SuppliersPage = lazy(() => import('./pages/compras/SuppliersPage').then((module) => ({ default: module.SuppliersPage })))
const SupplierDetailPage = lazy(() => import('./pages/compras/SupplierDetailPage').then((module) => ({ default: module.SupplierDetailPage })))
const PurchaseOrdersPage = lazy(() => import('./pages/compras/PurchaseOrdersPage').then((module) => ({ default: module.PurchaseOrdersPage })))
const PurchaseRequestsPage = lazy(() => import('./pages/compras/PurchaseRequestsPage').then((module) => ({ default: module.PurchaseRequestsPage })))
const NewPurchaseRequestPage = lazy(() => import('./pages/compras/NewPurchaseRequestPage').then((module) => ({ default: module.NewPurchaseRequestPage })))
const PurchaseOrderDetailPage = lazy(() => import('./pages/compras/PurchaseOrderDetailPage').then((module) => ({ default: module.PurchaseOrderDetailPage })))
const ReceiptsPage = lazy(() => import('./pages/compras/ReceiptsPage').then((module) => ({ default: module.ReceiptsPage })))
const ReceiptDetailPage = lazy(() => import('./pages/compras/ReceiptDetailPage').then((module) => ({ default: module.ReceiptDetailPage })))
const AccountsPayablePage = lazy(() => import('./pages/finanzas/AccountsPayablePage').then((module) => ({ default: module.AccountsPayablePage })))
const AccountsReceivablePage = lazy(() => import('./pages/finanzas/AccountsReceivablePage').then((module) => ({ default: module.AccountsReceivablePage })))
const CashPage = lazy(() => import('./pages/finanzas/CashPage').then((module) => ({ default: module.CashPage })))
const BanksPage = lazy(() => import('./pages/finanzas/BanksPage').then((module) => ({ default: module.BanksPage })))
const InvoicingPage = lazy(() => import('./pages/comercial/InvoicingPage').then((module) => ({ default: module.InvoicingPage })))
const DocumentsPage = lazy(() => import('./pages/DocumentPage').then((module) => ({ default: module.DocumentsPage })))
const DocumentDetailPage = lazy(() => import('./pages/DocumentPage').then((module) => ({ default: module.DocumentDetailPage })))
const ProductsPage = lazy(() => import('./pages/inventario/ProductsPage').then((module) => ({ default: module.ProductsPage })))
const ProductDetailPage = lazy(() => import('./pages/inventario/ProductDetailPage').then((module) => ({ default: module.ProductDetailPage })))
const KardexPage = lazy(() => import('./pages/inventario/KardexPage').then((module) => ({ default: module.KardexPage })))
const TransfersPage = lazy(() => import('./pages/inventario/TransfersPage').then((module) => ({ default: module.TransfersPage })))
const NewTransferPage = lazy(() => import('./pages/inventario/NewTransferPage').then((module) => ({ default: module.NewTransferPage })))
const AdjustmentsPage = lazy(() => import('./pages/inventario/AdjustmentsPage').then((module) => ({ default: module.AdjustmentsPage })))
const DispatchesPage = lazy(() => import('./pages/inventario/DispatchesPage').then((module) => ({ default: module.DispatchesPage })))
const WarehouseDetailPage = lazy(() => import('./pages/inventario/WarehouseDetailPage').then((module) => ({ default: module.WarehouseDetailPage })))
const WarehousesPage = lazy(() => import('./pages/inventario/WarehousesPage').then((module) => ({ default: module.WarehousesPage })))
const ChartsGalleryPage = lazy(() => import('./pages/dev/ChartsGalleryPage').then((module) => ({ default: module.ChartsGalleryPage })))
const AuditPage = lazy(() => import('./pages/administracion/AdministrationPages').then((module) => ({ default: module.AuditPage })))
const PermissionsPage = lazy(() => import('./pages/administracion/AdministrationPages').then((module) => ({ default: module.PermissionsPage })))
const RolesPage = lazy(() => import('./pages/administracion/AdministrationPages').then((module) => ({ default: module.RolesPage })))
const UsersPage = lazy(() => import('./pages/administracion/AdministrationPages').then((module) => ({ default: module.UsersPage })))
const ReportsPage = lazy(() => import('./pages/ReportsPage').then((module) => ({ default: module.ReportsPage })))

function RouteLoading() {
  return <div className="min-h-dvh bg-app p-6"><div className="mx-auto flex min-h-32 max-w-7xl items-center justify-center rounded-2xl bg-surface text-sm text-text-muted shadow-panel">Cargando módulo…</div></div>
}

function SessionGuard() {
  const usuarioActualId = useERPStore((state) => state.usuarioActualId)
  return usuarioActualId ? <Outlet /> : <Navigate to="/login" replace />
}

function PermissionGuard({ route }: { route: NavigationRoute }) {
  const state = useERPStore()
  const rol = state.usuarioActualId ? rolDelUsuario(state, state.usuarioActualId) : undefined
  return route && rutaPermitidaParaRol(rol, route, state) ? <Outlet /> : <NoAccessPage />
}

function App() {
  return <Suspense fallback={<RouteLoading />}><Routes>
    <Route path="/login" element={<LoginPage />} />
    {import.meta.env.DEV ? <Route path="/dev/graficos" element={<ChartsGalleryPage />} /> : null}
    <Route element={<SessionGuard />}>
      <Route element={<AppLayout />}>
        {navigationRoutes.map((route) => <Route key={route.id} element={<PermissionGuard route={route} />}><Route path={route.path} element={route.id === 'dashboard' ? <DashboardPage /> : route.id === 'clientes' ? <ClientsPage /> : route.id === 'cliente-ficha' ? <ClientDetailPage /> : route.id === 'cotizaciones' ? <QuotesPage /> : route.id === 'cotizacion-nueva' ? <NewQuotePage /> : route.id === 'cotizacion-detalle' ? <QuoteDetailPage /> : route.id === 'proveedores' ? <SuppliersPage /> : route.id === 'proveedor-ficha' ? <SupplierDetailPage /> : route.id === 'solicitudes-compra' ? <PurchaseRequestsPage /> : route.id === 'solicitud-compra-nueva' ? <NewPurchaseRequestPage /> : route.id === 'ordenes-compra' ? <PurchaseOrdersPage /> : route.id === 'orden-compra-detalle' ? <PurchaseOrderDetailPage /> : route.id === 'recepcion' ? <ReceiptsPage /> : route.id === 'recepcion-detalle' ? <ReceiptDetailPage /> : route.id === 'despachos' ? <DispatchesPage /> : route.id === 'ajustes' ? <AdjustmentsPage /> : route.id === 'cuentas-cobrar' ? <AccountsReceivablePage /> : route.id === 'cuentas-pagar' ? <AccountsPayablePage /> : route.id === 'caja' ? <CashPage /> : route.id === 'bancos' ? <BanksPage /> : route.id === 'facturacion' ? <InvoicingPage /> : route.id === 'documentos' ? <DocumentsPage /> : route.id === 'documento-detalle' ? <DocumentDetailPage /> : route.id === 'productos' ? <ProductsPage /> : route.id === 'producto-ficha' ? <ProductDetailPage /> : route.id === 'almacenes' ? <WarehousesPage /> : route.id === 'almacen-ficha' ? <WarehouseDetailPage /> : route.id === 'kardex' ? <KardexPage /> : route.id === 'transferencias' ? <TransfersPage /> : route.id === 'transferencia-nueva' ? <NewTransferPage /> : route.id === 'ventas' ? <SalesDemoPage /> : route.id === 'venta-nueva' ? <NewSalePage /> : route.id === 'venta-detalle' ? <SaleDetailPage /> : route.id === 'reportes' ? <ReportsPage kind="resumen" /> : route.id === 'reporte-ventas' ? <ReportsPage kind="ventas" /> : route.id === 'reporte-compras' ? <ReportsPage kind="compras" /> : route.id === 'reporte-inventario' ? <ReportsPage kind="inventario" /> : route.id === 'reporte-finanzas' ? <ReportsPage kind="finanzas" /> : route.id === 'usuarios' ? <UsersPage /> : route.id === 'roles' ? <RolesPage /> : route.id === 'permisos' ? <PermissionsPage /> : route.id === 'auditoria' ? <AuditPage /> : route.id === 'configuracion' ? <ConfigurationPage /> : <PlaceholderPage route={route} />} /></Route>)}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Route>
  </Routes></Suspense>
}

export default App
