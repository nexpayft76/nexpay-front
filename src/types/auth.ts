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

export interface AuthResult {
	token: string
	token_type: 'Bearer'
	expires_in: number
	user: AuthUser
}

export interface AuthResponse {
	data: AuthResult
}
