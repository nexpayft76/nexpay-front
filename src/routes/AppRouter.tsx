import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import ComingSoon from '../pages/ComingSoon/ComingSoon'
import Landing from '../pages/Landing/Landing'
import Login from '../pages/Login/Login'
import Register from '../pages/Register/Register'
import Dashboard from '../pages/Dashboard/Dashboard'
import ProtectedRoute from './ProtectedRoute'

function AppRouter() {
  return (
    <BrowserRouter>
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
          <Route
            path="transacciones"
            element={
              <ComingSoon
                icon="transactions"
                title="Mis transacciones"
                description="El historial de tus compras, ventas, intercambios y recargas, con la tasa usada en cada operación."
              />
            }
          />
          <Route
            path="p2p"
            element={
              <ComingSoon
                icon="p2p"
                title="P2P"
                description="Intercambiá pesos colombianos y argentinos directamente con otros usuarios del corredor, con una comisión pequeña."
              />
            }
          />
          <Route
            path="configuracion"
            element={
              <ComingSoon
                icon="settings"
                title="Configuración"
                description="Tus preferencias: moneda principal, tipo de dólar para ARS y notificaciones."
              />
            }
          />
          <Route
            path="usuario"
            element={
              <ComingSoon
                icon="user"
                title="Usuario"
                description="Tus datos personales: ver, editar tu nombre y email, y cerrar tu cuenta."
              />
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default AppRouter
