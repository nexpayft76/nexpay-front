import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import type { ReactNode } from 'react'

function ProtectedRoute({ children }: { children: ReactNode }) {
	const { user, isLoading } = useAuth()

	if (isLoading) return <main className="placeholder-page"><p>Verificando sesión...</p></main>
	return user ? children : <Navigate to="/login" replace />
}

export default ProtectedRoute
