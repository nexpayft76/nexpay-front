import { api } from './api'
import type { AuthResponse, AuthResult, AuthSession, AuthUser, LoginPayload, RegisterPayload } from '../types/auth'

export async function login(payload: LoginPayload): Promise<AuthResult> {
	const { data } = await api.post<AuthResponse>('/api/auth/login', payload)
	return data.data
}

export async function register(payload: RegisterPayload): Promise<AuthResult> {
	const { data } = await api.post<AuthResponse>('/api/auth/register', payload)
	return data.data
}

export async function getCurrentUser(): Promise<AuthUser> {
	const { data } = await api.get<{ data: AuthUser }>('/api/auth/me')
	return data.data
}

/** ¿Hay una sesión iniciada (cookie válida)? Responde 200 siempre, así no hay un 401 en la consola. */
export async function getSession(): Promise<AuthSession | null> {
	const { data } = await api.get<{ data: AuthSession | null }>('/api/auth/session')
	return data.data
}

/** Cierra la sesión: el back invalida el token y borra la cookie (no falla aunque ya haya vencido). */
export async function logout(): Promise<void> {
	await api.post('/api/auth/logout')
}

/** Para validar el registro en tiempo real: true si el email todavía no tiene cuenta. */
export async function checkEmailAvailable(email: string): Promise<boolean> {
	const { data } = await api.get<{ data: { available: boolean } }>('/api/auth/email-available', { params: { email } })
	return data.data.available
}
