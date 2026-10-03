/** Body de PATCH /api/users/me: solo estos dos campos, y al menos uno (el estado no se puede cambiar). */
export interface UpdateProfilePayload {
	full_name?: string
	email?: string
}
