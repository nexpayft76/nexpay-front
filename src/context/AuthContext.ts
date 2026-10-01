import { createContext } from 'react'
import type { AuthUser, LoginPayload, RegisterPayload } from '../types/auth'

export interface AuthContextValue {
	user: AuthUser | null
	isLoading: boolean
	/** true si la sesión se cerró sola porque el token venció o fue rechazado (el login lo avisa). */
	sessionExpired: boolean
	login: (payload: LoginPayload) => Promise<void>
	register: (payload: RegisterPayload) => Promise<void>
	logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)