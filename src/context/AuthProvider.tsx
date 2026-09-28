import { useEffect, useState, type ReactNode } from 'react'
import {
	getCurrentUser,
	login as loginRequest,
	logout as logoutRequest,
	register as registerRequest,
} from '../services/auth.service'
import type { AuthResult, AuthUser, LoginPayload, RegisterPayload } from '../types/auth'
import { AuthContext } from './AuthContext'

const TOKEN_KEY = 'nexpay_access_token'

export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<AuthUser | null>(null)
	const [isLoading, setIsLoading] = useState(() => localStorage.getItem(TOKEN_KEY) !== null)

	useEffect(() => {
		if (!localStorage.getItem(TOKEN_KEY)) return

		getCurrentUser()
			.then(setUser)
			.catch(() => {
				localStorage.removeItem(TOKEN_KEY)
			})
			.finally(() => setIsLoading(false))
	}, [])

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

	return <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>{children}</AuthContext.Provider>
}