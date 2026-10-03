import { createContext } from 'react'
import type { AuthUser, LoginPayload, RegisterPayload } from '../types/auth'
import type { UpdateProfilePayload } from '../types/user'

export interface AuthContextValue {
	user: AuthUser | null
	isLoading: boolean
	/** true si la sesión se cerró sola porque el token venció o fue rechazado (el login lo avisa). */
	sessionExpired: boolean
	login: (payload: LoginPayload) => Promise<void>
	register: (payload: RegisterPayload) => Promise<void>
	logout: () => Promise<void>
	/** Guarda el nombre y/o email en el back y actualiza el usuario en toda la app. */
	updateProfile: (payload: UpdateProfilePayload) => Promise<void>
	/** Cierra la cuenta (pide la contraseña). Si sale bien, la sesión local también se cierra. */
	closeAccount: (password: string) => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)