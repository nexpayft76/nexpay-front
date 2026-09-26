export function validateEmail(email: string): string | undefined {
	if (!email.trim()) return 'El email es obligatorio.'
	if (!/^\S+@\S+\.\S+$/.test(email.trim())) return 'Ingresá un email válido.'
	return undefined
}

export function validatePassword(password: string): string | undefined {
	if (!password) return 'La contraseña es obligatoria.'
	if (password.length < 8) return 'Debe tener al menos 8 caracteres.'
	return undefined
}

export function validateName(name: string): string | undefined {
	if (!name.trim()) return 'El nombre es obligatorio.'
	if (name.trim().length < 2) return 'Ingresá al menos 2 caracteres.'
	return undefined
}
