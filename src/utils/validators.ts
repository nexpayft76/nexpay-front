export function validateEmail(email: string): string | undefined {
	if (!email.trim()) return 'El email es obligatorio.'
	if (!/^\S+@\S+\.\S+$/.test(email.trim())) return 'Ingresá un email válido.'
	return undefined
}

/** Reglas de la contraseña (las mismas que exige el back al registrarse), para mostrarlas en tiempo real. */
export const PASSWORD_RULES: { id: string; label: string; test: (password: string) => boolean }[] = [
	{ id: 'length', label: 'Entre 8 y 72 caracteres', test: (password) => password.length >= 8 && password.length <= 72 },
	{ id: 'letter', label: 'Al menos una letra', test: (password) => /[A-Za-z]/.test(password) },
	{ id: 'number', label: 'Al menos un número', test: (password) => /\d/.test(password) },
]

export function validatePassword(password: string): string | undefined {
	if (!password) return 'La contraseña es obligatoria.'
	if (password.length < 8) return 'Debe tener al menos 8 caracteres.'
	if (password.length > 72) return 'No puede superar 72 caracteres.'
	if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'Debe contener al menos una letra y un número.'
	return undefined
}

/** Login: solo se exige que no esté vacía (las reglas de formato son del registro, igual que en el back). */
export function validateLoginPassword(password: string): string | undefined {
	if (!password) return 'La contraseña es obligatoria.'
	return undefined
}

export function validateName(name: string): string | undefined {
	if (!name.trim()) return 'El nombre es obligatorio.'
	if (name.trim().length < 2) return 'Ingresá al menos 2 caracteres.'
	return undefined
}
