import { useState } from 'react'
import type { FormEvent } from 'react'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { useEmailAvailability } from '../../hooks/useEmailAvailability'
import { ApiError } from '../../services/api'
import type { AuthUser } from '../../types/auth'
import type { UpdateProfilePayload } from '../../types/user'
import { changedFields, isSameEmail, MAX_NAME_LENGTH, validateProfileForm, validateProfileName } from '../../utils/profile-form'
import { validateEmail } from '../../utils/validators'
import '../Auth/Auth.css'

interface ProfileEditFormProps {
  user: AuthUser
  /** Guarda los cambios. Si falla, lanza un ApiError con el mensaje del back. */
  onSave: (payload: UpdateProfilePayload) => Promise<void>
  onCancel: () => void
}

/** Edición de nombre y email, con validación en tiempo real (como el registro). */
function ProfileEditForm({ user, onSave, onCancel }: ProfileEditFormProps) {
  const [name, setName] = useState(user.full_name)
  const [email, setEmail] = useState(user.email)
  const [touched, setTouched] = useState({ name: false, email: false })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const emailChanged = !isSameEmail(email, user.email)
  const debouncedEmail = useDebouncedValue(email, 500)
  const emailSettled = debouncedEmail === email
  // El email actual nunca se consulta: ya es tuyo y el back lo mostraría como "ocupado". Se mira también el valor
  // con retraso (debounced), que mientras se edita todavía puede ser el actual aunque el campo ya cambió.
  const availability = useEmailAvailability(emailChanged && !isSameEmail(debouncedEmail, user.email) ? debouncedEmail : '')
  const emailFormatOk = validateEmail(email) === undefined
  const emailTaken = emailChanged && emailSettled && availability === 'taken'

  const nameError = touched.name || name !== user.full_name ? validateProfileName(name) : undefined
  const emailFormatError = (emailChanged && emailSettled) || touched.email ? validateEmail(email) : undefined

  const payload = changedFields(user, { name, email })
  const hasChanges = Object.keys(payload).length > 0
  const canSubmit = hasChanges && validateProfileForm({ name, email }) === undefined && !emailTaken

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setTouched({ name: true, email: true })
    if (!canSubmit) return

    setError('')
    setIsSubmitting(true)
    try {
      await onSave(payload)
    } catch (requestError: unknown) {
      setError(requestError instanceof ApiError ? requestError.message : 'No se pudieron guardar los cambios.')
      setIsSubmitting(false)
    }
  }

  let emailHint = null
  if (emailFormatError) emailHint = <span className="auth-hint--error">{emailFormatError}</span>
  else if (emailTaken)
    emailHint = <span className="auth-hint--error">Ya existe una cuenta con este email.</span>
  else if (emailChanged && emailSettled && availability === 'available')
    emailHint = <span className="auth-hint--ok">✓ Email disponible</span>
  else if (emailChanged && emailFormatOk && (!emailSettled || availability === 'checking'))
    emailHint = <span>Verificando email…</span>

  return (
    <section className="profile-card" aria-labelledby="profile-edit-title">
      <h2 id="profile-edit-title">Editar datos</h2>
      <form className="auth-form profile-edit__form" onSubmit={handleSubmit} noValidate>
        <div className="auth-field">
          <label htmlFor="profile-name">Nombre completo</label>
          <input
            id="profile-name"
            type="text"
            value={name}
            maxLength={MAX_NAME_LENGTH + 20}
            onChange={(event) => setName(event.target.value)}
            onBlur={() => setTouched((current) => ({ ...current, name: true }))}
            autoComplete="name"
            required
            aria-invalid={nameError !== undefined}
            aria-describedby="profile-name-hint"
          />
          <span id="profile-name-hint" className="auth-hint" aria-live="polite">
            {nameError && <span className="auth-hint--error">{nameError}</span>}
          </span>
        </div>

        <div className="auth-field">
          <label htmlFor="profile-email">Email</label>
          <input
            id="profile-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            onBlur={() => setTouched((current) => ({ ...current, email: true }))}
            autoComplete="email"
            required
            aria-invalid={emailFormatError !== undefined || emailTaken}
            aria-describedby="profile-email-hint"
          />
          <span id="profile-email-hint" className="auth-hint" aria-live="polite">
            {emailHint}
          </span>
        </div>

        {error && <p className="auth-error" role="alert">{error}</p>}

        <div className="profile-edit__actions">
          <button className="btn btn--primary" type="submit" disabled={!canSubmit || isSubmitting}>
            {isSubmitting ? 'Guardando...' : 'Guardar cambios'}
          </button>
          <button className="btn btn--ghost" type="button" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </button>
        </div>
      </form>
    </section>
  )
}

export default ProfileEditForm
