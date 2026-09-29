import { useEffect, useState, type ReactNode } from 'react'
import {
	getSession,
	login as loginRequest,
	logout as logoutRequest,
	register as registerRequest,
} from '../services/auth.service'
import { ApiError } from '../services/api'
import { onSessionExpired, removeLegacyToken, setSessionActive } from '../services/session'
import type { AuthResult, AuthUser, LoginPayload, RegisterPayload } from '../types/auth'
import { logger } from '../utils/logger'
import { AuthContext } from './AuthContext'

export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<AuthUser | null>(null)
	const [isLoading, setIsLoading] = useState(true)
	const [sessionExpired, setSessionExpired] = useState(false)
	/** Cuándo vence la sesión actual (ms), para cerrarla sola en ese momento. */
	const [expiresAt, setExpiresAt] = useState<number | null>(null)

	// Al cargar la página: ¿hay una cookie de sesión válida? (/session responde 200 siempre, sin 401).
	useEffect(() => {
		removeLegacyToken()
		let cancelled = false

		getSession()
			.then((session) => {
				if (cancelled) return
				setSessionActive(session !== null)
				setUser(session?.user ?? null)
				setExpiresAt(session ? Date.parse(session.expires_at) : null)
				logger.info('sesión', session ? 'Sesión activa' : 'Sin sesión')
			})
			.catch((error: unknown) => {
				// Sin conexión con el back: se muestra como "sin sesión"; el login avisará si sigue sin conexión.
				logger.warn('sesión', 'No se pudo verificar la sesión', {
					error: error instanceof Error ? error.message : String(error),
				})
			})
			.finally(() => {
				if (!cancelled) setIsLoading(false)
			})

		return () => {
			cancelled = true
		}
	}, [])

	function expire() {
		setSessionActive(false)
		setUser(null)
		setExpiresAt(null)
		setSessionExpired(true)
		setIsLoading(false)
	}

	// El back rechazó la sesión (lo avisa api.ts con un 401): se cierra y el login explica por qué.
	useEffect(() => onSessionExpired(expire), [])

	// La sesión vence a una hora conocida: se cierra en ese momento, sin esperar a que falle una petición.
	useEffect(() => {
		if (expiresAt === null) return
		const timer = setTimeout(() => {
			logger.info('sesión', 'La sesión venció')
			expire()
		}, Math.max(0, expiresAt - Date.now()))
		return () => clearTimeout(timer)
	}, [expiresAt])

	/**
	 * Después del login o registro, confirma con /session que el navegador guardó la cookie.
	 * Si no (navegador que bloquea cookies, o un back sin la cookie todavía), se avisa en el login
	 * en lugar de entrar al dashboard y rebotar con errores 401.
	 */
	async function startSession(result: AuthResult) {
		const session = await getSession()
		if (!session) {
			logger.warn('sesión', 'El login respondió bien pero la cookie de sesión no quedó guardada')
			throw new ApiError(
				'http',
				'No se pudo guardar la sesión en este navegador. Revisá que las cookies estén habilitadas para este sitio.',
			)
		}
		setSessionActive(true)
		setSessionExpired(false)
		setUser(session.user)
		setExpiresAt(Date.parse(session.expires_at) || Date.now() + result.expires_in * 1000)
	}

	async function login(payload: LoginPayload) {
		await startSession(await loginRequest(payload))
	}

	async function register(payload: RegisterPayload) {
		await startSession(await registerRequest(payload))
	}

	/** Cierra la sesión. El back borra la cookie y no responde 401 aunque ya haya vencido. */
	async function logout() {
		setSessionActive(false)
		try {
			await logoutRequest()
		} catch (error) {
			// Si el back no responde, la sesión igual se cierra en esta pestaña.
			logger.warn('sesión', 'El logout no llegó al servidor', {
				error: error instanceof Error ? error.message : String(error),
			})
		} finally {
			setSessionExpired(false)
			setExpiresAt(null)
			setUser(null)
		}
	}

	return (
		<AuthContext.Provider value={{ user, isLoading, sessionExpired, login, register, logout }}>
			{children}
		</AuthContext.Provider>
	)
}
