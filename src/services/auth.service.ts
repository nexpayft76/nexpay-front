import { api } from './api'
import type { AuthResponse, AuthResult, AuthUser, LoginPayload, RegisterPayload } from '../types/auth'

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

export async function logout(): Promise<void> {
	await api.post('/api/auth/logout')
}
