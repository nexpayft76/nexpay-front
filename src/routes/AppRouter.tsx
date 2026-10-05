import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import Landing from '../pages/Landing/Landing'
import ProtectedRoute from './ProtectedRoute'
import SuperuserRoute from './SuperuserRoute'

// La landing va en el archivo principal (es la página que ven los buscadores y la primera visita).
// El resto se descarga recién al entrar a cada pantalla: así el index-*.js que baja al abrir el sitio
// es mucho más liviano y la landing carga antes.
const Layout = lazy(() => import('../components/layout/Layout'))
const Login = lazy(() => import('../pages/Login/Login'))
const Register = lazy(() => import('../pages/Register/Register'))
const ForgotPassword = lazy(() => import('../pages/Auth/ForgotPassword'))
const ResetPassword = lazy(() => import('../pages/Auth/ResetPassword'))
const Dashboard = lazy(() => import('../pages/Dashboard/Dashboard'))
const DepositPage = lazy(() => import('../pages/Operations/DepositPage'))
const ExchangePage = lazy(() => import('../pages/Operations/ExchangePage'))
const P2PPage = lazy(() => import('../pages/P2P/P2PPage'))
const HistoryPage = lazy(() => import('../pages/History/HistoryPage'))
const SuperuserFeesPage = lazy(() => import('../pages/Superuser/SuperuserFeesPage'))
const SuperuserUsersPage = lazy(() => import('../pages/Superuser/SuperuserUsersPage'))
const SuperuserTransactionsPage = lazy(() => import('../pages/Superuser/SuperuserTransactionsPage'))
const SuperuserP2PPage = lazy(() => import('../pages/Superuser/SuperuserP2PPage'))
const QuotePage = lazy(() => import('../pages/Quote/QuotePage'))
const AlertsPage = lazy(() => import('../pages/Alerts/AlertsPage'))
const PreferencesPage = lazy(() => import('../pages/Preferences/PreferencesPage'))
const ProfilePage = lazy(() => import('../pages/Profile/ProfilePage'))

/** Mientras se descarga una pantalla. */
function PageLoading() {
  return (
    <main className="placeholder-page" aria-busy="true">
      <p>Cargando…</p>
    </main>
  )
}

function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoading />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Todo lo que está bajo /dashboard exige sesión y comparte el Layout (barra + menú lateral). */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="cotizador" element={<QuotePage />} />
            {/* Operaciones: submenú del menú lateral. */}
            <Route path="operaciones">
              <Route index element={<Navigate to="recarga" replace />} />
              <Route path="recarga" element={<DepositPage />} />
              <Route path="intercambio" element={<ExchangePage />} />
              {/* Dirección vieja: los enlaces guardados siguen funcionando. */}
              <Route path="compra" element={<Navigate to="../intercambio" replace />} />
              <Route path="historial" element={<HistoryPage />} />
            </Route>
            <Route path="p2p" element={<P2PPage />} />
            <Route path="configuracion">
              <Route index element={<Navigate to="alertas" replace />} />
              <Route path="alertas" element={<AlertsPage />} />
              <Route path="preferencias" element={<PreferencesPage />} />
              <Route path="usuario" element={<ProfilePage />} />
            </Route>
            {/* Solo superusuario (el back también lo valida). */}
            <Route
              path="superusuario"
              element={
                <SuperuserRoute>
                  <Outlet />
                </SuperuserRoute>
              }
            >
              <Route index element={<Navigate to="comisiones" replace />} />
              <Route path="comisiones" element={<SuperuserFeesPage />} />
              <Route path="usuarios" element={<SuperuserUsersPage />} />
              <Route path="transacciones" element={<SuperuserTransactionsPage />} />
              <Route path="p2p" element={<SuperuserP2PPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default AppRouter
