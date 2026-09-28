import { createContext, useEffect, useState, type ReactNode } from 'react'
import {
	getCurrentUser,
	login as loginRequest,
	logout as logoutRequest,
	register as registerRequest,
} from '../services/auth.service'
import type { AuthResult, AuthUser, LoginPayload, RegisterPayload } from '../types/auth'

const TOKEN_KEY = 'nexpay_access_token'

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
	// Sin token no hay nada que verificar: se arranca sin "cargando" (evita un render extra).
	const [isLoading, setIsLoading] = useState(() => localStorage.getItem(TOKEN_KEY) !== null)

	// Al abrir la app: si hay un token guardado, se valida con /api/auth/me (puede haber expirado).
	useEffect(() => {
		if (!localStorage.getItem(TOKEN_KEY)) return

		getCurrentUser()
			.then(setUser)
			.catch(() => {
				localStorage.removeItem(TOKEN_KEY)
			})
			.finally(() => setIsLoading(false))
	}, [])

	// Guarda el token y actualiza el usuario del contexto en el mismo momento.
	// Sin el setUser, ProtectedRoute vería user = null y devolvería a /login.
	function startSession(result: AuthResult) {
		localStorage.setItem(TOKEN_KEY, result.token)
		setUser(result.user)
	}

	async function login(payload: LoginPayload) {
		startSession(await loginRequest(payload))
	}

	async function register(payload: RegisterPayload) {
		startSession(await registerRequest(payload))
	}

	async function logout() {
		try {
			if (localStorage.getItem(TOKEN_KEY)) await logoutRequest()
		} finally {
			localStorage.removeItem(TOKEN_KEY)
			setUser(null)
		}
	}

	return (
		<AuthContext.Provider value={{ user, isLoading, login, register, logout }}>{children}</AuthContext.Provider>
	)
}
