import { api } from './api'
import type { AuthUser } from '../types/auth'
import type { UpdateProfilePayload } from '../types/user'

/** Edita el nombre y/o el email del usuario logueado. 409 si el email ya tiene otra cuenta. */
export async function updateMyProfile(payload: UpdateProfilePayload): Promise<AuthUser> {
	const { data } = await api.patch<{ data: AuthUser }>('/api/users/me', payload)
	return data.data
}

/**
 * Cierra la cuenta del usuario logueado (el back pide la contraseña y borra la cookie de sesión).
 * 403 = contraseña incorrecta (NO es sesión vencida); 409 = todavía tiene saldo.
 */
export async function closeMyAccount(password: string): Promise<void> {
	await api.delete('/api/users/me', { data: { password } })
}

/**
 * Cambia la contraseña del usuario logueado (el back pide la actual). La sesión sigue abierta.
 * 403 = la contraseña actual es incorrecta (NO es sesión vencida); 409 = cuenta sin contraseña (Google).
 */
export async function changeMyPassword(currentPassword: string, newPassword: string): Promise<void> {
	await api.patch('/api/users/me/password', { current_password: currentPassword, new_password: newPassword })
}
