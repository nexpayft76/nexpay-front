import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

/** Pantallas del superusuario: un usuario común vuelve a su billetera. El back también lo valida (403). */
function SuperuserRoute({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  return user?.role === 'superuser' ? children : <Navigate to="/dashboard" replace />
}

export default SuperuserRoute
