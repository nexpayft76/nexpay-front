import { createContext, useEffect, useState, type ReactNode } from 'react'
import { getCurrentUser, logout as logoutRequest } from '../services/auth.service'
import type { AuthUser } from '../types/auth'

interface AuthContextValue {
	user: AuthUser | null
	isLoading: boolean
	logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<AuthUser | null>(null)
	const [isLoading, setIsLoading] = useState(true)

	useEffect(() => {
		const token = localStorage.getItem('nexpay_access_token')
		if (!token) {
			setIsLoading(false)
			return
		}

		getCurrentUser()
			.then(setUser)
			.catch(() => {
				localStorage.removeItem('nexpay_access_token')
			})
			.finally(() => setIsLoading(false))
	}, [])

	async function logout() {
		try {
			if (localStorage.getItem('nexpay_access_token')) await logoutRequest()
		} finally {
			localStorage.removeItem('nexpay_access_token')
			setUser(null)
		}
	}

	return <AuthContext.Provider value={{ user, isLoading, logout }}>{children}</AuthContext.Provider>
}
