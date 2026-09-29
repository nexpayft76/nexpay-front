import { useEffect, useState, type ReactNode } from 'react'
import {
	getCurrentUser,
	login as loginRequest,
	logout as logoutRequest,
	register as registerRequest,
} from '../services/auth.service'
import { clearToken, getValidToken, onSessionExpired, saveToken } from '../services/session'
import type { AuthResult, AuthUser, LoginPayload, RegisterPayload } from '../types/auth'
import { AuthContext } from './AuthContext'

export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<AuthUser | null>(null)
	// Un token vencido se descarta acá mismo: no hace falta preguntarle al back (ni ver un 401 en consola).
	const [isLoading, setIsLoading] = useState(() => getValidToken() !== null)
	const [sessionExpired, setSessionExpired] = useState(false)

	useEffect(() => {
		if (!getValidToken()) return
		let cancelled = false

		getCurrentUser()
			.then((current) => {
				if (!cancelled) setUser(current)
			})
			.catch(() => clearToken())
			.finally(() => {
				if (!cancelled) setIsLoading(false)
			})

		return () => {
			cancelled = true
		}
	}, [])

	// El back rechazó el token (lo avisa api.ts): se cierra la sesión y el login explica por qué.
	useEffect(
		() =>
			onSessionExpired(() => {
				setUser(null)
				setSessionExpired(true)
				setIsLoading(false)
			}),
		[],
	)

	function startSession(result: AuthResult) {
		saveToken(result.token)
		setSessionExpired(false)
		setUser(result.user)
	}

	async function login(payload: LoginPayload) {
		startSession(await loginRequest(payload))
	}

	async function register(payload: RegisterPayload) {
		startSession(await registerRequest(payload))
	}

	/** Cierra la sesión. Si el token ya venció, no llama al back (evita un 401 en la consola). */
	async function logout() {
		try {
			if (getValidToken()) await logoutRequest()
		} catch {
			// Si el back no responde, la sesión igual se cierra en este navegador.
		} finally {
			clearToken()
			setSessionExpired(false)
			setUser(null)
		}
	}

	return (
		<AuthContext.Provider value={{ user, isLoading, sessionExpired, login, register, logout }}>
			{children}
		</AuthContext.Provider>
	)
}
