import type { AuthUser } from '../types/auth'
import type { UpdateProfilePayload } from '../types/user'
import { validateEmail, validateName } from './validators'

/** El back cuenta hasta 120 caracteres de nombre. */
export const MAX_NAME_LENGTH = 120

export function validateProfileName(name: string): string | undefined {
	return validateName(name) ?? (name.trim().length > MAX_NAME_LENGTH ? `Máximo ${MAX_NAME_LENGTH} caracteres.` : undefined)
}

/** Los emails no distinguen mayúsculas (el back los guarda en minúsculas). */
export function isSameEmail(a: string, b: string): boolean {
	return a.trim().toLowerCase() === b.trim().toLowerCase()
}

/** Solo lo que cambió respecto del usuario actual; vacío si no hay cambios (así no se pide un PATCH en vano). */
export function changedFields(user: AuthUser, form: { name: string; email: string }): UpdateProfilePayload {
	const payload: UpdateProfilePayload = {}
	if (form.name.trim() !== user.full_name) payload.full_name = form.name.trim()
	if (!isSameEmail(form.email, user.email)) payload.email = form.email.trim()
	return payload
}

/** Primer error de validación del formulario (o undefined si se puede enviar). */
export function validateProfileForm(form: { name: string; email: string }): string | undefined {
	return validateProfileName(form.name) ?? validateEmail(form.email)
}
