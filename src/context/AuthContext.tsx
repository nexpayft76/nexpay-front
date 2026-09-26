import { createContext, useEffect, useState, type ReactNode } from 'react'
import { getCurrentUser, login as loginRequest, logout as logoutRequest, register as registerRequest } from '../services/auth.service'
import type { AuthUser } from '../types/auth'
import type { LoginPayload, RegisterPayload } from '../types/auth'
import type { AuthResult } from '../types/auth'

interface AuthContextValue {
	user: AuthUser | null
	isLoading: boolean
	login: (payload: LoginPayload) => Promise<void>
	register: (payload: RegisterPayload) => Promise<void>
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

	async function login(payload: LoginPayload) {
		const result: AuthResult = await loginRequest(payload)
		localStorage.setItem('nexpay_access_token', result.token)
		setUser(result.user)
	}

	async function register(payload: RegisterPayload) {
		const result: AuthResult = await registerRequest(payload)
		localStorage.setItem('nexpay_access_token', result.token)
		setUser(result.user)
	}

	return <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>{children}</AuthContext.Provider>
}
