export interface LoginPayload {
	email: string
	password: string
}

export interface RegisterPayload {
	full_name: string
	email: string
	password: string
}

export interface AuthUser {
	id: string
	full_name: string
	email: string
	status: 'active' | 'suspended' | 'closed'
	created_at: string
}

/** Respuesta del login/registro. El token también llega en una cookie HttpOnly: el front no lo guarda. */
export interface AuthResult {
	token: string
	token_type: 'Bearer'
	expires_in: number
	user: AuthUser
}

/** GET /api/auth/session: la sesión actual, o null si no hay (responde 200 siempre). */
export interface AuthSession {
	user: AuthUser
	expires_at: string
}

export interface AuthResponse {
	data: AuthResult
}
