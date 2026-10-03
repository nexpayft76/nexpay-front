import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Landing from '../pages/Landing/Landing'
import ProtectedRoute from './ProtectedRoute'

// La landing va en el archivo principal (es la página que ven los buscadores y la primera visita).
// El resto se descarga recién al entrar a cada pantalla: así el index-*.js que baja al abrir el sitio
// es mucho más liviano y la landing carga antes.
const Layout = lazy(() => import('../components/layout/Layout'))
const ComingSoon = lazy(() => import('../pages/ComingSoon/ComingSoon'))
const Login = lazy(() => import('../pages/Login/Login'))
const Register = lazy(() => import('../pages/Register/Register'))
const Dashboard = lazy(() => import('../pages/Dashboard/Dashboard'))
const DepositPage = lazy(() => import('../pages/Operations/DepositPage'))
const ExchangePage = lazy(() => import('../pages/Operations/ExchangePage'))
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
            {/* Operaciones: submenú del menú lateral. Más adelante: venta e historial. */}
            <Route path="operaciones">
              <Route index element={<Navigate to="recarga" replace />} />
              <Route path="recarga" element={<DepositPage />} />
              <Route path="compra" element={<ExchangePage />} />
            </Route>
            <Route
              path="p2p"
              element={
                <ComingSoon
                  icon="p2p"
                  title="P2P"
                  description="Intercambia pesos colombianos y argentinos directamente con otros usuarios del corredor, con una comisión pequeña."
                />
              }
            />
            <Route path="configuracion">
              <Route index element={<Navigate to="alertas" replace />} />
              <Route path="alertas" element={<AlertsPage />} />
              <Route path="preferencias" element={<PreferencesPage />} />
              <Route path="usuario" element={<ProfilePage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default AppRouter
